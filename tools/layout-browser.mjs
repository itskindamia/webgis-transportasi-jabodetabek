// Deterministic local browser fixture: application/data/Leaflet are real;
// tile and geocoding services are isolated from layout regression tests.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const leaflet = path.dirname(require.resolve("leaflet/dist/leaflet.js"));
const origin = "http://127.0.0.1:5173";
const tile = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".geojson": "application/geo+json", ".svg": "image/svg+xml", ".png": "image/png" };

export async function openLayout(browser, width = 1366, height = 900) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  const geocodingRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    let file;
    if (url.origin === origin) {
      file = path.resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
      if (!file.startsWith(root)) return route.abort();
    } else if (["unpkg.com", "cdnjs.cloudflare.com"].includes(url.hostname) && /\/leaflet\.(js|css)$/.test(url.pathname)) {
      file = path.join(leaflet, path.basename(url.pathname));
    } else if (url.hostname === "fonts.googleapis.com") {
      return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    } else if (["server.arcgisonline.com", "tile.openstreetmap.org"].includes(url.hostname)) {
      return route.fulfill({ status: 200, contentType: "image/png", body: tile });
    } else if (url.hostname === "nominatim.openstreetmap.org") {
      geocodingRequests.push(url.href);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
        { place_id: 1, display_name: "Tempat uji, Jakarta, Indonesia", lat: "-6.1754", lon: "106.8272", boundingbox: ["-6.18", "-6.17", "106.82", "106.83"] }
      ]) });
    } else return route.abort();
    try {
      return await route.fulfill({ status: 200, contentType: mime[path.extname(file)] || "application/octet-stream",
        body: await readFile(file), headers: { "Access-Control-Allow-Origin": "*" } });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return route.fulfill({ status: 404, body: "Not found" });
    }
  });
  await page.goto(origin + "/", { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true"
    && typeof stopData !== "undefined" && stopData?.features?.length > 0);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    startupExperienceActive = false;
    clearTimeout(startupTourTimerId);
    setInfoModalOpen(false);
    closeProductTour();
  });
  return { page, context, errors, geocodingRequests };
}

export async function chooseRoute(page, route = "BRT_01") {
  if (await page.locator("#filterPanel").evaluate(el => el.inert || getComputedStyle(el).display === "none")) {
    await page.click("#tlNetworkToggle");
  }
  await page.click('[data-mode="BRT"]');
  await page.selectOption("#routeSelect", route);
  await page.waitForTimeout(850);
}

export async function readMap(page) {
  return page.evaluate(() => {
    const rect = document.getElementById("map").getBoundingClientRect();
    return { size: [map.getSize().x, map.getSize().y], container: [Math.round(rect.width), Math.round(rect.height)],
      center: [map.getCenter().lat, map.getCenter().lng], zoom: map.getZoom(),
      documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
  });
}
