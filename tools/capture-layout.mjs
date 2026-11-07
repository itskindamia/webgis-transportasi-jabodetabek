// Actual screenshots of the local HTTP app, using real provider tiles.
// Chromium: npx playwright install chromium (or set its executable path).
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
const require = createRequire(import.meta.url);
const leaflet = path.dirname(require.resolve("leaflet/dist/leaflet.js"));
const output = path.join(root, "docs/layout-tabler/screenshots");
const exec = promisify(execFile);
const port = process.env.LAYOUT_CAPTURE_PORT || "5187";
const origin = `http://127.0.0.1:${port}`;
const tileCache = process.env.LAYOUT_TILE_CACHE || path.join(os.tmpdir(), "webgis-tabler-tiles");
const captured = [];
const runtimeErrors = [];
const tileFailures = [];
let realTileResponses = 0;
let browser;
let activeFetches = 0;
const queue = [];

async function fetchTile(url) {
  if (activeFetches >= 4) await new Promise(resolve => queue.push(resolve));
  activeFetches += 1;
  try {
    const result = await exec(process.env.PYTHON || "python3", [
      path.join(root, "tools/fetch-preview-tile.py"), url, tileCache
    ], { encoding: "buffer", maxBuffer: 4 * 1024 * 1024 });
    realTileResponses += 1;
    return result.stdout;
  } finally {
    activeFetches -= 1;
    queue.shift()?.();
  }
}

async function settle(page) {
  await page.waitForTimeout(300);
  await page.waitForFunction(() => {
    const tiles = [...document.querySelectorAll("#map .leaflet-tile")];
    return tiles.length > 0 && tiles.every(tile => tile.complete && tile.naturalWidth > 1);
  }, null, { timeout: 40000 });
  // Image decoding completes before Leaflet finishes its tile opacity fade.
  await page.waitForTimeout(250);
}

async function capture(page, filename, description) {
  await settle(page);
  const state = await page.evaluate(() => {
    const rect = document.getElementById("map").getBoundingClientRect();
    return { viewport: [innerWidth, innerHeight], documentWidth: document.documentElement.scrollWidth,
      mapSize: [map.getSize().x, map.getSize().y], mapContainer: [Math.round(rect.width), Math.round(rect.height)],
      route: currentSelectedRouteId, selectedStop: currentSelectedStopKey,
      detailTab: document.getElementById("tlDetailPanel").dataset.tab,
      detailHeight: document.getElementById("tlDetailPanel").getBoundingClientRect().height,
      popupVisible: Boolean(map._popup?.getElement() && getComputedStyle(map._popup.getElement()).visibility !== "hidden"),
      labelCount: document.querySelectorAll("#map .route-stop-name-label").length,
      shownLabels: [...document.querySelectorAll("#map .route-stop-name-label")].filter(el => getComputedStyle(el).visibility !== "hidden").length,
      bodyClasses: document.body.className, loadedTiles: document.querySelectorAll("#map .leaflet-tile-loaded").length };
  });
  assert.deepEqual(state.mapSize, state.mapContainer);
  assert.equal(state.documentWidth, state.viewport[0]);
  const bytes = await page.screenshot({ path: path.join(output, filename), fullPage: false });
  captured.push({ file: filename, description, ...state,
    sha256: createHash("sha256").update(bytes).digest("hex") });
  console.log(`Captured ${filename} (${state.viewport.join("x")})`);
}

await mkdir(output, { recursive: true });
const server = spawn(process.execPath, [path.join(root, "tools/serve-layout.mjs")], {
  cwd: root, env: { ...process.env, PORT: port }, stdio: ["ignore", "pipe", "pipe"]
});
let serverError = "";
server.stderr.on("data", data => { serverError += data; });
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
    server.once("exit", code => reject(new Error(`Preview server exited (${code}): ${serverError}`)));
  });
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  for (const [width, height] of [[1366, 900], [768, 1024], [390, 844], [1600, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    try {
      const page = await context.newPage();
      page.on("pageerror", error => runtimeErrors.push({ width, message: error.message }));
      await context.route("https://**/*", async route => {
        const url = new URL(route.request().url());
        if (["unpkg.com", "cdnjs.cloudflare.com"].includes(url.hostname) && /\/leaflet\.(js|css)$/.test(url.pathname)) {
          const ext = path.extname(url.pathname);
          return route.fulfill({ status: 200, body: await readFile(path.join(leaflet, path.basename(url.pathname))),
            contentType: ext === ".js" ? "application/javascript" : "text/css", headers: { "Access-Control-Allow-Origin": "*" } });
        }
        // Keep screenshots repeatable when optional Google Fonts are unavailable.
        if (url.hostname === "fonts.googleapis.com") return route.fulfill({ status: 200, body: "", contentType: "text/css" });
        if (["server.arcgisonline.com", "tile.openstreetmap.org"].includes(url.hostname)) {
          try {
            return await route.fulfill({ status: 200, body: await fetchTile(url.href),
              contentType: url.hostname === "server.arcgisonline.com" ? "image/jpeg" : "image/png" });
          } catch (error) {
            tileFailures.push({ url: url.href, message: error.message });
            return route.abort();
          }
        }
        return route.abort();
      });
      await page.goto(origin, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true"
        && typeof stopData !== "undefined" && stopData?.features?.length > 0);
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        startupExperienceActive = false;
        clearTimeout(startupTourTimerId);
        setInfoModalOpen(false);
        closeProductTour();
      });
      if (width < 1100) await page.click("#tlNetworkToggle");
      await page.click('[data-mode="BRT"]');
      await page.selectOption("#routeSelect", "BRT_01");
      await page.waitForTimeout(900);
      await capture(page, `layout-${width}.png`, "Koridor 1 dengan tab daftar halte");
      if (width === 1366) {
        await page.click("#tlTabRoute");
        await capture(page, "desktop-route-summary.png", "Ringkasan rute dan kontrol kondisi/tampilan trase");
        await page.click("#tlLegendToggle");
        await page.click("#rightInfoGuideButton");
        await capture(page, "desktop-guided-tour.png", "Guided tour dengan anchor pilihan jaringan Tabler");
        await page.click("#productTourSkip");
      }
      if (width === 768) {
        await page.click("#tlLegendToggle");
        await page.click("#rightInfoGuideButton");
        await page.click("#productTourNext");
        await capture(page, "tablet-guided-tour.png", "Guided tour pada tab detail di tablet");
        await page.click("#productTourSkip");
      }
      if (width === 390) {
        await page.click("#tlDetailExpand");
        await capture(page, "mobile-detail-expanded.png", "Bottom sheet detail diperbesar");
        await page.click("#mobileBottomRouteButton");
        await capture(page, "mobile-filter.png", "Bottom sheet filter jaringan");
        await page.click("#mobileFilterClose");
        await page.click("#tlMobileDetails");
        await page.click("#tlDetailExpand");
        await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click();
        await page.waitForTimeout(1000);
        await capture(page, "mobile-stop-popup.png", "Popup halte ASEAN dengan strip detail 72 px");
        await page.click("#tlDetailResume");
        await capture(page, "mobile-selection-detail.png", "Detail diperbesar; popup disembunyikan tanpa menghapus seleksi");
        await page.click("#tlDetailClose");
        await page.click("#infoButton");
        await page.click("#rightInfoGuideButton");
        await capture(page, "mobile-guided-tour.png", "Guided tour jaringan pada bottom sheet mobile");
        await page.click("#productTourNext");
        await page.click("#productTourNext");
        await page.click("#productTourNext");
        await capture(page, "mobile-tour-search.png", "Guided tour menyorot pencarian yang selalu terlihat");
        await page.click("#productTourSkip");
      }
    } finally { await context.close(); }
  }
  assert.deepEqual(runtimeErrors, [], "no browser runtime errors during capture");
  assert.deepEqual(tileFailures, [], "all requested real tiles loaded");
  const { stdout: commit } = await exec("git", ["rev-parse", "HEAD"], { cwd: root });
  await writeFile(path.join(output, "manifest.json"), JSON.stringify({
    capturedAt: new Date().toISOString(), applicationCommit: commit.trim(),
    browser: await browser.version(), origin: "local HTTP preview (no deployment)",
    realTileResponses, runtimeErrors, tileFailures,
    notes: ["Actual provider tiles via inherited HTTPS proxy and a temporary cache.",
      "Pinned Leaflet CDN bytes supplied from the identical npm package; optional Google Fonts use system fallback.",
      "Application HTML, CSS, JS and GeoJSON loaded from the real local HTTP server."], captured
  }, null, 2) + "\n");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
