import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { openLayout, chooseRoute } from "./layout-browser.mjs";

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => { await browser?.close(); });

test("PT Sans is the shared app typography token, with no duplicated Google stylesheet", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../css/font-pt-sans.css", import.meta.url), "utf8");
  assert.equal((html.match(/href="css\/font-pt-sans\.css[^\"]*"/g) || []).length, 1);
  assert.equal((html.match(/fonts\.googleapis\.com\/css2/g) || []).length, 0, "self-hosted fonts do not request Google stylesheets");
  assert.ok(css.includes('--app-font-family: "PT Sans", Arial, sans-serif;'));
  assert.ok(!css.includes("!important"), "typography is controlled through the cascade");
  const faces = [...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map(match => match[1]);
  assert.equal(faces.length, 2, "only regular and bold faces");
  assert.deepEqual(faces.map(face => face.match(/font-weight:\s*(\d+)/)?.[1]).sort(), ["400", "700"]);
  assert.ok(faces.every(face => face.includes('format("woff2")')));
  const license = await readFile(new URL("../assets/fonts/OFL.txt", import.meta.url), "utf8");
  assert.ok(license.includes("SIL OPEN FONT LICENSE"));
});

test("real PT Sans regular/bold load once and apply to controls, popups, labels and tour", async t => {
  const app = await openLayout(browser, 390, 844);
  t.after(() => app.context.close());
  const { page } = app;
  // Resource Timing includes requests made during initial app startup too.
  await page.evaluate(async () => {
    await Promise.all([document.fonts.load('400 14px "PT Sans"'), document.fonts.load('700 20px "PT Sans"')]);
    await document.fonts.ready;
  });
  const loaded = await page.evaluate(() => [...document.fonts].filter(face => face.family.replaceAll('"', "") === "PT Sans")
    .map(face => ({ weight: face.weight, status: face.status })));
  assert.deepEqual(loaded.sort((a, b) => a.weight.localeCompare(b.weight)), [
    { weight: "400", status: "loaded" }, { weight: "700", status: "loaded" }
  ]);
  await chooseRoute(page);
  await page.click("#tlDetailExpand");
  await page.locator('#stopList [data-stop-key="BRT002_REG_A"]').click();
  await page.waitForTimeout(900);
  const selectors = ["body", ".tl-header", "#filterPanel", "#statusSelect", "#globalSearchInput", "#globalSearchSubmit",
    "#rightInfoPanel", "#stopList .stop-list-name", "#selectedStopInfo", ".leaflet-popup-content", ".stop-popup-title",
    ".leaflet-popup-close-button", ".route-stop-name-label", ".stop-list-route-badge", ".stop-seq-badge"];
  for (const selector of selectors) {
    const font = await page.locator(selector).first().evaluate(element => getComputedStyle(element).fontFamily);
    assert.equal(font, '"PT Sans", Arial, sans-serif', selector);
  }
  await page.evaluate(() => startProductTour({ manual: true }));
  assert.equal(await page.locator("#productTourCard").evaluate(element => getComputedStyle(element).fontFamily), '"PT Sans", Arial, sans-serif');
  await page.click("#productTourSkip");
  const fontResources = await page.evaluate(() => performance.getEntriesByType("resource").map(entry => entry.name).filter(name => /\/assets\/fonts\/.*\.woff2/.test(name)));
  assert.equal(fontResources.length, 2, "one regular and one bold font request");
  assert.equal(new Set(fontResources).size, 2);
  assert.deepEqual(app.errors, []);
});
