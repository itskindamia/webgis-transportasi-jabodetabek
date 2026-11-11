/* Unified popup presentation adapter. One shared mobile shell for BRT, MRT,
   LRT, KRL and rail stops. The original engine owns all data and handlers. */
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
    if (normalizeMode(feature?.properties?.MODE) !== "LRT") {
      return enhanceShared(root);
    }
    if (root.dataset.lrtEnhanced) return enhanceShared(root);
    root.dataset.lrtEnhanced = "true";
    root.classList.add("lrt-popup", "stop-popup-ui");
    const activeRoute = getRouteById(routeId);
    root.dataset.lrtOperator = cleanText(feature.properties.OPERATOR) || cleanText(activeRoute?.properties?.OPERATOR);
    const activeColor = getRouteColor(routeId);
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

  window.addEventListener("webgis:map-ready", () => {
    const engineRenderer = buildStopPopup;
    buildStopPopup = (feature, routeId) => {
      const html = engineRenderer(feature, routeId);
      const template = document.createElement("template");
      template.innerHTML = html;
      enhance(template.content.querySelector(".stop-popup"), feature, routeId);
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
