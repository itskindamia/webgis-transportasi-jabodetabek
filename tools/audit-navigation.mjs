import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJSON = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

const stops = readJSON('data/brt_stop.geojson').features ?? [];
const routeFeatures = readJSON('data/brt_route.geojson').features ?? [];

const clean = value => String(value ?? '').trim();
const splitList = value => clean(value).split(/[;,\n]+/).map(v => v.trim()).filter(Boolean);
const parseMap = value => {
  const result = new Map();
  clean(value).split(/[;\n]+/).map(v => v.trim()).filter(Boolean).forEach(item => {
    const index = item.indexOf(':');
    if (index < 0) return;
    result.set(item.slice(0, index).trim(), item.slice(index + 1).trim());
  });
  return result;
};

// Runtime v0.16 treats STOP_ID as the canonical logical-stop identity.
// STOP_GROUP is only a compatibility fallback when STOP_ID is absent.
const logicalKey = feature => {
  const p = feature?.properties ?? {};
  return clean(p.STOP_ID) || clean(p.STOP_GROUP) || clean(p.GEOM_ID);
};
const displayName = feature => {
  const p = feature?.properties ?? {};
  return clean(p.DISPLAY_NM) || clean(p.STOP_NAME) || logicalKey(feature);
};
const servesRoute = (feature, routeId) => splitList(feature?.properties?.ROUTES).includes(routeId);
const sequencePattern = /^\d+[A-Za-z]*$/;

const uniqueRouteIds = [...new Set(routeFeatures.map(f => clean(f?.properties?.ID)).filter(Boolean))];
const errors = [];
const warnings = [];
const summaries = [];

function auditField(routeId, features, field, strictDuplicates = true) {
  const sequenceToLogical = new Map();
  let filled = 0;
  for (const feature of features) {
    const sequence = parseMap(feature?.properties?.[field]).get(routeId) ?? '';
    if (!sequence) continue;
    filled += 1;
    if (!sequencePattern.test(sequence)) {
      errors.push(`${routeId} ${field}: sequence tidak valid "${sequence}" pada ${displayName(feature)}`);
      continue;
    }
    if (!sequenceToLogical.has(sequence)) sequenceToLogical.set(sequence, new Set());
    sequenceToLogical.get(sequence).add(logicalKey(feature));
  }
  for (const [sequence, logicalStops] of sequenceToLogical.entries()) {
    if (logicalStops.size > 1) {
      const message = `${routeId} ${field}: sequence ${sequence} dipakai ${logicalStops.size} halte logis berbeda (${Array.from(logicalStops).join(', ')})`;
      if (strictDuplicates) errors.push(message);
      else warnings.push(`${message}; diabaikan karena sequence directional tersedia.`);
    }
  }
  return filled;
}

for (const routeId of uniqueRouteIds) {
  const routeStops = stops.filter(feature => servesRoute(feature, routeId));
  const logicalStops = new Set(routeStops.map(logicalKey).filter(Boolean));
  if (logicalStops.size < 2) {
    errors.push(`${routeId}: hanya memiliki ${logicalStops.size} halte logis.`);
    continue;
  }

  const aMap = auditField(routeId, routeStops, 'SEQ_A_MAP');
  const bMap = auditField(routeId, routeStops, 'SEQ_B_MAP');
  const aOps = auditField(routeId, routeStops, 'SEQ_A_OPS');
  const bOps = auditField(routeId, routeStops, 'SEQ_B_OPS');
  const directionalCount = aMap + bMap + aOps + bOps;
  const legacy = auditField(routeId, routeStops, 'SEQ_MAP', directionalCount === 0);
  const schema = directionalCount ? 'directional/mixed' : 'legacy';

  if ((aMap > 0) !== (bMap > 0) && (aOps > 0) !== (bOps > 0)) {
    warnings.push(`${routeId}: sequence directional hanya terisi pada satu sisi; runtime memakai fallback per-feature.`);
  }
  if (!legacy && !directionalCount) errors.push(`${routeId}: tidak memiliki sequence navigasi.`);

  summaries.push({ routeId, logicalStops: logicalStops.size, schema, legacy, aMap, bMap, aOps, bOps });
}

if (errors.length) {
  console.error('AUDIT NAVIGASI GAGAL');
  errors.forEach(item => console.error(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log('AUDIT NAVIGASI LULUS');
  console.log(`- ${uniqueRouteIds.length} koridor BRT diperiksa`);
  console.log(`- ${summaries.reduce((sum, item) => sum + item.logicalStops, 0)} entri halte logis lintas-koridor diperiksa`);
  console.log('- Tidak ada benturan sequence antar-STOP_ID pada field navigasi yang terisi');
}
if (warnings.length) {
  console.log('CATATAN');
  warnings.forEach(item => console.log(`- ${item}`));
}
