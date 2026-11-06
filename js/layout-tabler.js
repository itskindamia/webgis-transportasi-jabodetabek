/* Layout adapter only. The network engine and source data remain unchanged. */
(() => {
  const byId = id => document.getElementById(id);
  const body = document.body;
  const mobile = () => matchMedia("(max-width: 760px)").matches;
  const tablet = () => matchMedia("(min-width: 761px) and (max-width: 1099px)").matches;
  const detail = byId("tlDetailPanel");
  let ready = false;
  let resizeFrame = 0;
  let syncFrame = 0;
  let lastRoute = "";
  let lastStop = "";
  let lastTablet = tablet();
  let modeSignature = "";

  function resizeMap() {
    if (!ready || resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      // Leaflet's pixel pan compensates for the new container size and keeps
      // the center (within Leaflet's pixel rounding) and zoom. Do not refit
      // when closing chrome.
      map.invalidateSize({ animate: false, pan: true, debounceMoveend: true });
      syncAttribution();
    });
  }

  function setTab(name) {
    if (name === "selected" && byId("selectedStopInfo").hidden) name = "stops";
    detail.dataset.tab = name;
    document.querySelectorAll(".tl-detail-tabs [data-tab]").forEach(button => {
      const active = button.dataset.tab === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }

  function setDetailExpanded(expanded) {
    body.classList.toggle("tl-detail-expanded", expanded);
    byId("tlDetailExpand").setAttribute("aria-expanded", String(expanded));
    byId("tlDetailExpand").setAttribute("aria-label", expanded ? "Perkecil panel detail" : "Perbesar panel detail");
  }

  function setDetail(open, { focus = false } = {}) {
    if (open && mobile() && ready) {
      setMobileFilterOpen(false);
      setMobileInfoOpen(false);
      setBasemapPanelOpen(false);
    }
    if (open && tablet() && ready) setDesktopPanelCollapsed("left", true);
    body.classList.toggle("tl-detail-open", open);
    if (!open) setDetailExpanded(false);
    detail.inert = !open;
    for (const id of ["tlDetailsToggle", "tlMobileDetails"]) {
      byId(id).setAttribute("aria-expanded", String(open));
    }
    if (focus && open) byId("tlDetailClose").focus({ preventScroll: true });
    resizeMap();
  }

  function syncPanelControls() {
    const networkOpen = mobile()
      ? body.classList.contains("mobile-filter-open")
      : !body.classList.contains("left-panel-collapsed");
    const legendOpen = mobile()
      ? body.classList.contains("mobile-info-open")
      : body.classList.contains("tl-legend-open");
    byId("filterPanel").inert = !networkOpen;
    byId("rightInfoPanel").inert = !legendOpen;
    byId("tlNetworkToggle").setAttribute("aria-expanded", String(networkOpen));
    byId("tlLegendToggle").setAttribute("aria-expanded", String(legendOpen));
    if (ready) requestAnimationFrame(syncAttribution);
  }

  function syncAttribution() {
    const attribution = map.attributionControl?.getContainer();
    if (!attribution) return;
    let bottom = 0;
    if (mobile()) {
      for (const id of ["filterPanel", "rightInfoPanel", "basemapPanel", "tlDetailPanel"]) {
        const panel = byId(id);
        if (!panel.hidden && getComputedStyle(panel).display !== "none") bottom = Math.max(bottom, panel.getBoundingClientRect().height + 16);
      }
    }
    // Keep the original provider credits visible above mobile sheets.
    attribution.style.marginBottom = `${bottom}px`;
    attribution.style.maxWidth = mobile() ? `${innerWidth - 24}px` : "";
    attribution.style.marginRight = mobile() ? "12px" : "";
  }

  function toggleNetwork() {
    if (!ready) return;
    if (mobile()) setMobileFilterOpen(!body.classList.contains("mobile-filter-open"));
    else setDesktopPanelCollapsed("left", !body.classList.contains("left-panel-collapsed"));
  }

  function toggleLegend() {
    if (!ready) return;
    if (mobile()) setMobileInfoOpen(!body.classList.contains("mobile-info-open"));
    else {
      const open = !body.classList.contains("tl-legend-open");
      body.classList.toggle("tl-legend-open", open);
      if (open) setBasemapPanelOpen(false);
      syncPanelControls();
      if (open) byId("mobileInfoClose").focus({ preventScroll: true });
    }
  }

  byId("tlNetworkToggle").addEventListener("click", toggleNetwork);
  byId("tlNetworkCollapse").addEventListener("click", () => {
    if (ready) setDesktopPanelCollapsed("left", true);
    byId("tlNetworkToggle").focus({ preventScroll: true });
  });
  byId("tlLegendToggle").addEventListener("click", toggleLegend);
  for (const id of ["tlDetailsToggle", "tlMobileDetails"]) {
    byId(id).addEventListener("click", () => setDetail(!body.classList.contains("tl-detail-open"), { focus: true }));
  }
  byId("tlDetailClose").addEventListener("click", () => {
    setDetail(false);
    byId(mobile() ? "tlMobileDetails" : "tlDetailsToggle").focus({ preventScroll: true });
  });
  byId("tlDetailExpand").addEventListener("click", () => {
    setDetailExpanded(!body.classList.contains("tl-detail-expanded"));
  });
  for (const id of ["tlAbout", "tlNetworkAbout"]) {
    byId(id).addEventListener("click", () => { if (ready) setInfoModalOpen(true); });
  }
  document.querySelectorAll(".tl-detail-tabs [data-tab]").forEach(button => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
    button.addEventListener("keydown", event => {
      const buttons = [...document.querySelectorAll(".tl-detail-tabs [data-tab]:not(:disabled)")];
      const index = buttons.indexOf(button);
      let target;
      if (event.key === "ArrowRight") target = buttons[(index + 1) % buttons.length];
      if (event.key === "ArrowLeft") target = buttons[(index - 1 + buttons.length) % buttons.length];
      if (event.key === "Home") target = buttons[0];
      if (event.key === "End") target = buttons.at(-1);
      if (!target) return;
      event.preventDefault();
      target.click();
      target.focus();
    });
  });

  function syncModes() {
    const select = byId("modeSelect");
    const signature = [...select.options].map(option => `${option.value}:${option.text}:${option.disabled}`).join("|");
    if (signature !== modeSignature) {
      modeSignature = signature;
      const colors = { BRT: "#d63939", MRT: "#206bc4", LRT: "#2fb344", KRL: "#f59f00" };
      byId("tlModeChoices").replaceChildren(...[...select.options].map(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tl-mode-button";
        button.dataset.mode = option.value;
        button.disabled = option.disabled;
        const dot = document.createElement("span");
        dot.className = "tl-mode-dot";
        dot.setAttribute("aria-hidden", "true");
        dot.style.setProperty("--mode-color", colors[option.value] || "#206bc4");
        button.append(dot, document.createTextNode(option.value === "ALL" ? "Semua layanan" : option.text));
        button.addEventListener("click", () => {
          if (select.value === option.value) return;
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          scheduleSync();
        });
        return button;
      }));
    }
    byId("tlModeChoices").querySelectorAll("button").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === select.value));
    });
  }

  function syncContent() {
    syncFrame = 0;
    syncModes();
    const route = String(currentSelectedRouteId || "");
    const stop = String(currentSelectedStopKey || "");
    const routeChanged = route !== lastRoute;
    const stopChanged = stop !== lastStop;
    const selected = !byId("selectedStopInfo").hidden;
    // A newly selected stop needs room for its map popup above the sheet.
    if (mobile() && stopChanged && selected) setDetailExpanded(false);
    byId("tlTabSelected").disabled = !selected;
    const option = byId("routeSelect").selectedOptions[0];
    const heading = byId("routeInfo").querySelector(".route-title, h2");
    const selectedHeading = byId("selectedStopInfo").querySelector(".selected-stop-title, .selected-stop-name, .stop-name, h3, h2");
    const count = new Set(getFilteredRoutes().map(getRouteId)).size;
    const status = byId("statusSelect").selectedOptions[0]?.text || "";
    const mode = byId("modeSelect").selectedOptions[0]?.text || "Semua layanan";
    byId("tlVisibleCount").textContent = `${count} lin / koridor pada filter aktif`;
    byId("tlMapContext").textContent = route ? (option?.text || heading?.textContent || route) : mode;
    byId("tlMapStatus").textContent = status;
    byId("tlTabStops").textContent = ["ALL", "BRT"].includes(byId("modeSelect").value) ? "Daftar halte" : "Daftar stasiun";
    byId("tlDetailEyebrow").textContent = route ? "DETAIL JARINGAN" : "JARINGAN JABODETABEK";
    byId("tlDetailTitle").textContent = route ? (heading?.textContent.trim() || option?.text || route) : "Jelajahi jaringan";
    byId("tlDetailSubtitle").textContent = route
      ? (selected && selectedHeading ? selectedHeading.textContent.trim() : "Rute, daftar halte, dan integrasi")
      : "Pilih lin atau koridor untuk melihat detail.";
    if (routeChanged) {
      if (route) {
        setTab(selected ? "selected" : "stops");
        setDetail(true);
        if (!stop) requestAnimationFrame(() => {
          resizeMap();
          requestAnimationFrame(() => {
            if (currentSelectedRouteId === route && !currentSelectedStopKey) fitRouteToScreen({ animate: false });
          });
        });
      } else {
        setTab("route");
        setDetail(false);
      }
    } else if (stopChanged && selected) {
      setTab("selected");
      setDetail(true);
    } else if (!selected && detail.dataset.tab === "selected") setTab("stops");
    lastRoute = route;
    lastStop = stop;
    syncPanelControls();
  }

  function scheduleSync() {
    if (!syncFrame) syncFrame = requestAnimationFrame(syncContent);
  }

  // Padding reflects the map's actual container, rather than the viewport.
  function mapPadding() {
    const rect = byId("map").getBoundingClientRect();
    let left = 20, top = 70, right = 60, bottom = 72;
    if (mobile()) {
      left = 16; right = 16; top = 108; bottom = 28;
      if (body.classList.contains("tl-detail-open")) {
        bottom = Math.min(rect.height * .55, byId("tlDetailPanel").getBoundingClientRect().height + 24);
      }
    } else if (tablet()) {
      if (!body.classList.contains("left-panel-collapsed")) left = 312;
      if (body.classList.contains("tl-detail-open")) right = 352;
      // Only one side overlay is opened at a time, leaving usable map space.
    }
    return { paddingTopLeft: [left, top], paddingBottomRight: [right, bottom] };
  }

  window.addEventListener("webgis:map-ready", () => {
    if (ready) return;
    ready = true;

    // Retire the previous shell's measurements without modifying map.js.
    layoutDesktopRightCards = () => {};
    const clearOldMeasurements = () => {
      byId("globalSearchPanel").style.removeProperty("top");
      byId("rightInfoPanel").querySelector(".right-info-body").style.removeProperty("margin-top");
    };
    clearOldMeasurements();
    requestAnimationFrame(clearOldMeasurements);
    getRouteFitPadding = mapPadding;
    getStopPopupOptions = () => {
      const size = map.getSize();
      const padding = mapPadding();
      if (mobile()) {
        // Reserve the control rail and the visible provider credits as well
        // as the sheet. They must not cover popup actions.
        padding.paddingBottomRight[0] = 60;
        const credits = map.attributionControl?.getContainer();
        if (credits) padding.paddingBottomRight[1] = Math.max(
          padding.paddingBottomRight[1],
          (Number.parseFloat(credits.style.marginBottom) || 0) + credits.getBoundingClientRect().height + 12
        );
      }
      const availableWidth = size.x - padding.paddingTopLeft[0] - padding.paddingBottomRight[0];
      const maxWidth = Math.min(330, Math.max(200, availableWidth - 12));
      return {
        maxWidth, minWidth: Math.min(245, maxWidth),
        maxHeight: Math.min(540, Math.max(150, size.y - padding.paddingTopLeft[1] - padding.paddingBottomRight[1] - 28)),
        autoPan: true, keepInView: true, ...{
          autoPanPaddingTopLeft: padding.paddingTopLeft,
          autoPanPaddingBottomRight: padding.paddingBottomRight
        }
      };
    };
    setDesktopPanelCollapsed = (side, collapsed) => {
      if (side !== "left" || mobile()) return;
      if (!collapsed && tablet()) setDetail(false);
      body.classList.toggle("left-panel-collapsed", Boolean(collapsed));
      byId("leftPanelCollapse").hidden = Boolean(collapsed);
      byId("leftPanelRestore").hidden = !collapsed;
      syncPanelControls();
      resizeMap();
    };
    const originalFilter = setMobileFilterOpen;
    const originalInfo = setMobileInfoOpen;
    const originalBasemap = setBasemapPanelOpen;
    setMobileFilterOpen = open => {
      if (open && mobile()) setDetail(false);
      originalFilter(open);
      syncPanelControls();
      resizeMap();
    };
    setMobileInfoOpen = open => {
      if (open && mobile()) setDetail(false);
      if (!mobile()) body.classList.toggle("tl-legend-open", Boolean(open));
      originalInfo(open);
      syncPanelControls();
      resizeMap();
    };
    setBasemapPanelOpen = open => {
      if (open && mobile()) setDetail(false);
      if (open) body.classList.remove("tl-legend-open");
      originalBasemap(open);
      syncPanelControls();
      resizeMap();
    };
    setRouteDetailCollapsed(false, { persist: false });
    setTab("route");
    if (tablet()) setDesktopPanelCollapsed("left", true);

    const contentObserver = new MutationObserver(scheduleSync);
    for (const id of ["routeInfo", "selectedStopInfo", "stopList", "modeSelect", "routeSelect", "statusSelect"]) {
      contentObserver.observe(byId(id), { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    }
    for (const id of ["modeSelect", "routeSelect", "statusSelect"]) byId(id).addEventListener("change", scheduleSync);
    const revealStopPopup = event => {
      if (!mobile() || !event.target.closest(".stop-list-item[data-stop-key]")) return;
      if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
      // The engine may reuse an already open popup when selecting the same
      // stop, so popupopen and a changed selection key are not guaranteed.
      setDetailExpanded(false);
      syncAttribution();
    };
    byId("stopList").addEventListener("click", revealStopPopup, true);
    byId("stopList").addEventListener("keydown", revealStopPopup, true);
    new ResizeObserver(resizeMap).observe(byId("map"));
    const sheetObserver = new ResizeObserver(() => requestAnimationFrame(syncAttribution));
    for (const id of ["filterPanel", "rightInfoPanel", "basemapPanel", "tlDetailPanel"]) sheetObserver.observe(byId(id));
    map.on("popupopen", ({ popup }) => {
      if (!popup.getElement()?.querySelector(".stop-popup")) return;
      if (mobile()) {
        // Reselecting the same stop also needs a visible map popup.
        setDetailExpanded(false);
        syncAttribution();
      }
      const { autoPan, keepInView, ...dimensions } = getStopPopupOptions();
      // Preserve the engine's navigation-specific autoPan setting.
      Object.assign(popup.options, dimensions);
      popup.update();
    });
    window.addEventListener("resize", () => {
      if (tablet() !== lastTablet) {
        lastTablet = tablet();
        if (tablet()) setDesktopPanelCollapsed("left", true);
      }
      syncPanelControls();
      resizeMap();
    });
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (body.classList.contains("mobile-filter-open")) setMobileFilterOpen(false);
      else if (body.classList.contains("mobile-info-open") || body.classList.contains("tl-legend-open")) setMobileInfoOpen(false);
      else if (!byId("basemapPanel").hidden) setBasemapPanelOpen(false);
      else if (detail.contains(document.activeElement)) {
        setDetail(false);
        byId(mobile() ? "tlMobileDetails" : "tlDetailsToggle").focus();
      }
    });
    scheduleSync();
    resizeMap();
    document.documentElement.dataset.layoutReady = "true";
  });
})();
