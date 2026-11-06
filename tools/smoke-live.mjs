// Uses actual production/CDN bytes through the inherited proxy, with TLS
// validation in fetch-live-resource.py. No mocked data, tiles or UI resources.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const base = "https://itskindamia.github.io/webgis-transportasi-jabodetabek/";
const output = process.env.LIVE_SMOKE_OUTPUT || path.join(root, "docs/release-20261106/production");
const cache = path.join(os.tmpdir(), "webgis-live-" + Date.now());
const exec = promisify(execFile);
const errors = [], failures = [], responses = [], captures = [];
let active = 0;
const queue = [];
async function resource(url) {
  if (active >= 4) await new Promise(resolve => queue.push(resolve));
  active++;
  try {
    const { stdout } = await exec(process.env.PYTHON || "python3", [path.join(root, "tools/fetch-live-resource.py"), url, cache], { maxBuffer: 40 * 1024 * 1024 });
    return JSON.parse(stdout);
  } finally { active--; queue.shift()?.(); }
}
async function station(page, route, key) {
  if (await page.locator("#filterPanel").evaluate(el => el.inert || getComputedStyle(el).display === "none")) await page.click("#tlNetworkToggle");
  await page.click('[data-mode="LRT"]'); await page.selectOption("#routeSelect", route);
  await page.waitForTimeout(700);
  await page.evaluate(() => { webgisLayout.showPopupDetails(); webgisLayout.setTab("stops"); webgisLayout.setDetailExpanded(true); });
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await page.waitForTimeout(1000);
}
async function capture(page, name) {
  await page.waitForFunction(() => [...document.querySelectorAll("#map .leaflet-tile")].every(tile => tile.complete && tile.naturalWidth > 1), null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({ viewport: [innerWidth, innerHeight], width: document.documentElement.scrollWidth,
    selected: currentSelectedStopKey, route: currentSelectedRouteId, font: getComputedStyle(document.body).fontFamily }));
  assert.equal(state.width, state.viewport[0]);
  const bytes = await page.screenshot({ path: path.join(output, name) });
  captures.push({ file: name, ...state, sha256: createHash("sha256").update(bytes).digest("hex") });
  console.log("Live capture " + name);
}
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await context.route("https://**/*", async route => {
    const url = route.request().url();
    try {
      const actual = await resource(url), body = Buffer.from(actual.body, "base64");
      const sha256 = createHash("sha256").update(body).digest("hex");
      if (actual.status !== 200) failures.push({ url, status: actual.status });
      let matchesLocal;
      if (url.startsWith(base)) {
        const relative = decodeURIComponent(new URL(url).pathname.slice(new URL(base).pathname.length)) || "index.html";
        assert.ok(!relative.split("/").includes(".."));
        const expected = await readFile(path.join(root, relative));
        matchesLocal = sha256 === createHash("sha256").update(expected).digest("hex");
        assert.ok(matchesLocal, "production differs from tested candidate: " + relative);
      }
      responses.push({ url, status: actual.status, bytes: body.length, sha256, matchesLocal });
      await route.fulfill({ status: actual.status, headers: actual.headers, body });
    } catch (error) { failures.push({ url, message: error.message }); await route.abort(); }
  });
  const response = await page.goto(base, { waitUntil: "load", timeout: 120000 });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true" && typeof stopData !== "undefined" && stopData.features.length > 0);
  await page.click("#infoModalAccept"); await page.waitForSelector("#productTour", { state: "visible" }); await page.click("#productTourSkip");
  await page.evaluate(async () => { await document.fonts.load('400 14px "PT Sans"'); await document.fonts.load('700 14px "PT Sans"'); await document.fonts.ready; });
  assert.equal(await page.evaluate(() => [...document.fonts].filter(face => face.family.replaceAll('"', "") === "PT Sans" && face.status === "loaded").length), 2);
  await station(page, "LRT_JKT_S", "LRTJ006_01");
  assert.equal(await page.locator(".lrt-service-operator").innerText(), "LRT Jakarta");
  await capture(page, "live-velodrome-desktop.png");
  await station(page, "LRT_JB_BK", "LRTJB009_01");
  assert.equal(await page.locator(".lrt-service-operator").innerText(), "LRT Jabodebek");
  await station(page, "LRT_JB_BK", "LRTJB008_01");
  assert.equal(await page.locator(".lrt-service-button").count(), 2);
  await page.locator('.lrt-popup [data-route-switch="LRT_JB_CB"]').click(); await page.waitForTimeout(700);
  const next = await page.evaluate(() => getStopKey(getAdjacentStops(getStopByKey(currentSelectedStopKey), currentSelectedRouteId).next));
  await page.locator('.lrt-popup [data-stop-nav="next"]').click(); await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => currentSelectedStopKey), next);
  assert.equal(await page.evaluate(() => currentSelectedRouteId), "LRT_JB_CB");
  await station(page, "LRT_JB_BK", "LRTJB008_01");
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(450);
  await capture(page, "live-cawang-mobile.png");
  for (const [width, height] of [[568, 320], [844, 390]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(450);
    await page.locator(".lrt-popup-body").evaluate(el => { el.scrollTop = 0; });
    await capture(page, `live-landscape-${width}.png`);
    await page.locator(".lrt-popup .stop-popup-maps-link").click({ trial: true });
    await page.locator(".lrt-popup .stop-source-summary").click();
    assert.ok(await page.locator(".lrt-popup .stop-source-body a[href]").count());
    await page.locator(".lrt-popup .stop-source-summary").click();
    await page.locator("#zoomInButton").click({ trial: true });
    await page.locator(".leaflet-popup-close-button").click({ trial: true });
  }
  const geojson = responses.filter(r => new URL(r.url).pathname.endsWith(".geojson"));
  assert.equal(new Set(geojson.map(r => r.url)).size, 4);
  assert.ok(geojson.every(r => r.status === 200 && r.matchesLocal));
  assert.deepEqual(failures, []); assert.deepEqual(errors, []);
  const { stdout: sha } = await exec("git", ["rev-parse", "HEAD"], { cwd: root });
  await writeFile(path.join(output, "smoke.json"), JSON.stringify({ verifiedAt: new Date().toISOString(), url: base, expectedCommit: sha.trim(), browser: await browser.version(),
    transport: "Actual HTTPS production responses via inherited proxy; Python validates TLS using configured CA trust. No mocked assets/data.",
    errors, failures, geojsonCount: 4, loadedFontFaces: [400, 700], responses, captures }, null, 2) + "\n");
  console.log("Production smoke passed: resources match local candidate, four GeoJSON, both fonts, LRT Jakarta/Jabodebek, navigation and landscape");
} finally { await browser.close(); }
