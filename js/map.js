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

  /*
    Kereta Api Jarak Jauh.
  */
  KAI: "assets/logos/kai.svg",

  /*
    KA Bandara mempunyai identitas visual tersendiri.
  */
  KAI_BANDARA: "assets/logos/ka-bandara.svg",

  KRL: "assets/logos/krl-commuterline.svg",
  MRT: "assets/logos/mrt-jakarta.svg",
  LRT_JB: "assets/logos/lrt-jabodebek.svg",
  LRT_JKT: "assets/logos/lrt-jakarta.png",

  /*
    Terminal Bus memakai pictogram generik agar tidak
    mengesankan seluruh terminal dikelola Kemenhub/Pemda
    tertentu.
  */
  TERMINAL: "assets/logos/terminal-bus.png"
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
  MRT_OR: "assets/lines/mrt-or.svg",

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
  KRL_TP: "assets/lines/krl-tp.png",

  /*
    Badge A untuk KA Bandara.
    KAI_BANDARA adalah kode baku.
    KA_BANDARA tetap didukung sebagai alias.
  */
  KAI_BANDARA: "assets/lines/ka-bandara.png",
  KA_BANDARA: "assets/lines/ka-bandara.png"
};

const LINE_BADGE_TEXT = {
  MRT_NS: "NS",
  MRT_EW: "EW",
  MRT_OR: "OR",

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
  KRL_TP: "TP",

  KAI_BANDARA: "A",
  KA_BANDARA: "A"
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

  MRT_OR: {
    operator: "MRT Jakarta",
    route: "Lin Lingkar Luar",
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
  },

  KAI_BANDARA: {
    operator: "KA Bandara",
    route: "KA Bandara",
    logo: TRANSIT_LOGOS.KAI_BANDARA
  },

  /*
    Alias supaya data lama/percobaan tetap terbaca.
  */
  KA_BANDARA: {
    operator: "KA Bandara",
    route: "KA Bandara",
    logo: TRANSIT_LOGOS.KAI_BANDARA
  },

  TERMINAL: {
    operator: "Terminal Bus",
    route: "",
    logo: TRANSIT_LOGOS.TERMINAL
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

map.createPane("poiPane");
map.getPane("poiPane").style.zIndex = 480;

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
const routeSelectLabel = document.getElementById("routeSelectLabel");

const stopSearchInput =
  document.getElementById(
    "stopSearchInput"
  );

const stopSearchClear =
  document.getElementById(
    "stopSearchClear"
  );

const stopSearchResults =
  document.getElementById(
    "stopSearchResults"
  );

const poiSearchInput =
  document.getElementById(
    "poiSearchInput"
  );

const poiSearchClear =
  document.getElementById(
    "poiSearchClear"
  );

const poiSearchResults =
  document.getElementById(
    "poiSearchResults"
  );

const globalSearchPanel =
  document.getElementById(
    "globalSearchPanel"
  );

const globalSearchInput =
  document.getElementById(
    "globalSearchInput"
  );

const globalSearchClear =
  document.getElementById(
    "globalSearchClear"
  );

const globalSearchResults =
  document.getElementById(
    "globalSearchResults"
  );

const infoButton =
  document.getElementById(
    "infoButton"
  );

const infoModalBackdrop =
  document.getElementById(
    "infoModalBackdrop"
  );

const infoModal =
  document.getElementById(
    "infoModal"
  );

const infoModalClose =
  document.getElementById(
    "infoModalClose"
  );

const infoModalAccept =
  document.getElementById(
    "infoModalAccept"
  );

const rightInfoPanel =
  document.getElementById(
    "rightInfoPanel"
  );

const rightInfoAboutButton =
  document.getElementById(
    "rightInfoAboutButton"
  );

const rightInfoGuideButton =
  document.getElementById(
    "rightInfoGuideButton"
  );

const productTour =
  document.getElementById(
    "productTour"
  );

const productTourSpotlight =
  document.getElementById(
    "productTourSpotlight"
  );

const productTourCard =
  document.getElementById(
    "productTourCard"
  );

const productTourProgress =
  document.getElementById(
    "productTourProgress"
  );

const productTourTitle =
  document.getElementById(
    "productTourTitle"
  );

const productTourText =
  document.getElementById(
    "productTourText"
  );

const productTourVisual =
  document.getElementById(
    "productTourVisual"
  );

const productTourSkip =
  document.getElementById(
    "productTourSkip"
  );

const productTourPrevious =
  document.getElementById(
    "productTourPrevious"
  );

const productTourNext =
  document.getElementById(
    "productTourNext"
  );

const leftPanelCollapse =
  document.getElementById(
    "leftPanelCollapse"
  );

const leftPanelRestore =
  document.getElementById(
    "leftPanelRestore"
  );

const mobileInfoClose =
  document.getElementById(
    "mobileInfoClose"
  );

const routeInfoEl = document.getElementById("routeInfo");

const mobileFilterToggle =
  document.getElementById(
    "mobileFilterToggle"
  );

const mobileBottomRouteButton =
  document.getElementById(
    "mobileBottomRouteButton"
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

const legendPanel = document.getElementById("legendPanel");

const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");

const northButton =
  document.getElementById(
    "northButton"
  );

const northArrowGlyph =
  document.getElementById(
    "northArrowGlyph"
  );

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

/*
  Halte/stasiun Usulan dan Konseptual bersifat opsional.

  Default ketika koridor/lin dipilih:
  - Rute Eksisting  -> Usulan OFF, Konseptual OFF
  - Rute non-Eksisting (Rencana/Usulan/Konseptual)
                    -> Usulan ON, Konseptual ON

  Dengan demikian koridor yang berstatus Rencana seperti
  Koridor 15–19 langsung menampilkan titik pengembangannya.
*/
let showProposedStops = false;
let showConceptualStops = false;

const stopMarkerByKey = new Map();

let gpsWatchId = null;
let gpsMarker = null;
let gpsAccuracyCircle = null;
let lastGpsLocation = null;

let poiMarker = null;
let poiSearchAbortController = null;
let poiSearchDebounceId = null;

let globalSearchAbortController = null;
let globalSearchDebounceId = null;
let globalSearchLocalResults = [];
let globalSearchPoiResults = [];
let globalSearchPoiLoading = false;

let lastFocusedBeforeInfoModal = null;

/*
  Startup experience selalu dijalankan setiap page load:
  Informasi & Disclaimer -> Cara Menggunakan.

  Nilai localStorage lama tetap dipertahankan untuk
  kompatibilitas, tetapi tidak lagi dipakai untuk menentukan
  apakah startup popup/tour muncul.
*/
let startupExperienceActive = false;
let startupTourTimerId = null;

const DISCLAIMER_STORAGE_KEY =
  "webgisTransportDisclaimerAcceptedV1";

const PRODUCT_TOUR_STORAGE_KEY =
  "webgisTransportProductTourCompletedV1";

let productTourIndex = 0;
let productTourPreviousLeftCollapsed = false;
let productTourManual = false;

let lastResponsiveIsMobile =
  window.matchMedia(
    "(max-width: 760px)"
  ).matches;

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

  /*
    Status baku WebGIS:
    Existing
    Planned
    Proposed
    Conceptual

    Alias lama tetap didukung agar file lama tidak langsung rusak.
  */
  const aliases = {
    "Eksisting": "Existing",
    "Existing": "Existing",

    "Rencana": "Planned",
    "Rencana Resmi": "Planned",
    "Planned": "Planned",

    "Proposed": "Proposed",
    "Proposal": "Proposed",
    "Usulan": "Proposed",
    "Usulan Studi": "Proposed",
    "Usulan Institusional": "Proposed",

    "Conceptual": "Conceptual",
    "Konseptual": "Conceptual",
    "Konsep": "Conceptual",
    "Usulan Personal": "Conceptual",
    "Usulan Konseptual": "Conceptual"
  };

  return aliases[text] ?? text;
}


/*
  Label status yang ditampilkan kepada pengguna.
  Nilai internal tetap memakai:
  Existing / Planned / Proposed / Conceptual
  supaya filtering dan styling stabil.

  GeoJSON boleh memakai nilai Inggris maupun Indonesia.
*/
function getStatusLabel(value) {
  const status =
    normalizeStatus(value);

  const labels = {
    Existing: "Eksisting",
    Planned: "Rencana",
    Proposed: "Usulan",
    Conceptual: "Konseptual"
  };

  return labels[status] ?? status;
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


/*
  Membaca field yang satu kode dapat mempunyai lebih dari
  satu nilai.

  Dipakai khusus untuk INT_NM.

  Contoh:
  KRL_CK:Sudirman;KRL_CK:Karet

  menghasilkan:
  {
    KRL_CK: ["Sudirman", "Karet"]
  }

  parseRouteMap() TIDAK diubah karena SEQ_MAP, DIR_MAP,
  STOP_ROLE, dan field route-map lain tetap memerlukan satu
  nilai per kode.
*/
function parseRouteMultiMap(value) {
  const result = {};

  splitIds(value).forEach(item => {
    const i = item.indexOf(":");

    if (i === -1) {
      return;
    }

    const key =
      item
        .slice(0, i)
        .trim();

    const val =
      item
        .slice(i + 1)
        .trim();

    if (!key || !val) {
      return;
    }

    if (!Array.isArray(result[key])) {
      result[key] = [];
    }

    /*
      Hindari duplikasi persis yang tidak disengaja, tetapi
      tetap izinkan kode yang sama untuk nama stasiun berbeda.
    */
    if (!result[key].includes(val)) {
      result[key].push(val);
    }
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


/*
  Terminologi pemilihan rute mengikuti moda:

  BRT
  - Koridor
  - Semua Koridor
  - Pilih Koridor

  MRT / LRT / KRL
  - Lin
  - Semua Lin
  - Pilih Lin

  Semua Moda
  - Lin / Koridor
  - Semua Lin / Koridor
  - Pilih Lin / Koridor
*/
function getRouteSelectionTerms() {
  const selectedMode =
    normalizeMode(
      modeSelect?.value
    );

  if (selectedMode === "BRT") {
    return {
      singular: "Koridor",
      all: "Semua Koridor",
      select: "Pilih Koridor"
    };
  }

  if (
    selectedMode === "MRT" ||
    selectedMode === "LRT" ||
    selectedMode === "KRL"
  ) {
    return {
      singular: "Lin",
      all: "Semua Lin",
      select: "Pilih Lin"
    };
  }

  return {
    singular: "Lin / Koridor",
    all: "Semua Lin / Koridor",
    select: "Pilih Lin / Koridor"
  };
}


function updateRouteSelectionTerminology() {
  const terms =
    getRouteSelectionTerms();

  if (routeSelectLabel) {
    routeSelectLabel.textContent =
      terms.select;
  }

  return terms;
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
  Fungsi halte/stasiun per rute.

  Field:
    STOP_ROLE

  Format dibuat sama seperti SEQ_MAP / DIR_MAP:
    ROUTE_ID:ROLE;ROUTE_ID:ROLE

  Contoh Harmoni:
    BRT_01:Transit;
    BRT_02:Terminus;
    BRT_03:Transit;
    BRT_08:Terminus;
    BRT_16:Terminus
*/
function getStopRoleForRoute(
  feature,
  routeId
) {
  const p =
    feature?.properties ?? {};

  const roleMap =
    parseRouteMap(
      p.STOP_ROLE ??
      ""
    );

  const routeRole =
    cleanText(
      roleMap[
        String(routeId ?? "")
      ]
    );

  /*
    Format baru:
    BRT_01:Transit;BRT_02:Terminus
  */
  if (routeRole) {
    return normalizeStopRole(
      routeRole
    );
  }

  /*
    Fallback sementara untuk GeoJSON lama yang masih berisi
    satu nilai sederhana seperti "Transit" atau "Terminus".

    Begitu seluruh STOP_ROLE sudah dikonversi ke format map,
    fallback ini tidak lagi diperlukan tetapi aman dibiarkan.
  */
  const legacyRole =
    cleanText(
      p.STOP_ROLE
    );

  if (
    legacyRole &&
    !legacyRole.includes(":") &&
    !legacyRole.includes(";")
  ) {
    return normalizeStopRole(
      legacyRole
    );
  }

  return "";
}


function normalizeStopRole(value) {
  const raw =
    cleanText(value);

  const role =
    raw.toLowerCase();

  if (
    role === "terminus" ||
    role === "terminal" ||
    role === "end"
  ) {
    return "Terminus";
  }

  if (
    role === "transit" ||
    role === "through"
  ) {
    return "Transit";
  }

  if (
    role === "regular" ||
    role === "reguler" ||
    role === "normal"
  ) {
    return "Regular";
  }

  return raw;
}


function getStopRoleClass(
  feature,
  routeId
) {
  const role =
    getStopRoleForRoute(
      feature,
      routeId
    );

  if (role === "Terminus") {
    return "is-terminus";
  }

  if (role === "Transit") {
    return "is-transit";
  }

  if (role === "Regular") {
    return "is-regular";
  }

  return "is-other";
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

  Jika satu lin terhubung ke dua titik fisik berbeda,
  ulangi kodenya:
  KRL_CK:Sudirman;KRL_CK:Karet
*/
function getStopIntegrationNameMap(feature) {
  const p =
    feature?.properties ?? {};

  /*
    INT_NM mendukung kode yang sama lebih dari sekali.

    Contoh dua stasiun berbeda pada lin KRL yang sama:
    KRL_CK:Sudirman;KRL_CK:Karet
  */
  return parseRouteMultiMap(
    p.INT_NM ??
    p.INTEGRASI_NM ??
    ""
  );
}


function getIntegrationPlacePrefix(info) {

  /*
    TERMINAL berbeda dari halte/stasiun.
    Nama lengkapnya disimpan langsung di INT_NM:
    TERMINAL:Terminal Kampung Rambutan

    Karena itu jangan ditambah prefix lagi agar tidak menjadi:
    "Terminal Terminal Kampung Rambutan".
  */
  if (info?.terminal) {
    return "";
  }

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


/*
  =========================================================
  VISIBILITAS HALTE / STASIUN USULAN & KONSEPTUAL
  =========================================================
*/

function isProposedStop(feature) {
  return (
    getStopStatus(feature) ===
    "Proposed"
  );
}


function isConceptualStop(feature) {
  return (
    getStopStatus(feature) ===
    "Conceptual"
  );
}


function getProposedStopsForRoute(
  routeId
) {
  return getStopsForRoute(routeId)
    .filter(
      isProposedStop
    );
}


function getConceptualStopsForRoute(
  routeId
) {
  return getStopsForRoute(routeId)
    .filter(
      isConceptualStop
    );
}


/*
  Marker, daftar titik, dan Previous/Next hanya memakai titik
  yang sedang diaktifkan user. SEQ_MAP sumber tetap utuh.
*/
function getVisibleStopsForRoute(
  routeId
) {
  return getStopsForRoute(routeId)
    .filter(
      feature => {
        if (
          isProposedStop(feature) &&
          !showProposedStops
        ) {
          return false;
        }

        if (
          isConceptualStop(feature) &&
          !showConceptualStops
        ) {
          return false;
        }

        return true;
      }
    );
}


/*
  Mengambil halte/stasiun sebelum dan sesudah berdasarkan
  urutan SEQ_MAP pada rute yang sedang dipilih.
*/
function getAdjacentStops(
  feature,
  routeId
) {
  const stops =
    getActiveOperationalStopsForRoute(
      routeId
    );

  const currentKey =
    getStopKey(feature);

  const currentIndex =
    stops.findIndex(
      item =>
        getStopKey(item) ===
        currentKey
    );

  if (currentIndex === -1) {
    return {
      previous: null,
      next: null
    };
  }

  return {
    previous:
      currentIndex > 0
        ? stops[currentIndex - 1]
        : null,

    next:
      currentIndex <
      stops.length - 1
        ? stops[currentIndex + 1]
        : null
  };
}


/*
  Pindah ke halte/stasiun lain dari tombol navigasi popup.
  Tetap mempertahankan rute aktif dan memakai mekanisme
  selectStop() yang sudah ada.
*/
function navigateToStopFromPopup(
  stopKey,
  routeId
) {
  if (
    !stopKey ||
    !routeId
  ) {
    return;
  }

  /*
    Navigasi Sebelumnya/Berikutnya tidak melakukan flyTo
    ulang ke STOP_ZOOM.

    selectStop(..., false) memakai satu pan halus tanpa
    perubahan zoom, lalu baru membuka popup.
  */
  selectStop(
    stopKey,
    routeId,
    false
  );

  /*
    Sinkronkan daftar kiri tanpa animasi scroll tambahan.
    Dengan begitu perpindahan popup tidak bersamaan dengan
    animasi panel kiri.
  */
  requestAnimationFrame(
    () => {
      const selectedItem =
        stopListEl
          ?.querySelector(
            `.stop-list-item[data-stop-key="${CSS.escape(String(stopKey))}"]`
          );

      selectedItem
        ?.scrollIntoView({
          block: "nearest",
          behavior: "auto"
        });
    }
  );
}


/*
  ==========================================================
  POPUP NAVIGATION — DELEGATED CLICK HANDLER
  ==========================================================

  Listener ditempel sekali pada container peta.

  Kenapa:
  Leaflet dapat menghitung ulang / memperbarui DOM popup saat
  ukuran popup berubah. Listener yang ditempel langsung ke
  tombol popup dapat hilang atau tidak lagi merujuk ke node
  yang aktif.

  Event delegation membuat tombol Sebelumnya/Berikutnya
  tetap berfungsi walaupun DOM popup berubah.
*/
map
  .getContainer()
  .addEventListener(
    "click",
    event => {
      const button =
        event.target
          ?.closest(
            ".stop-popup-nav-button"
          );

      if (!button) {
        return;
      }

      /*
        Tombol terminus memang disabled.
      */
      if (
        button.disabled ||
        button.hasAttribute(
          "disabled"
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const stopKey =
        button.dataset.stopKey;

      const routeId =
        button.dataset.routeId;

      if (
        !stopKey ||
        !routeId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      /*
        Cegah Leaflet memperlakukan klik tombol sebagai klik
        pada peta / popup container.
      */
      L.DomEvent.stopPropagation(
        event
      );

      navigateToStopFromPopup(
        stopKey,
        routeId
      );
    },
    true
  );

/* =========================================================
   STOP / STATION SEARCH
   ========================================================= */

function normalizeSearchText(value) {
  return String(
    value ?? ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function getRouteCompactLabel(routeId) {
  const route =
    getRouteById(routeId);

  if (!route) {
    return String(routeId);
  }

  const mode =
    getRouteMode(route);

  if (mode === "BRT") {
    const line =
      cleanText(
        route.properties.LINE
      );

    return line
      ? `Koridor ${line}`
      : "BRT";
  }

  const transitLabel =
    TRANSIT_ROUTE_LABELS[
      String(routeId)
    ];

  if (
    transitLabel &&
    cleanText(
      transitLabel.route
    )
  ) {
    return transitLabel.route;
  }

  const line =
    cleanText(
      route.properties.LINE
    );

  if (line) {
    return `Lin ${line}`;
  }

  return (
    cleanText(
      route.properties.NAME
    )
    ||
    mode
    ||
    String(routeId)
  );
}


function getStopSearchRouteLabels(feature) {
  return getStopRoutes(feature)
    .map(
      getRouteCompactLabel
    )
    .filter(Boolean);
}


function getStopSearchText(feature) {
  const name =
    getStopDisplayName(feature);

  const type =
    getStopTypeLabel(feature);

  const routes =
    getStopSearchRouteLabels(
      feature
    );

  return normalizeSearchText(
    [
      name,
      type,
      ...routes
    ].join(" ")
  );
}


/*
  Route context untuk hasil pencarian.

  Prioritas:
  1. route yang sedang aktif bila halte/stasiun tersebut melayaninya
  2. route yang sesuai filter Moda + Status
  3. route yang sesuai filter Moda
  4. route yang sesuai filter Status
  5. route valid pertama pada ROUTES
*/
function getPreferredRouteForStop(
  feature
) {
  const routeIds =
    getStopRoutes(feature)
      .filter(
        routeId =>
          Boolean(
            getRouteById(routeId)
          )
      );

  if (!routeIds.length) {
    return null;
  }

  if (
    currentSelectedRouteId &&
    routeIds.includes(
      String(
        currentSelectedRouteId
      )
    )
  ) {
    return String(
      currentSelectedRouteId
    );
  }

  const selectedMode =
    modeSelect.value;

  const selectedStatus =
    statusSelect.value;

  const scoreRoute =
    routeId => {
      const route =
        getRouteById(routeId);

      if (!route) {
        return -999;
      }

      const mode =
        getRouteMode(route);

      const status =
        normalizeStatus(
          route.properties.STATUS
        );

      let score = 0;

      if (
        selectedMode !== "ALL" &&
        mode === selectedMode
      ) {
        score += 4;
      }

      if (
        selectedStatus !== "ALL" &&
        status === selectedStatus
      ) {
        score += 2;
      }

      return score;
    };

  return routeIds
    .slice()
    .sort(
      (a, b) =>
        scoreRoute(b) -
        scoreRoute(a)
    )[0];
}


function closeStopSearchResults() {
  if (!stopSearchResults) {
    return;
  }

  stopSearchResults.hidden = true;
  stopSearchResults.innerHTML = "";

  stopSearchInput
    ?.setAttribute(
      "aria-expanded",
      "false"
    );
}


function updateStopSearchClearButton() {
  if (!stopSearchClear) {
    return;
  }

  stopSearchClear.hidden =
    !String(
      stopSearchInput
        ?.value ?? ""
    ).trim();
}


function clearStopSearch(
  focusInput = false
) {
  if (!stopSearchInput) {
    return;
  }

  stopSearchInput.value = "";

  updateStopSearchClearButton();
  closeStopSearchResults();

  if (focusInput) {
    stopSearchInput.focus();
  }
}


function getStopSearchMatches(
  query,
  limit = 12
) {
  if (!stopData?.features) {
    return [];
  }

  const normalizedQuery =
    normalizeSearchText(
      query
    );

  if (
    normalizedQuery.length < 2
  ) {
    return [];
  }

  const queryWords =
    normalizedQuery
      .split(" ")
      .filter(Boolean);

  return stopData.features
    .map(
      feature => {
        const name =
          normalizeSearchText(
            getStopDisplayName(
              feature
            )
          );

        const searchable =
          getStopSearchText(
            feature
          );

        const allWordsMatch =
          queryWords.every(
            word =>
              searchable.includes(
                word
              )
          );

        if (!allWordsMatch) {
          return null;
        }

        let score = 0;

        if (
          name === normalizedQuery
        ) {
          score += 100;
        }
        else if (
          name.startsWith(
            normalizedQuery
          )
        ) {
          score += 70;
        }
        else if (
          name.includes(
            normalizedQuery
          )
        ) {
          score += 50;
        }
        else {
          score += 20;
        }

        /*
          Halte/stasiun yang memiliki route context valid
          diprioritaskan karena bisa langsung dibuka.
        */
        if (
          getPreferredRouteForStop(
            feature
          )
        ) {
          score += 5;
        }

        return {
          feature,
          score
        };
      }
    )
    .filter(Boolean)
    .sort(
      (a, b) => {
        if (
          a.score !== b.score
        ) {
          return b.score - a.score;
        }

        return getStopDisplayName(
          a.feature
        )
          .localeCompare(
            getStopDisplayName(
              b.feature
            ),
            "id"
          );
      }
    )
    .slice(
      0,
      limit
    )
    .map(
      item =>
        item.feature
    );
}


function buildStopSearchResultHTML(
  feature
) {
  const stopKey =
    getStopKey(feature);

  const name =
    getStopDisplayName(
      feature
    );

  const type =
    getStopTypeLabel(
      feature
    );

  const routeLabels =
    getStopSearchRouteLabels(
      feature
    );

  const visibleRoutes =
    routeLabels
      .slice(
        0,
        3
      );

  const extraCount =
    Math.max(
      0,
      routeLabels.length -
      visibleRoutes.length
    );

  const routeText =
    visibleRoutes.join(" · ");

  return `
    <button
      type="button"
      class="stop-search-result"
      data-stop-key="${escapeHTML(stopKey)}"
      role="option"
    >
      <span class="stop-search-result-main">
        <span class="stop-search-result-name">
          ${escapeHTML(name)}
        </span>

        <span class="stop-search-result-type">
          ${escapeHTML(type)}
        </span>
      </span>

      <span class="stop-search-result-routes">
        ${
          routeText
            ? escapeHTML(routeText)
            : "Rute belum tersedia"
        }
        ${
          extraCount > 0
            ? ` · +${extraCount}`
            : ""
        }
      </span>
    </button>
  `;
}


function renderStopSearchResults(
  query
) {
  if (
    !stopSearchResults ||
    !stopSearchInput
  ) {
    return;
  }

  const normalizedQuery =
    normalizeSearchText(
      query
    );

  updateStopSearchClearButton();

  if (
    normalizedQuery.length < 2
  ) {
    closeStopSearchResults();
    return;
  }

  const matches =
    getStopSearchMatches(
      query
    );

  if (!matches.length) {
    stopSearchResults.innerHTML = `
      <div class="stop-search-empty">
        Halte atau stasiun tidak ditemukan.
      </div>
    `;

    stopSearchResults.hidden =
      false;

    stopSearchInput.setAttribute(
      "aria-expanded",
      "true"
    );

    return;
  }

  stopSearchResults.innerHTML =
    matches
      .map(
        buildStopSearchResultHTML
      )
      .join("");

  stopSearchResults.hidden =
    false;

  stopSearchInput.setAttribute(
    "aria-expanded",
    "true"
  );

  stopSearchResults
    .querySelectorAll(
      ".stop-search-result"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            openStopFromSearch(
              button.dataset.stopKey
            );
          }
        );
      }
    );
}


function openStopFromSearch(
  stopKey
) {
  const feature =
    getStopByKey(
      stopKey
    );

  if (!feature) {
    return;
  }

  const routeId =
    getPreferredRouteForStop(
      feature
    );

  if (!routeId) {
    console.warn(
      "Halte/stasiun tidak memiliki route context yang valid:",
      getStopDisplayName(
        feature
      )
    );

    return;
  }

  const route =
    getRouteById(
      routeId
    );

  if (!route) {
    return;
  }

  /*
    Jika hasil pencarian merupakan titik Usulan/Konseptual,
    aktifkan hanya kategori yang diperlukan.
  */
  if (
    isProposedStop(
      feature
    )
  ) {
    showProposedStops = true;
  }

  if (
    isConceptualStop(
      feature
    )
  ) {
    showConceptualStops = true;
  }

  /*
    Sinkronkan filter dengan route yang dipakai untuk
    membuka halte/stasiun hasil pencarian.
  */
  modeSelect.value =
    getRouteMode(route);

  statusSelect.value =
    normalizeStatus(
      route.properties.STATUS
    );

  populateRouteDropdown();

  routeSelect.value =
    routeId;

  showSingleRoute(
    routeId,
    false
  );

  /*
    drawStops() berjalan sinkron di showSingleRoute(),
    sehingga marker sudah tersedia pada tahap ini.
  */
  selectStop(
    stopKey,
    routeId,
    true
  );

  closeStopSearchResults();

  /*
    Pertahankan nama hasil pencarian pada field supaya user
    tetap tahu apa yang baru saja dipilih.
  */
  stopSearchInput.value =
    getStopDisplayName(
      feature
    );

  updateStopSearchClearButton();

  stopSearchInput.blur();
}


stopSearchInput
  ?.addEventListener(
    "input",
    () => {
      renderStopSearchResults(
        stopSearchInput.value
      );
    }
  );


stopSearchInput
  ?.addEventListener(
    "focus",
    () => {
      if (
        normalizeSearchText(
          stopSearchInput.value
        ).length >= 2
      ) {
        renderStopSearchResults(
          stopSearchInput.value
        );
      }
    }
  );


stopSearchInput
  ?.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape"
      ) {
        closeStopSearchResults();
        return;
      }

      /*
        Enter memilih hasil teratas untuk pencarian cepat.
      */
      if (
        event.key === "Enter"
      ) {
        const firstResult =
          stopSearchResults
            ?.querySelector(
              ".stop-search-result"
            );

        if (firstResult) {
          event.preventDefault();

          openStopFromSearch(
            firstResult.dataset.stopKey
          );
        }
      }
    }
  );


stopSearchClear
  ?.addEventListener(
    "click",
    () => {
      clearStopSearch(
        true
      );
    }
  );


document.addEventListener(
  "click",
  event => {
    if (
      !event.target.closest(
        ".stop-search-field"
      )
    ) {
      closeStopSearchResults();
    }
  }
);


/* =========================================================
   POI SEARCH
   ========================================================= */

function closePoiSearchResults() {
  if (!poiSearchResults) {
    return;
  }

  poiSearchResults.hidden = true;
  poiSearchResults.innerHTML = "";

  poiSearchInput
    ?.setAttribute(
      "aria-expanded",
      "false"
    );
}


function updatePoiSearchClearButton() {
  if (!poiSearchClear) {
    return;
  }

  poiSearchClear.hidden =
    !String(
      poiSearchInput
        ?.value ?? ""
    ).trim();
}


function clearPoiMarker() {
  if (poiMarker) {
    map.removeLayer(
      poiMarker
    );

    poiMarker = null;
  }
}


function clearPoiSearch(
  focusInput = false
) {
  if (!poiSearchInput) {
    return;
  }

  poiSearchInput.value = "";

  updatePoiSearchClearButton();
  closePoiSearchResults();

  if (
    poiSearchAbortController
  ) {
    poiSearchAbortController
      .abort();

    poiSearchAbortController =
      null;
  }

  if (focusInput) {
    poiSearchInput.focus();
  }
}


function getPoiResultTitle(result) {
  const named =
    result?.namedetails?.name;

  if (
    String(named ?? "")
      .trim()
  ) {
    return String(named).trim();
  }

  const displayName =
    String(
      result?.display_name ?? ""
    );

  const firstPart =
    displayName
      .split(",")[0]
      .trim();

  return (
    firstPart ||
    "Tempat"
  );
}


function getPoiResultSubtitle(result) {
  const displayName =
    String(
      result?.display_name ?? ""
    )
      .trim();

  const title =
    getPoiResultTitle(result);

  if (
    displayName
      .toLowerCase()
      .startsWith(
        title.toLowerCase()
      )
  ) {
    const remainder =
      displayName
        .slice(
          title.length
        )
        .replace(
          /^,\s*/,
          ""
        )
        .trim();

    if (remainder) {
      return remainder;
    }
  }

  return displayName;
}


function getPoiTypeLabel(result) {
  const type =
    String(
      result?.type ??
      result?.category ??
      ""
    )
      .replaceAll(
        "_",
        " "
      )
      .trim();

  if (!type) {
    return "POI";
  }

  return type
    .split(" ")
    .map(
      word =>
        word
          ? word.charAt(0).toUpperCase() +
            word.slice(1)
          : ""
    )
    .join(" ");
}


function buildPoiResultHTML(
  result,
  index
) {
  const title =
    getPoiResultTitle(result);

  const subtitle =
    getPoiResultSubtitle(result);

  const type =
    getPoiTypeLabel(result);

  return `
    <button
      type="button"
      class="poi-search-result"
      data-poi-index="${index}"
      role="option"
    >
      <span class="poi-search-result-main">
        <span class="poi-search-result-name">
          ${escapeHTML(title)}
        </span>

        <span class="poi-search-result-type">
          ${escapeHTML(type)}
        </span>
      </span>

      <span class="poi-search-result-address">
        ${escapeHTML(subtitle)}
      </span>
    </button>
  `;
}


async function searchPoi(
  query
) {
  if (
    !poiSearchResults ||
    !poiSearchInput
  ) {
    return;
  }

  const cleanQuery =
    String(
      query ?? ""
    ).trim();

  updatePoiSearchClearButton();

  if (
    cleanQuery.length < 3
  ) {
    closePoiSearchResults();
    return;
  }

  if (
    poiSearchAbortController
  ) {
    poiSearchAbortController
      .abort();
  }

  poiSearchAbortController =
    new AbortController();

  poiSearchResults.hidden =
    false;

  poiSearchResults.innerHTML = `
    <div class="poi-search-loading">
      Mencari tempat…
    </div>
  `;

  poiSearchInput.setAttribute(
    "aria-expanded",
    "true"
  );

  try {
    /*
      Nominatim publik dibatasi secara konservatif:
      - pencarian hanya setelah 3 karakter
      - debounce dari input
      - request sebelumnya dibatalkan
      - limit kecil
      - area dibatasi pada Jabodetabek dan sekitarnya
    */
    const params =
      new URLSearchParams({
        format: "jsonv2",
        q: cleanQuery,
        limit: "8",
        addressdetails: "1",
        namedetails: "1",
        countrycodes: "id",
        "accept-language": "id",
        viewbox:
          "105.65,-5.55,107.55,-7.05",
        bounded: "1"
      });

    const response =
      await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          signal:
            poiSearchAbortController.signal,

          headers: {
            Accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        `Nominatim HTTP ${response.status}`
      );
    }

    const results =
      await response.json();

    if (
      !Array.isArray(results) ||
      !results.length
    ) {
      poiSearchResults.innerHTML = `
        <div class="poi-search-empty">
          Tempat tidak ditemukan di area Jabodetabek.
        </div>
      `;

      return;
    }

    /*
      Simpan result object ke DOM element melalui closure,
      bukan serialisasi data besar ke atribut HTML.
    */
    poiSearchResults.innerHTML =
      results
        .map(
          buildPoiResultHTML
        )
        .join("");

    poiSearchResults
      .querySelectorAll(
        ".poi-search-result"
      )
      .forEach(
        button => {
          const index =
            Number(
              button.dataset.poiIndex
            );

          const result =
            results[index];

          button.addEventListener(
            "click",
            () => {
              openPoiResult(
                result
              );
            }
          );
        }
      );
  }

  catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }

    console.warn(
      "Pencarian POI gagal:",
      error
    );

    poiSearchResults.innerHTML = `
      <div class="poi-search-empty">
        Pencarian tempat sedang tidak tersedia.
      </div>
    `;
  }
}


function openPoiResult(
  result
) {
  const lat =
    Number(
      result?.lat
    );

  const lon =
    Number(
      result?.lon
    );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return;
  }

  const latlng =
    L.latLng(
      lat,
      lon
    );

  clearPoiMarker();

  poiMarker =
    L.circleMarker(
      latlng,
      {
        pane: "poiPane",
        radius: 7,
        color: "#1f1f1f",
        weight: 2,
        fillColor: "#ffffff",
        fillOpacity: 1
      }
    )
      .addTo(map);

  const title =
    getPoiResultTitle(result);

  const subtitle =
    getPoiResultSubtitle(result);

  const type =
    getPoiTypeLabel(result);

  poiMarker.bindPopup(
    `
      <div class="poi-popup">
        <div class="poi-popup-eyebrow">
          ${escapeHTML(type)}
        </div>

        <div class="poi-popup-title">
          ${escapeHTML(title)}
        </div>

        ${
          subtitle
            ?
            `
              <div class="poi-popup-address">
                ${escapeHTML(subtitle)}
              </div>
            `
            :
            ""
        }

        <div class="poi-popup-source">
          OpenStreetMap · Nominatim
        </div>
      </div>
    `,
    {
      maxWidth: 360
    }
  );

  map.flyTo(
    latlng,
    Math.max(
      15,
      Math.min(
        17,
        map.getZoom()
      )
    ),
    {
      animate: true,
      duration: 0.65
    }
  );

  setTimeout(
    () => {
      poiMarker
        ?.openPopup();
    },
    380
  );

  poiSearchInput.value =
    title;

  updatePoiSearchClearButton();
  closePoiSearchResults();

  poiSearchInput.blur();
}


poiSearchInput
  ?.addEventListener(
    "input",
    () => {
      updatePoiSearchClearButton();

      clearTimeout(
        poiSearchDebounceId
      );

      const value =
        poiSearchInput.value;

      if (
        String(value)
          .trim()
          .length < 3
      ) {
        closePoiSearchResults();
        return;
      }

      poiSearchDebounceId =
        setTimeout(
          () => {
            searchPoi(
              value
            );
          },
          700
        );
    }
  );


poiSearchInput
  ?.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape"
      ) {
        closePoiSearchResults();
      }
    }
  );


poiSearchInput
  ?.addEventListener(
    "focus",
    () => {
      const value =
        String(
          poiSearchInput.value
        ).trim();

      if (
        value.length >= 3
      ) {
        clearTimeout(
          poiSearchDebounceId
        );

        poiSearchDebounceId =
          setTimeout(
            () => {
              searchPoi(
                value
              );
            },
            250
          );
      }
    }
  );


poiSearchClear
  ?.addEventListener(
    "click",
    () => {
      clearPoiSearch(
        true
      );

      clearPoiMarker();
    }
  );


document.addEventListener(
  "click",
  event => {
    if (
      !event.target.closest(
        ".poi-search-field"
      )
    ) {
      closePoiSearchResults();
    }
  }
);


/* =========================================================
   FIRST-VISIT WALKTHROUGH
   ========================================================= */

const PRODUCT_TOUR_STEPS = [
  {
    title: "Pilih jaringan",
    text:
      "Mulai dari Moda dan Status, lalu pilih Lin/Koridor yang ingin kamu jelajahi.",
    target: "controls",
    visual: "filters"
  },
  {
    title: "Klik halte atau stasiun",
    text:
      "Klik titik di peta atau nama halte/stasiun pada daftar untuk membuka informasi titik, integrasi, dan urutan perjalanan.",
    target: "map-center",
    visual: "stop"
  },
  {
    title: "Berpindah rute dari popup",
    text:
      "Badge Lin/Koridor pada popup dapat diklik. Rute akan berganti, tetapi kamu tetap berada di halte atau stasiun yang sama.",
    target: "none",
    visual: "badges"
  }
];


function hasCompletedProductTour() {
  try {
    return (
      localStorage.getItem(
        PRODUCT_TOUR_STORAGE_KEY
      ) === "1"
    );
  }
  catch (error) {
    return false;
  }
}


function saveProductTourCompleted() {
  try {
    localStorage.setItem(
      PRODUCT_TOUR_STORAGE_KEY,
      "1"
    );
  }
  catch (error) {
    console.warn(
      "localStorage tidak tersedia:",
      error
    );
  }
}


function buildProductTourVisual(type) {
  if (type === "filters") {
    return `
      <div class="tour-mini-filters">
        <span>Moda</span>
        <strong>BRT</strong>
        <span>Status</span>
        <strong>Eksisting</strong>
        <span class="tour-mini-wide">Pilih Koridor</span>
        <strong class="tour-mini-wide">Koridor 1 (Blok M - Kota)</strong>
      </div>
    `;
  }

  if (type === "stop") {
    return `
      <div class="tour-mini-stop">
        <span class="tour-mini-route-line"></span>
        <span class="tour-mini-marker"></span>
        <span class="tour-mini-stop-label">Klik halte / stasiun</span>
      </div>
    `;
  }

  return `
    <div class="tour-mini-badges">
      <span class="tour-mini-badge is-red">1</span>
      <span class="tour-mini-badge is-blue">2</span>
      <span class="tour-mini-badge is-yellow">3</span>
      <span class="tour-mini-badge is-concept">16</span>
      <span class="tour-mini-badge-arrow">→ klik untuk pindah rute</span>
    </div>
  `;
}


function getProductTourTargetRect(step) {
  if (!step) {
    return null;
  }

  if (step.target === "controls") {
    const element =
      document.querySelector(
        ".filter-controls-card"
      );

    if (!element) {
      return null;
    }

    const rect =
      element.getBoundingClientRect();

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  if (step.target === "map-center") {
    const mapElement =
      document.getElementById(
        "map"
      );

    if (!mapElement) {
      return null;
    }

    const rect =
      mapElement.getBoundingClientRect();

    const size =
      isMobileLayout()
        ? 118
        : 150;

    return {
      left:
        rect.left +
        rect.width / 2 -
        size / 2,

      top:
        rect.top +
        rect.height / 2 -
        size / 2,

      width: size,
      height: size
    };
  }

  return null;
}


function positionProductTour() {
  if (
    !productTour ||
    productTour.hidden
  ) {
    return;
  }

  const step =
    PRODUCT_TOUR_STEPS[
      productTourIndex
    ];

  const targetRect =
    getProductTourTargetRect(
      step
    );

  if (targetRect) {
    const padding = 6;

    productTourSpotlight.hidden =
      false;

    productTourSpotlight.style.left =
      `${Math.max(
        4,
        targetRect.left - padding
      )}px`;

    productTourSpotlight.style.top =
      `${Math.max(
        4,
        targetRect.top - padding
      )}px`;

    productTourSpotlight.style.width =
      `${Math.max(
        20,
        targetRect.width +
        padding * 2
      )}px`;

    productTourSpotlight.style.height =
      `${Math.max(
        20,
        targetRect.height +
        padding * 2
      )}px`;
  }
  else {
    productTourSpotlight.hidden =
      true;
  }

  if (!productTourCard) {
    return;
  }

  /*
    Desktop:
    kartu ditempatkan di samping spotlight jika memungkinkan.

    Mobile:
    kartu selalu di bagian atas agar tidak bertabrakan
    dengan bottom sheet Rute.
  */
  if (isMobileLayout()) {
    productTourCard.style.left =
      "12px";

    productTourCard.style.right =
      "12px";

    productTourCard.style.top =
      `calc(
        max(
          12px,
          env(safe-area-inset-top)
        ) + 4px
      )`;

    productTourCard.style.bottom =
      "auto";

    productTourCard.style.transform =
      "none";

    return;
  }

  productTourCard.style.right =
    "auto";

  productTourCard.style.bottom =
    "auto";

  productTourCard.style.transform =
    "none";

  const cardWidth =
    Math.min(
      380,
      window.innerWidth - 32
    );

  if (targetRect) {
    const preferredLeft =
      targetRect.left +
      targetRect.width +
      18;

    const canFitRight =
      preferredLeft +
      cardWidth <
      window.innerWidth - 16;

    productTourCard.style.left =
      canFitRight
        ? `${preferredLeft}px`
        : `${Math.max(
            16,
            targetRect.left -
            cardWidth -
            18
          )}px`;

    productTourCard.style.top =
      `${Math.max(
        16,
        Math.min(
          targetRect.top,
          window.innerHeight -
          360
        )
      )}px`;

    return;
  }

  productTourCard.style.left =
    "50%";

  productTourCard.style.top =
    "50%";

  productTourCard.style.transform =
    "translate(-50%, -50%)";
}


function prepareProductTourStep(step) {
  if (!step) {
    return;
  }

  if (isMobileLayout()) {
    if (step.target === "controls") {
      setMobileInfoOpen(
        false
      );

      setBasemapPanelOpen(
        false
      );

      setMobileFilterOpen(
        true
      );
    }
    else {
      setMobileFilterOpen(
        false
      );

      setMobileInfoOpen(
        false
      );

      setBasemapPanelOpen(
        false
      );
    }

    return;
  }

  if (step.target === "controls") {
    setDesktopPanelCollapsed(
      "left",
      false
    );
  }
}


function showProductTourStep(index) {
  const boundedIndex =
    Math.max(
      0,
      Math.min(
        PRODUCT_TOUR_STEPS.length - 1,
        index
      )
    );

  productTourIndex =
    boundedIndex;

  const step =
    PRODUCT_TOUR_STEPS[
      productTourIndex
    ];

  prepareProductTourStep(
    step
  );

  productTourProgress.textContent =
    `TIP ${productTourIndex + 1} DARI ${PRODUCT_TOUR_STEPS.length}`;

  productTourTitle.textContent =
    step.title;

  productTourText.textContent =
    step.text;

  productTourVisual.innerHTML =
    buildProductTourVisual(
      step.visual
    );

  productTourPrevious.hidden =
    productTourIndex === 0;

  productTourNext.textContent =
    productTourIndex ===
      PRODUCT_TOUR_STEPS.length - 1
      ? "Mulai Jelajahi"
      : "Berikutnya";

  requestAnimationFrame(
    () => {
      requestAnimationFrame(
        positionProductTour
      );
    }
  );
}


function startProductTour(
  {
    manual = false
  } = {}
) {
  if (!productTour) {
    return;
  }

  productTourManual =
    Boolean(manual);

  productTourPreviousLeftCollapsed =
    document.body
      .classList
      .contains(
        "left-panel-collapsed"
      );

  productTour.hidden =
    false;

  document.body
    .classList
    .add(
      "product-tour-open"
    );

  productTourIndex = 0;

  showProductTourStep(
    0
  );
}


function closeProductTour(
  {
    completed = true
  } = {}
) {
  if (!productTour) {
    return;
  }

  if (completed) {
    saveProductTourCompleted();
  }

  productTour.hidden =
    true;

  document.body
    .classList
    .remove(
      "product-tour-open"
    );

  productTourSpotlight.hidden =
    true;

  if (isMobileLayout()) {
    setMobileFilterOpen(
      false
    );

    setMobileInfoOpen(
      false
    );
  }
  else if (
    productTourManual &&
    productTourPreviousLeftCollapsed
  ) {
    setDesktopPanelCollapsed(
      "left",
      true
    );
  }

  productTourManual = false;
}


productTourNext
  ?.addEventListener(
    "click",
    () => {
      if (
        productTourIndex >=
        PRODUCT_TOUR_STEPS.length - 1
      ) {
        closeProductTour({
          completed: true
        });

        return;
      }

      showProductTourStep(
        productTourIndex + 1
      );
    }
  );


productTourPrevious
  ?.addEventListener(
    "click",
    () => {
      showProductTourStep(
        productTourIndex - 1
      );
    }
  );


productTourSkip
  ?.addEventListener(
    "click",
    () => {
      closeProductTour({
        completed: true
      });
    }
  );


rightInfoGuideButton
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      if (isMobileLayout()) {
        setMobileInfoOpen(
          false
        );
      }

      startProductTour({
        manual: true
      });
    }
  );


window.addEventListener(
  "resize",
  () => {
    if (
      productTour &&
      !productTour.hidden
    ) {
      positionProductTour();
    }
  }
);


/* =========================================================
   GLOBAL / UNIVERSAL SEARCH
   ========================================================= */

function closeGlobalSearchResults() {
  if (!globalSearchResults) {
    return;
  }

  globalSearchResults.hidden = true;
  globalSearchResults.innerHTML = "";

  globalSearchInput
    ?.setAttribute(
      "aria-expanded",
      "false"
    );
}


function updateGlobalSearchClearButton() {
  if (!globalSearchClear) {
    return;
  }

  globalSearchClear.hidden =
    !String(
      globalSearchInput
        ?.value ?? ""
    ).trim();
}


function clearGlobalSearch(
  focusInput = false
) {
  if (!globalSearchInput) {
    return;
  }

  globalSearchInput.value = "";

  globalSearchLocalResults = [];
  globalSearchPoiResults = [];
  globalSearchPoiLoading = false;

  clearTimeout(
    globalSearchDebounceId
  );

  if (
    globalSearchAbortController
  ) {
    globalSearchAbortController
      .abort();

    globalSearchAbortController =
      null;
  }

  updateGlobalSearchClearButton();
  closeGlobalSearchResults();

  if (focusInput) {
    globalSearchInput.focus();
  }
}


function buildGlobalTransportResult(
  feature
) {
  const stopKey =
    getStopKey(feature);

  const name =
    getStopDisplayName(
      feature
    );

  const type =
    getStopTypeLabel(
      feature
    );

  const routeLabels =
    getStopSearchRouteLabels(
      feature
    );

  const visibleRoutes =
    routeLabels.slice(
      0,
      3
    );

  const extraCount =
    Math.max(
      0,
      routeLabels.length -
      visibleRoutes.length
    );

  return `
    <button
      type="button"
      class="global-search-result"
      data-global-type="transport"
      data-stop-key="${escapeHTML(stopKey)}"
      role="option"
    >
      <span class="global-search-result-icon is-transport" aria-hidden="true">
        ●
      </span>

      <span class="global-search-result-content">
        <span class="global-search-result-main">
          <strong>${escapeHTML(name)}</strong>
          <span>${escapeHTML(type)}</span>
        </span>

        <span class="global-search-result-meta">
          ${
            visibleRoutes.length
              ? escapeHTML(
                  visibleRoutes.join(" · ")
                )
              : "Rute belum tersedia"
          }
          ${
            extraCount > 0
              ? ` · +${extraCount}`
              : ""
          }
        </span>
      </span>
    </button>
  `;
}


function buildGlobalPoiResult(
  result,
  index
) {
  const title =
    getPoiResultTitle(result);

  const subtitle =
    getPoiResultSubtitle(result);

  const type =
    getPoiTypeLabel(result);

  return `
    <button
      type="button"
      class="global-search-result"
      data-global-type="poi"
      data-poi-index="${index}"
      role="option"
    >
      <span class="global-search-result-icon is-place" aria-hidden="true">
        ◆
      </span>

      <span class="global-search-result-content">
        <span class="global-search-result-main">
          <strong>${escapeHTML(title)}</strong>
          <span>${escapeHTML(type)}</span>
        </span>

        <span class="global-search-result-meta">
          ${escapeHTML(subtitle)}
        </span>
      </span>
    </button>
  `;
}


function renderGlobalSearchResults() {
  if (
    !globalSearchResults ||
    !globalSearchInput
  ) {
    return;
  }

  const query =
    String(
      globalSearchInput.value
    ).trim();

  updateGlobalSearchClearButton();

  if (
    normalizeSearchText(
      query
    ).length < 2
  ) {
    closeGlobalSearchResults();
    return;
  }

  const transportHTML =
    globalSearchLocalResults.length
      ?
      `
        <section class="global-search-group">
          <div class="global-search-group-title">
            Transportasi
          </div>

          ${
            globalSearchLocalResults
              .map(
                buildGlobalTransportResult
              )
              .join("")
          }
        </section>
      `
      :
      "";

  let poiHTML = "";

  if (
    query.length >= 3 &&
    globalSearchPoiLoading
  ) {
    poiHTML = `
      <section class="global-search-group">
        <div class="global-search-group-title">
          Tempat
        </div>

        <div class="global-search-loading">
          Mencari tempat…
        </div>
      </section>
    `;
  }
  else if (
    globalSearchPoiResults.length
  ) {
    poiHTML = `
      <section class="global-search-group">
        <div class="global-search-group-title">
          Tempat
        </div>

        ${
          globalSearchPoiResults
            .map(
              buildGlobalPoiResult
            )
            .join("")
        }
      </section>
    `;
  }

  if (
    !transportHTML &&
    !poiHTML
  ) {
    globalSearchResults.innerHTML = `
      <div class="global-search-empty">
        Lokasi tidak ditemukan.
      </div>
    `;
  }
  else {
    globalSearchResults.innerHTML =
      transportHTML +
      poiHTML;
  }

  globalSearchResults.hidden =
    false;

  globalSearchInput.setAttribute(
    "aria-expanded",
    "true"
  );

  globalSearchResults
    .querySelectorAll(
      '[data-global-type="transport"]'
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const feature =
              getStopByKey(
                button.dataset.stopKey
              );

            if (feature) {
              globalSearchInput.value =
                getStopDisplayName(
                  feature
                );
            }

            updateGlobalSearchClearButton();
            closeGlobalSearchResults();

            openStopFromSearch(
              button.dataset.stopKey
            );

            globalSearchInput.blur();
          }
        );
      }
    );

  globalSearchResults
    .querySelectorAll(
      '[data-global-type="poi"]'
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const index =
              Number(
                button.dataset.poiIndex
              );

            const result =
              globalSearchPoiResults[
                index
              ];

            if (!result) {
              return;
            }

            globalSearchInput.value =
              getPoiResultTitle(
                result
              );

            updateGlobalSearchClearButton();
            closeGlobalSearchResults();

            openPoiResult(
              result
            );

            globalSearchInput.blur();
          }
        );
      }
    );
}


async function fetchGlobalPoiResults(
  query
) {
  if (
    !globalSearchInput
  ) {
    return;
  }

  if (
    globalSearchAbortController
  ) {
    globalSearchAbortController
      .abort();
  }

  globalSearchAbortController =
    new AbortController();

  const requestedQuery =
    String(query).trim();

  globalSearchPoiLoading =
    true;

  renderGlobalSearchResults();

  try {
    const params =
      new URLSearchParams({
        format: "jsonv2",
        q: requestedQuery,
        limit: "6",
        addressdetails: "1",
        namedetails: "1",
        countrycodes: "id",
        "accept-language": "id",
        viewbox:
          "105.65,-5.55,107.55,-7.05",
        bounded: "1"
      });

    const response =
      await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          signal:
            globalSearchAbortController.signal,

          headers: {
            Accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        `Nominatim HTTP ${response.status}`
      );
    }

    const results =
      await response.json();

    /*
      Abaikan response lama bila user sudah mengetik
      query yang berbeda.
    */
    if (
      String(
        globalSearchInput.value
      ).trim() !==
      requestedQuery
    ) {
      return;
    }

    globalSearchPoiResults =
      Array.isArray(results)
        ? results
        : [];

    globalSearchPoiLoading =
      false;

    renderGlobalSearchResults();
  }

  catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }

    console.warn(
      "Pencarian global POI gagal:",
      error
    );

    globalSearchPoiResults = [];
    globalSearchPoiLoading = false;

    renderGlobalSearchResults();
  }
}


function updateGlobalSearch(
  query
) {
  const cleanQuery =
    String(
      query ?? ""
    ).trim();

  clearTimeout(
    globalSearchDebounceId
  );

  if (
    globalSearchAbortController
  ) {
    globalSearchAbortController
      .abort();

    globalSearchAbortController =
      null;
  }

  globalSearchPoiResults = [];
  globalSearchPoiLoading = false;

  if (
    normalizeSearchText(
      cleanQuery
    ).length >= 2
  ) {
    globalSearchLocalResults =
      getStopSearchMatches(
        cleanQuery,
        6
      );
  }
  else {
    globalSearchLocalResults = [];
  }

  renderGlobalSearchResults();

  /*
    Search tempat menggunakan request eksternal,
    jadi baru dijalankan mulai 3 karakter + debounce.
  */
  if (
    cleanQuery.length >= 3
  ) {
    globalSearchPoiLoading =
      true;

    renderGlobalSearchResults();

    globalSearchDebounceId =
      setTimeout(
        () => {
          fetchGlobalPoiResults(
            cleanQuery
          );
        },
        650
      );
  }
}


globalSearchInput
  ?.addEventListener(
    "input",
    () => {
      updateGlobalSearch(
        globalSearchInput.value
      );
    }
  );


globalSearchInput
  ?.addEventListener(
    "focus",
    () => {
      if (
        normalizeSearchText(
          globalSearchInput.value
        ).length >= 2
      ) {
        updateGlobalSearch(
          globalSearchInput.value
        );
      }
    }
  );


globalSearchInput
  ?.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape"
      ) {
        closeGlobalSearchResults();
        return;
      }

      if (
        event.key === "Enter"
      ) {
        const firstResult =
          globalSearchResults
            ?.querySelector(
              ".global-search-result"
            );

        if (firstResult) {
          event.preventDefault();
          firstResult.click();
        }
      }
    }
  );


globalSearchClear
  ?.addEventListener(
    "click",
    () => {
      clearGlobalSearch(
        true
      );

      clearPoiMarker();
    }
  );


document.addEventListener(
  "click",
  event => {
    if (
      !event.target.closest(
        ".global-search-panel"
      )
    ) {
      closeGlobalSearchResults();
    }
  }
);


/* =========================================================
   INFORMATION / DISCLAIMER
   ========================================================= */

/*
  Memulai pengalaman pembuka setiap kali halaman dimuat.
  Tidak bergantung localStorage: reload, buka ulang tab, atau
  hard refresh tetap akan menampilkan informasi lalu tour.
*/
function startStartupExperience() {
  startupExperienceActive = true;

  if (startupTourTimerId) {
    clearTimeout(
      startupTourTimerId
    );

    startupTourTimerId = null;
  }

  setInfoModalOpen(
    true
  );
}


/*
  Dipakai khusus ketika modal informasi yang muncul sebagai
  bagian startup ditutup. Setelah modal hilang, walkthrough
  selalu dimulai dari langkah pertama.

  Jika modal dibuka manual dari tombol Informasi, penutupan
  modal tidak otomatis memulai walkthrough.
*/
function closeInfoModalAndContinueStartup() {
  const continueToTour =
    Boolean(
      startupExperienceActive
    );

  startupExperienceActive = false;

  setInfoModalOpen(
    false
  );

  if (!continueToTour) {
    return;
  }

  if (startupTourTimerId) {
    clearTimeout(
      startupTourTimerId
    );
  }

  startupTourTimerId =
    setTimeout(
      () => {
        startupTourTimerId = null;

        startProductTour({
          manual: false
        });
      },
      180
    );
}


function hasAcceptedDisclaimer() {
  try {
    return (
      localStorage.getItem(
        DISCLAIMER_STORAGE_KEY
      ) === "1"
    );
  }
  catch (error) {
    return false;
  }
}


function saveDisclaimerAccepted() {
  try {
    localStorage.setItem(
      DISCLAIMER_STORAGE_KEY,
      "1"
    );
  }
  catch (error) {
    console.warn(
      "localStorage tidak tersedia:",
      error
    );
  }
}


function setInfoModalOpen(
  open,
  {
    focusPrimary = true
  } = {}
) {
  if (
    !infoModalBackdrop
  ) {
    return;
  }

  if (open) {
    lastFocusedBeforeInfoModal =
      document.activeElement;

    infoModalBackdrop.hidden =
      false;

    document.body.classList.add(
      "info-modal-open"
    );

    requestAnimationFrame(
      () => {
        if (focusPrimary) {
          infoModalAccept
            ?.focus();
        }
      }
    );

    return;
  }

  infoModalBackdrop.hidden =
    true;

  document.body.classList.remove(
    "info-modal-open"
  );

  if (
    lastFocusedBeforeInfoModal &&
    typeof
      lastFocusedBeforeInfoModal.focus ===
      "function"
  ) {
    lastFocusedBeforeInfoModal
      .focus();
  }

  lastFocusedBeforeInfoModal =
    null;
}


infoButton
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      if (isMobileLayout()) {
        setMobileInfoOpen(
          !document.body
            .classList
            .contains(
              "mobile-info-open"
            )
        );

        return;
      }

      startupExperienceActive = false;

      setInfoModalOpen(
        true
      );
    }
  );


rightInfoAboutButton
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      startupExperienceActive = false;

      setInfoModalOpen(
        true
      );
    }
  );


infoModalClose
  ?.addEventListener(
    "click",
    () => {
      closeInfoModalAndContinueStartup();
    }
  );


infoModalAccept
  ?.addEventListener(
    "click",
    () => {
      saveDisclaimerAccepted();

      closeInfoModalAndContinueStartup();
    }
  );


infoModalBackdrop
  ?.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        infoModalBackdrop
      ) {
        closeInfoModalAndContinueStartup();
      }
    }
  );


document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape" &&
      productTour &&
      !productTour.hidden
    ) {
      closeProductTour({
        completed: true
      });

      return;
    }

    if (
      event.key === "Escape" &&
      infoModalBackdrop &&
      !infoModalBackdrop.hidden
    ) {
      closeInfoModalAndContinueStartup();
    }
  }
);


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

        const integrationNames =
          integrationNameMap[
            code
          ] ?? [];

        const hasIntegrationName =
          (
            Array.isArray(
              integrationNames
            )
              ? integrationNames
              : [integrationNames]
          )
            .some(
              value =>
                String(value || "")
                  .trim()
            );

        if (
          Object.keys(
            integrationNameMap
          ).length > 0
          &&
          !hasIntegrationName
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

/*
  Bahasa visual status jaringan:

  Existing
  - garis solid

  Planned
  - dash panjang
  - rencana resmi / proyek yang telah direncanakan

  Proposed
  - dash sedang
  - proposal / skenario studi atau institusi

  Conceptual
  - dash sangat pendek
  - skenario konseptual penyusun WebGIS

  Warna tetap mengikuti COLOR masing-masing lin/koridor.
*/

function getRouteStatusStyle(feature) {
  const status = normalizeStatus(
    feature?.properties?.STATUS
  );

  switch (status) {

    case "Planned":
      return {
        dashArray: "12 7",
        opacity: 0.95
      };

    case "Proposed":
      return {
        dashArray: "7 6",
        opacity: 0.88
      };

    case "Conceptual":
      return {
        dashArray: "2 6",
        opacity: 0.78
      };

    case "Existing":
    default:
      return {
        dashArray: null,
        opacity: 1
      };
  }
}


function routeStyle(feature) {
  const statusStyle =
    getRouteStatusStyle(feature);

  return {
    pane: "routePane",

    color:
      feature?.properties?.COLOR ||
      "#555555",

    weight: 4,

    opacity:
      statusStyle.opacity,

    dashArray:
      statusStyle.dashArray,

    lineCap: "round",
    lineJoin: "round"
  };
}


function haloStyle(feature) {
  const statusStyle =
    getRouteStatusStyle(feature);

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

    /*
      Halo mengikuti pola garis utama agar rute Planned
      dan Conceptual tidak terlihat solid dari belakang.
    */
    dashArray:
      statusStyle.dashArray,

    lineCap: "round",
    lineJoin: "round",
    interactive: false
  };
}


function updateHalo() {
  if (routeHaloLayer) {
    /*
      Kirim fungsi haloStyle ke Leaflet supaya setiap feature
      tetap membaca STATUS masing-masing saat basemap berubah.
    */
    routeHaloLayer.setStyle(
      haloStyle
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
            ${escapeHTML(getStatusLabel(p.STATUS))}
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

    /*
      Karena dropdown Lin/Koridor sekarang mode-first,
      klik langsung pada garis rute juga harus memilih moda
      dan status rute terlebih dahulu sebelum memilih rute.
    */
    modeSelect.value =
      getRouteMode(
        feature
      );

    statusSelect.value =
      normalizeStatus(
        feature.properties.STATUS
      );

    populateRouteDropdown();

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

/*
  DASAR RENCANA BRT KORIDOR 15–19
  --------------------------------

  Keberadaan Koridor 15–19 memiliki dasar pada dokumen
  rencana resmi DKI Jakarta.

  Pergub DKI Jakarta No. 31 Tahun 2022 tentang RDTR:
  Pasal 20 ayat (2).

  Perda DKI Jakarta No. 7 Tahun 2024 tentang RTRW
  Tahun 2024–2044:
  Pasal 25 ayat (2).

  PENTING:
  Konfigurasi ini hanya menjelaskan ASAL RENCANA.
  Geometri trase dan lokasi halte yang tampil pada WebGIS
  tetap merupakan skenario visualisasi, bukan trase/halte
  resmi pemerintah atau operator.
*/
const ROUTE_PLAN_INFO = {

  BRT_15: {
    rdtr:
      "Jakarta International Stadium – Pulo Gebang",

    rtrw:
      "Danau Sunter Barat – Pulo Gebang",

    note:
      "Terdapat perbedaan titik asal yang disebutkan antara RDTR 2022 dan RTRW 2024."
  },


  BRT_16: {
    rdtr:
      "Kampung Melayu – Tanah Abang – Harmoni",

    rtrw:
      "Kampung Melayu – Tanah Abang – Harmoni",

    note: ""
  },


  BRT_17: {
    rdtr:
      "Kota – Ancol – Tanjung Priok",

    rtrw:
      "Kota – Ancol – Tanjung Priok",

    note: ""
  },


  BRT_18: {
    rdtr:
      "Puri Kembangan – Pluit",

    rtrw:
      "Puri Kembangan – Pantai Indah Kapuk",

    note:
      "Terdapat perbedaan titik tujuan yang disebutkan antara RDTR 2022 dan RTRW 2024."
  },


  BRT_19: {
    rdtr:
      "Manggarai – UI",

    rtrw:
      "Manggarai – Universitas Indonesia (Elevated)",

    note:
      "RTRW Jakarta 2024–2044 mencantumkan Koridor 19 sebagai jaringan elevated."
  }

};


function getRoutePlanInfo(
  routeId
) {
  return (
    ROUTE_PLAN_INFO[
      String(routeId || "")
    ] ||
    null
  );
}


function buildRoutePlanInfoHTML(
  feature
) {
  const routeId =
    getRouteId(
      feature
    );

  const info =
    getRoutePlanInfo(
      routeId
    );

  if (!info) {
    return "";
  }

  const differenceNoteHTML =
    info.note
      ? `
        <div class="route-plan-difference-note">
          ${escapeHTML(info.note)}
        </div>
      `
      : "";

  return `
    <details class="route-plan-card">

      <summary class="route-plan-summary">

        <span
          class="route-plan-icon"
          aria-hidden="true"
        >
          i
        </span>

        <span class="route-plan-summary-copy">

          <span class="route-plan-type">
            Rencana Resmi
          </span>

          <span class="route-plan-title">
            Dasar Rencana
          </span>

        </span>

        <span
          class="route-plan-chevron"
          aria-hidden="true"
        >
          ›
        </span>

      </summary>


      <div class="route-plan-body">

        <p class="route-plan-intro">
          Koridor ini tercantum dalam dokumen rencana resmi
          DKI Jakarta sebagai bagian dari pengembangan
          jaringan BRT.
        </p>


        <div class="route-plan-source">

          <div class="route-plan-source-heading">
            RDTR DKI Jakarta 2022
          </div>

          <div class="route-plan-source-doc">
            Pergub DKI Jakarta Nomor 31 Tahun 2022
            · Pasal 20 ayat (2)
          </div>

          <div class="route-plan-source-route">
            ${escapeHTML(info.rdtr)}
          </div>

        </div>


        <div class="route-plan-source">

          <div class="route-plan-source-heading">
            RTRW Jakarta 2024–2044
          </div>

          <div class="route-plan-source-doc">
            Perda DKI Jakarta Nomor 7 Tahun 2024
            · Pasal 25 ayat (2)
          </div>

          <div class="route-plan-source-route">
            ${escapeHTML(info.rtrw)}
          </div>

        </div>


        ${differenceNoteHTML}


        <div class="route-plan-visualization-note">

          <strong>
            Catatan visualisasi
          </strong>

          <span>
            Trase dan lokasi halte yang ditampilkan pada
            WebGIS merupakan skenario visualisasi berdasarkan
            interpretasi jaringan dan bukan trase maupun
            daftar halte resmi yang telah ditetapkan
            pemerintah atau operator transportasi.
          </span>

        </div>

      </div>

    </details>
  `;
}


function renderAllRouteInfo() {
  const modeLabel =
    modeSelect.options[
      modeSelect.selectedIndex
    ]?.text || "Semua Moda";

  const statusLabel =
    statusSelect.options[
      statusSelect.selectedIndex
    ]?.text || "Semua Status";

  const routeTerms =
    updateRouteSelectionTerminology();

  routeInfoEl.innerHTML = `
    <div class="eyebrow">TAMPILAN</div>

    <h2>
      ${escapeHTML(routeTerms.all)}
    </h2>

    <p>
      ${escapeHTML(modeLabel)}
      ·
      ${escapeHTML(statusLabel)}
    </p>
  `;
}

/*
  =========================================================
  KONFIGURASI PENGALIHAN OPERASIONAL
  =========================================================

  Data berikut sengaja ditempatkan di script, bukan SHP /
  GeoJSON, karena sifatnya sementara dan operasional.

  Jika pengalihan selesai, cukup hapus entry koridornya.
*/
const ROUTE_ALERTS = {

  BRT_02: {
    type: "Pengalihan Sementara",

    /*
      Geometri rute pada peta tetap memakai trase data dasar.
      Informasi operasi sementara direpresentasikan lewat
      alert dan daftar halte.
    */
    geometryUnchanged: true,
    title:
      "Koridor 2: Pulo Gadung – Monumen Nasional",

    note:
      "Koridor 2 mengalami penyesuaian layanan akibat pembangunan MRT Jakarta Fase 2A. Terminus sementara dipindahkan dari Harmoni ke Monumen Nasional.",

    temporaryTerminus:
      "Monumen Nasional",

    notServed: [
      "Harmoni"
    ],

    temporaryServed: []
  },


  BRT_03: {
    type: "Pengalihan Sementara",

    /*
      Geometri rute pada peta tetap memakai trase data dasar.
      Informasi operasi sementara direpresentasikan lewat
      alert dan daftar halte.
    */
    geometryUnchanged: true,
    title:
      "Koridor 3: Kalideres – Monumen Nasional",

    note:
      "Koridor 3 mengalami penyesuaian layanan akibat pembangunan MRT Jakarta Fase 2A. Terminus sementara dipindahkan dari Pasar Baru ke Monumen Nasional.",

    temporaryTerminus:
      "Monumen Nasional",

    notServed: [
      "Harmoni",
      "Pecenongan",
      "Juanda",
      "Pasar Baru"
    ],

    /*
      Monumen Nasional bukan halte reguler Koridor 3 pada
      data dasar, tetapi menjadi titik pelayanan sekaligus
      terminus selama pengalihan MRT Jakarta Fase 2A.
    */
    temporaryServed: [
      "Monumen Nasional"
    ]
  },


  BRT_08: {
    type: "Pengalihan Sementara",

    /*
      Geometri rute pada peta tetap memakai trase data dasar.
      Informasi operasi sementara direpresentasikan lewat
      alert dan daftar halte.
    */
    geometryUnchanged: true,
    title:
      "Koridor 8: Lebak Bulus – Pasar Baru",

    note:
      "Koridor 8 mengalami penyesuaian layanan akibat pembangunan MRT Jakarta Fase 2A. Koridor sementara tidak melayani Harmoni dan diperpanjang melalui Pecenongan serta Juanda hingga Pasar Baru.",

    temporaryTerminus:
      "Pasar Baru",

    notServed: [
      "Harmoni"
    ],

    temporaryServed: [
      "Pecenongan",
      "Juanda",
      "Pasar Baru"
    ]
  }

};


/*
  =========================================================
  OPERATIONAL STOP OVERLAY
  =========================================================

  Pengalihan sementara TIDAK mengubah SHP/GeoJSON.

  ROUTE_ALERTS dipakai untuk memodifikasi presentasi:
  - terminus sementara
  - halte yang tidak dilayani
  - halte tambahan selama pengalihan

  Geometri koridor tetap menggunakan data dasar.
*/

function normalizeOperationalStopName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}


function getRouteOperationalConfig(routeId) {
  return (
    ROUTE_ALERTS[
      String(routeId || "")
    ]
    ?? null
  );
}


function getOperationalNameSet(values) {
  return new Set(
    (Array.isArray(values) ? values : [])
      .map(
        normalizeOperationalStopName
      )
      .filter(Boolean)
  );
}


function getOperationalStopState(
  feature,
  routeId
) {
  const config =
    getRouteOperationalConfig(
      routeId
    );

  const name =
    normalizeOperationalStopName(
      getStopDisplayName(feature)
    );

  if (!config || !name) {
    return {
      state: "regular",
      temporaryTerminus: false
    };
  }

  const notServed =
    getOperationalNameSet(
      config.notServed
    );

  const temporaryServed =
    getOperationalNameSet(
      config.temporaryServed
    );

  const temporaryTerminus =
    normalizeOperationalStopName(
      config.temporaryTerminus
    );

  if (notServed.has(name)) {
    return {
      state: "not-served",
      temporaryTerminus: false
    };
  }

  if (temporaryServed.has(name)) {
    return {
      state: "temporary-served",
      temporaryTerminus:
        Boolean(
          temporaryTerminus &&
          temporaryTerminus === name
        )
    };
  }

  return {
    state: "regular",
    temporaryTerminus:
      Boolean(
        temporaryTerminus &&
        temporaryTerminus === name
      )
  };
}


/*
  Cari titik fisik di GeoJSON halte berdasarkan nama.
  Untuk overlay operasional BRT, prioritaskan feature MODE=BRT.
*/
function findStopFeatureByDisplayName(
  stopName,
  preferredMode = "BRT"
) {
  if (!stopData?.features) {
    return null;
  }

  const target =
    normalizeOperationalStopName(
      stopName
    );

  if (!target) {
    return null;
  }

  const matches =
    stopData.features
      .filter(
        feature =>
          normalizeOperationalStopName(
            getStopDisplayName(feature)
          ) === target
      );

  if (!matches.length) {
    return null;
  }

  return (
    matches.find(
      feature =>
        normalizeMode(
          feature?.properties?.MODE
        ) ===
        normalizeMode(
          preferredMode
        )
    )
    ??
    matches[0]
  );
}


/*
  Daftar untuk PANEL KIRI.

  Halte normal yang sedang tidak dilayani tetap dipertahankan
  pada posisi normalnya sebagai referensi kondisi dasar.

  Halte tambahan pengalihan ditambahkan secara virtual dari
  ROUTE_ALERTS tanpa mengubah ROUTES/SEQ_MAP sumber.
*/
function getOperationalStopListEntries(
  routeId
) {
  const baseFeatures =
    getVisibleStopsForRoute(
      routeId
    );

  const config =
    getRouteOperationalConfig(
      routeId
    );

  const entries =
    baseFeatures.map(
      feature => {
        const state =
          getOperationalStopState(
            feature,
            routeId
          );

        return {
          feature,
          state: state.state,
          temporaryTerminus:
            state.temporaryTerminus,
          virtual: false,
          temporaryIndex: null
        };
      }
    );

  if (!config) {
    return entries;
  }

  const existingNames =
    new Set(
      entries.map(
        entry =>
          normalizeOperationalStopName(
            getStopDisplayName(
              entry.feature
            )
          )
      )
    );

  (config.temporaryServed || [])
    .forEach(
      (stopName, index) => {
        const normalizedName =
          normalizeOperationalStopName(
            stopName
          );

        /*
          Jika titik sudah ada di daftar dasar, state-nya sudah
          ditandai temporary-served di atas.
        */
        if (
          !normalizedName ||
          existingNames.has(
            normalizedName
          )
        ) {
          return;
        }

        const feature =
          findStopFeatureByDisplayName(
            stopName,
            "BRT"
          );

        if (!feature) {
          /*
            Jika titik belum ada sama sekali di stop GeoJSON,
            jangan membuat koordinat palsu. Alert tetap
            menampilkan namanya.
          */
          return;
        }

        const state =
          getOperationalStopState(
            feature,
            routeId
          );

        entries.push({
          feature,
          state: "temporary-served",
          temporaryTerminus:
            state.temporaryTerminus,
          virtual: true,
          temporaryIndex:
            index + 1
        });

        existingNames.add(
          normalizedName
        );
      }
    );

  return entries;
}


/*
  Marker dan Previous/Next mengikuti pelayanan AKTIF:
  - not-served dikeluarkan
  - temporary-served dimasukkan

  Halte not-served tetap terlihat di daftar kiri saja.
*/
function getActiveOperationalStopsForRoute(
  routeId
) {
  const seen =
    new Set();

  return getOperationalStopListEntries(
    routeId
  )
    .filter(
      entry =>
        entry.state !==
        "not-served"
    )
    .map(
      entry =>
        entry.feature
    )
    .filter(
      feature => {
        const key =
          getStopKey(feature);

        if (
          !key ||
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);
        return true;
      }
    );
}


/*
  Semua titik operasional untuk marker peta.

  Berbeda dengan getActiveOperationalStopsForRoute():
  fungsi ini TETAP memasukkan halte yang sementara tidak
  dilayani agar user dapat mengkliknya dan membaca konteks
  operasionalnya.

  Previous/Next tetap memakai active-only list.
*/
function getMapOperationalStopsForRoute(
  routeId
) {
  const seen =
    new Set();

  return getOperationalStopListEntries(
    routeId
  )
    .map(
      entry =>
        entry.feature
    )
    .filter(
      feature => {
        const key =
          getStopKey(feature);

        if (
          !key ||
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);
        return true;
      }
    );
}


function getOperationalStopRole(
  feature,
  routeId
) {
  const state =
    getOperationalStopState(
      feature,
      routeId
    );

  if (state.state === "not-served") {
    return "Tidak Dilayani";
  }

  if (state.temporaryTerminus) {
    return "Terminus Sementara";
  }

  if (state.state === "temporary-served") {
    return "Sementara";
  }

  return getStopRoleForRoute(
    feature,
    routeId
  );
}


function getOperationalStopRoleClass(
  feature,
  routeId
) {
  const role =
    getOperationalStopRole(
      feature,
      routeId
    );

  if (role === "Tidak Dilayani") {
    return "is-not-served";
  }

  if (role === "Terminus Sementara") {
    return "is-temp-terminus";
  }

  if (role === "Sementara") {
    return "is-temporary";
  }

  return getStopRoleClass(
    feature,
    routeId
  );
}


function isOperationalTemporaryServed(
  feature,
  routeId
) {
  return (
    getOperationalStopState(
      feature,
      routeId
    ).state ===
    "temporary-served"
  );
}


/*
  Badge daftar halte.
  Halte virtual pengalihan mendapat badge rute aktif walaupun
  ROUTES sumber tidak mencantumkannya.
*/
function getOperationalStopListVisibleRoutes(
  feature,
  activeRouteId
) {
  const routes =
    getStopListVisibleRoutes(
      feature,
      activeRouteId
    );

  if (
    isOperationalTemporaryServed(
      feature,
      activeRouteId
    )
    &&
    !routes.includes(
      String(activeRouteId)
    )
  ) {
    return [
      ...routes,
      String(activeRouteId)
    ];
  }

  return routes;
}


/*
  =========================================================
  ROUTE ALERT / PENGALIHAN SEMENTARA
  =========================================================

  Field pendek direkomendasikan agar kompatibel dengan SHP:

  ALRT_TYPE
  ALRT_TTL
  ALRT_NOTE
  ALRT_STOP
  ALRT_SRC

  Alias panjang untuk GeoJSON juga tetap diterima:
  ALERT_TYPE
  ALERT_TITLE
  ALERT_NOTE
  ALERT_STOPS
  ALERT_SOURCE

  Contoh:
  ALRT_TYPE = Pengalihan Sementara
  ALRT_TTL  = Dampak Pembangunan MRT Jakarta Fase 2A
  ALRT_NOTE = Sebagian perjalanan mengalami penyesuaian ...
  ALRT_STOP = Halte A;Halte B;Halte C
  ALRT_SRC  = TransJakarta
*/

function getRouteAlertData(feature) {
  const p =
    feature?.properties ?? {};

  const routeId =
    getRouteId(feature);

  /*
    Prioritas pertama adalah konfigurasi operasional yang
    ditulis langsung di map.js.
  */
  const configured =
    ROUTE_ALERTS[
      routeId
    ];

  if (configured) {
    return {
      hasAlert: true,
      type:
        cleanText(
          configured.type
        )
        ||
        "Pengalihan Sementara",

      title:
        cleanText(
          configured.title
        )
        ||
        "Terdapat penyesuaian layanan sementara",

      note:
        cleanText(
          configured.note
        ),

      source:
        cleanText(
          configured.source
        ),

      geometryUnchanged:
        Boolean(
          configured.geometryUnchanged
        ),

      temporaryTerminus:
        cleanText(
          configured.temporaryTerminus
        ),

      notServed:
        Array.isArray(
          configured.notServed
        )
          ? configured.notServed
              .map(cleanText)
              .filter(Boolean)
          : [],

      temporaryServed:
        Array.isArray(
          configured.temporaryServed
        )
          ? configured.temporaryServed
              .map(cleanText)
              .filter(Boolean)
          : [],

      /*
        Backward compatibility dengan struktur alert lama.
      */
      stops:
        Array.isArray(
          configured.temporaryServed
        )
          ? configured.temporaryServed
              .map(cleanText)
              .filter(Boolean)
          : []
    };
  }


  /*
    Fallback: field pada SHP/GeoJSON tetap didukung bila
    suatu saat dibutuhkan untuk alert lain.
  */
  const type =
    cleanText(
      p.ALRT_TYPE ??
      p.ALERT_TYPE ??
      ""
    );

  const title =
    cleanText(
      p.ALRT_TTL ??
      p.ALERT_TITLE ??
      ""
    );

  const note =
    cleanText(
      p.ALRT_NOTE ??
      p.ALERT_NOTE ??
      ""
    );

  const source =
    cleanText(
      p.ALRT_SRC ??
      p.ALERT_SOURCE ??
      ""
    );

  const stops =
    splitIds(
      p.ALRT_STOP ??
      p.ALERT_STOPS ??
      ""
    );

  const hasAlert =
    Boolean(
      type ||
      title ||
      note ||
      source ||
      stops.length
    );

  return {
    hasAlert,
    type:
      type ||
      "Pengalihan Sementara",
    title:
      title ||
      "Terdapat penyesuaian layanan sementara",
    note,
    source,

    geometryUnchanged: false,

    temporaryTerminus: "",
    notServed: [],
    temporaryServed: stops,

    stops
  };
}


function buildRouteAlertHTML(
  feature,
  objectName
) {
  const alert =
    getRouteAlertData(
      feature
    );

  if (!alert.hasAlert) {
    return "";
  }


  function buildStopListSection(
    title,
    note,
    stops,
    modifierClass = ""
  ) {
    if (!Array.isArray(stops) || !stops.length) {
      return "";
    }

    return `
      <div
        class="route-alert-stop-section ${escapeHTML(
          modifierClass
        )}"
      >

        <div class="route-alert-stop-heading">
          ${escapeHTML(title)}

          <span class="route-alert-stop-count">
            ${stops.length}
          </span>
        </div>

        ${
          note
            ? `
              <div class="route-alert-stop-note">
                ${escapeHTML(note)}
              </div>
            `
            : ""
        }

        <ul class="route-alert-stop-list">
          ${stops
            .map(
              stopName => `
                <li>
                  ${escapeHTML(stopName)}
                </li>
              `
            )
            .join("")}
        </ul>

      </div>
    `;
  }


  const terminusHTML =
    alert.temporaryTerminus
      ? `
        <div class="route-alert-terminus">

          <span class="route-alert-detail-label">
            Terminus sementara
          </span>

          <strong>
            ${escapeHTML(
              alert.temporaryTerminus
            )}
          </strong>

        </div>
      `
      : "";


  const notServedHTML =
    buildStopListSection(
      `${objectName} yang tidak dilayani`,
      "Titik berikut tidak dilayani selama pengalihan sementara.",
      alert.notServed,
      "is-not-served"
    );


  const temporaryServedHTML =
    buildStopListSection(
      `${objectName} yang dilayani selama pengalihan`,
      `Titik berikut dilayani selama pengalihan dan tidak dicampur ke daftar ${objectName.toLowerCase()} reguler.`,
      alert.temporaryServed,
      "is-temporary-served"
    );


  const noteHTML =
    alert.note
      ? `
        <p class="route-alert-note">
          ${escapeHTML(alert.note)}
        </p>
      `
      : "";


  const sourceHTML =
    alert.source
      ? `
        <div class="route-alert-source">
          <span>Sumber</span>
          ${escapeHTML(alert.source)}
        </div>
      `
      : "";


  const geometryNoteHTML =
    alert.geometryUnchanged
      ? `
        <div class="route-alert-map-note">
          <strong>Catatan peta:</strong>
          garis koridor tetap menampilkan trase data dasar.
          Pengalihan sementara belum digambarkan pada geometri rute.
        </div>
      `
      : "";


  return `
    <details class="route-alert-card">

      <summary class="route-alert-summary">

        <span
          class="route-alert-icon"
          aria-hidden="true"
        >
          !
        </span>

        <span class="route-alert-summary-copy">

          <span class="route-alert-type">
            ${escapeHTML(alert.type)}
          </span>

          <span class="route-alert-title">
            ${escapeHTML(alert.title)}
          </span>

        </span>

        <span
          class="route-alert-chevron"
          aria-hidden="true"
        >
          ›
        </span>

      </summary>

      <div class="route-alert-body">

        ${noteHTML}

        ${terminusHTML}

        ${notServedHTML}

        ${temporaryServedHTML}

        ${geometryNoteHTML}

        ${sourceHTML}

      </div>

    </details>
  `;
}


function renderRouteInfo(feature) {
  const p = feature.properties;

  const routeId =
    getRouteId(feature);

  const proposedCount =
    getProposedStopsForRoute(
      routeId
    ).length;

  const conceptualCount =
    getConceptualStopsForRoute(
      routeId
    ).length;

  const objectName =
    normalizeMode(
      getRouteMode(feature)
    ) === "BRT"
      ? "Halte"
      : "Stasiun";

  const routeAlertHTML =
    buildRouteAlertHTML(
      feature,
      objectName
    );

  const routePlanInfoHTML =
    buildRoutePlanInfoHTML(
      feature
    );

  const alignmentHTML = hasText(p.ALIGNMENT)
    ? `
      <div class="route-meta-row">
        <div class="route-meta-label">Trase</div>
        <div>${escapeHTML(p.ALIGNMENT)}</div>
      </div>
    `
    : "";

  function optionalStopToggleHTML(
    statusKey,
    statusLabel,
    count,
    checked
  ) {
    if (!count) {
      return "";
    }

    return `
      <div
        class="optional-stop-control"
        data-optional-stop-status="${escapeHTML(statusKey)}"
      >
        <div class="optional-stop-control-copy">
          <div class="optional-stop-control-title">
            ${escapeHTML(objectName)} ${escapeHTML(statusLabel)}
            <span
              class="optional-stop-count optional-stop-count-${escapeHTML(statusKey.toLowerCase())}"
            >
              ${count}
            </span>
          </div>

          <div class="optional-stop-control-hint">
            Nyalakan untuk menampilkan
            ${escapeHTML(objectName.toLowerCase())}
            ${escapeHTML(statusLabel.toLowerCase())}.
          </div>
        </div>

        <label
          class="optional-stop-switch"
          title="Tampilkan atau sembunyikan ${escapeHTML(objectName.toLowerCase())} ${escapeHTML(statusLabel.toLowerCase())}"
        >
          <input
            type="checkbox"
            data-optional-stop-toggle="${escapeHTML(statusKey)}"
            ${checked ? "checked" : ""}
            aria-label="Tampilkan ${escapeHTML(objectName.toLowerCase())} ${escapeHTML(statusLabel.toLowerCase())}"
          />

          <span
            class="optional-stop-switch-track"
            aria-hidden="true"
          >
            <span class="optional-stop-switch-thumb"></span>
          </span>
        </label>
      </div>
    `;
  }

  const optionalStopsHTML = `
    ${optionalStopToggleHTML(
      "Proposed",
      "Usulan",
      proposedCount,
      showProposedStops
    )}

    ${optionalStopToggleHTML(
      "Conceptual",
      "Konseptual",
      conceptualCount,
      showConceptualStops
    )}
  `;

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
        <div>${escapeHTML(getStatusLabel(p.STATUS))}</div>
      </div>

      ${alignmentHTML}
    </div>

    ${routePlanInfoHTML}

    ${routeAlertHTML}

    <div class="optional-stop-controls">
      ${optionalStopsHTML}
    </div>
  `;
}


/*
  Toggle memakai event delegation karena routeInfo dirender
  ulang setiap kali rute berubah.
*/
routeInfoEl
  ?.addEventListener(
    "change",
    event => {
      const toggle =
        event.target
          ?.closest?.(
            "[data-optional-stop-toggle]"
          );

      if (!toggle) {
        return;
      }

      const status =
        String(
          toggle.dataset.optionalStopToggle ||
          ""
        );

      if (status === "Proposed") {
        showProposedStops =
          Boolean(toggle.checked);
      }

      if (status === "Conceptual") {
        showConceptualStops =
          Boolean(toggle.checked);
      }

      const routeId =
        currentSelectedRouteId
        ||
        (
          routeSelect?.value !== "ALL"
            ? routeSelect?.value
            : ""
        );

      if (!routeId) {
        return;
      }

      if (currentSelectedStopKey) {
        const selectedFeature =
          getStopByKey(
            currentSelectedStopKey
          );

        const hiddenNow =
          (
            selectedFeature &&
            isProposedStop(selectedFeature) &&
            !showProposedStops
          )
          ||
          (
            selectedFeature &&
            isConceptualStop(selectedFeature) &&
            !showConceptualStops
          );

        if (hiddenNow) {
          map.closePopup();
          clearSelectedStop();
        }
      }

      drawStops(routeId);
      renderStopList(routeId);

      const route =
        getRouteById(routeId);

      if (route) {
        renderRouteInfo(route);
      }
    }
  );


/* =========================================================
   DROPDOWN ROUTE
   ========================================================= */

function populateRouteDropdown() {
  const selectedMode =
    normalizeMode(
      modeSelect?.value
    );

  const routeTerms =
    updateRouteSelectionTerminology();

  /*
    UX MODE-FIRST
    ========================================================
    Saat "Semua Moda" aktif, dropdown Lin/Koridor hanya
    menampilkan pilihan ALL.

    Daftar rute spesifik baru muncul setelah user memilih:
    - BRT
    - MRT
    - LRT
    - KRL

    Dengan begitu daftar Koridor BRT tidak bercampur dengan
    Lin MRT/LRT/KRL ketika moda belum dipilih.
  */
  routeSelect.innerHTML = `
    <option value="ALL">
      ${escapeHTML(routeTerms.all)}
    </option>
  `;

  if (
    selectedMode === "ALL" ||
    !selectedMode
  ) {
    routeSelect.value = "ALL";
    return;
  }

  const features =
    getFilteredRoutes();

  features.forEach(
    feature => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        getRouteId(feature);

      option.textContent =
        getRouteOptionText(
          feature
        );

      routeSelect.appendChild(
        option
      );
    }
  );

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


/*
  Menentukan badge koridor apa saja yang ditampilkan
  pada DAFTAR halte/stasiun untuk rute yang sedang aktif.

  Prinsip UX:
  ----------------------------------------------------------
  Jika rute aktif = Existing
  -> hanya tampilkan rute Existing.

  Tujuannya agar user tidak mengira rute Planned /
  Conceptual sudah benar-benar melayani halte tersebut.

  Jika rute aktif = Planned / Proposed / Conceptual
  -> tampilkan semua rute yang melayani titik itu,
     termasuk rute Existing.

  Dengan begitu saat user mengeksplorasi koridor masa depan,
  koneksi dengan jaringan yang sudah ada tetap terlihat.

  Catatan:
  ----------------------------------------------------------
  Aturan ini HANYA untuk daftar halte/stasiun.
  Popup tetap menampilkan semua rute dan menggunakan
  opacity/ring status seperti sebelumnya.
*/
function getStopListVisibleRoutes(
  feature,
  activeRouteId
) {
  const allRoutes =
    getStopRoutes(feature)
      .filter(
        routeId =>
          String(routeId)
            .toUpperCase()
            .startsWith("BRT_")
      )
      .filter(
        routeId =>
          Boolean(
            getRouteById(routeId)
          )
      );

  const activeRoute =
    getRouteById(
      activeRouteId
    );

  if (!activeRoute) {
    return allRoutes;
  }

  const activeStatus =
    normalizeStatus(
      activeRoute.properties.STATUS
    );

  /*
    Saat rute aktif Eksisting:
    hanya badge rute eksisting yang ditampilkan.
  */
  if (
    activeStatus === "Existing"
  ) {
    return allRoutes.filter(
      routeId => {
        const route =
          getRouteById(routeId);

        if (!route) {
          return false;
        }

        return (
          normalizeStatus(
            route.properties.STATUS
          ) === "Existing"
        );
      }
    );
  }

  /*
    Saat rute aktif Rencana / Usulan / Konseptual:
    semua koneksi tetap ditampilkan.
  */
  return allRoutes;
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


  if (code === "MRT_OR") {

    return {
      code,
      operatorKey: "MRT_JAKARTA",
      operator: "MRT Jakarta",
      route: "Lin Lingkar Luar",
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
    KA BANDARA

    Kode baku:
    KAI_BANDARA

    Alias yang tetap diterima:
    KA_BANDARA

    Contoh:
    INTEGRASI = KAI_BANDARA
    INT_NM    = KAI_BANDARA:BNI City
  */
  if (
    code === "KAI_BANDARA" ||
    code === "KA_BANDARA"
  ) {

    return {
      code,
      operatorKey: "KAI_BANDARA",
      operator: "KA Bandara",
      route: "KA Bandara",
      logo: TRANSIT_LOGOS.KAI_BANDARA,
      airportRail: true
    };

  }


  /*
    TERMINAL BUS

    Terminal adalah fasilitas integrasi, bukan lin.
    Karena itu tidak mempunyai badge lin.

    Nama lengkap terminal diambil langsung dari INT_NM:
    INTEGRASI = TERMINAL
    INT_NM    = TERMINAL:Terminal Kampung Rambutan
  */
  if (code === "TERMINAL") {

    return {
      code,
      operatorKey: "TERMINAL",
      operator: "Terminal Bus",
      route: "",
      logo: TRANSIT_LOGOS.TERMINAL,
      terminal: true
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



/*
  Urutan baku integrasi pada popup.

  Urutan tidak bergantung pada cara field INTEGRASI ditulis
  di GeoJSON / ArcGIS Pro.

  1. TransJakarta
  2. Kereta Api Jarak Jauh
  3. KRL Commuter Line
  4. KA Bandara
  5. MRT Jakarta
  6. LRT Jabodebek
  7. LRT Jakarta
  8. Terminal Bus
*/
const INTEGRATION_OPERATOR_ORDER = {
  TRANSJAKARTA: 10,
  KAI_KAJJ: 20,
  KRL: 30,
  KAI_BANDARA: 40,
  MRT_JAKARTA: 50,
  LRT_JABODEBEK: 60,
  LRT_JAKARTA: 70,
  TERMINAL: 80
};


function getIntegrationOperatorPriority(
  operatorKey
) {
  return (
    INTEGRATION_OPERATOR_ORDER[
      String(operatorKey || "")
        .trim()
        .toUpperCase()
    ]
    ?? 999
  );
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

    const rawRelatedNames =
      integrationNameMap[
        info.code
      ]
      ??
      integrationNameMap[
        String(id)
      ]
      ??
      [];

    const relatedNames =
      (
        Array.isArray(
          rawRelatedNames
        )
          ? rawRelatedNames
          : [rawRelatedNames]
      )
        .map(
          value =>
            String(value || "")
              .trim()
        )
        .filter(Boolean);


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


    /*
      Satu kode integrasi dapat menunjuk ke lebih dari satu
      titik fisik.

      Contoh:
      INTEGRASI = KRL_CK
      INT_NM    = KRL_CK:Sudirman;KRL_CK:Karet

      Popup:
      [C] Stasiun Sudirman
      [C] Stasiun Karet
    */
    if (relatedNames.length) {

      relatedNames.forEach(
        relatedName => {

          groups
            .get(key)
            .services
            .push({
              ...info,
              relatedName
            });

        }
      );

    } else {

      /*
        Tetap buat satu service kosong agar warning/fallback
        "Titik integrasi belum diisi" tetap bekerja.
      */
      groups
        .get(key)
        .services
        .push({
          ...info,
          relatedName: ""
        });

    }

  });


  return Array.from(
    groups.values()
  )
    .sort(
      (a, b) => {
        const priorityDiff =
          getIntegrationOperatorPriority(
            a.operatorKey
          )
          -
          getIntegrationOperatorPriority(
            b.operatorKey
          );

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return String(
          a.operator || a.operatorKey
        )
          .localeCompare(
            String(
              b.operator || b.operatorKey
            ),
            "id"
          );
      }
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

  const prefix =
    String(
      getIntegrationPlacePrefix(
        service
      ) || ""
    )
      .trim();

  return prefix
    ? `${prefix} ${relatedName}`
    : relatedName;
}


function buildIntegrationBadge(service) {

  /*
    KAJJ dan Terminal Bus adalah jenis layanan/fasilitas,
    bukan lin. Karena itu tidak memakai badge lin.
  */
  if (
    service.kajj ||
    service.terminal
  ) {
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


/*
  Badge rute pada bagian "yang dilayani" dibuat clickable.
  Hanya rute yang benar-benar ada di ROUTES halte/stasiun
  yang boleh muncul di sini.

  Badge integrasi tetap bersifat informasi pasif karena
  integrasi dapat merujuk ke titik fisik yang berbeda.
*/
function buildDirectServiceRouteButton(
  routeId,
  activeRouteId
) {
  const route =
    getRouteById(routeId);

  if (!route) {
    return "";
  }

  const mode =
    getRouteMode(route);

  const routeStatus =
    normalizeStatus(
      route.properties.STATUS
    );

  const statusClass =
    routeStatus === "Planned"
      ? "is-planned-route"
      : routeStatus === "Proposed"
        ? "is-proposed-route"
        : routeStatus === "Conceptual"
          ? "is-concept-route"
          : "is-existing-route";

  const isActive =
    String(routeId) ===
    String(activeRouteId);

  const badgeHTML =
    mode === "BRT"
      ? buildBrtBadge(routeId)
      : buildLineBadge(routeId);

  if (!badgeHTML) {
    return "";
  }

  const routeTitle =
    getRouteTitle(route);

  const statusSuffix =
    routeStatus
      ? ` · ${getStatusLabel(routeStatus)}`
      : "";

  return `
    <button
      type="button"
      class="
        stop-popup-route-button
        ${statusClass}
        ${isActive ? "is-active" : ""}
      "
      data-route-switch="${escapeHTML(routeId)}"
      ${
        isActive
          ? "disabled"
          : ""
      }
      aria-label="${
        isActive
          ? `Rute aktif: ${escapeHTML(routeTitle)}${escapeHTML(statusSuffix)}`
          : `Tampilkan ${escapeHTML(routeTitle)}${escapeHTML(statusSuffix)}`
      }"
      title="${
        isActive
          ? `Rute aktif: ${escapeHTML(routeTitle)}${escapeHTML(statusSuffix)}`
          : `Tampilkan ${escapeHTML(routeTitle)}${escapeHTML(statusSuffix)}`
      }"
    >
      ${badgeHTML}
    </button>
  `;
}


function getDirectServiceSectionLabel(
  routeIds
) {
  const modes =
    new Set(
      routeIds
        .map(
          routeId =>
            getRouteById(routeId)
        )
        .filter(Boolean)
        .map(
          getRouteMode
        )
    );

  if (
    modes.size === 1 &&
    modes.has("BRT")
  ) {
    return "Koridor yang dilayani";
  }

  if (
    modes.size > 0 &&
    !modes.has("BRT")
  ) {
    return "Lin yang dilayani";
  }

  return "Lin / Koridor yang dilayani";
}


/*
  Berpindah konteks rute dari popup tetapi tetap pada
  halte/stasiun yang sama.

  Hasil:
  - Moda ikut menyesuaikan
  - Status ikut menyesuaikan
  - dropdown Lin/Koridor ikut menyesuaikan
  - trase rute baru ditampilkan
  - daftar halte/stasiun berubah ke rute baru
  - halte yang sama kembali terpilih
  - SEQ_MAP, arah, Previous/Next otomatis mengikuti rute baru
*/
function switchRouteFromStopPopup(
  routeId,
  stopKey
) {
  const route =
    getRouteById(routeId);

  const stop =
    getStopByKey(stopKey);

  if (
    !route ||
    !stop ||
    !stopServesRoute(
      stop,
      routeId
    )
  ) {
    return;
  }

  if (
    String(
      currentSelectedRouteId
    ) ===
    String(routeId)
  ) {
    return;
  }

  modeSelect.value =
    getRouteMode(route);

  statusSelect.value =
    normalizeStatus(
      route.properties.STATUS
    );

  populateRouteDropdown();

  routeSelect.value =
    String(routeId);

  showSingleRoute(
    routeId
  );

  /*
    showSingleRoute() menggambar ulang marker + popup.
    Pada frame berikutnya pilih kembali titik fisik yang sama.
  */
  requestAnimationFrame(
    () => {
      selectStop(
        stopKey,
        routeId,
        true
      );

      requestAnimationFrame(
        () => {
          const selectedItem =
            stopListEl
              ?.querySelector(
                `.stop-list-item[data-stop-key="${CSS.escape(String(stopKey))}"]`
              );

          selectedItem
            ?.scrollIntoView({
              block: "nearest",
              behavior: "smooth"
            });
        }
      );
    }
  );
}

/*
  ==========================================================
  POPUP ROUTE BADGE — DELEGATED CLICK HANDLER
  ==========================================================

  Sama seperti navigasi Sebelumnya/Berikutnya, badge koridor/lin
  menggunakan event delegation. Ini membuat klik tetap berfungsi
  walaupun Leaflet memperbarui DOM popup setelah resize/update.
*/
map
  .getContainer()
  .addEventListener(
    "click",
    event => {
      const button =
        event.target
          ?.closest(
            ".stop-popup-route-button"
          );

      if (!button) {
        return;
      }

      /*
        Badge rute aktif memang disabled.
      */
      if (
        button.disabled ||
        button.hasAttribute(
          "disabled"
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const routeId =
        button.dataset.routeSwitch;

      const popupRoot =
        button.closest(
          ".stop-popup"
        );

      const stopKey =
        popupRoot
          ?.dataset.stopKey
        ||
        currentSelectedStopKey;

      if (
        !routeId ||
        !stopKey
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      L.DomEvent.stopPropagation(
        event
      );

      switchRouteFromStopPopup(
        routeId,
        stopKey
      );
    },
    true
  );


function getStopStatus(feature) {
  return normalizeStatus(
    feature?.properties?.STATUS
  ) || "-";
}


function getStopStatusLabel(feature) {
  const status =
    getStopStatus(feature);

  return status === "-"
    ? "-"
    : getStatusLabel(status);
}


function getStopStatusClass(feature) {
  const status =
    getStopStatus(feature);

  if (status === "Existing") {
    return "is-existing";
  }

  if (status === "Planned") {
    return "is-planned";
  }

  if (status === "Proposed") {
    return "is-proposed";
  }

  if (status === "Conceptual") {
    return "is-conceptual";
  }

  return "is-other";
}

function getStopStatusShort(feature) {
  return getStopStatusLabel(feature);
}

/* =========================================================
   STOP POPUP
   ========================================================= */

/*
  Keterangan khusus untuk titik yang terdampak perubahan
  operasional sementara.
*/
function getOperationalRouteShortLabel(
  routeId
) {
  const route =
    getRouteById(
      routeId
    );

  if (!route) {
    return String(routeId || "");
  }

  const mode =
    getRouteMode(route);

  const line =
    cleanText(
      route.properties.LINE
    );

  if (
    mode === "BRT" &&
    line
  ) {
    return `Koridor ${line}`;
  }

  return (
    line
      ? `${mode} ${line}`
      : getRouteTitle(route)
  );
}


function buildOperationalStopNoticeHTML(
  feature,
  routeId
) {
  const operational =
    getOperationalStopState(
      feature,
      routeId
    );

  const routeLabel =
    getOperationalRouteShortLabel(
      routeId
    );

  if (
    operational.state ===
    "not-served"
  ) {
    return `
      <div class="stop-operational-notice is-not-served">
        <div class="stop-operational-notice-title">
          Tidak dilayani sementara
        </div>

        <div class="stop-operational-notice-text">
          ${escapeHTML(routeLabel)}
          sementara tidak melayani halte/stasiun ini selama
          pengalihan operasional. Titik ini tetap ditampilkan
          untuk menunjukkan pola pelayanan normal.
        </div>
      </div>
    `;
  }

  if (
    operational.temporaryTerminus
  ) {
    return `
      <div class="stop-operational-notice is-temporary">
        <div class="stop-operational-notice-title">
          Terminus sementara
        </div>

        <div class="stop-operational-notice-text">
          Titik ini menjadi terminus sementara
          ${escapeHTML(routeLabel)}
          selama pengalihan operasional.
        </div>
      </div>
    `;
  }

  if (
    operational.state ===
    "temporary-served"
  ) {
    return `
      <div class="stop-operational-notice is-temporary">
        <div class="stop-operational-notice-title">
          Pelayanan sementara
        </div>

        <div class="stop-operational-notice-text">
          ${escapeHTML(routeLabel)}
          melayani halte/stasiun ini selama pengalihan
          operasional.
        </div>
      </div>
    `;
  }

  return "";
}


function buildStopPopup(feature, routeId) {
  const p = feature.properties;

  const operationalState =
    getOperationalStopState(
      feature,
      routeId
    );

  let directRoutes =
    getStopRoutes(feature)
      .filter(
        directRouteId =>
          Boolean(
            getRouteById(
              directRouteId
            )
          )
      );

  /*
    Jika rute aktif sedang TIDAK melayani titik ini, jangan
    masukkan rute tersebut ke bagian "Koridor/Lin yang
    dilayani". Rute lain yang memang melayani tetap tampil.
  */
  if (
    operationalState.state ===
    "not-served"
  ) {
    directRoutes =
      directRoutes.filter(
        directRouteId =>
          String(directRouteId) !==
          String(routeId)
      );
  }

  /*
    Saat halte dilayani hanya karena pengalihan sementara,
    tampilkan rute aktif sebagai pelayanan virtual di popup.
  */
  if (
    isOperationalTemporaryServed(
      feature,
      routeId
    )
    &&
    !directRoutes.includes(
      String(routeId)
    )
  ) {
    directRoutes.push(
      String(routeId)
    );
  }

  const integrations =
    getStopIntegrations(feature);

  const integrationNameMap =
    getStopIntegrationNameMap(
      feature
    );

  const role =
    getOperationalStopRole(
      feature,
      routeId
    );

  const roleHTML =
    role &&
    role.toLowerCase() !== "reguler" &&
    role.toLowerCase() !== "regular" &&
    role.toLowerCase() !== "normal"
      ? `
        <div class="stop-popup-role ${getOperationalStopRoleClass(feature, routeId)}">
          ${escapeHTML(role)}
        </div>
      `
      : "";

  const operationalNoticeHTML =
    buildOperationalStopNoticeHTML(
      feature,
      routeId
    );

  const directServiceHTML =
    directRoutes.length
      ? `
        <div class="stop-popup-section">

          <div class="stop-popup-label">
            ${escapeHTML(
              getDirectServiceSectionLabel(
                directRoutes
              )
            )}
          </div>

          <div class="stop-popup-direct-routes">
            ${
              directRoutes
                .map(
                  directRouteId =>
                    buildDirectServiceRouteButton(
                      directRouteId,
                      routeId
                    )
                )
                .join("")
            }
          </div>

          ${
            directRoutes.length > 1
              ? `
                <div class="stop-popup-route-hint">
                  Klik badge untuk menampilkan rute lain yang melayani titik ini.
                </div>
              `
              : ""
          }

        </div>
      `
      : "";

  const integrationGroups =
    groupIntegrationsByOperator(
      integrations,
      integrationNameMap
    );

  /*
    Popup sederhana dibuat lebih compact di mobile.
    Contoh:
    - 1–2 rute langsung
    - tanpa integrasi
    - tanpa role khusus

    Popup kompleks (Harmoni, Dukuh Atas, dll.) tetap memakai
    ukuran normal agar informasi tidak terlalu sempit.
  */
  const isCompactPopup =
    directRoutes.length <= 2 &&
    integrationGroups.length === 0 &&
    !(
      role &&
      role.toLowerCase() !== "reguler" &&
      role.toLowerCase() !== "regular" &&
      role.toLowerCase() !== "normal"
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

  const adjacentStops =
    routeId
      ? getAdjacentStops(
          feature,
          routeId
        )
      : {
          previous: null,
          next: null
        };

  const previousStop =
    adjacentStops.previous;

  const nextStop =
    adjacentStops.next;

  const previousName =
    previousStop
      ? getStopDisplayName(
          previousStop
        )
      : "";

  const nextName =
    nextStop
      ? getStopDisplayName(
          nextStop
        )
      : "";

  const navigationHTML =
    routeId
      ?
      `
        <div class="stop-popup-navigation">

          <button
            type="button"
            class="stop-popup-nav-button stop-popup-nav-prev"
            data-stop-nav="previous"
            data-stop-key="${
              previousStop
                ? escapeHTML(
                    getStopKey(
                      previousStop
                    )
                  )
                : ""
            }"
            data-route-id="${escapeHTML(routeId)}"
            ${
              previousStop
                ? ""
                : "disabled"
            }
            title="${
              previousStop
                ? `Halte/stasiun sebelumnya: ${escapeHTML(previousName)}`
                : "Tidak ada halte/stasiun sebelumnya"
            }"
          >
            <span class="stop-popup-nav-arrow" aria-hidden="true">‹</span>
            <span class="stop-popup-nav-text">
              <span class="stop-popup-nav-label">Sebelumnya</span>
              <span class="stop-popup-nav-name">
                ${
                  previousStop
                    ? escapeHTML(previousName)
                    : "Awal rute"
                }
              </span>
            </span>
          </button>

          <button
            type="button"
            class="stop-popup-nav-button stop-popup-nav-next"
            data-stop-nav="next"
            data-stop-key="${
              nextStop
                ? escapeHTML(
                    getStopKey(
                      nextStop
                    )
                  )
                : ""
            }"
            data-route-id="${escapeHTML(routeId)}"
            ${
              nextStop
                ? ""
                : "disabled"
            }
            title="${
              nextStop
                ? `Halte/stasiun berikutnya: ${escapeHTML(nextName)}`
                : "Tidak ada halte/stasiun berikutnya"
            }"
          >
            <span class="stop-popup-nav-text">
              <span class="stop-popup-nav-label">Berikutnya</span>
              <span class="stop-popup-nav-name">
                ${
                  nextStop
                    ? escapeHTML(nextName)
                    : "Akhir rute"
                }
              </span>
            </span>
            <span class="stop-popup-nav-arrow" aria-hidden="true">›</span>
          </button>

        </div>
      `
      :
      "";

  return `
    <div
      class="stop-popup ${isCompactPopup ? "is-compact" : "is-rich"}"
      data-stop-key="${escapeHTML(getStopKey(feature))}"
    >

      <!--
        Hanya bagian ini yang boleh scroll.
        Footer navigasi sengaja ditempatkan di luar wrapper ini.
      -->
      <div class="stop-popup-scroll">

        <div class="stop-popup-eyebrow">
          ${escapeHTML(getStopTypeLabel(feature))}
        </div>

        <div class="stop-popup-title">
          ${escapeHTML(getStopDisplayName(feature))}
        </div>

        <div class="stop-popup-status ${getStopStatusClass(feature)}">
          ${escapeHTML(getStopStatusLabel(feature))}
        </div>

        ${roleHTML}

        ${operationalNoticeHTML}

        <div class="stop-popup-divider"></div>

        ${directServiceHTML}
        ${integrationHTML}

      </div>

      ${navigationHTML}

    </div>
  `;
}


function safeBuildStopPopup(feature, routeId) {
  try {
    return buildStopPopup(feature, routeId);
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
          ${escapeHTML(getStopStatusLabel(feature))}
        </div>
      </div>
    `;
  }
}

/* =========================================================
   STOP STYLE
   ========================================================= */

function normalStopStyle(
  routeId,
  feature = null
) {
  const proposed =
    Boolean(
      feature &&
      isProposedStop(feature)
    );

  const conceptual =
    Boolean(
      feature &&
      isConceptualStop(feature)
    );

  const operationalState =
    feature
      ? getOperationalStopState(
          feature,
          routeId
        )
      : {
          state: "regular"
        };

  const notServed =
    operationalState.state ===
    "not-served";

  const temporaryServed =
    operationalState.state ===
    "temporary-served";

  return {
    pane: "stopPane",

    radius:
      conceptual
        ? 5.5
        : 5,

    color:
      notServed
        ? "#838991"
        : getRouteColor(routeId),

    weight:
      notServed
        ? 1.8
        : 2,

    fillColor: "#ffffff",

    fillOpacity:
      notServed
        ? 0.42
        : conceptual
          ? 0.58
          : temporaryServed
            ? 0.82
            : proposed
              ? 0.76
              : 1,

    dashArray:
      notServed
        ? "2 2"
        : conceptual
          ? "3 2"
          : temporaryServed
            ? "7 2"
            : proposed
              ? "6 2"
              : null
  };
}


function selectedStopStyle(
  routeId,
  feature = null
) {
  const proposed =
    Boolean(
      feature &&
      isProposedStop(feature)
    );

  const conceptual =
    Boolean(
      feature &&
      isConceptualStop(feature)
    );

  const operationalState =
    feature
      ? getOperationalStopState(
          feature,
          routeId
        )
      : {
          state: "regular"
        };

  const notServed =
    operationalState.state ===
    "not-served";

  const temporaryServed =
    operationalState.state ===
    "temporary-served";

  return {
    pane: "stopPane",
    radius: 8,

    color:
      notServed
        ? "#50555c"
        : "#151515",

    weight: 2.5,

    fillColor:
      notServed
        ? "#f0f1f2"
        : getRouteColor(routeId),

    fillOpacity:
      notServed
        ? 0.90
        : conceptual
          ? 0.76
          : temporaryServed
            ? 0.92
            : proposed
              ? 0.88
              : 1,

    dashArray:
      notServed
        ? "3 2"
        : conceptual
          ? "4 2"
          : temporaryServed
            ? "8 2"
            : proposed
              ? "7 2"
              : null
  };
}

function getStopPopupOptions() {

  const viewportWidth =
    window.innerWidth;

  const viewportHeight =
    window.innerHeight;

  /*
    MOBILE
    ========================================================
    Sisakan ruang untuk floating search dan bottom navigation.
  */
  if (isMobileLayout()) {

    const sideMargin = 18;
    const topReserved = 64;
    const bottomReserved = 84;

    const availableWidth =
      Math.max(
        220,
        viewportWidth -
        sideMargin * 2
      );

    const availableHeight =
      Math.max(
        240,
        viewportHeight -
        topReserved -
        bottomReserved
      );

    const maxWidth =
      Math.min(
        330,
        availableWidth
      );

    const minWidth =
      Math.min(
        245,
        maxWidth
      );

    return {
      maxWidth,
      minWidth,

      maxHeight:
        Math.min(
          540,
          availableHeight
        ),

      autoPan: true,
      keepInView: true,

      autoPanPaddingTopLeft:
        [
          sideMargin,
          topReserved
        ],

      autoPanPaddingBottomRight:
        [
          sideMargin,
          bottomReserved
        ]
    };
  }


  /*
    DESKTOP
    ========================================================
    Hitung ruang visual antara sidebar kiri dan kartu kanan.
  */
  const mapElement =
    document.getElementById(
      "map"
    );

  const mapRect =
    mapElement
      ?.getBoundingClientRect();

  const leftPanelRect =
    filterPanel
      ?.getBoundingClientRect();

  const rightPanelRect =
    rightInfoPanel
      ?.getBoundingClientRect();

  const leftPanelVisible =
    Boolean(
      leftPanelRect &&
      !document.body
        .classList
        .contains(
          "left-panel-collapsed"
        )
    );

  const leftPadding =
    leftPanelVisible
      ? Math.max(
          28,
          Math.ceil(
            leftPanelRect.right -
            (mapRect?.left ?? 0) +
            18
          )
        )
      : 28;

  const rightPadding =
    rightPanelRect
      ? Math.max(
          28,
          Math.ceil(
            (mapRect?.right ?? viewportWidth) -
            rightPanelRect.left +
            18
          )
        )
      : 28;

  const topPadding = 24;
  const bottomPadding = 78;

  const availableWidth =
    Math.max(
      320,
      viewportWidth -
      leftPadding -
      rightPadding -
      24
    );

  const availableHeight =
    Math.max(
      300,
      viewportHeight -
      topPadding -
      bottomPadding
    );

  const maxWidth =
    Math.min(
      460,
      availableWidth
    );

  const minWidth =
    Math.min(
      330,
      maxWidth
    );

  return {
    maxWidth,
    minWidth,

    maxHeight:
      Math.min(
        680,
        availableHeight
      ),

    autoPan: true,
    keepInView: true,

    autoPanPaddingTopLeft:
      [
        leftPadding,
        topPadding
      ],

    autoPanPaddingBottomRight:
      [
        rightPadding,
        bottomPadding
      ]
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

  const features =
    getMapOperationalStopsForRoute(
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
          normalStopStyle(
            routeId,
            feature
          )
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
          safeBuildStopPopup(
            feature,
            routeId
          ),
          getStopPopupOptions()
        );

        /*
          Tombol sebelumnya/berikutnya dibuat di dalam HTML
          popup. Listener dipasang setiap popup terbuka supaya
          selalu mengarah ke halte/stasiun yang benar.
        */
        layer.on(
          "popupopen",
          () => {
            const popup =
              layer.getPopup();

            if (popup) {
              Object.assign(
                popup.options,
                getStopPopupOptions()
              );

              requestAnimationFrame(
                () => {
                  popup.update();
                }
              );
            }

            const popupElement =
              popup
                ?.getElement();

            if (!popupElement) {
              return;
            }

          }
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

function updateRouteDetailCardState() {
  const routeDetailCard =
    document.querySelector(
      ".route-detail-card"
    );

  if (!routeDetailCard) {
    return;
  }

  const isAllRoutes =
    String(
      routeSelect?.value ?? "ALL"
    ) === "ALL";

  routeDetailCard.classList.toggle(
    "is-overview",
    isAllRoutes
  );
}


function renderStopList(routeId) {
  const entries =
    getOperationalStopListEntries(
      routeId
    );

  const features =
    entries.map(
      entry =>
        entry.feature
    );

  if (!entries.length) {

    const hiddenOptionalCount =
      (
        !showProposedStops
          ? getProposedStopsForRoute(
              routeId
            ).length
          : 0
      )
      +
      (
        !showConceptualStops
          ? getConceptualStopsForRoute(
              routeId
            ).length
          : 0
      );

    stopListEl.innerHTML = `
      <div class="stop-list-empty">
        ${
          hiddenOptionalCount
            ? "Titik Usulan/Konseptual pada rute ini sedang disembunyikan."
            : "Belum ada halte / stasiun yang terhubung ke koridor ini."
        }
      </div>
    `;
    return;
  }

  const listHTML = entries
    .map(entry => {
      const feature =
        entry.feature;

      const p = feature.properties;

      const operationalState =
        entry.state;

      const isNotServed =
        operationalState ===
        "not-served";

      const isTemporaryServed =
        operationalState ===
        "temporary-served";

      const isTemporaryTerminus =
        Boolean(
          entry.temporaryTerminus
        );

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
        getOperationalStopRole(
          feature,
          routeId
        );

      const roleClass =
        getOperationalStopRoleClass(
          feature,
          routeId
        );

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
        isTemporaryServed &&
        !routeSeq
          ? `
            <span
              class="stop-seq-badge is-temporary"
              title="Halte tambahan selama pengalihan"
            >
              +
            </span>
          `
          : routeSeq
            ? `
              <span class="stop-seq-badge">
                ${escapeHTML(routeSeq)}
              </span>
            `
            : `
              <span
                class="stop-seq-badge is-missing"
                title="Sequence koridor ini belum diisi"
              >
                ?
              </span>
            `;

      const routeBadgeHTML =
        getOperationalStopListVisibleRoutes(
          feature,
          routeId
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
        isNotServed ||
        isTemporaryServed ||
        isTemporaryTerminus
      ) {
        rightBadges.push(`
          <span class="stop-operational-badge ${roleClass}">
            ${escapeHTML(role)}
          </span>
        `);
      }
      else if (
        role &&
        role.toLowerCase() !== "reguler" &&
        role.toLowerCase() !== "regular" &&
        role.toLowerCase() !== "normal"
      ) {
        rightBadges.push(`
          <span class="stop-role ${roleClass}">
            ${escapeHTML(role)}
          </span>
        `);
      }
      /*
        Status Eksisting tidak perlu diulang di setiap baris.
        Rencana / Usulan / Konseptual ditampilkan agar halte khusus langsung terbaca.
      */
      if (
        getStopStatus(feature)
          .toLowerCase() !== "existing"
      ) {
        rightBadges.push(`
          <span class="stop-status-badge ${getStopStatusClass(feature)}">
            ${escapeHTML(getStopStatusShort(feature))}
          </span>
        `);
      }

      return `
        <div
          class="
            stop-list-item
            ${isNotServed ? "is-operational-not-served" : ""}
            ${isTemporaryServed ? "is-operational-temporary" : ""}
            ${isTemporaryTerminus ? "is-operational-temp-terminus" : ""}
          "
          data-stop-key="${escapeHTML(stopKey)}"
          tabindex="0"
          role="button"
          ${isNotServed ? 'aria-label="Buka informasi halte yang sementara tidak dilayani"' : ""}
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

    <div class="stop-list-scroll">
      ${listHTML}
    </div>
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

      const oldFeature =
        getStopByKey(
          currentSelectedStopKey
        );

      oldMarker.setStyle(
        normalStopStyle(
          currentSelectedRouteId,
          oldFeature
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
      routeId,
      feature
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

    setTimeout(
      () => marker.openPopup(),
      380
    );

  } else {

    /*
      Navigasi antarhalte mempertahankan zoom saat ini.

      Berbeda dari versi sebelumnya yang langsung membuka
      popup lalu membiarkan autoPan bekerja, sekarang kamera
      melakukan satu pan halus terlebih dahulu ke titik tujuan.
      Popup baru dibuka setelah pergerakan selesai.

      Hasilnya:
      - tidak ada jump/patah-patah
      - tidak ada dua animasi beruntun
      - zoom tidak berubah
    */
    const targetLatLng =
      marker.getLatLng();

    const targetPoint =
      map.latLngToContainerPoint(
        targetLatLng
      );

    const mapSize =
      map.getSize();

    const centerPoint =
      L.point(
        mapSize.x / 2,
        mapSize.y / 2
      );

    const pixelDistance =
      targetPoint.distanceTo(
        centerPoint
      );

    const openTargetPopup = () => {
      marker.openPopup();
    };

    /*
      Kalau titik tujuan sudah dekat pusat layar, tidak perlu
      menggerakkan kamera lagi.
    */
    if (pixelDistance < 90) {

      openTargetPopup();

    } else {

      let popupOpened = false;

      const openOnce = () => {
        if (popupOpened) {
          return;
        }

        popupOpened = true;
        openTargetPopup();
      };

      map.once(
        "moveend",
        openOnce
      );

      map.panTo(
        targetLatLng,
        {
          animate: true,
          duration: 0.42,
          easeLinearity: 0.22
        }
      );

      /*
        Fallback jika browser tidak memicu moveend karena
        jarak pergeseran sangat kecil.
      */
      setTimeout(
        openOnce,
        520
      );
    }
  }

  const p = feature.properties;

  const direction =
    getDirectionLabel(
      getStopDirection(
        feature,
        routeId
      )
    );

  const operationalState =
    getOperationalStopState(
      feature,
      routeId
    );

  const role =
    getOperationalStopRole(
      feature,
      routeId
    );

  const selectedOperationalNotice =
    operationalState.state === "not-served"
      ? `
        <div class="selected-stop-operational-note is-not-served">
          <strong>Tidak dilayani sementara.</strong>
          ${escapeHTML(
            getOperationalRouteShortLabel(
              routeId
            )
          )}
          sementara tidak melayani titik ini selama
          pengalihan operasional.
        </div>
      `
      : operationalState.temporaryTerminus
        ? `
          <div class="selected-stop-operational-note is-temporary">
            <strong>Terminus sementara.</strong>
            Titik ini menjadi terminus sementara
            ${escapeHTML(
              getOperationalRouteShortLabel(
                routeId
              )
            )}.
          </div>
        `
        : operationalState.state === "temporary-served"
          ? `
            <div class="selected-stop-operational-note is-temporary">
              <strong>Pelayanan sementara.</strong>
              ${escapeHTML(
                getOperationalRouteShortLabel(
                  routeId
                )
              )}
              melayani titik ini selama pengalihan operasional.
            </div>
          `
          : "";

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
          : (
              operationalState.state ===
              "temporary-served"
                ? "Sementara"
                : "Belum diisi"
            )
        }
      </strong>
    </div>

    <div class="selected-stop-row">
      ${escapeHTML(
        selectedTerms.statusLabel
      )}:
      <strong class="selected-stop-status ${getStopStatusClass(feature)}">
        ${escapeHTML(getStopStatusLabel(feature))}
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
            <strong class="selected-stop-role ${getOperationalStopRoleClass(feature, routeId)}">
              ${escapeHTML(role)}
            </strong>
          </div>
        `
        : ""
    }

    ${selectedOperationalNotice}
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
   RIGHT INFO CARDS — EQUAL VERTICAL GAP
   ========================================================= */

/*
  Desktop:
    [Judul]
       8px
    [Cari Lokasi]
       8px
    [Legenda + bantuan]

  Posisi dihitung dari tinggi aktual kartu, bukan angka top
  yang diasumsikan. Jadi gap tetap sama saat:
  - browser zoom berubah
  - ukuran font berubah
  - judul membungkus menjadi dua baris
  - tinggi search berubah
*/
const RIGHT_CARD_GAP = 8;

function layoutDesktopRightCards() {
  const header =
    rightInfoPanel
      ?.querySelector(
        ".right-info-header"
      );

  const body =
    rightInfoPanel
      ?.querySelector(
        ".right-info-body"
      );

  if (
    !rightInfoPanel ||
    !header ||
    !body ||
    !globalSearchPanel
  ) {
    return;
  }

  /*
    Mobile memakai layout floating/bottom-sheet sendiri.
    Hapus inline desktop positioning agar CSS mobile kembali
    memegang kendali penuh.
  */
  if (isMobileLayout()) {
    globalSearchPanel.style
      .removeProperty("top");

    body.style
      .removeProperty("margin-top");

    return;
  }

  const headerRect =
    header.getBoundingClientRect();

  const searchTop =
    Math.round(
      headerRect.bottom +
      RIGHT_CARD_GAP
    );

  globalSearchPanel.style.setProperty(
    "top",
    `${searchTop}px`,
    "important"
  );

  /*
    Setelah posisi search diterapkan, ukur tinggi aktualnya.
    right-info-body masih berada setelah header dalam normal
    flow, jadi margin-top = tinggi search + 2 × gap.
  */
  requestAnimationFrame(
    () => {
      const searchHeight =
        globalSearchPanel
          .getBoundingClientRect()
          .height;

      body.style.setProperty(
        "margin-top",
        `${
          Math.round(
            searchHeight +
            RIGHT_CARD_GAP * 2
          )
        }px`,
        "important"
      );
    }
  );
}


/*
  ResizeObserver menjaga gap tetap sama jika tinggi kartu
  berubah tanpa resize viewport, misalnya karena font/layout.
*/
const rightCardResizeObserver =
  typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(
        () => {
          layoutDesktopRightCards();
        }
      )
    : null;

rightCardResizeObserver
  ?.observe(
    rightInfoPanel
      ?.querySelector(
        ".right-info-header"
      )
  );

rightCardResizeObserver
  ?.observe(
    globalSearchPanel
  );

requestAnimationFrame(
  () => {
    layoutDesktopRightCards();
  }
);


document
  .querySelectorAll(
    "details.legend-collapsible-section"
  )
  .forEach(
    details => {
      details.addEventListener(
        "toggle",
        () => {
          requestAnimationFrame(
            layoutDesktopRightCards
          );
        }
      );
    }
  );


/* =========================================================
   RESPONSIVE PANEL CONTROLS
   ========================================================= */

function setDesktopPanelCollapsed(
  side,
  collapsed
) {
  if (isMobileLayout()) {
    return;
  }

  /*
    Panel informasi kanan bersifat permanen.
    Hanya panel kontrol kiri yang dapat collapse.
  */
  if (side !== "left") {
    return;
  }

  const isLeft = true;

  const className =
    isLeft
      ? "left-panel-collapsed"
      : "right-panel-collapsed";

  document.body.classList.toggle(
    className,
    Boolean(collapsed)
  );

  if (isLeft) {
    if (leftPanelCollapse) {
      leftPanelCollapse.hidden =
        Boolean(collapsed);
    }

    if (leftPanelRestore) {
      leftPanelRestore.hidden =
        !Boolean(collapsed);
    }
  }
  /*
    Peta Leaflet sendiri memenuhi viewport sejak awal,
    tetapi invalidateSize + fit ulang membantu elemen
    interaktif dan route framing mengikuti ruang baru.
  */
  setTimeout(
    () => {
      map.invalidateSize();

      if (
        currentSelectedRouteId &&
        routeLayer &&
        routeLayer
          .getBounds()
          .isValid()
      ) {
        fitRouteToScreen({
          animate: false
        });
      }
    },
    240
  );
}


function setMobileInfoOpen(open) {
  if (!isMobileLayout()) {
    document.body
      .classList
      .remove(
        "mobile-info-open"
      );

    return;
  }

  document.body
    .classList
    .toggle(
      "mobile-info-open",
      Boolean(open)
    );

  if (open) {
    /*
      Hanya satu bottom sheet aktif.
    */
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

    mobileBottomRouteButton
      ?.setAttribute(
        "aria-expanded",
        "false"
      );

    setBasemapPanelOpen(
      false
    );
  }
}


function syncPanelModeAfterResize() {
  const isMobileNow =
    isMobileLayout();

  /*
    Resize biasa pada HP (misalnya keyboard virtual muncul)
    tidak boleh menutup bottom sheet. Reset hanya dilakukan
    bila benar-benar menyeberang breakpoint desktop/mobile.
  */
  if (
    isMobileNow ===
    lastResponsiveIsMobile
  ) {
    return;
  }

  lastResponsiveIsMobile =
    isMobileNow;

  document.body
    .classList
    .remove(
      "mobile-filter-open",
      "mobile-info-open"
    );

  mobileFilterToggle
    ?.setAttribute(
      "aria-expanded",
      "false"
    );

  setBasemapPanelOpen(
    false
  );
}


leftPanelCollapse
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      setDesktopPanelCollapsed(
        "left",
        true
      );
    }
  );


leftPanelRestore
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      setDesktopPanelCollapsed(
        "left",
        false
      );
    }
  );


mobileInfoClose
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      setMobileInfoOpen(
        false
      );
    }
  );


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

  mobileBottomRouteButton
    ?.setAttribute(
      "aria-expanded",
      String(
        Boolean(open)
      )
    );

  if (open) {
    setMobileInfoOpen(
      false
    );

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


mobileBottomRouteButton
  ?.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      setMobileFilterOpen(
        !document.body
          .classList
          .contains(
            "mobile-filter-open"
          )
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
        [18, 88],

      paddingBottomRight:
        [18, 74]
    };
  }

  /*
    Desktop:
    sisakan ruang di kiri untuk panel kontrol
    dan di kanan untuk panel informasi.
  */
  const panelRect =
    panelEl
      ?.getBoundingClientRect();

  const rightPanelRect =
    rightInfoPanel
      ?.getBoundingClientRect();

  const leftPanelVisible =
    panelRect &&
    !document.body
      .classList
      .contains(
        "left-panel-collapsed"
      );

  const rightPanelVisible =
    Boolean(
      rightPanelRect
    );

  const leftPadding =
    leftPanelVisible
      ? Math.max(
          40,
          Math.ceil(
            panelRect.right -
            (mapRect?.left ?? 0) +
            28
          )
        )
      : 45;

  const rightPadding =
    rightPanelVisible
      ? Math.max(
          55,
          Math.ceil(
            (mapRect?.right ?? window.innerWidth) -
            rightPanelRect.left +
            28
          )
        )
      : 55;

  return {
    paddingTopLeft:
      [leftPadding, 45],

    paddingBottomRight:
      [rightPadding, 85]
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
  routeId,
  resetOptionalStops = true
) {
  const feature =
    getRouteById(routeId);

  if (!feature) {
    return;
  }

  /*
    Default visibilitas titik Usulan/Konseptual mengikuti
    status rutenya.

    - Eksisting -> OFF
    - Rencana / Usulan / Konseptual -> ON

    Pemanggil khusus seperti hasil pencarian dapat memakai
    resetOptionalStops = false supaya kategori yang baru saja
    diaktifkan tidak ditimpa.
  */
  if (resetOptionalStops) {

    const routeStatus =
      normalizeStatus(
        feature.properties.STATUS
      );

    const showOptionalByDefault =
      routeStatus !== "Existing";

    showProposedStops =
      showOptionalByDefault;

    showConceptualStops =
      showOptionalByDefault;
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

      updateRouteDetailCardState();

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
    updateRouteDetailCardState();
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
        "mobile-filter-open",
        "mobile-info-open"
      );

    mobileFilterToggle
      ?.setAttribute(
        "aria-expanded",
        "false"
      );

    mobileBottomRouteButton
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
   NORTH ORIENTATION
   ========================================================= */

/*
  Leaflet standar selalu north-up dan tidak memiliki bearing.
  Bila kemudian WebGIS memakai plugin rotasi, fungsi ini sudah
  mendukung beberapa API bearing/rotation yang umum.
*/
function getMapBearing() {

  if (
    typeof map.getBearing ===
    "function"
  ) {
    return Number(
      map.getBearing()
    ) || 0;
  }

  if (
    typeof map.getRotationAngle ===
    "function"
  ) {
    return Number(
      map.getRotationAngle()
    ) || 0;
  }

  return 0;
}


function updateNorthArrow() {
  if (!northArrowGlyph) {
    return;
  }

  const bearing =
    getMapBearing();

  northArrowGlyph.style.transform =
    `rotate(${-bearing}deg)`;
}


function resetNorthOrientation() {
  let rotationHandled = false;

  if (
    typeof map.setBearing ===
    "function"
  ) {
    map.setBearing(0);
    rotationHandled = true;
  }
  else if (
    typeof map.setRotationAngle ===
    "function"
  ) {
    map.setRotationAngle(0);
    rotationHandled = true;
  }

  /*
    Pada Leaflet standar tidak ada rotasi untuk di-reset.
    Beri feedback visual agar tombol tetap terasa responsif.
  */
  northButton
    ?.classList
    .remove(
      "is-resetting"
    );

  requestAnimationFrame(
    () => {
      northButton
        ?.classList
        .add(
          "is-resetting"
        );

      setTimeout(
        () => {
          northButton
            ?.classList
            .remove(
              "is-resetting"
            );
        },
        320
      );
    }
  );

  updateNorthArrow();

  /*
    Invalidate hanya diperlukan sebagai refresh ringan pada
    Leaflet standar; tidak mengubah center maupun zoom.
  */
  if (!rotationHandled) {
    map.invalidateSize({
      pan: false
    });
  }
}


northButton
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      resetNorthOrientation();
    }
  );


map.on(
  "moveend zoomend rotate",
  updateNorthArrow
);

updateNorthArrow();


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
    /*
      Full Extent kembali ke pilihan ALL dalam moda/status
      yang sedang aktif. Jika mode masih Semua Moda,
      dropdown tetap hanya berisi Semua Lin/Koridor.
    */
    populateRouteDropdown();

    routeSelect.value = "ALL";

    showAllRoutes(true);

    updateRouteDetailCardState();

    if (isMobileLayout()) {
      setMobileFilterOpen(
        false
      );

      setMobileInfoOpen(
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

northButton
  ?.addEventListener(
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

      setMobileInfoOpen(
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
    statusSelect.value = "Existing";

    populateRouteDropdown();
    showAllRoutes(true);
    updateRouteDetailCardState();
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

    /*
      Informasi & Disclaimer dan Cara Menggunakan selalu
      muncul lagi pada setiap page load / reload / buka ulang
      tab. Tidak bergantung pada localStorage.
    */
    setTimeout(
      () => {
        startStartupExperience();
      },
      250
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

    syncPanelModeAfterResize();

    layoutDesktopRightCards();

    if (
      basemapPanel &&
      !basemapPanel.hidden
    ) {
      updateBasemapPanelState();
    }
  }
);
