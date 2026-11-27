/* Shared popup presentation for BRT, MRT, LRT and rail stops.
   The original engine owns all data and handlers. */
(() => {
  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  // Shared mobile shell for every mode. The engine remains the source
  // of data, badges, integration links, navigation and click handlers.
  function enhanceShared(root) {
    if (!root) return root;
    root.classList.add("stop-popup-ui");
    if (root.dataset.stopUiEnhanced || root.classList.contains("lrt-popup")
        || !matchMedia("(max-width: 767px)").matches) return root;

    const scroll = root.querySelector(".stop-popup-scroll");
    if (!scroll) return root;
    const header = document.createElement("header");
    header.className = "stop-popup-ui-header";
    for (const selector of [".stop-popup-eyebrow", ".stop-popup-title",
      ".stop-popup-station-code", ".stop-popup-meta-row"]) {
      const node = scroll.querySelector(selector);
      if (node) header.append(node);
    }
    if (header.childElementCount) scroll.prepend(header);
    root.dataset.stopUiEnhanced = "true";
    return root;
  }

  function enhance(root, feature, routeId) {
    if (!root) return root;
    const activeColor = getRouteColor(routeId);
    if (CSS.supports("color", activeColor)) root.style.setProperty("--tl-popup-accent", activeColor);
    if (normalizeMode(feature?.properties?.MODE) !== "LRT") {
      return enhanceShared(root);
    }
    if (root.dataset.lrtEnhanced) return enhanceShared(root);
    root.dataset.lrtEnhanced = "true";
    root.classList.add("lrt-popup", "stop-popup-ui");
    const activeRoute = getRouteById(routeId);
    root.dataset.lrtOperator = cleanText(feature.properties.OPERATOR) || cleanText(activeRoute?.properties?.OPERATOR);
    if (CSS.supports("color", activeColor)) root.style.setProperty("--lrt-accent", activeColor);
    const content = root.querySelector(".stop-popup-scroll");
    if (!content) return root;
    const header = document.createElement("header");
    header.className = "lrt-popup-header stop-popup-ui-header";
    for (const selector of [".stop-popup-eyebrow", ".stop-popup-title", ".stop-popup-station-code", ".stop-popup-meta-row"]) {
      const node = content.querySelector(selector);
      if (node) header.append(node);
    }
    content.prepend(header);

    // Brand with the real local operator asset, never an approximate icon.
    const operator = String(root.dataset.lrtOperator || "").toLowerCase();
    const isJabodebek = operator.includes("jabodebek") || String(routeId).toUpperCase().startsWith("LRT_JB");
    const isJakarta = operator.includes("jakarta") || String(routeId).toUpperCase().startsWith("LRT_JKT");
    const logoPath = isJabodebek ? TRANSIT_LOGOS.LRT_JB : (isJakarta ? TRANSIT_LOGOS.LRT_JKT : "");
    if (logoPath) {
      const brand = document.createElement("img");
      brand.className = "lrt-popup-brand-logo";
      brand.src = logoPath;
      brand.alt = isJabodebek ? "LRT Jabodebek" : "LRT Jakarta";
      brand.onerror = () => brand.remove();
      header.prepend(brand);
    }

    // Reuse each original route button, including its data-route-switch,
    // disabled state and accessibility label. The engine binds it normally.
    for (const button of root.querySelectorAll(".stop-popup-direct-routes .stop-popup-route-button[data-route-switch]")) {
      const id = button.dataset.routeSwitch;
      const route = getRouteById(id);
      if (!route || getRouteMode(route) !== "LRT") continue;
      const metadata = route.properties;
      const symbol = button.querySelector("img[alt]")?.alt?.trim()
        || button.querySelector(".rail-line-badge-fallback")?.textContent.trim()
        || cleanText(metadata.LINE_CODE) || String(getRouteId(route)).split("_").pop();
      const card = button.closest(".stop-popup-route-option") || button.parentElement;
      card.classList.add("lrt-service-card");
      card.dataset.operator = cleanText(metadata.OPERATOR) || root.dataset.lrtOperator;
      const color = getRouteColor(id);
      if (CSS.supports("color", color)) card.style.setProperty("--lrt-line-color", color);
      button.classList.add("lrt-service-button");
      const copy = document.createElement("span");
      copy.className = "lrt-service-copy";
      copy.append(textElement("strong", "lrt-service-operator", card.dataset.operator),
        textElement("span", "lrt-service-name", cleanText(metadata.LINE_NAME) || getRouteTitle(route)));
      // Preserve the existing assets/lines/ image (including its onerror
      // text fallback) and the original route-switch button.
      const badge = button.querySelector(".rail-line-badge-wrap, .rail-line-badge-fallback");
      const visual = badge || textElement("span", "lrt-line-symbol", symbol);
      if (!badge) visual.setAttribute("aria-hidden", "true");
      button.replaceChildren(visual, copy);
    }
    root.querySelectorAll(".integration-group").forEach(group => group.classList.add("lrt-integration-card"));
    // One scroll surface keeps long integrations, sources and navigation
    // reachable even in short landscape viewports. Preserve original nodes.
    const body = document.createElement("div");
    body.className = "lrt-popup-body stop-popup-ui-scroll";
    body.tabIndex = 0;
    body.setAttribute("aria-label", "Informasi stasiun, gulir untuk melihat seluruh isi");
    const main = document.createElement("div");
    main.className = "lrt-popup-main";
    body.append(header);
    main.append(...root.childNodes);
    // Keep previous/next controls outside the only scrolling area.
    const navigation = main.querySelector(".stop-popup-navigation");
    body.append(main);
    root.append(body);
    if (navigation) root.append(navigation);
    const hint = textElement("div", "lrt-popup-scroll-hint", "Gulir untuk info lainnya ↓");
    hint.setAttribute("aria-hidden", "true");
    root.append(hint);
    return root;
  }

  // One compact "glance" view for the anchored popup. The right-side
  // Detail panel receives the same original engine content, with the
  // extra operator/source context retained in its own styling.
  function decorateQuickGlance(root) {
    if (!root || root.dataset.quickGlanceReady) return;
    root.dataset.quickGlanceReady = "true";
    for (const group of root.querySelectorAll(".integration-group")) {
      const operator = group.querySelector(".integration-operator")?.textContent.trim() || "Integrasi";
      const image = group.querySelector(".integration-logo");
      for (const row of group.querySelectorAll(".integration-place-row")) {
        const label = row.querySelector(".integration-place-name-wrap");
        if (!label || row.querySelector(".tl-integration-quick-logo")) continue;
        const icon = document.createElement("span");
        icon.className = "tl-integration-quick-logo";
        icon.setAttribute("aria-hidden", "true");
        if (image) {
          const clone = image.cloneNode(true);
          clone.className = "tl-quick-integration-image";
          clone.alt = "";
          icon.append(clone);
        } else {
          icon.textContent = operator.slice(0, 2).toUpperCase();
          icon.title = operator;
        }
        // The destination is read first; the actual operator mark sits
        // on its right, before any navigation chevron.
        row.insertBefore(icon, row.querySelector(".integration-place-link-arrow"));
      }
    }
    // Popup = glance; Panel = complete list. Keep every row in the DOM so
    // integration navigation/resolvers still have the same source data.
    const integrationRows = [...root.querySelectorAll(".integration-place-row")];
    const compactLimit = 3;
    if (integrationRows.length > compactLimit) {
      integrationRows.slice(compactLimit).forEach(row => {
        row.dataset.quickGlanceOverflow = "true";
      });
      const integration = root.querySelector(".stop-popup-section--integration");
      if (integration) {
        const note = textElement("span", "tl-integration-more-note",
          `+${integrationRows.length - compactLimit} integrasi lainnya tersedia di Panel`);
        integration.append(note);
      }
    }
    const maps = root.querySelector(".stop-popup-maps-link");
    const source = root.querySelector(".stop-source-summary");
    if (maps) {
      maps.setAttribute("aria-label", "Buka lokasi di Google Maps");
      maps.setAttribute("title", "Google Maps");
      // Symbol-only quick action with a distinct local map-pin icon.
      const visual = maps.querySelector(".stop-popup-external-link-icon");
      if (visual) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "tl-quick-action-svg");
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", "assets/icons/tabler.svg#map-pin");
        svg.append(use);
        visual.replaceChildren(svg);
      }
    }
    if (source) {
      source.setAttribute("aria-label", "Tampilkan sumber data");
      source.setAttribute("title", "Sumber Data");
    }
  }

  window.addEventListener("webgis:map-ready", () => {
    const engineRenderer = buildStopPopup;
    buildStopPopup = (feature, routeId) => {
      const html = engineRenderer(feature, routeId);
      const template = document.createElement("template");
      template.innerHTML = html;
      const root = enhance(template.content.querySelector(".stop-popup"), feature, routeId);
      decorateQuickGlance(root);
      const actions = root?.querySelector(".stop-popup-action-row");
      if (actions) {
        const button = textElement("button", "tl-show-stop-in-panel", "Tampilkan di panel");
        button.type = "button";
        // Keep this essential presentation switch outside the scrolling body,
        // immediately above the previous/next navigation controls.
        // No popup content or engine actions are removed.
        const navigation = root.querySelector(".stop-popup-navigation");
        if (navigation?.parentElement === root) {
          root.insertBefore(button, navigation);
        } else {
          actions.append(button);
        }
      }
      return template.innerHTML;
    };
    map.on("popupopen", ({ popup }) => {
      const shell = popup.getElement();
      const root = shell?.querySelector(".stop-popup");
      if (!root) return;
      const alreadyEnhanced = Boolean(root.dataset.lrtEnhanced);
      const feature = getStopByKey(root.dataset.stopKey);
      enhance(root, feature, currentSelectedRouteId);
      shell.classList.toggle("lrt-popup-shell", root.classList.contains("lrt-popup"));
      const wasShared = shell.classList.contains("stop-popup-ui-shell");
      shell.classList.toggle("stop-popup-ui-shell", root.classList.contains("stop-popup-ui"));
      if (!wasShared && root.classList.contains("stop-popup-ui") && !root.classList.contains("lrt-popup")) {
        popup.update();
      }
      if (root.classList.contains("lrt-popup")) {
        shell.querySelector(".leaflet-popup-close-button")?.setAttribute("aria-label", "Tutup popup stasiun");
        if (!alreadyEnhanced) popup.update();
      }
    });
  }, { once: true });
})();
