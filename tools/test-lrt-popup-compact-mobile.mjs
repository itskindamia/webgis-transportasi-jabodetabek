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

for (const [width, height] of [[320, 568], [360, 800], [390, 844]]) {
  test(`LRT popup remains readable after scroll at ${width}x${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());
    await page.click("#mobileBottomRouteButton");
    await page.locator('#tlModeChoices [data-mode="LRT"]').click();
    await page.selectOption("#routeSelect", "LRT_JB_BK");
    await page.waitForTimeout(500);
    const key = await page.evaluate(() => {
      const feature = stopData.features.find(item => normalizeMode(item.properties.MODE) === "LRT" && item.properties.STN_CODE === "DKA" && getStopRoutes(item).includes("LRT_JB_BK"));
      if (!feature) throw new Error("DKA station missing from source");
      return getStopKey(feature);
    });
    await page.evaluate(() => {
      webgisLayout.setTab("stops");
      webgisLayout.setDetailExpanded(true);
    });
    await page.locator(`#stopList [data-stop-key="${key}"]`).click();
    await page.waitForSelector(".leaflet-popup .lrt-popup");
    await page.waitForTimeout(350);
    const before = await page.locator(".lrt-popup").evaluate(root => {
      const header = root.querySelector(".lrt-popup-header");
      const scroller = root.querySelector(".lrt-popup-body");
      return {
        title: header.querySelector(".stop-popup-title").textContent.trim(),
        sticky: getComputedStyle(header).position,
        scrollable: scroller.scrollHeight > scroller.clientHeight + 3,
        logoGroups: root.querySelectorAll(".integration-group-header:has(.integration-logo)").length,
        navCount: root.querySelectorAll(".stop-popup-navigation .stop-popup-nav-button").length
      };
    });
    const envelope = await page.locator(".lrt-popup").evaluate(root => {
      const content = root.closest(".leaflet-popup-content");
      const nav = root.querySelector(".stop-popup-navigation");
      const services = [...root.querySelectorAll(".lrt-service-button")];
      const maxHeight = Math.min(400, Math.max(240, innerHeight - 160));
      return {
        width: content.getBoundingClientRect().width,
        height: root.getBoundingClientRect().height,
        maxHeight,
        scrollHeight: root.querySelector(".lrt-popup-body").scrollHeight,
        clientHeight: root.querySelector(".lrt-popup-body").clientHeight,
        serviceButtons: services.map(btn => ({
          width: btn.getBoundingClientRect().width,
          height: btn.getBoundingClientRect().height,
          textOverflow: btn.scrollWidth > btn.clientWidth + 2
        })),
        serviceGridColumns: getComputedStyle(root.querySelector(".stop-popup-direct-routes")).gridTemplateColumns.split(" ").length,
        navHeight: nav?.getBoundingClientRect().height ?? 0
      };
    });
    assert.ok(envelope.width <= 310 && envelope.width >= width - 53 || envelope.width > 200 && envelope.width <= 310,
      "popup is narrower than the mobile viewport");
    assert.ok(envelope.height <= envelope.maxHeight + 3, "popup height is capped to preserve map context");
    assert.ok(envelope.scrollHeight > envelope.clientHeight, "long integration data uses the single scroll surface");
    assert.equal(envelope.serviceGridColumns, 2, "both LRT services stay side by side on portrait");
    assert.ok(envelope.serviceButtons.every(button => button.height >= 44 && !button.textOverflow),
      "service buttons remain tappable without clipping");
    assert.ok(envelope.navHeight >= 44, "next/previous navigation remains accessible");
    assert.ok(before.title.length > 5, "station identity remains in markup");
    assert.equal(before.sticky, "sticky", "station header is sticky");
    assert.ok(before.logoGroups > 0, "operator logo assets still appear");
    assert.ok(before.navCount > 0, "adjacent stop navigation remains present");
    await page.locator(".lrt-popup-body").evaluate(el => { el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight); });
    await page.waitForTimeout(120);
    const afterScroll = await page.locator(".lrt-popup").evaluate(root => {
      const header = root.querySelector(".lrt-popup-header").getBoundingClientRect();
      const body = root.querySelector(".lrt-popup-body").getBoundingClientRect();
      const outer = root.getBoundingClientRect();
      const nav = root.querySelector(".stop-popup-navigation")?.getBoundingClientRect();
      const duplicates = [...root.querySelectorAll(".integration-group-header:has(.integration-logo) .integration-operator, .integration-group-header:has(.integration-logo) .integration-operator-name")];
      return {
        headerTop: header.top, bodyTop: body.top, headerBottom: header.bottom,
        bodyBottom: body.bottom, outerBottom: outer.bottom,
        navTop: nav?.top, navBottom: nav?.bottom,
        duplicatesHidden: duplicates.every(node => getComputedStyle(node).display === "none"),
        popupWithinViewport: outer.top >= 0 && outer.bottom <= innerHeight + 1,
        docNoOverflow: document.documentElement.scrollWidth <= innerWidth + 1
      };
    });
    assert.ok(afterScroll.headerTop >= afterScroll.bodyTop - 2, "station header must remain visible when the body scrolls");
    assert.ok(afterScroll.headerBottom <= afterScroll.bodyBottom + 2, "header remains inside popup body");
    assert.ok(afterScroll.navBottom <= afterScroll.outerBottom + 2, "next/previous controls stay within popup");
    assert.equal(afterScroll.duplicatesHidden, true, "logo operator names are not visually repeated");
    assert.equal(afterScroll.popupWithinViewport, true, "popup stays within browser viewport");
    assert.equal(afterScroll.docNoOverflow, true, "no horizontal document overflow");
    assert.deepEqual(errors, [], "no runtime errors");
  });
}
