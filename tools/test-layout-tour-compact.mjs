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
  [320, 568], [360, 800], [390, 844], [568, 320], [1366, 900]
]) {
  test(`short onboarding fits and retains the map at ${width}x${height}`, async t => {
    const app = await openLayout(browser, width, height);
    t.after(() => app.context.close());
    const { page, errors } = app;
    const initial = await page.evaluate(() => ({
      zoom: map.getZoom(),
      center: [map.getCenter().lat, map.getCenter().lng],
      route: currentSelectedRouteId,
      selection: currentSelectedStopKey,
      filterOpen: document.body.classList.contains("mobile-filter-open"),
      detailOpen: document.body.classList.contains("tl-detail-open"),
      sheet: document.getElementById("tlDetailPanel").dataset.sheetPosition,
    }));
    await page.evaluate(() => startProductTour({ manual: true }));

    for (let step = 0; step < 5; step++) {
      await page.waitForTimeout(100);
      const data = await page.evaluate(() => {
        const r = id => document.getElementById(id).getBoundingClientRect();
        const a = r("productTourCard"), b = r("productTourSpotlight");
        const intersection = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        return {
          card: a.toJSON(), focus: b.toJSON(), intersection,
          step: productTourIndex,
          sheet: document.getElementById("tlDetailPanel").dataset.sheetPosition,
          expanded: document.body.classList.contains("tl-detail-expanded"),
          maxScroll: document.getElementById("productTourCard").scrollHeight,
          clientHeight: document.getElementById("productTourCard").clientHeight,
          title: document.getElementById("productTourTitle").textContent.trim()
        };
      });
      assert.equal(data.step, step);
      assert.ok(data.card.left >= 0 && data.card.right <= width + 1, "card horizontally inside viewport");
      assert.ok(data.card.top >= 0 && data.card.bottom <= height + 1, "card vertically inside viewport");
      assert.ok(data.focus.width > 20 && data.focus.height > 20, "spotlight has a target");
      assert.equal(data.intersection, false, "card never blocks its highlighted target");
      if (width < 768) {
        assert.ok(data.card.width <= 337, "mobile cards are narrower");
        assert.ok(data.card.height <= 321, "tour card uses compact height");
        if (step === 1) {
          assert.equal(data.sheet, "half", "guide uses middle sheet position");
          assert.equal(data.expanded, false, "guide does not obscure the map with full sheet");
        }
      }
      await page.click("#productTourNext");
    }
    await page.waitForTimeout(250);
    const final = await page.evaluate(() => ({
      zoom: map.getZoom(),
      center: [map.getCenter().lat, map.getCenter().lng],
      route: currentSelectedRouteId,
      selection: currentSelectedStopKey,
      filterOpen: document.body.classList.contains("mobile-filter-open"),
      detailOpen: document.body.classList.contains("tl-detail-open"),
      sheet: document.getElementById("tlDetailPanel").dataset.sheetPosition,
    }));
    assert.equal(await page.locator("#productTour").isVisible(), false);
    assert.equal(await page.locator("#tlShell").evaluate(x => x.inert), false);
    for (const key of ["zoom", "route", "selection", "filterOpen", "detailOpen", "sheet"]) {
      assert.deepEqual(final[key], initial[key], `${key} is restored`);
    }
    // Leaflet may round to whole pixels when restoring a center; keep within 1px.
    const displacement = await page.evaluate(([a, b]) => {
      return map.project({ lat: a[0], lng: a[1] }).distanceTo(map.project({ lat: b[0], lng: b[1] }));
    }, [initial.center, final.center]);
    assert.ok(displacement <= 1.1, `map center restores within 1px, got ${displacement}`);
    assert.deepEqual(errors, [], "no JavaScript errors");
  });
}
