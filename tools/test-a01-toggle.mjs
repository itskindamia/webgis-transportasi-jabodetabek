/*
 * A01 browser regression tests. No transport data is modified.
 * Prerequisites: npm install --no-save --package-lock=false playwright@1.57.0 leaflet@1.9.4
 * Install Chromium: npx playwright install chromium
 * Run: node --test tools/test-a01-toggle.mjs
 * Preinstalled/offline assets may be supplied with LEAFLET_ASSET_DIR;
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH selects an existing browser.
 */
import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const leafletDir = process.env.LEAFLET_ASSET_DIR
  || path.dirname(require.resolve("leaflet/dist/leaflet.js"));
const origin = "http://127.0.0.1:8000";
const blankTile = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const mime = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".geojson": "application/geo+json", ".png": "image/png", ".svg": "image/svg+xml"
};
let browser;

before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
});
after(async () => { await browser?.close(); });

async function openRoute(t, routeId = "BRT_13", width = 1366) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  // Serve the real application and pinned Leaflet bytes without external services.
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    let file;
    if (url.origin === origin) {
      file = path.resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
      if (!file.startsWith(root)) return route.abort();
    } else if (["unpkg.com", "cdnjs.cloudflare.com"].includes(url.hostname)
      && /\/leaflet\.(js|css)$/.test(url.pathname)) {
      file = path.join(leafletDir, path.basename(url.pathname));
    } else if (url.hostname === "fonts.googleapis.com") {
      return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    } else if (["tile.openstreetmap.org", "server.arcgisonline.com"].includes(url.hostname)) {
      return route.fulfill({ status: 200, contentType: "image/png", body: blankTile });
    } else {
      return route.abort();
    }
    try {
      await route.fulfill({
        status: 200, body: await readFile(file),
        contentType: mime[path.extname(file)] || "application/octet-stream",
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await route.fulfill({ status: 404, body: "Not found" });
    }
  });

  await page.goto(origin + "/");
  await page.waitForFunction(() => typeof stopData !== "undefined" && stopData?.features?.length > 0);
  // Onboarding is outside A01; close it after its startup timer has run.
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    startupExperienceActive = false;
    clearTimeout(startupTourTimerId);
    setInfoModalOpen(false);
    closeProductTour();
    setMobileFilterOpen(true);
  });
  await page.selectOption("#modeSelect", "BRT");
  await page.selectOption("#routeSelect", routeId);
  // Let the existing adaptive-layout fit finish before selecting a stop.
  await page.waitForTimeout(750);
  await page.evaluate(installView);
  return { page, errors, t };
}

function installView() {
  window.a01CameraCalls = [];
  for (const method of ["panTo", "panBy", "flyTo", "setView", "setZoom", "fitBounds"]) {
    const original = map[method];
    map[method] = function (...args) {
      window.a01CameraCalls.push(method);
      return original.apply(this, args);
    };
  }
  window.a01ReadView = () => {
    const rows = [...document.querySelectorAll("#stopList .stop-list-item")];
    const feature = currentSelectedStopKey ? getStopByKey(currentSelectedStopKey) : null;
    const marker = currentSelectedStopKey ? stopMarkerByKey.get(currentSelectedStopKey) : null;
    const style = marker ? Object.fromEntries(
      ["radius", "weight", "fillColor", "fillOpacity", "dashArray"].map(key => [key, marker.options[key]])
    ) : null;
    return {
      checked: document.querySelector("[data-optional-stop-toggle]")?.checked,
      proposed: showProposedStops, conceptual: showConceptualStops,
      markerCount: stopMarkerByKey.size,
      markerLogical: [...new Set([...stopMarkerByKey.keys()].map(key => getLogicalStopKey(getStopByKey(key))))].sort(),
      listLogical: rows.map(row => row.dataset.stopLogicalKey).sort(),
      selectedKey: currentSelectedStopKey,
      selectedLogical: feature ? getLogicalStopKey(feature) : null,
      selectedRows: rows.filter(row => row.classList.contains("is-selected")).map(row => row.dataset.stopLogicalKey),
      currentRows: rows.filter(row => row.getAttribute("aria-current") === "true").map(row => row.dataset.stopLogicalKey),
      cardVisible: !selectedStopInfoEl.hidden,
      cardName: selectedStopInfoEl.querySelector(".selected-stop-title")?.textContent.trim() || null,
      popupOpen: Boolean(marker?.isPopupOpen()), style,
      popupAutoPan: marker?.getPopup()?.options.autoPan ?? null,
      globalPopupOpen: Boolean(map._popup?.isOpen()),
      sharedStop: new URL(location.href).searchParams.get("stop"),
      center: [map.getCenter().lat, map.getCenter().lng], zoom: map.getZoom(),
      filterOpen: document.body.classList.contains("mobile-filter-open"),
      filterExpanded: mobileFilterToggle.getAttribute("aria-expanded"),
      bottomRouteExpanded: mobileBottomRouteButton.getAttribute("aria-expanded"),
      cameraCalls: [...window.a01CameraCalls]
    };
  };
}

async function view(page) {
  return page.evaluate(() => window.a01ReadView());
}

function assertConsistent(state, checked, selection = null) {
  assert.equal(state.checked, checked, "checkbox state");
  assert.equal(state.proposed, checked, "Proposed visibility state");
  assert.equal(state.conceptual, checked, "Conceptual visibility state");
  assert.deepEqual(state.markerLogical, state.listLogical, "map and logical stop list");
  assert.equal(state.selectedKey, selection?.selectedKey || null, "selected stop key");
  assert.equal(state.cardVisible, Boolean(selection), "selected stop card visibility");
  assert.deepEqual(state.selectedRows, selection ? [selection.selectedLogical] : [], "selected list row");
  assert.deepEqual(state.currentRows, state.selectedRows, "accessible selection state");
  assert.equal(state.popupOpen, Boolean(selection?.popupOpen), "selected marker popup");
  assert.equal(state.sharedStop, selection?.sharedStop || null, "shareable selection state");
  if (selection) {
    assert.equal(state.cardName, selection.cardName, "selected stop card content");
    assert.deepEqual(state.style, selection.style, "selected marker styling");
  }
}

function assertUiPreserved(app, before, after) {
  if (after.cameraCalls.length || before.filterOpen !== after.filterOpen
    || (before.selectedKey === after.selectedKey && before.popupOpen !== after.popupOpen)) {
    app.t.diagnostic(JSON.stringify({
      before: { center: before.center, zoom: before.zoom, filterOpen: before.filterOpen, popupOpen: before.popupOpen },
      after: { center: after.center, zoom: after.zoom, filterOpen: after.filterOpen, popupOpen: after.popupOpen },
      cameraCalls: after.cameraCalls
    }));
  }
  assert.deepEqual(after.cameraCalls, [], "toggle must not invoke camera navigation");
  assert.equal(after.zoom, before.zoom, "toggle must preserve zoom");
  assert.deepEqual(after.center, before.center, "toggle must preserve the panned map center");
  assert.equal(after.filterOpen, before.filterOpen, "mobile filter must retain its open/closed state");
  assert.equal(after.filterExpanded, before.filterExpanded, "filter aria-expanded");
  assert.equal(after.bottomRouteExpanded, before.bottomRouteExpanded, "mobile route aria-expanded");
  if (before.selectedKey && before.selectedKey === after.selectedKey) {
    assert.equal(after.popupOpen, before.popupOpen, "toggle must preserve popup open/closed state");
    assert.equal(after.popupAutoPan, before.popupAutoPan, "normal popup auto-pan option must be restored");
  } else if (!before.selectedKey && !after.selectedKey) {
    assert.equal(after.globalPopupOpen, before.globalPopupOpen, "toggle must not reopen a dismissed popup");
  }
}

async function toggle(app, checked) {
  const { page, errors } = app;
  await page.evaluate(() => setMobileFilterOpen(true));
  const input = page.locator("[data-optional-stop-toggle]");
  assert.notEqual(await input.isChecked(), checked, "exercise a real toggle change");
  await page.evaluate(() => { window.a01CameraCalls = []; });
  const before = await view(page);
  await page.locator(".optional-stop-switch").click();
  await page.waitForTimeout(1000);
  assert.deepEqual(errors, [], "toggle must not emit JavaScript errors");
  const after = await view(page);
  assertUiPreserved(app, before, after);
  return after;
}

async function selectStatus({ page, errors }, status) {
  await page.evaluate(() => setMobileFilterOpen(true));
  const key = await page.evaluate(wanted => {
    const row = [...document.querySelectorAll("#stopList .stop-list-item")].find(row =>
      getStopStatus(getStopByKey(row.dataset.stopKey)) === wanted
    );
    return row?.dataset.stopKey;
  }, status);
  assert.ok(key, `real dataset contains a visible ${status} stop`);
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await page.waitForFunction(key => currentSelectedStopKey === key && stopMarkerByKey.get(key)?.isPopupOpen(), key);
  await page.waitForTimeout(350);
  assert.deepEqual(errors, [], "selecting a stop must not emit JavaScript errors");
  return view(page);
}

test("Koridor 13: toggle on/off without a selected stop", async t => {
  const app = await openRoute(t);
  const initial = await view(app.page);
  assertConsistent(initial, false);
  const enabled = await toggle(app, true);
  assertConsistent(enabled, true);
  assert.ok(enabled.markerCount > initial.markerCount, "enabling adds non-existing stops");
  const disabled = await toggle(app, false);
  assertConsistent(disabled, false);
  assert.equal(disabled.markerCount, initial.markerCount);
});

for (const width of [1366, 390]) {
  test(`Koridor 13: retain an Existing selection across on/off at ${width}px`, async t => {
    const app = await openRoute(t, "BRT_13", width);
    const selected = await selectStatus(app, "Existing");
    assertConsistent(selected, false, selected);
    const enabled = await toggle(app, true);
    assertConsistent(enabled, true, selected);
    assert.ok(enabled.markerCount > selected.markerCount);
    const disabled = await toggle(app, false);
    assertConsistent(disabled, false, selected);
    assert.equal(disabled.markerCount, selected.markerCount);
  });
}

for (const [status, routeId] of [["Conceptual", "BRT_13"], ["Proposed", "BRT_11"]]) {
  test(`${routeId}: disabling clears a selected ${status} stop`, async t => {
    const app = await openRoute(t, routeId);
    const initial = await view(app.page);
    await toggle(app, true);
    const selected = await selectStatus(app, status);
    assertConsistent(selected, true, selected);
    const disabled = await toggle(app, false);
    assertConsistent(disabled, false);
    assert.equal(disabled.markerCount, initial.markerCount);
    assert.ok(!disabled.markerLogical.includes(selected.selectedLogical), "hidden selection is removed from map and list");
  });
}

for (const width of [1366, 390]) {
  test(`Koridor 13: preserve a panned view and open popup at ${width}px`, async t => {
    const app = await openRoute(t, "BRT_13", width);
    const initial = await selectStatus(app, "Existing");
    await app.page.evaluate(() => map.panBy([160, -180], { animate: false }));
    await app.page.waitForTimeout(400);
    const selected = await view(app.page);
    assert.ok(selected.popupOpen, "popup remains open after panning");
    assert.notDeepEqual(selected.center, initial.center, "exercise a changed camera center");
    const distance = await app.page.evaluate(() => map.latLngToContainerPoint(
      stopMarkerByKey.get(currentSelectedStopKey).getLatLng()
    ).distanceTo(map.getSize().divideBy(2)));
    assert.ok(distance > 90, "selected stop is away from the viewport center");
    const enabled = await toggle(app, true);
    assertConsistent(enabled, true, selected);
    assertConsistent(await toggle(app, false), false, selected);
  });

  test(`Koridor 13: preserve a closed popup during pending selection at ${width}px`, async t => {
    const app = await openRoute(t, "BRT_13", width);
    // A list click selects immediately but opens its popup after 380 ms.
    // Interrupt navigation as a drag would, then toggle in the same event turn.
    const before = await app.page.evaluate(width => {
      const row = [...document.querySelectorAll("#stopList .stop-list-item")].find(row =>
        getStopStatus(getStopByKey(row.dataset.stopKey)) === "Existing"
      );
      row.click();
      map.stop();
      map.panBy([160, 80], { animate: false });
      setMobileFilterOpen(width !== 390);
      window.a01CameraCalls = [];
      const before = window.a01ReadView();
      document.querySelector("[data-optional-stop-toggle]").click();
      return before;
    }, width);
    assert.ok(before.selectedKey, "selection exists before delayed popup opens");
    assert.equal(before.popupOpen, false);
    await app.page.waitForTimeout(1000);
    const after = await view(app.page);
    assert.deepEqual(app.errors, []);
    assertUiPreserved(app, before, after);
    assertConsistent(after, true, before);
  });

  test(`Koridor 13: keep a manually dismissed popup closed at ${width}px`, async t => {
    const app = await openRoute(t, "BRT_13", width);
    await selectStatus(app, "Existing");
    await app.page.locator(".leaflet-popup-close-button").click();
    const closed = await view(app.page);
    assertConsistent(closed, false);
    assert.equal(closed.globalPopupOpen, false);
    await app.page.evaluate(() => map.panBy([160, 80], { animate: false }));
    assertConsistent(await toggle(app, true), true);
    assertConsistent(await toggle(app, false), false);
  });
}
