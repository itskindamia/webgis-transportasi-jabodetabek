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
const kind = "floating";
assert.ok(["before", "after"].includes(stage));
const output = process.env.LAYOUT_CAPTURE_OUTPUT ? path.resolve(root, process.env.LAYOUT_CAPTURE_OUTPUT) : path.join(root, "docs/floating-layout/screenshots", stage);
const require = createRequire(import.meta.url);
const leaflet = path.dirname(require.resolve("leaflet/dist/leaflet.js"));
const exec = promisify(execFile);
const port = process.env.LAYOUT_CAPTURE_PORT || "5191";
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
async function capture(page, filename, description, selector) {
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
      loadedTiles: document.querySelectorAll("#map .leaflet-tile-loaded").length,
      networkHeight: document.getElementById("filterPanel").getBoundingClientRect().height,
      detailHeight: document.getElementById("tlDetailPanel").getBoundingClientRect().height,
      rows: [...document.querySelectorAll("#stopList .stop-list-item")].slice(0, 8).map(el => ({ name: el.querySelector(".stop-list-name")?.textContent.trim(), top: el.getBoundingClientRect().top, height: el.getBoundingClientRect().height })),
      guideDisplay: getComputedStyle(document.querySelector(".info-guide-grid")).display };
  });
  assert.equal(state.documentWidth, state.viewport[0]);
  assert.deepEqual(state.mapSize, state.mapContainer);
  const bytes = await (selector ? page.locator(selector) : page).screenshot({ path: path.join(output, filename) });
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

async function showDetail(page, tab = "stops", position = "half") {
  await page.evaluate(({ tab, position }) => {
    webgisLayout.setDetail(true);
    webgisLayout.setTab(tab);
    webgisLayout.setSheetPosition(position);
  }, { tab, position });
  await page.waitForTimeout(250);
}
async function guide(page, name) {
  await page.click("#tlAbout");
  await page.locator(".info-guide-section").evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await capture(page, name, "Kartu Cara Menggunakan dalam modal Informasi & Catatan");
  await page.click("#infoModalClose");
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
  const cases = [[1440,900],[1280,720],[1024,768],[768,1024],[390,844],[360,800]];
  for (const [width,height] of cases) {
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
        if (["server.arcgisonline.com", "tile.openstreetmap.org"].includes(url.hostname)) {
          try { return await route.fulfill({ status: 200, body: await fetchTile(url.href), contentType: url.hostname === "server.arcgisonline.com" ? "image/jpeg" : "image/png" }); }
          catch (error) { tileFailures.push({ url: url.href, message: error.message }); return route.abort(); }
        }
        return route.abort();
      });
      await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true" && typeof stopData !== "undefined" && stopData?.features?.length > 0);
      await page.click("#infoModalAccept");
      await page.waitForSelector("#productTour", { state: "visible" });
      await page.click("#productTourSkip");
      await page.evaluate(async () => { await document.fonts.load('400 14px "PT Sans"'); await document.fonts.load('700 14px "PT Sans"'); await document.fonts.ready; });
      await choose(page,"BRT","BRT_03");
      if (width < 768) await page.click("#mobileBottomRouteButton");
      else if (await page.locator("#filterPanel").evaluate(el => el.inert)) await page.click("#tlNetworkToggle");
      await capture(page,`network-${width}.png`,"Jaringan Koridor 3, filter dan nama rute lengkap");
      if (width < 768) await page.click("#mobileFilterClose");
      await showDetail(page,"stops","half");
      await capture(page,`stops-${width}.png`,"Daftar halte Koridor 3 dan ruang peta");
    } finally { await context.close(); }
  }
  assert.deepEqual(runtimeErrors, []); assert.deepEqual(tileFailures, []);
  const { stdout: commit } = await exec("git",["rev-parse","HEAD"],{cwd:appRoot});
  await writeFile(path.join(output,"manifest.json"),JSON.stringify({capturedAt:new Date().toISOString(),applicationCommit:commit.trim(),kind,stage,browser:await browser.version(),realTileResponses:requests,runtimeErrors,tileFailures,captured},null,2)+"\n");
} finally { await browser?.close(); server.kill("SIGTERM"); }
