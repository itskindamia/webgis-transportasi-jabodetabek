/* Visual decluttering and Tabler tour. Transport features are read, never edited. */
(() => {
  const byId = id => document.getElementById(id);
  const mobile = () => matchMedia("(max-width: 767px)").matches;
  const intersects = (a, b, gap = 0) => a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
  const visibleRect = element => {
    if (!element || element.hidden || getComputedStyle(element).display === "none" || getComputedStyle(element).visibility === "hidden") return null;
    const rect = element.getBoundingClientRect();
    return rect.width && rect.height ? rect : null;
  };

  window.addEventListener("webgis:layout-ready", () => {
    const ui = window.webgisLayout;
    let labelFrame = 0;
    let hoveredKey = "";
    const wired = new WeakSet();
    const scheduleLabels = () => {
      if (!labelFrame) labelFrame = requestAnimationFrame(declutter);
    };
    function declutter() {
      labelFrame = 0;
      const bounds = byId("map").getBoundingClientRect();
      const obstacles = ["globalSearchPanel", "filterPanel", "tlDetailPanel", "rightInfoPanel", "basemapPanel", "lowerRightNavStack"]
        .map(id => visibleRect(byId(id))).filter(rect => rect && intersects(rect, bounds));
      for (const selector of [".tl-map-caption", ".tl-map-actions", ".tl-dock"]) {
        const rect = visibleRect(document.querySelector(selector));
        if (rect && intersects(rect, bounds)) obstacles.push(rect);
      }
      const rows = [...byId("stopList").querySelectorAll(".stop-list-item")];
      const rank = new Map(rows.map((row, index) => [row.dataset.stopKey,
        row.querySelector(".is-terminus") ? 600 : index === 0 || index === rows.length - 1 ? 500 : row.querySelector(".is-transit") ? 400 : 100]));
      const candidates = [];
      stopMarkerByKey.forEach((marker, key) => {
        if (!wired.has(marker)) {
          wired.add(marker);
          marker.on("mouseover", () => { hoveredKey = String(key); scheduleLabels(); });
          marker.on("mouseout", () => { hoveredKey = ""; scheduleLabels(); });
          marker.on("click", () => { if (mobile()) ui.revealPopup(); });
        }
        const element = marker.getTooltip()?.getElement();
        if (!element?.isConnected || !marker.isTooltipOpen()) return;
        const selected = String(key) === String(currentSelectedStopKey || "");
        const hovered = String(key) === hoveredKey;
        candidates.push({ element, rect: element.getBoundingClientRect(), key: String(key), forced: selected || hovered,
          priority: selected ? 10000 : hovered ? 9000 : rank.get(String(key)) || 100 });
      });
      candidates.sort((a, b) => b.priority - a.priority || a.key.localeCompare(b.key));
      const accepted = [];
      for (const item of candidates) {
        const rect = item.rect;
        const inside = rect.left >= bounds.left + 4 && rect.right <= bounds.right - 4 && rect.top >= bounds.top + 4 && rect.bottom <= bounds.bottom - 4;
        const collision = accepted.some(other => intersects(rect, other, 6)) || obstacles.some(other => intersects(rect, other, 4));
        const show = item.forced || (inside && !collision);
        item.element.classList.toggle("tl-label-suppressed", !show);
        if (show) accepted.push(rect);
      }
    }
    map.on("moveend zoomend resize tooltipopen popupopen popupclose", scheduleLabels);
    new MutationObserver(scheduleLabels).observe(byId("map").querySelector(".leaflet-tooltip-pane"), { childList: true, subtree: true });
    new MutationObserver(scheduleLabels).observe(byId("stopList"), { childList: true, subtree: true });
    new ResizeObserver(scheduleLabels).observe(byId("tlDetailPanel"));
    document.fonts?.ready.then(scheduleLabels);
    scheduleLabels();

    // Reuse the existing tour DOM and navigation bindings, replacing only its
    // layout-specific steps. No demo routes, markers, filters or URL mutations.
    const steps = [
      { title: "Pilih jaringan", text: "Pilih jenis layanan, status, serta lin atau koridor melalui panel Jaringan.", target: "network" },
      { title: "Daftar dan detail", text: "Buka Ringkasan, Daftar halte/stasiun, atau Terpilih. Atur tinggi panel dengan Mini, Sedang, dan Penuh.", target: "details" },
      { title: "Popup dan integrasi", text: "Ketuk marker halte atau stasiun untuk melihat popup dan integrasi. Tombol Detail membuka informasi lebih lengkap tanpa menghapus pilihan.", target: "popup" },
      { title: "Cari tujuan", text: "Temukan halte, stasiun, koridor, atau tempat dari sini. Tombol Cari juga mencari tempat secara daring.", target: "search" },
      { title: "Peta dasar dan legenda", text: "Ganti latar peta lewat Peta dasar. Untuk keterangan simbol jaringan dan legenda, buka Info.", target: "basemap" }
    ];
    PRODUCT_TOUR_STEPS.splice(0, PRODUCT_TOUR_STEPS.length, ...steps);
    let snapshot = null;
    let target = null;
    let tourFrame = 0;
    const shell = byId("tlShell");
    const card = byId("productTourCard");
    const tour = byId("productTour");
    const spotlight = byId("productTourSpotlight");

    function placeTour() {
      tourFrame = 0;
      if (tour.hidden || !target) return;
      const rect = visibleRect(target) || visibleRect(byId("tlNetworkToggle"));
      if (!rect) return;
      const focus = { left: Math.max(8, rect.left - 5), top: Math.max(8, rect.top - 5),
        right: Math.min(innerWidth - 8, rect.right + 5), bottom: Math.min(innerHeight - 8, rect.bottom + 5) };
      Object.assign(spotlight.style, { left: `${focus.left}px`, top: `${focus.top}px`, width: `${focus.right - focus.left}px`, height: `${focus.bottom - focus.top}px` });
      spotlight.hidden = false;
      card.style.width = `${Math.min(mobile() ? 336 : 360, innerWidth - 24)}px`;
      const width = card.offsetWidth;
      let height = Math.min(card.scrollHeight + card.offsetHeight - card.clientHeight, innerHeight - 24);
      let allowedHeight = mobile() ? Math.min(innerHeight - 24, 320, Math.max(180, innerHeight * .54)) : innerHeight - 24;
      if (mobile()) {
        const verticalRoom = Math.max(focus.top - 28, innerHeight - focus.bottom - 28);
        const horizontalRoom = Math.max(focus.left - 28, innerWidth - focus.right - 28);
        if (horizontalRoom < width && verticalRoom < height) allowedHeight = Math.max(96, verticalRoom);
      }
      card.style.maxHeight = `${allowedHeight}px`;
      height = card.offsetHeight;
      const clampX = value => Math.max(12, Math.min(innerWidth - width - 12, value));
      const clampY = value => Math.max(12, Math.min(innerHeight - height - 12, value));
      const centeredX = mobile() ? clampX((innerWidth - width) / 2) : clampX(focus.left);
      const choices = [
        { x: focus.right + 16, y: clampY(focus.top) }, { x: focus.left - width - 16, y: clampY(focus.top) },
        { x: centeredX, y: focus.bottom + 16 }, { x: centeredX, y: focus.top - height - 16 }
      ];
      if (mobile()) choices.unshift(choices.pop(), choices.pop());
      const fits = item => item.x >= 12 && item.y >= 12 && item.x + width <= innerWidth - 12 && item.y + height <= innerHeight - 12;
      const pick = choices.find(fits) || { x: centeredX, y: clampY(focus.top - height - 16) };
      Object.assign(card.style, { left: `${pick.x}px`, top: `${pick.y}px`, right: "auto", bottom: "auto", transform: "none" });
      tour.dataset.target = target.id || target.className;
    }
    positionProductTour = () => {
      if (!tourFrame) tourFrame = requestAnimationFrame(placeTour);
    };

    showProductTourStep = index => {
      if (!snapshot) return;
      productTourIndex = Math.max(0, Math.min(steps.length - 1, index));
      ui.restore(snapshot.ui);
      const step = steps[productTourIndex];
      target = null;
      if (step.target === "network") {
        if (mobile()) setMobileFilterOpen(true); else setDesktopPanelCollapsed("left", false);
        target = byId("tlModeChoices");
      } else if (step.target === "details") {
        ui.showPopupDetails();
        // Preview tabs in a half sheet instead of covering the mobile map.
        if (mobile()) ui.setSheetPosition("half");
        target = document.querySelector(".tl-detail-tabs");
      } else if (step.target === "popup") {
        setMobileFilterOpen(false); setMobileInfoOpen(false); setBasemapPanelOpen(false);
        ui.revealPopup();
        target = document.querySelector(".leaflet-popup .stop-popup-direct-routes");
        if (!visibleRect(target)) target = byId(mobile() ? "tlMobileDetails" : "tlDetailsToggle");
      } else if (step.target === "search") {
        ui.setSearchOpen(true);
        target = byId("globalSearchPanel");
      }
      else target = byId("basemapButton");
      byId("productTourProgress").textContent = `TIP ${productTourIndex + 1} DARI ${steps.length}`;
      byId("productTourTitle").textContent = step.title;
      byId("productTourText").textContent = step.text;
      byId("productTourVisual").hidden = true;
      byId("productTourPrevious").hidden = productTourIndex === 0;
      byId("productTourNext").textContent = productTourIndex === steps.length - 1 ? "Mulai jelajahi" : "Berikutnya";
      card.scrollTop = 0;
      positionProductTour();
      requestAnimationFrame(() => card.focus({ preventScroll: true }));
    };

    startProductTour = ({ manual = false } = {}) => {
      if (snapshot) return;
      clearTimeout(startupTourTimerId);
      const search = byId("globalSearchResults");
      snapshot = { ui: ui.capture(), focus: document.activeElement, inert: shell.inert, manual,
        center: map.getCenter(), zoom: map.getZoom(), searchNodes: [...search.childNodes], searchHidden: search.hidden,
        searchExpanded: byId("globalSearchInput").getAttribute("aria-expanded"), searchScroll: search.scrollTop };
      shell.inert = true;
      tour.hidden = false;
      card.setAttribute("aria-modal", "true");
      card.setAttribute("aria-describedby", "productTourText");
      document.body.classList.add("product-tour-open");
      showProductTourStep(0);
    };

    closeProductTour = ({ completed = true } = {}) => {
      if (!snapshot) return;
      const saved = snapshot;
      snapshot = null;
      tour.hidden = true;
      spotlight.hidden = true;
      document.body.classList.remove("product-tour-open");
      shell.inert = saved.inert;
      ui.restore(saved.ui);
      const search = byId("globalSearchResults");
      search.replaceChildren(...saved.searchNodes); search.hidden = saved.searchHidden;
      byId("globalSearchInput").setAttribute("aria-expanded", saved.searchExpanded || "false");
      if (completed) saveProductTourCompleted();
      requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
        map.setView(saved.center, saved.zoom, { animate: false });
        const focus = saved.focus?.isConnected && !saved.focus.closest("[inert]") && visibleRect(saved.focus) ? saved.focus : byId("tlNetworkToggle");
        focus.focus({ preventScroll: true });
        search.scrollTop = saved.searchScroll;
        scheduleLabels();
      });
    };
    byId("rightInfoGuideButton").addEventListener("click", event => {
      event.preventDefault(); event.stopImmediatePropagation(); startProductTour({ manual: true });
    }, true);
    document.addEventListener("keydown", event => {
      if (tour.hidden) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closeProductTour(); }
      else if (event.key === "Tab") trapFocusWithin(event, card);
    }, true);
    new ResizeObserver(positionProductTour).observe(card);
    window.addEventListener("resize", positionProductTour);
    window.addEventListener("scroll", positionProductTour, true);
  }, { once: true });
})();
