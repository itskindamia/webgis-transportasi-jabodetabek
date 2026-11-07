import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout } from "./layout-browser.mjs";

let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
});
after(async () => { await browser?.close(); });

for (const [width, height] of [
  [320, 568], [360, 800], [390, 844], [568, 320], [768, 1024], [1366, 900]
]) {
  test(`compact service and status controls at ${width}x${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());
    if (width < 768) await page.click("#mobileBottomRouteButton");
    else if (await page.locator("#filterPanel").evaluate(el => el.inert)) {
      await page.click("#tlNetworkToggle");
    }
    const result = await page.evaluate(() => {
      const rect = el => el.getBoundingClientRect();
      const buttons = [...document.querySelectorAll("#tlModeChoices .tl-mode-button")];
      const status = document.querySelector("#statusSelect");
      const label = document.querySelector('label[for="statusSelect"]');
      const modeRow = document.querySelector("#tlModeChoices");
      const full = document.querySelector(".tl-mode-all-full");
      const short = document.querySelector(".tl-mode-all-compact");
      const box = document.querySelector(".filter-panel-content");
      const statusR = rect(status);
      const labelR = rect(label);
      return {
        buttonRects: buttons.map(x => ({ top: rect(x).top, height: rect(x).height, left: rect(x).left, right: rect(x).right })),
        names: buttons.map(x => x.getAttribute("aria-label")),
        rowRect: { left: rect(modeRow).left, right: rect(modeRow).right },
        contentRect: { left: rect(box).left, right: rect(box).right },
        fullShown: getComputedStyle(full).display !== "none",
        shortShown: getComputedStyle(short).display !== "none",
        statusWidth: statusR.width,
        statusHeight: statusR.height,
        statusCenterY: statusR.y + statusR.height / 2,
        labelCenterY: labelR.y + labelR.height / 2,
        docWidth: document.documentElement.scrollWidth
      };
    });
    assert.ok(result.docWidth <= width + 1, "no horizontal document overflow");
    assert.equal(result.buttonRects.length, 5, "five service modes remain available");
    assert.equal(result.names[0], "Semua layanan", "full accessible service name retained");
    assert.ok(result.buttonRects.every(b => b.left >= result.rowRect.left - 1 && b.right <= result.rowRect.right + 1), "mode controls remain within row");
    if (width < 768) {
      assert.equal(result.shortShown, true, "compact 'Semua' mobile label shown");
      assert.equal(result.fullShown, false, "two-line all-services text hidden");
      assert.ok(result.buttonRects.every(b => Math.abs(b.top - result.buttonRects[0].top) <= 1), "all five modes stay in one row");
      assert.ok(result.buttonRects.every(b => b.height >= 44 && b.height <= 46), "mode touch targets remain 44px");
      assert.ok(result.statusWidth <= 221, "status selector does not span full panel");
      assert.ok(result.statusHeight >= 44 && result.statusHeight <= 46, "status stays tappable");
      assert.ok(Math.abs(result.statusCenterY - result.labelCenterY) <= 2, "status label and selector share row");
    } else {
      assert.equal(result.shortShown, false, "desktop retains full label");
      assert.equal(result.fullShown, true, "full desktop label shown");
    }
    await page.locator('#tlModeChoices [data-mode="BRT"]').click();
    assert.equal(await page.locator("#modeSelect").inputValue(), "BRT", "BRT filter still operates");
    await page.selectOption("#statusSelect", "Planned");
    assert.equal(await page.locator("#statusSelect").inputValue(), "Planned", "status selector still operates");
    assert.deepEqual(errors, [], "no uncaught browser errors");
  });
}
