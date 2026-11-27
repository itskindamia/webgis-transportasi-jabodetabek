import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });

async function app(t, width = 1440, height = 900) {
  const view = await openLayout(browser, width, height);
  t.after(async () => {
    await view.context.close();
    assert.deepEqual(view.errors, []);
  });
  return view.page;
}
async function chooseStop(page, route, key, mode) {
  await page.click(`[data-mode="${mode}"]`);
  await selectRoute(page, route);
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await page.waitForFunction(k => currentSelectedStopKey === k, key);
}
const popup = ".leaflet-popup .stop-popup-ui";
const panel = "#selectedStopInfo > .stop-popup-ui";

test("D3.3 Cawang popup is visually quiet but retains operator logos and usable integration", async t => {
  const page = await app(t);
  await chooseStop(page, "LRT_JB_BK", "LRTJB008_01", "LRT");
  await page.locator(popup).waitFor();
  assert.equal(await page.locator(`${popup}[data-visual-comfort="true"]`).count(), 1);
  const styles = await page.evaluate(() => {
    const root = document.querySelector(".leaflet-popup .stop-popup-ui");
    const badges = root.querySelector(".integration-line-badges");
    const groupTitle = root.querySelector(".integration-group-header");
    const operatorLogo = root.querySelector(".integration-row-operator-logo");
    const metadata = root.querySelector(".stop-popup-meta-row > *");
    return {
      badgesHidden: badges && getComputedStyle(badges).display === "none",
      groupTitleHidden: groupTitle && getComputedStyle(groupTitle).display === "none",
      logo: !!operatorLogo && !!operatorLogo.getBoundingClientRect().width,
      metaWeight: getComputedStyle(metadata).fontWeight,
      routes: [...root.querySelectorAll(".stop-popup-route-button")].length,
      destinations: [...root.querySelectorAll(".integration-place-row")].map(el => el.querySelector(".integration-place-name")?.textContent.trim())
    };
  });
  assert.equal(styles.badgesHidden, true);
  assert.equal(styles.groupTitleHidden, true);
  assert.equal(styles.logo, true);
  assert.equal(styles.metaWeight, "400");
  assert.ok(styles.routes >= 2);
  assert.ok(styles.destinations.some(x => /Cawang/i.test(x)));
  const maps = page.locator(`${popup} .stop-popup-maps-link`);
  const source = page.locator(`${popup} .stop-source-summary`);
  assert.equal(await maps.getAttribute("aria-label"), "Buka lokasi di Google Maps");
  assert.equal(await source.getAttribute("aria-label"), "Tampilkan sumber data halte atau stasiun");
  assert.ok(await maps.locator("svg.icon").isVisible());
  assert.ok(await source.locator("svg.icon").isVisible());
  const sourceTextHidden = await source.locator(".stop-source-summary-copy").evaluate(el => getComputedStyle(el).display === "none");
  assert.equal(sourceTextHidden, true);
  const before = await page.evaluate(() => currentSelectedStopKey);
  await page.locator(`${popup} .integration-place-row-button`).first().click();
  await page.waitForFunction(key => currentSelectedStopKey !== key, before);
  assert.notEqual(await page.evaluate(() => currentSelectedStopKey), before);
});

test("D3.3 Dukuh Atas popup shows a concise three-destination summary, preserving every D4 link", async t => {
  const page = await app(t);
  await chooseStop(page, "LRT_JB_BK", "LRTJB001_01", "LRT");
  await page.locator(popup).waitFor();
  const result = await page.evaluate(() => {
    const root = document.querySelector(".leaflet-popup .stop-popup-ui");
    const rows = [...root.querySelectorAll(".integration-place-row")];
    return {
      total: rows.length,
      visible: rows.filter(el => getComputedStyle(el).display !== "none").length,
      hint: root.querySelector(".stop-popup-more-destinations")?.textContent,
      mapped: webgisSpatialIntegrations?.count,
      passengerHidden: (() => { const el = root.querySelector(".stop-popup-activity"); return !el || getComputedStyle(el).display === "none"; })()
    };
  });
  assert.equal(result.total, 5);
  assert.equal(result.visible, 3);
  assert.match(result.hint || "", /2 tujuan lainnya/);
  assert.equal(result.mapped, 4, "D4 retains all four georeferenced destinations");
  assert.equal(result.passengerHidden, true);
});

test("D3.3 selected-stop Panel keeps full operator, badges, and source labels", async t => {
  const page = await app(t);
  await page.click("#basemapButton");
  await page.locator("#tlStopInfoMode").selectOption("panel");
  await page.click("#basemapClose");
  await chooseStop(page, "LRT_JB_BK", "LRTJB001_01", "LRT");
  await page.locator(panel).waitFor();
  const result = await page.evaluate(() => {
    const root = document.querySelector("#selectedStopInfo > .stop-popup-ui");
    const badge = root.querySelector(".integration-line-badges");
    const group = root.querySelector(".integration-group-header");
    const source = root.querySelector(".stop-source-summary-copy");
    const rowLogo = root.querySelector(".integration-row-operator-logo");
    return {
      badgeVisible: !!badge && getComputedStyle(badge).display !== "none",
      groupVisible: !!group && getComputedStyle(group).display !== "none",
      sourceVisible: !!source && getComputedStyle(source).display !== "none",
      rowLogoHidden: !!rowLogo && getComputedStyle(rowLogo).display === "none",
      hasDetails: root.querySelectorAll(".integration-place-row").length >= 4
    };
  });
  assert.deepEqual(result, { badgeVisible: true, groupVisible: true, sourceVisible: true, rowLogoHidden: true, hasDetails: true });
});

test("D3.3 route headings use bidirectional arrow, not data-changing separators", async t => {
  const page = await app(t);
  await page.click('[data-mode="LRT"]');
  await selectRoute(page, "LRT_JB_BK");
  const label = await page.locator('#tlRouteList [data-route-id="LRT_JB_BK"] .tl-route-choice-relation').textContent();
  assert.ok(label.includes("↔"), "UI should display a two-way arrow: " + label);
  const raw = await page.evaluate(() => getRouteRelation(getRouteById("LRT_JB_BK")));
  assert.ok(raw && !raw.includes("↔"), "source relation remains unchanged");
});

test("D3.3 Help and About icons sit next to Peta Dasar and open existing experiences", async t => {
  const page = await app(t);
  const guide = page.locator("#tlDockGuide");
  const info = page.locator("#tlDockAbout");
  assert.ok(await guide.isVisible());
  assert.ok(await info.isVisible());
  assert.equal(await guide.getAttribute("aria-label"), "Cara Menggunakan");
  assert.equal(await info.getAttribute("aria-label"), "Informasi dan Catatan");
  const positions = await page.evaluate(() => ["basemapButton","tlDockGuide","tlDockAbout"].map(id => document.getElementById(id).getBoundingClientRect().x));
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2]);
  await info.click();
  await page.locator("#infoModal").waitFor({ state: "visible" });
  await page.click("#infoModalClose");
  await guide.click();
  await page.locator("#productTour").waitFor({ state: "visible" });
});

test("D3.3 keeps desktop-only controls hidden at tablet and mobile widths", async t => {
  for(const width of [1000, 390]){
    const page = await app(t, width, width === 390 ? 844 : 768);
    assert.equal(await page.locator("#tlDockGuide").isVisible(), false);
    assert.equal(await page.locator("#tlDockAbout").isVisible(), false);
  }
});
