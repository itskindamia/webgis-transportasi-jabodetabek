import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

const out = "artifacts/d35-comfort";
await mkdir(out, {recursive:true});
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
const scenarios = [
  {name:"cawang-lrt",mode:"LRT",route:"LRT_JB_BK",stop:"LRTJB008_01"},
  {name:"dukuh-atas-lrt",mode:"LRT",route:"LRT_JB_BK",stop:"LRTJB001_01"},
  {name:"jembatan-merah-brt",mode:"BRT",route:"BRT_05",stop:"BRT082_REG"}
];
const report=[];
try {
  for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]) {
    for (const scenario of scenarios) {
      const { page, context, errors } = await openLayout(browser,width,height);
      try {
        await page.click(`[data-mode="${scenario.mode}"]`);
        await selectRoute(page,scenario.route);
        const row=page.locator(`#stopList [data-stop-key="${scenario.stop}"]`);
        if(!await row.count()) {
          report.push({scenario:scenario.name,viewport:width+"x"+height,skipped:"stop key absent"});
          continue;
        }
        await row.click();
        await page.locator(".leaflet-popup .stop-popup-ui").waitFor();
        // Leaflet adds the popup with near-zero opacity while fading it in.
        // Wait for a fully visible card rather than capturing the first frame.
        await page.waitForFunction(() => {
          const popup = document.querySelector(".leaflet-popup");
          return popup && Number(getComputedStyle(popup).opacity) > 0.99
            && !map._animatingZoom && !map._panAnim?._inProgress;
        });
        await page.waitForTimeout(150);
        // Browser tests deliberately substitute black 1-pixel map tiles.
        // Render them as a neutral review background, never as a real basemap.
        await page.addStyleTag({content: `
          #map.leaflet-container { background:#edf1f3!important; }
          #map .leaflet-tile-pane { opacity:0!important; }
        `});
        const popupFile=`${width}x${height}-${scenario.name}-popup.png`;
        await page.screenshot({path:path.join(out,popupFile)});
        const open=page.locator(".leaflet-popup .tl-show-stop-in-panel");
        if(await open.isVisible()) {
          await open.click();
          await page.locator("#selectedStopInfo > .stop-popup-ui").waitFor();
          const panelFile=`${width}x${height}-${scenario.name}-panel.png`;
          await page.screenshot({path:path.join(out,panelFile)});
          report.push({scenario:scenario.name,viewport:width+"x"+height,popupFile,panelFile});
        }
        assert.deepEqual(errors,[],"no runtime error");
      } finally {
        await context.close();
      }
    }
  }
  await writeFile(path.join(out,"report.json"),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
