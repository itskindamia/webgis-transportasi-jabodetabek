import assert from 'node:assert/strict';
import {readFile,writeFile}from'node:fs/promises';
import { chromium }from'playwright';
const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const context=await b.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
const errors=[],failedLocal=[];page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:5188')&&r.status()>=400)failedLocal.push({url:r.url(),status:r.status()});});
// Local package bytes are served over real HTTP. Isolate remote services as in regression tests.
await context.route('https://**/*',async route=>{
 const u=new URL(route.request().url());
 if(/\/leaflet\.(js|css)$/.test(u.pathname))return route.fulfill({status:200,body:await readFile('node_modules/leaflet/dist/'+u.pathname.split('/').pop()),contentType:u.pathname.endsWith('.js')?'application/javascript':'text/css',headers:{'Access-Control-Allow-Origin':'*'}});
 if(['server.arcgisonline.com','tile.openstreetmap.org'].includes(u.hostname))return route.fulfill({status:200,body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64'),contentType:'image/png'});
 return route.abort();
});
try{
 await page.goto('http://127.0.0.1:5188/');
 await page.waitForFunction(()=>document.documentElement.dataset.layoutReady==='true'&&typeof stopData!=='undefined'&&stopData?.features?.length>0);
 await page.click('#infoModalAccept');await page.waitForSelector('#productTour',{state:'visible'});await page.click('#productTourSkip');
 await page.click('#tlNetworkToggle');await page.click('[data-mode="LRT"]');await page.selectOption('#routeSelect','LRT_JB_BK');await page.waitForTimeout(800);
 await page.evaluate(()=>{webgisLayout.showPopupDetails();webgisLayout.setTab('stops');webgisLayout.setSheetPosition('expanded');});
 await page.locator('#stopList [data-stop-key="LRTJB008_01"]').click();await page.waitForTimeout(900);
 await page.locator('.lrt-popup [data-stop-nav="next"]').click();await page.waitForTimeout(600);
 assert.notEqual(await page.evaluate(()=>currentSelectedStopKey),'LRTJB008_01');
 assert.deepEqual(errors,[]);assert.deepEqual(failedLocal,[]);
 const report={archive:JSON.parse(await readFile('docs/floating-layout/verification/package.json','utf8')),origin:'http://127.0.0.1:5188/',browser:b.version(),checks:['extracted ZIP served by real HTTP','local runtime files have no HTTP 4xx/5xx','normal onboarding','LRT Bekasi line selection','Cawang popup','next station navigation'],errors,failedLocal,limitations:'CDN Leaflet uses identical installed 1.9.4 bytes; external tiles isolated, real provider screenshots captured separately.'};
 await writeFile('docs/floating-layout/verification/package-smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await b.close();}
