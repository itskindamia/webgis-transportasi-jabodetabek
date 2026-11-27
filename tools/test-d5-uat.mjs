import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";
import { acceptWelcome, assertSelectionUnchanged, fixtures, panelSelector, popupSelector,
  readSelection, stationUrl, switchPresentation, waitForCamera, waitForStation } from "./d5-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }); });
after(async () => { await browser?.close(); });

test("D5 UAT desktop: onboarding, network search, presentation, transfer, controls and permalink", async t => {
  const { page, context, errors, geocodingRequests } = await openLayout(browser, 1440, 900, { dismissOnboarding: false });
  t.after(() => context.close());
  await t.test("01 first visit presents welcome and working guide", async () => {
    await page.locator("#infoModalAccept").click();
    const next = page.locator("#productTourNext");
    const before = await page.locator("#productTourProgress").innerText();
    await next.click();
    assert.notEqual(await page.locator("#productTourProgress").innerText(), before);
    await page.locator("#productTourSkip").click();
    await page.locator("#productTour").waitFor({ state: "hidden" });
  });
  const [,, dukuh] = fixtures;
  await t.test("02–03 choose BRT, KRL, MRT and LRT corridors and lines", async () => {
    for (const fixture of [fixtures[1], fixtures[0], fixtures[6], dukuh]) {
      await page.locator(`[data-mode="${fixture.mode}"]`).click();
      await selectRoute(page, fixture.route);
      assert.equal(await page.locator("#modeSelect").inputValue(), fixture.mode);
      assert.equal(await page.locator("#routeSelect").inputValue(), fixture.route);
      assert.equal(await page.locator("#tlRouteList [aria-current=true]").getAttribute("data-route-id"), fixture.route);
    }
  });
  await t.test("04–05 find a station in local search and open its map popup", async () => {
    await page.locator("#globalSearchInput").fill("Dukuh Atas");
    await page.locator(`#globalSearchResults [data-global-type="transport"][data-stop-key="${dukuh.key}"]`).click();
    await waitForStation(page, dukuh);
    assert.match(await page.locator(popupSelector + " .stop-popup-title").innerText(), /Dukuh Atas/);
    assert.equal(geocodingRequests.length, 0);
  });
  await t.test("06–07 open the full panel and return to the same popup and camera", async () => {
    const visible = await page.locator(popupSelector + " .integration-place-row:visible").count();
    const selected = await switchPresentation(page, popupSelector + " .tl-show-stop-in-panel");
    const details = page.locator(panelSelector);
    await details.waitFor();
    await waitForCamera(page);
    assert.ok(await details.locator(".integration-place-row:visible").count() > visible);
    await assertSelectionUnchanged(page, selected);
    const selectedInPanel = await switchPresentation(page, "#tlReturnToPopup");
    await waitForStation(page, dukuh);
    await assertSelectionUnchanged(page, selectedInPanel);
  });
  await t.test("08–09 fit the verified transfers and follow a clickable marker", async () => {
    const targets = await page.evaluate(() => webgisSpatialIntegrations.targets);
    assert.equal(targets.length, dukuh.integrations);
    await page.getByRole("button", { name: "Lihat semua" }).click();
    await waitForCamera(page);
    await page.waitForFunction(() => webgisSpatialIntegrations.overviewActive && map.getZoom() <= 16);
    await page.locator(".tl-integration-target-marker").first().click();
    await page.waitForFunction(({ key, route }) => currentSelectedStopKey === key && currentSelectedRouteId === route, targets[0]);
    await page.locator(`${popupSelector}[data-stop-key="${targets[0].key}"]`).waitFor();
  });
  await t.test("10 compare two traces and remove the comparison", async () => {
    await page.locator('[data-mode="BRT"]').click();
    await selectRoute(page, "BRT_01");
    await page.locator("#routeCompareAdd").click();
    assert.match(await page.locator("#routeCompareHint").innerText(), /trase dua rute/i);
    await page.locator("#comparisonRouteSelect").selectOption("BRT_02");
    await page.waitForFunction(() => new URLSearchParams(location.search).get("compare") === "BRT_02");
    assert.equal(await page.locator("#routeSelect").inputValue(), "BRT_01");
    await page.locator("#routeCompareClear").click();
    assert.equal(new URL(page.url()).searchParams.has("compare"), false);
  });
  await t.test("11 change and reset network status", async () => {
    await page.locator("#statusSelect").selectOption("Conceptual");
    assert.equal(new URL(page.url()).searchParams.get("status"), "Conceptual");
    assert.equal(await page.locator("#statusSelect option:checked").innerText(), "Skenario");
    await page.locator("#statusSelect").selectOption("Existing");
    assert.equal(await page.locator("#statusSelect option:checked").innerText(), "Eksisting");
  });
  await t.test("12–13 switch base maps and set opacity with the native keyboard control", async () => {
    await page.locator("#basemapButton").click();
    await page.locator('[data-basemap="osm"]').click();
    assert.equal(new URL(page.url()).searchParams.get("basemap"), "osm");
    const slider = page.getByRole("slider", { name: "Kejelasan peta dasar" });
    await slider.press("End");
    await slider.press("ArrowLeft");
    assert.equal(await slider.getAttribute("aria-valuetext"), "99%");
    assert.equal(await page.evaluate(() => currentBasemap.options.opacity), 0.99);
    await page.locator("#basemapClose").click();
  });
  await t.test("14–15 open a real source link control and restore a stop permalink", async () => {
    const link = new URL(stationUrl(page.url(), dukuh));
    link.searchParams.set("basemap", "osm");
    link.searchParams.set("opacity", "99");
    await page.goto(link.href);
    await acceptWelcome(page);
    await waitForStation(page, dukuh);
    await page.locator(popupSelector + " .stop-source-summary").press("Enter");
    const source = page.locator(popupSelector + " .stop-source-body a[href]").first();
    assert.match(await source.getAttribute("href"), /^https?:\/\//);
    await source.click({ trial: true });
    const shared = page.url();
    const newTab = await context.newPage();
    await newTab.goto(shared);
    await acceptWelcome(newTab);
    await waitForStation(newTab, dukuh);
    assert.equal(await newTab.locator("#basemapOpacity").inputValue(), "99");
    assert.equal(await newTab.evaluate(() => currentBasemapType), "osm");
    await newTab.close();
  });
  assert.deepEqual(errors, []);
});

for (const [width, height] of [[360, 800], [390, 844]]) {
  test(`D5 UAT 16: mobile popup, sheet, search keyboard and navigation at ${width}×${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height, { dismissOnboarding: false });
    t.after(() => context.close());
    const cawang = fixtures[3];
    await page.goto(stationUrl(page.url(), cawang));
    await acceptWelcome(page);
    await waitForStation(page, cawang);
    const popup = page.locator(popupSelector);
    const initial = await readSelection(page);
    assert.equal(await popup.locator(".tl-show-stop-in-panel").isVisible(), false);
    assert.equal(await page.locator("#northButton").isVisible(), false);
    assert.ok((await page.locator("#zoomInButton").boundingBox()).width >= 44);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.locator("#tlMobileDetails").click();
    await popup.waitFor({ state: "hidden" });
    await page.locator("#tlTabSelected").click();
    assert.equal(await page.locator("#selectedStopInfo .selected-stop-title:visible").innerText(), "Cawang");
    assert.equal((await readSelection(page)).stop, initial.stop);
    await page.locator("#tlDetailClose").click();
    await popup.waitFor();
    const next = popup.locator('[data-stop-nav="next"]');
    const key = await next.getAttribute("data-stop-key");
    await next.click();
    await page.locator(`${popupSelector}[data-stop-key="${key}"]`).waitFor();
    await popup.locator(`[data-stop-nav="previous"][data-stop-key="${cawang.key}"]`).click();
    await waitForStation(page, cawang);
    await page.locator(".leaflet-popup-close-button").click();
    const search = page.locator("#globalSearchInput");
    await search.fill("Cawang");
    const exact = page.locator(`#globalSearchResults [data-stop-key="${cawang.key}"]`);
    await exact.waitFor();
    await page.setViewportSize({ width, height: height - 280 });
    await exact.click({ trial: true });
    await page.setViewportSize({ width, height });
    await exact.click();
    await waitForStation(page, cawang);
    assert.equal((await readSelection(page)).route, initial.route);
    assert.deepEqual(errors, []);
  });
}
