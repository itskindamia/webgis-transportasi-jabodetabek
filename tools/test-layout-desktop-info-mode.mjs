import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

const preference = "webgis.stopInfoMode";
const bekasi = "LRT_JB_BK";
const cibubur = "LRT_JB_CB";
const cawang = "LRTJB008_01";
const dukuh = "LRTJB001_01";
const picker = "#tlStopInfoMode";
const detail = "#tlDetailPanel";
const popup = ".leaflet-popup .stop-popup-ui";
const panelCard = "#selectedStopInfo > .stop-popup-ui";
let browser;

before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }); });
after(async () => { await browser?.close(); });

async function app(t) {
  const view = await openLayout(browser, 1440, 900);
  t.after(async () => {
    await view.context.close();
    assert.deepEqual(view.errors, []);
  });
  return view;
}

async function chooseBekasi(page) {
  await page.click('[data-mode="LRT"]');
  await selectRoute(page, bekasi);
  await page.locator(`#stopList [data-stop-key="${cawang}"]`).waitFor();
}

async function changeMode(page, value) {
  await page.click("#basemapButton");
  // Opening the existing basemap dialog moves focus on the next frame.
  await page.waitForFunction(() => document.activeElement?.id === "basemapClose");
  const control = page.locator(picker);
  await control.focus();
  await control.selectOption(value);
  assert.equal(await control.inputValue(), value);
  assert.equal(await control.evaluate(el => document.activeElement === el), true);
  await page.click("#basemapClose");
}

async function chooseFromList(page, key) {
  await page.click("#tlTabStops");
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
}

async function clickMarker(page, key) {
  await waitForCamera(page);
  await page.evaluate(stop => {
    map.setView(stopMarkerByKey.get(stop).getLatLng(), STOP_ZOOM, { animate: false });
  }, key);
  const target = await page.waitForFunction(stop => {
    const anchor = stopMarkerByKey.get(stop)?.getLatLng();
    return stopHitLayer.getLayers().find(layer => layer.getLatLng().equals(anchor) &&
      layer.getElement()?.classList.contains("stop-hit-target"))?.getElement();
  }, key);
  // Playwright waits for the actual Leaflet hit target to be stable and receive pointer events.
  await target.asElement().click();
  await target.dispose();
}

async function selected(page, key, route) {
  await page.waitForFunction(([stop, line]) => currentSelectedStopKey === stop && currentSelectedRouteId === line, [key, route]);
  assert.equal(await page.locator('#stopList [aria-current="true"]').getAttribute("data-stop-key"), key);
  const stopId = await page.evaluate(id => getStopByKey(id).properties.STOP_ID, key);
  assert.equal(new URL(page.url()).searchParams.get("stop"), stopId);
}

async function waitForCamera(page) {
  await page.waitForFunction(() => map.getZoom() === STOP_ZOOM && !map._panAnim?._inProgress && !map._animatingZoom &&
    map.getSize().x === map.getContainer().clientWidth);
}

async function dismissStartup(page) {
  await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true" && stopData?.features?.length);
  await page.locator("#infoModalAccept:visible, #productTourSkip:visible").first().waitFor();
  if (await page.locator("#infoModalAccept").isVisible()) await page.click("#infoModalAccept");
  await page.click("#productTourSkip");
}

async function watchStationPopups(page) {
  await page.evaluate(() => {
    window.d32PopupOpens = 0;
    map.on("popupopen", ({ popup }) => {
      if (popup.getElement()?.querySelector(".stop-popup-ui")) window.d32PopupOpens++;
    });
  });
}

test("D3.2 defaults to Popup with empty, invalid or unavailable storage and shows no empty card", async t => {
  const { page, context } = await app(t);
  assert.equal(await page.locator(picker).inputValue(), "popup");
  await changeMode(page, "panel");
  assert.equal(await page.locator(detail).isVisible(), false);
  assert.equal(await page.locator(panelCard).count(), 0);
  await page.evaluate(key => localStorage.setItem(key, "invalid"), preference);
  await page.reload();
  await dismissStartup(page);
  assert.equal(await page.locator(picker).inputValue(), "popup");
  await context.addInitScript(key => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (name) {
      if (name === key) throw new DOMException("Storage is unavailable", "SecurityError");
      return get.call(this, name);
    };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Storage is unavailable", "SecurityError");
      return set.call(this, name, value);
    };
  }, preference);
  await page.reload();
  await dismissStartup(page);
  assert.equal(await page.locator(picker).inputValue(), "popup");
  await changeMode(page, "panel");
  assert.equal(await page.locator(picker).inputValue(), "panel");
});

test("D3.2 Popup preserves the manually opened list and leaves closed Detail closed on marker selection", async t => {
  const { page } = await app(t);
  await chooseBekasi(page);
  await chooseFromList(page, cawang);
  await page.locator(popup).waitFor();
  await selected(page, cawang, bekasi);
  assert.equal(await page.locator(detail).getAttribute("data-tab"), "stops");
  await page.click("#tlDetailClose");
  await waitForCamera(page);
  await page.click(".leaflet-popup-close-button");
  await page.locator(popup).waitFor({ state: "detached" });
  await clickMarker(page, cawang);
  await page.locator(popup).waitFor();
  await selected(page, cawang, bekasi);
  assert.equal(await page.locator(detail).isVisible(), false);
  assert.equal(await page.locator(panelCard).count(), 0);
});

for (const route of [bekasi, cibubur]) {
  test(`D3.2 changes the presentation of selected Cawang on ${route} with the camera and URL retained`, async t => {
    const { page } = await app(t);
    await chooseBekasi(page);
    if (route !== bekasi) await selectRoute(page, route);
    await chooseFromList(page, cawang);
    await page.locator(popup).waitFor();
    await waitForCamera(page);
    const before = await page.evaluate(() => ({ center: map.getCenter(), zoom: map.getZoom(), url: location.href }));
    await page.locator(`${popup} .tl-show-stop-in-panel`).press("Enter");
    await page.locator(panelCard).waitFor();
    assert.equal(await page.locator(popup).count(), 0);
    assert.equal(await page.locator("#tlTabSelected").evaluate(el => document.activeElement === el), true);
    await selected(page, cawang, route);
    await waitForCamera(page);
    assert.equal(await page.evaluate(() => location.href), before.url);
    await changeMode(page, "popup");
    await page.locator(popup).waitFor();
    await waitForCamera(page);
    assert.equal(await page.locator(panelCard).count(), 0);
    assert.equal(await page.locator(detail).getAttribute("data-tab"), "stops");
    const distance = await page.evaluate(({ center, zoom }) => {
      return map.getZoom() === zoom ? map.project(center).distanceTo(map.project(map.getCenter())) : Infinity;
    }, before);
    assert.ok(distance <= 1, `center rounding: ${distance}px`);
    assert.equal(page.url(), before.url);
  });
}

test("D3.2 Panel navigates, switches lin and reopens after a real marker click without transient popup", async t => {
  const { page } = await app(t);
  await changeMode(page, "panel");
  await chooseBekasi(page);
  await watchStationPopups(page);
  await chooseFromList(page, cawang);
  await page.locator(panelCard).waitFor();
  await selected(page, cawang, bekasi);
  await page.locator(`${panelCard} [data-route-switch="${cibubur}"]`).click();
  await page.locator(`${panelCard} [data-stop-nav="next"][data-route-id="${cibubur}"]`).waitFor();
  await selected(page, cawang, cibubur);
  const nextButton = page.locator(`${panelCard} [data-stop-nav="next"]`);
  const next = await nextButton.getAttribute("data-stop-key");
  await nextButton.press("Enter");
  await selected(page, next, cibubur);
  await page.click("#tlDetailClose");
  assert.equal(await page.locator(detail).isVisible(), false);
  await selected(page, next, cibubur);
  await clickMarker(page, next);
  await page.locator(panelCard).waitFor();
  await selected(page, next, cibubur);
  await waitForCamera(page);
  assert.equal(await page.evaluate(() => window.d32PopupOpens), 0);
  assert.equal(await page.locator(popup).count(), 0);
  assert.equal(await page.locator(panelCard).count(), 1);
});

test("D3.2 Panel follows the explicit Dukuh Atas MRT link, restores the permalink and follows the breakpoint", async t => {
  const { page } = await app(t);
  await changeMode(page, "panel");
  await chooseBekasi(page);
  await watchStationPopups(page);
  await chooseFromList(page, dukuh);
  await page.locator(panelCard).waitFor();
  assert.match(await page.evaluate(id => getStopByKey(id).properties.INT_STOP, dukuh), /(?:^|;)MRT_NS:MRT012(?:;|$)/);
  await page.locator(`${panelCard} [data-integration-stop-key="MRT012_01"][data-integration-route-id="MRT_NS"]`).click();
  await page.locator(`${panelCard}[data-stop-key="MRT012_01"]`).waitFor();
  await selected(page, "MRT012_01", "MRT_NS");
  assert.equal(await page.evaluate(() => window.d32PopupOpens), 0);
  const url = page.url();
  await page.reload();
  await dismissStartup(page);
  await page.locator(`${panelCard}[data-stop-key="MRT012_01"]`).waitFor();
  assert.equal(await page.locator(picker).inputValue(), "panel");
  assert.equal(new URL(page.url()).searchParams.get("stop"), new URL(url).searchParams.get("stop"));
  assert.equal(await page.locator(popup).count(), 0);
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.locator(popup).waitFor();
  assert.equal(await page.locator(picker).isVisible(), false);
  assert.equal(await page.locator(panelCard).count(), 0);
  await selected(page, "MRT012_01", "MRT_NS");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator(panelCard).waitFor();
  assert.equal(await page.locator(popup).count(), 0);
  await selected(page, "MRT012_01", "MRT_NS");
});
