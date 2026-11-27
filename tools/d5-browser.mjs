import assert from "node:assert/strict";

export const fixtures = [
  { name: "sudirman-krl", mode: "KRL", route: "KRL_CK", stop: "KRL059", key: "KRL059_01", integrations: 5 },
  { name: "dukuh-atas-brt", mode: "BRT", route: "BRT_01", stop: "BRT010", key: "BRT010_REG", integrations: 4 },
  { name: "dukuh-atas-bsi", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB001", key: "LRTJB001_01", integrations: 4 },
  { name: "cawang-lrt", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB008", key: "LRTJB008_01", integrations: 1 },
  { name: "tangerang-krl", mode: "KRL", route: "KRL_TA", stop: "KRL039", key: "KRL039_01" },
  { name: "duri-krl", mode: "KRL", route: "KRL_TA", stop: "KRL029", key: "KRL029_01" },
  { name: "asean-mrt", mode: "MRT", route: "MRT_NS", stop: "MRT007", key: "MRT007_01", integrations: 3 }
];

export const popupSelector = ".leaflet-popup .stop-popup-ui";
export const panelSelector = "#selectedStopInfo > .stop-popup-ui";

export function stationUrl(base, { mode, route, stop }) {
  const url = new URL(base);
  url.search = new URLSearchParams({ mode, route, stop });
  return url.href;
}

export async function acceptWelcome(page) {
  await page.waitForFunction(() => !document.getElementById("infoModalBackdrop").hidden || !document.getElementById("productTour").hidden);
  const accept = page.locator("#infoModalAccept");
  if (await accept.isVisible()) await accept.click();
  await page.locator("#productTourSkip").click();
}

export async function waitForCamera(page, { zoomAtStop = false, realTiles = false } = {}) {
  await page.waitForFunction(async ({ zoomAtStop, realTiles }) => {
    const viewport = () => JSON.stringify([map.getZoom(), map.getCenter(), map.getSize()]);
    const start = viewport();
    await new Promise(resolve => setTimeout(resolve, 100));
    if (start !== viewport() || (zoomAtStop && map.getZoom() !== STOP_ZOOM)
        || map._panAnim?._inProgress || map._animatingZoom
        || map.getContainer().clientWidth !== map.getSize().x) return false;
    if (!realTiles) return true;
    const region = map.getContainer().getBoundingClientRect();
    const tiles = [...map.getContainer().querySelectorAll("img.leaflet-tile")].filter(tile => {
      const rect = tile.getBoundingClientRect();
      return rect.width && rect.height && rect.left < region.right && rect.right > region.left
        && rect.top < region.bottom && rect.bottom > region.top;
    });
    return tiles.length > 0 && tiles.every(tile => tile.complete && tile.naturalWidth > 1);
  }, { zoomAtStop, realTiles }, { timeout: 45000 });
}

export async function waitForStation(page, fixture, options) {
  await page.locator(`${popupSelector}[data-stop-key="${fixture.key}"]`).waitFor();
  await page.waitForFunction(({ route, integrations }) => currentSelectedRouteId === route &&
    (innerWidth < 1024 || !integrations || webgisSpatialIntegrations.count === integrations), fixture);
  await waitForCamera(page, { ...options, zoomAtStop: true });
  await page.waitForFunction(() => Number(getComputedStyle(map._popup.getElement()).opacity) > 0.99);
}

export function popupCoverage(page) {
  return page.evaluate(() => {
    const popup = map._popup.getElement();
    const bounds = popup.querySelector(".leaflet-popup-content-wrapper").getBoundingClientRect();
    const [x, y] = (popup.style.translate || "0 0").split(" ").map(parseFloat);
    const native = { left: bounds.left - x, right: bounds.right - x, top: bounds.top - y, bottom: bounds.bottom - y };
    const region = map.getContainer().getBoundingClientRect();
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const markers = [...document.querySelectorAll(".tl-integration-target-marker")];
    const badges = markers.map(marker => marker.getBoundingClientRect()).filter(rect => overlap(rect, region));
    const labelRects = markers.map(marker => marker.querySelector(".tl-integration-target-symbol").getBoundingClientRect())
      .filter(rect => overlap(rect, region));
    const count = (rect, targets) => targets.filter(target => overlap(rect, target) >= 1).length;
    const stop = getStopByKey(currentSelectedStopKey);
    const controls = [...document.querySelectorAll(".tl-map-actions, .tl-map-navigation, .tl-dock")];
    return {
      placement: popup.dataset.popupSide ?? "normal",
      nativeCovered: count(native, badges),
      covered: count(bounds, badges),
      nativeLabels: count(native, labelRects),
      labelsCovered: count(bounds, labelRects),
      insideMap: bounds.left >= region.left - 1 && bounds.right <= region.right + 1 &&
        bounds.top >= region.top - 1 && bounds.bottom <= region.bottom + 1,
      controlsCovered: count(bounds, controls.map(el => el.getBoundingClientRect())),
      mapped: markers.length,
      bounds: bounds.toJSON(),
      anchor: [map._popup.getLatLng().lng, map._popup.getLatLng().lat],
      coordinates: stop.geometry.coordinates,
      links: Object.values(map._layers).filter(layer => layer instanceof L.Polyline && layer.options.pane === "tlIntegrationLinkPane")
        .map(layer => layer.getLatLngs().map(point => [point.lng, point.lat]))
    };
  });
}

export function readSelection(page) {
  return page.evaluate(() => ({ route: currentSelectedRouteId, stop: currentSelectedStopKey,
    mode: modeSelect.value, status: statusSelect.value, url: location.href,
    camera: { center: map.getCenter(), zoom: map.getZoom() } }));
}

export async function switchPresentation(page, control) {
  // Measure at activation. A separate read can race the end of a station
  // flyTo or the pending native Leaflet pan before the click is processed.
  await page.evaluate(() => document.addEventListener("click", () => {
    window.d5BeforeSwitch = {
      route: currentSelectedRouteId, stop: currentSelectedStopKey,
      mode: modeSelect.value, status: statusSelect.value, url: location.href,
      camera: { center: map.getCenter(), zoom: map.getZoom() }
    };
  }, { capture: true, once: true }));
  await page.locator(control).click();
  return page.evaluate(() => window.d5BeforeSwitch);
}

export async function assertSelectionUnchanged(page, before) {
  const { camera, ...after } = await readSelection(page);
  const { camera: previous, ...selection } = before;
  assert.deepEqual(after, selection);
  assert.equal(camera.zoom, previous.zoom);
  const pixels = await page.evaluate(([a, b]) => map.project(a).distanceTo(map.project(b)), [camera.center, previous.center]);
  assert.ok(pixels <= 1, `camera preserved within 1 px (moved ${pixels})`);
}
