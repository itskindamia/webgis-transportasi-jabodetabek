import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

const bekasi = "LRT_JB_BK";
const cibubur = "LRT_JB_CB";
const cawang = "LRTJB008_01";
const dukuhAtas = "LRTJB001_01";
const halim = "LRTJB009_01";
const popup = ".leaflet-popup .stop-popup-ui";
let browser;

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => { await browser?.close(); });

async function openBekasi(t, width = 1440, height = 900) {
  const view = await openLayout(browser, width, height);
  t.after(() => view.context.close());
  await view.page.locator('[data-mode="LRT"]').click();
  await selectRoute(view.page, bekasi);
  await view.page.locator(`#stopList [data-stop-key="${cawang}"]`).waitFor();
  return view;
}

async function waitForStation(page, key) {
  await page.locator(`${popup}[data-stop-key="${key}"]`).waitFor();
  await page.waitForFunction(stopKey => {
    const marker = stopMarkerByKey.get(stopKey);
    return currentSelectedStopKey === stopKey && marker?.isPopupOpen() &&
      marker.getPopup().getLatLng().equals(marker.getLatLng()) && !map._panAnim?._inProgress;
  }, key);
}

async function openFromDetail(page, key) {
  await page.locator("#tlTabStops").click();
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await waitForStation(page, key);
  await page.waitForFunction(() => map.getZoom() === STOP_ZOOM);
}

async function assertPlacement(page) {
  const positioned = () => {
    const popup = document.querySelector(".leaflet-popup:has(.stop-popup-ui)");
    if (!popup || map._panAnim?._inProgress) return false;
    const card = popup.querySelector(".leaflet-popup-content-wrapper").getBoundingClientRect();
    const bounds = document.querySelector("#map").getBoundingClientRect();
    const footer = popup.querySelector(".stop-popup-navigation")?.getBoundingClientRect();
    const overlays = [".tl-map-caption", ".tl-map-actions", ".tl-map-navigation",
      ".tl-dock", "#filterPanel", "#tlDetailPanel"].map(selector => document.querySelector(selector).getBoundingClientRect());
    const overlaps = overlays.some(rect => card.left < rect.right - 1 && card.right > rect.left + 1 &&
      card.top < rect.bottom - 1 && card.bottom > rect.top + 1);
    return !overlaps && card.width >= 300 && card.width <= 320 &&
      card.left >= bounds.left && card.right <= bounds.right && card.top >= bounds.top &&
      card.bottom <= bounds.bottom && footer?.bottom <= card.bottom;
  };
  await page.waitForFunction(positioned, null, { timeout: 5000 });
  await page.locator(".leaflet-popup-close-button").click({ trial: true });
  await page.locator(`${popup} .stop-popup-nav-button`).first().click({ trial: true });
}

for (const [width, height] of [[1024, 650], [1366, 768], [1440, 900], [1920, 1080]]) {
  test(`D3 fits a single, readable desktop popup beside Detail at ${width}x${height}`, async t => {
    const { page, errors } = await openBekasi(t, width, height);
    await openFromDetail(page, cawang);
    await assertPlacement(page);
    assert.equal(await page.locator(popup).count(), 1);
    assert.equal((await page.locator(`${popup} .stop-popup-title`).innerText()).trim(), "Cawang");
    assert.equal(await page.locator(`${popup} .stop-popup-title`).evaluate(el => getComputedStyle(el).fontSize), "21px");
    assert.equal((await page.locator("#selectedStopInfo .selected-stop-title").textContent()).trim(), "Cawang");
    assert.equal(await page.locator("#tlDetailPanel").getAttribute("data-tab"), "stops");
    assert.equal(await page.locator(`#stopList [aria-current="true"]`).getAttribute("data-stop-key"), cawang);
    assert.equal(new URL(page.url()).searchParams.get("stop"), "LRTJB008");
    assert.equal(await page.locator(`${popup} .lrt-popup-body`).evaluate(el => el.scrollHeight > el.clientHeight + 1), false);
    const routes = await page.locator(`${popup} .stop-popup-direct-routes button`).evaluateAll(buttons =>
      buttons.map(button => ({ route: button.dataset.routeSwitch, active: button.disabled, asset: button.querySelector("img")?.getAttribute("src") })));
    assert.deepEqual(routes.find(route => route.active), { route: bekasi, active: true, asset: "assets/lines/lrt-jabodebek-bk.png" });
    assert.deepEqual(routes.find(route => !route.active), { route: cibubur, active: false, asset: "assets/lines/lrt-jabodebek-cb.png" });
    assert.deepEqual(errors, []);
  });
}

test("D3 keeps the map, station list, active line, navigation and permalink synchronized", async t => {
  const { page, errors } = await openBekasi(t);
  await openFromDetail(page, cawang);
  const next = page.locator(`${popup} [data-stop-nav="next"]`);
  assert.equal(await next.getAttribute("data-stop-key"), halim);
  await page.locator(`${popup} [data-route-switch="${cibubur}"]`).click();
  await waitForStation(page, cawang);
  await page.waitForFunction(route => currentSelectedRouteId === route &&
    document.querySelector(".leaflet-popup [data-stop-nav=next]")?.dataset.routeId === route, cibubur);
  const branches = await page.locator(`${popup} .stop-popup-direct-routes button`).evaluateAll(buttons =>
    buttons.map(button => [button.dataset.routeSwitch, button.disabled, button.getBoundingClientRect().left]));
  assert.ok(branches.find(([id, active]) => id === cibubur && active)[2] < branches.find(([id]) => id === bekasi)[2],
    "the active branch is visually first");
  const nextCibubur = await next.getAttribute("data-stop-key");
  assert.notEqual(nextCibubur, halim);
  await page.locator("#tlDetailClose").click();
  assert.equal(await page.locator("#tlDetailPanel").isVisible(), false);
  await assertPlacement(page);
  await next.press("Enter");
  await waitForStation(page, nextCibubur);
  assert.equal(await page.locator("#tlDetailPanel").isVisible(), false, "navigation does not reopen Detail");
  assert.equal(await page.locator(`#stopList [aria-current="true"]`).getAttribute("data-stop-key"), nextCibubur);
  const stopId = await page.evaluate(key => getStopByKey(key).properties.STOP_ID, nextCibubur);
  assert.equal(new URL(page.url()).searchParams.get("stop"), stopId);
  await page.locator(`${popup} [data-stop-nav="previous"]`).click();
  await waitForStation(page, cawang);
  await selectRoute(page, bekasi);
  await page.locator(popup).waitFor({ state: "detached" });
  assert.equal(new URL(page.url()).searchParams.get("stop"), null);
  assert.deepEqual(errors, []);
});

test("D3 shows the repository's explicit transfer, branding and reachable footer at a busy station", async t => {
  const { page, errors } = await openBekasi(t);
  await openFromDetail(page, dukuhAtas);
  const source = await page.evaluate(key => getStopByKey(key).properties.INT_STOP, dukuhAtas);
  assert.match(source, /(?:^|;)MRT_NS:MRT012(?:;|$)/);
  const transfer = page.locator(`${popup} [data-integration-stop-key="MRT012_01"][data-integration-route-id="MRT_NS"]`);
  assert.match(await transfer.innerText(), /Dukuh Atas BNI/);
  assert.equal(await transfer.locator("xpath=ancestor::*[contains(@class, 'integration-group')][1]")
    .locator(".integration-group-header .integration-logo").getAttribute("src"), "assets/logos/mrt-jakarta.svg");
  const scroll = await page.locator(popup).evaluate(root => [...root.querySelectorAll("*")]
    .filter(el => el.clientHeight && el.scrollHeight > el.clientHeight + 1 && ["auto", "scroll"].includes(getComputedStyle(el).overflowY))
    .map(el => el.classList.contains("lrt-popup-body")));
  assert.deepEqual(scroll, [true], "only the body scrolls when the source list is long");
  await assertPlacement(page);
  // The map popup intentionally previews only the first two destinations.
  // The full Panel contains every clickable destination, including MRT.
  assert.equal(await transfer.isVisible(), false);
  await page.locator(`${popup} .tl-show-stop-in-panel`).click();
  const fullTransfer = page.locator('#selectedStopInfo [data-integration-stop-key="MRT012_01"][data-integration-route-id="MRT_NS"]');
  await fullTransfer.waitFor();
  await fullTransfer.click();
  await waitForStation(page, "MRT012_01");
  assert.equal(await page.evaluate(() => currentSelectedRouteId), "MRT_NS");
  assert.equal(await page.locator(`#stopList [aria-current="true"]`).getAttribute("data-stop-key"), "MRT012_01");
  assert.deepEqual(errors, []);
});

test("D3 Leaflet auto-pan clears the map edges, controls and Detail after a marker click", async t => {
  const { page, errors } = await openBekasi(t);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const click = await page.evaluate(key => {
    const station = stopMarkerByKey.get(key).getLatLng();
    map.setView(station, STOP_ZOOM, { animate: false });
    const nearCorner = L.point(map.getSize().x - 100, 110);
    map.panBy(map.latLngToContainerPoint(station).subtract(nearCorner), { animate: false });
    const point = map.latLngToContainerPoint(station);
    const rect = map.getContainer().getBoundingClientRect();
    return { x: rect.left + point.x, y: rect.top + point.y };
  }, cawang);
  assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.classList.contains("stop-hit-target"), click), true);
  await page.mouse.click(click.x, click.y);
  await waitForStation(page, cawang);
  await assertPlacement(page);
  assert.equal((await page.locator("#selectedStopInfo .selected-stop-title").textContent()).trim(), "Cawang");
  await page.evaluate(() => {
    window.d3AutoPanCount = 0;
    map.on("autopanstart", () => { window.d3AutoPanCount += 1; });
    const popup = map._popup;
    const nearBottomLeft = L.point(40, map.getSize().y - 30);
    map.panBy(map.latLngToContainerPoint(popup.getLatLng()).subtract(nearBottomLeft), { animate: false });
  });
  await page.waitForFunction(() => window.d3AutoPanCount > 0);
  await assertPlacement(page);
  await page.locator("#tlDetailClose").click();
  await assertPlacement(page);
  await page.locator("#tlDetailsToggle").click();
  await assertPlacement(page);
  await page.locator(`${popup} .stop-source-summary`).click();
  assert.equal(await page.locator(`${popup} .stop-source-card`).evaluate(el => el.open), true);
  await assertPlacement(page);
  assert.deepEqual(errors, []);
});
