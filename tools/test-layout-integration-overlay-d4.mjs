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

async function waitForSettledCamera(page) {
  // FlyTo and subsequent popup auto-pan can be distinct animations.
  // Require several identical camera samples before comparing states.
  await page.waitForFunction(() => {
    const center = map.getCenter();
    const current = [center.lat, center.lng, map.getZoom()].join(",");
    window.__d4CameraStable = window.__d4CameraLast === current
      ? (window.__d4CameraStable || 0) + 1 : 0;
    window.__d4CameraLast = current;
    return window.__d4CameraStable >= 4 &&
      !map._panAnim?._inProgress && !map._animatingZoom;
  }, null, { polling: 140 });
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

test("D4 only draws verified INT_STOP or uniquely named physical destinations", async t => {
  const { page, errors } = await setup(t);
  await selectStation(page, dukuh);
  await page.waitForFunction(() => window.webgisSpatialIntegrations?.count === 4);
  const result = await page.evaluate(() => ({
    targets: webgisSpatialIntegrations.targets,
    markers: document.querySelectorAll(".tl-integration-target-marker").length,
    links: webgisSpatialIntegrations.linkCount
  }));
  assert.equal(result.markers, 4);
  assert.equal(result.links, result.markers);
  assert.deepEqual(result.targets.map(x => x.basis).every(x => ["int_stop", "name"].includes(x)), true);
  assert.ok(result.targets.some(x => x.key === "MRT012_01" && x.basis === "int_stop"));
  assert.deepEqual(errors, []);
});

test("D4 Cawang preserves its exact-name BRT stop and offsets the selectable near-origin icon", async t => {
  const { page, errors } = await setup(t);
  await selectStation(page, cawang);
  await page.waitForFunction(() => window.webgisSpatialIntegrations?.count === 1);
  const targets = await page.evaluate(() => webgisSpatialIntegrations.targets);
  assert.deepEqual(targets.map(x => x.key), ["BRT129_REG"]);
  assert.equal(targets[0].basis, "name");
  const marker = page.locator(".tl-integration-target-marker.is-near-origin");
  await marker.waitFor();
  assert.equal(await marker.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return el.contains(hit);
  }), true, "offset Cawang target marker must be topmost at its clickable center");
  await marker.click();
  await page.waitForFunction(() => currentSelectedStopKey === "BRT129_REG");
  assert.deepEqual(errors, []);
});

test("D4 shows all actual Transjakarta corridors at an integration destination with equal-sized badges", async t => {
  const { page, errors } = await setup(t);
  await page.locator('[data-mode="BRT"]').click();
  await selectRoute(page, "BRT_01");
  await page.locator("#tlTabStops").click();
  await page.locator('#stopList [data-stop-key="BRT010_REG"]').click();
  await page.waitForFunction(() => currentSelectedStopKey === "BRT010_REG");
  await page.waitForFunction(() =>
    window.webgisSpatialIntegrations?.targets.some(target => target.key === "BRT078_REG")
  );

  // Galunggung really has both corridors in its own ROUTES property.
  // This guards against hardcoding one interchange in the renderer.
  const state = await page.evaluate(() => {
    const target = webgisSpatialIntegrations.targets.find(item => item.key === "BRT078_REG");
    const feature = getStopByKey(target.key);
    return {
      sourceRoutes: getStopRoutes(feature).filter(id => id.startsWith("BRT_")),
      displayedRoutes: target.displayedRoutes,
      targetRoute: target.route
    };
  });
  assert.deepEqual(state.sourceRoutes, ["BRT_04", "BRT_06"]);
  assert.deepEqual(state.displayedRoutes, state.sourceRoutes);

  const marker = page.locator('.tl-integration-target-marker[title*="Galunggung"]');
  await marker.waitFor();
  assert.equal(await marker.count(), 1, "multi-line stop remains one physical marker");
  assert.deepEqual(await marker.locator(".brt-route-badge .tj-route-code").allTextContents(),
    ["4", "6"], "render all served corridors in the source field order");
  const visuals = await marker.locator(".brt-route-badge").evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    const code = node.querySelector(".tj-route-code");
    const font = getComputedStyle(code);
    return { width: box.width, height: box.height, fontSize: font.fontSize,
      weight: font.fontWeight, padding: getComputedStyle(node).padding };
  }));
  assert.equal(visuals.length, 2);
  assert.deepEqual(visuals[0], visuals[1],
    "route 4 numeral, dimensions and padding match route 6");
  assert.equal(await marker.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return node.contains(hit);
  }), true, "the first badge retains an accessible marker hit area");
  assert.deepEqual(errors, []);
});

test("D4 Popup Lihat semua temporarily clears popup obstruction and restores the detail camera", async t => {
  const { page, errors } = await setup(t);
  await selectStation(page, dukuh);
  await page.waitForFunction(() => window.webgisSpatialIntegrations?.count === 4);
  await page.waitForFunction(() => map.getZoom() === STOP_ZOOM);
  await waitForSettledCamera(page);
  const before = await page.evaluate(() => ({
    stop: currentSelectedStopKey, route: currentSelectedRouteId,
    center: map.getCenter(), zoom: map.getZoom(), url: location.href
  }));
  await page.locator("#map .tl-integration-fit").click();
  await page.waitForFunction(() => webgisSpatialIntegrations.overviewActive && map.getZoom() <= 16
    && !map._panAnim?._inProgress && !map._animatingZoom);
  assert.equal(await page.locator(".leaflet-popup").isVisible(), false);
  const markers = page.locator(".tl-integration-target-marker");
  assert.equal(await markers.count(), 4);
  const accessible = await markers.evaluateAll(nodes => {
    const bounds = document.getElementById("map").getBoundingClientRect();
    return nodes.map(el => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        within: rect.left >= bounds.left && rect.right <= bounds.right
          && rect.top >= bounds.top && rect.bottom <= bounds.bottom,
        clickable: el.contains(hit)
      };
    });
  });
  assert.ok(accessible.every(item => item.within && item.clickable),
    "every destination must be visible and not covered in the overview: " + JSON.stringify(accessible));
  await page.locator("#map .tl-integration-fit").click();
  await page.waitForFunction(() => !webgisSpatialIntegrations.overviewActive
    && map.getZoom() === STOP_ZOOM);
  await waitForSettledCamera(page);
  assert.equal(await page.locator(".leaflet-popup").isVisible(), true);
  const after = await page.evaluate(() => ({
    stop: currentSelectedStopKey, route: currentSelectedRouteId,
    center: map.getCenter(), zoom: map.getZoom(), url: location.href
  }));
  assert.equal(after.stop, before.stop);
  assert.equal(after.route, before.route);
  assert.equal(after.url, before.url);
  assert.equal(after.zoom, before.zoom);
  assert.ok(mapDistance(after.center, before.center) < 0.00001,
    "overview return must restore camera: " + JSON.stringify({ before: before.center, after: after.center }));
  assert.deepEqual(errors, []);
});
