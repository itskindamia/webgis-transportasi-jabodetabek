import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, chooseRoute } from "./layout-browser.mjs";

let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
});
after(async () => { await browser?.close(); });

for (const [width, height] of [[320, 568], [360, 800], [390, 844], [568, 320], [1366, 900]]) {
  test(`mobile network and mini sheet use space efficiently at ${width}x${height}`, async t => {
    const app = await openLayout(browser, width, height);
    t.after(() => app.context.close());
    const { page, errors } = app;
    if (width < 768) {
      await page.click("#mobileBottomRouteButton");
      const result = await page.evaluate(() => {
        const r = selector => document.querySelector(selector).getBoundingClientRect();
        const panel = r("#filterPanel");
        const heading = r(".tl-network .tl-panel-heading");
        const eyebrow = document.querySelector(".tl-network .tl-panel-heading .tl-eyebrow");
        const select = r("#statusSelect");
        const corridor = r("#routeSelect");
        const buttons = [...document.querySelectorAll("#tlModeChoices button")].map(e => e.getBoundingClientRect());
        const footer = r(".tl-network .tl-network-footer");
        return {
          panel: panel.toJSON(), heading: heading.toJSON(),
          eyebrowHidden: getComputedStyle(eyebrow).display === "none",
          statusHeight: select.height, corridorHeight: corridor.height,
          headingTransform: getComputedStyle(document.querySelector(".tl-network .tl-panel-heading h2")).textTransform,
          buttonHeights: buttons.map(b => b.height),
          footer: footer.toJSON(), pageWidth: document.documentElement.scrollWidth
        };
      });
      assert.ok(result.heading.height <= 54, "mobile network heading should be compact");
      assert.equal(result.eyebrowHidden, true, "redundant mobile eyebrow hidden");
      assert.ok(result.statusHeight >= 44 && result.statusHeight <= 46 && result.corridorHeight >= 44 && result.corridorHeight <= 46, "both selectors keep 44px touch targets");
      assert.equal(result.headingTransform, "uppercase", "mobile heading is all caps");
      assert.equal(result.buttonHeights.length, 5);
      assert.ok(result.buttonHeights.every(h => h >= 44), "mode controls keep 44px touch height");
      assert.ok(result.footer.bottom <= result.panel.bottom + 1, "filter footer remains inside panel");
      assert.ok(result.pageWidth <= width + 1, "no horizontal overflow");
      await chooseRoute(page);
      if (height >= 560) {
        await page.click("#tlDetailCollapse");
        await page.waitForTimeout(160);
        const mini = await page.evaluate(() => ({
          height: document.querySelector("#tlDetailPanel").getBoundingClientRect().height,
          subtitleHidden: getComputedStyle(document.querySelector("#tlDetailSubtitle")).display === "none",
          titleVisible: document.querySelector("#tlDetailTitle").getBoundingClientRect().height > 0,
          closeHeight: document.querySelector("#tlDetailClose").getBoundingClientRect().height
        }));
        assert.ok(mini.height >= 90 && mini.height <= 94, "mini height is ~92px");
        assert.equal(mini.subtitleHidden, true, "mini omits redundant subtitle");
        assert.equal(mini.titleVisible, true, "mini keeps route title");
        assert.ok(mini.closeHeight >= 44, "mini close button remains tappable");
      }
    } else {
      const eyebrow = await page.locator(".tl-network .tl-panel-heading .tl-eyebrow").evaluate(el => getComputedStyle(el).display);
      assert.notEqual(eyebrow, "none", "desktop network heading unchanged");
      const [headingTransform, selectHeight] = await page.evaluate(() => [getComputedStyle(document.querySelector(".tl-network .tl-panel-heading h2")).textTransform, document.querySelector("#statusSelect").getBoundingClientRect().height]);
      assert.notEqual(headingTransform, "uppercase", "desktop heading casing unaffected");
      assert.ok(selectHeight >= 44, "desktop select stays at prior height");
    }
    assert.deepEqual(errors, [], "no JavaScript runtime errors");
  });
}
