// Drives the desktop route buttons on the same viewport and browser in both revisions.
// Probes live only in the test page; the deployed application needs no instrumentation.
import assert from "node:assert/strict";
import { availableParallelism, cpus, platform } from "node:os";
import { chromium } from "playwright";
import { acceptWelcome, waitForCamera } from "./d5-browser.mjs";
import { openLayout, selectRoute } from "./layout-browser.mjs";

const url = process.env.D51_BENCH_URL;
const viewport = { width: 1440, height: 900 };
const iterations = 10;
const scenarios = [
  ["BRT", ["BRT_01", "BRT_06", "BRT_09"]],
  ["KRL", ["KRL_TA", "KRL_CK", "KRL_BO"]],
  ["LRT", ["LRT_JB_BK", "LRT_JB_CB"]],
  ["MRT", ["MRT_NS"]]
];
const phases = ["drawSelectedRouteGeometry", "drawRoutes", "renderRouteInfo", "renderStopList", "drawStops",
  "fitRouteToScreen", "clearSelectedStop", "updateRouteDetailCardState", "removeStops"];

async function openBenchmark(browser) {
  if (!url) return openLayout(browser, viewport.width, viewport.height);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  assert.ok((await page.goto(url, { waitUntil: "domcontentloaded" }))?.ok(), "live WebGIS serves the benchmark page");
  await page.waitForFunction(() => document.documentElement.dataset.layoutReady === "true" && stopData?.features?.length);
  await acceptWelcome(page);
  await page.evaluate(() => document.fonts.ready);
  return { page, context, errors };
}

async function installProbes(page) {
  await page.evaluate(phases => {
    const probe = window.d51Benchmark = { sample: null, expectedRoute: null, longTasks: null };
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      probe.longTasks = [];
      new PerformanceObserver(list => probe.longTasks.push(...list.getEntries())).observe({ type: "longtask" });
    }
    document.addEventListener("click", event => {
      const button = event.target.closest("#tlRouteList button[data-route-id]");
      if (!event.isTrusted || !button || button.dataset.routeId !== probe.expectedRoute) return;
      probe.sample = {
        route: button.dataset.routeId,
        inputAt: event.timeStamp,
        cameraBefore: { center: map.getCenter(), zoom: map.getZoom() },
        phases: {}
      };
    }, true);
    map.on("move zoomanim", event => {
      const sample = probe.sample;
      if (!sample || sample.cameraRequestMs === undefined || sample.cameraMotionMs !== undefined) return;
      const { center, zoom } = event.type === "zoomanim" ? event : { center: map.getCenter(), zoom: map.getZoom() };
      if (zoom !== sample.cameraBefore.zoom || !center.equals(sample.cameraBefore.center)) {
        sample.cameraMotionMs = performance.now() - sample.inputAt;
      }
    });
    for (const name of phases) {
      const original = window[name];
      if (typeof original !== "function") throw new Error(`Missing benchmark phase ${name}`);
      window[name] = function (...args) {
        const sample = probe.sample;
        const start = performance.now();
        if (name === "fitRouteToScreen" && sample?.clickToHandlerMs !== undefined) {
          sample.cameraRequestMs ??= start - sample.inputAt;
        }
        if (!sample?.handling) return original.apply(this, args);
        try {
          return original.apply(this, args);
        } finally {
          sample.phases[name] = (sample.phases[name] ?? 0) + performance.now() - start;
        }
      };
    }
    const showRoute = window.showSingleRoute;
    window.showSingleRoute = function (route, ...args) {
      const sample = probe.sample;
      if (sample?.route !== route) return showRoute.call(this, route, ...args);
      const start = performance.now();
      sample.clickToHandlerMs = start - sample.inputAt;
      sample.handling = true;
      try {
        return showRoute.call(this, route, ...args);
      } finally {
        sample.handlerMs = performance.now() - start;
        sample.handling = false;
        // The second RAF follows one rendering opportunity for Leaflet and the UI.
        requestAnimationFrame(() => requestAnimationFrame(function readFrame() {
          sample.visualFrameMs ??= performance.now() - sample.inputAt;
          const active = document.querySelector('#tlRouteList button[aria-current="true"]');
          const stopList = document.getElementById("stopList");
          if (active?.dataset.routeId !== route || currentSelectedRouteId !== route ||
              !routeLayer?.getLayers().length || !stopMarkerByKey.size || !stopList.childElementCount ||
              document.getElementById("tlDetailPanel").inert) {
            requestAnimationFrame(readFrame);
            return;
          }
          sample.interactiveReadyMs = performance.now() - sample.inputAt;
        }));
      }
    };
  }, phases);
}

async function measureRoute(page, mode, route) {
  await page.evaluate(route => {
    d51Benchmark.expectedRoute = route;
    d51Benchmark.sample = null;
    if (d51Benchmark.longTasks) d51Benchmark.longTasks.length = 0;
  }, route);
  await selectRoute(page, route);
  await page.waitForFunction(() => d51Benchmark.sample?.interactiveReadyMs > 0);
  await waitForCamera(page);
  const sample = await page.evaluate(() => {
    const { inputAt, handling, cameraBefore, ...sample } = d51Benchmark.sample;
    d51Benchmark.expectedRoute = null;
    d51Benchmark.sample = null;
    const tasks = d51Benchmark.longTasks?.filter(task =>
      task.startTime < inputAt + sample.interactiveReadyMs && task.startTime + task.duration > inputAt);
    return {
      ...sample,
      longTaskCount: tasks?.length ?? null,
      longTaskMs: tasks?.reduce((total, task) => total + task.duration, 0) ?? null,
      routePaths: routeLayer.getLayers().length,
      stopItems: document.querySelectorAll("#stopList .stop-list-item").length,
      stopMarkers: stopMarkerByKey.size,
      hitTargets: stopHitLayer.getLayers().filter(layer => layer.getElement()?.classList.contains("stop-hit-target")).length,
      matchingRoute: routeLayer.getLayers().every(layer => getRouteId(layer.feature) === sample.route)
    };
  });
  assert.equal(sample.route, route);
  assert.ok(sample.matchingRoute && sample.stopItems > 0 && sample.hitTargets >= sample.stopMarkers,
    `${route} renders its alignment, station list and Leaflet hit targets`);
  assert.ok(sample.clickToHandlerMs >= 0 && sample.cameraRequestMs > 0, `${route} probe uses the same clock as input`);
  return { mode, ...sample };
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
const browserVersion = browser.version();
const samples = [];
const crossMode = [];
try {
  const { page, context, errors } = await openBenchmark(browser);
  await installProbes(page);
  const chooseMode = async mode => {
    await page.locator(`#tlModeChoices [data-mode="${mode}"]`).click();
    await waitForCamera(page);
  };
  for (const [mode, routes] of scenarios) {
    await chooseMode(mode);
    for (let loop = 0; loop <= iterations; loop++) {
      for (const route of routes) {
        if (await page.locator("#routeSelect").inputValue() === route) {
          // MRT has a single selected line, so revisit it from mode overview.
          await selectRoute(page, "ALL");
          await waitForCamera(page);
        }
        const sample = await measureRoute(page, mode, route);
        if (loop > 0) samples.push(sample);
      }
    }
  }
  for (let index = 0; index < 12; index++) {
    const [mode, routes] = scenarios[index % scenarios.length];
    await chooseMode(mode);
    crossMode.push(await measureRoute(page, mode, routes[Math.floor(index / scenarios.length) % routes.length]));
  }
  assert.deepEqual(errors, []);
  await context.close();
} finally {
  await browser.close();
}

function summarize(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const count = sorted.length;
  if (!count) return { count, median: null, p95: null };
  const round = value => Math.round(value * 10) / 10;
  const median = (sorted[Math.floor((count - 1) / 2)] + sorted[Math.floor(count / 2)]) / 2;
  return { count, median: round(median), p95: round(sorted[Math.ceil(0.95 * count) - 1]) };
}

function summarizeRoutes(records) {
  const metrics = ["clickToHandlerMs", "handlerMs", "cameraRequestMs", "cameraMotionMs", "visualFrameMs",
    "interactiveReadyMs", "longTaskCount", "longTaskMs"];
  return Object.fromEntries([
    ...metrics.map(metric => [metric, summarize(records.map(sample => sample[metric]))]),
    ...phases.map(phase => [phase, summarize(records.map(sample => sample.phases[phase]))])
  ]);
}

const groups = scenarios.map(([mode]) => [mode, samples.filter(sample => sample.mode === mode)]);
console.log(JSON.stringify({
  commit: process.env.D51_BENCH_SHA || process.env.GITHUB_SHA || null,
  source: url || (process.env.LAYOUT_APP_ROOT ? "local baseline" : "local candidate"),
  environment: { browser: `Chromium ${browserVersion}`, platform: platform(), cpu: cpus()[0].model,
    availableParallelism: availableParallelism(), viewport },
  methodology: {
    input: "Trusted clicks on the desktop route list. Cross-mode timing starts at the route click after the mode filter has settled.",
    visualFrame: "Second requestAnimationFrame after the handler, a proxy for a browser rendering opportunity.",
    camera: "First Leaflet move or zoomanim with a changed center or zoom after fit is requested.",
    cache: url ? "Warm repeated routes with real production tiles and assets." : "Warm repeated routes with deterministic tile and font fixtures.",
    samplesPerRoute: iterations,
    warmupPerRoute: 1
  },
  summary: Object.fromEntries([...groups, ["ALL", samples], ["CROSS_MODE", crossMode]]
    .map(([group, records]) => [group, summarizeRoutes(records)])),
  samples,
  crossMode
}, null, 2));
