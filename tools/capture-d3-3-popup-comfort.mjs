import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

const scenarios = [
  { name: "cawang", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB008_01" },
  { name: "dukuh-atas", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB001_01" },
  { name: "asean", mode: "BRT", route: "BRT_01", stop: "BRT002_REG_A" }
];
const widths = [[1366,768],[1440,900],[1920,1080]];
const folder = process.env.D33_SCREENSHOT_DIR || "artifacts/d3-3-popup";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
});
const report = [];
try {
  for (const [width,height] of widths) {
    for (const scenario of scenarios) {
      const view = await openLayout(browser, width, height);
      try {
        const { page } = view;
        await page.locator(`[data-mode="${scenario.mode}"]`).click();
        await selectRoute(page, scenario.route);
        await page.locator(`#stopList [data-stop-key="${scenario.stop}"]`).click();
        await page.waitForFunction(key => currentSelectedStopKey === key &&
          map.getZoom() === STOP_ZOOM && !map._animatingZoom, scenario.stop);
        await page.locator(".leaflet-popup .stop-popup-ui").waitFor();
        // Screenshot only after Leaflet flyTo AND popup auto-pan have finished.
        // Do not mistake an in-flight popup for a static layout overflow.
        await page.waitForFunction(() => {
          const center = map.getCenter();
          const key = [center.lat, center.lng, map.getZoom()].join(",");
          window.__d33Stable = window.__d33Key === key ? (window.__d33Stable || 0) + 1 : 0;
          window.__d33Key = key;
          return window.__d33Stable >= 4 &&
            !map._panAnim?._inProgress && !map._animatingZoom;
        }, null, { polling: 140 });
        await page.addStyleTag({ content: `
          #map.leaflet-container { background: #edf1f3 !important; }
          #map .leaflet-tile-pane { opacity: 0 !important; }
        ` });
        const result = await page.evaluate(() => {
          const popup = document.querySelector(".leaflet-popup .stop-popup-ui");
          const maps = popup?.querySelector(".stop-popup-maps-link");
          const source = popup?.querySelector(".stop-source-summary");
          const panel = popup?.querySelector(".tl-show-stop-in-panel");
          const rect = el => el?.getBoundingClientRect();
          const boxes = [maps, source, panel].map(rect);
          const integrated = [...popup.querySelectorAll(".integration-place-row")].map(el => {
            const name = el.querySelector(".integration-place-name-wrap");
            const badges = el.querySelector(".integration-line-badges:not(:empty)");
            return {
              target: name?.textContent.trim(),
              badges: badges?.textContent.trim(),
              badgesRight: badges ? rect(badges).left + 1 >= rect(name).left : true
            };
          });
          const nav = popup.querySelector(".stop-popup-navigation");
          const title = popup.querySelector(".stop-popup-title");
          const titleRect = rect(title);
          const titleHit = titleRect && document.elementFromPoint(
            titleRect.left + titleRect.width / 2,
            titleRect.top + titleRect.height / 2
          );
          const popupRect = rect(popup);
          const mapRect = rect(document.getElementById("map"));
          return {
            isDesktop: innerWidth >= 1024,
            titleUnobstructed: Boolean(title?.contains(titleHit)),
            popupInsideViewport: popupRect.top >= mapRect.top - 1
              && popupRect.bottom <= mapRect.bottom + 1,
            cssLoaded: Boolean([...document.styleSheets].some(x => x.href?.includes("desktop-popup-comfort.css"))),
            actions: boxes.map(box => box ? {
              width: box.width, height: box.height, top: box.top, left: box.left
            } : null),
            footerVisible: Boolean(rect(nav)?.height),
            integrationCount: integrated.length,
            integrationBadgesRight: integrated.every(x => x.badgesRight),
            sourceExists: Boolean(source),
            panelExists: Boolean(panel),
            horizontalOverflow: popup.scrollWidth > popup.clientWidth + 1
          };
        });
        assert.equal(result.cssLoaded, true);
        assert.ok(result.actions[0]?.width >= 43.99 && result.actions[0]?.height >= 43.99, "Maps icon touch target");
        assert.ok(result.actions[1]?.width >= 43.99 && result.actions[1]?.height >= 43.99, "Source icon touch target");
        assert.ok(result.actions[2]?.height >= 43.99, "Panel action touch target");
        assert.ok(result.integrationCount >= 1);
        assert.ok(result.integrationBadgesRight, "all corridor/line badges remain at row end");
        assert.ok(result.footerVisible);
        assert.equal(result.titleUnobstructed, true, "selected stop title must not hide beneath floating map controls");
        assert.equal(result.popupInsideViewport, true, "popup must stay inside the map viewport");
        assert.equal(result.horizontalOverflow, false);
        assert.deepEqual(view.errors, []);
        const file = `${width}x${height}-${scenario.name}-compact-actions.png`;
        await page.screenshot({ path: path.join(folder,file), fullPage: false });
        report.push({ viewport: `${width}x${height}`, scenario: scenario.name, file, ...result });
        const source = page.locator(".leaflet-popup .stop-source-summary");
        await source.click();
        assert.equal(await page.locator(".leaflet-popup .stop-source-card").evaluate(el => el.open), true);
        const sourceBody = await page.locator(".leaflet-popup .stop-source-body").boundingBox();
        assert.ok(sourceBody?.width >= 185, `expanded source content must remain readable: ${JSON.stringify(sourceBody)}`);
        if (width === 1440 && scenario.name === "dukuh-atas") {
          const sourceFile = `${width}x${height}-${scenario.name}-source-open.png`;
          await page.screenshot({ path: path.join(folder,sourceFile), fullPage: false });
          report.push({ viewport: `${width}x${height}`, scenario: "dukuh-atas-source", file: sourceFile,
            width: sourceBody.width });
        }
        console.log(JSON.stringify(report.at(-1)));
      } finally {
        await view.context.close();
      }
    }
  }
  await writeFile(path.join(folder,"report.json"),JSON.stringify(report,null,2));
} finally {
  await browser.close();
}
