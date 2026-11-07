/* Layout adapter only. The network engine and source data remain unchanged. */
(() => {
  const byId = id => document.getElementById(id);
  const body = document.body;
  const mobile = () => matchMedia("(max-width: 767px)").matches;
  const tablet = () => matchMedia("(min-width: 768px) and (max-width: 1023px)").matches;
  const detail = byId("tlDetailPanel");
  let ready = false;
  let resizeFrame = 0;
  let syncFrame = 0;
  let lastRoute = "";
  let lastStop = "";
  let lastTablet = tablet();
  let modeSignature = "";
  let stopPopup = null;
  let detailsOverPopup = false;
  let shelvedAutoPan = null;
  let sheetPosition = "half";
  let viewportFrame = 0;
  let attributionFrame = 0;
  let fullViewportHeight = innerHeight;
  let previousViewportWidth = innerWidth;
  let popupLayoutSignature = "";

  function refreshPopupLayout() {
    if (!ready || !stopPopup?.isOpen() || detailsOverPopup || body.classList.contains("tl-popup-shelved")) return;
    const { autoPan, keepInView, ...dimensions } = getStopPopupOptions();
    const signature = JSON.stringify(dimensions);
    if (signature === popupLayoutSignature) return;
    popupLayoutSignature = signature;
    stopPopup.getElement()?.style.setProperty("--tl-popup-content-height", `${dimensions.maxHeight}px`);
    Object.assign(stopPopup.options, dimensions);
    stopPopup.update();
  }

  function queueAttribution() {
    if (!ready || attributionFrame) return;
    attributionFrame = requestAnimationFrame(() => { attributionFrame = 0; syncAttribution(); });
  }

  function updateViewport() {
    viewportFrame = 0;
    const viewport = window.visualViewport;
    const height = Math.round(viewport?.height || innerHeight);
    const focused = document.activeElement === byId("globalSearchInput");
    if (Math.abs(innerWidth - previousViewportWidth) > 40) fullViewportHeight = height;
    else if (!focused) fullViewportHeight = Math.max(height, innerHeight);
    previousViewportWidth = innerWidth;
    const keyboard = mobile() && focused && height < fullViewportHeight - 140;
    const root = document.documentElement;
    const values = { "--tl-viewport-height": `${height}px`, "--tl-viewport-top": `${viewport?.scale === 1 ? Math.round(viewport.offsetTop) : 0}px` };
    for (const [name, value] of Object.entries(values)) if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    body.classList.toggle("tl-keyboard-open", keyboard);
    body.classList.toggle("tl-short-viewport", mobile() && height < 560);
    body.classList.toggle("tl-short-landscape", innerWidth <= 1023 && innerWidth > height && height < 560);
    if (ready) { syncPopupPresentation(); resizeMap(); }
  }

  function queueViewport() {
    if (!viewportFrame) viewportFrame = requestAnimationFrame(updateViewport);
  }
  window.visualViewport?.addEventListener("resize", queueViewport);
  window.visualViewport?.addEventListener("scroll", queueViewport);
  window.addEventListener("resize", queueViewport);
  byId("globalSearchInput").addEventListener("focus", queueViewport);
  byId("globalSearchInput").addEventListener("blur", queueViewport);
  updateViewport();

  function syncPopupPresentation() {
    const compactLandscape = body.classList.contains("tl-short-landscape");
    const open = Boolean((mobile() || compactLandscape) && stopPopup?.isOpen());
    const overlay = body.classList.contains("mobile-filter-open") || body.classList.contains("mobile-info-open") || body.classList.contains("tl-keyboard-open") || (compactLandscape && body.classList.contains("tl-legend-open")) || !byId("basemapPanel").hidden;
    const shelved = open && (detailsOverPopup || overlay);
    const element = stopPopup?.getElement();
    body.classList.toggle("tl-stop-popup-open", open);
    body.classList.toggle("tl-popup-shelved", shelved);
    if (element) {
      element.inert = shelved;
      element.setAttribute("aria-hidden", String(shelved));
      if (shelved && shelvedAutoPan === null) {
        shelvedAutoPan = stopPopup.options.autoPan;
        stopPopup.options.autoPan = false;
      } else if (!shelved && shelvedAutoPan !== null) {
        stopPopup.options.autoPan = shelvedAutoPan;
        shelvedAutoPan = null;
      }
    }
    queueAttribution();
  }

  function revealPopup() {
    detailsOverPopup = false;
    syncPopupPresentation();
    resizeMap();
  }

  function showPopupDetails() {
    detailsOverPopup = true;
    setDetail(true);
    setDetailExpanded(true);
    syncPopupPresentation();
    byId("tlDetailClose").focus({ preventScroll: true });
  }

  function resizeMap() {
    if (!ready || resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      // Leaflet's pixel pan compensates for the new container size and keeps
      // the center (within Leaflet's pixel rounding) and zoom. Do not refit
      // when closing chrome.
      const element = byId("map"), size = map.getSize();
      if (size.x !== element.clientWidth || size.y !== element.clientHeight) {
        map.invalidateSize({ animate: false, pan: true, debounceMoveend: true });
      }
      syncAttribution();
      refreshPopupLayout();
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
    setSheetPosition(expanded ? "expanded" : "half");
  }

  function setSheetPosition(position) {
    sheetPosition = ["collapsed", "half", "expanded"].includes(position) ? position : "half";
    const expanded = sheetPosition === "expanded";
    detail.dataset.sheetPosition = sheetPosition;
    body.classList.toggle("tl-detail-expanded", expanded);
    body.classList.toggle("tl-sheet-collapsed", sheetPosition === "collapsed");
    byId("tlDetailExpand").setAttribute("aria-expanded", String(expanded));
    byId("tlDetailExpand").setAttribute("aria-label", expanded ? "Perkecil panel detail" : "Perbesar panel detail");
    for (const [id, value] of [["tlDetailCollapse", "collapsed"], ["tlDetailHalf", "half"], ["tlDetailExpand", "expanded"]]) byId(id)?.setAttribute("aria-pressed", String(sheetPosition === value));
    queueAttribution();
  }

  function setDetail(open, { focus = false } = {}) {
    if (open && mobile() && ready) {
      setMobileFilterOpen(false);
      setMobileInfoOpen(false);
      setBasemapPanelOpen(false);
    }
    if (open && tablet() && ready) setDesktopPanelCollapsed("left", true);
    body.classList.toggle("tl-detail-open", open);
    if (!open) { setDetailExpanded(false); detailsOverPopup = false; }
    detail.inert = !open;
    for (const id of ["tlDetailsToggle", "tlMobileDetails"]) {
      byId(id).setAttribute("aria-expanded", String(open));
    }
    if (focus && open) byId("tlDetailClose").focus({ preventScroll: true });
    resizeMap();
    syncPopupPresentation();
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
    queueAttribution();
  }

  function syncAttribution() {
    const attribution = map.attributionControl?.getContainer();
    if (!attribution) return;
    let bottom = 0;
    if (mobile()) {
      for (const id of ["filterPanel", "rightInfoPanel", "basemapPanel", "tlDetailPanel"]) {
        const panel = byId(id);
        const style = getComputedStyle(panel);
        if (!panel.hidden && style.display !== "none" && style.visibility !== "hidden") bottom = Math.max(bottom, panel.getBoundingClientRect().height + 16);
      }
    }
    // Keep the original provider credits visible above mobile sheets.
    const values = { marginBottom: `${bottom}px`, maxWidth: mobile() ? `${innerWidth - 24}px` : "", marginRight: mobile() ? "12px" : "" };
    for (const [name, value] of Object.entries(values)) if (attribution.style[name] !== value) attribution.style[name] = value;
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
    byId(id).addEventListener("click", () => {
      if ((mobile() || body.classList.contains("tl-short-landscape")) && stopPopup?.isOpen() && !detailsOverPopup) showPopupDetails();
      else setDetail(!body.classList.contains("tl-detail-open"), { focus: true });
    });
  }
  byId("tlDetailResume").addEventListener("click", showPopupDetails);
  byId("tlDetailClose").addEventListener("click", () => {
    setDetail(false);
    byId(mobile() ? "tlMobileDetails" : "tlDetailsToggle").focus({ preventScroll: true });
  });
  byId("tlDetailExpand").addEventListener("click", () => {
    setDetailExpanded(!body.classList.contains("tl-detail-expanded"));
  });
  const positionBar = byId("tlDetailExpand").parentElement;
  for (const [id, label, position] of [["tlDetailCollapse", "Mini", "collapsed"], ["tlDetailHalf", "Sedang", "half"]]) {
    const button = document.createElement("button"); button.id = id; button.type = "button";
    button.className = "tl-sheet-position"; button.textContent = label;
    button.setAttribute("aria-label", `Posisi detail ${label.toLowerCase()}`);
    button.addEventListener("click", () => setSheetPosition(position));
    positionBar.insertBefore(button, byId("tlDetailExpand"));
  }
  byId("tlDetailExpand").classList.add("tl-sheet-position");
  byId("tlDetailExpand").replaceChildren(document.createTextNode("Penuh"));
  setSheetPosition("half");
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
        const label = option.value === "ALL" ? "Semua layanan" : option.text;
        button.setAttribute("aria-label", label);
        const caption = document.createElement("span");
        caption.className = "tl-mode-label";
        if (option.value === "ALL") {
          const full = document.createElement("span");
          full.className = "tl-mode-all-full";
          full.textContent = label;
          const short = document.createElement("span");
          short.className = "tl-mode-all-compact";
          short.textContent = "Semua";
          short.setAttribute("aria-hidden", "true");
          caption.append(full, short);
        } else {
          caption.textContent = label;
        }
        button.append(dot, caption);
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
    byId("tlTabSelected").disabled = !selected;
    const option = byId("routeSelect").selectedOptions[0];
    const routeLabel = option?.text.trim() || "";
    const fullName = byId("tlRouteFullName");
    byId("routeSelect").title = routeLabel;
    const descriptions = new Set((byId("routeSelect").getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    descriptions.add(fullName.id);
    byId("routeSelect").setAttribute("aria-describedby", [...descriptions].join(" "));
    for (const item of byId("routeSelect").options) item.title = item.text;
    fullName.hidden = !route;
    if (fullName.textContent !== routeLabel) fullName.textContent = routeLabel;
    for (const name of byId("stopList").querySelectorAll(".stop-list-name")) name.title = name.textContent.trim().replace(/\s+/g, " ");
    const heading = byId("routeInfo").querySelector(".route-title, h2");
    const selectedHeading = byId("selectedStopInfo").querySelector(".selected-stop-title, .selected-stop-name, .stop-name, h3, h2");
    const count = new Set(getFilteredRoutes().map(getRouteId)).size;
    const status = byId("statusSelect").selectedOptions[0]?.text || "";
    const mode = byId("modeSelect").selectedOptions[0]?.text || "Semua layanan";
    byId("tlVisibleCount").textContent = `${count} lin / koridor pada filter aktif`;
    byId("tlMapContext").textContent = route ? (option?.text || heading?.textContent || route) : mode;
    byId("tlMapContext").title = byId("tlMapContext").textContent;
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
      if (!mobile()) setTab("selected");
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
      left = 16; right = 16; top = Math.min(108, rect.height * .25); bottom = 28;
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
    // Responsive behavior is UI-only; align the legacy controls with the
    // shared CSS breakpoint while retaining all transport handlers.
    isMobileLayout = mobile;
    syncPanelModeAfterResize();

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
      const mapRect = byId("map").getBoundingClientRect();
      const compactLandscape = body.classList.contains("tl-short-landscape");
      if (compactLandscape) {
        padding.paddingTopLeft[1] = 10;
        padding.paddingBottomRight[1] = 10;
        // The short-landscape detail overlay yields to the popup. Its saved
        // state returns when Details is requested or the popup closes.
        padding.paddingBottomRight[0] = 60;
      }
      for (const selector of [".tl-map-actions", ".tl-map-navigation"]) {
        const control = document.querySelector(selector), style = getComputedStyle(control), rect = control.getBoundingClientRect();
        if (style.display !== "none" && style.visibility !== "hidden" && rect.right > mapRect.left && rect.left < mapRect.right) padding.paddingBottomRight[0] = Math.max(padding.paddingBottomRight[0], mapRect.right - rect.left + 12);
      }
      if (mobile()) {
        // Reserve the control rail and the visible provider credits as well
        // as the sheet. They must not cover popup actions.
        padding.paddingBottomRight[0] = Math.max(60, padding.paddingBottomRight[0]);
        padding.paddingTopLeft[1] = 16;
        for (const element of [byId("globalSearchPanel"), document.querySelector(".tl-map-caption")]) {
          const style = getComputedStyle(element), rect = element.getBoundingClientRect();
          if (style.display !== "none" && style.visibility !== "hidden" && rect.bottom > mapRect.top && rect.top < mapRect.bottom) padding.paddingTopLeft[1] = Math.max(padding.paddingTopLeft[1], rect.bottom - mapRect.top + 12);
        }
        const credits = map.attributionControl?.getContainer();
        if (credits) padding.paddingBottomRight[1] = Math.max(
          padding.paddingBottomRight[1],
          (Number.parseFloat(credits.style.marginBottom) || 0) + credits.getBoundingClientRect().height + 12
        );
      }
      if (compactLandscape) {
        const credits = map.attributionControl?.getContainer();
        if (credits) padding.paddingBottomRight[1] = Math.max(padding.paddingBottomRight[1], credits.getBoundingClientRect().height + 10);
      }
      const availableWidth = size.x - padding.paddingTopLeft[0] - padding.paddingBottomRight[0];
      // Mobile popup content also needs room for Leaflet's outside margins.
      const frameWidth = mobile() ? 48 : 12;
      const maxWidth = Math.min(compactLandscape ? 440 : 330, Math.max(160, availableWidth - frameWidth));
      return {
        maxWidth, minWidth: compactLandscape ? maxWidth : Math.min(245, maxWidth),
        // A larger fixed minimum can place actions outside a short map. Use
        // the actual available height; compact columns expose services early.
        maxHeight: Math.min(540, Math.max(64, size.y - padding.paddingTopLeft[1] - padding.paddingBottomRight[1] - (compactLandscape ? 32 : 40))),
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
      syncPopupPresentation();
      resizeMap();
    };
    setMobileInfoOpen = open => {
      if (open && mobile()) setDetail(false);
      if (!mobile()) body.classList.toggle("tl-legend-open", Boolean(open));
      originalInfo(open);
      syncPanelControls();
      syncPopupPresentation();
      resizeMap();
    };
    setBasemapPanelOpen = open => {
      if (open && mobile()) setDetail(false);
      if (open) body.classList.remove("tl-legend-open");
      originalBasemap(open);
      syncPanelControls();
      syncPopupPresentation();
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
      revealPopup();
      syncAttribution();
    };
    byId("stopList").addEventListener("click", revealStopPopup, true);
    byId("stopList").addEventListener("keydown", revealStopPopup, true);
    new ResizeObserver(resizeMap).observe(byId("map"));
    const sheetObserver = new ResizeObserver(() => { queueAttribution(); resizeMap(); });
    for (const id of ["filterPanel", "rightInfoPanel", "basemapPanel", "tlDetailPanel"]) sheetObserver.observe(byId(id));
    for (const id of ["filterPanel", "rightInfoPanel", "basemapPanel", "tlDetailPanel"]) {
      const panel = byId(id);
      L.DomEvent.disableScrollPropagation(panel);
      for (const event of ["touchstart", "dblclick"]) panel.addEventListener(event, e => e.stopPropagation(), { passive: true });
    }
    map.on("popupopen", ({ popup }) => {
      if (!popup.getElement()?.querySelector(".stop-popup")) return;
      stopPopup = popup;
      detailsOverPopup = false;
      shelvedAutoPan = null;
      popupLayoutSignature = "";
      syncPopupPresentation();
      if (mobile()) {
        syncAttribution();
      }
      const { autoPan, keepInView, ...dimensions } = getStopPopupOptions();
      // Preserve the engine's navigation-specific autoPan setting.
      popup.getElement()?.style.setProperty("--tl-popup-content-height", `${dimensions.maxHeight}px`);
      Object.assign(popup.options, dimensions);
      popup.update();
      popupLayoutSignature = JSON.stringify(dimensions);
    });
    map.on("popupclose", ({ popup }) => {
      if (popup !== stopPopup) return;
      if (shelvedAutoPan !== null) popup.options.autoPan = shelvedAutoPan;
      popup.getElement()?.removeAttribute("aria-hidden");
      if (popup.getElement()) popup.getElement().inert = false;
      stopPopup = null;
      popupLayoutSignature = "";
      detailsOverPopup = false;
      shelvedAutoPan = null;
      syncPopupPresentation();
    });
    window.addEventListener("resize", () => {
      if (tablet() !== lastTablet) {
        lastTablet = tablet();
        if (tablet()) setDesktopPanelCollapsed("left", true);
      }
      syncPanelControls();
      syncPopupPresentation();
      resizeMap();
    });
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || event.defaultPrevented || !byId("productTour").hidden) return;
      if (body.classList.contains("mobile-filter-open")) setMobileFilterOpen(false);
      else if (body.classList.contains("mobile-info-open") || body.classList.contains("tl-legend-open")) setMobileInfoOpen(false);
      else if (!byId("basemapPanel").hidden) setBasemapPanelOpen(false);
      else if (detail.contains(document.activeElement)) {
        setDetail(false);
        byId(mobile() ? "tlMobileDetails" : "tlDetailsToggle").focus();
      }
    });
    scheduleSync();
    document.fonts?.ready.then(resizeMap);
    resizeMap();
    document.documentElement.dataset.layoutReady = "true";
    // UI-only bridge for the tour; no transport state setters are exposed.
    window.webgisLayout = Object.freeze({
      setDetail, setTab, setDetailExpanded, setSheetPosition, revealPopup, showPopupDetails,
      capture() {
        return {
          leftCollapsed: body.classList.contains("left-panel-collapsed"),
          detailOpen: body.classList.contains("tl-detail-open"), expanded: body.classList.contains("tl-detail-expanded"),
          tab: detail.dataset.tab, sheetPosition, detailsOverPopup,
          filter: body.classList.contains("mobile-filter-open"), info: body.classList.contains("mobile-info-open"),
          legend: body.classList.contains("tl-legend-open"), basemap: !byId("basemapPanel").hidden,
          scroll: [...document.querySelectorAll(".filter-panel-content, .tl-route-content, .stop-list-scroll, .right-info-body, .leaflet-popup-content, .stop-popup-scroll, .lrt-popup-body")].map(element => ({ element, top: element.scrollTop }))
        };
      },
      restore(state) {
        setMobileFilterOpen(false); setMobileInfoOpen(false); setBasemapPanelOpen(false);
        body.classList.toggle("left-panel-collapsed", state.leftCollapsed);
        setDetail(state.detailOpen); setTab(state.tab); setSheetPosition(state.sheetPosition || (state.expanded ? "expanded" : "half"));
        if (state.filter) setMobileFilterOpen(true);
        if (state.info) setMobileInfoOpen(true);
        if (state.basemap) setBasemapPanelOpen(true);
        body.classList.toggle("tl-legend-open", state.legend);
        detailsOverPopup = state.detailsOverPopup;
        syncPanelControls(); syncPopupPresentation(); resizeMap();
        for (const item of state.scroll) if (item.element.isConnected) item.element.scrollTop = item.top;
      }
    });
    window.dispatchEvent(new Event("webgis:layout-ready"));
  });
})();
