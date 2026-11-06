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
  return { page, errors };
}

async function view(page) {
  return page.evaluate(() => {
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
      sharedStop: new URL(location.href).searchParams.get("stop")
    };
  });
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
  assert.equal(state.popupOpen, Boolean(selection), "selected marker popup");
  assert.equal(state.sharedStop, selection?.sharedStop || null, "shareable selection state");
  if (selection) {
    assert.equal(state.cardName, selection.cardName, "selected stop card content");
    assert.deepEqual(state.style, selection.style, "selected marker styling");
  }
}

async function toggle({ page, errors }, checked) {
  await page.evaluate(() => setMobileFilterOpen(true));
  const input = page.locator("[data-optional-stop-toggle]");
  assert.notEqual(await input.isChecked(), checked, "exercise a real toggle change");
  await page.locator(".optional-stop-switch").click();
  await page.waitForTimeout(650);
  assert.deepEqual(errors, [], "toggle must not emit JavaScript errors");
  return view(page);
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
