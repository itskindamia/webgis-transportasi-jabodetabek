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
    window.showSingleRoute = function (...args) {
      const start = performance.now();
      let cameraStartMs = null;
      const onMove = () => { if (cameraStartMs === null) cameraStartMs = performance.now() - start; };
      map.on("movestart", onMove);
      try {
        return original.apply(this, args);
      } finally {
        map.off("movestart", onMove);
        const entry = { route: String(args[0]), handlerMs: performance.now() - start, cameraStartMs };
        window.__d51Timing.push(entry);
        requestAnimationFrame(() => {
          entry.nextFrameMs = performance.now() - start;
        });
      }
    };
  });
  for (const [mode, routes] of scenarios) {
    await page.locator('[data-mode="' + mode + '"]').click();
    for (let loop = 0; loop < 5; loop++) {
      for (const route of routes) {
        await page.locator('#tlRouteList button[data-route-id="' + route + '"]').click();
        await page.waitForFunction(id => currentSelectedRouteId === id, route);
        await page.waitForTimeout(35);
        if (loop > 0) {
          const records = await page.evaluate(() => window.__d51Timing);
          const last = records.at(-1);
          if (!last || last.route !== route) throw new Error("Missing route timing for " + route);
          samples.push({ mode, ...last });
        }
      }
    }
  }
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
  summary[mode] = metrics;
}
console.log(JSON.stringify({
  commit: process.env.GITHUB_SHA || "",
  root: process.env.LAYOUT_APP_ROOT || "candidate",
  viewport: "1440x900",
  samples: samples.length,
  summary
}, null, 2));
