import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

const folder = process.env.D33_OUTPUT_DIR || "artifacts/d3-3-visual-comfort";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
const report = [];
const scenarios = [
  { name: "cawang", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB008_01", style: "popup" },
  { name: "dukuh-atas", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB001_01", style: "popup" },
  { name: "dukuh-atas-panel", mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB001_01", style: "panel" },
  { name: "jembatan-merah", mode: "BRT", route: "BRT_05", stopId: "BRT082", style: "popup" }
];
try {
  for (const [width,height] of [[1366,768],[1440,900]]) {
    for (const scene of scenarios) {
      const view = await openLayout(browser,width,height);
      try {
        const {page}=view;
        await page.addStyleTag({content: "#map.leaflet-container{background:#eef2f5!important}#map .leaflet-tile-pane{opacity:0!important}"});
        if(scene.style==="panel"){
          await page.click("#basemapButton");
          await page.locator("#tlStopInfoMode").selectOption("panel");
          await page.click("#basemapClose");
        }
        await page.click(`[data-mode="${scene.mode}"]`);
        await selectRoute(page,scene.route);
        const key=scene.stopId?await page.evaluate(id=>{
          const stop=stopData.features.find(f=>f.properties.STOP_ID===id && getStopRoutes(f).includes("BRT_05"));
          return stop?getStopKey(stop):null;
        },scene.stopId):scene.stop;
        assert.ok(key,`missing target ${scene.name}`);
        await page.locator(`#stopList [data-stop-key="${key}"]`).click();
        await page.waitForFunction(k=>currentSelectedStopKey===k,key);
        const selector=scene.style==="panel"?"#selectedStopInfo > .stop-popup-ui":".leaflet-popup .stop-popup-ui";
        await page.locator(selector).waitFor();
        await page.waitForFunction(()=>!map._panAnim?._inProgress&&!map._animatingZoom);
        await page.waitForTimeout(140);
        const stats=await page.evaluate(sel=>{
          const root=document.querySelector(sel);
          const r=root?.getBoundingClientRect();
          const area=document.getElementById("map").getBoundingClientRect();
          return {
            title:root?.querySelector(".stop-popup-title")?.textContent.trim(),
            destinations:root?.querySelectorAll(".integration-place-row").length,
            operatorLogos:[...root.querySelectorAll(".integration-row-operator-logo")].filter(el=>getComputedStyle(el).display!=="none").length,
            height:r?.height, width:r?.width,
            withinMap:!r||r.left>=area.left-1&&r.right<=area.right+1&&r.top>=area.top-5&&r.bottom<=area.bottom+5
          };
        },selector);
        if(scene.style==="popup")assert.equal(stats.withinMap,true,`${scene.name}: popup outside viewport`);
        const file=`${width}x${height}-${scene.name}-${scene.style}.png`;
        await page.screenshot({path:path.join(folder,file)});
        report.push({file,scenario:scene.name,display:scene.style,viewport:`${width}x${height}`,...stats});
        assert.deepEqual(view.errors,[]);
        console.log(JSON.stringify(report.at(-1)));
      } finally { await view.context.close(); }
    }
  }
  await writeFile(path.join(folder,"report.json"),JSON.stringify(report,null,2));
} finally { await browser.close(); }
