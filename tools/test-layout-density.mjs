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

for (const [width, height] of [
  [320, 568], [390, 844], [568, 320], [768, 1024],
  [1024, 768], [1366, 900], [1600, 1000]
]) {
  test(`compact density keeps map controls accessible at ${width}x${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());
    const state = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      const header = rect(".tl-header");
      const dock = rect(".tl-dock");
      const search = rect(".tl-search .form-control");
      const caption = rect(".tl-map-caption");
      const buttons = [...document.querySelectorAll(".tl-dock button")]
        .filter(el => getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0)
        .map(el => el.getBoundingClientRect().height);
      return {
        headerHeight: header.height,
        dockHeight: dock.height,
        searchHeight: search.height,
        searchBottom: search.bottom,
        captionTop: caption.top,
        captionVisible: getComputedStyle(document.querySelector(".tl-map-caption")).display !== "none",
        buttons,
        headingMinHeight: getComputedStyle(document.querySelector(".tl-panel-heading")).minHeight,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth
      };
    });
    assert.ok(state.scrollWidth <= state.viewportWidth + 1, "no horizontal page overflow");
    if (width >= 1024) {
      assert.ok(state.headerHeight <= 58, "compact desktop header");
      assert.equal(state.headingMinHeight, "68px", "desktop panel heading density");
    } else if (width >= 768) {
      assert.ok(state.headerHeight <= 60, "compact tablet header");
      assert.equal(state.headingMinHeight, "68px", "tablet panel heading density");
    } else {
      assert.ok(state.headerHeight <= (height <= 559 && width >= 480 ? 50 : 58), "mobile header fits");
      assert.ok(state.dockHeight <= (height <= 559 && width >= 480 ? 50 : 58), "compact bottom nav fits");
      assert.ok(state.searchHeight >= 44 && state.searchHeight <= 46, "search remains comfortable");
      assert.ok(state.buttons.length >= 4, "bottom navigation remains visible");
      assert.ok(state.buttons.every(h => h >= 44), "touch buttons remain at least 44px high");
      if (state.captionVisible && !(height <= 559 && width >= 480)) {
        assert.ok(state.captionTop >= state.searchBottom + 4, "search does not overlap map context badge");
      }
      await chooseRoute(page);
      if (!(height <= 559 && width >= 480)) {
        await page.click("#tlDetailHalf");
        const half = await page.locator("#tlDetailPanel").boundingBox();
        assert.ok(half.height <= 302 && half.height >= 180, "half sheet uses compact height");
        await page.click("#tlDetailCollapse");
        const collapsed = await page.locator("#tlDetailPanel").boundingBox();
        assert.ok(collapsed.height <= 94 && collapsed.height >= 90, "mobile collapsed sheet uses compact 92px height");
      }
    }
    assert.deepEqual(errors, [], "no JavaScript runtime errors");
  });
}
