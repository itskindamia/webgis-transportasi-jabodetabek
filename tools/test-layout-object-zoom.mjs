import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout } from "./layout-browser.mjs";

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
});
after(async () => { await browser?.close(); });

const routes = [
  { mode: "BRT", route: "BRT_03" },
  { mode: "LRT", route: "LRT_JKT_S" },
  { mode: "KRL", route: "KRL_RK" }
];

async function settleView(page) {
  await page.evaluate(() => { window.objectZoomSettled = { key: "", frames: 0 }; });
  await page.waitForFunction(() => {
    const center = map.getCenter(), size = map.getSize();
    const key = JSON.stringify([center.lat, center.lng, map.getZoom(), size.x, size.y, getRouteFitPadding()]);
    const still = !map._animatingZoom && !map._panAnim?._inProgress && document.getAnimations().every(animation => animation.playState !== "running");
    const state = window.objectZoomSettled;
    state.frames = still && state.key === key ? state.frames + 1 : 0;
    state.key = key;
    return state.frames >= 3;
  }, null, { timeout: 5000 });
  await page.evaluate(() => { delete window.objectZoomSettled; });
}

async function fitState(page) {
  return page.evaluate(() => {
    const bounds = routeLayer.getBounds(), size = map.getSize();
    const { paddingTopLeft: [left, top], paddingBottomRight: [right, bottom] } = getRouteFitPadding();
    const nw = map.latLngToContainerPoint(bounds.getNorthWest());
    const se = map.latLngToContainerPoint(bounds.getSouthEast());
    const width = size.x - left - right, height = size.y - top - bottom;
    return {
      route: currentSelectedRouteId, zoom: map.getZoom(), maxZoom: map.getMaxZoom(),
      left: nw.x, right: se.x, top: nw.y, bottom: se.y,
      available: { left, top, right: size.x - right, bottom: size.y - bottom },
      fill: Math.max((se.x - nw.x) / width, (se.y - nw.y) / height),
      mapSize: [size.x, size.y],
      floatingStylesheet: !!document.querySelector('link[href*="layout-floating.css"]')
    };
  });
}

for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
  test(`the complete object fills the restored map workspace at ${width}x${height}`, async t => {
    const app = await openLayout(browser, width, height);
    t.after(() => app.context.close());
    const { page } = app;
    for (const scenario of routes) {
      await t.test(scenario.route, async () => {
        if (await page.locator("#filterPanel").evaluate(el => el.inert || getComputedStyle(el).display === "none" || getComputedStyle(el).visibility === "hidden")) {
          await page.click("#tlNetworkToggle");
        }
        await page.click(`#tlModeChoices [data-mode="${scenario.mode}"]`);
        await page.selectOption("#routeSelect", scenario.route);
        await page.waitForFunction(route => currentSelectedRouteId === route, scenario.route);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await settleView(page);
        const state = await fitState(page);
        console.log("object-zoom", width, scenario.route, JSON.stringify(state));
        assert.equal(state.floatingStylesheet, false, "the experimental floating layout is not loaded");
        assert.equal(state.route, scenario.route);
        assert.ok(state.left >= state.available.left - 2 && state.right <= state.available.right + 2, "both horizontal endpoints fit: " + JSON.stringify(state));
        assert.ok(state.top >= state.available.top - 2 && state.bottom <= state.available.bottom + 2, "both vertical endpoints fit: " + JSON.stringify(state));
        assert.ok(state.fill >= 0.9 || state.zoom === state.maxZoom, `object fills the available workspace: ${state.fill}`);

        // Recenter must use the same full extent without changing the filter
        // or route, even after the visitor has manually zoomed away.
        const url = page.url();
        await page.evaluate(() => map.setZoom(map.getZoom() + 1, { animate: false }));
        await page.click("#homeButton");
        await page.waitForFunction(zoom => Math.abs(map.getZoom() - zoom) < 0.001 && !map._animatingZoom && !map._panAnim?._inProgress, state.zoom);
        assert.equal((await fitState(page)).route, scenario.route);
        assert.equal(page.url(), url);
      });
    }
    assert.deepEqual(app.errors, []);
  });
}
