import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const readJSON = relative =>
  JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

const stops = readJSON('data/brt_stop.geojson').features ?? [];
const routeFeatures = readJSON('data/brt_route.geojson').features ?? [];

const splitList = value =>
  String(value ?? '')
    .split(/[;,\n]+/)
    .map(item => item.trim())
    .filter(Boolean);

const parseMap = value => {
  const result = new Map();
  String(value ?? '')
    .split(/[;\n]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .forEach(item => {
      const index = item.indexOf(':');
      if (index < 0) return;
      result.set(
        item.slice(0, index).trim(),
        item.slice(index + 1).trim()
      );
    });
  return result;
};

const logicalKey = feature => {
  const p = feature?.properties ?? {};
  return String(p.STOP_GROUP || p.STOP_ID || '').trim();
};

const displayName = feature => {
  const p = feature?.properties ?? {};
  return String(p.DISPLAY_NM || p.STOP_NAME || p.STOP_ID || '').trim();
};

const servesRoute = (feature, routeId) =>
  splitList(feature?.properties?.ROUTES).includes(routeId);

const sequencePattern = /^\d+[A-Za-z]*$/;

const uniqueRouteIds = [];
for (const feature of routeFeatures) {
  const routeId = String(feature?.properties?.ID ?? '').trim();
  if (routeId && !uniqueRouteIds.includes(routeId)) {
    uniqueRouteIds.push(routeId);
  }
}

const errors = [];
const warnings = [];
const summaries = [];

function auditField(routeId, features, field) {
  const sequenceToLogical = new Map();
  let filled = 0;

  for (const feature of features) {
    const sequence = parseMap(feature?.properties?.[field]).get(routeId) ?? '';
    if (!sequence) continue;

    filled += 1;

    if (!sequencePattern.test(sequence)) {
      errors.push(
        `${routeId} ${field}: sequence tidak valid "${sequence}" pada ${displayName(feature)}`
      );
      continue;
    }

    if (!sequenceToLogical.has(sequence)) {
      sequenceToLogical.set(sequence, new Set());
    }
    sequenceToLogical.get(sequence).add(logicalKey(feature));
  }

  for (const [sequence, logicalStops] of sequenceToLogical.entries()) {
    if (logicalStops.size > 1) {
      errors.push(
        `${routeId} ${field}: sequence ${sequence} dipakai ${logicalStops.size} halte logis berbeda (${Array.from(logicalStops).join(', ')})`
      );
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

  const aCount = auditField(routeId, routeStops, 'SEQ_A_MAP');
  const bCount = auditField(routeId, routeStops, 'SEQ_B_MAP');
  const legacyCount = auditField(routeId, routeStops, 'SEQ_MAP');

  const schema = aCount || bCount ? 'directional/mixed' : 'legacy';

  if ((aCount > 0) !== (bCount > 0)) {
    warnings.push(
      `${routeId}: hanya satu sisi SEQ_A_MAP/SEQ_B_MAP yang terisi; runtime akan memakai fallback per-feature.`
    );
  }

  if (!legacyCount && !aCount && !bCount) {
    errors.push(`${routeId}: tidak memiliki sequence navigasi.`);
  }

  summaries.push({
    routeId,
    logicalStops: logicalStops.size,
    schema,
    legacyCount,
    aCount,
    bCount
  });
}

if (errors.length) {
  console.error('AUDIT NAVIGASI GAGAL');
  errors.forEach(item => console.error(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log('AUDIT NAVIGASI LULUS');
  console.log(`- ${uniqueRouteIds.length} koridor BRT diperiksa`);
  console.log(`- ${summaries.reduce((sum, item) => sum + item.logicalStops, 0)} entri halte logis lintas-koridor diperiksa`);
  console.log('- Tidak ada benturan sequence antarhalte logis pada field navigasi yang terisi');
}

if (warnings.length) {
  console.log('CATATAN');
  warnings.forEach(item => console.log(`- ${item}`));
}
