import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
});
after(async () => browser?.close());

async function openBrt12(t, width = 1440, height = 900) {
  const view = await openLayout(browser, width, height);
  t.after(() => view.context.close());
  await view.page.locator('[data-mode="BRT"]').click();
  await selectRoute(view.page, "BRT_12");
  await view.page.waitForFunction(() => stopMarkerByKey.has("BRT176_REG") &&
    stopOneWayArrowMarkers.length > 0);
  return view;
}

test("D5.2: Penjaringan arrow follows the local route bearing to Pluit, not a fixed right arrow", async t => {
  const { page, errors } = await openBrt12(t);
  const state = await page.evaluate(() => {
    const feature = stopData.features.find(f => getStopKey(f) === "BRT176_REG");
    const arrow = getBrtOneWayStopArrowInfo("BRT_12", getMapOperationalStopsForRoute("BRT_12"))
      .get("BRT176_REG");
    const marker = stopMarkerByKey.get("BRT176_REG");
    const rendered = stopOneWayArrowMarkers.find(m =>
      m.getLatLng().distanceTo(marker.getLatLng()) < 0.5);
    return {
      rawDirection: getRawStopDirectionForRoute(feature, "BRT_12"),
      bearing: arrow?.bearing,
      distance: arrow?.distanceMetres,
      rendered: Boolean(rendered),
      pane: rendered?.options.pane,
      interactive: rendered?.options.interactive,
      positionDifference: rendered?.getLatLng().distanceTo(marker.getLatLng()),
      icon: rendered?.getElement()?.querySelector(".stop-oneway-indicator-inner")?.dataset.onewayBearing
    };
  });
  assert.equal(state.rawDirection, "Pluit");
  assert.ok(state.bearing >= 325 || state.bearing <= 35,
    "Penjaringan flow is nearly north, not screen-right: " + state.bearing);
  assert.ok(state.distance < 85, "route is geographically close to the stop");
  assert.equal(state.rendered, true);
  assert.equal(state.pane, "stopHitPane");
  assert.equal(state.interactive, false);
  assert.ok(state.positionDifference < 0.5, "geographic coordinate unchanged");
  assert.equal(Number(state.icon), state.bearing);
  assert.deepEqual(errors, []);
});

test("D5.2: existing two-way/unknown stops are unchanged and KRL shows no BRT arrows", async t => {
  const { page, errors } = await openBrt12(t);
  const before = await page.evaluate(() => {
    const known = stopData.features.find(f => f.properties.STOP_NAME === "Danau Sunter"
      && stopServesRoute(f, "BRT_12"));
    const arrows = getBrtOneWayStopArrowInfo("BRT_12", getMapOperationalStopsForRoute("BRT_12"));
    return {
      unknownOneWayArrow: arrows.has(getStopKey(known)),
      count: stopOneWayArrowMarkers.length,
      hitTargets: stopHitLayer.getLayers().filter(l => l.options?.pane === "stopClickPane").length
    };
  });
  assert.equal(before.unknownOneWayArrow, false);
  assert.ok(before.count > 0);
  assert.ok(before.hitTargets > 0);
  await page.locator('[data-mode="KRL"]').click();
  await selectRoute(page, "KRL_CK");
  await page.waitForFunction(() => currentSelectedRouteId === "KRL_CK");
  const after = await page.evaluate(() => ({
    count: stopOneWayArrowMarkers.length,
    elements: document.querySelectorAll("#map .stop-oneway-indicator").length
  }));
  assert.equal(after.count, 0);
  assert.equal(after.elements, 0);
  assert.deepEqual(errors, []);
});

test("D5.2: arrow visibility follows zoom while original stop selection still works", async t => {
  const { page, errors } = await openBrt12(t, 1280, 720);
  const state = await page.evaluate(async () => {
    const target = stopMarkerByKey.get("BRT176_REG");
    const arrow = stopOneWayArrowMarkers.find(m =>
      m.getLatLng().distanceTo(target.getLatLng()) < .5);
    map.setZoom(14, { animate: false });
    await new Promise(resolve => requestAnimationFrame(resolve));
    const hidden = arrow.options.opacity === 0;
    map.setZoom(16, { animate: false });
    await new Promise(resolve => requestAnimationFrame(resolve));
    return {
      hidden,
      visible: arrow.options.opacity === 1,
      arrowPointerEvents: getComputedStyle(arrow.getElement()).pointerEvents
    };
  });
  assert.deepEqual(state, { hidden: true, visible: true, arrowPointerEvents: "none" });
  await page.locator("#tlTabStops").click();
  await page.locator('#stopList [data-stop-key="BRT176_REG"]').click();
  await page.waitForFunction(() => currentSelectedStopKey === "BRT176_REG");
  assert.ok(page.url().includes("stop="));
  assert.deepEqual(errors, []);
});

test("D5.2: synthetic bend rotates according to nearest local route segment", async t => {
  const { page, errors } = await openBrt12(t);
  const angles = await page.evaluate(() => {
    const coords = [[106.8, -6.1], [106.8, -6.09], [106.82, -6.09]];
    const records = [
      { id: "a", destination: "foo", sequence: "1", lat: -6.1, lng: 106.8 },
      { id: "b", destination: "foo", sequence: "2", lat: -6.09, lng: 106.81 },
      { id: "c", destination: "foo", sequence: "3", lat: -6.09, lng: 106.82 }
    ];
    const arrows = webgisOneWayStopArrows.calculate(records,
      [{ geometry: { type: "LineString", coordinates: coords } }]);
    return {
      east: arrows.get("b")?.bearing,
      west: webgisOneWayStopArrows.calculate(
        records.map(r => ({ ...r, sequence: String(4 - Number(r.sequence)) })),
        [{ geometry: { type: "LineString", coordinates: coords } }]
      ).get("b")?.bearing
    };
  });
  assert.ok(Math.abs(angles.east - 90) < 5, "at bend arrow follows eastbound segment");
  assert.ok(Math.abs(angles.west - 270) < 5, "reverse stop order reverses arrow");
  assert.deepEqual(errors, []);
});
