import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const notes = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJSON(relativePath) {
  return JSON.parse(read(relativePath));
}

const html = read("index.html");
const script = read("js/map.js");
const style = read("css/style.css");

const ids = [...html.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
check(duplicateIds.length === 0, `ID HTML duplikat: ${duplicateIds.join(", ")}`);
check(html.includes('http-equiv="Content-Security-Policy"'), "Content Security Policy tidak ditemukan.");
check(script.includes("const APP_DEBUG = false;"), "APP_DEBUG produksi belum dinonaktifkan.");
check(html.includes('<option value="Conceptual">Gagasan</option>'), "Label publik status Conceptual belum memakai Gagasan.");
check(script.includes('Conceptual: "Gagasan"'), "Pemetaan label status Conceptual ke Gagasan tidak ditemukan.");
check(script.includes('"Konseptual": "Conceptual"'), "Alias legacy Konseptual tidak dipertahankan.");
check(script.includes('"Gagasan": "Conceptual"'), "Alias Gagasan ke status internal Conceptual tidak ditemukan.");
for (const documentPath of [
  "README.md",
  "docs/README_DEPLOY.md",
  "docs/COMPLIANCE_AUDIT.md",
  "docs/NAVIGATION_QA.md",
  "docs/UI_QA.md",
  "THIRD_PARTY_NOTICES.md"
]) {
  check(fs.existsSync(path.join(root, documentPath)), `Dokumen rilis hilang: ${documentPath}`);
}

const localReferences = [];
for (const match of html.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/g)) {
  const value = match[1];
  if (!/^(?:https?:|#|mailto:|tel:)/i.test(value)) {
    localReferences.push(value.split(/[?#]/)[0]);
  }
}
for (const match of script.matchAll(/["'`](assets\/[^"'`?#]+)["'`]/g)) {
  localReferences.push(match[1]);
}
for (const match of style.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
  const value = match[1];
  if (!/^(?:https?:|data:|\/)/i.test(value)) {
    localReferences.push(path.join("css", value));
  }
}

const missingReferences = [...new Set(localReferences)]
  .filter(Boolean)
  .filter(reference => !fs.existsSync(path.resolve(root, reference)));
check(missingReferences.length === 0, `Referensi lokal hilang: ${missingReferences.join(", ")}`);

check(!style.includes("\\n"), "CSS masih memuat literal \\n.");
check(script.includes("https://tile.openstreetmap.org/{z}/{x}/{y}.png"), "URL tile OSM resmi tidak ditemukan.");
check(!script.includes("{s}.tile.openstreetmap.org"), "URL subdomain tile OSM lama masih digunakan.");
check(script.includes("Esri, HERE, Garmin"), "Atribusi Light Gray Canvas belum lengkap.");
check(script.includes("Esri, Vantor, Earthstar Geographics"), "Atribusi World Imagery belum lengkap.");
check(script.includes("NOMINATIM_MIN_INTERVAL_MS = 1100"), "Pembatasan Nominatim tidak ditemukan.");
check(!/valhalla|isochrone|walkService|walk-service/i.test(script), "Kode Jangkauan Jalan Kaki masih ditemukan.");
check(!/walk-service/i.test(style), "Gaya Jangkauan Jalan Kaki masih ditemukan.");
check(!/stop-radius|Radius Jangkauan|STOP_RADIUS|stopRadiusPane/i.test(script + style), "Kode/gaya Radius Jangkauan masih ditemukan.");
check(!/Radius jangkauan 400–800 m/i.test(html), "Dokumentasi UI Radius Jangkauan masih aktif.");

const brtStops = readJSON("data/brt_stop.geojson");
const brtRoutes = readJSON("data/brt_route.geojson");
const railStops = readJSON("data/rail_stop.geojson");
readJSON("data/rail_route.geojson");

for (const [name, collection] of [["BRT stop", brtStops], ["BRT route", brtRoutes], ["rail stop", railStops]]) {
  check(collection?.type === "FeatureCollection" && Array.isArray(collection.features), `${name} bukan FeatureCollection valid.`);
}

const expectedBrtFields = [
  "STOP_ID", "GEOM_ID", "STOP_GROUP", "STOP_NAME", "DISPLAY_NM", "MODE",
  "STATUS", "STOP_ROLE", "STOP_VAR", "PAID_LINK", "LINK_TYPE", "ROUTES",
  "DIR_MAP", "ACT_MAP", "OPS_MAP", "SEQ_MAP", "DIV_SEQ", "DIV_ID",
  "REPLACES_ID", "VALID_FR", "VALID_TO", "INTEGRASI", "INT_NM", "INT_STOP",
  "INT_STATUS", "SOURCE", "SRC_URL", "SRC_NOTE", "REMARK", "SEQ_A_MAP",
  "SEQ_B_MAP"
];

const incompleteBrtFeatures = brtStops.features.filter(feature =>
  expectedBrtFields.some(field => !Object.hasOwn(feature.properties ?? {}, field))
);
check(incompleteBrtFeatures.length === 0, `${incompleteBrtFeatures.length} feature BRT belum membawa schema 31 field.`);

for (const field of ["GEOM_ID", "STOP_VAR", "PAID_LINK", "LINK_TYPE", "INT_STATUS"]) {
  const blank = brtStops.features.filter(feature =>
    String(feature.properties?.[field] ?? "").trim() === ""
  );
  check(blank.length === 0, `${field} kosong pada ${blank.length} feature BRT.`);
}

for (const field of ["GEOM_ID", "GlobalID"]) {
  const values = brtStops.features.map(feature => feature.properties?.[field]).filter(Boolean);
  check(new Set(values).size === values.length, `${field} tidak unik.`);
}

check(!JSON.stringify(brtStops).includes("Reguler"), "Ejaan STOP_ROLE lama masih ada pada BRT.");
check(!JSON.stringify(railStops).includes("Reguler"), "Ejaan STOP_ROLE lama masih ada pada rail.");
check(!JSON.stringify(railStops).includes("KA_BANDARA"), "Alias integrasi rail lama masih ada.");

const stopById = id => brtStops.features.find(feature => feature.properties?.STOP_ID === id)?.properties;
check(stopById("BRT215")?.SEQ_MAP?.includes("BRT_11:00"), "Perbaikan sequence BRT215 tidak ditemukan.");
check(stopById("BRT200")?.SEQ_MAP?.includes("BRT_16:22a"), "Perbaikan sequence BRT200 tidak ditemukan.");
check(Boolean(stopById("BRT146")?.SRC_NOTE), "Catatan sumber BRT146 belum terisi.");

notes.push(`${ids.length} ID HTML unik`);
notes.push(`${new Set(localReferences).size} referensi lokal tersedia`);
notes.push(`${brtStops.features.length} halte BRT tervalidasi`);
notes.push(`${brtRoutes.features.length} feature rute BRT tervalidasi`);
notes.push(`${railStops.features.length} stasiun rail tervalidasi`);

if (failures.length) {
  console.error("AUDIT GAGAL");
  failures.forEach(message => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log("AUDIT LULUS");
  notes.forEach(message => console.log(`- ${message}`));
}
