import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });

async function app(t, width = 1440, height = 900) {
  const result = await openLayout(browser, width, height);
  t.after(async () => {
    await result.context.close();
    assert.deepEqual(result.errors, [], "no runtime page error");
  });
  return result.page;
}
async function cawang(page) {
  await page.click('[data-mode="LRT"]');
  await selectRoute(page, "LRT_JB_BK");
  await page.locator('#stopList [data-stop-key="LRTJB008_01"]').click();
  await page.locator(".leaflet-popup .stop-popup-ui").waitFor();
}

test("D3.5 desktop popup uses compact destination logos and accessible icon-only source/map actions", async t => {
  const page = await app(t);
  await cawang(page);
  const popup = page.locator(".leaflet-popup .stop-popup-ui");
  const destination = popup.locator(".integration-place-row").first();
  await destination.waitFor();
  assert.equal(await destination.locator(".tl-integration-quick-logo img").count(), 1,
    "uses real operator logo in destination row");
  assert.equal(await destination.locator(".integration-place-name").isVisible(), true);
  assert.equal(await popup.locator(".integration-group-header").first().isVisible(), false);
  assert.equal(await popup.locator(".integration-line-badges").first().isVisible(), false);
  const maps = popup.locator(".stop-popup-maps-link");
  const source = popup.locator(".stop-source-summary");
  assert.equal(await maps.getAttribute("aria-label"), "Buka lokasi di Google Maps");
  assert.equal(await source.getAttribute("aria-label"), "Tampilkan sumber data");
  assert.equal(await maps.locator(".stop-popup-external-link-icon").isVisible(), true);
  assert.equal(await source.locator(".stop-source-summary-icon").isVisible(), true);
  assert.equal(await popup.locator(".stop-popup-action-cell .stop-source-summary-copy").isVisible(), false);
  await source.click();
  assert.equal(await popup.locator(".stop-source-card").evaluate(el => el.open), true);
  assert.ok(await popup.locator(".stop-source-body").evaluate(el => el.getBoundingClientRect().width > 160),
    "expanded source information uses available popup width");
  await popup.locator(".tl-show-stop-in-panel").click();
  await page.locator("#selectedStopInfo > .stop-popup-ui").waitFor();
  const panel = page.locator("#selectedStopInfo > .stop-popup-ui");
  assert.equal(await panel.locator(".integration-group-header").first().isVisible(), true,
    "full operator context remains in Panel");
  assert.equal(await panel.locator(".integration-line-badges").first().isVisible(), true,
    "full route badge detail remains in Panel");
  assert.equal(await panel.locator(".stop-source-summary-copy").isVisible(), true,
    "full source details remain readable in Panel");
});

test("D3.5 desktop map utilities launch existing guide and information handlers", async t => {
  const page = await app(t);
  const guide = page.locator("#tlDockGuide");
  const about = page.locator("#tlDockAbout");
  assert.equal(await guide.isVisible(), true);
  assert.equal(await about.isVisible(), true);
  const order = await page.locator("#bottomToolbar").evaluate(dock =>
    ["tlDockGuide", "tlDockAbout", "basemapButton"].map(id =>
      [...dock.children].findIndex(el => el.id === id)));
  assert.ok(order.every(i => i >= 0), "buttons belong to dock");
  assert.deepEqual([...order].sort((a,b)=>a-b), order);
  await about.click();
  await page.locator("#infoModal").waitFor({ state: "visible" });
  await page.locator("#infoModalAccept").click();
  await guide.click();
  await page.locator("#productTour").waitFor({ state: "visible" });
  await page.locator("#productTourSkip").click();
});

test("D3.5 bidirectional route text is presentation-only and mobile popup remains detailed", async t => {
  const page = await app(t);
  await page.click('[data-mode="LRT"]');
  const relation = page.locator('.tl-route-choice[data-route-id="LRT_JB_BK"] .tl-route-choice-relation');
  assert.match(await relation.innerText(), /↔/, "route termini rendered with bidirectional arrow");
  const data = await page.evaluate(() => getRouteById("LRT_JB_BK").properties);
  assert.ok(data && Object.keys(data).length, "original route GeoJSON is unchanged");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator("#tlDockGuide").isVisible(), false);
  assert.equal(await page.locator("#tlDockAbout").isVisible(), false);
});

test("D3.5 long Dukuh Atas popup keeps Panel action visible above navigation", async t => {
  const page = await app(t);
  await page.click('[data-mode="LRT"]');
  await selectRoute(page, "LRT_JB_BK");
  await page.locator('#stopList [data-stop-key="LRTJB001_01"]').click();
  const popup = page.locator(".leaflet-popup .stop-popup-ui");
  await popup.waitFor();
  const panelButton = popup.locator(":scope > .tl-show-stop-in-panel");
  await panelButton.waitFor({ state: "visible" });
  const state = await panelButton.evaluate(button => {
    const rect = button.getBoundingClientRect();
    const root = button.closest(".stop-popup-ui").getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      within: rect.top >= root.top && rect.bottom <= root.bottom,
      clickable: button.contains(hit),
      sourceStop: currentSelectedStopKey,
      activeRoute: currentSelectedRouteId
    };
  });
  assert.equal(state.within, true, "panel action in visible popup area");
  assert.equal(state.clickable, true, "panel action is not covered by navigation");
  assert.equal(state.sourceStop, "LRTJB001_01");
  await panelButton.click();
  await page.locator("#selectedStopInfo > .stop-popup-ui").waitFor();
  assert.equal(await page.evaluate(() => currentSelectedStopKey), state.sourceStop);
  assert.equal(await page.evaluate(() => currentSelectedRouteId), state.activeRoute);
});
