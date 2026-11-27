// D5.24: deterministic warm-cache route switching comparison.
// Prints JSON, one process for baseline and one for the candidate.
import { chromium } from "playwright";
import { openLayout } from "./layout-browser.mjs";

const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch({ headless: true, ...(exe ? { executablePath: exe } : {}) });
const samples = [];
const scenarios = [
  ["BRT", ["BRT_01", "BRT_06", "BRT_09"]],
  ["KRL", ["KRL_TA", "KRL_CK", "KRL_BO"]],
  ["LRT", ["LRT_JB_BK", "LRT_JB_CB"]],
  ["MRT", ["MRT_NS"]]
];
try {
  const { page, context, errors } = await openLayout(browser, 1440, 900);
  await page.evaluate(() => {
    const original = window.showSingleRoute;
    if (typeof original !== "function") throw new Error("showSingleRoute unavailable for profiling");
    window.__d51Timing = [];
    const measuredFunctions = [
      "drawSelectedRouteGeometry", "drawRoutes", "renderRouteInfo",
      "renderStopList", "drawStops", "fitRouteToScreen",
      "clearSelectedStop", "updateRouteDetailCardState", "removeStops"
    ];
    for (const name of measuredFunctions) {
      const fn = window[name];
      if (typeof fn !== "function") continue;
      window[name] = function (...args) {
        const start = performance.now();
        try { return fn.apply(this, args); }
        finally {
          const entry = window.__d51Active;
          if (entry) entry.phases[name] = (entry.phases[name] || 0) + performance.now() - start;
        }
      };
    }
    window.showSingleRoute = function (...args) {
      const start = performance.now();
      const entry = { route: String(args[0]), cameraStartMs: null, phases: {} };
      window.__d51Active = entry;
      const onMove = () => {
        if (entry.cameraStartMs === null) entry.cameraStartMs = performance.now() - start;
      };
      map.on("movestart", onMove);
      try {
        return original.apply(this, args);
      } finally {
        map.off("movestart", onMove);
        entry.handlerMs = performance.now() - start;
        window.__d51Active = null;
        window.__d51Timing.push(entry);
        requestAnimationFrame(() => {
          entry.nextFrameMs = performance.now() - start;
        });
      }
    };
  });
  // Dispatch the real route picker change event in-page. This removes
  // Playwright hit-testing delays from the measurement and captures only
  // application main-thread work; click-to-handler is assessed separately.
  const records = await page.evaluate(async fixture => {
    const measured = [];
    for (const [mode, routes] of fixture) {
      const modePicker = document.getElementById("modeSelect");
      modePicker.value = mode;
      modePicker.dispatchEvent(new Event("change", { bubbles: true }));
      for (let loop = 0; loop < 5; loop++) {
        for (const route of routes) {
          const picker = document.getElementById("routeSelect");
          if (![...picker.options].some(x => x.value === route)) {
            throw new Error("Route unavailable in picker: " + mode + "/" + route);
          }
          picker.value = route;
          picker.dispatchEvent(new Event("change", { bubbles: true }));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const last = window.__d51Timing.at(-1);
          if (!last || last.route !== route) throw new Error("Missing timing: " + route);
          if (loop > 0) measured.push({ mode, ...last });
        }
      }
    }
    return measured;
  }, scenarios);
  samples.push(...records);
  if (errors.length) throw new Error("Browser errors: " + errors.join("; "));
  await context.close();
} finally {
  await browser.close();
}
const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] * 10) / 10;
};
const summary = {};
for (const mode of ["BRT", "KRL", "LRT", "MRT", "ALL"]) {
  const group = mode === "ALL" ? samples : samples.filter(s => s.mode === mode);
  const metrics = {};
  for (const key of ["handlerMs", "cameraStartMs", "nextFrameMs"]) {
    const values = group.map(s => s[key]).filter(x => typeof x === "number" && Number.isFinite(x));
    metrics[key] = { count: values.length, median: percentile(values, 0.5), p95: percentile(values, 0.95) };
  }
  const phaseNames = ["drawSelectedRouteGeometry", "drawRoutes", "renderRouteInfo",
    "renderStopList", "drawStops", "fitRouteToScreen", "clearSelectedStop",
    "updateRouteDetailCardState", "removeStops"];
  for (const phase of phaseNames) {
    const values = group.map(s => s.phases?.[phase] || 0);
    metrics[phase] = { median: percentile(values, 0.5), p95: percentile(values, 0.95) };
  }
  summary[mode] = metrics;
}
console.log(JSON.stringify({
  commit: process.env.GITHUB_SHA || "",
  root: process.env.LAYOUT_APP_ROOT || "candidate",
  viewport: "1440x900",
  samples: samples.length,
  summary
}, null, 2));
