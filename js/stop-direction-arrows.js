/* One-way BRT stop bearings, derived from actual route geometry.
   This module is intentionally pure and does not edit GeoJSON or Leaflet state.
   Direction is inferred only if destination, sequence, and local tangent agree. */
(function (scope) {
  "use strict";

  function parseSequence(raw) {
    const match = String(raw ?? "").trim().toLowerCase().match(/^(\d+)([a-z]*)$/);
    if (!match) return NaN;
    let suffix = 0;
    for (const letter of match[2]) suffix = suffix * 26 + letter.charCodeAt(0) - 96;
    return Number(match[1]) + suffix / 1000;
  }

  function calculate(records, routeFeatures) {
    const output = new Map();
    if (!Array.isArray(records) || !Array.isArray(routeFeatures)) return output;

    const metresPerDegree = 111320;
    const longitudeScale = metresPerDegree * Math.cos(-6.2 * Math.PI / 180);
    const project = ({ lng, lat }) => ({
      x: lng * longitudeScale,
      y: lat * metresPerDegree
    });

    const segments = [];
    for (const feature of routeFeatures) {
      const geometry = feature?.geometry;
      const lines = geometry?.type === "LineString" ? [geometry.coordinates] :
        geometry?.type === "MultiLineString" ? geometry.coordinates : [];
      for (const coordinates of lines) {
        for (let i = 1; i < coordinates.length; i++) {
          const from = coordinates[i - 1];
          const to = coordinates[i];
          if (!Array.isArray(from) || !Array.isArray(to)) continue;
          const ax = Number(from[0]) * longitudeScale;
          const ay = Number(from[1]) * metresPerDegree;
          const vx = (Number(to[0]) - Number(from[0])) * longitudeScale;
          const vy = (Number(to[1]) - Number(from[1])) * metresPerDegree;
          const len2 = vx * vx + vy * vy;
          if (Number.isFinite(len2) && len2 >= .25) {
            segments.push({ ax, ay, vx, vy, len2 });
          }
        }
      }
    }
    if (!segments.length) return output;

    const groups = new Map();
    for (const record of records) {
      const sequence = parseSequence(record.sequence);
      const { id, destination, side, lat, lng } = record;
      if (!id || !destination || !Number.isFinite(sequence) ||
          !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const groupKey = destination + ":" + (side || "legacy");
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push({ id, destination, side, lat, lng, sequence });
    }

    for (const group of groups.values()) {
      group.sort((a, b) => a.sequence - b.sequence);
      for (let i = 0; i < group.length; i++) {
        const point = group[i];
        const previous = group[i - 1];
        const next = group[i + 1];
        if (!previous && !next) continue;

        const from = project(previous || point);
        const to = project(next || point);
        const travelX = to.x - from.x;
        const travelY = to.y - from.y;
        const travelLength = Math.hypot(travelX, travelY);
        // Missing neighbors, implausible gaps or duplicate coordinates: no arrow.
        if (travelLength < 8 || travelLength > 7500) continue;

        const position = project(point);
        let nearest = null;
        let minDistance2 = Infinity;
        for (const segment of segments) {
          const dx = position.x - segment.ax;
          const dy = position.y - segment.ay;
          const fraction = Math.max(0, Math.min(1,
            (dx * segment.vx + dy * segment.vy) / segment.len2));
          const offsetX = dx - fraction * segment.vx;
          const offsetY = dy - fraction * segment.vy;
          const distance2 = offsetX * offsetX + offsetY * offsetY;
          if (distance2 < minDistance2) {
            minDistance2 = distance2;
            nearest = segment;
          }
        }
        if (!nearest || minDistance2 > 85 * 85) continue;

        const dot = (nearest.vx * travelX + nearest.vy * travelY) /
          Math.sqrt(nearest.len2) / travelLength;
        // The local route tangent must agree with the stop order sufficiently.
        if (Math.abs(dot) < .2) continue;

        const sign = dot >= 0 ? 1 : -1;
        const bearing = (Math.atan2(nearest.vx * sign, nearest.vy * sign) *
          180 / Math.PI + 360) % 360;
        output.set(point.id, {
          bearing: Math.round(bearing * 10) / 10,
          destination: point.destination,
          distanceMetres: Math.round(Math.sqrt(minDistance2) * 10) / 10
        });
      }
    }
    return output;
  }

  scope.webgisOneWayStopArrows = Object.freeze({ calculate, parseSequence });
})(typeof window !== "undefined" ? window : globalThis);
