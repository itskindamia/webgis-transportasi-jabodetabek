import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { openLayout } from "./layout-browser.mjs";
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });
const cases = [["BRT", "BRT_01"], ["BRT", "BRT_03"], ["BRT", "BRT_09"], ["MRT", "MRT_NS"], ["LRT", "LRT_JKT_S"], ["LRT", "LRT_JB_BK"], ["KRL", "KRL_TP"]];
for (const [width, height] of [[1366, 900], [390, 844]]) for (const [mode, id] of cases) {
  test(`summary preserves metadata, controls and accordion state: ${id} at ${width}px`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());
    if (await page.locator("#filterPanel").evaluate(el => el.inert || getComputedStyle(el).display === "none")) await page.click("#tlNetworkToggle");
    await page.click(`[data-mode="${mode}"]`); await page.selectOption("#routeSelect", id); await page.waitForTimeout(850);
    await page.evaluate(() => { webgisLayout.showPopupDetails(); webgisLayout.setTab("route"); });
    const expected = JSON.parse(await readFile("docs/summary-refinement/verification/baseline-summary.json", "utf8"))[id];
    assert.equal(await page.locator("#routeInfo").evaluate(el => el.textContent.replace(/\s+/g, " ").trim()), expected.text, "all source metadata and statistics unchanged");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    for (const button of await page.locator("#routeInfo .route-geometry-view-button").all()) {
      const style = await button.evaluate(el => ({ font: parseFloat(getComputedStyle(el).fontSize), family: getComputedStyle(el).fontFamily, height: el.getBoundingClientRect().height }));
      assert.ok(style.font >= 12 && style.font <= 13 && style.height >= 44 && style.family.includes("PT Sans"));
      assert.equal(await button.evaluate(el => el.classList.contains("is-active")), (await button.getAttribute("aria-pressed")) === "true");
    }
    for (const stat of await page.locator(".route-summary-grid .route-summary-item").all()) {
      assert.equal(await stat.locator("span").evaluate(el => parseFloat(getComputedStyle(el).fontSize)), 12);
      assert.equal(await stat.locator("strong").evaluate(el => parseFloat(getComputedStyle(el).fontSize)), 20);
      assert.equal(await stat.locator("span").evaluate(el => el.scrollWidth > el.clientWidth + 1), false, "statistic labels are readable without ellipsis");
      assert.ok(await stat.evaluate(el => el.scrollHeight <= el.clientHeight + 1), "statistic values fit their card");
    }
    if (await page.locator(".route-summary-length-note").count()) {
      const note = page.locator(".route-summary-length-note");
      assert.ok((await note.innerText()).includes("dua arah"));
      assert.equal(await note.evaluate(el => parseFloat(getComputedStyle(el).fontSize)), 12);
    }
    const read = () => page.evaluate(() => ({ route: currentSelectedRouteId, stop: currentSelectedStopKey, condition: getRouteConditionMode(currentSelectedRouteId), geometry: getRouteGeometryView(currentSelectedRouteId), direction: getActiveRouteDirection(currentSelectedRouteId), url: location.href, center: [map.getCenter().lat, map.getCenter().lng], zoom: map.getZoom() }));
    if (await page.locator('[data-route-geometry-view="DIRECTION"]').count()) { await page.click('[data-route-geometry-view="DIRECTION"]'); await page.waitForTimeout(250); }
    const state = await read();
    for (const selector of [".route-source-card", ".route-alert-card"]) if (await page.locator(selector).count()) {
      const card = page.locator(selector), summary = card.locator("summary");
      await summary.click(); assert.equal(await card.evaluate(el => el.open), true);
      await summary.click(); assert.equal(await card.evaluate(el => el.open), false);
      assert.deepEqual(await read(), state, "accordion preserves route controls, URL, selection and camera");
    }
    if (await page.locator('[data-route-condition="REGULAR"]').count()) {
      await page.click('[data-route-condition="REGULAR"]'); await page.waitForTimeout(150);
      assert.equal(await page.locator('[data-route-condition="REGULAR"]').getAttribute("aria-pressed"), "true");
      await page.click('[data-route-condition="CURRENT"]');
      assert.equal(await page.locator('[data-route-condition="CURRENT"]').getAttribute("aria-pressed"), "true");
    }
    assert.deepEqual(errors, []);
  });
}
