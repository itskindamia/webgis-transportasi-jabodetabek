import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const launch = () => chromium.launch({ headless: true, ...(exe ? { executablePath: exe } : {}) });

test("D5.21 BRT route code stays white in route list and multi-corridor transfer badges", async t => {
  const browser = await launch();
  t.after(() => browser.close());
  const { page, context, errors } = await openLayout(browser, 1440, 900);
  t.after(() => context.close());
  await page.locator('[data-mode="BRT"]').click();
  await selectRoute(page, "BRT_01");
  await page.locator('#stopList [data-stop-key="BRT010_REG"]').click();
  await page.waitForFunction(() => currentSelectedStopKey === "BRT010_REG");
  const swatches = await page.locator(".tl-app .brt-route-badge .tj-route-code").evaluateAll(nodes =>
    nodes.map(n => getComputedStyle(n).color));
  assert.ok(swatches.length >= 3, "BRT codes are present on route, Popup and integration");
  assert.ok(swatches.every(color => color === "rgb(255, 255, 255)"), "all displayed BRT badge codes use white");
  assert.deepEqual(errors, []);
});

test("D5.22 route header omits duplicate stop name but selected tab retains it", async t => {
  const browser = await launch();
  t.after(() => browser.close());
  const { page, context, errors } = await openLayout(browser, 1440, 900);
  t.after(() => context.close());
  await page.locator('[data-mode="BRT"]').click();
  await selectRoute(page, "BRT_06");
  await page.locator('#stopList [data-stop-key="BRT078_REG"]').click();
  await page.waitForFunction(() => currentSelectedStopKey === "BRT078_REG");
  await page.locator("#tlTabSelected").click();
  assert.match(await page.locator("#tlDetailTitle").innerText(), /Koridor 6/);
  assert.ok(await page.locator("#tlDetailSubtitle").isHidden(), "the redundant header subtitle is hidden");
  assert.match(await page.locator("#selectedStopInfo").innerText(), /Galunggung/);
  assert.deepEqual(errors, []);
});

test("D5.23 selected-stop passenger card has breathing room below status badges", async t => {
  const browser = await launch();
  t.after(() => browser.close());
  const { page, context, errors } = await openLayout(browser, 1440, 900);
  t.after(() => context.close());
  await page.locator('[data-mode="BRT"]').click();
  await selectRoute(page, "BRT_06");
  await page.locator('#stopList [data-stop-key="BRT078_REG"]').click();
  await page.waitForFunction(() => currentSelectedStopKey === "BRT078_REG");
  // The detailed service card is copied into Panel via the actual
  // Popup-to-Panel action; simply selecting the tab leaves its quick summary.
  await page.locator(".leaflet-popup .tl-show-stop-in-panel").click();
  await page.locator("#selectedStopInfo .stop-popup-activity").waitFor();
  const layout = await page.evaluate(() => {
    const scope = document.getElementById("selectedStopInfo");
    const badges = scope?.querySelector(".stop-popup-meta-row, .selected-stop-meta");
    const card = scope?.querySelector(".stop-popup-activity");
    if (!badges || !card) return null;
    return {
      gap: card.getBoundingClientRect().top - badges.getBoundingClientRect().bottom,
      cardMarginTop: getComputedStyle(card).marginTop,
      cardVisible: getComputedStyle(card).display !== "none"
    };
  });
  assert.ok(layout, "selected-stop summary and passenger card both exist");
  assert.ok(layout.cardVisible);
  assert.ok(layout.gap >= 8, "passenger service is separated by at least 8px; got " + layout.gap);
  assert.deepEqual(errors, []);
});

test("D5.24 reused route layers preserve correct geometry, stops, and click targets", async t => {
  const browser = await launch();
  t.after(() => browser.close());
  const { page, context, errors } = await openLayout(browser, 1440, 900);
  t.after(() => context.close());
  await page.locator('[data-mode="BRT"]').click();
  await selectRoute(page, "BRT_01");
  await page.evaluate(() => { window.__d51FirstRouteLayer = routeLayer; });
  await selectRoute(page, "BRT_06");
  await selectRoute(page, "BRT_01");
  const result = await page.evaluate(() => ({
    reused: routeLayer === window.__d51FirstRouteLayer,
    active: currentSelectedRouteId,
    geometryIds: [...new Set(routeLayer.getLayers().map(layer => getRouteId(layer.feature)))],
    stopCount: stopLayer.getLayers().length,
    clickableStopCount: stopHitLayer.getLayers().length,
    popupsBound: routeLayer.getLayers().every(layer => Boolean(layer.getPopup()))
  }));
  assert.equal(result.reused, true, "revisited single-route Leaflet groups are reused");
  assert.equal(result.active, "BRT_01");
  assert.deepEqual(result.geometryIds, ["BRT_01"]);
  assert.ok(result.stopCount > 0 && result.clickableStopCount >= result.stopCount);
  assert.equal(result.popupsBound, true, "route click/popups stay bound");
  assert.deepEqual(errors, []);
});

test("D5.24 Popup markup is lazy but still available to both Popup and Panel", async t => {
  const browser = await launch();
  t.after(() => browser.close());
  const { page, context, errors } = await openLayout(browser, 1440, 900);
  t.after(() => context.close());
  await page.locator('[data-mode="BRT"]').click();
  await selectRoute(page, "BRT_01");
  const before = await page.evaluate(() => {
    const layers = stopLayer.getLayers();
    return {
      total: layers.length,
      eager: layers.filter(layer => Boolean(layer.getPopup()?._content)).length
    };
  });
  assert.ok(before.total > 0, "the route creates stop markers");
  assert.equal(before.eager, 0, "stop popup markup is not built for unopened stops");
  await page.locator('#stopList [data-stop-key="BRT010_REG"]').click();
  await page.waitForFunction(() => currentSelectedStopKey === "BRT010_REG");
  const popup = await page.evaluate(() => stopMarkerByKey.get("BRT010_REG").getPopup().getContent());
  assert.match(popup, /Dukuh Atas/);
  await page.locator(".leaflet-popup .tl-show-stop-in-panel").click();
  assert.match(await page.locator("#selectedStopInfo").innerText(), /Dukuh Atas/);
  assert.deepEqual(errors, []);
});
