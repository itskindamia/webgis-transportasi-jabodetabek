import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { chromium } from 'playwright';
import { openLayout, chooseRoute, readMap } from './layout-browser.mjs';
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); });
after(async () => { await browser?.close(); });

for (const [width, height] of [[1440,900],[1280,720],[1024,768],[768,1024],[390,844],[360,800]]) {
  test(`floating panels preserve the camera, layers and controls at ${width}x${height}`, async t => {
    const app = await openLayout(browser, width, height);
    t.after(() => app.context.close());
    const { page } = app;
    await chooseRoute(page, 'BRT_03');
    await page.waitForFunction(() => !map._panAnim?._inProgress && !map._animatingZoom);
    await page.evaluate(() => {
      window.pinnedMap = map; window.pinnedRoutes = routeLayer; window.pinnedMarkers = [...stopMarkerByKey];
      window.cameraCalls = [];
      for (const method of ['setView','setZoom','panTo','panBy','flyTo','fitBounds','invalidateSize']) {
        const original = map[method];
        map[method] = function(...args) { cameraCalls.push(method); return original.apply(this,args); };
      }
    });
    const before = await readMap(page), url = page.url();
    if (width < 768) await page.click('#mobileBottomRouteButton');
    else if (await page.locator('#filterPanel').evaluate(el => el.inert)) await page.click('#tlNetworkToggle');
    const geometry = await page.evaluate(() => {
      const r = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
      return { map:r('#map'), panel:r('#filterPanel'), title:r('.tl-brand'), actions:r('.tl-header-actions'), header:r('.tl-header'),
        heading:document.querySelector('.tl-brand-text').tagName, width:document.documentElement.scrollWidth };
    });
    assert.equal(geometry.heading,'H1');
    assert.equal(geometry.width,width);
    assert.ok(geometry.title.right <= geometry.actions.left, 'header title and actions do not overlap');
    assert.ok(geometry.panel.top >= geometry.map.top && geometry.panel.bottom <= geometry.map.bottom, 'panel fits map');
    if (width >= 768) {
      assert.equal(geometry.map.width,width,'map spans the full viewport beneath floating panels');
      assert.ok(geometry.panel.left >= 12 && geometry.panel.width >= 300 && geometry.panel.width <= 340);
      assert.deepEqual(await page.locator('.tl-header-actions button').allTextContents().then(items => items.map(x => x.trim())), ['Cari','Jaringan','Legenda','Tentang']);
      await page.click('#tlSearchToggle');
      assert.equal(await page.locator('#filterPanel').isVisible(),false);
      assert.equal(await page.locator('#filterPanel').evaluate(el => el.inert),true);
      await page.fill('#globalSearchInput','Blok M');
      await page.waitForSelector('#globalSearchResults [data-global-type="transport"]');
      await page.locator('#globalSearchResults').evaluate(el => el.scrollTop = 20);
      const scroll = await page.locator('#globalSearchResults').evaluate(el => el.scrollTop);
      await page.click('#tlLegendToggle');
      assert.equal(await page.locator('#globalSearchPanel').isVisible(),false);
      await page.click('#tlSearchToggle');
      assert.equal(await page.locator('#rightInfoPanel').isVisible(),false);
      assert.equal(await page.inputValue('#globalSearchInput'),'Blok M','query survives panel changes');
      assert.equal(await page.locator('#globalSearchResults').evaluate(el => el.scrollTop),scroll,'result scroll survives panel changes');
      await page.click('#tlSearchClose');
      assert.equal(await page.locator('#tlSearchToggle').evaluate(el => el === document.activeElement),true);
      await page.click('#basemapButton');
      assert.equal(await page.locator('#filterPanel').isVisible(),false,'basemap also uses the auxiliary panel area');
      await page.locator('#basemapClose').click();
      await page.click('#tlNetworkToggle');
      if (await page.locator('#filterPanel').evaluate(el => el.inert)) await page.click('#tlNetworkToggle');
      await page.click('#tlNetworkCollapse');
      await page.click('#tlNetworkToggle');
    } else {
      assert.ok((await page.locator('#tlNetworkAbout').boundingBox()).height >= 44, 'network information link keeps a touch target');
      await page.click('#mobileFilterClose');
      await page.click('#tlMobileDetails');
      for (const id of ['tlDetailCollapse','tlDetailHalf','tlDetailExpand']) await page.click('#'+id);
      await page.click('#tlDetailClose');
    }
    // Check actual hit targets; a visible rectangle alone does not prove usability.
    for (const id of ['gpsButton','homeButton','northButton','zoomInButton','zoomOutButton']) {
      const button = page.locator('#'+id), box = await button.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44,id);
      await button.click({trial:true});
    }
    await page.click('#tlAbout');
    assert.equal(await page.locator('#tlAbout').getAttribute('aria-expanded'),'true');
    await page.click('#infoModalClose');
    assert.equal(await page.locator('#tlAbout').getAttribute('aria-expanded'),'false');
    const after = await readMap(page);
    assert.deepEqual(after.size,before.size);
    assert.deepEqual(after.center,before.center);
    assert.equal(after.zoom,before.zoom);
    assert.equal(page.url(),url);
    assert.equal(await page.inputValue('#routeSelect'),'BRT_03');
    assert.equal(await page.evaluate(() => map === pinnedMap && routeLayer === pinnedRoutes && pinnedMarkers.every(([key,marker]) => stopMarkerByKey.get(key) === marker)),true);
    assert.deepEqual(await page.evaluate(() => cameraCalls),[], 'panel switches never invoke camera or resize methods');
    assert.deepEqual(app.errors,[]);
  });
}

test('desktop search and legend remain reachable through keyboard and the tour restores an open search', async t => {
  const app = await openLayout(browser,1280,720); t.after(() => app.context.close());
  const { page } = app;
  await page.focus('#tlSearchToggle'); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#globalSearchInput').evaluate(el => el === document.activeElement),true);
  await page.fill('#globalSearchInput','Cawang');
  await page.waitForSelector('#globalSearchResults [data-global-type="transport"]');
  const before = await readMap(page);
  await page.evaluate(() => startProductTour({manual:true}));
  for (let i=0;i<5;i++) await page.click('#productTourNext');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#globalSearchPanel').isVisible(),true);
  assert.equal(await page.inputValue('#globalSearchInput'),'Cawang');
  assert.equal(await page.locator('#tlSearchToggle').getAttribute('aria-expanded'),'true');
  assert.equal((await readMap(page)).zoom,before.zoom);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#globalSearchPanel').isVisible(),false);
  await page.click('#tlLegendToggle');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#tlLegendToggle').evaluate(el => el === document.activeElement),true);
  assert.deepEqual(app.errors,[]);
});

test('breakpoint and orientation changes keep one auxiliary panel and retain route, query and sheet preference', async t => {
  const app = await openLayout(browser,1280,720); t.after(() => app.context.close());
  const { page } = app;
  await chooseRoute(page,'BRT_03');
  await page.click('#tlDetailClose');
  await page.click('#tlSearchToggle');
  await page.fill('#globalSearchInput','Cawang');
  await page.click('#tlLegendToggle');
  const url=page.url();
  for (const [width,height] of [[390,844],[768,1024],[1024,768],[360,800]]) {
    await page.setViewportSize({width,height}); await page.waitForTimeout(250);
    assert.equal(await page.locator('#rightInfoPanel').isVisible(),true);
    assert.equal(await page.locator('#filterPanel').isVisible(),false);
    assert.equal(await page.locator('#rightInfoPanel').evaluate(el=>el.inert),false);
    assert.equal(await page.inputValue('#routeSelect'),'BRT_03');
    assert.equal(await page.inputValue('#globalSearchInput'),'Cawang');
    assert.equal(page.url(),url);
    assert.equal((await readMap(page)).documentWidth,width);
    await page.locator('#mobileInfoClose').click({trial:true});
  }
  await page.click('#mobileInfoClose');
  await page.click('#tlMobileDetails'); await page.click('#tlDetailExpand');
  for(const [width,height] of [[1280,720],[568,320],[390,844]]) {
    await page.setViewportSize({width,height}); await page.waitForTimeout(250);
    assert.equal(await page.locator('#tlDetailPanel').getAttribute('data-sheet-position'),'expanded');
    assert.equal(await page.locator('#tlDetailPanel').isVisible(),true);
    await page.locator('#tlDetailClose').click({trial:true});
  }
  assert.deepEqual(app.errors,[]);
});
