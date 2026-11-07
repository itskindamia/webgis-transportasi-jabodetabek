import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, chooseRoute, readMap } from "./layout-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });
const viewports = [[320, 568], [360, 800], [390, 844], [768, 1024], [1366, 900], [1600, 1000]];

for (const [width, height] of viewports) test(`mobile-first shell and popup bounds at ${width}x${height}`, async t => {
  const app = await openLayout(browser, width, height); t.after(() => app.context.close()); const { page } = app;
  await chooseRoute(page);
  const state = await readMap(page);
  assert.equal(state.documentWidth, width);
  assert.deepEqual(state.size, state.container);
  if (width >= 1024) {
    const network = await page.locator("#filterPanel").boundingBox(), detail = await page.locator("#tlDetailPanel").boundingBox(), map = await page.locator("#map").boundingBox();
    assert.ok(network.x + network.width <= map.x + 1 && map.x + map.width <= detail.x + 1);
  }
  if (width < 768) await page.click("#tlDetailExpand");
  await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click();
  await page.waitForTimeout(950);
  const popup = await page.locator(".leaflet-popup").boundingBox(), map = await page.locator("#map").boundingBox();
  assert.ok(popup.x >= map.x && popup.x + popup.width <= map.x + map.width, `popup x ${popup.x}..${popup.x + popup.width}`);
  assert.ok(popup.y >= map.y && popup.y + popup.height <= map.y + map.height, `popup y ${popup.y}..${popup.y + popup.height} within ${map.y}..${map.y + map.height}`);
  await page.locator(".leaflet-popup-close-button").click({ trial: true });
  assert.deepEqual(app.errors, []);
});

test("three sheet positions and closing/reopening preserve the route and selection", async t => {
  const app = await openLayout(browser, 320, 568); t.after(() => app.context.close()); const { page } = app;
  await chooseRoute(page);
  const url = page.url();
  const heights = [];
  for (const [id, position] of [["tlDetailCollapse", "collapsed"], ["tlDetailHalf", "half"], ["tlDetailExpand", "expanded"]]) {
    await page.click("#" + id); await page.waitForTimeout(200);
    assert.equal(await page.locator("#tlDetailPanel").getAttribute("data-sheet-position"), position);
    heights.push((await page.locator("#tlDetailPanel").boundingBox()).height);
    assert.equal(page.url(), url);
  }
  assert.ok(heights[0] < heights[1] && heights[1] < heights[2], heights.join(","));
  await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click(); await page.waitForTimeout(950);
  const selected = await page.evaluate(() => currentSelectedStopKey), selectedUrl = page.url();
  await page.click("#tlDetailResume"); await page.click("#tlDetailClose"); await page.click("#tlMobileDetails");
  assert.equal(await page.evaluate(() => currentSelectedStopKey), selected);
  assert.equal(page.url(), selectedUrl);
  assert.deepEqual(app.errors, []);
});

test("panel scrolling does not pan/zoom the map or repeatedly invalidate its unchanged size", async t => {
  const app = await openLayout(browser, 390, 844); t.after(() => app.context.close()); const { page } = app;
  await chooseRoute(page); await page.click("#tlDetailExpand"); await page.waitForTimeout(250);
  const before = await readMap(page);
  await page.evaluate(() => { window.mobileInvalidations = 0; const original = map.invalidateSize; map.invalidateSize = function (...args) { mobileInvalidations++; return original.apply(this, args); }; });
  await page.locator("#routeDetailCard").hover(); await page.mouse.wheel(0, 450); await page.waitForTimeout(150);
  await page.click("#mobileBottomRouteButton"); await page.click("#mobileFilterClose"); await page.waitForTimeout(200);
  const after = await readMap(page);
  assert.deepEqual(after.center, before.center); assert.equal(after.zoom, before.zoom);
  assert.equal(await page.evaluate(() => mobileInvalidations), 0, "overlay-only changes do not invalidate Leaflet");
  assert.deepEqual(app.errors, []);
});

test("orientation and keyboard-sized visual viewport remain usable and preserve selection", async t => {
  const app = await openLayout(browser, 390, 844); t.after(() => app.context.close()); const { page } = app;
  await chooseRoute(page); await page.click("#tlDetailExpand"); await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click(); await page.waitForTimeout(950);
  const selected = await page.evaluate(() => currentSelectedStopKey), url = page.url();
  for (const [width, height] of [[568, 320], [844, 390], [390, 844], [767, 844], [768, 1024], [1024, 768]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(350);
    const map = await readMap(page); assert.deepEqual(map.size, map.container); assert.equal(map.documentWidth, width);
    const popup = await page.locator(".leaflet-popup").boundingBox();
    if (popup) assert.ok(popup.y >= 0 && popup.y + popup.height <= height, `${width}x${height} popup ${popup.y}..${popup.y + popup.height}`);
    assert.equal(await page.evaluate(() => currentSelectedStopKey), selected); assert.equal(page.url(), url);
  }
  await page.setViewportSize({ width: 568, height: 320 }); await page.waitForTimeout(250);
  await page.click("#basemapButton");
  const basemap = await page.locator("#basemapPanel").boundingBox();
  assert.ok(basemap.y >= 0 && basemap.y + basemap.height <= 320);
  await page.click("#basemapClose", { trial: true });
  await page.click("#basemapClose");
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(250);
  await page.focus("#globalSearchInput"); await page.setViewportSize({ width: 390, height: 480 }); await page.waitForTimeout(250);
  assert.equal(await page.locator("body").evaluate(el => el.classList.contains("tl-keyboard-open")), true);
  assert.equal(await page.locator("#globalSearchInput").isVisible(), true);
  assert.equal(await page.locator(".leaflet-popup").isVisible(), false);
  assert.deepEqual((await readMap(page)).size, (await readMap(page)).container);
  await page.locator("#globalSearchInput").blur(); await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(250);
  assert.equal(await page.locator("body").evaluate(el => el.classList.contains("tl-keyboard-open")), false);
  assert.equal(await page.evaluate(() => currentSelectedStopKey), selected); assert.equal(page.url(), url);
  assert.deepEqual(app.errors, []);
});

test("pan and zoom with all existing network layers retain layer identities", async t => {
  const app = await openLayout(browser, 390, 844); t.after(() => app.context.close()); const { page } = app;
  const before = await page.evaluate(() => {
    window.mobileRouteLayer = routeLayer;
    return routeLayer.getLayers().map(layer => layer.feature.properties.GEOM_ID || layer.feature.properties.ROUTE_ID || layer.feature.properties.ID);
  });
  assert.ok(before.length > 10);
  await page.evaluate(() => { map.panBy([60, 20], { animate: false }); });
  await page.click("#zoomInButton"); await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => routeLayer === window.mobileRouteLayer), true, "view changes do not recreate network layers");
  const after = await page.evaluate(() => routeLayer.getLayers().map(layer => layer.feature.properties.GEOM_ID || layer.feature.properties.ROUTE_ID || layer.feature.properties.ID));
  assert.deepEqual(after, before);
  assert.deepEqual(app.errors, []);
});

test("guided tour remains readable and closable on a small phone", async t => {
  const app = await openLayout(browser, 320, 568); t.after(() => app.context.close()); const { page } = app;
  await chooseRoute(page); await page.click("#tlDetailExpand"); await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click(); await page.waitForTimeout(950);
  await page.evaluate(() => startProductTour({ manual: true }));
  for (let index = 0; index < 5; index++) {
    await page.waitForTimeout(120);
    const card = await page.locator("#productTourCard").boundingBox();
    assert.ok(card.x >= 0 && card.y >= 0 && card.x + card.width <= 320 && card.y + card.height <= 568);
    await page.click("#productTourNext");
  }
  assert.equal(await page.locator("#productTour").isVisible(), false);
  assert.deepEqual(app.errors, []);
});
