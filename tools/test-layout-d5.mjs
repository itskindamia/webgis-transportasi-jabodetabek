import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, chooseRoute } from "./layout-browser.mjs";
import {
  acceptWelcome, fixtures, popupSelector, panelSelector, popupCoverage, readSelection,
  stationUrl, waitForCamera, waitForStation
} from "./d5-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }); });
after(async () => { await browser?.close(); });

async function app(t, width = 1440, height = 900) {
  const layout = await openLayout(browser, width, height, { dismissOnboarding: false });
  t.after(() => layout.context.close());
  return layout;
}

async function openStation(page, fixture) {
  await page.goto(stationUrl(page.url(), fixture));
  await acceptWelcome(page);
  await waitForStation(page, fixture);
}

for (const [index, width, height] of [[0, 1280, 720], [0, 1440, 900], [1, 1440, 900], [2, 1440, 900], [3, 1440, 900]]) {
  const fixture = fixtures[index];
  test(`D5 desktop collision: ${fixture.name} at ${width}x${height}`, async t => {
    const { page, errors } = await app(t, width, height);
    await openStation(page, fixture);
    const state = await popupCoverage(page);
    assert.ok(state.insideMap);
    assert.deepEqual(state.anchor, state.coordinates, "popup stays at the selected stop coordinates");
    assert.equal(state.controlsCovered, 0);
    assert.equal(state.mapped, fixture.integrations);
    assert.equal(state.links.length, state.mapped);
    assert.equal(state.covered, 0, "no transfer badge covered on the primary fixtures");
    assert.ok(state.labelsCovered <= state.nativeLabels);
    if (fixture.name === "sudirman-krl") assert.ok(state.nativeCovered > state.covered, "smart placement opens a blocked hit target");
    const camera = await readSelection(page);
    await page.waitForTimeout(300);
    assert.deepEqual(await readSelection(page), camera, "presentation does not start another pan");
    assert.deepEqual((await popupCoverage(page)).links, state.links);
    t.diagnostic(`Leaflet default → D5: ${state.nativeCovered} → ${state.covered} badges, placement ${state.placement}, ${state.mapped} targets`);

    const overview = page.getByRole("button", { name: "Lihat semua" });
    await overview.click();
    await page.waitForFunction(() => webgisSpatialIntegrations.overviewActive);
    await waitForCamera(page);
    const markers = page.locator(".tl-integration-target-marker");
    assert.equal(await markers.count(), fixture.integrations);
    for (const marker of await markers.all()) await marker.click({ trial: true });
    await page.getByRole("button", { name: "Kembali ke popup" }).click();
    await waitForStation(page, fixture);
    assert.deepEqual(await readSelection(page), camera, "overview restores the camera and the selected stop");
    assert.deepEqual(errors, []);
  });
}

test("D5 source opens below the fixed action row with one disclosure and reachable navigation", async t => {
  const { page, errors } = await app(t, 1280, 720);
  await openStation(page, fixtures[2]);
  const popup = page.locator(popupSelector);
  const source = popup.locator(".stop-source-summary");
  const positions = () => popup.locator(".stop-popup-action-row").evaluate(bar => {
    const row = bar.getBoundingClientRect();
    return [".stop-popup-maps-link", ".stop-source-summary", ".tl-show-stop-in-panel"].map(selector => {
      const box = bar.querySelector(selector).getBoundingClientRect();
      return [box.left - row.left, box.top - row.top, box.width, box.height];
    });
  });
  const before = await positions();
  const normalBackground = await source.evaluate(el => getComputedStyle(el).backgroundColor);
  assert.equal(await source.getAttribute("aria-expanded"), "false");
  await source.press("Enter");
  await page.waitForFunction(() => document.querySelector(".leaflet-popup summary.stop-source-summary")?.getAttribute("aria-expanded") === "true");
  assert.deepEqual(await positions(), before, "all controls keep the same position relative to the action row");
  assert.ok(before.every(box => Math.abs(box[1] - before[0][1]) <= 1));
  assert.notEqual(await source.evaluate(el => getComputedStyle(el).backgroundColor), normalBackground);
  assert.ok(await source.evaluate(el => el === document.activeElement));
  assert.equal(await popup.locator(".stop-source-body").count(), 1);
  const expanded = await source.evaluate(el => {
    const info = el.closest(".stop-source-card").querySelector(".stop-source-body").getBoundingClientRect();
    return { gap: info.top - el.getBoundingClientRect().bottom, width: info.width };
  });
  assert.ok(expanded.gap > 0 && expanded.width > 200);
  await popup.locator(".stop-source-body a[href]").first().click({ trial: true });
  await popup.locator(".stop-popup-nav-button:not(:disabled)").first().click({ trial: true });
  await source.press("Space");
  await page.waitForFunction(() => document.querySelector(".leaflet-popup summary.stop-source-summary")?.getAttribute("aria-expanded") === "false");
  assert.equal(await popup.locator(".stop-source-body").isVisible(), false);
  assert.deepEqual(await positions(), before);
  assert.deepEqual(errors, []);
});

test("D5 opacity is live on each basemap, commits to the permalink and validates URL values", async t => {
  const { page, errors } = await app(t);
  await acceptWelcome(page);
  await chooseRoute(page);
  const route = await page.evaluate(() => currentSelectedRouteId);
  await page.click("#basemapButton");
  const slider = page.getByRole("slider", { name: "Kejelasan peta dasar" });
  assert.equal(await slider.inputValue(), "100");
  const href = page.url();
  const state = () => page.evaluate(() => ({
    opacity: currentBasemap.options.opacity, layers: Object.entries(map._layers)
      .filter(([, layer]) => layer instanceof L.Path).map(([id, layer]) => [id, layer.options.opacity, layer.options.fillOpacity])
  }));
  const paths = (await state()).layers;
  assert.ok(paths.length > 0, "network overlays actually present");
  for (const input of ["53", "46", "37"]) {
    await slider.evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); }, input);
    assert.equal(await slider.getAttribute("aria-valuetext"), input + "%");
    assert.deepEqual(await state(), { opacity: Number(input) / 100, layers: paths });
    assert.equal(page.url(), href, "input alone does not write history");
  }
  await slider.dispatchEvent("change");
  assert.equal(new URL(page.url()).searchParams.get("opacity"), "37");
  for (const type of ["osm", "satellite", "light"]) {
    await page.click(`[data-basemap="${type}"]`);
    assert.equal(await page.evaluate(() => currentBasemapType), type);
    const current = await state();
    assert.equal(current.opacity, 0.37, "the new basemap inherits the current opacity");
    await slider.fill("40");
    assert.deepEqual(await state(), { opacity: 0.4, layers: current.layers }, "opacity leaves this basemap's network styling intact");
    await slider.fill("37");
  }
  await slider.press("Home");
  assert.equal(await slider.inputValue(), "0");
  assert.equal(new URL(page.url()).searchParams.get("opacity"), "0");
  assert.equal((await state()).opacity, 0);
  await slider.press("ArrowRight");
  assert.equal(await slider.inputValue(), "1");
  assert.equal(new URL(page.url()).searchParams.get("opacity"), "1");
  for (const [input, expected] of [["0", 0], ["37", 37], ["75", 75], ["101", 100], ["-1", 100], ["5.5", 100], ["abc", 100], [null, 100]]) {
    const permalink = new URL(page.url());
    if (input === null) permalink.searchParams.delete("opacity");
    else permalink.searchParams.set("opacity", input);
    await page.goto(permalink.href);
    await acceptWelcome(page);
    await page.waitForFunction(id => currentSelectedRouteId === id, route);
    assert.equal(await page.locator("#basemapOpacity").inputValue(), String(expected));
    assert.equal((await state()).opacity, expected / 100);
    assert.equal(new URL(page.url()).searchParams.get("opacity"), expected === 100 ? null : String(expected));
  }
  assert.deepEqual(errors, []);
});

for (const [width, expected] of [[1024, 228], [1280, 256], [1440, 312]]) {
  test(`D5 adaptive workspace preserves route, camera, keyboard and filters at ${width}px`, async t => {
    const { page, errors } = await app(t, width, 900);
    await acceptWelcome(page);
    await chooseRoute(page);
    await page.click("#tlDetailClose");
    await waitForCamera(page);
    const sidebar = page.locator("#filterPanel");
    assert.equal((await sidebar.boundingBox()).width, 312);
    const before = await readSelection(page);
    await page.locator("#tlDetailsToggle").press("Enter");
    await waitForCamera(page);
    assert.equal((await sidebar.boundingBox()).width, expected);
    assert.equal(await page.evaluate(() => map.getSize().x), width - expected - (width < 1440 ? 320 : 352));
    assert.equal(await page.locator("#tlRouteList [aria-current=true]").getAttribute("data-route-id"), before.route);
    const after = await readSelection(page);
    assert.deepEqual({ ...after, camera: null }, { ...before, camera: null });
    assert.equal(after.camera.zoom, before.camera.zoom);
    assert.ok(await page.evaluate(center => map.project(center).distanceTo(map.project(map.getCenter())) <= 1, before.camera.center));
    await page.locator("#tlNetworkCollapse").press("Enter");
    await page.waitForFunction(() => document.body.classList.contains("left-panel-collapsed") &&
      map.getSize().x === map.getContainer().clientWidth);
    assert.equal(await page.locator("#tlNetworkToggle").getAttribute("aria-expanded"), "false");
    await page.locator("#tlNetworkToggle").press("Enter");
    await page.waitForFunction(() => !document.body.classList.contains("left-panel-collapsed") &&
      map.getSize().x === map.getContainer().clientWidth);
    assert.equal((await sidebar.boundingBox()).width, expected);
    assert.equal(await page.locator("#statusSelect").inputValue(), before.status);
    assert.equal(await page.locator("#routeSelect").inputValue(), before.route);
    assert.equal(await page.locator("#northButton").boundingBox(), null);
    const controls = await page.locator("#floatingZoom").evaluate(root =>
      [...root.querySelectorAll("button")].map(el => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height, reachable: el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) };
      }));
    assert.ok(controls.every(box => box.width === 34 && box.height >= 36 && box.reachable));
    if (width === 1440) {
      await page.evaluate(() => map.setZoom(map.getMinZoom(), { animate: false }));
      assert.equal(await page.locator("#zoomOutButton").isDisabled(), true);
      assert.equal(await page.locator("#zoomInButton").isEnabled(), true);
      await page.evaluate(() => map.setZoom(map.getMaxZoom(), { animate: false }));
      assert.equal(await page.locator("#zoomInButton").isDisabled(), true);
      assert.equal(await page.locator("#zoomOutButton").isEnabled(), true);
    }
    assert.deepEqual(errors, []);
  });
}

test("D5 line and operator assets fall back safely under the unchanged CSP", async t => {
  const { page, context, errors } = await app(t);
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener("securitypolicyviolation", event => cspViolations.push(event.violatedDirective));
  });
  const requests = new Set();
  for (const asset of ["assets/lines/lrt-jabodebek-bk.png", "assets/logos/lrt-jabodebek.svg"]) {
    await context.route("**/" + asset, request => {
      requests.add(asset);
      return request.fulfill({ status: 404 });
    });
  }
  await openStation(page, fixtures[3]);
  const popup = page.locator(popupSelector);
  const bekasi = popup.locator('[data-route-switch="LRT_JB_BK"]');
  const cibubur = popup.locator('[data-route-switch="LRT_JB_CB"]');
  await bekasi.locator(".rail-line-badge-fallback").waitFor();
  assert.equal((await bekasi.locator(".rail-line-badge-fallback").innerText()).trim(), "BK");
  assert.equal(await bekasi.locator(".rail-line-badge-image").count(), 0);
  assert.equal(await popup.locator(".lrt-popup-brand-logo").count(), 0);
  assert.equal(await popup.locator(".stop-popup-title").innerText(), "Cawang");
  assert.ok(await cibubur.locator(".rail-line-badge-image").evaluate(image => image.complete && image.naturalWidth));
  assert.equal(await cibubur.locator(".rail-line-badge-fallback").isVisible(), false);
  await popup.locator(".tl-show-stop-in-panel").click();
  await page.locator(panelSelector + ' [data-route-switch="LRT_JB_BK"] .rail-line-badge-fallback').waitFor();
  assert.equal(requests.size, 2);
  assert.deepEqual(await page.evaluate(() => cspViolations), []);
  assert.equal(await page.locator("img[onerror]").count(), 0);
  assert.deepEqual(errors, []);
});
