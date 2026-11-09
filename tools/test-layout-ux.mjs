import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { chromium } from "playwright";
import { openLayout, chooseRoute, readMap } from "./layout-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });
async function routeApp(t, width = 390, height = 844) {
  const app = await openLayout(browser, width, height);
  t.after(() => app.context.close());
  await chooseRoute(app.page);
  return app;
}
async function selectAsean(page) {
  if (await page.locator("#tlDetailExpand").isVisible()) await page.click("#tlDetailExpand");
  await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click();
  await page.waitForTimeout(900);
}
async function engineState(page) {
  return page.evaluate(() => ({ selected: currentSelectedStopKey, route: currentSelectedRouteId,
    mode: modeSelect.value, status: statusSelect.value, url: location.href,
    markers: [...stopMarkerByKey].map(([key, marker]) => [key, marker.getLatLng().lat, marker.getLatLng().lng]),
    rows: [...document.querySelectorAll("#stopList .stop-list-item")].map(row => [row.dataset.stopKey, row.dataset.stopLogicalKey, row.querySelector(".stop-list-name")?.textContent.trim(), row.getAttribute("aria-current")]),
    style: currentSelectedStopKey ? Object.fromEntries(["radius", "weight", "fillColor", "fillOpacity", "dashArray"].map(key => [key, stopMarkerByKey.get(currentSelectedStopKey).options[key]])) : null
  }));
}
async function panelState(page) {
  return page.evaluate(() => ({ tab: document.getElementById("tlDetailPanel").dataset.tab,
    flags: ["left-panel-collapsed", "tl-detail-open", "tl-detail-expanded", "mobile-filter-open", "mobile-info-open", "tl-legend-open", "tl-popup-shelved"]
      .map(name => [name, document.body.classList.contains(name)]), basemap: !document.getElementById("basemapPanel").hidden }));
}

test("mobile popup and detail take turns without changing selection, tab, URL, or markers", async t => {
  const app = await routeApp(t); const { page } = app;
  await selectAsean(page);
  const selected = await engineState(page);
  assert.equal(await page.locator("#tlDetailPanel").getAttribute("data-tab"), "stops");
  assert.ok((await page.locator("#tlDetailPanel").boundingBox()).height <= 80);
  assert.equal(await page.locator("#tlDetailExpand").getAttribute("aria-expanded"), "true");
  await page.click("#tlDetailResume");
  await page.waitForFunction(() => document.getElementById("tlDetailPanel").getBoundingClientRect().height > 232);
  assert.equal(await page.locator(".leaflet-popup").isVisible(), false);
  assert.equal(await page.evaluate(() => map._popup.isOpen()), true, "popup is retained, not closed through the engine");
  assert.ok((await page.locator("#tlDetailPanel").boundingBox()).height > 232);
  assert.deepEqual(await engineState(page), selected);
  await page.click("#tlTabRoute");
  const tab = await page.locator("#tlDetailPanel").getAttribute("data-tab");
  await page.click("#tlDetailClose");
  assert.equal(await page.locator(".leaflet-popup").isVisible(), true);
  assert.deepEqual(await engineState(page), selected);
  await page.click("#tlMobileDetails");
  assert.equal(await page.locator("#tlDetailPanel").getAttribute("data-tab"), tab);
  assert.equal(await page.locator(".leaflet-popup").isVisible(), false);
  await page.click("#mobileBottomRouteButton");
  assert.equal(await page.locator(".leaflet-popup").isVisible(), false, "filter and popup do not compete");
  await page.click("#mobileFilterClose");
  assert.equal(await page.locator(".leaflet-popup").isVisible(), true);
  assert.deepEqual(await engineState(page), selected);
  assert.deepEqual(app.errors, []);
});

for (const width of [390, 1366]) test(`visual label decluttering preserves every marker and stop identity at ${width}px`, async t => {
  const app = await routeApp(t, width, 900); const { page } = app;
  const before = await engineState(page);
  const labels = await page.evaluate(() => {
    const all = [...document.querySelectorAll("#map .route-stop-name-label")];
    return { total: all.length, visible: all.filter(el => getComputedStyle(el).visibility !== "hidden").map(el => ({ text: el.textContent, ...el.getBoundingClientRect().toJSON() })) };
  });
  assert.ok(labels.visible.length > 2 && labels.visible.length < labels.total);
  for (let i = 0; i < labels.visible.length; i++) for (let j = i + 1; j < labels.visible.length; j++) {
    const a = labels.visible[i], b = labels.visible[j];
    assert.ok(!(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top), `${a.text} collides with ${b.text}`);
  }
  const hidden = await page.evaluate(() => {
    const item = [...stopMarkerByKey].find(([, marker]) => marker.getTooltip()?.getElement()?.classList.contains("tl-label-suppressed") && map.getBounds().contains(marker.getLatLng()));
    item[1].fire("mouseover"); return item[0];
  });
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(key => stopMarkerByKey.get(key).getTooltip().getElement().classList.contains("tl-label-suppressed"), hidden), false);
  await page.evaluate(key => stopMarkerByKey.get(key).fire("mouseout"), hidden);
  await page.waitForTimeout(80);
  assert.deepEqual(await engineState(page), before);
  await page.evaluate(key => stopMarkerByKey.get(key).fire("click"), hidden);
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(key => stopMarkerByKey.get(key).getTooltip().getElement().classList.contains("tl-label-suppressed"), hidden), false, "selected label remains available");
  assert.deepEqual(app.errors, []);
});

for (const width of [390, 768, 1366]) test(`Tabler guided tour has visible anchors and restores UI/transport state at ${width}px`, async t => {
  const app = await routeApp(t, width, 900); const { page } = app;
  await selectAsean(page);
  await page.click("#tlLegendToggle");
  const before = await engineState(page); const panels = await panelState(page); const view = await readMap(page);
  await page.click("#rightInfoGuideButton");
  for (let index = 0; index < 5; index++) {
    await page.waitForTimeout(120);
    const geometry = await page.evaluate(() => ({ card: document.getElementById("productTourCard").getBoundingClientRect().toJSON(),
      target: document.getElementById("productTourSpotlight").getBoundingClientRect().toJSON(), name: document.getElementById("productTour").dataset.target,
      copy: document.getElementById("productTourText").textContent, width: innerWidth, height: innerHeight }));
    const { card, target } = geometry;
    assert.ok(target.width > 20 && target.height > 20, geometry.name);
    assert.ok(card.left >= 0 && card.right <= geometry.width && card.top >= 0 && card.bottom <= geometry.height);
    assert.ok(!(card.left < target.right && card.right > target.left && card.top < target.bottom && card.bottom > target.top), `card covers ${geometry.name}`);
    assert.ok(!/panel kiri|ikon Cari Lokasi di kanan/.test(geometry.copy));
    assert.equal(await page.locator("#tlShell").evaluate(el => el.inert), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.getElementById("productTourCard").contains(document.activeElement)), true);
    if (index === 3) {
      await page.click("#productTourPrevious");
      assert.equal(await page.evaluate(() => productTourIndex), 2);
      await page.click("#productTourNext");
    }
    if (width === 1366 && index === 2) { await page.setViewportSize({ width: 1600, height: 1000 }); await page.waitForTimeout(150); }
    await page.click("#productTourNext");
  }
  await page.waitForTimeout(300);
  assert.equal(await page.locator("#productTour").isVisible(), false);
  assert.equal(await page.locator("#tlShell").evaluate(el => el.inert), false);
  assert.deepEqual(await engineState(page), before);
  assert.deepEqual(await panelState(page), panels);
  const final = await readMap(page);
  assert.equal(final.zoom, view.zoom);
  const shift = await page.evaluate(([a, b]) => map.project(a).distanceTo(map.project(b)), [view.center, final.center]);
  assert.ok(shift <= 1, `tour restores center within pixel rounding (${shift})`);
  assert.deepEqual(app.errors, []);
});

test("guided tour skip and Escape preserve an empty overview and the open network sheet", async t => {
  const app = await openLayout(browser, 390, 844); t.after(() => app.context.close()); const { page } = app;
  await page.click("#mobileBottomRouteButton");
  const before = await engineState(page); const panels = await panelState(page);
  for (const action of ["skip", "escape"]) {
    await page.evaluate(() => startProductTour({ manual: true }));
    await page.click("#productTourNext"); await page.click("#productTourNext");
    if (action === "skip") await page.click("#productTourSkip"); else await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    assert.deepEqual(await engineState(page), before);
    assert.deepEqual(await panelState(page), panels);
  }
  assert.deepEqual(app.errors, []);
});

test("startup disclaimer continues to the adapted tour through the normal buttons", async t => {
  const app = await openLayout(browser, 390, 844, { dismissOnboarding: false }); t.after(() => app.context.close()); const { page } = app;
  await page.click("#infoModalAccept");
  await page.waitForSelector("#productTour", { state: "visible" });
  // The spotlight target is committed in requestAnimationFrame after the
  // dialog becomes visible. Wait for that ready state, then keep the assertion.
  await page.waitForFunction(() => document.getElementById("productTour").dataset.target === "tlModeChoices");
  assert.equal(await page.locator("#productTour").getAttribute("data-target"), "tlModeChoices");
  await page.click("#productTourSkip");
  assert.equal(await page.locator("#tlShell").evaluate(el => el.inert), false);
  assert.deepEqual(app.errors, []);
});

test("primary mobile controls and detail actions offer at least 44px touch targets", async t => {
  const app = await routeApp(t); const { page } = app;
  for (const id of ["tlNetworkToggle", "tlLegendToggle", "tlAbout", "globalSearchSubmit", "gpsButton", "homeButton", "zoomInButton", "zoomOutButton", "tlDetailExpand", "tlDetailClose", "tlTabStops", "tlMobileDetails"]) {
    const rect = await page.locator("#" + id).boundingBox();
    assert.ok(rect.width >= 44 && rect.height >= 44, `${id}: ${rect.width}x${rect.height}`);
  }
  await selectAsean(page);
  for (const selector of ["#tlDetailResume", ".leaflet-popup-close-button", ".leaflet-popup .integration-place-row-button", ".leaflet-popup .stop-popup-nav-button"]) {
    const elements = page.locator(selector);
    for (const element of await elements.all()) {
      const rect = await element.boundingBox();
      assert.ok(rect.width >= 44 && rect.height >= 44, selector);
    }
  }
  assert.deepEqual(app.errors, []);
});
