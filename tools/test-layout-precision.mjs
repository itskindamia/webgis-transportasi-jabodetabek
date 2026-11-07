import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { chromium } from "playwright";
import { openLayout } from "./layout-browser.mjs";

// Cross-network visual layout checks. Test data and route semantics remain unchanged.
// Routes intentionally cover BRT, MRT, both LRT operators and KRL.
const scenarios = [
  { label: "Semua Layanan", mode: "ALL", route: "ALL", status: "Existing" },
  { label: "BRT Koridor 8", mode: "BRT", route: "BRT_08", status: "Existing" },
  { label: "BRT rencana Koridor 16", mode: "BRT", route: "BRT_16", status: "Planned" },
  { label: "MRT Jakarta", mode: "MRT", route: "MRT_NS", status: "Existing" },
  { label: "LRT Jakarta", mode: "LRT", route: "LRT_JKT_S", status: "Existing" },
  { label: "LRT Jabodebek Bekasi", mode: "LRT", route: "LRT_JB_BK", status: "Existing" },
  { label: "LRT Jabodebek Cibubur", mode: "LRT", route: "LRT_JB_CB", status: "Existing" },
  { label: "KRL Rangkasbitung", mode: "KRL", route: "KRL_RK", status: "Existing" }
];

let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
});
after(async () => { await browser?.close(); });

async function chooseNetwork(page, { mode, route, status }) {
  const panel = page.locator("#filterPanel");
  if (await panel.evaluate(el => el.inert || getComputedStyle(el).display === "none")) {
    await page.click("#tlNetworkToggle");
  }
  await page.locator(`#tlModeChoices [data-mode="${mode}"]`).click();
  await page.selectOption("#statusSelect", status);
  await page.selectOption("#routeSelect", route);
  await page.waitForFunction(expected => {
    const selected = String(currentSelectedRouteId || "ALL");
    return selected === expected && map.getSize().x > 0 && map.getSize().y > 0;
  }, route);

  // Planned BRT corridors deliberately show an informational dialog.
  // Dismiss it using the same visible UI as an actual visitor before
  // switching to the next network. Otherwise the dialog intercepts taps.
  if (route === "BRT_16") {
    await page.locator("#routePlanIntro").waitFor({ state: "visible", timeout: 5000 });
    await page.click("#routePlanIntroDismiss");
    await page.locator("#routePlanIntro").waitFor({ state: "hidden" });
  }
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function readPrecision(page) {
  return page.evaluate(() => {
    const elem = selector => document.querySelector(selector);
    const rect = selector => elem(selector).getBoundingClientRect();
    const insideLeft = selector => rect(selector).left +
      (parseFloat(getComputedStyle(elem(selector)).paddingLeft) || 0);
    const mapRect = rect("#map");
    const detailRect = rect(".tl-detail-panel");
    const detailVisible = getComputedStyle(elem(".tl-detail-panel")).display !== "none" &&
      detailRect.width > 0;
    const bounds = routeLayer?.getBounds();
    const mapCaption = rect(".tl-map-caption");
    const mapActions = rect(".tl-map-actions");
    return {
      mode: elem("#modeSelect").value,
      route: String(currentSelectedRouteId || "ALL"),
      status: elem("#statusSelect").value,
      searchLeft: rect(".tl-search").left,
      searchRight: rect(".tl-search").right,
      brandRight: rect(".tl-brand").right,
      headerActionsLeft: rect(".tl-header-actions").left,
      mapCaptionLeft: mapCaption.left,
      mapCaptionRight: mapCaption.right,
      mapActionsLeft: mapActions.left,
      detailVisible,
      detailHeadingLeft: insideLeft(".tl-detail-heading"),
      detailTabsLeft: insideLeft(".tl-detail-tabs"),
      detailContentLeft: insideLeft(".tl-route-content"),
      detailRight: detailRect.right,
      hasRouteGeometry: Boolean(bounds?.isValid()),
      mapSize: [map.getSize().x, map.getSize().y],
      containerSize: [mapRect.width, mapRect.height],
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      mapTitle: elem("#tlMapContext").getAttribute("title"),
      mapText: elem("#tlMapContext").textContent.trim()
    };
  });
}

for (const [width, height] of [
  [1366, 900], [1600, 1000], [768, 1024], [390, 844]
]) {
  test(`alignment and map controls across all network modes at ${width}x${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());

    for (const scenario of scenarios) {
      await t.test(scenario.label, async () => {
        await chooseNetwork(page, scenario);
        const state = await readPrecision(page);
        const details = `${scenario.label} at ${width}x${height}`;
        assert.equal(state.mode, scenario.mode, details + ": mode");
        assert.equal(state.route, scenario.route, details + ": route");
        assert.equal(state.status, scenario.status, details + ": status");
        assert.ok(state.hasRouteGeometry, details + ": rendered geometry");
        assert.ok(state.documentWidth <= state.viewportWidth + 1,
          details + ": no horizontal overflow");
        assert.ok(Math.abs(state.mapSize[0] - state.containerSize[0]) <= 2,
          details + ": Leaflet width matches container");
        assert.ok(Math.abs(state.mapSize[1] - state.containerSize[1]) <= 2,
          details + ": Leaflet height matches container");
        assert.equal(state.mapTitle, state.mapText, details + ": full route label is accessible");

        if (width >= 1024) {
          // The complete desktop brand now occupies a wider first header
          // column; enforce non-overlap rather than an obsolete x-alignment
          // between the search bar and the map's 20px context inset.
          assert.ok(state.brandRight + 8 <= state.searchLeft,
            details + ": brand and Search do not overlap");
          assert.ok(state.searchRight + 8 <= state.headerActionsLeft,
            details + ": Search and header actions do not overlap");
          assert.ok(state.mapCaptionRight + 8 <= state.mapActionsLeft,
            details + ": context badge does not overlap map controls");
          if (state.detailVisible) {
            assert.ok(Math.abs(state.detailHeadingLeft - state.detailTabsLeft) <= 2,
              details + ": detail heading and tabs align");
            assert.ok(Math.abs(state.detailHeadingLeft - state.detailContentLeft) <= 2,
              details + ": detail heading and body align");
            assert.ok(state.detailRight <= width + 1, details + ": detail panel fits viewport");
          }
        }
      });
    }
    assert.deepEqual(errors, [], "no browser errors across all networks");
  });
}
