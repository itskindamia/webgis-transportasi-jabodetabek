import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, selectRoute } from "./layout-browser.mjs";

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });

async function app(t, width = 1440, height = 900) {
  const result = await openLayout(browser, width, height);
  t.after(async () => {
    await result.context.close();
    assert.deepEqual(result.errors, [], "no runtime page error");
  });
  return result.page;
}
async function cawang(page) {
  await page.click('[data-mode="LRT"]');
  await selectRoute(page, "LRT_JB_BK");
  await page.locator('#stopList [data-stop-key="LRTJB008_01"]').click();
  await page.locator(".leaflet-popup .stop-popup-ui").waitFor();
}

test("D3.5 desktop popup preserves operator groups and route badges with accessible icon-only actions", async t => {
  const page = await app(t);
  await cawang(page);
  const popup = page.locator(".leaflet-popup .stop-popup-ui");
  const destination = popup.locator(".integration-place-row").first();
  await destination.waitFor();
  const group = popup.locator(".integration-group").first();
  const heading = group.locator(".integration-group-header");
  assert.match(await heading.locator(".integration-operator").innerText(), /TransJakarta/i);
  assert.equal(await heading.locator(".integration-logo").getAttribute("src"), "assets/logos/transjakarta.svg");
  await page.waitForFunction(() => {
    const logo = document.querySelector(".leaflet-popup .integration-group-header .integration-logo");
    return logo?.complete && logo.naturalWidth > 0;
  });
  assert.equal(await destination.locator(".integration-place-name").isVisible(), true);
  assert.equal(await heading.isVisible(), true);
  assert.deepEqual(await destination.locator(".tj-route-code").allTextContents(), ["7", "9"]);
  const positions = await destination.evaluate(row => {
    const rect = selector => row.querySelector(selector).getBoundingClientRect();
    return rect(".integration-place-name").right <= rect(".integration-line-badges").left &&
      rect(".integration-line-badges").right <= rect(".integration-place-link-arrow").left;
  });
  assert.equal(positions, true, "the name, corridor badges and navigation arrow keep their order");
  await destination.click({ trial: true });
  const maps = popup.locator(".stop-popup-maps-link");
  const source = popup.locator(".stop-source-summary");
  assert.equal(await maps.getAttribute("aria-label"), "Buka lokasi di Google Maps");
  const location = new URL(await maps.getAttribute("href"));
  const expectedCoordinates = await page.evaluate(() => getStopByKey(currentSelectedStopKey).geometry.coordinates.toReversed().join(","));
  assert.equal(location.origin, "https://www.google.com");
  assert.equal(location.searchParams.get("query"), expectedCoordinates);
  assert.equal(await maps.getAttribute("target"), "_blank");
  assert.equal(await source.getAttribute("aria-label"), "Sumber Data");
  assert.equal(await maps.locator(".tl-quick-action-svg").isVisible(), true);
  assert.equal(await maps.locator(".tl-maps-external-indicator").isVisible(), false);
  await page.context().route(location.href, request => request.fulfill({ body: "Google Maps" }));
  const [external] = await Promise.all([page.context().waitForEvent("page"), maps.click()]);
  await external.waitForURL(location.href);
  await external.close();
  assert.equal(await source.locator(".stop-source-summary-icon").isVisible(), true);
  assert.equal(await popup.locator(".stop-popup-action-cell .stop-source-summary-copy").isVisible(), false);
  await source.click();
  assert.equal(await popup.locator(".stop-source-card").evaluate(el => el.open), true);
  assert.ok(await popup.locator(".stop-source-body").evaluate(el => el.getBoundingClientRect().width > 160),
    "expanded source information uses available popup width");
  await popup.locator(".tl-show-stop-in-panel").click();
  await page.locator("#selectedStopInfo > .stop-popup-ui").waitFor();
  const panel = page.locator("#selectedStopInfo > .stop-popup-ui");
  assert.equal(await panel.locator(".integration-group-header").first().isVisible(), true,
    "full operator context remains in Panel");
  assert.equal(await panel.locator(".integration-line-badges").first().isVisible(), true,
    "full route badge detail remains in Panel");
  assert.equal(await panel.locator(".stop-source-summary-copy").isVisible(), true,
    "full source details remain readable in Panel");
  assert.equal(await panel.locator(".tl-maps-external-indicator").isVisible(), true);
});

test("D3.5 desktop map utilities launch existing guide and information handlers", async t => {
  const page = await app(t);
  const guide = page.locator("#tlDockGuide");
  const about = page.locator("#tlDockAbout");
  assert.equal(await guide.isVisible(), true);
  assert.equal(await about.isVisible(), true);
  const order = await page.locator("#bottomToolbar").evaluate(dock =>
    ["tlDockGuide", "tlDockAbout", "basemapButton"].map(id =>
      [...dock.children].findIndex(el => el.id === id)));
  assert.ok(order.every(i => i >= 0), "buttons belong to dock");
  assert.deepEqual([...order].sort((a,b)=>a-b), order);
  await about.press("Enter");
  await page.locator("#infoModal").waitFor({ state: "visible" });
  await page.locator("#infoModalAccept").click();
  assert.ok(await about.evaluate(el => document.activeElement === el));
  await guide.press("Enter");
  await page.locator("#productTour").waitFor({ state: "visible" });
  await page.locator("#productTourSkip").click();
  await page.waitForFunction(() => document.activeElement?.id === "tlDockGuide");
});

test("D3.5 bidirectional route text is presentation-only and mobile popup remains detailed", async t => {
  const page = await app(t);
  await page.click('[data-mode="MRT"]');
  const mrt = page.locator('.tl-route-choice[data-route-id="MRT_NS"]');
  const line = await page.evaluate(() => getRouteHeadingParts(getRouteById("MRT_NS")).lineName);
  assert.equal(await mrt.locator("strong").innerText(), line, "the line name keeps its original spelling");
  assert.match(await mrt.locator(".tl-route-choice-relation").innerText(), /↔/);
  await page.click('[data-mode="LRT"]');
  const relation = page.locator('.tl-route-choice[data-route-id="LRT_JB_BK"] .tl-route-choice-relation');
  const canonical = await page.evaluate(() => getRouteHeadingParts(getRouteById("LRT_JB_BK")).relation);
  assert.match(canonical, /\s[-–]\s/, "the original route termini keep their separator");
  assert.equal(await relation.innerText(), canonical.replace(/\s+[-–]\s+/g, " ↔ "));
  await selectRoute(page, "LRT_JB_BK");
  await page.locator('#stopList [data-stop-key="LRTJB001_01"]').click();
  await page.locator(".leaflet-popup .stop-popup-ui").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.getElementById("tlMapContext").textContent === routeSelect.selectedOptions[0].text);
  const popup = page.locator(".leaflet-popup .stop-popup-ui");
  assert.equal(await popup.locator(".tl-integration-more-note").isVisible(), false,
    "the desktop-only integration remainder stays hidden on mobile");
  const rows = popup.locator(".integration-place-row");
  assert.ok(await rows.count() > 3);
  assert.equal(await popup.locator(".integration-place-row:visible").count(), await rows.count(),
    "mobile retains the full integration list");
  assert.equal(await popup.locator(".tl-quick-action-svg").isVisible(), false);
  assert.equal(await popup.locator(".tl-maps-external-indicator").isVisible(), true);
  assert.equal(await page.locator("#tlDockGuide").isVisible(), false);
  assert.equal(await page.locator("#tlDockAbout").isVisible(), false);
  assert.equal(await popup.locator(".tl-show-stop-in-panel").isVisible(), false,
    "the desktop-only panel shortcut remains hidden on mobile");
});

for (const [width, height] of [[1440, 900], [1280, 720]]) {
  test(`D3.5 Dukuh Atas keeps the Panel action and navigation reachable at ${width}×${height}`, async t => {
    const page = await app(t, width, height);
    await page.click('[data-mode="LRT"]');
    await selectRoute(page, "LRT_JB_BK");
    await page.locator('#stopList [data-stop-key="LRTJB001_01"]').click();
    const popup = page.locator(".leaflet-popup .stop-popup-ui");
    await popup.waitFor();
    const panelButton = popup.locator(".stop-popup-action-row > .tl-show-stop-in-panel");
    await panelButton.waitFor({ state: "visible" });
    const popupRows = await popup.locator(".integration-place-row").evaluateAll(rows => ({
      total: rows.length,
      visible: rows.filter(el => getComputedStyle(el).display !== "none").length
    }));
    assert.equal(popupRows.visible, Math.min(3, popupRows.total));
    assert.ok(popupRows.total > 3);
    const remainder = popup.locator(".tl-integration-more-note");
    assert.match(await remainder.innerText(), new RegExp(String(popupRows.total - 3) + " integrasi lainnya"));
    const groups = await popup.locator(".integration-group:visible").evaluateAll(elements => elements.map(group => ({
      operator: group.querySelector(".integration-operator").textContent.trim(),
      rows: [...group.querySelectorAll(".integration-place-row")].filter(row => row.getClientRects().length).length
    })));
    assert.deepEqual(groups.map(group => group.rows), [2, 1], "limit counts destinations and leaves no empty headings");
    assert.match(groups[0].operator, /TransJakarta/i);
    assert.match(groups[1].operator, /KRL/i);
    const state = await panelButton.evaluate(button => {
      const rect = button.getBoundingClientRect();
      const root = button.closest(".stop-popup-ui").getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        within: rect.top >= root.top && rect.bottom <= root.bottom,
        clickable: button.contains(hit),
        sourceStop: currentSelectedStopKey,
        activeRoute: currentSelectedRouteId
      };
    });
    assert.equal(state.within, true, "panel action in visible popup area");
    assert.equal(state.clickable, true, "panel action is not covered by navigation");
    const inline = await popup.evaluate(root => {
      const bar = root.querySelector(".stop-popup-action-row");
      const maps = bar?.querySelector(".stop-popup-maps-link")?.getBoundingClientRect();
      const source = bar?.querySelector(".stop-source-summary")?.getBoundingClientRect();
      const panel = bar?.querySelector(".tl-show-stop-in-panel")?.getBoundingClientRect();
      const sameRow = (a, b) => Boolean(a && b && Math.abs(a.top - b.top) < 2);
      return {
        allPresent: Boolean(maps && source && panel),
        sameRow: sameRow(maps, source) && sameRow(source, panel),
        order: Boolean(maps && source && panel && maps.right < source.left && source.right < panel.left),
        compact: Boolean(panel && panel.height >= 30 && panel.height <= 38),
        sourceCardStillAvailable: Boolean(bar?.querySelector(".stop-source-card"))
      };
    });
    assert.deepEqual(inline, { allPresent: true, sameRow: true, order: true, compact: true, sourceCardStillAvailable: true },
      "Maps, Source and Panel must be compact controls in one horizontal row");
    const bodyFit = await popup.evaluate(root => {
      const body = root.querySelector(".lrt-popup-body");
      const bounds = body.getBoundingClientRect();
      const rows = [...root.querySelectorAll(".integration-place-row")].filter(row => row.getClientRects().length);
      const controls = [...root.querySelectorAll(".stop-popup-maps-link, .stop-source-summary, .tl-show-stop-in-panel")];
      const footer = root.querySelector(".stop-popup-navigation").getBoundingClientRect();
      const toggle = root.querySelector(".tl-show-stop-in-panel").getBoundingClientRect();
      return {
        clipped: [...rows, ...controls].filter(el => el.getBoundingClientRect().bottom > bounds.bottom + 1).length,
        toggleAboveNav: toggle.bottom <= footer.top + 1
      };
    });
    assert.deepEqual(bodyFit, { clipped: 0, toggleAboveNav: true }, "initial quick glance exposes all three destinations and both utility actions");
    const collision = await page.evaluate(() => {
      const popup = document.querySelector(".leaflet-popup .stop-popup-ui")?.getBoundingClientRect();
      const summary = document.querySelector("#map > .tl-integration-map-summary")?.getBoundingClientRect();
      if (!popup || !summary) return { evaluated: false, overlaps: false };
      return {
        evaluated: true,
        overlaps: popup.left < summary.right && popup.right > summary.left &&
          popup.top < summary.bottom && popup.bottom > summary.top
      };
    });
    assert.equal(collision.evaluated, true, "D4 integration summary exists");
    assert.equal(collision.overlaps, false,
      "integration summary must not cover the selected popup");
    assert.equal(state.sourceStop, "LRTJB001_01");
    const view = () => page.evaluate(() => ({ center: map.getCenter(), zoom: map.getZoom(), url: location.href }));
    await page.waitForFunction(() => map.getZoom() === STOP_ZOOM && !map._panAnim?._inProgress && !map._animatingZoom);
    const before = await view();
    assert.equal(await remainder.evaluate(el => el.tabIndex), -1, "overflow count is explanatory text");
    await panelButton.press("Enter");
    await page.locator("#selectedStopInfo > .stop-popup-ui").waitFor();
    const fullCount = await page.locator("#selectedStopInfo .integration-place-row:visible").count();
    assert.equal(fullCount, popupRows.total, "Panel shows every destination");
    assert.equal(await page.evaluate(() => currentSelectedStopKey), state.sourceStop);
    assert.equal(await page.evaluate(() => currentSelectedRouteId), state.activeRoute);
    await page.locator("#selectedStopInfo .stop-popup-nav-button").first().click({ trial: true });
    await page.locator("#tlReturnToPopup").click();
    await popup.waitFor();
    await page.waitForFunction(() => !map._panAnim?._inProgress && map.getSize().x === map.getContainer().clientWidth);
    const after = await view();
    assert.equal(after.zoom, before.zoom);
    assert.equal(after.url, before.url);
    const pixels = await page.evaluate(({ a, b }) => map.project(a).distanceTo(map.project(b)), { a: before.center, b: after.center });
    assert.ok(pixels <= 1, `camera preserved when returning to Popup: ${pixels}px`);
    await popup.locator(".stop-popup-nav-button").first().click({ trial: true });
  });
}

test("D3.5 a station permalink finishes its camera movement when the welcome tour is skipped", async t => {
  const page = await app(t);
  await page.goto(new URL("?mode=LRT&route=LRT_JB_BK&stop=LRTJB001", page.url()).href);
  await page.locator("#infoModalAccept").click();
  await page.locator("#productTourSkip").click();
  await page.waitForFunction(() => {
    const card = document.querySelector('.leaflet-popup .stop-popup-ui[data-stop-key="LRTJB001_01"]');
    if (!card || map.getZoom() !== STOP_ZOOM || map._panAnim?._inProgress) return false;
    const box = card.getBoundingClientRect();
    const available = map.getContainer().getBoundingClientRect();
    return box.top >= available.top && box.bottom <= available.bottom &&
      box.left >= available.left && box.right <= available.right;
  });
  assert.equal(new URL(page.url()).searchParams.get("stop"), "LRTJB001");
  await page.locator(".leaflet-popup .stop-popup-nav-button").click({ trial: true });
});

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`D3.5 Transjakarta badge geometry and contrast at ${width}×${height}`, async t => {
    const page = await app(t, width, height);
    const samples = await page.evaluate(() => {
      const corridors = [...new Set(routeData.features.filter(route => getRouteMode(route) === "BRT").map(getRouteId))];
      const fixtures = [
        ["1A", "#93C3A4"], // Angkutan Pengumpan
        ["3F", "#B39233"], ["10H", "#9C050A"] // Rute BRT tambahan
      ];
      const host = document.createElement("div");
      document.body.append(host);
      const measure = (badge, expected, background, size) => {
        if (size) Object.assign(badge.style, { width: `${size}px`, height: `${size}px` });
        host.append(badge);
        const code = badge.querySelector(".tj-route-code");
        const { x, y, width, height } = badge.getBoundingClientRect();
        const rect = code.getBoundingClientRect();
        const css = getComputedStyle(badge), ink = getComputedStyle(code);
        const color = document.createElement("span");
        color.style.color = background;
        host.append(color);
        const result = {
          label: code.textContent, expected, size: width, circle: width === height && css.borderRadius === "50%",
          fits: rect.left - x >= 2 && x + width - rect.right >= 2 && rect.top - y >= 2 && y + height - rect.bottom >= 2,
          font: parseFloat(ink.fontSize), background: css.backgroundColor,
          expectedBackground: getComputedStyle(color).color, ink: ink.color
        };
        badge.remove();
        color.remove();
        return result;
      };
      const html = markup => {
        const template = document.createElement("template");
        template.innerHTML = markup;
        return template.content.firstElementChild;
      };
      const result = corridors.flatMap(id => [
        measure(html(buildBrtBadge(id)), routeNumberFromId(id), getRouteColor(id), 24),
        measure(html(buildSmallRouteBadge(id)), routeNumberFromId(id), getRouteColor(id))
      ]);
      for (const [label, color] of fixtures) {
        const badge = html(buildBrtBadge(`BRT_${label}`));
        badge.style.setProperty("--route-color", color);
        badge.innerHTML = buildBrtBadgeLabel(label, color);
        result.push(measure(badge, label, color, 24));
      }
      host.remove();
      return result;
    });
    assert.equal(samples.length, 19 * 2 + 3, "every mapped corridor and all three fixture-only codes are rendered");
    for (const sample of samples) {
      assert.equal(sample.label, sample.expected);
      assert.equal(sample.circle && sample.fits, true, JSON.stringify(sample));
      assert.equal(sample.background, sample.expectedBackground);
      assert.ok(sample.font <= sample.size * 0.5, "the code stays proportional to the circle");
    }
    const at24px = Object.fromEntries(samples.filter(data => data.size === 24).map(data => [data.label, data]));
    for (const code of ["1", "2", "6", "13", "14", "1A", "3F", "10H"]) assert.ok(at24px[code]);
    assert.equal(at24px["1"].font, at24px["14"].font, "single digits do not use oversized typography");
    assert.equal(at24px["14"].ink, "rgb(0, 0, 0)", "light route colors retain legible ink");
    assert.equal(at24px["1"].ink, "rgb(255, 255, 255)", "dark route colors retain legible ink");
  });
}
