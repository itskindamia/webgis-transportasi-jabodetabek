import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { openLayout, chooseRoute, readMap } from "./layout-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });

test("source geometry, attributes, operation engine and existing DOM hooks remain intact", async () => {
  const integrity = JSON.parse(await readFile(new URL("../docs/layout-tabler/source-integrity.json", import.meta.url)));
  for (const [file, expected] of Object.entries(integrity.sha256)) {
    const bytes = await readFile(new URL("../" + file, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected, file);
  }
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, "unique DOM IDs");
  for (const id of integrity.domIds) assert.ok(ids.includes(id), `existing hook: ${id}`);
  for (const file of ["css/layout-tabler.css", "css/legacy-components.css"]) {
    assert.ok(!(await readFile(new URL("../" + file, import.meta.url), "utf8")).includes("!important"), file);
  }
});

for (const [width, height] of [[390, 844], [768, 1024], [1366, 900], [1600, 1000]]) {
  test(`responsive layout and real Leaflet resizing at ${width}px`, async t => {
    const app = await openLayout(browser, width, height);
    t.after(() => app.context.close());
    const { page } = app;
    const before = await readMap(page);
    assert.deepEqual(before.size, before.container);
    assert.equal(before.documentWidth, width, "no horizontal page overflow");
    await page.click(width <= 760 ? "#tlMobileDetails" : "#tlDetailsToggle");
    assert.equal(await page.locator("#routeInfo").isVisible(), true, "overview detail is readable");
    await page.click("#tlDetailClose");
    await chooseRoute(page);
    let current = await readMap(page);
    assert.deepEqual(current.size, current.container);
    assert.ok(current.size[0] >= 390 && current.size[1] > 400, "usable map dimensions");
    assert.equal(await page.locator("#tlDetailPanel").getAttribute("data-tab"), "stops");
    assert.equal(await page.locator('[data-mode="BRT"]').getAttribute("aria-pressed"), "true");
    assert.ok(await page.locator("#stopList .stop-list-item").count() > 10);
    assert.equal(await page.locator("#tlDetailsToggle").getAttribute("aria-expanded"), "true");
    const shareUrl = page.url();
    if (width <= 760) {
      const peek = (await page.locator("#tlDetailPanel").boundingBox()).height;
      await page.click("#tlDetailExpand");
      await page.waitForFunction(height => document.getElementById("tlDetailPanel").getBoundingClientRect().height > height, peek);
      assert.ok((await page.locator("#tlDetailPanel").boundingBox()).height > peek);
      await page.click("#mobileBottomRouteButton");
      assert.equal(await page.locator("#tlMobileDetails").getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator("#mobileBottomRouteButton").getAttribute("aria-expanded"), "true");
      await page.click("#infoButton");
      assert.equal(await page.locator("#mobileBottomRouteButton").getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator("#rightInfoPanel").evaluate(el => el.inert), false);
      await page.click("#basemapButton");
      assert.equal(await page.locator("#infoButton").getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator("#basemapPanel").isVisible(), true);
      await page.click("#basemapClose");
      await page.click("#tlMobileDetails");
    } else {
      if (width >= 1100) {
        await page.click("#tlNetworkCollapse");
        await page.waitForTimeout(200);
        const expanded = await readMap(page);
        assert.ok(expanded.size[0] > current.size[0]);
        assert.equal(expanded.zoom, current.zoom, "sidebar does not change zoom");
        const shift = await page.evaluate(([a, b]) => map.project(a).distanceTo(map.project(b)), [expanded.center, current.center]);
        assert.ok(shift <= 1, `center stays within Leaflet pixel rounding: ${shift}`);
        current = expanded;
      }
      await page.click("#tlDetailClose");
      await page.waitForTimeout(200);
      const expanded = await readMap(page);
      assert.deepEqual(expanded.size, expanded.container);
      assert.ok(expanded.size[0] >= current.size[0]);
      assert.equal(expanded.zoom, current.zoom, "detail panel does not change zoom");
      await page.click("#tlDetailsToggle");
      await page.click("#tlLegendToggle");
      assert.equal(await page.locator("#rightInfoPanel").isVisible(), true);
      await page.click("#mobileInfoClose");
      assert.equal(await page.locator("#rightInfoPanel").isVisible(), false);
    }
    assert.equal(page.url(), shareUrl, "layout chrome preserves route URL");
    assert.deepEqual((await readMap(page)).size, (await readMap(page)).container);
    assert.deepEqual(app.errors, [], "no new runtime errors");
  });
}

test("stop selection, popup navigation, integration links, tabs and URL remain connected", async t => {
  const app = await openLayout(browser);
  t.after(() => app.context.close());
  const { page } = app;
  await chooseRoute(page);
  await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click();
  await page.waitForTimeout(900);
  assert.equal(await page.locator("#tlDetailPanel").getAttribute("data-tab"), "selected");
  assert.equal(await page.locator("#selectedStopInfo").isVisible(), true);
  assert.equal(await page.locator('#stopList [aria-current="true"]').count(), 1);
  assert.equal(await page.locator(".leaflet-popup .stop-popup").isVisible(), true);
  assert.ok(new URL(page.url()).searchParams.get("stop"));
  assert.ok(await page.locator(".leaflet-popup .integration-place-row-button[data-integration-stop-key]").count() > 0);
  const before = await page.evaluate(() => currentSelectedStopKey);
  await page.locator('.leaflet-popup [data-stop-nav="next"]').click();
  await page.waitForTimeout(700);
  assert.notEqual(await page.evaluate(() => currentSelectedStopKey), before);
  assert.equal(await page.locator('#stopList [aria-current="true"]').count(), 1);
  await page.locator(".leaflet-popup-close-button").click();
  await page.click("#tlTabStops");
  await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click();
  await page.waitForTimeout(900);
  const integration = page.locator(".leaflet-popup .integration-place-row-button[data-integration-stop-key]").first();
  const target = await integration.getAttribute("data-integration-route-id");
  await integration.click();
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => currentSelectedRouteId), target);
  assert.equal(await page.locator("#selectedStopInfo").isVisible(), true);
  assert.deepEqual(app.errors, []);
});

test("global transport search, online place search, basemaps, legend and about remain reachable", async t => {
  const app = await openLayout(browser);
  t.after(() => app.context.close());
  const { page } = app;
  await page.fill("#globalSearchInput", "Blok M");
  await page.waitForSelector("#globalSearchResults .global-search-result");
  await page.locator('#globalSearchResults [data-global-type="transport"]').first().click();
  await page.waitForTimeout(900);
  assert.equal(await page.locator("#selectedStopInfo").isVisible(), true);
  await page.fill("#globalSearchInput", "Tempat uji");
  await page.click("#globalSearchSubmit");
  await page.waitForSelector('#globalSearchResults [data-global-type="poi"]');
  assert.ok(app.geocodingRequests.length > 0);
  await page.locator("#globalSearchResults .global-search-result").last().click();
  await page.waitForTimeout(400);
  await page.click("#basemapButton");
  for (const key of ["osm", "satellite", "light"]) {
    await page.click(`[data-basemap="${key}"]`);
    assert.ok(await page.locator(`[data-basemap="${key}"]`).evaluate(el => el.classList.contains("active")));
  }
  await page.click('[data-opacity="50"]');
  assert.ok(await page.locator('[data-opacity="50"]').evaluate(el => el.classList.contains("active")));
  await page.click("#basemapClose");
  await page.click("#tlLegendToggle");
  assert.equal(await page.locator("#rightInfoPanel .legend-section").count() >= 4, true);
  await page.click("#mobileInfoClose");
  await page.click("#tlAbout");
  assert.equal(await page.locator("#infoModal").isVisible(), true);
  assert.deepEqual(app.errors, []);
});

test("keyboard tabs and crossing mobile/tablet/desktop breakpoints keep controls usable", async t => {
  const app = await openLayout(browser, 390, 844);
  t.after(() => app.context.close());
  const { page } = app;
  await chooseRoute(page);
  await page.click("#tlDetailExpand");
  await page.focus("#tlTabStops");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.locator("#tlTabRoute").getAttribute("aria-selected"), "true");
  for (const width of [768, 1366, 1600, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    const state = await readMap(page);
    assert.deepEqual(state.size, state.container);
    assert.equal(state.documentWidth, width);
  }
  await page.click("#mobileBottomRouteButton");
  assert.equal(await page.locator("#filterPanel").evaluate(el => el.inert), false);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#filterPanel").evaluate(el => el.inert), true);
  assert.deepEqual(app.errors, []);
});

test("mobile stop popup and provider attribution stay above the detail sheet", async t => {
  const app = await openLayout(browser, 390, 844);
  t.after(() => app.context.close());
  const { page } = app;
  await chooseRoute(page);
  await page.click("#tlDetailExpand");
  await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click();
  await page.waitForTimeout(1000);
  const popup = await page.locator(".leaflet-popup").boundingBox();
  const detail = await page.locator("#tlDetailPanel").boundingBox();
  const search = await page.locator("#globalSearchPanel").boundingBox();
  const attribution = await page.locator("#map .leaflet-control-attribution").boundingBox();
  const controlRail = await page.locator("#floatingZoom").boundingBox();
  await page.locator(".leaflet-popup-close-button").click({ trial: true, timeout: 2000 });
  assert.ok(popup.x + popup.width < controlRail.x, "popup clears the map control rail");
  assert.ok(popup.y >= search.y + search.height, "popup clears search");
  assert.ok(popup.y + popup.height <= detail.y, "popup clears detail sheet");
  assert.ok(popup.y + popup.height < attribution.y, "popup clears provider credits");
  assert.ok(attribution.y + attribution.height <= detail.y, "provider credits remain visible");
  assert.ok(detail.height <= 80, "only a compact detail summary accompanies the popup");
  assert.equal(await page.locator("#tlDetailExpand").getAttribute("aria-expanded"), "true", "expansion preference is retained");
  assert.equal(await page.locator('#stopList [aria-current="true"]').count(), 1);
  await page.locator('.leaflet-popup [data-stop-nav="next"]').click();
  await page.waitForTimeout(750);
  assert.equal(await page.locator('#stopList [aria-current="true"]').count(), 1);
  const selected = await page.evaluate(() => currentSelectedStopKey);
  await page.click("#tlDetailResume");
  await page.click("#tlTabStops");
  await page.locator(`#stopList [data-stop-key="${selected}"]`).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => currentSelectedStopKey), selected);
  assert.ok((await page.locator("#tlDetailPanel").boundingBox()).height <= 80, "reselecting the same stop reveals its popup without losing expansion preference");
  await page.locator(".leaflet-popup-close-button").click();
  await page.waitForSelector(".leaflet-popup", { state: "detached" });
  assert.equal(await page.locator(".leaflet-popup").count(), 0);
  assert.deepEqual(app.errors, []);
});

test("GPS, home, zoom and route comparison controls still drive Leaflet", async t => {
  const app = await openLayout(browser);
  t.after(() => app.context.close());
  const { page, context } = app;
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -6.1754, longitude: 106.8272, accuracy: 15 });
  await page.click("#gpsButton");
  await page.waitForFunction(() => gpsMarker && document.querySelector(".gps-dot"));
  assert.equal(await page.locator(".gps-dot").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(22, 134, 229)");
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => map.getZoom()), 17);
  await page.click("#zoomOutButton");
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => map.getZoom()), 16);
  await chooseRoute(page);
  await page.click("#routeCompareAdd");
  const target = await page.locator("#comparisonRouteSelect").evaluate(el => [...el.options].find(option => option.value)?.value);
  assert.ok(target);
  await page.selectOption("#comparisonRouteSelect", target);
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => comparisonRouteId), target);
  await page.click("#routeCompareClear");
  await page.click("#homeButton");
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => currentSelectedRouteId), "BRT_01");
  assert.deepEqual(app.errors, []);
});
