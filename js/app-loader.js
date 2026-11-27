(() => {
  "use strict";

  const MAP_SCRIPT =
    "js/map.js?v=d51-1";

  const FALLBACK_LEAFLET_JS =
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";

  const FALLBACK_LEAFLET_CSS =
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";

  const LEAFLET_JS_INTEGRITY =
    "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";

  const LEAFLET_CSS_INTEGRITY =
    "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";

  let mapLoaded = false;

  // Image errors do not bubble. Capture errors from logos and badges even
  // when new popup, panel or marker markup is inserted after startup.
  document.addEventListener("error", ({ target: image }) => {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.matches(".rail-line-badge-image")) {
      const fallback = image.nextElementSibling;
      if (fallback?.matches(".rail-line-badge-fallback")) {
        fallback.hidden = false;
        image.remove();
      }
    } else if (image.hasAttribute("data-optional-logo")) {
      image.remove();
    }
  }, true);

  function showStartupFailure() {
    const map =
      document.getElementById("map");

    if (!map) {
      return;
    }

    map.innerHTML = `
      <div style="
        position:absolute;
        inset:0;
        display:grid;
        place-items:center;
        padding:24px;
        background:#f4f6f7;
        color:#3e454b;
        font:600 13px/1.45 Arial,sans-serif;
        text-align:center;
      ">
        <div>
          Peta belum dapat dimuat.<br>
          Periksa koneksi internet lalu muat ulang halaman.
        </div>
      </div>
    `;
  }

  function loadMapScript() {
    if (mapLoaded) {
      return;
    }

    mapLoaded = true;

    const script =
      document.createElement("script");

    script.src = MAP_SCRIPT;
    script.async = false;
    script.addEventListener("error", showStartupFailure, { once: true });
    script.addEventListener("load", () => {
      window.dispatchEvent(new Event("webgis:map-ready"));
    }, { once: true });

    document.body.appendChild(script);
  }

  function ensureLeafletCssFallback() {
    const primary =
      document.getElementById(
        "leafletCssPrimary"
      );

    /*
      Bila stylesheet utama gagal dimuat, property sheet tetap null.
      Tambahkan fallback CDN kedua tanpa menghapus primary link.
    */
    if (primary?.sheet) {
      return;
    }

    if (
      document.getElementById(
        "leafletCssFallback"
      )
    ) {
      return;
    }

    const link =
      document.createElement("link");

    link.id = "leafletCssFallback";
    link.rel = "stylesheet";
    link.href = FALLBACK_LEAFLET_CSS;
    link.crossOrigin = "anonymous";
    link.integrity =
      LEAFLET_CSS_INTEGRITY;

    document.head.appendChild(link);
  }

  ensureLeafletCssFallback();

  if (window.L?.map) {
    loadMapScript();
    return;
  }

  const fallback =
    document.createElement("script");

  fallback.src = FALLBACK_LEAFLET_JS;
  fallback.crossOrigin = "anonymous";
  fallback.integrity =
    LEAFLET_JS_INTEGRITY;

  fallback.addEventListener("load", () => {
    if (window.L?.map) {
      loadMapScript();
      return;
    }

    showStartupFailure();
  }, { once: true });
  fallback.addEventListener("error", showStartupFailure, { once: true });

  document.body.appendChild(fallback);
})();
