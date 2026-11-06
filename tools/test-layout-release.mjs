import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, readMap } from "./layout-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });
async function station(page, route, key) {
  if (await page.locator("#filterPanel").evaluate(el => el.inert || getComputedStyle(el).display === "none")) await page.click("#tlNetworkToggle");
  await page.click('[data-mode="LRT"]');
  await page.selectOption("#routeSelect", route);
  await page.waitForTimeout(650);
  await page.evaluate(() => { webgisLayout.showPopupDetails(); webgisLayout.setTab("stops"); webgisLayout.setDetailExpanded(true); });
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await page.waitForTimeout(900);
  await page.waitForFunction(() => !map._panAnim?._inProgress && !map._animatingZoom);
}
for (const [width, height] of [[568, 320], [844, 390]]) test(`compact landscape exposes services and all LRT actions at ${width}x${height}`, async t => {
  const app = await openLayout(browser, width, height); t.after(() => app.context.close()); const { page } = app;
  for (const [route, key] of [["LRT_JKT_S", "LRTJ006_01"], ["LRT_JB_BK", "LRTJB009_01"], ["LRT_JB_BK", "LRTJB008_01"]]) {
    await station(page, route, key);
    const before = await readMap(page), url = page.url();
    assert.equal(before.documentWidth, width);
    const body = page.locator(".lrt-popup-body");
    const initial = await body.evaluate(el => {
      const rect = el.getBoundingClientRect(), service = el.querySelector(".lrt-service-button").getBoundingClientRect();
      return { height: el.clientHeight, visibleService: Math.min(rect.bottom, service.bottom) - Math.max(rect.top, service.top), columns: getComputedStyle(el).gridTemplateColumns };
    });
    assert.ok(initial.height >= 90, JSON.stringify(initial));
    assert.ok(initial.visibleService >= 40, "first view includes service information, not only the header");
    assert.equal(await page.locator(".lrt-popup-scroll-hint").isVisible(), true);
    for (const selector of [".lrt-service-button:not(:disabled)", ".integration-place-row-button", ".stop-popup-maps-link", ".stop-source-summary", ".stop-popup-nav-button"]) {
      const controls = page.locator(".lrt-popup " + selector);
      for (const control of await controls.all()) await control.click({ trial: true });
    }
    await page.locator(".lrt-popup .stop-source-summary").click();
    assert.ok(await page.locator(".lrt-popup .stop-source-body a[href]").count() > 0);
    await page.locator(".lrt-popup .stop-source-summary").click();
    const after = await readMap(page);
    const shift = await page.evaluate(([a, b]) => map.project(a).distanceTo(map.project(b)), [after.center, before.center]);
    assert.ok(shift <= 1, `scrolling/actions preserve camera within Leaflet pixel rounding: ${shift}`);
    assert.equal(after.zoom, before.zoom);
    assert.equal(await page.evaluate(() => currentSelectedStopKey), key);
    assert.equal(page.url(), url);
    const popup = await page.locator(".leaflet-popup").boundingBox();
    assert.ok(popup.x >= 0 && popup.y >= 0 && popup.x + popup.width <= width && popup.y + popup.height <= height);
    for (const selector of ["#zoomInButton", "#gpsButton", ".leaflet-popup-close-button"]) await page.locator(selector).click({ trial: true });
    assert.equal(await page.locator(".leaflet-control-attribution").evaluate(el => {
      const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el.contains(hit);
    }), true, "provider credits remain visible");
  }
  assert.deepEqual(app.errors, []);
});

test("portrait popup scroll hint and source/navigation remain reachable at 320, 360 and 390", async t => {
  for (const [width, height] of [[320, 568], [360, 800], [390, 844]]) {
    const app = await openLayout(browser, width, height); t.after(() => app.context.close()); const { page } = app;
    await station(page, "LRT_JB_BK", "LRTJB008_01");
    assert.equal(await page.locator(".lrt-popup-scroll-hint").isVisible(), true);
    const before = await readMap(page);
    for (const selector of [".stop-popup-maps-link", ".stop-source-summary", ".stop-popup-nav-button"]) {
      for (const el of await page.locator(".lrt-popup " + selector).all()) await el.click({ trial: true });
    }
    const shift = await page.evaluate(([a, b]) => map.project(a).distanceTo(map.project(b)), [(await readMap(page)).center, before.center]);
    assert.ok(shift <= 1, `scroll camera rounding: ${shift}`);
    assert.equal((await readMap(page)).zoom, before.zoom);
    assert.equal((await readMap(page)).documentWidth, width);
    assert.deepEqual(app.errors, []);
  }
});

test("direct-link reload restores LRT station, active line and actionable popup", async t => {
  const app = await openLayout(browser, 390, 844); t.after(() => app.context.close()); const { page } = app;
  await station(page, "LRT_JB_CB", "LRTJB008_01");
  const url = page.url();
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true" && currentSelectedStopKey === "LRTJB008_01");
  await page.evaluate(() => { startupExperienceActive = false; clearTimeout(startupTourTimerId); setInfoModalOpen(false); closeProductTour(); });
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => currentSelectedRouteId), "LRT_JB_CB");
  assert.equal(page.url(), url);
  assert.equal(await page.locator('#stopList [aria-current="true"]').count(), 1);
  await page.locator('.lrt-popup [data-stop-nav="next"]').click();
  await page.waitForTimeout(800);
  assert.notEqual(await page.evaluate(() => currentSelectedStopKey), "LRTJB008_01");
  assert.equal(await page.evaluate(() => currentSelectedRouteId), "LRT_JB_CB");
  assert.deepEqual(app.errors, []);
});

test("all four production GeoJSON resources load through the app", async t => {
  const app = await openLayout(browser, 1366, 900); t.after(() => app.context.close());
  const resources = await app.page.evaluate(() => performance.getEntriesByType("resource").map(entry => new URL(entry.name).pathname).filter(path => path.endsWith(".geojson")));
  assert.deepEqual(resources.sort(), ["/data/brt_route.geojson", "/data/brt_stop.geojson", "/data/rail_route.geojson", "/data/rail_stop.geojson"]);
  assert.deepEqual(app.errors, []);
});
