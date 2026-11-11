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

async function openRouteStop(page, mode, routeId, stopId) {
  await page.click("#mobileBottomRouteButton");
  await page.locator(`#tlModeChoices [data-mode="${mode}"]`).click();
  await page.selectOption("#routeSelect", routeId);
  const key = await page.evaluate(id => {
    const feature = stopData.features.find(item => item.properties.STOP_ID === id);
    if (!feature) throw new Error("Stop not found: " + id);
    return getStopKey(feature);
  }, stopId);
  await page.evaluate(() => {
    webgisLayout.setTab("stops");
    webgisLayout.setDetailExpanded(true);
  });
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await page.waitForSelector(".leaflet-popup .stop-popup-ui");
  await page.waitForTimeout(240);
}

for (const [width,height] of [[320,568],[390,844]]) {
  for (const [mode,route,stop] of [
    ["BRT","BRT_01","BRT001"],
    ["MRT","MRT_NS","MRT012"],
    ["KRL","KRL_TP","KRL001"],
    ["LRT","LRT_JB_BK","LRTJB001"]
  ]) {
    test(`Shared mobile popup ${mode} at ${width}x${height}`, async t => {
      const {page,context,errors}=await openLayout(browser,width,height);
      t.after(() => context.close());
      await openRouteStop(page,mode,route,stop);
      const state = await page.locator(".leaflet-popup .stop-popup-ui").evaluate(el => {
        const content=el.closest(".leaflet-popup-content");
        const header=el.querySelector(".stop-popup-ui-header");
        const scroll=el.classList.contains("lrt-popup")
          ?el.querySelector(".lrt-popup-body"):el.querySelector(".stop-popup-scroll");
        const nav=el.querySelector(".stop-popup-navigation");
        const rect=el.getBoundingClientRect(), host=content.getBoundingClientRect();
        return {
          width:host.width,height:rect.height, docWidth:document.documentElement.scrollWidth,
          header:!!header, headerSticky:header?getComputedStyle(header).position:null,
          scroller:!!scroll, scrollOverflow:scroll?getComputedStyle(scroll).overflowY:null,
          scrollHeight:scroll?.scrollHeight, clientHeight:scroll?.clientHeight,
          navigation:!!nav, navInScroll:scroll?.contains(nav),
          route:currentSelectedRouteId,
          title:header?.querySelector(".stop-popup-title")?.textContent.trim()||"",
          active:el.querySelector(".stop-popup-direct-routes .stop-popup-route-button.is-active")?.dataset.routeSwitch,
          closeSize:el.closest(".leaflet-popup")?.querySelector(".leaflet-popup-close-button")?.getBoundingClientRect().height
        };
      });
      assert.ok(state.width <= 309, `width ${state.width} exceeds 308px target`);
      assert.ok(state.height <= 401, `height ${state.height} exceeds 400px target`);
      assert.ok(state.docWidth <= width+1, "page must not overflow horizontally");
      assert.equal(state.header,true);
      assert.equal(state.headerSticky,"sticky");
      assert.equal(state.scroller,true);
      assert.equal(state.scrollOverflow,"auto");
      assert.equal(state.navigation,true);
      assert.equal(state.navInScroll,false,"navigation remains outside scroll surface");
      assert.ok(state.title.length>2);
      assert.equal(state.route,route);
      assert.equal(state.active,route);
      assert.ok(state.closeSize>=40);
      await page.locator(".stop-popup-ui").evaluate(el => {
        const s=el.querySelector(".lrt-popup-body, .stop-popup-scroll");
        s.scrollTop=Math.max(0,s.scrollHeight-s.clientHeight);
      });
      const sticky=await page.locator(".stop-popup-ui").evaluate(el=>{
        const s=el.querySelector(".lrt-popup-body, .stop-popup-scroll").getBoundingClientRect();
        const h=el.querySelector(".stop-popup-ui-header").getBoundingClientRect();
        return h.top>=s.top-2 && h.bottom<=s.bottom+2;
      });
      assert.equal(sticky,true,"title remains inside scrolling panel");
      assert.deepEqual(errors,[]);
    });
  }
}
