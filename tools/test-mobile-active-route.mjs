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

async function openStopOnRoute(page, mode, routeId, stopId) {
  await page.click("#mobileBottomRouteButton");
  await page.locator(`#tlModeChoices [data-mode="${mode}"]`).click();
  await page.selectOption("#routeSelect", routeId);
  const key = await page.evaluate(id => {
    const stop = stopData.features.find(feature => feature.properties.STOP_ID === id);
    if (!stop) throw new Error("Missing stop ID " + id);
    return getStopKey(stop);
  }, stopId);
  await page.evaluate(() => {
    webgisLayout.setTab("stops");
    webgisLayout.setDetailExpanded(true);
  });
  await page.locator(`#stopList [data-stop-key="${key}"]`).click();
  await page.waitForSelector(".leaflet-popup .stop-popup");
}

for (const [width,height] of [[320,568],[390,844]]) {
  test(`LRT active card follows selected service at ${width}x${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());
    await openStopOnRoute(page,"LRT","LRT_JB_BK","LRTJB001");
    const take = () => page.locator(".lrt-popup .lrt-service-button").evaluateAll(nodes => nodes.map(el => ({
      id: el.dataset.routeSwitch,
      active: el.classList.contains("is-active"),
      border: getComputedStyle(el).borderTopWidth,
      color: getComputedStyle(el).borderTopColor,
      background: getComputedStyle(el).backgroundColor,
      foreground: getComputedStyle(el.querySelector(".lrt-service-name")).color,
      disabled: el.disabled,
      lineColor: getComputedStyle(el.closest(".lrt-service-card")).getPropertyValue("--lrt-line-color").trim()
    })));
    let cards=await take();
    assert.equal(cards.length,2);
    assert.equal(cards.find(x=>x.active)?.id,"LRT_JB_BK");
    assert.equal(cards.find(x=>x.active)?.border,"2px","active line receives stronger border");
    assert.equal(cards.find(x=>x.active)?.disabled,true);
    assert.equal(cards.find(x=>!x.active)?.disabled,false);
    assert.notEqual(cards[0].background,cards[1].background,"active card background is distinct");
    await page.locator('.lrt-popup [data-route-switch="LRT_JB_CB"]').click();
    await page.waitForFunction(() => window.currentSelectedRouteId === "LRT_JB_CB" || document.querySelector(".lrt-popup .lrt-service-button.is-active")?.dataset.routeSwitch === "LRT_JB_CB");
    await page.waitForSelector(".lrt-popup .lrt-service-button.is-active");
    cards=await take();
    assert.equal(cards.find(x=>x.active)?.id,"LRT_JB_CB","highlight follows switched route");
    assert.equal(cards.find(x=>x.active)?.border,"2px");
    assert.equal(cards.find(x=>x.active)?.disabled,true);
    assert.deepEqual(errors,[]);
  });
}

test("BRT active route receives a selection highlight without changing badge status", async t => {
  const { page,context,errors } = await openLayout(browser,390,844);
  t.after(() => context.close());
  await openStopOnRoute(page,"BRT","BRT_01","BRT001");
  const val=await page.locator(".stop-popup-direct-routes .stop-popup-route-button.is-active").first().evaluate(el => {
    const wrap=el.closest(".stop-popup-route-option");
    return {id:el.dataset.routeSwitch,outline:getComputedStyle(wrap).outlineWidth,background:getComputedStyle(wrap).backgroundColor,ariaLabel:el.getAttribute("aria-label")};
  });
  assert.equal(val.id,"BRT_01");
  assert.equal(val.outline,"2px");
  assert.match(val.ariaLabel,/Rute aktif/);
  assert.deepEqual(errors,[]);
});
