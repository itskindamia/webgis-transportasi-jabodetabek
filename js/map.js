/* =========================================================
   WEBGIS TRANSPORTASI UMUM JAKARTA
   HANYA MEMAKAI DUA FILE DATA:
   - data/brt_route.geojson
   - data/brt_stop.geojson

   Field halte:
   ROUTES     = rute yang benar-benar melayani halte
   SEQ_MAP    = urutan halte per rute
   DIR_MAP    = arah khusus per rute
   INTEGRASI  = transfer ke moda/rute lain
   ========================================================= */

const STOP_ZOOM = 18;

const BASEMAP_PREVIEWS = {
  light:
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/14/8474/13053",
  osm:
    "https://tile.openstreetmap.org/14/13053/8474.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/8474/13053"
};

/*
  Logo lokal.
  Script tetap berjalan kalau file logo belum ada.
*/
const TRANSIT_LOGOS = {
  TJ: "assets/logos/transjakarta.svg",
  KAI: "assets/logos/kai.svg",
  MRT: "assets/logos/mrt-jakarta.svg",
  LRT_JKT: "assets/logos/lrt-jakarta.png",
  LRT_JB: "assets/logos/lrt-jabodebek.svg",
  KRL: "assets/logos/krl-commuterline.svg"
};

/*
  Logo / badge LIN.
  File BK dari user sudah disertakan di paket ini.

  Kalau file gambar lin lain belum tersedia, script otomatis
  menampilkan fallback berupa badge teks (NS, CB, BK, BO, dst.).
*/
const LINE_BADGE_IMAGES = {
  MRT_NS: "assets/lines/mrt-ns.png",
  MRT_EW: "assets/lines/mrt-ew.png",

  LRT_JKT_PDV: "assets/lines/lrt-jakarta-pdv.png",
  LRT_JKT: "assets/lines/lrt-jakarta-pdv.png",
  LRT_JKT_S: "assets/lines/lrt-jakarta-s.svg",
  LRT_JKT_U: "assets/lines/lrt-jakarta-u.png",

  LRT_JB_CBK: "assets/lines/lrt-jabodebek-cb.png",
  LRT_JB_CB: "assets/lines/lrt-jabodebek-cb.png",

  LRT_JB_BKS: "assets/lines/lrt-jabodebek-bk.png",
  LRT_JB_BK: "assets/lines/lrt-jabodebek-bk.png",

  KRL_BO: "assets/lines/krl-bo.svg",
  KRL_CK: "assets/lines/krl-ck.png",
  KRL_RA: "assets/lines/krl-ra.png",
  KRL_TA: "assets/lines/krl-ta.png",
  KRL_TP: "assets/lines/krl-tp.png"
};

const LINE_BADGE_TEXT = {
  MRT_NS: "NS",
  MRT_EW: "EW",

  LRT_JKT_PDV: "PDV",
  LRT_JKT: "PDV",
  LRT_JKT_S: "S",
  LRT_JKT_U: "U",

  LRT_JB_CBK: "CB",
  LRT_JB_CB: "CB",

  LRT_JB_BKS: "BK",
  LRT_JB_BK: "BK",

  KRL_BO: "BO",
  KRL_CK: "CK",
  KRL_RA: "RA",
  KRL_TA: "TA",
  KRL_TP: "TP"
};

/*
  Kode final + alias untuk kode lama yang sudah ada di GeoJSON.
*/
const TRANSIT_ROUTE_LABELS = {
  MRT_NS: {
    operator: "MRT Jakarta",
    route: "Lin Utara–Selatan",
    logo: TRANSIT_LOGOS.MRT
  },

  MRT_EW: {
    operator: "MRT Jakarta",
    route: "Lin Timur–Barat",
    logo: TRANSIT_LOGOS.MRT
  },

  LRT_JKT_PDV: {
    operator: "LRT Jakarta",
    route: "Pegangsaan Dua–Velodrome",
    logo: TRANSIT_LOGOS.LRT_JKT
  },

  LRT_JKT: {
    operator: "LRT Jakarta",
    route: "Pegangsaan Dua–Velodrome",
    logo: TRANSIT_LOGOS.LRT_JKT
  },

  LRT_JKT_S: {
    operator: "LRT Jakarta",
    route: "Lin Selatan",
    logo: TRANSIT_LOGOS.LRT_JKT
  },

  LRT_JKT_U: {
    operator: "LRT Jakarta",
    route: "Lin Utara",
    logo: TRANSIT_LOGOS.LRT_JKT
  },

  LRT_JB_CBK: {
    operator: "LRT Jabodebek",
    route: "Lin Cibubur",
    logo: TRANSIT_LOGOS.LRT_JB
  },

  /*
    Alias kode lama dari file sekarang
  */
  LRT_JB_CB: {
    operator: "LRT Jabodebek",
    route: "Lin Cibubur",
    logo: TRANSIT_LOGOS.LRT_JB
  },

  LRT_JB_BKS: {
    operator: "LRT Jabodebek",
    route: "Lin Bekasi",
    logo: TRANSIT_LOGOS.LRT_JB
  },

  LRT_JB_BK: {
    operator: "LRT Jabodebek",
    route: "Lin Bekasi",
    logo: TRANSIT_LOGOS.LRT_JB
  },

  KRL_BO: {
    operator: "KRL Commuter Line",
    route: "Bogor Line",
    logo: TRANSIT_LOGOS.KRL
  },

  KRL_CK: {
    operator: "KRL Commuter Line",
    route: "Cikarang Loop Line",
    logo: TRANSIT_LOGOS.KRL
  },

  KRL_RA: {
    operator: "KRL Commuter Line",
    route: "Rangkasbitung Line",
    logo: TRANSIT_LOGOS.KRL
  },

  KRL_TA: {
    operator: "KRL Commuter Line",
    route: "Tangerang Line",
    logo: TRANSIT_LOGOS.KRL
  },

  KRL_TP: {
    operator: "KRL Commuter Line",
    route: "Tanjung Priok Line",
    logo: TRANSIT_LOGOS.KRL
  },

  KAI_KAJJ: {
    operator: "Kereta Api Jarak Jauh",
    route: "",
    logo: TRANSIT_LOGOS.KAI
  }
};

/* =========================================================
   MAP
   ========================================================= */

const map = L.map("map", {
  zoomControl: false,
  attributionControl: false,
  preferCanvas: true
}).setView([-6.20, 106.83], 11);

L.control.attribution({
  position: "topright"
}).addTo(map);

/* =========================================================
   PANES
   ========================================================= */

map.createPane("routeHaloPane");
map.getPane("routeHaloPane").style.zIndex = 450;

map.createPane("routePane");
map.getPane("routePane").style.zIndex = 460;

map.createPane("stopPane");
map.getPane("stopPane").style.zIndex = 470;

map.createPane("gpsPane");
map.getPane("gpsPane").style.zIndex = 490;

/* =========================================================
   BASEMAP
   ========================================================= */

const lightCanvas = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    maxNativeZoom: 16,
    maxZoom: 20,
    attribution: "Tiles &copy; Esri"
  }
);

const osm = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap contributors"
  }
);

const satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 20,
    attribution: "Tiles &copy; Esri"
  }
);

const BASEMAPS = {
  light: lightCanvas,
  osm,
  satellite
};

/*
  Config terpisah untuk miniature basemap.
  Setiap thumbnail memakai Leaflet map sendiri sehingga
  mengikuti center/zoom peta utama.
*/
const BASEMAP_PREVIEW_CONFIG = {
  light: {
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    options: {
      maxNativeZoom: 16,
      maxZoom: 20
    }
  },

  osm: {
    url:
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 20
    }
  },
  satellite: {
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      maxZoom: 20
    }
  }
};

let currentBasemap = lightCanvas;
let currentBasemapType = "light";
let basemapOpacity = 1;

const basemapPreviewMaps =
  new Map();

currentBasemap.addTo(map);

/* =========================================================
   DOM
   ========================================================= */

const modeSelect = document.getElementById("modeSelect");
const statusSelect = document.getElementById("statusSelect");
const routeSelect = document.getElementById("routeSelect");
const routeInfoEl = document.getElementById("routeInfo");

const mobileFilterToggle =
  document.getElementById(
    "mobileFilterToggle"
  );

const mobileFilterClose =
  document.getElementById(
    "mobileFilterClose"
  );

const filterPanel =
  document.getElementById(
    "filterPanel"
  );
const selectedStopInfoEl = document.getElementById("selectedStopInfo");
const stopListEl = document.getElementById("stopList");

const basemapButton = document.getElementById("basemapButton");
const basemapPanel = document.getElementById("basemapPanel");
const basemapClose = document.getElementById("basemapClose");
const currentBasemapThumb = document.getElementById("currentBasemapThumb");
const basemapOptions = document.querySelectorAll(".basemap-option");
const opacityButtons = document.querySelectorAll(".opacity-grid button");
const basemapCarousel = document.getElementById("basemapCarousel");

const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");

const gpsButton = document.getElementById("gpsButton");
const homeButton = document.getElementById("homeButton");

/* =========================================================
   DATA / STATE
   ========================================================= */

let routeData = null;
let stopData = null;

let routeHaloLayer = null;
let routeLayer = null;
let stopLayer = null;

let currentSelectedRouteId = null;
let currentSelectedStopKey = null;

const stopMarkerByKey = new Map();

let gpsWatchId = null;
let gpsMarker = null;
let gpsAccuracyCircle = null;
let lastGpsLocation = null;

/* =========================================================
   GENERIC HELPERS
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanText(value) {
  const text = String(value ?? "").trim();

  if (
    text === "" ||
    text === "-" ||
    text.toLowerCase() === "null" ||
    text.toLowerCase() === "tidak ada" ||
    text.toLowerCase() === "tIdak ada".toLowerCase()
  ) {
    return "";
  }

  return text;
}

function hasText(value) {
  return cleanText(value) !== "";
}

function splitIds(value) {
  return String(value ?? "")
    .split(";")
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeMode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeStatus(value) {
  const text = String(value ?? "").trim();

  if (text === "Rencana Resmi") return "Rencana";
  if (text === "Konsep" || text === "Usulan") return "Usulan Personal";

  return text;
}

function featureCollection(features) {
  return {
    type: "FeatureCollection",
    features
  };
}

/*
  Membaca:
  BRT_01:15;BRT_02:20

  atau:
  BRT_01:Kota;BRT_02:Harmoni
*/
function parseRouteMap(value) {
  const result = {};

  splitIds(value).forEach(item => {
    const i = item.indexOf(":");
    if (i === -1) return;

    const key = item.slice(0, i).trim();
    const val = item.slice(i + 1).trim();

    if (key) result[key] = val;
  });

  return result;
}

/* =========================================================
   ROUTE HELPERS
   ========================================================= */

function getRouteId(feature) {
  const p = feature.properties;

  return String(
    p.ID ??
    p.ROUTE_ID ??
    ""
  ).trim();
}

function getRouteHeaderLabel(feature) {
  return getRouteMode(feature) === "BRT"
    ? "KORIDOR"
    : "LIN";
}


function getRouteMode(feature) {
  return normalizeMode(
    feature.properties.MODE
  );
}

function getRouteOrder(feature) {
  const p = feature.properties;

  const value = Number(
    p.DRAW_ORDER ??
    p.DRAW_ORD ??
    p.LINE ??
    9999
  );

  return Number.isFinite(value)
    ? value
    : 9999;
}

function getRouteTitle(feature) {
  const p = feature.properties;
  const mode = getRouteMode(feature);

  if (mode === "BRT") {
    return `Koridor ${p.LINE} (${p.NAME})`;
  }

  if (hasText(p.LINE)) {
    return `${mode} ${p.LINE} (${p.NAME})`;
  }

  return (
    p.NAME ||
    mode ||
    "Lin"
  );
}

function getRouteOptionText(feature) {
  return getRouteTitle(feature);
}

function getRouteById(routeId) {
  if (!routeData) return null;

  return (
    routeData.features.find(
      feature =>
        getRouteId(feature) === String(routeId)
    ) ?? null
  );
}

function getRouteColor(routeId) {
  return (
    getRouteById(routeId)
      ?.properties
      ?.COLOR
    ||
    "#555555"
  );
}

/* =========================================================
   STOP HELPERS
   ========================================================= */

/*
  Karena file saat ini masih punya beberapa STOP_ID kosong,
  script membuat key internal unik secara otomatis.

  Setelah STOP_ID diisi di GeoJSON, script otomatis memakai STOP_ID asli.
*/
function assignRuntimeStopKeys() {
  if (!stopData) return;

  const usedKeys = new Map();

  stopData.features.forEach((feature, index) => {
    const p = feature.properties ?? {};

    const rawId =
      String(p.STOP_ID ?? "").trim();

    const rawFid =
      String(p.FID ?? "").trim();

    let baseKey = "";

    if (rawId) {
      baseKey = rawId;
    }
    else if (rawFid !== "") {
      baseKey =
        `FID_${String(rawFid).padStart(3, "0")}`;
    }
    else {
      baseKey =
        `AUTO_STOP_${String(index + 1).padStart(3, "0")}`;
    }

    const usedCount =
      usedKeys.get(baseKey) ?? 0;

    usedKeys.set(
      baseKey,
      usedCount + 1
    );

    p.__STOP_KEY =
      usedCount === 0
        ? baseKey
        : `${baseKey}__${usedCount + 1}`;

    feature.properties = p;
  });
}

function getStopKey(feature) {
  return String(
    feature?.properties?.__STOP_KEY ??
    feature?.properties?.STOP_ID ??
    ""
  );
}

function getStopByKey(stopKey) {
  if (!stopData) return null;

  return (
    stopData.features.find(
      feature =>
        getStopKey(feature) === String(stopKey)
    ) ?? null
  );
}

function getStopDisplayName(feature) {
  const p = feature.properties;

  return (
    cleanText(p.DISPLAY_NM) ||
    cleanText(p.DISPLAY_NAME) ||
    cleanText(p.STOP_NAME) ||
    "Halte / Stasiun"
  );
}

/*
  ROUTES adalah sumber utama keanggotaan halte.
*/
function getStopRoutes(feature) {
  return splitIds(
    feature?.properties?.ROUTES
  );
}

function stopServesRoute(feature, routeId) {
  return getStopRoutes(feature)
    .includes(String(routeId));
}

function getStopSequenceRaw(feature, routeId) {
  const p = feature.properties ?? {};

  const seqMap =
    parseRouteMap(
      p.SEQ_MAP ??
      p.ROUTE_SEQ ??
      ""
    );

  return String(
    seqMap[String(routeId)] ?? ""
  ).trim();
}


function getStopSequence(feature, routeId) {
  const raw =
    getStopSequenceRaw(
      feature,
      routeId
    )
      .toLowerCase();

  /*
    Tidak ada sequence untuk koridor terpilih:
    tetap tampil, tetapi ditempatkan di akhir.
  */
  if (!raw) {
    return 999999;
  }

  /*
    Format yang didukung:
      01
      12
      12a
      12b
      12aa
  */
  const match =
    raw.match(/^(\d+)([a-z]*)$/);

  if (!match) {
    return 999999;
  }

  const major =
    Number(match[1]);

  const suffix =
    match[2];

  if (!suffix) {
    return major;
  }

  let suffixValue = 0;

  for (
    let i = 0;
    i < suffix.length;
    i++
  ) {
    suffixValue =
      suffixValue * 26 +
      (
        suffix.charCodeAt(i) -
        96
      );
  }

  return (
    major +
    suffixValue / 1000
  );
}

function normalizeDirectionCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function getStopDirection(feature, routeId) {
  const p = feature.properties;

  const mapValue = parseRouteMap(
    p.DIR_MAP ??
    p.ROUTE_DIR ??
    ""
  );

  return normalizeDirectionCode(
    mapValue[String(routeId)] ?? ""
  );
}

/*
  Fleksibel untuk:
  Kota
  Blok M
  Harmoni
  Pulo Gadung
  dst.
*/
function getDirectionLabel(direction) {
  const code = normalizeDirectionCode(direction);

  if (!code || code === "BOTH") {
    return "";
  }

  const fixed = {
    KOTA: "Arah Kota",
    BLOK_M: "Arah Blok M",
    HARMONI: "Arah Harmoni",
    PULO_GADUNG: "Arah Pulo Gadung",
    KALIDERES: "Arah Kalideres",
    PASAR_BARU: "Arah Pasar Baru",
    LEBAK_BULUS: "Arah Lebak Bulus",
    JAKARTA_INTERNATIONAL_STADIUM: "Arah JIS",
    JIS: "Arah JIS"
  };

  if (fixed[code]) {
    return fixed[code];
  }

  const pretty = code
    .toLowerCase()
    .split("_")
    .map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");

  return `Arah ${pretty}`;
}

/*
  Field khusus transfer.
*/
function getStopIntegrations(feature) {
  const p = feature.properties;

  return splitIds(
    p.INTEGRASI ??
    p.INTEGRATE ??
    ""
  );
}

/*
  Nama titik fisik yang terkait dengan integrasi.
  Field terbaru: INT_NM

  Contoh:
  BRT_04:Galunggung;
  KRL_CK:Sudirman;
  MRT_NS:Dukuh Atas
*/
function getStopIntegrationNameMap(feature) {
  const p =
    feature?.properties ?? {};

  return parseRouteMap(
    p.INT_NM ??
    p.INTEGRASI_NM ??
    ""
  );
}


function getIntegrationPlacePrefix(info) {
  return info?.brt
    ? "Halte"
    : "Stasiun";
}

/*
  Semua halte pada suatu rute langsung dari ROUTES.
  SEQ_MAP hanya menentukan urutan.
*/
function getStopsForRoute(routeId) {
  if (!stopData?.features) {
    return [];
  }

  const selectedRouteId =
    String(routeId);

  return stopData.features
    .filter(
      feature =>
        stopServesRoute(
          feature,
          selectedRouteId
        )
    )
    .sort(
      (a, b) => {
        const seqA =
          getStopSequence(
            a,
            selectedRouteId
          );

        const seqB =
          getStopSequence(
            b,
            selectedRouteId
          );

        if (seqA !== seqB) {
          return seqA - seqB;
        }

        /*
          Bila sequence sama, gunakan nama hanya sebagai
          tie-breaker agar urutan stabil.
        */
        return getStopDisplayName(a)
          .localeCompare(
            getStopDisplayName(b),
            "id"
          );
      }
    );
}

/* =========================================================
   DATA VALIDATION
   ========================================================= */

function validateStopData() {
  if (!stopData?.features) {
    return;
  }

  const explicitIds = new Map();
  const blankStopIds = [];
  const missingSequence = [];
  const invalidPoints = [];
  const integrationNameWithoutService = [];
  const integrationWithoutName = [];

  stopData.features.forEach(
    (feature, index) => {

      const p =
        feature.properties ?? {};

      const stopName =
        getStopDisplayName(feature);

      const stopId =
        String(
          p.STOP_ID ?? ""
        ).trim();

      if (!stopId) {
        blankStopIds.push(
          stopName
        );
      }
      else {
        explicitIds.set(
          stopId,
          (
            explicitIds.get(stopId)
            ?? 0
          ) + 1
        );
      }

      const geometry =
        feature.geometry;

      if (
        !geometry ||
        geometry.type !== "Point" ||
        !Array.isArray(
          geometry.coordinates
        ) ||
        geometry.coordinates.length < 2
      ) {
        invalidPoints.push(
          stopName
        );
      }

      const routes =
        getStopRoutes(feature);

      routes.forEach(routeId => {

        const seqMap =
          parseRouteMap(
            p.SEQ_MAP ?? ""
          );

        if (
          !String(
            seqMap[routeId] ?? ""
          ).trim()
        ) {
          missingSequence.push(
            `${stopName} → ${routeId}`
          );
        }

      });


      const integrations =
        getStopIntegrations(
          feature
        );

      const integrationNameMap =
        getStopIntegrationNameMap(
          feature
        );

      Object.keys(
        integrationNameMap
      )
        .forEach(code => {

          if (
            !integrations.includes(
              code
            )
          ) {
            integrationNameWithoutService.push(
              `${stopName} → ${code}`
            );
          }

        });


      integrations.forEach(code => {

        if (
          Object.keys(
            integrationNameMap
          ).length > 0
          &&
          !String(
            integrationNameMap[
              code
            ] ?? ""
          ).trim()
        ) {
          integrationWithoutName.push(
            `${stopName} → ${code}`
          );
        }

      });

    }
  );

  const duplicateIds =
    Array.from(
      explicitIds.entries()
    )
      .filter(
        ([, count]) =>
          count > 1
      );

  console.groupCollapsed(
    "Validasi brt_stop.geojson"
  );

  console.log(
    "Jumlah halte/stasiun:",
    stopData.features.length
  );

  if (blankStopIds.length) {
    console.warn(
      `${blankStopIds.length} STOP_ID kosong. ` +
      "WebGIS memakai FID sebagai runtime key sementara.",
      blankStopIds
    );
  }

  if (duplicateIds.length) {
    console.warn(
      "STOP_ID duplikat:",
      duplicateIds
    );
  }

  if (missingSequence.length) {
    console.warn(
      "ROUTES terisi tetapi sequence route terkait belum ada di SEQ_MAP:",
      missingSequence
    );
  }

  if (
    integrationNameWithoutService.length
  ) {
    console.warn(
      "INT_NM memiliki kode yang tidak ada di INTEGRASI:",
      integrationNameWithoutService
    );
  }

  if (
    integrationWithoutName.length
  ) {
    console.warn(
      "Sebagian kode INTEGRASI belum memiliki nama titik pada INT_NM:",
      integrationWithoutName
    );
  }

  if (invalidPoints.length) {
    console.warn(
      "Geometry Point tidak valid:",
      invalidPoints
    );
  }

  console.groupEnd();
}

/* =========================================================
   ROUTE FILTER
   ========================================================= */

function getFilteredRoutes() {
  if (!routeData) return [];

  const selectedMode = modeSelect.value;
  const selectedStatus = statusSelect.value;

  return routeData.features
    .filter(feature => {
      const mode = getRouteMode(feature);
      const status = normalizeStatus(
        feature.properties.STATUS
      );

      const modeMatch =
        selectedMode === "ALL" ||
        mode === selectedMode;

      const statusMatch =
        selectedStatus === "ALL" ||
        status === selectedStatus;

      return modeMatch && statusMatch;
    })
    .sort((a, b) =>
      getRouteOrder(a) - getRouteOrder(b)
    );
}

/* =========================================================
   ROUTE STYLE
   ========================================================= */

function routeStyle(feature) {
  return {
    pane: "routePane",
    color: feature.properties.COLOR || "#555555",
    weight: 4,
    opacity: 1,
    lineCap: "round",
    lineJoin: "round"
  };
}

function haloStyle() {
  return {
    pane: "routeHaloPane",
    color:
      currentBasemapType === "satellite"
        ? "#ffffff"
        : "#222222",
    weight: 7,
    opacity:
      currentBasemapType === "satellite"
        ? 0.90
        : 0.55,
    lineCap: "round",
    lineJoin: "round",
    interactive: false
  };
}

function updateHalo() {
  if (routeHaloLayer) {
    routeHaloLayer.setStyle(
      haloStyle()
    );
  }
}

/* =========================================================
   ROUTE POPUP
   ========================================================= */

function bindRoutePopup(feature, layer) {
  const p = feature.properties;

  const alignmentHTML = hasText(p.ALIGNMENT)
    ? `
      <div class="route-popup-row">
        <div class="route-popup-label">Trase</div>
        <div class="route-popup-value">
          ${escapeHTML(p.ALIGNMENT)}
        </div>
      </div>
    `
    : "";

  const remarkHTML = hasText(p.REMARK)
    ? `
      <div class="route-popup-row">
        <div class="route-popup-label">Catatan</div>
        <div class="route-popup-value">
          ${escapeHTML(cleanText(p.REMARK))}
        </div>
      </div>
    `
    : "";

  layer.bindPopup(
    `
      <div class="route-popup">

        <div
          class="route-popup-title"
          style="color:${escapeHTML(p.COLOR || "#151515")}"
        >
          ${escapeHTML(getRouteTitle(feature))}
        </div>

        <div class="route-popup-divider"></div>

        <div class="route-popup-row">
          <div class="route-popup-label">Moda</div>
          <div class="route-popup-value">
            ${escapeHTML(getRouteMode(feature))}
          </div>
        </div>

        <div class="route-popup-row">
          <div class="route-popup-label">Status</div>
          <div class="route-popup-value">
            ${escapeHTML(normalizeStatus(p.STATUS))}
          </div>
        </div>

        ${alignmentHTML}
        ${remarkHTML}

      </div>
    `,
    {
      maxWidth: 320
    }
  );

  /*
    Klik langsung pada garis koridor:
    - sinkronkan dropdown
    - tampilkan halte
    - zoom ke keseluruhan rute
  */
  layer.on("click", event => {
    if (event) {
      L.DomEvent.stopPropagation(
        event
      );
    }

    const routeId =
      getRouteId(feature);

    if (!routeId) {
      return;
    }

    routeSelect.value =
      routeId;

    if (isMobileLayout()) {
      setMobileFilterOpen(
        false
      );

      setBasemapPanelOpen(
        false
      );
    }

    showSingleRoute(
      routeId
    );

    /*
      route layer digambar ulang oleh showSingleRoute().
      Jalankan fit sekali lagi setelah frame baru agar
      klik garis selalu menghasilkan zoom yang pas.
    */
    requestAnimationFrame(
      () => {
        fitRouteToScreen();
      }
    );
  });
}

/* =========================================================
   ROUTE LAYER
   ========================================================= */

function removeRouteLayers() {
  if (routeHaloLayer) {
    map.removeLayer(routeHaloLayer);
    routeHaloLayer = null;
  }

  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
}

function drawRoutes(features) {
  removeRouteLayers();

  const fc = featureCollection(features);

  routeHaloLayer = L.geoJSON(
    fc,
    {
      style: haloStyle
    }
  ).addTo(map);

  routeLayer = L.geoJSON(
    fc,
    {
      style: routeStyle,
      onEachFeature: bindRoutePopup
    }
  ).addTo(map);
}

/* =========================================================
   ROUTE INFO
   ========================================================= */

function renderAllRouteInfo() {
  const modeLabel =
    modeSelect.options[
      modeSelect.selectedIndex
    ]?.text || "Semua Moda";

  const statusLabel =
    statusSelect.options[
      statusSelect.selectedIndex
    ]?.text || "Semua Status";

  routeInfoEl.innerHTML = `
    <div class="eyebrow">TAMPILAN</div>

    <h2>
      Semua Lin / Koridor
    </h2>

    <p>
      ${escapeHTML(modeLabel)}
      ·
      ${escapeHTML(statusLabel)}
    </p>
  `;
}

function renderRouteInfo(feature) {
  const p = feature.properties;

  const alignmentHTML = hasText(p.ALIGNMENT)
    ? `
      <div class="route-meta-row">
        <div class="route-meta-label">Trase</div>
        <div>${escapeHTML(p.ALIGNMENT)}</div>
      </div>
    `
    : "";

  routeInfoEl.innerHTML = `
    <div class="eyebrow">
      ${escapeHTML(
        getRouteHeaderLabel(feature)
      )}
    </div>

    <h2>
      ${escapeHTML(getRouteTitle(feature))}
    </h2>

    <div class="route-meta">

      <div class="route-meta-row">
        <div class="route-meta-label">Moda</div>
        <div>${escapeHTML(getRouteMode(feature))}</div>
      </div>

      <div class="route-meta-row">
        <div class="route-meta-label">Status</div>
        <div>${escapeHTML(normalizeStatus(p.STATUS))}</div>
      </div>

      ${alignmentHTML}

    </div>
  `;
}

/* =========================================================
   DROPDOWN ROUTE
   ========================================================= */

function populateRouteDropdown() {
  const features = getFilteredRoutes();

  routeSelect.innerHTML = `
    <option value="ALL">
      Semua Lin / Koridor
    </option>
  `;

  features.forEach(feature => {
    const option = document.createElement("option");

    option.value = getRouteId(feature);
    option.textContent = getRouteOptionText(feature);

    routeSelect.appendChild(option);
  });

  routeSelect.value = "ALL";
}

/* =========================================================
   BRT BADGES
   ========================================================= */

function routeNumberFromId(routeId) {
  const raw = String(routeId ?? "");

  if (!raw.startsWith("BRT_")) {
    return raw;
  }

  const number = Number(
    raw.replace("BRT_", "")
  );

  return Number.isFinite(number)
    ? String(number)
    : raw.replace("BRT_", "");
}

function buildBrtBadge(routeId) {
  const number = routeNumberFromId(routeId);

  const isDoubleDigit =
    Number(number) >= 10;

  return `
    <span
      class="
        brt-route-badge
        ${isDoubleDigit ? "is-double-digit" : ""}
      "
      style="
        --route-color:
        ${escapeHTML(getRouteColor(routeId))};
      "
    >
      ${escapeHTML(number)}
    </span>
  `;
}

function buildSmallRouteBadge(routeId) {
  if (
    !String(routeId)
      .toUpperCase()
      .startsWith("BRT_")
  ) {
    return "";
  }

  const number = routeNumberFromId(routeId);

  return `
    <span
      class="
        stop-list-route-badge
        ${Number(number) >= 10 ? "is-double-digit" : ""}
      "
      style="
        background:
        ${escapeHTML(getRouteColor(routeId))};
      "
      title="Koridor ${escapeHTML(number)}"
    >
      ${escapeHTML(number)}
    </span>
  `;
}

/* =========================================================
   INTEGRATION INFO
   ========================================================= */

function getIntegrationInfo(id) {

  const code = String(id ?? "")
    .trim()
    .toUpperCase();


  /*
    MRT JAKARTA
  */
  if (code === "MRT_NS") {

    return {
      code,
      operatorKey: "MRT_JAKARTA",
      operator: "MRT Jakarta",
      route: "Lin Utara–Selatan",
      logo: TRANSIT_LOGOS.MRT
    };

  }


  if (code === "MRT_EW") {

    return {
      code,
      operatorKey: "MRT_JAKARTA",
      operator: "MRT Jakarta",
      route: "Lin Timur–Barat",
      logo: TRANSIT_LOGOS.MRT
    };

  }


  /*
    LRT JAKARTA
  */
  if (
    code === "LRT_JKT" ||
    code === "LRT_JKT_PDV"
  ) {

    return {
      code,
      operatorKey: "LRT_JAKARTA",
      operator: "LRT Jakarta",
      route: "Pegangsaan Dua–Velodrome",
      logo: TRANSIT_LOGOS.LRT_JKT
    };

  }


  if (code === "LRT_JKT_S") {

    return {
      code,
      operatorKey: "LRT_JAKARTA",
      operator: "LRT Jakarta",
      route: "Lin Selatan",
      logo: TRANSIT_LOGOS.LRT_JKT
    };

  }


  if (code === "LRT_JKT_U") {

    return {
      code,
      operatorKey: "LRT_JAKARTA",
      operator: "LRT Jakarta",
      route: "Lin Utara",
      logo: TRANSIT_LOGOS.LRT_JKT
    };

  }


  /*
    LRT JABODEBEK - CIBUBUR
  */
  if (
    code === "LRT_JB_CB" ||
    code === "LRT_JB_CBK"
  ) {

    return {
      code,
      operatorKey: "LRT_JABODEBEK",
      operator: "LRT Jabodebek",
      route: "Lin Cibubur",
      logo: TRANSIT_LOGOS.LRT_JB
    };

  }


  /*
    LRT JABODEBEK - BEKASI
  */
  if (
    code === "LRT_JB_BK" ||
    code === "LRT_JB_BKS"
  ) {

    return {
      code,
      operatorKey: "LRT_JABODEBEK",
      operator: "LRT Jabodebek",
      route: "Lin Bekasi",
      logo: TRANSIT_LOGOS.LRT_JB
    };

  }


  /*
    KRL COMMUTER LINE
  */
  if (code === "KRL_BO") {

    return {
      code,
      operatorKey: "KRL",
      operator: "KRL Commuter Line",
      route: "Bogor Line",
      logo: TRANSIT_LOGOS.KRL
    };

  }


  if (code === "KRL_CK") {

    return {
      code,
      operatorKey: "KRL",
      operator: "KRL Commuter Line",
      route: "Cikarang Loop Line",
      logo: TRANSIT_LOGOS.KRL
    };

  }


  if (code === "KRL_RA") {

    return {
      code,
      operatorKey: "KRL",
      operator: "KRL Commuter Line",
      route: "Rangkasbitung Line",
      logo: TRANSIT_LOGOS.KRL
    };

  }


  if (code === "KRL_TA") {

    return {
      code,
      operatorKey: "KRL",
      operator: "KRL Commuter Line",
      route: "Tangerang Line",
      logo: TRANSIT_LOGOS.KRL
    };

  }


  if (code === "KRL_TP") {

    return {
      code,
      operatorKey: "KRL",
      operator: "KRL Commuter Line",
      route: "Tanjung Priok Line",
      logo: TRANSIT_LOGOS.KRL
    };

  }


  /*
    KERETA API JARAK JAUH
    Tidak mempunyai badge lin khusus.
  */
  if (code === "KAI_KAJJ") {

    return {
      code,
      operatorKey: "KAI_KAJJ",
      operator: "Kereta Api Jarak Jauh",
      route: "",
      logo: TRANSIT_LOGOS.KAI,
      kajj: true
    };

  }


  /*
    TRANSJAKARTA
  */
  if (code.startsWith("BRT_")) {

    return {
      code,
      operatorKey: "TRANSJAKARTA",
      operator: "TransJakarta",
      route: `Koridor ${routeNumberFromId(code)}`,
      logo: TRANSIT_LOGOS.TJ,
      brt: true,
      routeId: code
    };

  }


  /*
    FALLBACK
  */
  return {
    code,
    operatorKey: code || "LAINNYA",
    operator: "",
    route: code.replaceAll("_", " "),
    logo: ""
  };

}


function groupIntegrationsByOperator(
  ids,
  integrationNameMap = {}
) {

  const groups =
    new Map();


  ids.forEach(id => {

    const info =
      getIntegrationInfo(id);

    const key =
      info.operatorKey;

    const relatedName =
      String(
        integrationNameMap[
          info.code
        ]
        ??
        integrationNameMap[
          String(id)
        ]
        ??
        ""
      )
        .trim();

    const serviceInfo = {
      ...info,
      relatedName
    };


    if (!groups.has(key)) {

      groups.set(
        key,
        {
          operatorKey: key,
          operator: info.operator,
          logo: info.logo,
          services: []
        }
      );

    }


    groups
      .get(key)
      .services
      .push(
        serviceInfo
      );

  });


  return Array.from(
    groups.values()
  );

}


function getIntegrationPlaceLabel(service) {
  const relatedName =
    String(
      service?.relatedName ?? ""
    )
      .trim();

  if (!relatedName) {
    return "";
  }

  return (
    `${getIntegrationPlacePrefix(service)} ${relatedName}`
  );
}


function buildIntegrationBadge(service) {

  /*
    KAJJ adalah jenis layanan, bukan lin.
    Karena itu tidak memakai badge lin.
  */
  if (service.kajj) {
    return "";
  }

  if (service.brt) {
    return buildBrtBadge(
      service.routeId
    );
  }

  return buildLineBadge(
    service.code
  );
}


function groupServicesByRelatedPlace(services) {
  const groups =
    new Map();


  services.forEach(service => {

    const placeLabel =
      getIntegrationPlaceLabel(
        service
      );

    /*
      Jika beberapa lin menuju titik yang sama:
      [CB] [BK] Stasiun Dukuh Atas
    */
    const key =
      placeLabel ||
      `__NO_PLACE__${service.code}`;


    if (!groups.has(key)) {
      groups.set(
        key,
        {
          placeLabel,
          services: []
        }
      );
    }


    groups
      .get(key)
      .services
      .push(service);

  });


  return Array.from(
    groups.values()
  );
}


function buildIntegrationPlaceRow(placeGroup) {

  const badgesHTML =
    placeGroup.services
      .map(
        buildIntegrationBadge
      )
      .join("");


  const placeHTML =
    placeGroup.placeLabel
      ?
      `
        <span class="integration-place-name">
          ${escapeHTML(
            placeGroup.placeLabel
          )}
        </span>
      `
      :
      `
        <span class="integration-place-name is-missing">
          Titik integrasi belum diisi
        </span>
      `;


  return `
    <div class="integration-place-row">

      <div class="integration-line-badges">
        ${badgesHTML}
      </div>

      ${placeHTML}

    </div>
  `;
}


function buildIntegrationGroup(group) {

  const logoHTML =
    group.logo
      ?
      `
        <img
          class="integration-logo"
          src="${escapeHTML(
            group.logo
          )}"
          alt="${escapeHTML(
            group.operator
          )}"
          onerror="
            this.style.display='none'
          "
        >
      `
      :
      "";


  const placeGroups =
    groupServicesByRelatedPlace(
      group.services
    );


  const placesHTML =
    placeGroups
      .map(
        buildIntegrationPlaceRow
      )
      .join("");


  return `
    <div class="integration-group">

      <div class="integration-group-header">

        <div class="integration-symbol">
          ${logoHTML}
        </div>

        <div class="integration-operator">
          ${escapeHTML(
            group.operator ||
            group.operatorKey
          )}
        </div>

      </div>


      <div class="integration-place-list">

        ${placesHTML}

      </div>

    </div>
  `;

}


/* =========================================================
   STOP TYPE + RAIL LINE BADGE
   ========================================================= */

function getTransitObjectTerms(feature) {
  const mode =
    normalizeMode(
      feature?.properties?.MODE
    );

  if (mode === "BRT") {
    return {
      singular: "Halte",
      singularUpper: "HALTE",
      selectedUpper: "HALTE TERPILIH",
      orderLabel: "Urutan Halte",
      statusLabel: "Status Halte",
      helpText: "Klik nama halte untuk zoom ke lokasi."
    };
  }

  return {
    singular: "Stasiun",
    singularUpper: "STASIUN",
    selectedUpper: "STASIUN TERPILIH",
    orderLabel: "Urutan Stasiun",
    statusLabel: "Status Stasiun",
    helpText: "Klik nama stasiun untuk zoom ke lokasi."
  };
}


function getStopTypeLabel(feature) {
  const mode = normalizeMode(
    feature?.properties?.MODE
  );

  if (mode === "BRT") {
    return "HALTE BRT";
  }

  if (mode === "MRT") {
    return "STASIUN MRT";
  }

  if (mode === "LRT") {
    return "STASIUN LRT";
  }

  if (mode === "KRL") {
    return "STASIUN KRL";
  }

  return mode
    ? `HALTE / STASIUN ${mode}`
    : "HALTE / STASIUN";
}

function buildLineBadge(id) {
  const code = String(id ?? "")
    .trim()
    .toUpperCase();

  const image =
    LINE_BADGE_IMAGES[code] || "";

  const text =
    LINE_BADGE_TEXT[code] ||
    code.split("_").pop() ||
    "";

  if (!text) {
    return "";
  }

  /*
    Kalau file badge gambar belum tersedia, browser akan
    menyembunyikan gambar dan menampilkan badge teks fallback.
  */
  if (image) {
    return `
      <span class="rail-line-badge-wrap">

        <img
          class="rail-line-badge-image"
          src="${escapeHTML(image)}"
          alt="${escapeHTML(text)}"
          onerror="
            this.style.display='none';
            this.nextElementSibling.style.display='inline-flex';
          "
        />

        <span
          class="rail-line-badge-fallback"
          style="display:none"
        >
          ${escapeHTML(text)}
        </span>

      </span>
    `;
  }

  return `
    <span class="rail-line-badge-fallback">
      ${escapeHTML(text)}
    </span>
  `;
}

function getStopStatus(feature) {
  return normalizeStatus(
    feature?.properties?.STATUS
  ) || "-";
}

function getStopStatusClass(feature) {
  const status =
    getStopStatus(feature)
      .toLowerCase();

  if (status.includes("usulan")) {
    return "is-proposal";
  }

  if (status.includes("rencana")) {
    return "is-planned";
  }

  if (status.includes("eksisting")) {
    return "is-existing";
  }

  return "is-other";
}

function getStopStatusShort(feature) {
  const status =
    getStopStatus(feature);

  if (
    status.toLowerCase()
      .includes("usulan")
  ) {
    return "Usulan";
  }

  if (
    status.toLowerCase()
      .includes("rencana")
  ) {
    return "Rencana";
  }

  return status;
}

/* =========================================================
   STOP POPUP
   ========================================================= */

function buildStopPopup(feature) {
  const p = feature.properties;

  const directRoutes =
    getStopRoutes(feature);

  const brtRoutes =
    directRoutes.filter(
      routeId =>
        String(routeId)
          .toUpperCase()
          .startsWith("BRT_")
    );

  const integrations =
    getStopIntegrations(feature);

  const integrationNameMap =
    getStopIntegrationNameMap(
      feature
    );

  const role =
    cleanText(p.STOP_ROLE);

  const roleHTML =
    role &&
    role.toLowerCase() !== "reguler" &&
    role.toLowerCase() !== "regular" &&
    role.toLowerCase() !== "normal"
      ? `
        <div class="stop-popup-role">
          ${escapeHTML(role)}
        </div>
      `
      : "";

  const brtHTML = brtRoutes.length
    ? `
      <div class="stop-popup-section">

        <div class="stop-popup-label">
          Koridor yang dilayani
        </div>

        <div class="brt-route-badges">
          ${
            brtRoutes
              .map(buildBrtBadge)
              .join("")
          }
        </div>

      </div>
    `
    : "";

  const integrationGroups =
    groupIntegrationsByOperator(
      integrations,
      integrationNameMap
    );


  const integrationHTML =
    integrationGroups.length
      ?
      `
        <div class="stop-popup-section">

          <div class="stop-popup-label">
            Integrasi
          </div>

          <div class="integration-list">

            ${
              integrationGroups
                .map(
                  buildIntegrationGroup
                )
                .join("")
            }

          </div>

        </div>
      `
      :
      "";

  return `
    <div class="stop-popup">

      <div class="stop-popup-eyebrow">
        ${escapeHTML(getStopTypeLabel(feature))}
      </div>

      <div class="stop-popup-title">
        ${escapeHTML(getStopDisplayName(feature))}
      </div>

      <div class="stop-popup-status ${getStopStatusClass(feature)}">
        ${escapeHTML(getStopStatus(feature))}
      </div>

      ${roleHTML}

      <div class="stop-popup-divider"></div>

      ${brtHTML}
      ${integrationHTML}

    </div>
  `;
}


function safeBuildStopPopup(feature) {
  try {
    return buildStopPopup(feature);
  } catch (error) {
    console.error(
      "Gagal membangun popup halte/stasiun:",
      getStopDisplayName(feature),
      error
    );

    return `
      <div class="stop-popup">
        <div class="stop-popup-eyebrow">
          ${escapeHTML(getStopTypeLabel(feature))}
        </div>

        <div class="stop-popup-title">
          ${escapeHTML(getStopDisplayName(feature))}
        </div>

        <div class="stop-popup-status ${getStopStatusClass(feature)}">
          ${escapeHTML(getStopStatus(feature))}
        </div>
      </div>
    `;
  }
}

/* =========================================================
   STOP STYLE
   ========================================================= */

function normalStopStyle(routeId) {
  return {
    pane: "stopPane",
    radius: 5,
    color: getRouteColor(routeId),
    weight: 2,
    fillColor: "#ffffff",
    fillOpacity: 1
  };
}

function selectedStopStyle(routeId) {
  return {
    pane: "stopPane",
    radius: 8,
    color: "#151515",
    weight: 2.5,
    fillColor: getRouteColor(routeId),
    fillOpacity: 1
  };
}

function getStopPopupOptions() {

  if (isMobileLayout()) {

    const popupWidth =
      Math.max(
        240,
        Math.min(
          360,
          window.innerWidth - 44
        )
      );

    return {
      maxWidth:
        popupWidth,

      minWidth:
        Math.min(
          270,
          popupWidth
        ),

      autoPanPaddingTopLeft:
        [16, 105],

      autoPanPaddingBottomRight:
        [16, 78]
    };
  }

  return {
    maxWidth: 470,
    minWidth: 320,
    autoPanPaddingTopLeft:
      [270, 45],
    autoPanPaddingBottomRight:
      [45, 70]
  };
}


/* =========================================================
   STOP LAYER
   ========================================================= */

function removeStops() {
  if (stopLayer) {
    map.removeLayer(stopLayer);
    stopLayer = null;
  }

  stopMarkerByKey.clear();
}

function drawStops(routeId) {
  removeStops();

  const features = getStopsForRoute(
    routeId
  );

  if (!features.length) {
    console.warn(
      `Tidak ada halte / stasiun untuk ${routeId}`
    );

    return;
  }

  stopLayer = L.geoJSON(
    featureCollection(features),
    {
      pointToLayer(feature, latlng) {
        return L.circleMarker(
          latlng,
          normalStopStyle(routeId)
        );
      },

      onEachFeature(feature, layer) {
        const stopKey =
          getStopKey(feature);

        stopMarkerByKey.set(
          stopKey,
          layer
        );

        layer.bindPopup(
          safeBuildStopPopup(feature),
          getStopPopupOptions()
        );

        layer.on(
          "click",
          event => {
            L.DomEvent.stopPropagation(
              event
            );

            selectStop(
              stopKey,
              routeId,
              true
            );
          }
        );
      }
    }
  ).addTo(map);
}

/* =========================================================
   STOP LIST
   ========================================================= */

function renderStopList(routeId) {
  const features =
    getStopsForRoute(routeId);

  if (!features.length) {
    stopListEl.innerHTML = `
      <div class="stop-list-empty">
        Belum ada halte / stasiun yang terhubung ke koridor ini.
      </div>
    `;
    return;
  }

  const listHTML = features
    .map(feature => {
      const p = feature.properties;

      const stopKey =
        getStopKey(feature);

      const direction =
        getDirectionLabel(
          getStopDirection(
            feature,
            routeId
          )
        );

      const role =
        cleanText(p.STOP_ROLE);

      /*
        Sequence khusus koridor yang sedang dipilih.
        Contoh:
        Pulo Gadung:
        BRT_02:01;BRT_04:01

        Saat K4 aktif -> routeSeq = "01".
      */
      const routeSeq =
        getStopSequenceRaw(
          feature,
          routeId
        );

      const seqBadgeHTML =
        routeSeq
          ?
          `
            <span class="stop-seq-badge">
              ${escapeHTML(routeSeq)}
            </span>
          `
          :
          `
            <span
              class="stop-seq-badge is-missing"
              title="Sequence koridor ini belum diisi"
            >
              ?
            </span>
          `;

      const routeBadgeHTML =
        getStopRoutes(feature)
          .filter(
            item =>
              String(item)
                .toUpperCase()
                .startsWith("BRT_")
          )
          .map(
            buildSmallRouteBadge
          )
          .join("");

      const rightBadges = [];

      if (direction) {
        rightBadges.push(`
          <span class="stop-direction">
            ${escapeHTML(direction)}
          </span>
        `);
      }

      if (
        role &&
        role.toLowerCase() !== "reguler" &&
        role.toLowerCase() !== "regular" &&
        role.toLowerCase() !== "normal"
      ) {
        rightBadges.push(`
          <span class="stop-role">
            ${escapeHTML(role)}
          </span>
        `);
      }
      /*
        Status Eksisting tidak perlu diulang di setiap baris.
        Rencana / Usulan ditampilkan agar halte khusus langsung terbaca.
      */
      if (
        getStopStatus(feature)
          .toLowerCase() !== "eksisting"
      ) {
        rightBadges.push(`
          <span class="stop-status-badge ${getStopStatusClass(feature)}">
            ${escapeHTML(getStopStatusShort(feature))}
          </span>
        `);
      }

      return `
        <div
          class="stop-list-item"
          data-stop-key="${escapeHTML(stopKey)}"
          tabindex="0"
          role="button"
        >

          <div class="stop-list-item-left">

            <span class="stop-list-sequence">
              ${seqBadgeHTML}
            </span>

            <span class="stop-list-route-badges">
              ${routeBadgeHTML}
            </span>

            <span class="stop-list-name">
              ${escapeHTML(getStopDisplayName(feature))}
            </span>

          </div>

          <span class="stop-list-badges">
            ${rightBadges.join("")}
          </span>

        </div>
      `;
    })
    .join("");

  const listTerms =
    features.length
      ? getTransitObjectTerms(
          features[0]
        )
      : {
          singularUpper:
            "HALTE / STASIUN",
          helpText:
            "Klik nama halte / stasiun untuk zoom ke lokasi."
        };

  stopListEl.innerHTML = `
    <div class="stop-list-heading">
      ${escapeHTML(
        listTerms.singularUpper
      )}
    </div>

    <div class="stop-list-help">
      ${escapeHTML(
        listTerms.helpText
      )}
    </div>

    ${listHTML}
  `;

  stopListEl
    .querySelectorAll(
      ".stop-list-item"
    )
    .forEach(element => {
      const action = () => {
        selectStop(
          element.dataset.stopKey,
          routeId,
          true
        );
      };

      element.addEventListener(
        "click",
        action
      );

      element.addEventListener(
        "keydown",
        event => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            action();
          }
        }
      );
    });
}

/* =========================================================
   SELECT STOP
   ========================================================= */

function clearSelectedStop() {
  if (
    currentSelectedStopKey &&
    currentSelectedRouteId
  ) {
    const oldMarker =
      stopMarkerByKey.get(
        currentSelectedStopKey
      );

    if (oldMarker) {
      oldMarker.setStyle(
        normalStopStyle(
          currentSelectedRouteId
        )
      );
    }
  }

  currentSelectedStopKey = null;

  selectedStopInfoEl.hidden = true;
  selectedStopInfoEl.innerHTML = "";

  stopListEl
    .querySelectorAll(
      ".stop-list-item"
    )
    .forEach(
      item =>
        item.classList.remove(
          "is-selected"
        )
    );
}

function selectStop(
  stopKey,
  routeId,
  zoomIn = true
) {
  clearSelectedStop();

  if (isMobileLayout()) {
    setMobileFilterOpen(
      false
    );

    setBasemapPanelOpen(
      false
    );
  }

  const marker =
    stopMarkerByKey.get(
      String(stopKey)
    );

  const feature =
    getStopByKey(
      stopKey
    );

  if (!marker || !feature) {
    return;
  }

  currentSelectedStopKey =
    String(stopKey);

  currentSelectedRouteId =
    String(routeId);

  marker.setStyle(
    selectedStopStyle(
      routeId
    )
  );

  marker.bringToFront();

  if (zoomIn) {
    map.flyTo(
      marker.getLatLng(),
      STOP_ZOOM,
      {
        animate: true,
        duration: 0.65
      }
    );
  }

  setTimeout(
    () => marker.openPopup(),
    zoomIn ? 380 : 0
  );

  const p = feature.properties;

  const direction =
    getDirectionLabel(
      getStopDirection(
        feature,
        routeId
      )
    );

  const role =
    cleanText(p.STOP_ROLE);

  selectedStopInfoEl.hidden =
    false;

  const selectedTerms =
    getTransitObjectTerms(
      feature
    );

  selectedStopInfoEl.innerHTML = `
    <div class="eyebrow">
      ${escapeHTML(
        selectedTerms.selectedUpper
      )}
    </div>

    <h3 class="selected-stop-title">
      ${escapeHTML(getStopDisplayName(feature))}
    </h3>

    <div class="selected-stop-row">
      ${escapeHTML(
        selectedTerms.orderLabel
      )}:
      <strong>
        ${
          getStopSequenceRaw(feature, routeId)
          ? escapeHTML(
              getStopSequenceRaw(
                feature,
                routeId
              )
            )
          : "Belum diisi"
        }
      </strong>
    </div>

    <div class="selected-stop-row">
      ${escapeHTML(
        selectedTerms.statusLabel
      )}:
      <strong class="selected-stop-status ${getStopStatusClass(feature)}">
        ${escapeHTML(getStopStatus(feature))}
      </strong>
    </div>

    ${
      direction
        ? `
          <div class="selected-stop-row">
            Pelayanan:
            <strong>
              ${escapeHTML(direction)}
            </strong>
          </div>
        `
        : ""
    }

    ${
      role &&
      role.toLowerCase() !== "reguler" &&
      role.toLowerCase() !== "regular" &&
      role.toLowerCase() !== "normal"
        ? `
          <div class="selected-stop-row">
            Fungsi:
            <strong>
              ${escapeHTML(role)}
            </strong>
          </div>
        `
        : ""
    }
  `;

  stopListEl
    .querySelectorAll(
      ".stop-list-item"
    )
    .forEach(item => {
      item.classList.toggle(
        "is-selected",
        item.dataset.stopKey ===
        String(stopKey)
      );
    });
}

/* =========================================================
   MOBILE PANEL
   ========================================================= */

function isMobileLayout() {
  return window.matchMedia(
    "(max-width: 760px)"
  ).matches;
}


function setMobileFilterOpen(open) {

  if (!isMobileLayout()) {
    document.body
      .classList
      .remove(
        "mobile-filter-open"
      );

    mobileFilterToggle
      ?.setAttribute(
        "aria-expanded",
        "false"
      );

    return;
  }

  document.body
    .classList
    .toggle(
      "mobile-filter-open",
      Boolean(open)
    );

  mobileFilterToggle
    ?.setAttribute(
      "aria-expanded",
      String(
        Boolean(open)
      )
    );

  if (open) {
    setBasemapPanelOpen(
      false
    );
  }
}


mobileFilterToggle
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      setMobileFilterOpen(
        true
      );
    }
  );


mobileFilterClose
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      setMobileFilterOpen(
        false
      );
    }
  );


filterPanel
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();
    }
  );


/* =========================================================
   ROUTE VIEW / FIT TO SCREEN
   ========================================================= */

function getRouteFitPadding() {
  const mapEl =
    document.getElementById(
      "map"
    );

  const panelEl =
    document.querySelector(
      ".filter-panel"
    );

  const mapRect =
    mapEl
      ?.getBoundingClientRect();

  const viewportWidth =
    mapRect?.width ??
    window.innerWidth;

  /*
    Ponsel:
    panel filter berupa overlay/bottom-sheet, jadi tidak
    dipakai sebagai padding. Sisakan ruang untuk title
    di atas dan toolbar di bawah.
  */
  if (viewportWidth <= 760) {
    return {
      paddingTopLeft:
        [18, 112],

      paddingBottomRight:
        [18, 82]
    };
  }

  /*
    Desktop:
    sisakan ruang di kiri untuk panel.
  */
  const panelRect =
    panelEl
      ?.getBoundingClientRect();

  if (panelRect) {
    const leftPadding =
      Math.max(
        40,
        Math.ceil(
          panelRect.right -
          (mapRect?.left ?? 0) +
          28
        )
      );

    return {
      paddingTopLeft:
        [leftPadding, 45],

      paddingBottomRight:
        [55, 85]
    };
  }

  return {
    paddingTopLeft:
      [45, 45],

    paddingBottomRight:
      [45, 85]
  };
}

function fitRouteToScreen(
  {
    animate = true
  } = {}
) {
  if (
    !routeLayer ||
    !routeLayer
      .getBounds()
      .isValid()
  ) {
    return;
  }

  const padding =
    getRouteFitPadding();

  map.fitBounds(
    routeLayer.getBounds(),
    {
      ...padding,

      /*
        Hindari zoom terlalu dekat pada rute yang sangat pendek,
        tetapi tetap buat rute mengisi area layar.
      */
      maxZoom: 16,

      animate,

      duration:
        animate
          ? 0.55
          : 0
    }
  );
}


/* =========================================================
   SHOW ROUTES
   ========================================================= */

function showAllRoutes(
  fit = false
) {
  currentSelectedRouteId = null;

  clearSelectedStop();
  removeStops();

  stopListEl.innerHTML = "";

  const features =
    getFilteredRoutes();

  drawRoutes(features);
  renderAllRouteInfo();

  if (
    fit &&
    routeLayer &&
    routeLayer.getBounds().isValid()
  ) {
    const padding =
      getRouteFitPadding();

    map.fitBounds(
      routeLayer.getBounds(),
      {
        ...padding,
        maxZoom: 13
      }
    );
  }
}

function showSingleRoute(
  routeId
) {
  const feature =
    getRouteById(routeId);

  if (!feature) {
    return;
  }

  currentSelectedRouteId =
    String(routeId);

  clearSelectedStop();

  drawRoutes([feature]);
  renderRouteInfo(feature);

  /*
    Daftar halte dirender lebih dulu agar tetap muncul
    walaupun ada masalah pada marker/popup integrasi.
  */
  renderStopList(routeId);

  try {
    drawStops(routeId);
  } catch (error) {
    console.error(
      `Gagal menggambar halte/stasiun untuk ${routeId}:`,
      error
    );
  }

  /*
    Setelah daftar + marker halte selesai dibuat,
    zoom rute agar pas dengan area layar yang terlihat.
  */
  fitRouteToScreen();
}

/* =========================================================
   FILTER EVENTS
   ========================================================= */

function refreshFilters() {
  populateRouteDropdown();
  showAllRoutes(true);
}

modeSelect.addEventListener(
  "change",
  refreshFilters
);

statusSelect.addEventListener(
  "change",
  refreshFilters
);

routeSelect.addEventListener(
  "change",
  () => {
    if (
      routeSelect.value ===
      "ALL"
    ) {
      showAllRoutes(true);

      if (isMobileLayout()) {
        setMobileFilterOpen(
          false
        );
      }

      return;
    }

    showSingleRoute(
      routeSelect.value
    );

    if (isMobileLayout()) {
      setMobileFilterOpen(
        false
      );

      requestAnimationFrame(
        () => {
          fitRouteToScreen();
        }
      );
    }
  }
);

/* =========================================================
   BASEMAP
   ========================================================= */

function getPreviewZoom() {
  /*
    Miniatur dibuat sedikit lebih jauh agar konteks lokasi
    tetap terbaca walaupun peta utama sedang sangat dekat.
  */
  return Math.max(
    8,
    Math.min(
      16,
      map.getZoom() - 1
    )
  );
}


function createBasemapPreview(
  elementId,
  type
) {
  const element =
    document.getElementById(
      elementId
    );

  const config =
    BASEMAP_PREVIEW_CONFIG[type];

  if (
    !element ||
    !config
  ) {
    return;
  }

  const previewMap =
    L.map(
      element,
      {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        preferCanvas: true
      }
    )
      .setView(
        map.getCenter(),
        getPreviewZoom()
      );

  L.tileLayer(
    config.url,
    {
      ...config.options,
      opacity: 1
    }
  )
    .addTo(
      previewMap
    );

  basemapPreviewMaps.set(
    type,
    previewMap
  );
}


function syncBasemapPreviews() {
  const center =
    map.getCenter();

  const zoom =
    getPreviewZoom();

  basemapPreviewMaps.forEach(
    previewMap => {
      previewMap.setView(
        center,
        zoom,
        {
          animate: false
        }
      );

      previewMap.invalidateSize(
        {
          pan: false
        }
      );
    }
  );
}


createBasemapPreview(
  "previewLight",
  "light"
);

createBasemapPreview(
  "previewOsm",
  "osm"
);

createBasemapPreview(
  "previewSatellite",
  "satellite"
);

/*
  Tombol basemap utama tetap memakai gambar tile ringan.
  Galeri di panel adalah miniature Leaflet yang dinamis.
*/
currentBasemapThumb.src =
  BASEMAP_PREVIEWS.light;


function setBasemap(type) {
  const nextBasemap =
    BASEMAPS[type];

  if (!nextBasemap) {
    console.warn(
      `Basemap tidak ditemukan: ${type}`
    );
    return;
  }

  /*
    Jika memilih basemap yang sama, tetap sinkronkan UI
    tetapi tidak perlu membongkar layer.
  */
  if (
    currentBasemap !== nextBasemap
  ) {

    if (
      currentBasemap &&
      map.hasLayer(
        currentBasemap
      )
    ) {
      map.removeLayer(
        currentBasemap
      );
    }

    currentBasemap =
      nextBasemap;

    currentBasemap
      .setOpacity(
        basemapOpacity
      )
      .addTo(map);

    /*
      Pastikan basemap selalu berada di belakang
      rute, halte, GPS, dan overlay lainnya.
    */
    if (
      typeof currentBasemap
        .bringToBack ===
      "function"
    ) {
      currentBasemap
        .bringToBack();
    }
  }

  currentBasemapType =
    type;

  if (
    BASEMAP_PREVIEWS[type]
  ) {
    currentBasemapThumb.src =
      BASEMAP_PREVIEWS[type];
  }

  basemapOptions.forEach(
    option => {
      option.classList.toggle(
        "active",
        option.dataset.basemap ===
        type
      );
    }
  );

  updateHalo();
  syncBasemapPreviews();
}
function updateBasemapPanelState() {
  const isOpen =
    !basemapPanel.hidden;

  document.body.classList.toggle(
    "basemap-panel-open",
    isOpen
  );

  if (isOpen) {
    requestAnimationFrame(
      () => {
        const panelHeight =
          Math.ceil(
            basemapPanel
              .getBoundingClientRect()
              .height
          );

        document.documentElement
          .style
          .setProperty(
            "--basemap-panel-height",
            `${panelHeight}px`
          );

        syncBasemapPreviews();
      }
    );
  }
}


function setBasemapPanelOpen(open) {

  if (
    open &&
    isMobileLayout()
  ) {
    document.body
      .classList
      .remove(
        "mobile-filter-open"
      );

    mobileFilterToggle
      ?.setAttribute(
        "aria-expanded",
        "false"
      );
  }

  basemapPanel.hidden =
    !open;

  updateBasemapPanelState();
}


basemapButton.addEventListener(
  "click",
  event => {
    event.stopPropagation();
    setBasemapPanelOpen(
      basemapPanel.hidden
    );
  }
);

basemapClose.addEventListener(
  "click",
  () => {
    setBasemapPanelOpen(
      false
    );
  }
);


/*
  Klik pilihan basemap menggunakan event delegation.
  Ini lebih stabil daripada listener per tombol ketika
  thumbnail berisi miniature Leaflet map.
*/
basemapCarousel.addEventListener(
  "click",
  event => {

    const option =
      event.target.closest(
        ".basemap-option"
      );

    if (
      !option ||
      !basemapCarousel.contains(
        option
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setBasemap(
      option.dataset.basemap
    );
  }
);

function setBasemapOpacity(percent) {
  basemapOpacity =
    Number(percent) / 100;

  currentBasemap.setOpacity(
    basemapOpacity
  );

  opacityButtons.forEach(
    button => {
      button.classList.toggle(
        "active",
        Number(
          button.dataset.opacity
        ) === Number(percent)
      );
    }
  );
}

opacityButtons.forEach(
  button => {
    button.addEventListener(
      "click",
      () => {
        setBasemapOpacity(
          button.dataset.opacity
        );
      }
    );
  }
);

/* =========================================================
   CUSTOM ZOOM
   ========================================================= */

function updateZoomButtons() {
  zoomInButton.disabled =
    map.getZoom() >=
    map.getMaxZoom();

  zoomOutButton.disabled =
    map.getZoom() <=
    map.getMinZoom();
}


zoomInButton.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    map.zoomIn();
  }
);


zoomOutButton.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    map.zoomOut();
  }
);


map.on(
  "zoomend",
  updateZoomButtons
);

updateZoomButtons();


/* =========================================================
   DYNAMIC BASEMAP THUMBNAILS
   ========================================================= */

/*
  Thumbnail mengikuti perpindahan peta utama.
*/
map.on(
  "moveend zoomend",
  syncBasemapPreviews
);


/*
  Strip thumbnail juga bisa digeser horizontal dengan drag.
*/
/* =========================================================
   GPS
   ========================================================= */

function setGpsState(state) {
  gpsButton.classList.remove(
    "is-pending",
    "is-active",
    "is-error"
  );

  if (state) {
    gpsButton.classList.add(
      `is-${state}`
    );
  }
}

function startGps(
  center = false
) {
  if (!navigator.geolocation) {
    setGpsState("error");
    gpsButton.title =
      "Geolocation tidak tersedia";
    return;
  }

  if (gpsWatchId !== null) {
    if (
      center &&
      lastGpsLocation
    ) {
      map.flyTo(
        lastGpsLocation,
        Math.max(
          17,
          map.getZoom()
        ),
        {
          duration: 0.6
        }
      );
    }

    return;
  }

  setGpsState("pending");
  gpsButton.title =
    "Mencari lokasi…";

  gpsWatchId =
    navigator.geolocation
      .watchPosition(
        position => {
          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;

          const accuracy =
            position.coords.accuracy;

          const latlng =
            L.latLng(lat, lng);

          lastGpsLocation =
            latlng;

          if (!gpsAccuracyCircle) {
            gpsAccuracyCircle =
              L.circle(
                latlng,
                {
                  pane: "gpsPane",
                  radius: accuracy,
                  color: "#1686e5",
                  weight: 1,
                  opacity: 0.40,
                  fillColor: "#1686e5",
                  fillOpacity: 0.10,
                  interactive: false
                }
              )
              .addTo(map);
          } else {
            gpsAccuracyCircle
              .setLatLng(latlng)
              .setRadius(accuracy);
          }

          if (!gpsMarker) {
            gpsMarker =
              L.marker(
                latlng,
                {
                  pane: "gpsPane",
                  icon: L.divIcon({
                    className: "",
                    html:
                      '<div class="gps-dot"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                  }),
                  zIndexOffset: 5000
                }
              )
              .addTo(map);

            gpsMarker.bindPopup(
              `
                <div
                  style="
                    padding:10px 12px;
                  "
                >
                  <strong>
                    Lokasi Anda
                  </strong>
                  <br>
                  <span
                    style="
                      color:#666;
                      font-size:10px;
                    "
                  >
                    Akurasi
                    ±${Math.round(accuracy)} m
                  </span>
                </div>
              `
            );
          } else {
            gpsMarker.setLatLng(
              latlng
            );
          }

          setGpsState("active");

          gpsButton.title =
            `GPS aktif · ±${Math.round(accuracy)} m`;

          if (center) {
            map.flyTo(
              latlng,
              17,
              {
                duration: 0.7
              }
            );

            center = false;
          }
        },

        error => {
          console.warn(
            "GPS:",
            error
          );

          setGpsState("error");

          gpsButton.title =
            "Akses lokasi gagal";

          if (gpsWatchId !== null) {
            navigator.geolocation
              .clearWatch(
                gpsWatchId
              );

            gpsWatchId = null;
          }
        },

        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000
        }
      );
}

gpsButton.addEventListener(
  "click",
  () => {
    startGps(true);
  }
);

/* =========================================================
   FULL EXTENT
   ========================================================= */

homeButton.addEventListener(
  "click",
  () => {
    routeSelect.value = "ALL";
    showAllRoutes(true);

    if (isMobileLayout()) {
      setMobileFilterOpen(
        false
      );
    }
  }
);

/* =========================================================
   SCALE
   ========================================================= */

function getNiceScale(value) {
  const scales = [
    500,
    1000,
    2000,
    5000,
    10000,
    25000,
    50000,
    100000,
    250000,
    500000,
    1000000,
    2000000,
    5000000
  ];

  return scales.reduce(
    (best, current) =>
      Math.abs(current - value)
        <
      Math.abs(best - value)
        ?
      current
        :
      best
  );
}

function updateScale() {
  const latitude =
    map.getCenter().lat;

  const zoom =
    map.getZoom();

  const metersPerPixel =
    (
      156543.03392
      *
      Math.cos(
        latitude
        *
        Math.PI
        /
        180
      )
    )
    /
    Math.pow(
      2,
      zoom
    );

  const denominator =
    metersPerPixel
    *
    96
    /
    0.0254;

  const scale =
    getNiceScale(
      denominator
    );

  document.getElementById(
    "numericScale"
  ).textContent =
    `1 : ${scale.toLocaleString("id-ID")}`;
}

map.on(
  "zoomend moveend",
  updateScale
);

/* =========================================================
   PANEL CLOSING
   ========================================================= */

map.on(
  "click",
  () => {
    setBasemapPanelOpen(
      false
    );

    if (isMobileLayout()) {
      setMobileFilterOpen(
        false
      );
    }
  }
);

basemapPanel.addEventListener(
  "click",
  event => {
    event.stopPropagation();
  }
);

document
  .getElementById(
    "floatingZoom"
  )
  .addEventListener(
    "click",
    event => {
      event.stopPropagation();
    }
  );

document
  .getElementById(
    "bottomToolbar"
  )
  .addEventListener(
    "click",
    event => {
      event.stopPropagation();
    }
  );

/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadData() {
  try {

    if (isMobileLayout()) {
      setMobileFilterOpen(
        false
      );
    }
    const [
      routeResponse,
      stopResponse
    ] =
      await Promise.all([
        fetch(
          "data/brt_route.geojson",
          {
            cache: "no-store"
          }
        ),

        fetch(
          "data/brt_stop.geojson",
          {
            cache: "no-store"
          }
        )
      ]);

    if (!routeResponse.ok) {
      throw new Error(
        "brt_route.geojson gagal dimuat"
      );
    }

    if (!stopResponse.ok) {
      throw new Error(
        "brt_stop.geojson gagal dimuat"
      );
    }

    routeData =
      await routeResponse.json();

    stopData =
      await stopResponse.json();

    assignRuntimeStopKeys();
    validateStopData();

    modeSelect.value = "ALL";
    statusSelect.value = "ALL";

    populateRouteDropdown();
    showAllRoutes(true);
    updateScale();

    /*
      GPS mencoba aktif setelah load.
      Browser tetap meminta izin user.
    */
    setTimeout(
      () => startGps(false),
      600
    );

    setTimeout(
      () => map.invalidateSize(),
      100
    );

    console.log(
      "Rute:",
      routeData.features?.length ?? 0
    );

    console.log(
      "Halte/stasiun:",
      stopData.features?.length ?? 0
    );
  }

  catch (error) {
    console.error(error);

    routeInfoEl.innerHTML = `
      <div class="eyebrow">
        ERROR
      </div>

      <h2>
        Data gagal dimuat
      </h2>

      <p>
        Pastikan file
        <strong>brt_route.geojson</strong>
        dan
        <strong>brt_stop.geojson</strong>
        ada di folder
        <strong>data</strong>,
        lalu jalankan dengan Live Server.
      </p>
    `;
  }
}

loadData();

/* =========================================================
   RESIZE
   ========================================================= */

window.addEventListener(
  "resize",
  () => {
    map.invalidateSize();
  }
);
