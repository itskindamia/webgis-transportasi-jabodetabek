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
    let visibleTargets = [];
    let overviewActive = false;
    let overviewStopKey = "";
    let cameraBeforeOverview = null;

    // Overview is explicitly chosen, so the normal station-selection camera
    // remains untouched until the user clicks "Lihat semua".
    function setOverview(active) {
      overviewActive = Boolean(active);
      map.getContainer().classList.toggle("tl-d4-integration-overview", overviewActive);
      const button = summary.querySelector(".tl-integration-fit");
      button.textContent = overviewActive ? "Kembali ke popup" : "Lihat semua";
      button.title = overviewActive
        ? "Kembali ke detail halte atau stasiun"
        : "Sesuaikan peta ke semua titik integrasi";
      button.setAttribute("aria-pressed", String(overviewActive));
      if (!overviewActive) {
        overviewStopKey = "";
        cameraBeforeOverview = null;
      }
    }

    const stopFeature = key => typeof getStopByKey === "function" ? getStopByKey(key) : null;
    const stopName = feature => typeof getStopDisplayName === "function" ? getStopDisplayName(feature) : "Halte / stasiun";
    const safeText = value => String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

    // Name-based resolution is permitted only for a single distinct physical
    // stop of the same mode; similar names (Cawang Baru, Cawang Sentral) never
    // qualify. Keep 0.1 m precision so nearby platforms are not conflated.
    const plainName = value => String(value ?? "").trim().toLowerCase()
      .replace(/^(halte|stasiun)\s+/, "").replace(/\s+/g, " ").trim();
    function nameIsUnique(row, target) {
      if (typeof stopData === "undefined" || !Array.isArray(stopData?.features)) return false;
      const requested = plainName(row.querySelector(".integration-place-name")?.textContent);
      const resolved = plainName(stopName(target));
      if (!requested || requested !== resolved) return false;
      const targetMode = String(target.properties?.MODE || "").toUpperCase();
      const locations = new Set();
      for (const feature of stopData.features) {
        if (String(feature.properties?.MODE || "").toUpperCase() !== targetMode) continue;
        if (plainName(stopName(feature)) !== resolved) continue;
        const coordinates = feature.geometry?.coordinates;
        if (feature.geometry?.type !== "Point" || !Array.isArray(coordinates)) continue;
        locations.add(Number(coordinates[0]).toFixed(6) + "," + Number(coordinates[1]).toFixed(6));
      }
      return locations.size === 1;
    }

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
      visibleTargets = [];
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
        const basis = String(row.dataset.integrationBasis || "");
        const verified = basis === "int_stop" || (basis === "name" && nameIsUnique(row, target));
        if (!targetKey || !targetRoute || !destination || disabled || !verified || !validRoute(target, targetRoute)) {
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
          mode: String(target.properties?.MODE || "").toUpperCase(), basis
        });
      }
      return { key, route, origin, entries, unresolved };
    }

    function refresh() {
      refreshFrame = 0;
      if (!desktop.matches || !checkbox.checked) {
        signature = "";
        setOverview(false);
        clear();
        return;
      }
      const selection = collect();
      if (overviewActive && (selection.key !== overviewStopKey
        || !selection.origin || window.webgisLayout?.usesStopInfoPanel?.())) {
        // Selecting another station or changing to Panel mode must never
        // leave a newly opened popup hidden behind the prior overview.
        setOverview(false);
      }
      const nextSignature = JSON.stringify([
        selection.key, selection.route,
        selection.entries.map(x => [x.key, x.route, x.point.lat, x.point.lng, x.basis]),
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
        const near = selection.origin.distanceTo(target.point) < 40;
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
            className: "tl-integration-target-marker" + (near ? " is-near-origin" : ""),
            html: icon.outerHTML,
            iconSize: [30, 30],
            // Offset ONLY the icon, not target.point or its relationship line.
            // Cawang's LRT and TJ stops are approximately 9 m apart.
            iconAnchor: near ? [-35, -25] : [15, 15],
            tooltipAnchor: near ? [50, 40] : [0, 0]
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
      visibleTargets = selection.entries.map(x => ({
        key: x.key, route: x.route, mode: x.mode, basis: x.basis
      }));
      currentLocations = [selection.origin, ...selection.entries.map(x => x.point)];
      summary.hidden = false;
      const countLabel = summary.querySelector(".tl-integration-map-count");
      countLabel.textContent = String(visibleCount) + " lokasi tujuan terpetakan"
        + (selection.unresolved ? " · " + String(selection.unresolved) + " belum terpetakan" : "");
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
      if (overviewActive) {
        const previous = cameraBeforeOverview;
        setOverview(false);
        if (previous) {
          map.flyTo(previous.center, previous.zoom, { animate: true, duration: 0.4 });
        }
        return;
      }
      if (!window.webgisLayout?.usesStopInfoPanel?.()) {
        // Do not remove the popup from the DOM: it provides the resolved,
        // selected-stop integration data. Temporarily hide only its pixels,
        // so all destination markers are clickable in the fit view.
        cameraBeforeOverview = { center: map.getCenter(), zoom: map.getZoom() };
        overviewStopKey = String(currentSelectedStopKey || "");
        setOverview(true);
      }
      map.fitBounds(L.latLngBounds(currentLocations).pad(0.18), {
        paddingTopLeft: [70, 100],
        paddingBottomRight: [70, 80],
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
        "data-integration-basis", "data-webgis-target-repaired", "disabled", "data-webgis-integration-disabled"]
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
      get linkCount() { return lines.getLayers().length; },
      get targets() { return visibleTargets.map(target => ({ ...target })); },
      get overviewActive() { return overviewActive; },
      get enabled() { return checkbox.checked && desktop.matches; }
    });
    schedule();
  }

  window.addEventListener("webgis:map-ready", boot, { once: true });
})();
