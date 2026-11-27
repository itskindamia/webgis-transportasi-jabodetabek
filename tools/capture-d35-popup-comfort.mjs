import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { waitForCamera } from "./d5-browser.mjs";

const url = process.env.D35_CAPTURE_URL || "http://127.0.0.1:5173/";
const output = process.env.D35_CAPTURE_OUTPUT || "artifacts/d35-comfort";
const compareBaseline = process.env.D35_CAPTURE_BASELINE === "1";
const popupCard = ".leaflet-popup .stop-popup-ui";
const panelCard = "#selectedStopInfo > .stop-popup-ui";
const viewports = [{ width: 1440, height: 900 }, { width: 1280, height: 720 },
  { width: 390, height: 844 }, { width: 360, height: 800 }];
const scenarios = [
  { name: "dukuh-atas-lrt", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB001", key: "LRTJB001_01", panel: true },
  { name: "cawang-lrt", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB008", key: "LRTJB008_01", panel: true },
  { name: "sudirman-krl", mode: "KRL", route: "KRL_CK", stop: "KRL059", key: "KRL059_01" },
  { name: "dukuh-atas-brt", mode: "BRT", route: "BRT_01", stop: "BRT010", key: "BRT010_REG" },
  { name: "asean-mrt", mode: "MRT", route: "MRT_NS", stop: "MRT007", key: "MRT007_01" }
];

async function waitForMap(page) {
  await waitForCamera(page, { realTiles: true });
}

async function openStop(page, scenario) {
  const permalink = new URL(url);
  permalink.search = new URLSearchParams({ mode: scenario.mode, route: scenario.route, stop: scenario.stop });
  const response = await page.goto(permalink.href, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `HTTP ${response?.status()} at ${permalink.href}`);
  await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true" && stopData?.features?.length);
  await page.click("#infoModalAccept");
  await page.locator("#productTourSkip").click();
  await page.locator(`${popupCard}[data-stop-key="${scenario.key}"]`).waitFor();
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector(".leaflet-popup")).opacity) > 0.99);
  await page.evaluate(() => document.fonts.ready);
  if (!compareBaseline) {
    const comfort = page.locator('link[href^="css/popup-comfort.css"]');
    assert.ok(await comfort.evaluate(link => link.sheet), "D3.5 stylesheet loaded");
  }
  assert.equal(new URL(page.url()).searchParams.get("stop"), scenario.stop);
}

async function readCard(page, selector) {
  return page.locator(selector).evaluate(root => {
    const rect = root.getBoundingClientRect();
    const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const hit = el => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(x + width / 2, y + height / 2));
    };
    const rows = [...root.querySelectorAll(".integration-place-row")];
    const navigation = [...root.querySelectorAll(".stop-popup-nav-button:not(:disabled)")];
    const summary = document.querySelector("#map > .tl-integration-map-summary:not([hidden])")?.getBoundingClientRect();
    return {
      title: root.querySelector(".stop-popup-title").textContent.trim(),
      stop: currentSelectedStopKey, route: currentSelectedRouteId, permalink: location.search,
      center: map.getCenter(), zoom: map.getZoom(), width: document.documentElement.scrollWidth,
      bounds: rect.toJSON(), visibleRows: rows.filter(visible).length, totalRows: rows.length,
      summaryOverlap: Boolean(summary && rect.left < summary.right && rect.right > summary.left &&
        rect.top < summary.bottom && rect.bottom > summary.top),
      brokenLogos: [...root.querySelectorAll("img")].filter(img => visible(img) &&
        (!img.complete || !img.naturalWidth)).map(img => img.getAttribute("src")),
      navigation: navigation.map(button => ({ direction: button.dataset.stopNav, visible: visible(button), hit: hit(button) })),
      visibleTiles: map.getContainer().querySelectorAll("img.leaflet-tile-loaded").length,
      overlays: window.webgisSpatialIntegrations?.count ?? 0
    };
  });
}

async function validateActions(page, selector) {
  const card = page.locator(selector);
  const maps = card.locator(".stop-popup-maps-link");
  const link = new URL(await maps.getAttribute("href"));
  const coords = await page.evaluate(() => {
    const [lng, lat] = getStopByKey(currentSelectedStopKey).geometry.coordinates;
    return `${lat},${lng}`;
  });
  assert.equal(link.origin, "https://www.google.com");
  assert.equal(link.searchParams.get("query"), coords);
  assert.equal(await maps.getAttribute("target"), "_blank");
  await maps.click({ trial: true });
  const source = card.locator(".stop-source-summary");
  await source.press("Enter");
  assert.equal(await card.locator(".stop-source-card").evaluate(el => el.open), true);
  assert.match(await card.locator(".stop-source-body").innerText(), /\S/);
  await source.press("Enter");
  assert.equal(await card.locator(".stop-source-card").evaluate(el => el.open), false);
}

async function validateUtilities(page) {
  await page.locator("#tlDockAbout").press("Enter");
  await page.locator("#infoModal").waitFor({ state: "visible" });
  await page.locator("#infoModalAccept").click();
  await page.locator("#tlDockGuide").press("Enter");
  await page.locator("#productTour").waitFor({ state: "visible" });
  await page.locator("#productTourSkip").click();
  await page.waitForFunction(() => document.activeElement?.id === "tlDockGuide");
}

async function validateNavigation(page, stop) {
  const next = page.locator(`${popupCard} [data-stop-nav="next"]`);
  const nextKey = await next.getAttribute("data-stop-key");
  assert.ok(nextKey && nextKey !== stop);
  await next.click();
  const active = page.locator(`${popupCard}[data-stop-key="${nextKey}"]`);
  await active.waitFor();
  await page.locator(`${popupCard}[data-stop-key="${stop}"]`).waitFor({ state: "detached" });
  await active.locator(`[data-stop-nav="previous"][data-stop-key="${stop}"]`).click();
  await page.locator(`${popupCard}[data-stop-key="${stop}"]`).waitFor();
}

async function capture(page, selector, scenario, size, presentation) {
  await waitForMap(page);
  const measure = await readCard(page, selector);
  const isDesktop = size.width >= 1024;
  assert.equal(measure.route, scenario.route);
  assert.equal(measure.stop, scenario.key);
  assert.equal(measure.width, size.width);
  assert.deepEqual(measure.brokenLogos, []);
  assert.ok(measure.navigation.length && measure.navigation.every(button => button.visible && button.hit),
    `${scenario.name} ${presentation} navigation is visible and operable: ${JSON.stringify(measure.navigation)}`);
  if (presentation === "popup") {
    assert.ok(measure.bounds.left >= 0 && measure.bounds.right <= size.width &&
      measure.bounds.top >= 0 && measure.bounds.bottom <= size.height,
    `${size.width}×${size.height} ${scenario.name} popup fits the viewport: ${JSON.stringify(measure.bounds)}`);
    if (!compareBaseline) assert.equal(measure.summaryOverlap, false, "D4 summary stays clear of the popup");
  }
  if (!compareBaseline) {
    const maxRows = isDesktop && presentation === "popup" ? 3 : Infinity;
    assert.equal(measure.visibleRows, Math.min(maxRows, measure.totalRows));
    assert.equal(await page.locator("#tlDockGuide").isVisible(), isDesktop);
    assert.equal(await page.locator("#tlDockAbout").isVisible(), isDesktop);
  }
  const file = `${size.width}x${size.height}-${scenario.name}-${presentation}.png`;
  await page.screenshot({ path: join(output, file), animations: "disabled", caret: "hide" });
  return { file, ...measure };
}

async function assertSelectionUnchanged(page, before, after) {
  assert.equal(after.stop, before.stop);
  assert.equal(after.route, before.route);
  assert.equal(after.permalink, before.permalink);
  assert.equal(after.zoom, before.zoom);
  assert.equal(after.overlays, before.overlays);
  const pixels = await page.evaluate(({ a, b }) => map.project(a).distanceTo(map.project(b)),
    { a: before.center, b: after.center });
  assert.ok(pixels <= 1, `switch preserves the center within Leaflet rounding: ${pixels}px; ${JSON.stringify({ before: before.center, after: after.center })}`);
}

async function switchPresentation(page, control) {
  // Sample at activation before the layout handler. Waiting for a screenshot
  // or a browser click can span an independent Leaflet animation frame.
  await page.evaluate(() => document.addEventListener("click", () => {
    window.cameraBeforePresentationSwitch = {
      stop: currentSelectedStopKey, route: currentSelectedRouteId, permalink: location.search,
      center: map.getCenter(), zoom: map.getZoom(), overlays: window.webgisSpatialIntegrations?.count ?? 0
    };
  }, { capture: true, once: true }));
  await page.locator(control).click();
  return page.evaluate(() => window.cameraBeforePresentationSwitch);
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
const report = { url, workflowCommit: process.env.GITHUB_SHA || null, screenshots: [] };
try {
  for (const size of viewports) {
    const isDesktop = size.width >= 1024;
    for (const scenario of scenarios) {
      const context = await browser.newContext({ viewport: size, hasTouch: !isDesktop });
      try {
        const page = await context.newPage();
        const pageErrors = [];
        const consoleErrors = new Set();
        page.on("pageerror", error => pageErrors.push(error.message));
        page.on("console", message => { if (message.type() === "error") consoleErrors.add(message.text()); });
        await openStop(page, scenario);
        const initial = await capture(page, popupCard, scenario, size, "popup");
        const screenshots = [initial];
        if (isDesktop && scenario.panel) {
          const beforePanel = await switchPresentation(page, `${popupCard} .tl-show-stop-in-panel`);
          await page.locator(panelCard).waitFor();
          const details = await capture(page, panelCard, scenario, size, "panel");
          assert.equal(details.totalRows, initial.totalRows);
          await assertSelectionUnchanged(page, beforePanel, details);
          const beforePopup = await switchPresentation(page, "#tlReturnToPopup");
          await page.locator(popupCard).waitFor();
          await waitForMap(page);
          await assertSelectionUnchanged(page, beforePopup, await readCard(page, popupCard));
          screenshots.push(details);
        }
        if (!compareBaseline) {
          await validateActions(page, popupCard);
          if (isDesktop && scenario === scenarios[0]) await validateUtilities(page);
          if (isDesktop && scenario.name === "cawang-lrt") await validateNavigation(page, scenario.key);
        }
        assert.deepEqual(pageErrors, []);
        report.screenshots.push(...screenshots.map(shot => ({ ...shot, consoleErrors: [...consoleErrors] })));
        console.log(`${size.width}x${size.height} ${scenario.name}: ${screenshots.map(shot => shot.file).join(", ")}`);
      } finally {
        await context.close();
      }
    }
  }
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
} finally {
  await browser.close();
}
