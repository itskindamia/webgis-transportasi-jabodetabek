import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

let browser;
const bekasi = "LRT_JB_BK";
const dukuh = "LRTJB001_01";
const cawang = "LRTJB008_01";

before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
});
after(async () => { await browser?.close(); });

async function setup(t) {
  const view = await openLayout(browser, 1440, 900);
  t.after(() => view.context.close());
  await view.page.locator('[data-mode="LRT"]').click();
  await selectRoute(view.page, bekasi);
  await view.page.locator(`#stopList [data-stop-key="${dukuh}"]`).waitFor();
  return view;
}

async function selectStation(page, key) {
  await page.locator("#tlTabStops").click();
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await page.waitForFunction(k => currentSelectedStopKey === k, key);
}

async function waitForCamera(page) {
  await page.waitForFunction(() =>
    !map._panAnim?._inProgress && !map._animatingZoom
    && map.getSize().x === map.getContainer().clientWidth
  );
}

async function setPanelMode(page, mode) {
  await page.click("#basemapButton");
  await page.locator("#tlStopInfoMode").selectOption(mode);
  await page.click("#basemapClose");
}

test("D4 shows every resolvable direct integration on selected station in Popup mode", async t => {
  const { page, errors } = await setup(t);
  await selectStation(page, dukuh);
  await page.locator('.leaflet-popup .stop-popup-ui').waitFor();
  await page.waitForFunction(() => window.webgisSpatialIntegrations?.count > 0);
  const values = await page.evaluate(() => ({
    key: currentSelectedStopKey,
    count: webgisSpatialIntegrations.count,
    markers: document.querySelectorAll(".tl-integration-target-marker").length,
    lines: document.querySelectorAll("#map .leaflet-overlay-pane svg path").length,
    summaryVisible: !document.querySelector("#map .tl-integration-map-summary").hidden
  }));
  assert.equal(values.key, dukuh);
  assert.ok(values.count >= 1);
  assert.equal(values.markers, values.count);
  assert.equal(values.summaryVisible, true);
  assert.ok(await page.locator("#map .tl-integration-map-summary").innerText().then(v => v.includes("bukan jalur pejalan kaki")));
  assert.deepEqual(errors, []);
});

test("D4 Panel mode uses identical selected-stop integrations and toggling keeps selection, URL and camera", async t => {
  const { page, errors } = await setup(t);
  await selectStation(page, dukuh);
  await page.waitForFunction(() => window.webgisSpatialIntegrations?.count > 0);
  // Wait for the station flyTo to finish before comparing a camera snapshot.
  // Capturing during zoom animation can produce fractional in-flight zoom.
  await waitForCamera(page);
  const before = await page.evaluate(() => ({
    count: webgisSpatialIntegrations.count, stop: currentSelectedStopKey,
    route: currentSelectedRouteId, zoom: map.getZoom(), center: map.getCenter(), url: location.href
  }));
  await setPanelMode(page, "panel");
  await page.locator('#selectedStopInfo > .stop-popup-ui').waitFor();
  await page.waitForFunction(c => webgisSpatialIntegrations.count === c, before.count);
  assert.equal(await page.locator(".leaflet-popup .stop-popup-ui").count(), 0);
  await page.click("#basemapButton");
  const checkbox = page.locator("#tlShowIntegrationOverlay");
  await checkbox.uncheck();
  await page.waitForFunction(() => webgisSpatialIntegrations.count === 0);
  assert.equal(await page.locator(".tl-integration-target-marker").count(), 0);
  await checkbox.check();
  await page.click("#basemapClose");
  await page.waitForFunction(c => webgisSpatialIntegrations.count === c, before.count);
  await waitForCamera(page);
  const after = await page.evaluate(() => ({
    stop: currentSelectedStopKey, route: currentSelectedRouteId,
    zoom: map.getZoom(), center: map.getCenter(), url: location.href
  }));
  assert.equal(after.stop, before.stop);
  assert.equal(after.route, before.route);
  assert.equal(after.zoom, before.zoom);
  assert.equal(after.url, before.url);
  assert.ok(mapDistance(after.center, before.center) < 0.00001);
  assert.deepEqual(errors, []);
});

function mapDistance(a, b) {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng);
}

test("D4 overlays follow Cawang selection and disappear on filter/selection clear", async t => {
  const { page, errors } = await setup(t);
  await selectStation(page, cawang);
  await page.waitForFunction(() => window.webgisSpatialIntegrations?.count >= 1);
  const count = await page.evaluate(() => webgisSpatialIntegrations.count);
  assert.ok(count >= 1);
  await page.evaluate(() => clearSelectedStop());
  await page.waitForFunction(() => webgisSpatialIntegrations?.count === 0);
  assert.equal(await page.locator(".tl-integration-target-marker").count(), 0);
  assert.deepEqual(errors, []);
});
