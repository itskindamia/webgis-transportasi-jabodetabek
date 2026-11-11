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

async function showStation(page, mode, route, stopId) {
  await page.click("#mobileBottomRouteButton");
  await page.locator(`#tlModeChoices [data-mode="${mode}"]`).click();
  await page.selectOption("#routeSelect", route);
  const key = await page.evaluate(id => {
    const feature = stopData.features.find(x => x.properties.STOP_ID === id);
    if (!feature) throw new Error("Missing station fixture " + id);
    return getStopKey(feature);
  }, stopId);
  await page.evaluate(() => {
    webgisLayout.setTab("stops");
    webgisLayout.setDetailExpanded(true);
  });
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await page.waitForSelector(".leaflet-popup .stop-popup");
  return key;
}

const fixtures = [
  { mode: "BRT", route: "BRT_01", stop: "BRT001" },
  { mode: "MRT", route: "MRT_NS", stop: "MRT001" },
  { mode: "KRL", route: "KRL_TP", stop: "KRL005" },
  { mode: "LRT", route: "LRT_JB_BK", stop: "LRTJB001" }
];
for (const viewport of [[320,568],[390,844]]) {
  for (const fixture of fixtures) {
    const [width,height]=viewport;
    test(`shared stop-popup at ${width}x${height} ${fixture.mode}`, async t => {
      const {page,context,errors}=await openLayout(browser,width,height);
      t.after(()=>context.close());
      await showStation(page,fixture.mode,fixture.route,fixture.stop);
      const p=await page.locator(".leaflet-popup").evaluate(popup=>{
        const root=popup.querySelector(".stop-popup");
        const content=popup.querySelector(".leaflet-popup-content");
        const scrolling=root.classList.contains("lrt-popup")
          ?root.querySelector(".lrt-popup-body")
          :root.querySelector(".stop-popup-scroll");
        const nav=root.querySelector(".stop-popup-navigation");
        const r=root.getBoundingClientRect();
        const outer=popup.getBoundingClientRect();
        return {
          width:content.getBoundingClientRect().width,
          height:r.height,
          isLrt:root.classList.contains("lrt-popup"),
          mode:document.getElementById("modeSelect").value,
          navOutside:!!nav && nav.parentElement===root,
          navMinHeight: nav?.querySelector(".stop-popup-nav-button")?.getBoundingClientRect().height||0,
          overflow:getComputedStyle(scrolling).overflowY,
          docWidth:document.documentElement.scrollWidth,
          outerX:outer.left,outerRight:outer.right,
          outerTop:outer.top,outerBottom:outer.bottom,
          title:root.querySelector(".stop-popup-title")?.textContent.trim(),
          active:root.querySelector(".stop-popup-direct-routes .stop-popup-route-button.is-active")?.dataset.routeSwitch
        };
      });
      assert.ok(p.width <= Math.min(308,width-52)+1,`width: ${p.width}`);
      assert.ok(p.height <= 401,`height: ${p.height}`);
      assert.ok(p.title && p.title.length>2);
      assert.equal(p.mode,fixture.mode);
      assert.equal(p.navOutside,true);
      assert.ok(p.navMinHeight>=44,`nav target: ${p.navMinHeight}`);
      assert.equal(p.overflow,"auto","only the internal body scrolls");
      assert.equal(p.docWidth,width,"no document-wide overflow");
      assert.ok(p.outerX>=-1 && p.outerRight<=width+1,"popup remains horizontally in viewport");
      assert.ok(p.outerTop>=-1 && p.outerBottom<=height+1,"popup remains vertically in viewport");
      assert.equal(p.active,fixture.route,"selected route badge is preserved");
      assert.deepEqual(errors,[]);
    });
  }
}

test("LRT service switching keeps line highlight and original navigation links",async t=>{
  const {page,context,errors}=await openLayout(browser,390,844);
  t.after(()=>context.close());
  const key=await showStation(page,"LRT","LRT_JB_BK","LRTJB001");
  await page.locator('.lrt-popup [data-route-switch="LRT_JB_CB"]').click();
  await page.waitForFunction(()=>document.querySelector(".lrt-popup .lrt-service-button.is-active")?.dataset.routeSwitch==="LRT_JB_CB");
  assert.equal(await page.locator(".lrt-popup .lrt-service-button.is-active").getAttribute("data-route-switch"),"LRT_JB_CB");
  assert.equal(await page.locator(".lrt-popup").getAttribute("data-stop-key"),key);
  assert.ok(await page.locator(".lrt-popup .stop-popup-navigation .stop-popup-nav-button").count()>0);
  assert.deepEqual(errors,[]);
});
