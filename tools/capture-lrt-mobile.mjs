// Real local HTTP application + real provider tiles, never illustration/mockups.
// LAYOUT_APP_ROOT can point to a detached baseline checkout for before images.
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const appRoot = process.env.LAYOUT_APP_ROOT || root;
const stage = process.env.CAPTURE_STAGE || "after";
assert.ok(["before", "after"].includes(stage));
const output = process.env.LAYOUT_CAPTURE_OUTPUT ? path.resolve(root, process.env.LAYOUT_CAPTURE_OUTPUT) : path.join(root, "docs/lrt-mobile/screenshots", stage);
const require = createRequire(import.meta.url);
const leaflet = path.dirname(require.resolve("leaflet/dist/leaflet.js"));
const exec = promisify(execFile);
const port = process.env.LAYOUT_CAPTURE_PORT || "5188";
const tileCache = process.env.LAYOUT_TILE_CACHE || path.join(os.tmpdir(), "webgis-tabler-tiles");
const captured = [], runtimeErrors = [], tileFailures = [];
let browser, requests = 0, fetching = 0;
const queue = [];
async function fetchTile(url) {
  if (fetching >= 4) await new Promise(resolve => queue.push(resolve));
  fetching++;
  try {
    const { stdout } = await exec(process.env.PYTHON || "python3", [path.join(root, "tools/fetch-preview-tile.py"), url, tileCache],
      { encoding: "buffer", maxBuffer: 4 * 1024 * 1024 });
    requests++;
    return stdout;
  } finally { fetching--; queue.shift()?.(); }
}
async function capture(page, filename, description) {
  await page.waitForFunction(() => {
    const tiles = [...document.querySelectorAll("#map .leaflet-tile")];
    return tiles.length && tiles.every(tile => tile.complete && tile.naturalWidth > 1);
  }, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => {
    const rect = document.getElementById("map").getBoundingClientRect();
    return { viewport: [innerWidth, innerHeight], documentWidth: document.documentElement.scrollWidth,
      mapSize: [map.getSize().x, map.getSize().y], mapContainer: [Math.round(rect.width), Math.round(rect.height)],
      route: currentSelectedRouteId, stop: currentSelectedStopKey, detailTab: document.getElementById("tlDetailPanel").dataset.tab,
      font: getComputedStyle(document.body).fontFamily, bodyClasses: document.body.className,
      loadedTiles: document.querySelectorAll("#map .leaflet-tile-loaded").length };
  });
  assert.equal(state.documentWidth, state.viewport[0]);
  assert.deepEqual(state.mapSize, state.mapContainer);
  const bytes = await page.screenshot({ path: path.join(output, filename) });
  captured.push({ file: filename, description, ...state, sha256: createHash("sha256").update(bytes).digest("hex") });
  console.log(`Captured ${stage}/${filename}`);
}
async function choose(page, mode, routeId, stopId) {
  if (await page.locator("#filterPanel").evaluate(el => el.inert || getComputedStyle(el).display === "none" || getComputedStyle(el).visibility === "hidden")) await page.click("#tlNetworkToggle");
  await page.click(`[data-mode="${mode}"]`);
  await page.selectOption("#routeSelect", routeId);
  await page.waitForTimeout(700);
  if (!stopId) return;
  const key = await page.evaluate(id => getStopKey(stopData.features.find(item => item.properties.STOP_ID === id)), stopId);
  await page.evaluate(() => { window.webgisLayout.setTab("stops"); window.webgisLayout.setDetailExpanded(true); });
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await page.waitForTimeout(1000);
}

await mkdir(output, { recursive: true });
const server = spawn(process.execPath, [path.join(appRoot, "tools/serve-layout.mjs")], { cwd: appRoot, env: { ...process.env, PORT: port }, stdio: ["ignore", "pipe", "pipe"] });
let serverError = "";
server.stderr.on("data", data => { serverError += data; });
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
    server.once("exit", code => reject(new Error(`Preview server exited (${code}): ${serverError}`)));
  });
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  const viewports = stage === "before" ? [[1366, 900], [390, 844]] : [[320, 568], [360, 800], [390, 844], [768, 1024], [1366, 900], [1600, 1000]];
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    try {
      const page = await context.newPage();
      page.on("pageerror", error => runtimeErrors.push({ width, message: error.message }));
      await context.route("https://**/*", async route => {
        const url = new URL(route.request().url());
        if (["unpkg.com", "cdnjs.cloudflare.com"].includes(url.hostname) && /\/leaflet\.(js|css)$/.test(url.pathname)) {
          return route.fulfill({ status: 200, body: await readFile(path.join(leaflet, path.basename(url.pathname))),
            contentType: url.pathname.endsWith(".js") ? "application/javascript" : "text/css", headers: { "Access-Control-Allow-Origin": "*" } });
        }
        // Baseline's optional Google stylesheet is isolated; after uses real self-hosted PT Sans.
        if (url.hostname === "fonts.googleapis.com") return route.fulfill({ status: 200, body: "", contentType: "text/css" });
        if (["server.arcgisonline.com", "tile.openstreetmap.org"].includes(url.hostname)) {
          try { return await route.fulfill({ status: 200, body: await fetchTile(url.href), contentType: url.hostname === "server.arcgisonline.com" ? "image/jpeg" : "image/png" }); }
          catch (error) { tileFailures.push({ url: url.href, message: error.message }); return route.abort(); }
        }
        return route.abort();
      });
      await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true" && typeof stopData !== "undefined" && stopData?.features?.length > 0);
      if (stage === "after") {
        await page.evaluate(async () => { await document.fonts.load('400 14px "PT Sans"'); await document.fonts.load('700 14px "PT Sans"'); await document.fonts.ready; });
        if (width === 390) await capture(page, "first-open-390.png", "Tampilan pertama dan disclaimer asli pada smartphone");
      }
      await page.evaluate(() => { startupExperienceActive = false; clearTimeout(startupTourTimerId); setInfoModalOpen(false); closeProductTour(); });
      if (stage === "before" || width === 320 || width === 390 || width === 1366) {
        await choose(page, "LRT", "LRT_JKT_S", "LRTJ006");
        await capture(page, `lrt-jakarta-${width}.png`, "Velodrome: metadata, lin dan integrasi berasal dari data aktual");
      }
      if (stage === "before" || [390, 768, 1366, 1600].includes(width)) {
        await choose(page, "LRT", "LRT_JB_BK", "LRTJB008");
        await capture(page, `lrt-jabodebek-multiline-${width}.png`, "Cawang: dua lin LRT Jabodebek, konteks aktif Lin Bekasi");
      }
      if (stage === "after" && width === 360) {
        await choose(page, "BRT", "BRT_01");
        await capture(page, "koridor-1-360.png", "Koridor 1 dan daftar halte pada Android 360 px");
      }
      if (stage === "after" && width === 390) {
        await page.click("#tlDetailResume");
        await page.waitForTimeout(200);
        await capture(page, "detail-sheet-390.png", "Panel detail ditampilkan kembali; popup dan seleksi tetap tersimpan");
        await page.click("#mobileBottomRouteButton");
        await capture(page, "network-sheet-390.png", "Filter moda, lin dan status mudah diakses melalui bottom sheet");
        await page.click("#mobileFilterClose");
        await choose(page, "LRT", "LRT_JKT_S", "LRTJ006");
        await page.locator(".lrt-popup .stop-popup-navigation").scrollIntoViewIfNeeded();
        await capture(page, "lrt-jakarta-actions-390.png", "Integrasi, tombol sumber/Maps dan navigasi tetap dapat di-scroll");
        await page.setViewportSize({ width: 568, height: 320 });
        await page.waitForTimeout(400);
        await capture(page, "lrt-landscape-568.png", "Orientasi landscape pendek: peta diprioritaskan, popup dapat di-scroll");
        await page.setViewportSize({ width: 844, height: 390 });
        await page.waitForTimeout(400);
        await capture(page, "lrt-landscape-844.png", "Landscape tablet compact dengan informasi pelayanan terlihat di samping header");
      }
    } finally { await context.close(); }
  }
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(tileFailures, []);
  const { stdout: commit } = await exec("git", ["rev-parse", "HEAD"], { cwd: appRoot });
  const { stdout: dirty } = await exec("git", ["diff", "--name-only", "HEAD"], { cwd: appRoot });
  await writeFile(path.join(output, "manifest.json"), JSON.stringify({ capturedAt: new Date().toISOString(), applicationCommit: commit.trim(), modifiedTrackedFiles: dirty.trim().split("\n").filter(Boolean),
    browser: await browser.version(), origin: "local HTTP preview (no deployment)", realTileResponses: requests, runtimeErrors, tileFailures,
    notes: ["Actual provider tiles via inherited HTTPS proxy and temporary cache.", "Pinned Leaflet CDN bytes supplied by identical npm package.", "Before: optional Google Fonts isolated with system fallback. After: real local PT Sans 400/700 loaded.", "Actual application/data served over local HTTP; station IDs in this tool are test fixtures only."], captured }, null, 2) + "\n");
} finally { await browser?.close(); server.kill("SIGTERM"); }
