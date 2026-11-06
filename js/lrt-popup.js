/* Presentational adapter. Retains the engine's links, context and event hooks. */
(() => {
  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function enhance(root, feature, routeId) {
    if (!root || root.dataset.lrtEnhanced || normalizeMode(feature?.properties?.MODE) !== "LRT") return root;
    root.dataset.lrtEnhanced = "true";
    root.classList.add("lrt-popup");
    const activeRoute = getRouteById(routeId);
    root.dataset.lrtOperator = cleanText(feature.properties.OPERATOR) || cleanText(activeRoute?.properties?.OPERATOR);
    const activeColor = getRouteColor(routeId);
    if (CSS.supports("color", activeColor)) root.style.setProperty("--lrt-accent", activeColor);
    const content = root.querySelector(".stop-popup-scroll");
    if (!content) return root;
    const header = document.createElement("header");
    header.className = "lrt-popup-header";
    for (const selector of [".stop-popup-eyebrow", ".stop-popup-title", ".stop-popup-station-code", ".stop-popup-meta-row"]) {
      const node = content.querySelector(selector);
      if (node) header.append(node);
    }
    content.prepend(header);

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
      const circle = textElement("span", "lrt-line-symbol", symbol);
      circle.setAttribute("aria-hidden", "true");
      button.replaceChildren(circle, copy);
    }
    root.querySelectorAll(".integration-group").forEach(group => group.classList.add("lrt-integration-card"));
    // One scroll surface keeps long integrations, sources and navigation
    // reachable even in short landscape viewports. Preserve original nodes.
    const body = document.createElement("div");
    body.className = "lrt-popup-body";
    body.append(...root.childNodes);
    root.append(body);
    return root;
  }

  window.addEventListener("webgis:map-ready", () => {
    const engineRenderer = buildStopPopup;
    buildStopPopup = (feature, routeId) => {
      const html = engineRenderer(feature, routeId);
      if (normalizeMode(feature?.properties?.MODE) !== "LRT") return html;
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
      if (root.classList.contains("lrt-popup")) {
        shell.querySelector(".leaflet-popup-close-button")?.setAttribute("aria-label", "Tutup popup stasiun");
        if (!alreadyEnhanced) popup.update();
      }
    });
  }, { once: true });
})();
