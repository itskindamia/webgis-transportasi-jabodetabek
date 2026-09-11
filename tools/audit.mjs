import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const warnings = [];
const notes = [];

const fail = (condition, message) => { if (!condition) failures.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const readJSON = relativePath => JSON.parse(read(relativePath));

const html = read("index.html");
const script = read("js/map.js");
const style = read("css/style.css");

/* =========================================================
   RUNTIME / RELEASE CHECKS — failures block release
   ========================================================= */
const ids = [...html.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
fail(duplicateIds.length === 0, `ID HTML duplikat: ${duplicateIds.join(", ")}`);
fail(html.includes('http-equiv="Content-Security-Policy"'), "Content Security Policy tidak ditemukan.");
fail(script.includes("const APP_DEBUG = false;"), "APP_DEBUG produksi belum dinonaktifkan.");
fail(html.includes('<option value="Conceptual">Gagasan WebGIS</option>'), "Label publik status Conceptual belum memakai Gagasan WebGIS.");
fail(script.includes('Conceptual: "Gagasan WebGIS"'), "Pemetaan label status Conceptual ke Gagasan WebGIS tidak ditemukan.");
fail(script.includes('"Konseptual": "Conceptual"'), "Alias legacy Konseptual tidak dipertahankan.");
fail(script.includes('"Gagasan": "Conceptual"'), "Alias legacy Gagasan tidak dipertahankan.");
fail(!script.includes("\x08"), "map.js masih memuat karakter backspace/kontrol yang dapat merusak regex.");
fail(script.includes('/^KRL\\b/i.test(label)'), "Regex identifikasi grup KRL pada integrasi tidak ditemukan/korup.");
fail(script.includes('/^MRT\\b/i.test(label)'), "Regex identifikasi grup MRT pada integrasi tidak ditemukan/korup.");
fail(script.includes('/^(Halte|Stasiun|Terminal)\\s+/i'), "Normalisasi nama halte/stasiun tidak memakai whitespace regex yang benar.");
fail(html.includes("Struktur Jalur Kereta"), "Legenda struktur belum dibatasi secara publik untuk jaringan kereta.");
fail(html.includes("<span>Permukaan</span>"), "Kategori Permukaan belum tersedia pada legenda struktur rail.");
fail(script.includes("function isRailFeature(feature)"), "Helper klasifikasi feature rail tidak ditemukan.");
fail(script.includes("if (!isRailFeature(feature))"), "Pola struktur belum dibatasi hanya untuk feature rail.");
fail(script.includes('code === "KAI_KAJJ" ||\n    code === "KAJJ"'), "Alias KAJJ belum dikenali langsung oleh resolver utama.");
fail(script.includes("function getStopStationCodeHTML(feature)"), "Renderer metadata STN_CODE popup rail tidak ditemukan.");
fail(script.includes('KA_BANDARA: "KA Bandara"'), "Label publik MODE=KA_BANDARA belum tersedia.");
fail(script.includes('ICT: "KA Antarkota"'), "Label publik MODE=ICT belum tersedia.");
fail(script.includes("function normalizeRailServiceType(value)"), "Normalizer SERVICE_TYPE rail belum tersedia.");
fail(script.includes('LOCAL: "KA Lokal"'), "Label publik SERVICE_TYPE=LOCAL belum tersedia.");
fail(script.includes('KAJJ: "KA Jarak Jauh"'), "Label publik SERVICE_TYPE=KAJJ belum tersedia.");
fail(script.includes("function syncModeOptionsWithData()"), "Dropdown Moda data-driven v0.16 belum tersedia.");
fail(script.includes('MODE=ICT membutuhkan SERVICE_TYPE=LOCAL atau KAJJ'), "Validasi SERVICE_TYPE untuk MODE=ICT belum tersedia.");
fail(style.includes('--font-main: "Avenir Next Local", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif;'), "Fallback Avenir Next Local belum dipertahankan pada variabel font utama.");
fail(/<div class="legend-section-content">[\s\S]*?<span>Usulan<\/span>[\s\S]*?<div class="webgis-exploration-label">Eksplorasi WebGIS<\/div>[\s\S]*?<span>Gagasan WebGIS<\/span>/.test(html), "Hierarki legenda Eksplorasi WebGIS belum berada tepat sebelum Gagasan WebGIS.");

for (const documentPath of [
  "README.md",
  "docs/README_DEPLOY.md",
  "docs/COMPLIANCE_AUDIT.md",
  "docs/NAVIGATION_QA.md",
  "docs/UI_QA.md",
  "docs/RAIL_SCHEMA_V2.md",
  "THIRD_PARTY_NOTICES.md"
]) {
  fail(fs.existsSync(path.join(root, documentPath)), `Dokumen rilis hilang: ${documentPath}`);
}

const localReferences = [];
for (const match of html.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/g)) {
  const value = match[1];
  if (!/^(?:https?:|#|mailto:|tel:)/i.test(value)) localReferences.push(value.split(/[?#]/)[0]);
}
for (const match of script.matchAll(/["'`](assets\/[^"'`?#]+)["'`]/g)) localReferences.push(match[1]);
for (const match of style.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
  const value = match[1];
  if (!/^(?:https?:|data:|\/)/i.test(value)) localReferences.push(path.join("css", value));
}
const missingReferences = [...new Set(localReferences)].filter(Boolean).filter(reference => !fs.existsSync(path.resolve(root, reference)));
fail(missingReferences.length === 0, `Referensi lokal hilang: ${missingReferences.join(", ")}`);

fail(!style.includes("\\n"), "CSS masih memuat literal \\n.");
fail(script.includes("https://tile.openstreetmap.org/{z}/{x}/{y}.png"), "URL tile OSM resmi tidak ditemukan.");
fail(!script.includes("{s}.tile.openstreetmap.org"), "URL subdomain tile OSM lama masih digunakan.");
fail(script.includes("Esri, HERE, Garmin"), "Atribusi Light Gray Canvas belum lengkap.");
fail(script.includes("Esri, Vantor, Earthstar Geographics"), "Atribusi World Imagery belum lengkap.");
fail(script.includes("NOMINATIM_MIN_INTERVAL_MS = 1100"), "Pembatasan Nominatim tidak ditemukan.");
fail(!/valhalla|isochrone|walkService|walk-service/i.test(script), "Kode Jangkauan Jalan Kaki masih ditemukan.");
fail(!/walk-service/i.test(style), "Gaya Jangkauan Jalan Kaki masih ditemukan.");
fail(!/stop-radius|Radius Jangkauan|STOP_RADIUS|stopRadiusPane/i.test(script + style), "Kode/gaya Radius Jangkauan masih ditemukan.");
fail(!/Radius jangkauan 400–800 m/i.test(html), "Dokumentasi UI Radius Jangkauan masih aktif.");

/* =========================================================
   DATA READABILITY — invalid files fail; migration/content gaps warn
   GeoJSON is intentionally not modified by this release.
   ========================================================= */
const brtStops = readJSON("data/brt_stop.geojson");
const brtRoutes = readJSON("data/brt_route.geojson");
const railStops = readJSON("data/rail_stop.geojson");
const railRoutes = readJSON("data/rail_route.geojson");

for (const [name, collection] of [
  ["BRT stop", brtStops], ["BRT route", brtRoutes], ["rail stop", railStops], ["rail route", railRoutes]
]) {
  fail(collection?.type === "FeatureCollection" && Array.isArray(collection.features), `${name} bukan FeatureCollection valid.`);
}

const expectedBrtFields = [
  "STOP_ID", "GEOM_ID", "STOP_GROUP", "STOP_NAME", "DISPLAY_NM", "MODE",
  "STATUS", "STOP_ROLE", "STOP_VAR", "PAID_LINK", "LINK_TYPE", "ROUTES",
  "DIR_MAP", "ACT_MAP", "OPS_MAP", "SEQ_MAP", "DIV_SEQ", "DIV_ID",
  "REPLACES_ID", "VALID_FR", "VALID_TO", "INTEGRASI", "INT_NM", "INT_STOP",
  "INT_STATUS", "SOURCE", "SRC_URL", "SRC_NOTE", "REMARK", "SEQ_A_MAP", "SEQ_B_MAP"
];
const completeBrt = brtStops.features.filter(feature =>
  expectedBrtFields.every(field => Object.hasOwn(feature.properties ?? {}, field))
).length;
warn(completeBrt === brtStops.features.length,
  `Migrasi schema BRT belum lengkap: ${completeBrt}/${brtStops.features.length} feature membawa seluruh ${expectedBrtFields.length} field.`);

for (const field of ["GEOM_ID", "STOP_VAR", "PAID_LINK", "LINK_TYPE", "INT_STATUS"]) {
  const blank = brtStops.features.filter(feature => String(feature.properties?.[field] ?? "").trim() === "").length;
  warn(blank === 0, `${field} masih kosong pada ${blank} feature BRT.`);
}
for (const field of ["GEOM_ID", "GlobalID"]) {
  const values = brtStops.features.map(feature => String(feature.properties?.[field] ?? "").trim()).filter(Boolean);
  warn(new Set(values).size === values.length, `${field} memiliki nilai duplikat pada data BRT.`);
}
const legacyAirportAliases = railStops.features.filter(feature => JSON.stringify(feature.properties ?? {}).includes("KA_BANDARA")).length;
warn(legacyAirportAliases === 0, `Alias integrasi rail lama KA_BANDARA masih ditemukan pada ${legacyAirportAliases} feature; runtime tetap mendukung alias ini.`);
const railRoutesWithoutUrl = railRoutes.features.filter(feature => !String(feature.properties?.SRC_URL ?? "").trim()).length;
warn(railRoutesWithoutUrl === 0, `SRC_URL masih kosong pada ${railRoutesWithoutUrl}/${railRoutes.features.length} feature rute rail.`);

// Data Lin Cibubur: audit informatif saja; kelengkapan cabang tetap pekerjaan GeoJSON.
const cbStops = railStops.features.filter(feature => String(feature.properties?.LINES ?? "").split(";").map(v => v.trim()).includes("LRT_JB_CB"));
const cbSeq = cbStops.map(feature => {
  const raw = String(feature.properties?.SEQ_MAP ?? "");
  const hit = raw.split(";").map(v => v.trim()).find(v => v.startsWith("LRT_JB_CB:"));
  return hit ? hit.slice(hit.indexOf(":") + 1) : "";
}).filter(Boolean);
const maxCbSeq = cbSeq.map(v => parseInt(v, 10)).filter(Number.isFinite).reduce((a,b) => Math.max(a,b), 0);
warn(maxCbSeq >= 12, `Lin Cibubur baru terdata sampai urutan ${String(maxCbSeq).padStart(2,"0")}; cabang Cawang–Harjamukti belum lengkap pada GeoJSON.`);

notes.push(`${ids.length} ID HTML unik`);
notes.push(`${new Set(localReferences).size} referensi lokal tersedia`);
notes.push(`${brtStops.features.length} halte BRT dapat dibaca`);
notes.push(`${brtRoutes.features.length} feature rute BRT dapat dibaca`);
notes.push(`${railStops.features.length} stasiun rail dapat dibaca`);
notes.push(`${railRoutes.features.length} feature rute rail dapat dibaca`);

if (failures.length) {
  console.error("AUDIT RUNTIME GAGAL");
  failures.forEach(message => console.error(`- ${message}`));
  if (warnings.length) {
    console.error("CATATAN DATA");
    warnings.forEach(message => console.error(`- ${message}`));
  }
  process.exitCode = 1;
} else {
  console.log(warnings.length ? "AUDIT RUNTIME LULUS DENGAN CATATAN DATA" : "AUDIT RUNTIME LULUS");
  notes.forEach(message => console.log(`- ${message}`));
  if (warnings.length) {
    console.log("CATATAN DATA (GeoJSON tidak diubah pada rilis ini)");
    warnings.forEach(message => console.log(`- ${message}`));
  }
}
