// Read-only verification of actual production bytes and computed summary fonts.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const base = "https://itskindamia.github.io/webgis-transportasi-jabodetabek/";
const output = path.join(root, "docs/summary-refinement/compact-font/production");
const cache = path.join(os.tmpdir(), "summary-font-live-" + Date.now());
const exec = promisify(execFile), resources = [], errors = [], captures = [];
let active = 0;
const queue = [];
async function fetchActual(url) {
  if (active >= 4) await new Promise(resolve => queue.push(resolve));
  active++;
  try {
    const { stdout } = await exec("python3", [path.join(root, "tools/fetch-live-resource.py"), url, cache], { maxBuffer: 40 * 1024 * 1024 });
    return JSON.parse(stdout);
  } finally { active--; queue.shift()?.(); }
}
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await context.route("https://**/*", async route => {
    const url = route.request().url(), actual = await fetchActual(url), body = Buffer.from(actual.body, "base64");
    assert.equal(actual.status, 200, url);
    const sha256 = createHash("sha256").update(body).digest("hex");
    let matchesLocal;
    if (url.startsWith(base)) {
      const relative = decodeURIComponent(new URL(url).pathname.slice(new URL(base).pathname.length)) || "index.html";
      assert.ok(!relative.split("/").includes(".."));
      matchesLocal = sha256 === createHash("sha256").update(await readFile(path.join(root, relative))).digest("hex");
      assert.ok(matchesLocal, "production differs from verified main: " + relative);
    }
    resources.push({ url, status: actual.status, sha256, ...(matchesLocal === undefined ? {} : { matchesLocal }) });
    await route.fulfill({ status: actual.status, headers: actual.headers, body });
  });
  await page.goto(base, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true" && stopData?.features?.length > 0);
  await page.click("#infoModalAccept"); await page.waitForSelector("#productTour", { state: "visible" }); await page.click("#productTourSkip");
  await page.evaluate(async () => { await document.fonts.load('400 14px "PT Sans"'); await document.fonts.load('700 14px "PT Sans"'); await document.fonts.ready; });
  await page.click('[data-mode="BRT"]'); await page.selectOption("#routeSelect", "BRT_03"); await page.waitForTimeout(900);
  for (const [width, height] of [[1366, 900], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => { webgisLayout.showPopupDetails(); webgisLayout.setTab("route"); webgisLayout.setSheetPosition("expanded"); });
    await page.waitForTimeout(350);
    const state = await page.evaluate(() => ({ viewport: [innerWidth, innerHeight], documentWidth: document.documentElement.scrollWidth,
      heading: getComputedStyle(document.querySelector("#routeInfo .route-title")).fontSize,
      stats: [...document.querySelectorAll(".route-summary-grid strong")].map(el => ({ size: getComputedStyle(el).fontSize, text: el.textContent.trim() })),
      labels: [...document.querySelectorAll(".route-summary-grid .route-summary-item > span")].map(el => getComputedStyle(el).fontSize),
      font: getComputedStyle(document.querySelector("#routeInfo")).fontFamily,
      loadedWeights: [...document.fonts].filter(f => f.family.replaceAll('"', "") === "PT Sans" && f.status === "loaded").map(f => f.weight).sort(),
      controls: [...document.querySelectorAll("#routeInfo .route-geometry-view-button")].map(el => ({ height: el.getBoundingClientRect().height, size: getComputedStyle(el).fontSize })) }));
    assert.equal(state.documentWidth, width); assert.equal(state.heading, "16px"); assert.ok(state.font.includes("PT Sans"));
    assert.deepEqual(state.loadedWeights, ["400", "700"]);
    assert.ok(state.stats.length === 4 && state.stats.every(s => s.size === "16px"));
    assert.ok(state.labels.every(size => size === "12px"));
    assert.ok(state.controls.every(c => c.height >= 44 && c.size === "12px"));
    await page.waitForFunction(() => [...document.querySelectorAll("#map .leaflet-tile")].every(tile => tile.complete && tile.naturalWidth > 1), null, { timeout: 60000 });
    const file = `live-summary-${width}.png`, bytes = await page.screenshot({ path: path.join(output, file) });
    captures.push({ file, ...state, sha256: createHash("sha256").update(bytes).digest("hex") });
    console.log("Verified live summary fonts at " + width + "px");
  }
  assert.deepEqual(errors, []);
  assert.equal(new Set(resources.filter(r => new URL(r.url).pathname.endsWith(".geojson")).map(r => r.url)).size, 4);
  await writeFile(path.join(output, "fonts-live.json"), JSON.stringify({ verifiedAt: new Date().toISOString(), productionMain: "4939453abb2872e49d8a3dea6f6b13e9f93e0959", site: base,
    browser: await browser.version(), transport: "Actual HTTPS bytes through inherited proxy with Python TLS validation; no mocked assets, fonts, tiles or data.", resources, errors, captures }, null, 2) + "\n");
} finally { await browser.close(); }
