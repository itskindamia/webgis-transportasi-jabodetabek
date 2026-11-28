import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { acceptWelcome, assertSelectionUnchanged, fixtures, panelSelector, popupCoverage, popupSelector,
  readSelection, stationUrl, switchPresentation, waitForCamera, waitForStation } from "./d5-browser.mjs";

const url = process.env.D5_CAPTURE_URL || "http://127.0.0.1:5173/";
const output = process.env.D5_CAPTURE_OUTPUT || "artifacts/d5/after";
const baseline = process.env.D5_CAPTURE_BASELINE === "1";
const production = process.env.D5_CAPTURE_PRODUCTION === "1";
const d51 = process.env.D5_CAPTURE_PROFILE === "d51";
const version = process.env.D5_CAPTURE_VERSION || (baseline ? "baseline" : production ? "production" : "candidate");
const galunggung = { name: "galunggung-brt", mode: "BRT", route: "BRT_06", stop: "BRT078", key: "BRT078_REG" };
const captureFixtures = d51 ? [galunggung, fixtures[2], fixtures[3], fixtures[4], fixtures[6]] : fixtures;
const sizes = production ? [[1440, 900], [390, 844]] :
  d51 ? [[1280, 720], [1440, 900], [1536, 864], [360, 800], [390, 844]] :
  [[1280, 720], [1440, 900], [1536, 864], [1600, 900], [360, 800], [390, 844]];

async function capture(page, report, fixture, kind, width, height, details = {}) {
  await waitForCamera(page, { realTiles: true, zoomAtStop: kind !== "lihat-semua" });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
  const file = `${width}x${height}-${fixture.name}-${kind}.png`;
  await page.screenshot({ path: join(output, file), animations: "disabled", caret: "hide" });
  report.screenshots.push({ file, kind, viewport: [width, height], ...await readSelection(page), ...details });
  console.log(file);
}

async function verifyUtilities(page, card, isDesktop) {
  await card.locator(".stop-popup-maps-link").click({ trial: true });
  const source = card.locator(".stop-source-summary");
  if (!await source.count()) return false;
  await source.press("Enter");
  await card.locator(".stop-source-body").waitFor();
  const link = card.locator(".stop-source-body a[href]").first();
  if (await link.count()) await link.click({ trial: true });
  if (isDesktop) {
    await card.locator(".stop-popup-nav-button:not(:disabled)").first().click({ trial: true });
    if (!baseline) assert.equal(await source.getAttribute("aria-expanded"), "true");
  }
  return true;
}

async function inspectD51(page, card, fixture, kind) {
  const subtitleVisible = await page.locator("#tlDetailSubtitle").isVisible();
  const { colors, gap } = await card.evaluate(element => {
    const visible = node => node.checkVisibility();
    const badges = [...document.querySelectorAll(".tj-route-code, .stop-terminus-number-marker > span")].filter(visible);
    const meta = element.querySelector(".stop-popup-meta-row");
    const activity = element.querySelector(".stop-popup-activity");
    return {
      colors: [...new Set(badges.map(badge => getComputedStyle(badge).color))],
      gap: meta && activity && visible(activity)
        ? Math.round(activity.getBoundingClientRect().top - meta.getBoundingClientRect().bottom) : null
    };
  });
  if (version !== "before") {
    assert.ok(colors.every(color => color === "rgb(255, 255, 255)"), "BRT text badge remains white");
    assert.equal(subtitleVisible, false, "route header omits the duplicate stop title");
    if (fixture === galunggung && kind === "panel") assert.ok(gap >= 8, `passenger service gap ${gap}px`);
  }
  return { subtitleVisible, badgeColors: colors, passengerServiceGap: gap };
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
const report = { url, version,
  commit: process.env.D5_CAPTURE_SHA || null, screenshots: [], httpErrors: [], cspErrors: [] };
try {
  for (const [width, height] of sizes) {
    const desktop = width >= 1024;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: !desktop });
    try {
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      page.on("response", response => {
        if (response.status() >= 400) report.httpErrors.push({ url: response.url(), status: response.status() });
      });
      await page.addInitScript(() => {
        window.d5CspViolations = [];
        document.addEventListener("securitypolicyviolation", event => d5CspViolations.push({
          directive: event.violatedDirective, uri: event.blockedURI
        }));
      });
      for (const fixture of captureFixtures) {
        // Panel preference is verified separately. Start each fixture in Popup mode.
        if (page.url() !== "about:blank") await page.evaluate(() => localStorage.removeItem("webgis.stopInfoMode"));
        const response = await page.goto(stationUrl(url, fixture), { waitUntil: "domcontentloaded" });
        assert.ok(response?.ok(), `HTTP ${response?.status()} for ${fixture.name}`);
        await acceptWelcome(page);
        await waitForStation(page, fixture, { realTiles: true });
        const popup = page.locator(popupSelector);
        const state = await readSelection(page);
        const title = await popup.locator(".stop-popup-title").innerText();
        const coverage = desktop ? await popupCoverage(page) : null;
        const totalRows = await popup.locator(".integration-place-row").count();
        assert.equal(await popup.locator(".integration-place-row:visible").count(), desktop ? Math.min(3, totalRows) : totalRows);
        assert.deepEqual(await popup.locator("img:visible").evaluateAll(images =>
          images.filter(image => image.complete && !image.naturalWidth).map(image => image.src)), []);
        if (desktop && !baseline) {
          assert.equal(coverage.insideMap, true, `${fixture.name} fits ${width}×${height}: ${JSON.stringify(coverage)}`);
          assert.equal(coverage.controlsCovered, 0, `${fixture.name} keeps map controls reachable`);
          assert.equal(coverage.covered, 0, "every visible transfer badge is clear of the popup");
        }
        const popupAudit = d51 ? await inspectD51(page, popup, fixture, "popup") : {};
        await capture(page, report, fixture, "popup", width, height, { coverage, totalRows, ...popupAudit });
        const sourceOpen = await verifyUtilities(page, popup, desktop);
        if (sourceOpen) {
          if (fixture === fixtures[2]) await capture(page, report, fixture, "source", width, height);
          await popup.locator(".stop-source-summary").press("Enter");
        }
        await popup.locator(".stop-popup-nav-button:not(:disabled)").first().click({ trial: true });

        if (desktop) {
          const beforePanel = await switchPresentation(page, popupSelector + " .tl-show-stop-in-panel");
          const panel = page.locator(panelSelector);
          await panel.waitFor();
          await waitForCamera(page);
          assert.equal(await panel.locator(".integration-place-row:visible").count(), totalRows);
          await assertSelectionUnchanged(page, beforePanel);
          const panelAudit = d51 ? await inspectD51(page, panel, fixture, "panel") : {};
          await capture(page, report, fixture, "panel", width, height, panelAudit);
          if (fixture === fixtures[1] || fixture === fixtures[3]) {
            await page.locator("#tlTabRoute").click();
            await capture(page, report, fixture, "ringkasan", width, height);
            await page.locator("#tlTabSelected").click();
          }
          const beforePopup = await switchPresentation(page, "#tlReturnToPopup");
          await waitForStation(page, fixture, { realTiles: true });
          await assertSelectionUnchanged(page, beforePopup);
          if (fixture === fixtures[0] || fixture === fixtures[2]) {
            await page.getByRole("button", { name: "Lihat semua" }).click();
            await page.waitForFunction(() => webgisSpatialIntegrations.overviewActive && map.getZoom() <= 16);
            await waitForCamera(page, { realTiles: true });
            for (const marker of await page.locator(".tl-integration-target-marker").all()) {
              await marker.click({ trial: true });
            }
            await capture(page, report, fixture, "lihat-semua", width, height);
            await page.getByRole("button", { name: "Kembali ke popup" }).click();
            await waitForStation(page, fixture);
          }
        } else {
          await page.locator("#tlMobileDetails").click();
          await popup.waitFor({ state: "hidden" });
          await page.locator("#tlTabSelected").click();
          assert.equal(await page.locator("#selectedStopInfo .selected-stop-title:visible").innerText(), title);
          const sheetAudit = d51 ? await inspectD51(page, page.locator("#selectedStopInfo"), fixture, "sheet") : {};
          await capture(page, report, fixture, "sheet", width, height, sheetAudit);
          await page.locator("#tlDetailClose").click();
          await popup.waitFor();
        }
        assert.equal((await readSelection(page)).stop, state.stop);
        if (fixture === fixtures[3]) {
          const active = d51 ? { ...fixture, route: "LRT_JB_CB" } : fixture;
          if (d51) {
            await popup.locator('[data-route-switch="LRT_JB_CB"]').click();
            await waitForStation(page, active);
            assert.equal(new URL(page.url()).searchParams.get("route"), active.route);
            await capture(page, report, active, "lin-cibubur", width, height);
          }
          const next = popup.locator('[data-stop-nav="next"]');
          const nextKey = await next.getAttribute("data-stop-key");
          assert.notEqual(nextKey, fixture.key);
          await next.click();
          await page.locator(`${popupSelector}[data-stop-key="${nextKey}"]`).waitFor();
          await popup.locator(`[data-stop-nav="previous"][data-stop-key="${fixture.key}"]`).click();
          await waitForStation(page, active);
          if (desktop) {
            await page.locator("#basemapButton").click();
            if (baseline) await page.locator('[data-opacity="75"]').click();
            else {
              const slider = page.getByRole("slider", { name: "Kejelasan peta dasar" });
              await slider.fill("75");
              assert.equal(await page.evaluate(() => currentBasemap.options.opacity), 0.75);
              assert.equal(new URL(page.url()).searchParams.get("opacity"), "75");
            }
            await capture(page, report, fixture, "peta-dasar", width, height);
          }
        }
        report.cspErrors.push(...await page.evaluate(() => d5CspViolations));
        assert.deepEqual(pageErrors, []);
      }
    } finally {
      await context.close();
    }
  }
  if (!baseline) {
    assert.deepEqual(report.cspErrors, []);
    assert.deepEqual(report.httpErrors, []);
  }
} finally {
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
