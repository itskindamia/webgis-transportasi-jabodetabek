/* D4 — Selected-stop spatial integrations (desktop).
 * This is a presentation overlay, NOT a verified pedestrian routing layer.
 * The source of truth for destinations is the existing popup/panel DOM after
 * the integration target resolver and legacy target repair have run.
 */
(() => {
  "use strict";

  const desktop = matchMedia("(min-width: 1024px)");
  const preferenceKey = "webgis.showIntegrationOverlay";
  const checkbox = document.getElementById("tlShowIntegrationOverlay");
  const selectedInfo = document.getElementById("selectedStopInfo");
  if (!checkbox || !selectedInfo) return;

  try {
    checkbox.checked = localStorage.getItem(preferenceKey) !== "false";
  } catch {
    checkbox.checked = true;
  }

  function boot() {
    if (typeof map === "undefined" || !map?.on || typeof L === "undefined") return;

    for (const [name, zIndex] of [["tlIntegrationLinkPane", 465], ["tlIntegrationTargetPane", 640]]) {
      if (!map.getPane(name)) map.createPane(name);
      map.getPane(name).style.zIndex = String(zIndex);
    }

    // Both layer groups use Leaflet's existing map and stop coordinate system.
    const lines = L.layerGroup().addTo(map);
    const markers = L.layerGroup().addTo(map);
    const summary = document.createElement("div");
    summary.className = "tl-integration-map-summary leaflet-control";
    summary.hidden = true;
    summary.innerHTML = `
      <span class="tl-integration-map-count" role="status" aria-live="polite"></span>
      <button type="button" class="tl-integration-fit" title="Sesuaikan peta ke semua titik integrasi">Lihat semua</button>
      <span class="tl-integration-map-note">Garis relasi, bukan jalur pejalan kaki</span>
    `;
    map.getContainer().append(summary);
    L.DomEvent.disableClickPropagation(summary);
    L.DomEvent.disableScrollPropagation(summary);

    let refreshFrame = 0;
    let signature = "";
    let currentLocations = [];
    let visibleCount = 0;

    const stopFeature = key => typeof getStopByKey === "function" ? getStopByKey(key) : null;
    const stopName = feature => typeof getStopDisplayName === "function" ? getStopDisplayName(feature) : "Halte / stasiun";
    const safeText = value => String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

    const locationFor = feature => {
      const coordinates = feature?.geometry?.type === "Point"
        ? feature.geometry.coordinates : null;
      if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
      const [lng, lat] = coordinates.map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)
          || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      return L.latLng(lat, lng);
    };

    const validRoute = (feature, routeId) => {
      if (!feature || !routeId || typeof getRouteById !== "function") return false;
      const route = getRouteById(routeId);
      if (!route) return false;
      // Never visualize mismatched modes even when a legacy name resembles a stop.
      const a = String(feature.properties?.MODE || "").toUpperCase();
      const b = typeof getRouteMode === "function" ? String(getRouteMode(route)).toUpperCase() : "";
      return Boolean(a && a === b);
    };

    function activeRoot() {
      if (window.webgisLayout?.usesStopInfoPanel?.()) {
        return selectedInfo.querySelector(".stop-popup-ui");
      }
      return map._popup?.getElement()?.querySelector(".stop-popup-ui") || null;
    }

    function clear() {
      lines.clearLayers();
      markers.clearLayers();
      summary.hidden = true;
      currentLocations = [];
      visibleCount = 0;
    }

    function collect() {
      const key = String(typeof currentSelectedStopKey === "undefined"
        ? "" : (currentSelectedStopKey || ""));
      const route = String(typeof currentSelectedRouteId === "undefined"
        ? "" : (currentSelectedRouteId || ""));
      const feature = stopFeature(key);
      const root = activeRoot();
      const origin = locationFor(feature);
      if (!origin || !root || root.dataset.stopKey !== key) {
        return { key, route, origin: null, entries: [], unresolved: 0 };
      }

      const rows = Array.from(root.querySelectorAll(".integration-place-row"));
      const entries = [];
      const deduped = new Set();
      let unresolved = 0;

      for (const row of rows) {
        const targetKey = String(row.dataset.integrationStopKey || "");
        const targetRoute = String(row.dataset.integrationRouteId || "");
        const target = stopFeature(targetKey);
        const destination = locationFor(target);
        const disabled = row.matches(":disabled,[aria-disabled='true'],[data-webgis-integration-disabled='1']");
        if (!targetKey || !targetRoute || !destination || disabled || !validRoute(target, targetRoute)) {
          unresolved++;
          continue;
        }
        if (targetKey === key || origin.distanceTo(destination) < 2) continue;

        // A destination served by multiple lines is a single spatial location.
        const spatialKey = (target.properties?.STOP_ID || targetKey) + ":"
          + destination.lat.toFixed(5) + ":" + destination.lng.toFixed(5);
        if (deduped.has(spatialKey)) continue;
        deduped.add(spatialKey);
        entries.push({
          key: targetKey, route: targetRoute, feature: target, point: destination,
          mode: String(target.properties?.MODE || "").toUpperCase()
        });
      }
      return { key, route, origin, entries, unresolved };
    }

    function refresh() {
      refreshFrame = 0;
      if (!desktop.matches || !checkbox.checked) {
        signature = "";
        clear();
        return;
      }
      const selection = collect();
      const nextSignature = JSON.stringify([
        selection.key, selection.route,
        selection.entries.map(x => [x.key, x.route, x.point.lat, x.point.lng]),
        selection.unresolved
      ]);
      if (nextSignature === signature) return;
      signature = nextSignature;
      clear();
      if (!selection.origin || !selection.entries.length) return;

      const colors = {
        BRT: "#bf3b60", MRT: "#ce3068", LRT: "#23865f",
        KRL: "#329cbb", KA_BANDARA: "#62519a", ICT: "#7d8797"
      };
      for (const target of selection.entries) {
        const color = colors[target.mode] || "#485b73";
        const symbol = ({
          BRT: "B", MRT: "M", LRT: "L", KRL: "K",
          KA_BANDARA: "A", ICT: "KA"
        })[target.mode] || "•";
        const line = L.polyline([selection.origin, target.point], {
          pane: "tlIntegrationLinkPane",
          color: "#435367",
          weight: 2,
          opacity: 0.72,
          dashArray: "5 6",
          interactive: false
        }).addTo(lines);
        // Retain a reference to the line for diagnostics; never route along it.
        void line;

        const icon = document.createElement("span");
        icon.className = "tl-integration-target-symbol";
        icon.textContent = symbol;
        icon.style.setProperty("--tl-integration-color", color);
        const marker = L.marker(target.point, {
          pane: "tlIntegrationTargetPane",
          icon: L.divIcon({
            className: "tl-integration-target-marker",
            html: icon.outerHTML,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          }),
          keyboard: true,
          bubblingMouseEvents: false,
          riseOnHover: true,
          title: "Buka integrasi: " + stopName(target.feature)
        }).addTo(markers);
        marker.bindTooltip(safeText(stopName(target.feature)), {
          direction: "top", offset: [0, -18], opacity: 0.96,
          className: "tl-integration-target-tooltip"
        });
        marker.on("click", event => {
          if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
          if (typeof openNetworkIntegrationStop === "function") {
            openNetworkIntegrationStop(target.key, target.route);
          }
        });
        marker.on("mouseover", () => line.setStyle({ weight: 3, opacity: 0.95 }));
        marker.on("mouseout", () => line.setStyle({ weight: 2, opacity: 0.72 }));
      }
      visibleCount = selection.entries.length;
      currentLocations = [selection.origin, ...selection.entries.map(x => x.point)];
      summary.hidden = false;
      const countLabel = summary.querySelector(".tl-integration-map-count");
      countLabel.textContent = String(visibleCount) + " tujuan integrasi pada peta";
      if (selection.unresolved) {
        countLabel.title = String(selection.unresolved) + " relasi lain belum dapat dipetakan. Lihat popup/panel untuk informasi lengkap.";
      } else {
        countLabel.removeAttribute("title");
      }
    }

    function schedule() {
      if (!refreshFrame) refreshFrame = requestAnimationFrame(refresh);
    }

    summary.querySelector("button").addEventListener("click", () => {
      if (!currentLocations.length) return;
      map.fitBounds(L.latLngBounds(currentLocations).pad(0.18), {
        paddingTopLeft: [35, 100],
        paddingBottomRight: [35, 65],
        maxZoom: 16,
        animate: true,
        duration: 0.4
      });
    });

    checkbox.addEventListener("change", () => {
      try { localStorage.setItem(preferenceKey, String(checkbox.checked)); } catch { /* optional */ }
      signature = "";
      schedule();
    });

    const observerOptions = {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["data-integration-stop-key", "data-integration-route-id",
        "data-webgis-target-repaired", "disabled", "data-webgis-integration-disabled"]
    };
    const observer = new MutationObserver(schedule);
    observer.observe(selectedInfo, observerOptions);
    const popupPane = map.getPane("popupPane");
    if (popupPane) observer.observe(popupPane, observerOptions);

    map.on("popupopen popupclose", schedule);
    desktop.addEventListener?.("change", () => { signature = ""; schedule(); });

    // A selected stop may be restored from a permalink after data arrives.
    window.addEventListener("webgis:stop-selected", schedule);
    window.addEventListener("webgis:stop-cleared", schedule);

    window.webgisSpatialIntegrations = Object.freeze({
      get count() { return visibleCount; },
      get enabled() { return checkbox.checked && desktop.matches; }
    });
    schedule();
  }

  window.addEventListener("webgis:map-ready", boot, { once: true });
})();
