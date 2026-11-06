import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { openLayout, chooseRoute, readMap } from "./layout-browser.mjs";

const exec = promisify(execFile);
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });
async function app(t, width, height) {
  const view = await openLayout(browser, width, height, { dismissOnboarding: false });
  t.after(() => view.context.close());
  await view.page.click("#infoModalAccept");
  await view.page.waitForSelector("#productTour", { state: "visible" });
  await view.page.click("#productTourSkip");
  await chooseRoute(view.page, "BRT_03");
  await view.page.waitForFunction(() => !map._panAnim?._inProgress && !map._animatingZoom);
  return view;
}
async function openNetwork(page) {
  if (!(await page.locator("#filterPanel").isVisible()) || await page.locator("#filterPanel").evaluate(el => el.inert)) await page.click("#tlNetworkToggle");
}
async function details(page, position = "half") {
  await page.evaluate(position => { webgisLayout.showPopupDetails(); webgisLayout.setTab("stops"); webgisLayout.setSheetPosition(position); }, position);
  await page.waitForTimeout(220);
}
async function cameraClose(page, before) {
  const after = await readMap(page);
  const shift = await page.evaluate(([a, b]) => map.project(a).distanceTo(map.project(b)), [before.center, after.center]);
  assert.ok(shift <= 1, `camera stays within Leaflet pixel rounding: ${shift}`);
  assert.equal(after.zoom, before.zoom);
}

test("regenerated CSS retains every info-guide component and matches committed output", async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "webgis-guide-build-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await exec(process.execPath, ["tools/build-tabler-css.mjs"], { env: { ...process.env, TABLER_OUTPUT_DIR: dir } });
  const css = await readFile(path.join(dir, "legacy-components.css"), "utf8");
  for (const name of ["section", "title", "grid", "item", "number"]) assert.ok(css.includes(".info-guide-" + name));
  assert.ok(!css.includes("!important"));
  for (const file of ["tabler-components.css", "legacy-components.css"]) assert.equal(await readFile(path.join(dir, file), "utf8"), await readFile("css/" + file, "utf8"), file);
});

for (const [width, height] of [[320, 568], [360, 800], [390, 844], [768, 1024], [1366, 900], [1600, 1000], [568, 320], [844, 390]]) {
  test(`network sizing, full route labels, list density and guide cards at ${width}x${height}`, async t => {
    const view = await app(t, width, height), { page } = view;
    const camera = await readMap(page);
    await page.evaluate(() => { window.uxPinnedRouteLayer = routeLayer; window.uxPinnedMarkers = [...stopMarkerByKey]; window.uxInvalidations = 0; const original = map.invalidateSize; map.invalidateSize = function (...args) { uxInvalidations++; return original.apply(this, args); }; });
    await openNetwork(page);
    await page.waitForTimeout(180);
    const sizing = await page.evaluate(() => {
      const panel = document.getElementById("filterPanel"), content = panel.querySelector(".filter-panel-content"), card = panel.querySelector(".filter-controls-card"), style = getComputedStyle(content);
      return { panel: panel.getBoundingClientRect().toJSON(), map: document.getElementById("map").getBoundingClientRect().toJSON(), footer: panel.querySelector(".tl-network-footer").getBoundingClientRect().toJSON(), header: panel.querySelector(".tl-panel-heading").getBoundingClientRect().toJSON(), blank: content.clientHeight - card.getBoundingClientRect().height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom), scroll: content.scrollHeight > content.clientHeight };
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    if (width < 768) {
      assert.ok(sizing.panel.y >= sizing.map.y && sizing.panel.bottom <= sizing.map.bottom);
      const search = await page.locator("#globalSearchPanel").boundingBox();
      assert.ok(sizing.panel.y >= search.y + search.height, "sheet does not cover Search");
      assert.ok(sizing.header.y >= sizing.panel.y && sizing.footer.bottom <= sizing.panel.bottom + 1);
      assert.ok(sizing.blank <= 3, `no flex filler: ${sizing.blank}px`);
      for (const control of await page.locator(".tl-mode-button").all()) {
        const target = await control.boundingBox();
        assert.ok(target.width >= 44 && target.height >= 44, "mode touch targets stay at least 44px");
      }
      await page.locator("#mobileFilterClose").click({ trial: true });
    }
    const label = await page.locator("#routeSelect").evaluate(el => el.selectedOptions[0].text);
    assert.equal(await page.locator("#routeSelect").getAttribute("title"), label);
    assert.equal(await page.locator("#tlRouteFullName").textContent(), label);
    assert.ok((await page.locator("#routeSelect").getAttribute("aria-describedby")).split(/\s+/).includes("tlRouteFullName"));
    assert.equal(await page.locator("#tlMapContext").getAttribute("title"), label);
    assert.equal(await page.locator("#tlRouteFullName").evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
    if (width < 768) await page.click("#mobileFilterClose");
    else await page.click("#tlNetworkCollapse");
    await details(page);
    const row = page.locator('#stopList [data-stop-key="BRT047_REG"]');
    const rect = await row.boundingBox();
    assert.ok(rect.height >= (width >= 1024 ? 40 : 44) && rect.height <= 44, JSON.stringify(rect));
    assert.equal(await page.locator(".stop-list-scroll").evaluate(el => getComputedStyle(el).overflow), "visible", "one content scroller");
    assert.equal(await page.locator(".tl-route-content").evaluate(el => getComputedStyle(el).overflowY), "auto");
    await cameraClose(page, camera);
    assert.equal(await page.evaluate(() => routeLayer === uxPinnedRouteLayer && uxPinnedMarkers.every(([key, marker]) => stopMarkerByKey.get(key) === marker)), true, "panels do not rebuild layers");
    if (width < 1024) assert.equal(await page.evaluate(() => uxInvalidations), 0, "overlay-only panels do not invalidate Leaflet");
    await page.click("#tlAbout");
    const grid = await page.locator(".info-guide-grid").evaluate(el => ({ display: getComputedStyle(el).display, columns: getComputedStyle(el).gridTemplateColumns.split(" ").length, family: getComputedStyle(el).fontFamily }));
    assert.equal(grid.display, "grid");
    assert.equal(grid.columns, width < 768 ? 1 : 2);
    assert.ok(grid.family.includes("PT Sans"));
    assert.equal(await page.locator(".info-guide-item").count(), 5);
    for (const card of await page.locator(".info-guide-item").all()) {
      await card.scrollIntoViewIfNeeded();
      assert.equal(await card.evaluate(el => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1), false, "card text is not clipped");
      const box = await card.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
    }
    await page.locator("#infoModalClose").click({ trial: true });
    await page.click("#infoModalClose");
    assert.deepEqual(view.errors, []);
  });
}

test("list identities, sequence and all line/role/status/direction badges match baseline K1 and K3", async t => {
  const baseline = JSON.parse(await readFile("docs/mobile-ux-refinement/verification/baseline-stop-ui.json", "utf8"));
  const { page, errors } = await app(t, 1366, 900);
  for (const route of ["BRT_01", "BRT_03"]) {
    await chooseRoute(page, route);
    const actual = await page.locator("#stopList .stop-list-item").evaluateAll(rows => rows.map(el => ({ key: el.dataset.stopKey, logicalKey: el.dataset.stopLogicalKey, name: el.querySelector(".stop-list-name").textContent.trim(), sequence: el.querySelector(".stop-seq-badge")?.textContent.trim(), lines: [...el.querySelectorAll(".stop-list-route-badge")].map(b => ({ text: b.textContent.trim(), title: b.title, color: b.style.background })), badges: [...el.querySelectorAll(".stop-list-badges > *")].map(b => ({ text: b.textContent.trim(), className: b.className })) })));
    assert.deepEqual(actual, baseline[route]);
    for (const name of route === "BRT_03" ? ["Damai", "Jelambar"] : []) {
      const row = page.locator("#stopList .stop-list-item").filter({ has: page.locator(".stop-list-name", { hasText: name }) }).first();
      await row.scrollIntoViewIfNeeded();
      assert.ok(await row.locator(".stop-list-route-badge").count() > 1, name + " multi-line fixture");
      assert.equal(await row.evaluate(el => {
        const r = el.getBoundingClientRect();
        return [...el.querySelectorAll(".stop-list-route-badge, .stop-list-badges > *, .stop-list-name")].some(child => { const c = child.getBoundingClientRect(); return c.left < r.left - 1 || c.right > r.right + 1 || c.top < r.top - 1 || c.bottom > r.bottom + 1; });
      }), false, name + " badges remain inside row");
    }
  }
  assert.deepEqual(errors, []);
});

test("Mini/half/full and tab changes preserve selected LRT, filters, URL and camera", async t => {
  const { page, errors } = await app(t, 390, 844);
  await openNetwork(page); await page.click('[data-mode="LRT"]'); await page.selectOption("#routeSelect", "LRT_JKT_S"); await page.waitForTimeout(650);
  await details(page, "expanded"); await page.locator('#stopList [data-stop-key="LRTJ006_01"]').click(); await page.waitForTimeout(1000);
  await page.click("#tlDetailResume"); await page.waitForTimeout(200);
  const snapshot = () => page.evaluate(() => ({ route: currentSelectedRouteId, stop: currentSelectedStopKey, mode: modeSelect.value, status: statusSelect.value, url: location.href }));
  const before = await snapshot(), camera = await readMap(page);
  assert.equal((await page.locator("#tlDetailCollapse").textContent()).trim(), "Mini");
  for (const [id, position] of [["tlDetailCollapse", "collapsed"], ["tlDetailHalf", "half"], ["tlDetailExpand", "expanded"]]) {
    const tab = await page.locator("#tlDetailPanel").getAttribute("data-tab");
    await page.click("#" + id); await page.waitForTimeout(180);
    assert.equal(await page.locator("#tlDetailPanel").getAttribute("data-sheet-position"), position);
    assert.equal(await page.locator("#tlDetailPanel").getAttribute("data-tab"), tab);
    assert.deepEqual(await snapshot(), before); await cameraClose(page, camera);
  }
  for (const id of ["tlTabRoute", "tlTabStops", "tlTabSelected"]) {
    await page.click("#" + id); assert.deepEqual(await snapshot(), before); await cameraClose(page, camera);
  }
  await page.click("#tlDetailClose");
  assert.equal(await page.locator(".leaflet-popup").isVisible(), true);
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(errors, []);
});

test("network content reflows across modes/status and comparison while chrome stays reachable", async t => {
  const { page, errors } = await app(t, 320, 568);
  for (const mode of ["ALL", "BRT", "MRT", "LRT", "KRL"]) {
    await openNetwork(page); await page.click(`[data-mode="${mode}"]`); await page.waitForTimeout(160);
    assert.equal(await page.locator("#modeSelect").inputValue(), mode);
    for (const status of ["ALL", "Existing"]) {
      await page.selectOption("#statusSelect", status); await page.waitForTimeout(160);
      assert.equal(await page.locator("#statusSelect").inputValue(), status);
      await page.locator("#mobileFilterClose").click({ trial: true });
      assert.equal(await page.locator("#filterPanel").evaluate(el => { const r = el.getBoundingClientRect(); return r.top < 0 || r.bottom > innerHeight; }), false);
    }
  }
  await page.click('[data-mode="BRT"]'); await page.selectOption("#routeSelect", "BRT_03"); await page.waitForTimeout(650);
  await openNetwork(page); await page.locator("#routeCompareAdd").click();
  await page.locator("#comparisonRouteSelect").scrollIntoViewIfNeeded();
  await page.selectOption("#comparisonRouteSelect", "BRT_01"); await page.waitForTimeout(250);
  assert.equal(await page.locator("#comparisonRouteSelect").inputValue(), "BRT_01");
  await page.locator("#mobileFilterClose").click({ trial: true });
  assert.deepEqual(errors, []);
});
