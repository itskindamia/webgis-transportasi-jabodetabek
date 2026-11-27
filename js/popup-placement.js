/* Desktop presentation only: Leaflet still owns the popup anchor and pan. */
(() => {
  const desktop = matchMedia("(min-width: 1024px)");
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  window.addEventListener("webgis:map-ready", () => {
    const container = map.getContainer();
    const controls = document.querySelectorAll(
      ".tl-map-caption, .tl-map-actions, .tl-map-navigation, .tl-dock, #rightInfoPanel, #basemapPanel, .leaflet-control-attribution"
    );
    let frame = 0;
    let element;
    let x = 0;
    let y = 0;
    let side = "";
    let tip = 0;

    function setPlacement(nextX, nextY, nextSide, nextTip) {
      if (!element || (x === nextX && y === nextY && side === nextSide && tip === nextTip)) return;
      [x, y, side, tip] = [nextX, nextY, nextSide, nextTip];
      if (side) {
        element.dataset.popupSide = side;
        element.style.translate = `${x}px ${y}px`;
        element.style.setProperty("--tl-popup-tip", `${tip}px`);
      } else {
        delete element.dataset.popupSide;
        element.style.removeProperty("translate");
        element.style.removeProperty("--tl-popup-tip");
      }
      map.fire("stopPopupPlacement");
    }

    function position() {
      frame = 0;
      if (!element) return;
      const markerPane = map.getPane("tlIntegrationTargetPane");
      const markers = markerPane?.querySelectorAll(".tl-integration-target-marker");
      const card = element.querySelector(".leaflet-popup-content-wrapper");
      if (!desktop.matches || !markers?.length || !card || container.classList.contains("tl-d4-integration-overview")) {
        setPlacement(0, 0, "", 0);
        return;
      }

      const mapRect = container.getBoundingClientRect();
      const bounds = { left: mapRect.left + 8, right: mapRect.right - 8, top: mapRect.top + 8, bottom: mapRect.bottom - 8 };
      const cardRect = card.getBoundingClientRect();
      const { width, height } = cardRect;
      const left = cardRect.left - x;
      const top = cardRect.top - y;
      const point = map.latLngToContainerPoint(map._popup.getLatLng());
      const anchorX = point.x + mapRect.left;
      const anchorY = point.y + mapRect.top;
      if (!width || !height || anchorX < bounds.left || anchorX > bounds.right || anchorY < bounds.top || anchorY > bounds.bottom) {
        setPlacement(0, 0, "", 0);
        return;
      }

      const obstacles = Array.from(controls).filter(control => {
        const style = getComputedStyle(control);
        return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
      }).map(control => control.getBoundingClientRect());
      const badges = Array.from(markers, marker => marker.getBoundingClientRect()).filter(rect => area(bounds, rect));
      const labels = Array.from(markerPane.querySelectorAll(".tl-integration-target-symbol"), label =>
        label.getBoundingClientRect()).filter(rect => area(bounds, rect));
      const base = { left, top, right: left + width, bottom: top + height };
      const coverage = rect => ({
        badges: badges.filter(badge => area(rect, badge) >= 1).length,
        labels: labels.reduce((sum, label) => sum + area(rect, label), 0)
      });
      let best = { ...coverage(base), left, top, side: "", tip: 0 };
      if (!best.badges && best.labels < 1) {
        setPlacement(0, 0, "", 0);
        return;
      }

      // Keep the tip on the same geographic anchor. Horizontal shifts on
      // either side of the default position are tried before changing sides.
      const minLeft = Math.max(bounds.left, anchorX - width + 20);
      const maxLeft = Math.min(bounds.right - width, anchorX - 20);
      const verticalTop = clamp(anchorY - height / 2, bounds.top, bounds.bottom - height);
      const candidates = [
        [minLeft, top, "above"], [maxLeft, top, "above"],
        [anchorX - width - 12, verticalTop, "left"], [anchorX + 12, verticalTop, "right"],
        [clamp(left, minLeft, maxLeft), anchorY + 12, "below"],
        [minLeft, anchorY + 12, "below"], [maxLeft, anchorY + 12, "below"]
      ];
      for (const [candidateLeft, candidateTop, candidateSide] of candidates) {
        const rect = { left: candidateLeft, top: candidateTop, right: candidateLeft + width, bottom: candidateTop + height };
        const horizontal = candidateSide === "above" || candidateSide === "below";
        const candidateTip = horizontal ? anchorX - candidateLeft : anchorY - candidateTop;
        if (candidateTip < 19 || candidateTip > (horizontal ? width : height) - 19 ||
            rect.left < bounds.left || rect.right > bounds.right || rect.top < bounds.top || rect.bottom > bounds.bottom ||
            obstacles.some(obstacle => area(rect, obstacle))) continue;
        const score = coverage(rect);
        if (score.badges < best.badges || (score.badges === best.badges && score.labels + 16 < best.labels)) {
          best = { ...score, left: candidateLeft, top: candidateTop, side: candidateSide, tip: candidateTip };
        }
      }
      setPlacement(best.left - left, best.top - top, best.side, best.tip);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(position);
    }

    const sizeObserver = new ResizeObserver(schedule);
    map.on("popupopen", ({ popup }) => {
      const root = popup.getElement();
      if (!root?.querySelector(".stop-popup-ui")) return;
      element = root;
      sizeObserver.observe(root.querySelector(".leaflet-popup-content-wrapper"));
      schedule();
    });
    map.on("popupclose", ({ popup }) => {
      if (element !== popup.getElement()) return;
      sizeObserver.unobserve(element.querySelector(".leaflet-popup-content-wrapper"));
      setPlacement(0, 0, "", 0);
      element = null;
    });
    map.on("moveend resize integrationdisplaychange", schedule);
    for (const control of controls) sizeObserver.observe(control);
    desktop.addEventListener("change", schedule);
  }, { once: true });
})();
