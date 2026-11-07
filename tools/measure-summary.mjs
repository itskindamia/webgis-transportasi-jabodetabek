// Measure actual layout density without changing transport state or source data.
import { chromium } from "playwright";
import { openLayout, chooseRoute } from "./layout-browser.mjs";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
const measurements = [];
try {
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1366, 900], [568, 320]]) {
    const { page, context, errors } = await openLayout(browser, width, height);
    try {
      await chooseRoute(page, "BRT_03");
      await page.evaluate(() => { webgisLayout.showPopupDetails(); webgisLayout.setTab("route"); });
      await page.waitForTimeout(220);
      measurements.push(await page.evaluate(() => {
        const route = document.getElementById("routeInfo");
        const measure = selector => [...route.querySelectorAll(selector)].map(el => ({
          text: el.textContent.replace(/\s+/g, " ").trim(), height: el.getBoundingClientRect().height,
          width: el.getBoundingClientRect().width, fontSize: getComputedStyle(el).fontSize,
          clipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
        }));
        return { viewport: [innerWidth, innerHeight], documentWidth: document.documentElement.scrollWidth,
          routeHeight: route.getBoundingClientRect().height, contentHeight: document.querySelector(".tl-route-content").clientHeight,
          metadata: measure(".route-primary-meta-item"), stats: measure(".route-summary-grid .route-summary-item"),
          controls: measure(".route-geometry-view-button"), notes: measure(".route-summary-length-note") };
      }));
      if (errors.length) throw new Error(JSON.stringify(errors));
    } finally { await context.close(); }
  }
  console.log(JSON.stringify({ applicationRoot: process.env.LAYOUT_APP_ROOT || "current checkout", browser: await browser.version(), measurements }, null, 2));
} finally { await browser.close(); }
