import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout } from "./layout-browser.mjs";

const FULL = "PETA JARINGAN TRANSPORTASI JABODETABEK";
const TOP = "PETA JARINGAN";
const BOTTOM = "TRANSPORTASI JABODETABEK";
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
  test(`site brand uses exact uppercase copy and responsive composition at ${width}x${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());
    const result = await page.evaluate(() => {
      const elem = selector => document.querySelector(selector);
      const rect = selector => elem(selector).getBoundingClientRect();
      const desktop = elem(".tl-brand-title-desktop");
      const mobile = elem(".tl-brand-title-mobile");
      const line1 = mobile.querySelector("strong");
      const line2 = mobile.querySelector("small");
      const brand = rect(".tl-brand");
      const search = rect(".tl-search");
      const buttons = rect(".tl-header-actions");
      const header = rect(".tl-header");
      return {
        title: document.title,
        label: elem(".tl-brand").getAttribute("aria-label"),
        desktopText: desktop.textContent.trim(),
        mobileText1: line1.textContent.trim(),
        mobileText2: line2.textContent.trim(),
        desktopShown: getComputedStyle(desktop).display !== "none" && desktop.getBoundingClientRect().width > 0,
        mobileShown: getComputedStyle(mobile).display !== "none" && mobile.getBoundingClientRect().width > 0,
        mobileStacked: rect(".tl-brand-title-mobile small").top >= rect(".tl-brand-title-mobile strong").bottom - 1,
        brandFits: brand.right <= search.left - 4 || innerWidth < 768,
        titleFits: desktop.scrollWidth <= desktop.clientWidth + 1,
        searchFits: search.right <= buttons.left - 4 || innerWidth < 768,
        headerWithinViewport: header.right <= innerWidth + 1,
        documentWidth: document.documentElement.scrollWidth,
        width: innerWidth
      };
    });
    assert.equal(result.title, FULL);
    assert.equal(result.label, FULL);
    assert.equal(result.desktopText, FULL);
    assert.equal(result.mobileText1, TOP);
    assert.equal(result.mobileText2, BOTTOM);
    assert.equal(result.headerWithinViewport, true, "header remains within viewport");
    assert.ok(result.documentWidth <= result.width + 1, "no horizontal document overflow");
    if (width >= 1024) {
      assert.equal(result.desktopShown, true, "one-line desktop title visible");
      assert.equal(result.mobileShown, false, "stacked title hidden on desktop");
      assert.equal(result.titleFits, true, "desktop title fits without clipping");
      assert.equal(result.brandFits, true, "desktop brand and Search do not collide");
      assert.equal(result.searchFits, true, "Search and header actions do not collide");
    } else {
      assert.equal(result.desktopShown, false, "desktop title hidden on mobile/tablet");
      assert.equal(result.mobileShown, true, "stacked mobile title visible");
      assert.equal(result.mobileStacked, true, "second title line remains below first");
      if (width >= 768) {
        assert.equal(result.brandFits, true, "tablet brand does not overlap Search");
        assert.equal(result.searchFits, true, "tablet Search does not overlap actions");
      }
    }
    assert.deepEqual(errors, [], "no runtime errors");
  });
}
