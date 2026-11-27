import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

const targets = [
  { name: "cawang", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB008_01", display: "popup" },
  { name: "dukuh-atas", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB001_01", display: "panel" },
  { name: "asean", mode: "BRT", route: "BRT_01", stop: "BRT002_REG_A", display: "popup" }
];
const screens = [[1366,768],[1440,900],[1920,1080]];
const folder = process.env.D4_SCREENSHOT_DIR || "artifacts/d4-integration";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
const report = [];
try {
  for (const [width,height] of screens) {
    for (const sample of targets) {
      const view = await openLayout(browser,width,height);
      try {
        const { page } = view;
        await page.click(`[data-mode="${sample.mode}"]`);
        await selectRoute(page,sample.route);
        await page.locator(`#stopList [data-stop-key="${sample.stop}"]`).click();
        await page.waitForFunction(k => currentSelectedStopKey === k, sample.stop);
        if (sample.display === "panel") {
          await page.click("#basemapButton");
          await page.locator("#tlStopInfoMode").selectOption("panel");
          await page.click("#basemapClose");
          await page.locator('#selectedStopInfo > .stop-popup-ui').waitFor();
        } else {
          await page.locator('.leaflet-popup .stop-popup-ui').waitFor();
        }
        // Selection uses an animated flyTo. Do not snapshot the starting
        // zoom between the selection event and the animation's first frame.
        await page.waitForFunction(() => webgisSpatialIntegrations?.count > 0
          && map.getZoom() === STOP_ZOOM
          && !map._panAnim?._inProgress && !map._animatingZoom);
        await page.waitForTimeout(180);
        // The deterministic browser fixture replaces Esri/OSM tiles with a
        // single test pixel. Hide only that synthetic tile when capturing
        // the UI so visual review is not distorted by its black color.
        await page.addStyleTag({ content: `
          #map.leaflet-container { background: #edf1f3 !important; }
          #map .leaflet-tile-pane { opacity: 0 !important; }
        ` });
        const state = await page.evaluate(() => ({
          stop: currentSelectedStopKey, route: currentSelectedRouteId,
          mapped: webgisSpatialIntegrations.count,
          markerCount: document.querySelectorAll(".tl-integration-target-marker").length,
          popup: Boolean(document.querySelector(".leaflet-popup .stop-popup-ui")),
          panel: Boolean(document.querySelector("#selectedStopInfo > .stop-popup-ui")),
          mapWidth: document.getElementById("map").getBoundingClientRect().width,
          zoom: map.getZoom(), captureTileMode: "neutral test stub, not real Esri tiles"
        }));
        assert.equal(state.stop, sample.stop);
        assert.ok(state.mapped > 0, `${sample.name}: no resolved destination`);
        assert.equal(state.markerCount, state.mapped, `${sample.name}: mapped locations must be visible`);
        assert.equal(state.popup, sample.display === "popup");
        assert.equal(state.panel, sample.display === "panel");
        assert.deepEqual(view.errors, [], `${sample.name}: console error`);
        const file = `${width}x${height}-${sample.name}-${sample.display}.png`;
        await page.screenshot({ path: path.join(folder,file), fullPage: false });
        report.push({ viewport: `${width}x${height}`, scenario: sample.name, file, ...state });
        console.log(JSON.stringify(report.at(-1)));
      } finally {
        await view.context.close();
      }
    }
  }
  await writeFile(path.join(folder,"report.json"), JSON.stringify(report,null,2));
} finally {
  await browser.close();
}
