import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { openLayout, selectRoute } from "./layout-browser.mjs";

const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch({headless:true, ...(exe ? {executablePath:exe} : {})});
const dir = "artifacts/d52-oneway";
await mkdir(dir, {recursive:true});
try {
  for(const [width,height] of [[1440,900],[1280,720],[390,844]]) {
    const {page,context,errors} = await openLayout(browser,width,height);
    try {
      await page.locator('[data-mode="BRT"]').click();
      await selectRoute(page,"BRT_12");
      await page.locator('#stopList [data-stop-key="BRT176_REG"]').waitFor();
      await page.locator("#tlTabStops").click();
      await page.locator('#stopList [data-stop-key="BRT176_REG"]').click();
      await page.waitForFunction(() => currentSelectedStopKey==="BRT176_REG" &&
        stopOneWayArrowMarkers.length>0 && !map._animatingZoom && !map._panAnim?._inProgress);
      await page.evaluate(() => map.setZoom(16,{animate:false}));
      await page.waitForTimeout(350);
      await page.screenshot({path:`${dir}/${width}x${height}-penjaringan-oneway.png`,fullPage:true});
      if(errors.length) throw Error(errors.join("; "));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
