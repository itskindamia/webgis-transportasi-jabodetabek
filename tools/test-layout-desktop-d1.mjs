import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { openLayout, readMap } from "./layout-browser.mjs";

let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
});
after(async () => { await browser?.close(); });

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080]]) {
  test(`desktop network and map controls fit at ${width}x${height}`, async t => {
    const { page, context, errors } = await openLayout(browser, width, height);
    t.after(() => context.close());
    const sidebar = await page.locator("#filterPanel").boundingBox();
    assert.ok(sidebar.width >= 300 && sidebar.width <= 320);
    const header = await page.locator(".tl-header").boundingBox();
    assert.ok(header.height >= 56 && header.height <= 60);
    const expanded = await readMap(page);
    assert.equal(expanded.documentWidth, width);
    assert.deepEqual(expanded.size, [width - sidebar.width, height - header.height]);

    const controls = ["#gpsButton", "#homeButton", "#northButton", "#zoomInButton", "#zoomOutButton", "#basemapButton"];
    async function assertControlsReachable() {
      for (const selector of controls) {
        const reachable = await page.locator(selector).evaluate(button => {
          const { left, top, right, bottom, width, height } = button.getBoundingClientRect();
          return left >= 0 && top >= 0 && right <= innerWidth && bottom <= innerHeight &&
            button.contains(document.elementFromPoint(left + width / 2, top + height / 2));
        });
        assert.ok(reachable, `${selector} stays inside the viewport and unobstructed`);
      }
    }

    await page.click("#tlLegendToggle");
    assert.ok(await page.locator("#rightInfoPanel").isVisible());
    await assertControlsReachable();
    await page.click("#basemapButton");
    assert.ok(await page.locator("#basemapPanel").isVisible());
    assert.equal(await page.locator("#rightInfoPanel").isVisible(), false);
    await assertControlsReachable();
    await page.click("#basemapClose");
    await page.click("#tlAbout");
    assert.ok(await page.locator("#infoModal").isVisible());
    await page.click("#infoModalClose");

    await page.click("#tlNetworkCollapse");
    assert.equal(await page.locator("#tlNetworkToggle").getAttribute("aria-expanded"), "false");
    await page.waitForFunction(size => map.getSize().x === size, width);
    assert.equal((await readMap(page)).zoom, expanded.zoom);
    assert.ok(await page.locator(".tl-header #globalSearchPanel").isVisible());
    await page.fill("#globalSearchInput", "bundaran hi");
    await page.locator("#globalSearchResults .global-search-result").first().waitFor();
    await page.click("#globalSearchClear");
    await page.click("#tlNetworkToggle");
    await page.waitForFunction(size => map.getSize().x === size, expanded.size[0]);
    assert.ok(await page.locator("#filterPanel #globalSearchPanel").isVisible());
    assert.deepEqual(errors, []);
  });
}

test("desktop route rows mirror filter results, selection, and permalink", async t => {
  const { page, context, errors } = await openLayout(browser, 1366, 768, { dismissOnboarding: false });
  t.after(() => context.close());
  await page.click("#infoModalAccept");
  await page.click("#productTourSkip");
  const rows = page.locator("#tlRouteList .tl-route-choice");
  await page.click('[data-mode="LRT"]');
  await rows.first().waitFor();
  const matches = () => page.evaluate(() => {
    const picker = document.getElementById("routeSelect");
    const options = [...picker.options].filter(option => option.value !== "ALL");
    const choices = [...document.querySelectorAll("#tlRouteList .tl-route-choice")];
    const groups = [...picker.querySelectorAll("optgroup")].map(group => group.label);
    const headings = [...document.querySelectorAll(".tl-route-list-group")].map(heading => heading.textContent);
    return {
      options: options.map(option => [option.value, option.text, getRouteColor(option.value)]),
      rows: choices.map(button => [button.dataset.routeId, button.getAttribute("aria-label"), button.style.getPropertyValue("--route-color")]),
      groups, headings
    };
  });
  const existing = await matches();
  assert.deepEqual(existing.rows, existing.options);
  assert.deepEqual(existing.headings, existing.groups);
  assert.ok(await rows.locator(".rail-line-badge-image").first().isVisible(), "existing rail badge is reused");
  const bekasi = rows.filter({ hasText: "Lin Bekasi" });
  await bekasi.focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector('#tlRouteList [data-route-id="LRT_JB_BK"][aria-current="true"]');
  assert.equal(await page.locator("#routeSelect").inputValue(), "LRT_JB_BK");
  assert.equal(new URL(page.url()).searchParams.get("route"), "LRT_JB_BK");
  assert.ok(await page.locator("#tlDetailPanel").isVisible());
  await page.reload();
  await page.click("#productTourSkip");
  await page.waitForSelector('#tlRouteList [data-route-id="LRT_JB_BK"][aria-current="true"]');

  await page.click("#routeCompareAdd");
  await page.selectOption("#comparisonRouteSelect", "LRT_JB_CB");
  await page.waitForFunction(() => new URLSearchParams(location.search).get("compare") === "LRT_JB_CB");
  await page.click("#routeCompareClear");

  await page.selectOption("#statusSelect", "ALL");
  await page.waitForFunction(() => {
    const options = [...document.getElementById("routeSelect").options].slice(1);
    const choices = [...document.querySelectorAll("#tlRouteList button")];
    return choices.length === options.length && options.every((option, index) =>
      choices[index].dataset.routeId === option.value && choices[index].getAttribute("aria-label") === option.text);
  });
  const allStatuses = await matches();
  assert.deepEqual(allStatuses.rows, allStatuses.options);
  assert.notDeepEqual(allStatuses.rows, existing.rows, "the list follows status changes");

  await page.setViewportSize({ width: 1023, height: 768 });
  await page.locator(".tl-header #globalSearchPanel").waitFor();
  assert.equal(await page.locator("#tlRouteList").isVisible(), false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#mobileBottomRouteButton");
  assert.ok(await page.locator("#routeSelect").isVisible());
  assert.equal(await page.locator("#tlRouteList").isVisible(), false);
  assert.deepEqual(errors, []);
});
