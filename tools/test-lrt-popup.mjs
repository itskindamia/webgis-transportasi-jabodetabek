import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });

async function app(t, width = 1366, height = 900) {
  const view = await openLayout(browser, width, height);
  t.after(() => view.context.close());
  return view;
}
async function chooseLrt(page, routeId) {
  if (await page.locator("#filterPanel").evaluate(el => el.inert || getComputedStyle(el).display === "none" || getComputedStyle(el).visibility === "hidden")) {
    await page.click("#tlNetworkToggle");
  }
  await page.click('[data-mode="LRT"]');
  await selectRoute(page, routeId);
  await page.waitForTimeout(700);
}
async function selectStation(page, sourceId) {
  const fixture = await page.evaluate(id => {
    const feature = stopData.features.find(item => item.properties.STOP_ID === id);
    if (!feature) throw new Error("Missing source fixture " + id);
    return { key: getStopKey(feature), name: getStopDisplayName(feature), code: feature.properties.STN_CODE,
      operator: feature.properties.OPERATOR, status: getStopStatusLabel(feature), structure: getStructureLabel(feature.properties.STRUCTURE),
      lines: getStopRoutes(feature).filter(id => getRouteMode(getRouteById(id)) === "LRT") };
  }, sourceId);
  await page.evaluate(() => {
    window.webgisLayout.setTab("stops");
    window.webgisLayout.setDetailExpanded(true);
  });
  await page.locator(`#stopList [data-stop-key="${fixture.key}"]`).click();
  await page.waitForTimeout(900);
  await page.waitForSelector(".leaflet-popup .lrt-popup");
  return fixture;
}
async function assertServices(page, fixture) {
  const actual = await page.locator(".lrt-popup .lrt-service-button").evaluateAll(buttons => buttons.map(button => {
    const card = button.closest(".lrt-service-card");
    const image = button.querySelector("img.rail-line-badge-image");
    const fallback = button.querySelector(".rail-line-badge-fallback");
    const badge = button.querySelector(".rail-line-badge-wrap, .rail-line-badge-fallback, .lrt-line-symbol");
    const box = badge?.getBoundingClientRect();
    return {
      id: button.dataset.routeSwitch,
      operator: button.querySelector(".lrt-service-operator")?.textContent.trim(),
      name: button.querySelector(".lrt-service-name")?.textContent.trim(),
      color: getComputedStyle(card).getPropertyValue("--lrt-line-color").trim(),
      symbol: image?.alt.trim() || fallback?.textContent.trim() || button.querySelector(".lrt-line-symbol")?.textContent.trim(),
      imagePath: image?.getAttribute("src") || "",
      imageLoaded: image ? image.complete && image.naturalWidth > 0 &&
        getComputedStyle(image).display !== "none" : false,
      fallbackVisible: fallback ? getComputedStyle(fallback).display !== "none" : false,
      visualSize: box ? { width: box.width, height: box.height } : null,
      disabled: button.disabled
    };
  }));
  assert.deepEqual(actual.map(item => item.id).sort(), [...fixture.lines].sort());
  const expected = await page.evaluate(ids => ids.map(id => {
    const route = getRouteById(id);
    return {
      id, operator: route.properties.OPERATOR, name: route.properties.LINE_NAME,
      color: getRouteColor(id), symbol: LINE_BADGE_TEXT[id],
      imagePath: LINE_BADGE_IMAGES[id] || ""
    };
  }), fixture.lines);
  for (const item of actual) {
    const source = expected.find(source => source.id === item.id);
    assert.ok(source, `unrecognized service ${item.id}`);
    assert.equal(item.operator, source.operator);
    assert.equal(item.name, source.name);
    assert.equal(item.color.toLowerCase(), source.color.toLowerCase());
    assert.equal(item.symbol, source.symbol, "badge maintains the accessible line code");
    assert.ok(item.visualSize?.width > 0 && item.visualSize?.height > 0,
      `visible badge for ${item.id}: ${JSON.stringify(item.visualSize)}`);
    if (source.imagePath) {
      assert.equal(item.imagePath, source.imagePath);
      assert.equal(item.imageLoaded, true, `real badge asset loaded for ${item.id}`);
    } else {
      assert.equal(item.fallbackVisible, true, `text fallback visible for ${item.id}`);
    }
  }
  assert.equal(await page.locator(".lrt-popup").getAttribute("data-lrt-operator"), fixture.operator);
}
async function adjacent(page) {
  return page.evaluate(() => {
    const feature = getStopByKey(currentSelectedStopKey);
    const next = getAdjacentStops(feature, currentSelectedRouteId);
    return { route: currentSelectedRouteId, selected: currentSelectedStopKey, side: getPopupNavigationSide(feature, currentSelectedRouteId),
      previous: next.previous ? getStopKey(next.previous) : null, next: next.next ? getStopKey(next.next) : null };
  });
}
async function assertNavigation(page, expected) {
  for (const side of ["previous", "next"]) {
    const control = page.locator(`.lrt-popup [data-stop-nav="${side}"]`);
    if (expected[side]) {
      assert.equal(await control.getAttribute("data-stop-key"), expected[side]);
      assert.equal(await control.getAttribute("data-route-id"), expected.route);
    } else assert.equal(await control.count(), 0);
  }
}

test("Velodrome popup reads Jakarta operator, code/status/structure, service metadata and preserves links", async t => {
  const { page, errors } = await app(t);
  await chooseLrt(page, "LRT_JKT_S");
  const fixture = await selectStation(page, "LRTJ006");
  assert.equal(await page.locator(".lrt-popup .stop-popup-title").textContent().then(s => s.trim()), fixture.name);
  assert.equal(await page.locator(".lrt-popup .stop-popup-eyebrow").textContent().then(s => s.trim()), "STASIUN LRT");
  assert.ok((await page.locator(".lrt-popup .stop-popup-station-code").innerText()).includes(fixture.code));
  assert.ok((await page.locator(".lrt-popup .stop-popup-meta-row").innerText()).includes(fixture.status));
  assert.ok((await page.locator(".lrt-popup .stop-popup-meta-row").innerText()).includes(fixture.structure));
  await assertServices(page, fixture);
  await assertNavigation(page, await adjacent(page));
  const maps = page.locator('.lrt-popup a[href*="google.com/maps"]');
  assert.equal(await maps.count(), 1);
  assert.ok(await maps.getAttribute("href"));
  await page.locator(".lrt-popup .stop-source-summary").click();
  assert.equal(await page.locator(".lrt-popup .stop-source-card").evaluate(el => el.open), true);
  assert.ok(await page.locator(".lrt-popup .stop-source-body a[href]").count() > 0);
  assert.deepEqual(errors, []);
});

test("single-line Jabodebek popup uses its own operator and source line color", async t => {
  const { page, errors } = await app(t);
  await chooseLrt(page, "LRT_JB_BK");
  const fixture = await selectStation(page, "LRTJB009");
  assert.equal(fixture.lines.length, 1);
  await assertServices(page, fixture);
  // The operator is present in the accessibility markup but intentionally
  // visually hidden by the compact desktop stylesheet.
  assert.equal((await page.locator(".lrt-popup .lrt-service-operator").textContent()).trim(), fixture.operator);
  assert.ok(!(await page.locator(".lrt-popup .lrt-service-operator").textContent()).includes("LRT Jakarta"));
  assert.deepEqual(errors, []);
});

test("shared Cawang retains route-switch handlers and follows the active line for both navigation branches", async t => {
  const { page, errors } = await app(t);
  await chooseLrt(page, "LRT_JB_BK");
  const fixture = await selectStation(page, "LRTJB008");
  await assertServices(page, fixture);
  const bekasi = await adjacent(page);
  await assertNavigation(page, bekasi);
  await page.locator('.lrt-popup [data-route-switch="LRT_JB_CB"]').click();
  await page.waitForTimeout(900);
  const cibubur = await adjacent(page);
  assert.equal(cibubur.selected, fixture.key, "switching lines retains the shared station");
  assert.equal(cibubur.route, "LRT_JB_CB");
  assert.notEqual(cibubur.next, bekasi.next, "next station follows the branch rather than a generic station list");
  await assertNavigation(page, cibubur);
  await page.locator('.lrt-popup [data-stop-nav="next"]').click();
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => currentSelectedStopKey), cibubur.next);
  assert.equal(await page.evaluate(() => currentSelectedRouteId), cibubur.route);
  await page.locator('.lrt-popup [data-stop-nav="previous"]').click();
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => currentSelectedStopKey), fixture.key);
  await page.locator('.lrt-popup [data-route-switch="LRT_JB_BK"]').click();
  await page.waitForTimeout(900);
  await assertNavigation(page, bekasi);
  await page.locator('.lrt-popup [data-stop-nav="next"]').click();
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => currentSelectedStopKey), bekasi.next);
  assert.equal(await page.evaluate(() => currentSelectedRouteId), bekasi.route);
  assert.deepEqual(errors, []);
});

test("LRT integration buttons still navigate to the related source feature", async t => {
  const { page, errors } = await app(t);
  await chooseLrt(page, "LRT_JKT_S");
  await selectStation(page, "LRTJ006");
  const link = page.locator(".lrt-popup .integration-place-row-button[data-integration-stop-key]").first();
  const target = { stop: await link.getAttribute("data-integration-stop-key"), route: await link.getAttribute("data-integration-route-id") };
  assert.ok(target.stop && target.route);
  await link.click();
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => currentSelectedRouteId), target.route);
  assert.equal(await page.evaluate(() => currentSelectedStopKey), target.stop);
  assert.equal(await page.locator("#stopList [aria-current=true]").count(), 1);
  assert.deepEqual(errors, []);
});

test("mobile station search, status filters and guided tour preserve LRT selection and popup scroll", async t => {
  const { page, errors } = await app(t, 390, 568);
  // Dukuh Atas has a genuinely long integration list; Velodrome fits the
  // viewport and cannot demonstrate scroll restoration.
  await chooseLrt(page, "LRT_JB_BK");
  for (const status of ["ALL", "Existing"]) {
    if (await page.locator("#filterPanel").evaluate(el => el.inert || getComputedStyle(el).display === "none")) await page.click("#tlNetworkToggle");
    await page.selectOption("#statusSelect", status);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => statusSelect.value), status);
    assert.ok(await page.evaluate(() => routeLayer.getLayers().length) > 0);
    assert.ok((await page.locator("#routeInfo").textContent()).includes(status === "ALL" ? "Semua Status" : "Eksisting"));
  }
  const source = await page.evaluate(() => {
    const feature = stopData.features.find(item => item.properties.STOP_ID === "LRTJB001");
    return { key: getStopKey(feature), name: getStopDisplayName(feature) };
  });
  if (await page.locator("#mobileFilterClose").isVisible()) await page.click("#mobileFilterClose");
  await page.fill("#globalSearchInput", source.name);
  await page.locator(`#globalSearchResults [data-global-type="transport"][data-stop-key="${source.key}"]`).click();
  await page.waitForSelector(".leaflet-popup .lrt-popup");
  await page.waitForTimeout(900);
  const popupBody = page.locator(".lrt-popup-body");
  const overflow = await popupBody.evaluate(el => el.scrollHeight - el.clientHeight);
  assert.ok(overflow > 1, `Dukuh Atas must genuinely overflow: ${overflow}px`);
  await popupBody.evaluate(el => { el.scrollTop = Math.min(95, el.scrollHeight - el.clientHeight); });
  await page.waitForFunction(() => document.querySelector(".lrt-popup-body").scrollTop > 0);
  const before = await page.evaluate(() => ({ key: currentSelectedStopKey, route: currentSelectedRouteId, url: location.href,
    tab: document.getElementById("tlDetailPanel").dataset.tab, scroll: document.querySelector(".lrt-popup-body").scrollTop }));
  assert.equal(before.key, source.key);
  assert.ok(before.scroll > 0);
  await page.evaluate(() => startProductTour({ manual: true }));
  await page.click("#productTourNext");
  await page.click("#productTourSkip");
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({ key: currentSelectedStopKey, route: currentSelectedRouteId, url: location.href,
    tab: document.getElementById("tlDetailPanel").dataset.tab, scroll: document.querySelector(".lrt-popup-body").scrollTop }));
  assert.deepEqual(after, before);
  assert.equal(await page.locator(".leaflet-popup").isVisible(), true);
  assert.deepEqual(errors, []);
});

test("long previous-station names wrap without truncation on a small phone", async t => {
  const { page, errors } = await app(t, 320, 568);
  await chooseLrt(page, "LRT_JB_BK");
  await selectStation(page, "LRTJB002");
  const expected = await adjacent(page);
  await assertNavigation(page, expected);
  for (const side of ["previous", "next"]) {
    const name = page.locator(`.lrt-popup [data-stop-nav="${side}"] .stop-popup-nav-name`);
    const full = await page.evaluate(key => getStopDisplayName(getStopByKey(key)), expected[side]);
    assert.equal((await name.textContent()).trim(), full);
    assert.equal(await name.evaluate(el => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1), false, "navigation name is not clipped");
    await page.locator(`.lrt-popup [data-stop-nav="${side}"]`).click({ trial: true });
  }
  assert.deepEqual(errors, []);
});

test("LRT presentation renders escaped supplied station names and omits missing station codes", async t => {
  const { page, errors } = await app(t);
  const result = await page.evaluate(() => {
    const source = stopData.features.find(f => f.properties.STOP_ID === "LRTJ006");
    const before = JSON.stringify(source);
    const copy = structuredClone(source);
    copy.properties.DISPLAY_NM = "Nama <uji> & stasiun panjang";
    copy.properties.STN_CODE = null;
    copy.properties.STATUS = "Rencana";
    const html = document.createElement("template"); html.innerHTML = buildStopPopup(copy, "LRT_JKT_S");
    return { name: html.content.querySelector(".stop-popup-title").textContent.trim(), code: Boolean(html.content.querySelector(".stop-popup-station-code")),
      status: html.content.querySelector(".stop-popup-status").textContent.trim(), expectedStatus: getStopStatusLabel(copy),
      injectedTag: Boolean(html.content.querySelector("uji")), unchanged: before === JSON.stringify(source) };
  });
  assert.equal(result.name, "Nama <uji> & stasiun panjang");
  assert.equal(result.code, false);
  assert.equal(result.status, result.expectedStatus);
  assert.equal(result.injectedTag, false);
  assert.equal(result.unchanged, true);
  assert.deepEqual(errors, []);
});

for (const [width, height] of [[320, 568], [360, 800], [390, 844], [768, 1024], [1366, 900], [1600, 1000]]) {
  test(`LRT Jakarta and multi-line Jabodebek popups remain reachable at ${width}x${height}`, async t => {
    const { page, errors } = await app(t, width, height);
    for (const fixture of [{ route: "LRT_JKT_S", stop: "LRTJ006" }, { route: "LRT_JB_BK", stop: "LRTJB001" }]) {
      await chooseLrt(page, fixture.route);
      const source = await selectStation(page, fixture.stop);
      await assertServices(page, source);
      assert.equal(await page.locator(".lrt-popup .stop-popup-title").textContent().then(s => s.trim()), source.name);
      assert.equal(await page.locator(".lrt-popup .stop-popup-title").evaluate(el => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1), false, "station title wraps without clipping");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, "no page overflow");
      const popup = await page.locator(".leaflet-popup").boundingBox();
      assert.ok(popup.x >= 0 && popup.x + popup.width <= width + 1, `popup horizontal bounds ${JSON.stringify(popup)}`);
      assert.ok(popup.y >= 0 && popup.y + popup.height <= height + 1, `popup vertical bounds ${JSON.stringify(popup)}`);
      const overflow = await page.locator(".lrt-popup").evaluate(el => el.scrollWidth > el.clientWidth + 1);
      assert.equal(overflow, false, "long names and multiple line cards wrap");
      await page.locator(".leaflet-popup-close-button").click({ trial: true });
      const nav = page.locator(".lrt-popup .stop-popup-nav-button").first();
      await nav.click({ trial: true });
      await page.locator('.lrt-popup a[href*="google.com/maps"]').scrollIntoViewIfNeeded();
      await page.locator('.lrt-popup a[href*="google.com/maps"]').click({ trial: true });
      for (const label of [".stop-popup-maps-link > span:last-child", ".stop-source-type"]) {
        assert.equal(await page.locator(`.lrt-popup ${label}`).evaluate(el => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1), false, "action labels remain readable without ellipsis or clipping");
      }
      const mapsColor = await page.locator(".lrt-popup .stop-popup-maps-link").evaluate(el => getComputedStyle(el).color);
      if (width >= 1024) {
        assert.notEqual(mapsColor, "rgb(255, 255, 255)", "desktop Maps action uses the neutral D3.1 style");
      } else {
        assert.equal(mapsColor, "rgb(255, 255, 255)", "mobile/tablet retains the existing action style");
      }
      await page.locator(".lrt-popup .stop-source-summary").click();
      assert.equal(await page.locator(".lrt-popup .stop-source-card").evaluate(el => el.open), true);
    }
    assert.deepEqual(errors, []);
  });
}
