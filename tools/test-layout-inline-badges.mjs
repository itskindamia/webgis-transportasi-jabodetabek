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

for (const [width, height] of [[320, 568], [390, 844], [568, 320], [1366, 900]]) {
  test(`paired station status and role badges are aligned at ${width}x${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());
    if (width < 768) await page.click("#mobileBottomRouteButton");
    await page.selectOption("#statusSelect", "ALL");
    await page.click('#tlModeChoices [data-mode="MRT"]');
    await page.selectOption("#routeSelect", "MRT_NS");
    await page.waitForTimeout(750);
    const result = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("#stopList .stop-list-item.is-complex-row")];
      const sample = rows.find(row =>
        row.querySelector(".stop-status-badge") &&
        row.querySelector(".stop-role") &&
        row.querySelector(".stop-list-badges-left") &&
        row.querySelector(".stop-list-badges-right")
      );
      if (!sample) return { found: false, total: rows.length, activeMode: document.querySelector("#modeSelect").value, activeStatus: document.querySelector("#statusSelect").value, activeRoute: document.querySelector("#routeSelect").value, examples: rows.slice(0, 8).map(row => ({ text: row.textContent.trim().replace(/\\s+/g, " ").slice(0,160), hasStatus: !!row.querySelector(".stop-status-badge"), hasRole: !!row.querySelector(".stop-role"), html: row.querySelector(".stop-list-badges")?.outerHTML.slice(0,350) })) };
      const status = sample.querySelector(".stop-status-badge").getBoundingClientRect();
      const role = sample.querySelector(".stop-role").getBoundingClientRect();
      const meta = sample.querySelector(".stop-list-badges");
      const metaRect = meta.getBoundingClientRect();
      const rowRect = sample.getBoundingClientRect();
      return {
        found: true,
        status: sample.querySelector(".stop-status-badge").textContent.trim(),
        role: sample.querySelector(".stop-role").textContent.trim(),
        topDifference: Math.abs(status.top - role.top),
        metaMaxWidth: getComputedStyle(meta).maxWidth,
        metaWidth: metaRect.width,
        rowWidth: rowRect.width,
        badgeRight: Math.max(status.right, role.right),
        rowRight: rowRect.right,
        pageWidth: document.documentElement.scrollWidth
      };
    });
    assert.equal(result.found, true, `MRT north-south provides a paired status + role row: ${JSON.stringify(result)}`);
    assert.ok(result.pageWidth <= width + 1, "no horizontal viewport overflow");
    if (width < 768) {
      assert.ok(result.topDifference <= 2, `status and role must share a line, got ${result.topDifference}`);
      assert.ok(result.badgeRight <= result.rowRight + 1, "badge pair stays inside its list item");
      assert.ok(result.metaWidth > 72, "mobile metadata is not constrained to the old 72px column");
    } else {
      assert.equal(result.metaMaxWidth, "72px", "desktop list badge width is unchanged");
    }
    assert.deepEqual(errors, [], "no JavaScript runtime errors");
  });
}
