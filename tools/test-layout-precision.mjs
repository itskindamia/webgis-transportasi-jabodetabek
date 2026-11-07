import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { chromium } from "playwright";
import { openLayout, chooseRoute } from "./layout-browser.mjs";

// Layout precision test: only visual geometry of the shell. GeoJSON is untouched.
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
});
after(async () => { await browser?.close(); });

for (const [width, height] of [[1366, 900], [1600, 1000]]) {
  test(`desktop grids share horizontal guides at ${width}x${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());
    await chooseRoute(page, "BRT_08");

    const metrics = await page.evaluate(() => {
      const edge = (selector, side = "left") =>
        document.querySelector(selector)?.getBoundingClientRect()?.[side];
      const mapRect = document.querySelector("#map").getBoundingClientRect();
      const pane = document.querySelector(".tl-detail-panel").getBoundingClientRect();
      const routeBounds = routeLayer?.getBounds();
      const [sw, ne] = routeBounds?.isValid() ? [routeBounds.getSouthWest(), routeBounds.getNorthEast()] : [null, null];
      return {
        searchLeft: edge(".tl-search"),
        mapCaptionLeft: edge(".tl-map-caption"),
        detailHeadingLeft: edge(".tl-detail-heading") + parseFloat(getComputedStyle(document.querySelector(".tl-detail-heading")).paddingLeft),
        detailTabsLeft: edge(".tl-detail-tabs") + parseFloat(getComputedStyle(document.querySelector(".tl-detail-tabs")).paddingLeft),
        detailContentLeft: edge(".tl-route-content") + parseFloat(getComputedStyle(document.querySelector(".tl-route-content")).paddingLeft),
        paneRight: pane.right,
        viewportWidth: innerWidth,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        mapSize: [map.getSize().x, map.getSize().y],
        containerSize: [mapRect.width, mapRect.height],
        bounds: sw && ne ? { south: sw.lat, north: ne.lat, west: sw.lng, east: ne.lng } : null
      };
    });

    assert.ok(!metrics.horizontalOverflow, "no horizontal overflow");
    assert.ok(Math.abs(metrics.searchLeft - metrics.mapCaptionLeft) <= 2,
      `search and map caption align: ${metrics.searchLeft} vs ${metrics.mapCaptionLeft}`);
    assert.ok(Math.abs(metrics.detailHeadingLeft - metrics.detailTabsLeft) <= 2,
      "detail heading and tabs align");
    assert.ok(Math.abs(metrics.detailHeadingLeft - metrics.detailContentLeft) <= 2,
      "detail heading and content align");
    assert.ok(metrics.paneRight <= width + 1);
    assert.ok(Math.abs(metrics.mapSize[0] - metrics.containerSize[0]) <= 2);
    assert.ok(Math.abs(metrics.mapSize[1] - metrics.containerSize[1]) <= 2);
    assert.ok(metrics.bounds && metrics.bounds.south < -6.28 && metrics.bounds.north > -6.17,
      "BRT_08 route geometry still covers Lebak Bulus through Harmoni");
    assert.deepEqual(errors, []);
  });
}
