/* =========================================================
   WEBGIS TRANSPORTASI UMUM JABODETABEK
   DATASET RUNTIME MULTIMODA:
   - data/brt_route.geojson   (wajib)
   - data/brt_stop.geojson    (wajib)
   - data/rail_route.geojson  (opsional / multimoda rel)
   - data/rail_stop.geojson   (opsional / multimoda rel)

   BRT tetap memakai schema v2.0 yang sudah ada.
   MRT, KRL, dan LRT dibaca dari dua dataset RAIL yang sama
   melalui adapter runtime. MODE / LINE_ID / OPERATOR / STATUS
   pada setiap feature menentukan jaringan yang ditampilkan.

   Field halte:
   ROUTES     = rute yang benar-benar melayani halte
   SEQ_MAP    = urutan halte per rute
   DIR_MAP    = arah khusus per rute
   INTEGRASI  = kode layanan/lin/operator integrasi
   INT_NM     = label titik integrasi; key boleh kode integrasi ATAU ID target
   INT_STOP   = STOP_ID/GEOM_ID target integrasi (opsional, disarankan)
   INT_STATUS = status hubungan integrasi

   Format integrasi yang direkomendasikan mulai v27:
     INTEGRASI = BRT
     INT_NM    = BRT073:Lebak Bulus
     INT_STOP  = BRT:BRT073

   Dengan format ini:
   - INTEGRASI menentukan jaringan/operator yang dituju.
   - INT_STOP memasangkan jaringan ke STOP_ID/GEOM_ID target.
   - INT_NM boleh memakai ID target sebagai key agar nama selalu
     melekat pada titik target, bukan pada operator.

   Format lama tetap kompatibel:
     INTEGRASI = BRT
     INT_NM    = BRT:Lebak Bulus
     INT_STOP  = BRT:BRT073

   Navigasi integrasi menggunakan urutan prioritas:
   1. INT_STOP (ID target; paling stabil)
   2. INT_NM keyed-by-target-ID
   3. INT_NM keyed-by-kode-integrasi (fallback legacy)
   4. nama feature target dari dataset yang dimuat

   Jika INTEGRASI terisi tetapi INT_NM/INT_STOP kosong,
   item tersebut tidak ditampilkan ke pengguna dan hanya
   dilaporkan oleh validator.

   ROUTE SOURCE METADATA
   SOURCE   = nama sumber / dokumen / institusi
   SRC_URL  = tautan sumber (opsional)
   SRC_NOTE = catatan sumber (opsional)

   SOURCE dan SRC_URL dapat berisi beberapa item
   yang dipisahkan dengan titik koma (;).

   INT_STATUS format:
   KODE:Nama=Status;KODE:Nama=Status

   Contoh:
   MRT_NS:Monumen Nasional=Rencana

   Jika INT_STATUS kosong / pasangan tidak ditemukan,
   integrasi dianggap Eksisting.
   ========================================================= */

const STOP_ZOOM = 18;

const APP_DEBUG = false;

function debugLog(...args) {
  if (APP_DEBUG) globalThis.console.log(...args);
}

function debugGroup(...args) {
  if (APP_DEBUG) globalThis.console.groupCollapsed(...args);
}

function debugGroupEnd() {
  if (APP_DEBUG) globalThis.console.groupEnd();
}


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

  /*
    Aset badge PDV belum tersedia dalam paket. Nilai kosong sengaja
    memakai fallback teks dan mencegah request 404 berulang.
  */
  LRT_JKT_PDV: "",
  LRT_JKT: "",
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
  position: "bottomleft",
  prefix: '<a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer">Leaflet</a>'
}).addTo(map);

/* =========================================================
   PANES
   ========================================================= */


map.createPane("routeHaloPane");
map.getPane("routeHaloPane").style.zIndex = 450;

map.createPane("routePane");
map.getPane("routePane").style.zIndex = 460;

/*
  Area klik garis rute dibuat sedikit lebih lebar daripada
  simbol visual agar rute/lin mudah dipilih tanpa mempertebal
  kartografi jaringan.
*/
map.createPane("routeClickPane");
map.getPane("routeClickPane").style.zIndex = 640;

/*
  Hit-area rute sengaja memakai SVG meskipun peta utama
  preferCanvas=true. Pointer event pada stroke SVG jauh lebih
  konsisten untuk garis transparan/lebar dibanding Canvas.
*/
const routeClickRenderer = L.svg({
  pane: "routeClickPane",
  padding: 0.5
});

map.createPane("stopPane");
map.getPane("stopPane").style.zIndex = 470;

/*
  Hit-area transparan diletakkan sedikit di atas marker visual.
  Tujuannya memperbesar area klik tanpa memperbesar simbol
  halte secara berlebihan.
*/
map.createPane("stopHitPane");

/*
  stopHitPane tetap dipakai untuk overlay visual non-interaktif,
  misalnya angka pada marker Terminus.
*/
map.getPane("stopHitPane").style.zIndex = 525;


/*
  Pane khusus area klik halte.

  Dibuat DI ATAS tooltip Leaflet agar label nama halte tidak
  dapat menghalangi klik, tetapi tetap DI BAWAH popup Leaflet.
  Default tooltipPane Leaflet ≈ 650 dan popupPane ≈ 700.
*/
map.createPane("stopClickPane");
map.getPane("stopClickPane").style.zIndex = 680;


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
    attribution:
      'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>, and the GIS user community'
  }
);

const osm = L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxNativeZoom: 19,
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
  }
);

const satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 20,
    attribution:
      "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community"
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
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxNativeZoom: 19,
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
const constructionStatusOption = document.getElementById("constructionStatusOption");
const constructionLegendItem = document.getElementById("constructionLegendItem");
const routeSelect = document.getElementById("routeSelect");
const routeSelectLabel = document.getElementById("routeSelectLabel");

const routeCompareControl =
  document.getElementById(
    "routeCompareControl"
  );

const routeCompareAdd =
  document.getElementById(
    "routeCompareAdd"
  );

const routeComparePicker =
  document.getElementById(
    "routeComparePicker"
  );

const comparisonRouteSelect =
  document.getElementById(
    "comparisonRouteSelect"
  );

const routeCompareClear =
  document.getElementById(
    "routeCompareClear"
  );

const routeCompareInlineSwatch =
  document.getElementById(
    "routeCompareInlineSwatch"
  );

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

const poiSearchSubmit =
  document.getElementById(
    "poiSearchSubmit"
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

const globalSearchSubmit =
  document.getElementById(
    "globalSearchSubmit"
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


const routePlanIntroEl =
  document.getElementById(
    "routePlanIntro"
  );

const routePlanIntroCloseEl =
  document.getElementById(
    "routePlanIntroClose"
  );

const routePlanIntroTitleEl =
  document.getElementById(
    "routePlanIntroTitle"
  );

const routePlanIntroTextEl =
  document.getElementById(
    "routePlanIntroText"
  );

const routePlanIntroExtraEl =
  document.getElementById(
    "routePlanIntroExtra"
  );

const routePlanIntroSourceEl =
  document.getElementById(
    "routePlanIntroSource"
  );

const routePlanIntroDismissEl =
  document.getElementById(
    "routePlanIntroDismiss"
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

const routeDetailCard =
  document.getElementById(
    "routeDetailCard"
  );

const routeDetailToggle =
  document.getElementById(
    "routeDetailToggle"
  );

const routeDetailBody =
  document.getElementById(
    "routeDetailBody"
  );

const basemapButton = document.getElementById("basemapButton");
const basemapPanel = document.getElementById("basemapPanel");
const basemapClose = document.getElementById("basemapClose");
const currentBasemapThumb = document.getElementById("currentBasemapThumb");
const basemapOptions = document.querySelectorAll(".basemap-option");
const opacityButtons = document.querySelectorAll(".opacity-grid button");
const basemapCarousel = document.getElementById("basemapCarousel");

const legendPanel = document.getElementById("legendPanel");
const operationalLegendSection =
  document.getElementById(
    "operationalLegendSection"
  );

const structureLegendSection =
  document.getElementById(
    "structureLegendSection"
  );

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
   BRT_STOP SCHEMA v2.0 — FINAL 31 FIELDS
   ========================================================= */

const BRT_STOP_SCHEMA_V20_FIELDS = [
  "STOP_ID",
  "GEOM_ID",
  "STOP_GROUP",
  "STOP_NAME",
  "DISPLAY_NM",
  "MODE",
  "STATUS",
  "STOP_ROLE",
  "STOP_VAR",
  "PAID_LINK",
  "LINK_TYPE",
  "ROUTES",
  "DIR_MAP",
  "ACT_MAP",
  "OPS_MAP",
  "SEQ_MAP",
  "DIV_SEQ",
  "DIV_ID",
  "REPLACES_ID",
  "VALID_FR",
  "VALID_TO",
  "INTEGRASI",
  "INT_NM",
  "INT_STOP",
  "INT_STATUS",
  "SOURCE",
  "SRC_URL",
  "SRC_NOTE",
  "REMARK",
  "SEQ_A_MAP",
  "SEQ_B_MAP"
];


const BRT_STOP_SCHEMA_V20_DEFAULTS = {
  MODE: "BRT",
  STATUS: "Eksisting",
  STOP_ROLE: "Regular",
  STOP_VAR: "BASE",
  PAID_LINK: "NA",
  LINK_TYPE: "NONE",
  INT_STATUS: "NONE"
};


const BRT_STOP_SCHEMA_V20_DOMAINS = {
  MODE: [
    "BRT"
  ],

  STATUS: [
    "Eksisting",
    "Rencana",
    "Usulan",
    "Gagasan",
    "Nonaktif"
  ],

  STOP_ROLE: [
    "Regular",
    "Transit",
    "Terminus",
    "Transit-Terminus"
  ],

  STOP_VAR: [
    "BASE",
    "TEMPORARY"
  ],

  PAID_LINK: [
    "YES",
    "NO",
    "NA",
    "UNKNOWN"
  ],

  LINK_TYPE: [
    "CONCOURSE",
    "BRIDGE",
    "UNDERPASS",
    "CROSSING",
    "NONE",
    "UNKNOWN"
  ],

  INT_STATUS: [
    "INTEGRATED",
    "CONNECTION",
    "NONE",
    "UNKNOWN"
  ]
};


function getStopSchemaV20MissingFields(
  feature
) {
  const p =
    feature?.properties ?? {};

  return BRT_STOP_SCHEMA_V20_FIELDS
    .filter(
      field =>
        !Object.prototype
          .hasOwnProperty.call(
            p,
            field
          )
    );
}


function getStopSchemaV20DomainIssues(
  feature
) {
  const p =
    feature?.properties ?? {};

  const issues = [];

  Object.entries(
    BRT_STOP_SCHEMA_V20_DOMAINS
  )
    .forEach(
      ([field, allowed]) => {
        const raw =
          cleanText(
            p[field]
          );

        if (!raw) {
          return;
        }

        /*
          Backward compatibility selama migrasi:
          - STOP_ROLE route-specific: BRT_01:Transit;...
          - INT_STATUS legacy: KODE:Nama=Status
        */
        if (
          field === "STOP_ROLE" &&
          raw.includes(":")
        ) {
          return;
        }

        if (
          field === "INT_STATUS" &&
          raw.includes("=")
        ) {
          return;
        }

        let comparable =
          raw;

        if (field === "STATUS") {
          comparable =
            getStatusLabel(
              normalizeStatus(
                raw
              )
            );
        }
        else if (
          field === "STOP_ROLE"
        ) {
          comparable =
            normalizeStopRole(
              raw
            );
        }
        else if (
          field === "STOP_VAR"
        ) {
          comparable =
            normalizeStopVariant(
              raw
            );
        }
        else {
          comparable =
            raw.toUpperCase();
        }

        const accepted =
          (
            field === "STATUS" ||
            field === "STOP_ROLE"
          )
            ? allowed
            : allowed.map(
                value =>
                  value.toUpperCase()
              );

        if (
          !accepted.includes(
            comparable
          )
        ) {
          issues.push({
            field,
            value: raw,
            allowed
          });
        }
      }
    );

  return issues;
}


/* =========================================================
   DATA / STATE
   ========================================================= */

const ROUTE_DETAIL_COLLAPSED_STORAGE_KEY =
  "webgis_route_detail_collapsed";

let routeData = null;
let stopData = null;

let routeHaloLayer = null;
let routeLayer = null;
let routeClickLayer = null;
let routeStructureLayer = null;
let stopLayer = null;
let stopHitLayer = null;

/*

/*
  Untuk koridor yang sedang mengalami pengalihan:
  false = hanya kondisi operasional/pengalihan
  true  = tampilkan juga trase reguler sebagai pembanding
*/
let showRegularRouteComparison = false;

let currentSelectedRouteId = null;
let currentSelectedStopKey = null;

/* =========================================================
   ROUTE DIRECTION — A / B
   =========================================================

   State arah hanya memengaruhi representasi halte/stasiun.
   Geometry rute tidak digambar ulang ketika arah berubah.
*/
const routeDirectionById = new Map();

/*
  Cache ringan khusus logika arah.
  Tujuan: menghindari parsing DIR_MAP / SEQ_A_MAP / SEQ_B_MAP
  dan pengelompokan stop yang sama berulang kali saat popup,
  daftar, marker, summary, dan Previous/Next dirender.
*/
const directionFieldMapCache = new WeakMap();
const routeDirectionStaticCache = new Map();
const operationalStopEntriesCache = new Map();
const logicalOperationalStopEntriesCache = new Map();

function getCachedDirectionFieldMap(feature, cacheKey, rawValue) {
  if (!feature || typeof feature !== "object") {
    return parseRouteMap(rawValue);
  }

  let featureCache = directionFieldMapCache.get(feature);

  if (!featureCache) {
    featureCache = new Map();
    directionFieldMapCache.set(feature, featureCache);
  }

  const raw = String(rawValue ?? "");
  const existing = featureCache.get(cacheKey);

  if (existing?.raw === raw) {
    return existing.map;
  }

  const parsed = parseRouteMap(raw);
  featureCache.set(cacheKey, { raw, map: parsed });
  return parsed;
}

function getRouteDirectionRuntimeCacheKey(routeId) {
  const routeKey = String(routeId ?? "");
  const side = isRouteDirectionEnabled(routeKey)
    ? getActiveRouteDirection(routeKey)
    : "-";

  const divId = getActiveRouteDivId(routeKey) || "-";

  /*
    Validity date bisa berubah ketika halaman dibiarkan terbuka
    lama. Stamp per menit menjaga cache tetap ringan tanpa membuat
    kondisi operasional menjadi stale.
  */
  const minuteStamp = Math.floor(Date.now() / 60000);

  return [
    routeKey,
    side,
    showProposedStops ? "P1" : "P0",
    showConceptualStops ? "C1" : "C0",
    `S:${normalizeStatus(statusSelect?.value || "ALL")}`,
    divId,
    minuteStamp
  ].join("|");
}

function clearDirectionRuntimeCaches() {
  operationalStopEntriesCache.clear();
  logicalOperationalStopEntriesCache.clear();
}

/*
  Jika popup halte ditutup, label halte tersebut ikut
  disembunyikan sampai user memilih halte lagi / mengganti rute.
*/
let dismissedStopLogicalKey = "";

/*
  MULTI-ROUTE COMPARE
  -------------------
  Maksimal dua rute:
  - currentSelectedRouteId = rute utama
  - comparisonRouteId      = rute pembanding

  Rute utama tetap menjadi sumber:
  - route info
  - stop list
  - stop markers
  - operational controls

  Rute pembanding hanya ditampilkan sebagai trase tambahan
  agar UI tidak menjadi ambigu.
*/
let comparisonRouteId = null;

/*
  Halte/stasiun Usulan dan Gagasan bersifat opsional.

  Default ketika koridor/lin dipilih:
  - Rute Eksisting  -> Usulan OFF, Gagasan OFF
  - Rute non-Eksisting (Rencana/Usulan/Gagasan)
                    -> Usulan ON, Gagasan ON

  Dengan demikian koridor yang berstatus Rencana seperti
  Koridor 15–19 langsung menampilkan titik pengembangannya.
*/
let showProposedStops = false;
let showConceptualStops = false;

/*
  Satu kontrol UI mengatur seluruh titik non-eksisting.
  Variabel lama tetap dipakai oleh filter internal supaya
  logika status Usulan/Gagasan yang sudah ada tetap stabil.
*/
function setNonExistingStopsVisible(visible) {
  const nextValue = Boolean(visible);
  showProposedStops = nextValue;
  showConceptualStops = nextValue;
}

function areNonExistingStopsVisible() {
  return showProposedStops && showConceptualStops;
}

const stopMarkerByKey = new Map();

let gpsWatchId = null;
let gpsMarker = null;
let gpsAccuracyCircle = null;
let lastGpsLocation = null;

let poiMarker = null;
let poiSearchAbortController = null;

let globalSearchAbortController = null;
let globalSearchLocalResults = [];
let globalSearchRouteResults = [];
let globalSearchPoiResults = [];
let globalSearchPoiLoading = false;

/*
  Nominatim publik hanya dipanggil setelah tindakan eksplisit user.
  Seluruh komponen pencarian berbagi satu limiter dan cache agar total
  aplikasi tetap berada di bawah satu request per detik.
*/
const NOMINATIM_ENDPOINT =
  "https://nominatim.openstreetmap.org/search";
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const NOMINATIM_CACHE_LIMIT = 100;
const nominatimResponseCache = new Map();
let nominatimLastRequestAt = 0;
let nominatimRequestQueue = Promise.resolve();

let suppressUrlStateSync = false;

let lastFocusedBeforeInfoModal = null;

/*
  Startup experience selalu dijalankan setiap page load:
  Informasi & Catatan -> Cara Menggunakan.

  Nilai localStorage lama tetap dipertahankan untuk
  kompatibilitas, tetapi tidak lagi dipakai untuk menentukan
  apakah startup popup/tour muncul.
*/
let startupExperienceActive = false;
let startupTourTimerId = null;

/*
  Route intro BRT 15–19 hanya diingat selama page load aktif.
  Reload / buka ulang tab akan mengosongkan Set ini.
*/
const shownRoutePlanIntros =
  new Set();

let activeRoutePlanIntroRouteId =
  null;

let routePlanIntroTimerId =
  null;

const DISCLAIMER_STORAGE_KEY =
  "webgisTransportDisclaimerAcceptedV1";

const PRODUCT_TOUR_STORAGE_KEY =
  "webgisTransportProductTourCompletedV1";

let productTourIndex = 0;
let productTourPreviousLeftCollapsed = false;
let productTourManual = false;

/*
  Demo tutorial Tip 2–3 memakai titik Monumen Nasional yang
  sebenarnya dari brt_stop.geojson, tetapi tidak mengubah
  filter/rute user.

  State ini hanya hidup selama product tour.
*/
let productTourInitialMapView = null;
let productTourDemoStopFeature = null;
let productTourDemoMarker = null;
let productTourDemoPulse = null;
let productTourDemoTimerId = null;
let productTourDemoPulseAnimationId = null;

/*
  Tip 2 memakai dua fokus berurutan pada desktop:
  1) titik + nama halte di peta
  2) baris halte/stasiun pada daftar kiri

  Demo daftar hanya disisipkan ketika startup masih berada
  pada tampilan Semua Lin/Koridor (stopList memang kosong).
  Jika user membuka tutorial secara manual saat suatu rute
  aktif, daftar asli dipakai tanpa ditimpa.
*/
let productTourStopHighlightPhase = "map";
let productTourStopHighlightTimerId = null;
let productTourInjectedListDemo = false;

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

function buildStackedStopLabel(name) {
  const text = cleanText(name);

  if (!text) {
    return {
      html: "",
      isStacked: false
    };
  }

  const words = text
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= 1 || text.length <= 20) {
    return {
      html: escapeHTML(text),
      isStacked: false
    };
  }

  /*
    Maksimal dua baris. Titik pecah dicari pada spasi yang
    menghasilkan dua bagian paling seimbang, sehingga label
    panjang tetap ringkas tanpa menjadi tiga baris.
  */
  let bestSplitIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (
    let splitIndex = 1;
    splitIndex < words.length;
    splitIndex += 1
  ) {
    const firstLine =
      words.slice(0, splitIndex).join(" ");

    const secondLine =
      words.slice(splitIndex).join(" ");

    const longestLine = Math.max(
      firstLine.length,
      secondLine.length
    );

    const imbalance = Math.abs(
      firstLine.length - secondLine.length
    );

    const veryShortPenalty =
      Math.min(firstLine.length, secondLine.length) < 5
        ? 8
        : 0;

    const score =
      longestLine
      + (imbalance * 0.35)
      + veryShortPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestSplitIndex = splitIndex;
    }
  }

  const lines = [
    words
      .slice(0, bestSplitIndex)
      .join(" "),
    words
      .slice(bestSplitIndex)
      .join(" ")
  ];

  return {
    html: lines
      .map(
        (item, index) =>
          `<span class="stop-label-line stop-label-line-${index + 1}">${escapeHTML(item)}</span>`
      )
      .join(""),
    isStacked: true
  };
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
    Construction
    Planned
    Proposed
    Conceptual

    Alias lama tetap didukung agar file lama tidak langsung rusak.
  */
  const aliases = {
    "Eksisting": "Existing",
    "Existing": "Existing",

    "Dalam Pembangunan": "Construction",
    "Construction": "Construction",
    "Under Construction": "Construction",
    "Konstruksi": "Construction",
    "Sedang Dibangun": "Construction",

    "Rencana": "Planned",
    "Rencana Resmi": "Planned",
    "Planned": "Planned",

    "Proposed": "Proposed",
    "Proposal": "Proposed",
    "Usulan": "Proposed",
    "Usulan Studi": "Proposed",
    "Usulan Institusional": "Proposed",

    "Conceptual": "Conceptual",
    "Gagasan": "Conceptual",
    "Konseptual": "Conceptual",
    "Konsep": "Conceptual",
    "Usulan Personal": "Conceptual",
    "Usulan Konseptual": "Conceptual",

    "Inactive": "Inactive",
    "Nonaktif": "Inactive",
    "Non Aktif": "Inactive"
  };

  return aliases[text] ?? text;
}


/*
  Label status yang ditampilkan kepada pengguna.
  Nilai internal tetap memakai:
  Existing / Construction / Planned / Proposed / Conceptual
  supaya filtering dan styling stabil.

  GeoJSON boleh memakai nilai Inggris maupun Indonesia.
*/
function getStatusLabel(value) {
  const status =
    normalizeStatus(value);

  const labels = {
    Existing: "Eksisting",
    Construction: "Dalam Pembangunan",
    Planned: "Rencana",
    Proposed: "Usulan",
    Conceptual: "Gagasan",
    Inactive: "Nonaktif"
  };

  return labels[status] ?? status;
}

function isConstructionStatusAllowedForMode(mode) {
  const normalizedMode = normalizeMode(mode);
  return normalizedMode !== "BRT";
}

function updateStatusAvailabilityForMode({ coerce = true } = {}) {
  if (!statusSelect || !constructionStatusOption) {
    return;
  }

  const mode = normalizeMode(modeSelect?.value || "ALL");
  const constructionAllowed =
    mode === "ALL" || isConstructionStatusAllowedForMode(mode);

  constructionStatusOption.hidden = !constructionAllowed;
  constructionStatusOption.disabled = !constructionAllowed;

  if (constructionLegendItem) {
    constructionLegendItem.hidden = !constructionAllowed;
  }

  if (
    coerce &&
    !constructionAllowed &&
    statusSelect.value === "Construction"
  ) {
    statusSelect.value = "Existing";
  }
}

function getRouteFeaturesForCurrentStatus(routeId) {
  const features = getRouteFeaturesById(routeId);
  const selectedStatus = normalizeStatus(statusSelect?.value || "ALL");

  if (!selectedStatus || selectedStatus === "ALL") {
    return features.filter(feature =>
      normalizeStatus(feature?.properties?.STATUS) !== "Construction" ||
      isConstructionStatusAllowedForMode(getRouteMode(feature))
    );
  }

  return features.filter(feature => {
    const mode = getRouteMode(feature);
    const status = normalizeStatus(feature?.properties?.STATUS);

    if (status === "Construction" && !isConstructionStatusAllowedForMode(mode)) {
      return false;
    }

    return status === selectedStatus;
  });
}

function getRouteStatusSummary(routeId) {
  const selectedStatus = normalizeStatus(statusSelect?.value || "ALL");

  if (selectedStatus && selectedStatus !== "ALL") {
    return getStatusLabel(selectedStatus);
  }

  const order = {
    Existing: 10,
    Construction: 20,
    Planned: 30,
    Proposed: 40,
    Conceptual: 50,
    Inactive: 60
  };

  const statuses = Array.from(
    new Set(
      getRouteFeaturesById(routeId)
        .filter(feature =>
          normalizeStatus(feature?.properties?.STATUS) !== "Construction" ||
          isConstructionStatusAllowedForMode(getRouteMode(feature))
        )
        .map(feature => normalizeStatus(feature?.properties?.STATUS))
        .filter(Boolean)
    )
  );

  return statuses
    .sort((a, b) => (order[a] ?? 999) - (order[b] ?? 999))
    .map(getStatusLabel)
    .join(" · ");
}


function featureCollection(features) {
  return {
    type: "FeatureCollection",
    features
  };
}


/* =========================================================
   MULTIMODAL DATA ADAPTER — RAIL
   =========================================================

   Tujuan:
   - BRT tetap memakai schema v2.0 tanpa perubahan sumber.
   - MRT, KRL, dan LRT memakai schema rail yang seragam:
       LINE_ID, LINE_NAME, MODE, OPERATOR, STATUS, STRUCTURE.
   - Semua moda rel boleh berada dalam rail_route.geojson dan
     rail_stop.geojson yang sama.
   - Adapter hanya menambah alias pada objek runtime.
   - GeoJSON asli tidak diubah / ditulis ulang.
*/

function normalizeDelimitedIds(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => cleanText(item))
      .filter(Boolean)
      .join(";");
  }

  return String(value ?? "")
    .replace(/\s*,\s*/g, ";")
    .split(";")
    .map(item => item.trim())
    .filter(Boolean)
    .join(";");
}

function normalizeStructure(value) {
  const raw = cleanText(value)
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    ELEVATED: "ELEVATED",
    LAYANG: "ELEVATED",
    VIADUCT: "ELEVATED",

    UNDERGROUND: "UNDERGROUND",
    SUBWAY: "UNDERGROUND",
    TUNNEL: "UNDERGROUND",
    TUNNELLED: "UNDERGROUND",
    BAWAH_TANAH: "UNDERGROUND",

    TRANSITION: "TRANSITION",
    TRANSISI: "TRANSITION",
    RAMP: "TRANSITION",
    PORTAL_TRANSITION: "TRANSITION",

    AT_GRADE: "AT_GRADE",
    ATGRADE: "AT_GRADE",
    PERMUKAAN: "AT_GRADE",
    GROUND: "AT_GRADE",

    MIXED: "MIXED",
    CAMPURAN: "MIXED",
    UNKNOWN: "UNKNOWN",
    TIDAK_DIKETAHUI: "UNKNOWN"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function getStructureLabel(value) {
  const structure = normalizeStructure(value);

  const labels = {
    ELEVATED: "Layang",
    TRANSITION: "Transisi",
    UNDERGROUND: "Bawah tanah",
    AT_GRADE: "Permukaan",
    MIXED: "Campuran",
    UNKNOWN: "Tidak diketahui"
  };

  return labels[structure] || cleanText(value) || "Tidak diketahui";
}


function getRouteStructureSummary(routeId) {
  const structures = Array.from(
    new Set(
      getRouteFeaturesForCurrentStatus(routeId)
        .map(feature =>
          normalizeStructure(
            feature?.properties?.STRUCTURE
          )
        )
        .filter(value => value && value !== "UNKNOWN")
    )
  );

  const order = {
    ELEVATED: 10,
    TRANSITION: 20,
    UNDERGROUND: 30,
    AT_GRADE: 40,
    MIXED: 50
  };

  return structures
    .sort((a, b) => (order[a] ?? 999) - (order[b] ?? 999))
    .map(getStructureLabel)
    .join(" · ");
}

function getDefaultModeColor(mode) {
  const normalized = normalizeMode(mode);

  if (normalized === "MRT") {
    return "#ca2047";
  }

  return "#555555";
}

function getDefaultOperator(mode) {
  const normalized = normalizeMode(mode);

  if (normalized === "MRT") {
    return "MRT Jakarta";
  }

  if (normalized === "KRL") {
    return "KAI Commuter";
  }

  /*
    LRT tidak diberi default karena operatornya bisa LRT Jakarta
    atau LRT Jabodebek. Isi OPERATOR secara eksplisit di GeoJSON.
  */
  return "";
}

function adaptRouteFeatureForRuntime(feature, datasetKey = "") {
  const original = feature?.properties ?? {};
  const p = { ...original };

  const mode = normalizeMode(
    p.MODE || ""
  );

  const routeId = cleanText(
    p.ID ??
    p.ROUTE_ID ??
    p.LINE_ID ??
    ""
  );

  const name = cleanText(
    p.NAME ??
    p.LINE_NAME ??
    p.ROUTE_NAME ??
    ""
  );

  const structure = normalizeStructure(
    p.STRUCTURE ??
    p.ALIGNMENT ??
    "UNKNOWN"
  );

  return {
    ...feature,
    properties: {
      ...p,
      ID: routeId,
      ROUTE_ID: cleanText(p.ROUTE_ID) || routeId,
      LINE_ID: cleanText(p.LINE_ID) || routeId,
      NAME: name,
      LINE_NAME: cleanText(p.LINE_NAME) || name,
      MODE: mode,
      OPERATOR: cleanText(p.OPERATOR) || getDefaultOperator(mode),
      STATUS: cleanText(p.STATUS) || "Eksisting",
      COLOR: cleanText(p.COLOR) || getDefaultModeColor(mode),
      STRUCTURE: structure,
      _DATASET: String(datasetKey || mode || "UNKNOWN").toUpperCase()
    }
  };
}

function adaptStopFeatureForRuntime(feature, datasetKey = "") {
  const original = feature?.properties ?? {};
  const p = { ...original };

  const mode = normalizeMode(
    p.MODE || ""
  );

  const routes = normalizeDelimitedIds(
    p.ROUTES ??
    p.LINES ??
    p.LINE_ID ??
    ""
  );

  const routeIds = splitIds(routes);

  let seqMap = cleanText(
    p.SEQ_MAP ??
    p.ROUTE_SEQ ??
    ""
  );

  if (!seqMap && routeIds.length === 1) {
    const rawSeq = cleanText(
      p.SEQ ??
      p.SEQUENCE ??
      p.STOP_SEQ ??
      ""
    );

    if (rawSeq) {
      seqMap = `${routeIds[0]}:${rawSeq}`;
    }
  }

  const stopName = cleanText(
    p.STOP_NAME ??
    p.NAME ??
    p.STATION_NAME ??
    ""
  );

  const stopId = cleanText(
    p.STOP_ID ??
    p.STATION_ID ??
    p.ID ??
    ""
  );

  const geomId = cleanText(
    p.GEOM_ID ??
    p.GEOMETRY_ID ??
    stopId
  );

  return {
    ...feature,
    properties: {
      ...p,
      STOP_ID: stopId,
      GEOM_ID: geomId,
      STOP_NAME: stopName,
      DISPLAY_NM: cleanText(p.DISPLAY_NM) || stopName,
      MODE: mode,
      OPERATOR: cleanText(p.OPERATOR) || getDefaultOperator(mode),
      STATUS: cleanText(p.STATUS) || "Eksisting",
      STRUCTURE: normalizeStructure(
        p.STRUCTURE ??
        "UNKNOWN"
      ),
      ROUTES: routes,
      LINES: normalizeDelimitedIds(p.LINES ?? routes),
      SEQ_MAP: seqMap,
      _DATASET: String(datasetKey || mode || "UNKNOWN").toUpperCase()
    }
  };
}

function adaptFeatureCollectionForRuntime(
  collection,
  {
    type = "route",
    datasetKey = ""
  } = {}
) {
  const features = Array.isArray(collection?.features)
    ? collection.features
    : [];

  return featureCollection(
    features.map(feature =>
      type === "stop"
        ? adaptStopFeatureForRuntime(feature, datasetKey)
        : adaptRouteFeatureForRuntime(feature, datasetKey)
    )
  );
}

function mergeFeatureCollections(...collections) {
  return featureCollection(
    collections.flatMap(collection =>
      Array.isArray(collection?.features)
        ? collection.features
        : []
    )
  );
}

/*
  STOP_ROLE rail sepenuhnya attribute-driven.

  Penting untuk dataset parsial/testing:
  sequence terbesar yang sedang tersedia TIDAK boleh otomatis
  dianggap terminus. Karena itu tidak ada inferensi endpoint rail
  pada runtime. Bila suatu stasiun merupakan terminus, isi
  STOP_ROLE = Terminus / Transit-Terminus pada GeoJSON.
*/
function applyRailStopRolePolicy() {
  return;
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

/*
  =========================================================
  OPERATIONAL FIELD HELPERS
  =========================================================

  OPS_MAP
    ROUTE_ID:STATUS;ROUTE_ID:STATUS

  Nilai:
    NOT_SERVED
    TEMP_SERVED
    TEMP_TERMINUS

  DIV_SEQ
    ROUTE_ID:SEQUENCE

  OPS_MAP / DIV_SEQ bersifat override untuk kondisi
  pengalihan. Jika kosong, logic lama tetap berlaku.
*/

function normalizeOperationalStopCode(
  value
) {
  const code =
    cleanText(value)
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  const aliases = {
    NOT_SERVED: "NOT_SERVED",
    NOTSERVED: "NOT_SERVED",
    TIDAK_DILAYANI: "NOT_SERVED",

    TEMP_SERVED: "TEMP_SERVED",
    TEMPORARY_SERVED: "TEMP_SERVED",
    SEMENTARA: "TEMP_SERVED",

    TEMP_TERMINUS: "TEMP_TERMINUS",
    TEMPORARY_TERMINUS: "TEMP_TERMINUS",
    TERMINUS_SEMENTARA: "TEMP_TERMINUS"
  };

  return aliases[code] || "";
}


function getOperationalMapValue(
  feature,
  routeId
) {
  const raw =
    feature
      ?.properties
      ?.OPS_MAP;

  if (!hasText(raw)) {
    return "";
  }

  const map =
    parseRouteMap(
      raw
    );

  return normalizeOperationalStopCode(
    map[
      String(routeId ?? "")
    ]
  );
}


function getDiversionSequenceRaw(
  feature,
  routeId
) {
  const raw =
    feature
      ?.properties
      ?.DIV_SEQ;

  if (!hasText(raw)) {
    return "";
  }

  const map =
    parseRouteMap(
      raw
    );

  return String(
    map[
      String(routeId ?? "")
    ]
    ?? ""
  ).trim();
}


/* =========================================================
   ROUTE HELPERS
   ========================================================= */

function getRouteId(feature) {
  const p = feature?.properties ?? {};

  return String(
    p.ID ??
    p.ROUTE_ID ??
    p.LINE_ID ??
    ""
  ).trim();
}

function getRouteHeaderLabel(feature) {
  return getRouteMode(feature) === "BRT"
    ? "KORIDOR"
    : "LIN";
}


/*
  Header kartu detail mengikuti konteks moda.
  Label kecil di dalam routeInfo tidak lagi diperlukan karena
  header kartu sudah menyatakan KORIDOR / LIN.
*/
function getRouteDetailSectionLabel() {
  const selectedRoute =
    currentSelectedRouteId
      ? getRouteById(currentSelectedRouteId)
      : null;

  const mode = selectedRoute
    ? getRouteMode(selectedRoute)
    : normalizeMode(modeSelect?.value);

  if (mode === "BRT") {
    return "Koridor";
  }

  if (["MRT", "LRT", "KRL"].includes(mode)) {
    return "Lin";
  }

  return "Lin / Koridor";
}


function updateRouteDetailToggleTerminology() {
  if (!routeDetailToggle) {
    return;
  }

  const sectionLabel =
    getRouteDetailSectionLabel();

  const labelEl =
    routeDetailToggle.querySelector(
      ".route-detail-toggle-label"
    );

  if (labelEl) {
    labelEl.textContent = sectionLabel;
  }

  const isCollapsed =
    routeDetailCard?.classList?.contains(
      "is-collapsed"
    );

  const action = isCollapsed
    ? "Tampilkan"
    : "Sembunyikan";

  const accessibleLabel =
    `${action} bagian ${sectionLabel.toLowerCase()}`;

  routeDetailToggle.setAttribute(
    "title",
    accessibleLabel
  );

  routeDetailToggle.setAttribute(
    "aria-label",
    accessibleLabel
  );
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

const ROUTE_DISPLAY_NAME_OVERRIDES = {
  BRT_17: "Kota - Tanjung Priok"
};


function getRouteDisplayName(feature) {
  const routeId =
    getRouteId(feature);

  return (
    ROUTE_DISPLAY_NAME_OVERRIDES[
      String(routeId ?? "")
    ]
    ||
    cleanText(
      feature?.properties?.NAME ??
      feature?.properties?.LINE_NAME ??
      feature?.properties?.ROUTE_NAME
    )
    ||
    ""
  );
}


function getRouteRelation(feature) {
  const p = feature?.properties ?? {};

  return cleanText(
    p.RELATION ??
    p.RELASI ??
    p.ROUTE_REL ??
    p.RELATION_NM ??
    p.RELASI_NM
  );
}


function normalizeRouteNameForDisplay(value) {
  return cleanText(value)
    .replace(/\s*[–—-]\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}


/*
  RELASI EFEKTIF UNTUK MODA REL
  =========================================================

  Satu LINE_ID dapat terdiri atas beberapa tahap/status, misalnya:
    MRT_NS Existing      : Lebak Bulus - Bundaran HI
    MRT_NS Construction  : Bundaran HI - Kota

  Saat satu status dipilih, relasi mengikuti feature pada status itu.
  Saat beberapa status tampil bersamaan (Status = ALL), relasi yang
  saling tersambung digabung menjadi ujung-ke-ujung:
    Lebak Bulus - Bundaran HI
    Bundaran HI - Kota
    => Lebak Bulus - Kota

  RELATION tetap menjadi metadata eksplisit pada rail_route.geojson.
  Jika RELATION belum tersedia, script memakai stasiun pertama/terakhir
  yang sedang terlihat sebagai fallback. Ini hanya fallback tampilan dan
  tidak mengubah data sumber.
*/
function parseRouteRelationEndpoints(value) {
  const normalized = normalizeRouteNameForDisplay(value);

  if (!normalized) {
    return null;
  }

  const parts = normalized
    .split(/\s+-\s+/)
    .map(cleanText)
    .filter(Boolean);

  if (parts.length !== 2) {
    return null;
  }

  return {
    from: parts[0],
    to: parts[1],
    text: `${parts[0]} - ${parts[1]}`
  };
}


function mergeConnectedRouteRelations(relations) {
  const parsed = (relations || [])
    .map(parseRouteRelationEndpoints)
    .filter(Boolean);

  if (!parsed.length) {
    return "";
  }

  /* Hilangkan edge duplikat, termasuk jika arahnya terbalik. */
  const uniqueEdges = [];
  const edgeKeys = new Set();

  parsed.forEach(item => {
    const key = [item.from, item.to]
      .map(value => value.toLocaleLowerCase("id"))
      .sort()
      .join("||");

    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      uniqueEdges.push(item);
    }
  });

  if (uniqueEdges.length === 1) {
    return uniqueEdges[0].text;
  }

  const adjacency = new Map();
  const canonicalName = new Map();

  const addNode = value => {
    const key = value.toLocaleLowerCase("id");
    if (!adjacency.has(key)) {
      adjacency.set(key, new Set());
      canonicalName.set(key, value);
    }
    return key;
  };

  uniqueEdges.forEach(item => {
    const a = addNode(item.from);
    const b = addNode(item.to);
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  });

  /*
    Gabungkan hanya bila seluruh edge membentuk satu jaringan sederhana
    dengan tepat dua ujung. Ini mencegah hasil palsu pada lin bercabang
    atau loop.
  */
  const firstNode = adjacency.keys().next().value;
  const visited = new Set();
  const stack = firstNode ? [firstNode] : [];

  while (stack.length) {
    const node = stack.pop();
    if (visited.has(node)) continue;
    visited.add(node);
    (adjacency.get(node) || []).forEach(next => {
      if (!visited.has(next)) stack.push(next);
    });
  }

  const endpoints = Array.from(adjacency.entries())
    .filter(([, neighbors]) => neighbors.size === 1)
    .map(([key]) => key);

  const isSingleConnectedPath =
    visited.size === adjacency.size &&
    endpoints.length === 2 &&
    Array.from(adjacency.values()).every(neighbors => neighbors.size <= 2);

  if (isSingleConnectedPath) {
    /*
      Orientasi mengikuti relation pertama agar nama ujung tidak tiba-tiba
      terbalik ketika status ALL dipakai.
    */
    const first = uniqueEdges[0];
    const firstFromKey = first.from.toLocaleLowerCase("id");
    const start = endpoints.includes(firstFromKey)
      ? firstFromKey
      : endpoints[0];
    const end = endpoints.find(key => key !== start);

    return `${canonicalName.get(start)} - ${canonicalName.get(end)}`;
  }

  /*
    Cabang/loop/disconnected tidak dipaksa menjadi satu relasi palsu.
    Tampilkan metadata relasi unik apa adanya.
  */
  return uniqueEdges
    .map(item => item.text)
    .join(" · ");
}


function getEffectiveRouteRelation(feature) {
  if (!feature) {
    return "";
  }

  const mode = getRouteMode(feature);

  /* BRT tetap memakai NAME sebagai pasangan asal–tujuan. */
  if (mode === "BRT") {
    return normalizeRouteNameForDisplay(getRouteDisplayName(feature));
  }

  const routeId = getRouteId(feature);

  if (!routeId) {
    return normalizeRouteNameForDisplay(getRouteRelation(feature));
  }

  const activeFeatures = getRouteFeaturesForCurrentStatus(routeId);
  const relations = activeFeatures
    .map(getRouteRelation)
    .map(normalizeRouteNameForDisplay)
    .filter(Boolean);

  if (relations.length) {
    return mergeConnectedRouteRelations(relations);
  }

  /*
    Fallback untuk dataset rail yang belum memiliki RELATION.
    Karena STOP_ROLE tetap attribute-driven, fallback ini hanya menentukan
    teks relasi, bukan fungsi terminus.
  */
  const visibleStops = getVisibleStopsForRoute(routeId);

  if (visibleStops.length >= 2) {
    const firstName = normalizeRouteNameForDisplay(
      getStopDisplayName(visibleStops[0])
    );
    const lastName = normalizeRouteNameForDisplay(
      getStopDisplayName(visibleStops[visibleStops.length - 1])
    );

    if (firstName && lastName && firstName !== lastName) {
      return `${firstName} - ${lastName}`;
    }
  }

  return normalizeRouteNameForDisplay(getRouteRelation(feature));
}


function getRouteTitle(feature) {
  const p = feature?.properties ?? {};
  const mode = getRouteMode(feature);
  const routeName = normalizeRouteNameForDisplay(
    getRouteDisplayName(feature)
  );

  /*
    Format nama rute di UI:
      Nama rute (relasi)

    BRT tetap memakai NAME sebagai relasi, misalnya:
      Koridor 13 (Ciledug - Tegal Mampang)

    Untuk moda rel, RELATION dapat berbeda per tahap/status pada
    LINE_ID yang sama, misalnya:
      MRT_NS / Existing      = Lebak Bulus - Bundaran HI
      MRT_NS / Construction  = Bundaran HI - Kota

    Jika Status = ALL, relasi yang tersambung digabung otomatis menjadi:
      MRT Jakarta Lin Utara - Selatan (Lebak Bulus - Kota)

    Nilai LINE_NAME, RELATION, STATUS, dan LINE_ID pada GeoJSON tidak
    diubah; penggabungan hanya berlaku pada teks UI.
  */
  if (mode === "BRT") {
    return `Koridor ${p.LINE} (${routeName})`;
  }

  const operator = cleanText(p.OPERATOR);
  const relation = getEffectiveRouteRelation(feature);

  let baseName = routeName;

  // MRT tetap membawa identitas operator pada nama rute, tetapi tidak
  // lagi memakai tanda kurung untuk nama lin karena tanda kurung
  // dicadangkan untuk relasi asal–tujuan.
  if (mode === "MRT" && operator && routeName) {
    const routeLower = routeName.toLowerCase();
    const operatorLower = operator.toLowerCase();
    baseName = routeLower.includes(operatorLower)
      ? routeName
      : `${operator} ${routeName}`;
  }

  if (!baseName && operator) {
    baseName = operator;
  }

  if (baseName && relation) {
    return `${baseName} (${relation})`;
  }

  if (baseName) {
    return baseName;
  }

  if (hasText(p.LINE)) {
    return `${mode} ${p.LINE}`;
  }

  return mode || "Lin";
}

function getRouteOptionText(feature) {
  return getRouteTitle(feature);
}


function normalizeRouteVariant(
  featureOrValue
) {
  const raw =
    typeof featureOrValue === "object"
      ? (
          featureOrValue
            ?.properties
            ?.ROUTE_VAR
          ??
          featureOrValue
            ?.properties
            ?.ROUTE_VARIANT
          ??
          ""
        )
      : featureOrValue;

  const value =
    cleanText(raw)
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  if (
    value === "DIVERSION" ||
    value === "DIVERTED" ||
    value === "PENGALIHAN"
  ) {
    return "DIVERSION";
  }

  /*
    Backward compatibility:
    data lama yang belum punya ROUTE_VAR dianggap trase reguler.
  */
  return "REGULAR";
}


function getRouteFeaturesById(routeId) {
  if (!routeData) {
    return [];
  }

  const target =
    String(routeId ?? "");

  return routeData.features
    .filter(
      feature =>
        getRouteId(feature) === target
    );
}


function getRegularRouteFeatures(routeId) {
  return getRouteFeaturesById(routeId)
    .filter(
      feature =>
        normalizeRouteVariant(
          feature
        ) === "REGULAR"
    );
}


function getRegularRouteFeature(routeId) {
  return (
    getRegularRouteFeatures(routeId)[0]
    ??
    null
  );
}


/*
  Satu lin rail boleh mempunyai beberapa feature geometri dengan
  LINE_ID yang sama, misalnya:
  - MRT_NS_EL_01  ELEVATED
  - MRT_NS_TR_01  TRANSITION
  - MRT_NS_UG_01  UNDERGROUND

  Identitas lin tetap satu; hanya geometri yang dipisah.
*/
function getActiveRouteGeometryFeatures(routeId) {
  const selectedStatus =
    normalizeStatus(statusSelect?.value || "ALL");

  const statusMatches = feature => {
    const mode = getRouteMode(feature);
    const status = normalizeStatus(feature?.properties?.STATUS);

    if (status === "Construction" && !isConstructionStatusAllowedForMode(mode)) {
      return false;
    }

    return (
      selectedStatus === "ALL" ||
      !selectedStatus ||
      status === selectedStatus
    );
  };

  const diversion =
    getDiversionRouteFeature(routeId);

  if (diversion && statusMatches(diversion)) {
    return [diversion];
  }

  const regular =
    getRegularRouteFeatures(routeId)
      .filter(statusMatches);

  if (regular.length) {
    return regular;
  }

  return getRouteFeaturesById(routeId)
    .filter(statusMatches);
}


function expandLogicalRouteGeometryFeatures(features) {
  const result = [];
  const seenGeom = new Set();

  (features || []).forEach(feature => {
    const routeId = getRouteId(feature);
    const expanded = routeId
      ? getActiveRouteGeometryFeatures(routeId)
      : [feature];

    expanded.forEach(item => {
      const geomKey = cleanText(
        item?.properties?.GEOM_ID
      ) || `${getRouteId(item)}:${result.length}`;

      if (seenGeom.has(geomKey)) return;
      seenGeom.add(geomKey);
      result.push(item);
    });
  });

  return result;
}


function parseValidityDate(
  value,
  {
    endOfDay = false
  } = {}
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const raw =
    String(value ?? "")
      .trim();

  if (!raw) {
    return null;
  }

  /*
    Date-only dari GeoJSON manual:
    VALID_TO dianggap berlaku sampai akhir hari.
  */
  if (
    /^\d{4}-\d{2}-\d{2}$/
      .test(raw)
  ) {
    const suffix =
      endOfDay
        ? "T23:59:59.999"
        : "T00:00:00";

    const date =
      new Date(
        `${raw}${suffix}`
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const date =
    new Date(raw);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function isFeatureWithinValidity(
  feature,
  referenceDate = new Date()
) {
  const p =
    feature?.properties ?? {};

  const validFrom =
    parseValidityDate(
      p.VALID_FR
    );

  const validTo =
    parseValidityDate(
      p.VALID_TO,
      {
        endOfDay: true
      }
    );

  const now =
    referenceDate instanceof Date
      ? referenceDate
      : new Date(referenceDate);

  if (
    Number.isNaN(
      now.getTime()
    )
  ) {
    return true;
  }

  if (
    validFrom &&
    now < validFrom
  ) {
    return false;
  }

  if (
    validTo &&
    now > validTo
  ) {
    return false;
  }

  return true;
}


function getDiversionRouteFeature(routeId) {
  const diversions =
    getRouteFeaturesById(routeId)
      .filter(
        feature =>
          normalizeRouteVariant(
            feature
          ) === "DIVERSION"
      );

  if (!diversions.length) {
    return null;
  }

  /*
    Pedoman v2.0 menyediakan VALID_FR / VALID_TO.
    DIVERSION yang aktif diprioritaskan.
    Jika semua diversion punya periode dan sudah tidak aktif,
    WebGIS kembali ke REGULAR.
  */
  const active =
    diversions
      .filter(
        feature =>
          isFeatureWithinValidity(
            feature
          )
      )
      .sort(
        (a, b) => {
          const aDate =
            parseValidityDate(
              a?.properties?.VALID_FR
            )
              ?.getTime()
            ?? 0;

          const bDate =
            parseValidityDate(
              b?.properties?.VALID_FR
            )
              ?.getTime()
            ?? 0;

          return bDate - aDate;
        }
      );

  return active[0] ?? null;
}


function hasRouteDiversion(routeId) {
  return Boolean(
    getDiversionRouteFeature(
      routeId
    )
  );
}


/*
  Saat satu ROUTE_ID memiliki REGULAR + DIVERSION,
  WebGIS menganggap DIVERSION sebagai kondisi operasional aktif.

  Dengan demikian:
  - dropdown tetap hanya satu koridor;
  - overview menampilkan kondisi pengalihan;
  - route info memakai nama/metadata pengalihan;
  - REGULAR hanya menjadi layer pembanding opsional.
*/
function getRouteById(routeId) {
  if (!routeData) {
    return null;
  }

  const allFeatures =
    getRouteFeaturesById(routeId);

  if (!allFeatures.length) {
    return null;
  }

  const selectedStatus =
    normalizeStatus(statusSelect?.value || "ALL");

  const filtered =
    selectedStatus !== "ALL"
      ? allFeatures.filter(feature =>
          normalizeStatus(feature?.properties?.STATUS) === selectedStatus &&
          !(
            selectedStatus === "Construction" &&
            !isConstructionStatusAllowedForMode(getRouteMode(feature))
          )
        )
      : allFeatures.filter(feature =>
          normalizeStatus(feature?.properties?.STATUS) !== "Construction" ||
          isConstructionStatusAllowedForMode(getRouteMode(feature))
        );

  const pool = filtered.length
    ? filtered
    : allFeatures;

  const activeDiversion = pool
    .filter(feature => normalizeRouteVariant(feature) === "DIVERSION")
    .filter(feature => isFeatureWithinValidity(feature))[0];

  return (
    activeDiversion
    || pool.find(feature => normalizeRouteVariant(feature) === "REGULAR")
    || pool[0]
    || null
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


function getAllLogicalRoutes() {
  if (!routeData?.features) {
    return [];
  }

  const ids =
    Array.from(
      new Set(
        routeData.features
          .map(
            getRouteId
          )
          .filter(Boolean)
      )
    );

  return ids
    .map(
      getRouteById
    )
    .filter(Boolean)
    .sort(
      (a, b) => {
        const modeCompare =
          getRouteMode(a)
            .localeCompare(
              getRouteMode(b),
              "id"
            );

        if (modeCompare !== 0) {
          return modeCompare;
        }

        const orderCompare =
          getRouteOrder(a) -
          getRouteOrder(b);

        if (orderCompare !== 0) {
          return orderCompare;
        }

        return getRouteTitle(a)
          .localeCompare(
            getRouteTitle(b),
            "id"
          );
      }
    );
}


function populateComparisonRouteDropdown() {
  if (!comparisonRouteSelect) {
    return;
  }

  const primaryId =
    String(
      currentSelectedRouteId ?? ""
    );

  comparisonRouteSelect.innerHTML =
    '<option value="">Pilih rute…</option>';

  const routes =
    getAllLogicalRoutes()
      .filter(
        feature =>
          getRouteId(feature) !==
          primaryId
      );

  const grouped =
    new Map();

  routes.forEach(feature => {
    const mode =
      getRouteMode(feature) ||
      "LAINNYA";

    if (!grouped.has(mode)) {
      grouped.set(
        mode,
        []
      );
    }

    grouped
      .get(mode)
      .push(feature);
  });

  grouped.forEach(
    (features, mode) => {
      const optgroup =
        document.createElement(
          "optgroup"
        );

      optgroup.label =
        mode;

      features.forEach(feature => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          getRouteId(feature);

        option.textContent =
          `${getRouteTitle(feature)} · ${getStatusLabel(feature.properties.STATUS)}`;

        optgroup.appendChild(
          option
        );
      });

      comparisonRouteSelect
        .appendChild(
          optgroup
        );
    }
  );

  comparisonRouteSelect.value =
    (
      comparisonRouteId &&
      comparisonRouteId !== primaryId &&
      getRouteById(comparisonRouteId)
    )
      ? comparisonRouteId
      : "";
}


function getComparisonRouteFeature() {
  if (!comparisonRouteId) {
    return null;
  }

  if (
    String(comparisonRouteId) ===
    String(currentSelectedRouteId)
  ) {
    return null;
  }

  return getRouteById(
    comparisonRouteId
  );
}


function updateRouteCompareUI() {
  if (
    !routeCompareControl ||
    !routeComparePicker ||
    !routeCompareAdd
  ) {
    return;
  }

  const hasPrimary =
    Boolean(
      currentSelectedRouteId &&
      getRouteById(
        currentSelectedRouteId
      )
    );

  routeCompareControl.hidden =
    !hasPrimary;

  if (!hasPrimary) {
    routeComparePicker.hidden =
      true;

    routeCompareAdd.hidden =
      false;

    routeCompareAdd
      .setAttribute(
        "aria-expanded",
        "false"
      );

    if (comparisonRouteSelect) {
      comparisonRouteSelect.value =
        "";
    }

    if (routeCompareClear) {
      routeCompareClear.hidden =
        true;
    }

    if (routeCompareInlineSwatch) {
      routeCompareInlineSwatch.hidden =
        true;

      routeCompareInlineSwatch.style
        .removeProperty(
          "--compare-route-color"
        );
    }

    return;
  }

  populateComparisonRouteDropdown();

  const comparisonFeature =
    getComparisonRouteFeature();

  /*
    Picker terbuka jika:
    - user baru menekan "Bandingkan rute", atau
    - rute pembanding sudah aktif.

    Begitu pembanding aktif, tombol tambah harus benar-benar
    hilang; CSS [hidden] memastikan display:flex lama tidak
    menimpa atribut hidden.
  */
  const pickerOpen =
    !routeComparePicker.hidden ||
    Boolean(comparisonFeature);

  routeComparePicker.hidden =
    !pickerOpen;

  routeCompareAdd.hidden =
    pickerOpen;

  routeCompareAdd
    .setAttribute(
      "aria-expanded",
      String(pickerOpen)
    );

  if (routeCompareClear) {
    routeCompareClear.hidden =
      !comparisonFeature;
  }

  if (routeCompareInlineSwatch) {
    if (!comparisonFeature) {
      routeCompareInlineSwatch.hidden =
        true;

      routeCompareInlineSwatch.style
        .removeProperty(
          "--compare-route-color"
        );
    }
    else {
      const color =
        comparisonFeature
          ?.properties
          ?.COLOR ||
        "#555555";

      routeCompareInlineSwatch.hidden =
        false;

      routeCompareInlineSwatch.style
        .setProperty(
          "--compare-route-color",
          color
        );
    }
  }
}

function clearComparisonRoute(
  {
    redraw = true,
    syncUrl = true
  } = {}
) {
  comparisonRouteId =
    null;

  if (comparisonRouteSelect) {
    comparisonRouteSelect.value =
      "";
  }

  if (
    redraw &&
    currentSelectedRouteId
  ) {
    drawSelectedRouteGeometry(
      currentSelectedRouteId
    );

    fitRouteToScreen();
  }

  updateRouteCompareUI();

  if (syncUrl) {
    syncUrlState();
  }
}


function setComparisonRoute(
  routeId,
  {
    fit = true,
    syncUrl = true
  } = {}
) {
  clearPoiMarker();

  const nextId =
    String(
      routeId ?? ""
    ).trim();

  if (!nextId) {
    clearComparisonRoute({
      redraw: true,
      syncUrl
    });

    return;
  }

  if (
    !currentSelectedRouteId ||
    nextId ===
      String(currentSelectedRouteId)
  ) {
    return;
  }

  const feature =
    getRouteById(nextId);

  if (!feature) {
    return;
  }

  comparisonRouteId =
    nextId;

  drawSelectedRouteGeometry(
    currentSelectedRouteId
  );

  updateRouteCompareUI();

  if (fit) {
    fitRouteToScreen();
  }

  if (syncUrl) {
    syncUrlState();
  }
}

/* =========================================================
   ROUTE DIRECTION HELPERS
   ========================================================= */

function normalizeRouteDirectionSide(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase() === "B"
      ? "B"
      : "A";
}

function getDirectionalSequenceRaw(feature, routeId, side) {
  const p = feature?.properties ?? {};
  const normalizedSide = normalizeRouteDirectionSide(side);
  const field =
    normalizedSide === "A"
      ? (p.SEQ_A_MAP ?? p.SEQ_A ?? "")
      : (p.SEQ_B_MAP ?? p.SEQ_B ?? "");

  const seqMap = getCachedDirectionFieldMap(
    feature,
    normalizedSide === "A" ? "SEQ_A" : "SEQ_B",
    field
  );

  return cleanText(seqMap[String(routeId ?? "")]);
}

function hasDirectionalSequenceForRoute(feature, routeId) {
  return Boolean(
    getDirectionalSequenceRaw(feature, routeId, "A") ||
    getDirectionalSequenceRaw(feature, routeId, "B")
  );
}

function getRouteDirectionSourceFeatures(routeId) {
  const result = [];
  const push = feature => {
    if (feature && !result.includes(feature)) result.push(feature);
  };
  push(getRouteById(routeId));
  push(getRegularRouteFeature(routeId));
  push(getDiversionRouteFeature(routeId));
  return result;
}

function getRouteDirectionFieldLabels(routeId) {
  const labels = { A: "", B: "" };

  getRouteDirectionSourceFeatures(routeId)
    .forEach(feature => {
      const p = feature?.properties ?? {};
      if (!labels.A) {
        labels.A = cleanText(p.DIR_A_NM ?? p.DIR_A_NAME ?? "");
      }
      if (!labels.B) {
        labels.B = cleanText(p.DIR_B_NM ?? p.DIR_B_NAME ?? "");
      }
    });

  return labels;
}

function getRouteNameEndpoints(routeId) {
  /*
    Untuk pengalihan aktif, nama/trase operasional menjadi sumber
    endpoint arah. Jika tidak ada diversion, getRouteById() tetap
    mengembalikan rute reguler.
  */
  const feature =
    getRouteById(routeId) ||
    getRegularRouteFeature(routeId);

  const routeName = feature
    ? getRouteDisplayName(feature)
    : "";

  if (!routeName) return [];

  const parts = routeName
    .split(/\s+(?:-|–|—|→|↔)\s+/)
    .map(cleanText)
    .filter(Boolean);

  if (parts.length < 2) return [];
  return [parts[0], parts[parts.length - 1]];
}

function normalizeDirectionPlaceKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getDestinationFromDirectionLabel(value) {
  const text = cleanText(value);
  if (!text) return "";

  const parts = text
    .split(/\s*(?:→|->|›)\s*/)
    .map(cleanText)
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }

  return text.replace(/^arah\s+/i, "").trim();
}

function getOriginFromDirectionLabel(value) {
  const text = cleanText(value);
  if (!text) return "";

  const parts = text
    .split(/\s*(?:→|->|›)\s*/)
    .map(cleanText)
    .filter(Boolean);

  return parts.length >= 2
    ? parts[0]
    : "";
}

function getRawStopDirectionForRoute(feature, routeId) {
  const raw =
    feature?.properties?.DIR_MAP ??
    feature?.properties?.ROUTE_DIR ??
    "";

  const mapValue = getCachedDirectionFieldMap(
    feature,
    "DIR",
    raw
  );

  return cleanText(mapValue[String(routeId ?? "")]);
}

function isAmbiguousDirectionValue(value) {
  const raw = cleanText(value);
  if (!raw) return false;

  const code = normalizeDirectionCode(raw);
  if (!code || code === "BOTH") return true;

  /*
    Nilai seperti "Kota/Blok M" berarti dua arah dan tidak boleh
    dipakai untuk menebak tujuan A/B. Inilah yang sebelumnya dapat
    menghasilkan label "Kota/Blok M → Kota/Blok M".
  */
  return /[/&,;+]|\bDAN\b|\bAND\b/i.test(raw);
}

function getUnambiguousDirectionPlace(value) {
  if (isAmbiguousDirectionValue(value)) return "";

  const code = normalizeDirectionCode(value);
  if (!code || code === "BOTH") return "";

  const label = getDirectionLabel(code);
  return String(label ?? "")
    .replace(/^Arah\s+/i, "")
    .trim();
}

function getRouteDirectionDestination(routeId, side) {
  if (!stopData?.features) return "";

  const wantedSide = normalizeRouteDirectionSide(side);
  const counts = new Map();

  stopData.features.forEach(feature => {
    if (!getDirectionalSequenceRaw(feature, routeId, wantedSide)) {
      return;
    }

    const destination = getUnambiguousDirectionPlace(
      getRawStopDirectionForRoute(feature, routeId)
    );

    if (!destination) return;

    counts.set(
      destination,
      (counts.get(destination) ?? 0) + 1
    );
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])?.[0]?.[0] ?? "";
}

function findMatchingEndpoint(endpoints, destination) {
  const target = normalizeDirectionPlaceKey(destination);
  if (!target || !Array.isArray(endpoints)) return -1;

  return endpoints.findIndex(endpoint => {
    const key = normalizeDirectionPlaceKey(endpoint);
    return Boolean(
      key === target ||
      key.includes(target) ||
      target.includes(key)
    );
  });
}

function buildDirectionLabelFromDestination(routeId, destination) {
  if (!destination) return "";

  const endpoints = getRouteNameEndpoints(routeId);
  if (endpoints.length >= 2) {
    const destinationIndex = findMatchingEndpoint(
      endpoints,
      destination
    );

    if (destinationIndex !== -1) {
      const origin = endpoints[destinationIndex === 0 ? 1 : 0];
      return `${origin} → ${endpoints[destinationIndex]}`;
    }
  }

  return `Arah ${destination}`;
}

function getRouteDirectionLabels(routeId) {
  const cacheKey = `labels:${String(routeId ?? "")}`;
  if (routeDirectionStaticCache.has(cacheKey)) {
    return routeDirectionStaticCache.get(cacheKey);
  }

  const direct = getRouteDirectionFieldLabels(routeId);
  const destinationA = getRouteDirectionDestination(routeId, "A");
  const destinationB = getRouteDirectionDestination(routeId, "B");

  const result = {
    A: direct.A || buildDirectionLabelFromDestination(routeId, destinationA),
    B: direct.B || buildDirectionLabelFromDestination(routeId, destinationB)
  };

  /* Jika dua tujuan eksplisit tersedia, keduanya juga dapat saling
     menjadi origin tanpa perlu menebak kode A/B dari NAME. */
  if (!direct.A && destinationA && destinationB) {
    result.A = `${destinationB} → ${destinationA}`;
  }
  if (!direct.B && destinationA && destinationB) {
    result.B = `${destinationA} → ${destinationB}`;
  }

  /*
    FALLBACK UNTUK KORIDOR BRT YANG BELUM DIMIGRASIKAN
    --------------------------------------------------
    Koridor selain K1 masih dapat memakai NAME + SEQ_MAP lama.
    Fallback ini hanya dipakai bila tidak ada label/sequence arah
    eksplisit yang cukup. Begitu DIR_A_NM/DIR_B_NM atau SEQ_A/B_MAP
    diisi, data eksplisit tetap mendapat prioritas.
  */
  const endpoints = getRouteNameEndpoints(routeId);
  if (endpoints.length >= 2) {
    if (!result.A) {
      result.A = `${endpoints[0]} → ${endpoints[1]}`;
    }
    if (!result.B) {
      result.B = `${endpoints[1]} → ${endpoints[0]}`;
    }
  }

  if (!result.A) result.A = "Arah A";
  if (!result.B) result.B = "Arah B";

  routeDirectionStaticCache.set(cacheKey, result);
  return result;
}

function getRouteDirectionalCoverage(routeId) {
  if (!stopData?.features) {
    return { A: false, B: false };
  }

  const routeKey = String(routeId ?? "");
  const cacheKey = `coverage:${routeKey}`;

  if (routeDirectionStaticCache.has(cacheKey)) {
    return routeDirectionStaticCache.get(cacheKey);
  }

  const direct = getRouteDirectionFieldLabels(routeKey);

  let hasA = Boolean(direct.A);
  let hasB = Boolean(direct.B);

  stopData.features.forEach(feature => {
    if (!stopServesRoute(feature, routeKey)) return;
    if (getDirectionalSequenceRaw(feature, routeKey, "A")) hasA = true;
    if (getDirectionalSequenceRaw(feature, routeKey, "B")) hasB = true;
  });

  const result = { A: hasA, B: hasB };
  routeDirectionStaticCache.set(cacheKey, result);
  return result;
}

function hasLegacyBidirectionalRouteData(routeId) {
  if (!routeId || !stopData?.features) return false;

  const route = getRouteById(routeId);
  if (!route || getRouteMode(route) !== "BRT") return false;

  const endpoints = getRouteNameEndpoints(routeId);
  if (endpoints.length < 2) return false;

  /*
    Minimal dua halte dengan SEQ_MAP diperlukan agar arah pergi dan
    balik dapat dibentuk secara aman dari urutan legacy.
  */
  let sequenceCount = 0;

  stopData.features.forEach(feature => {
    if (!stopServesRoute(feature, routeId)) return;

    const raw = getLegacySequenceRawForDirection(
      feature,
      routeId
    );

    if (raw) sequenceCount += 1;
  });

  return sequenceCount >= 2;
}

function isRouteDirectionEnabled(routeId) {
  if (!routeId) return false;

  const coverage = getRouteDirectionalCoverage(routeId);

  /* Schema arah baru selalu menjadi pilihan utama. */
  if (coverage.A && coverage.B) {
    return true;
  }

  /*
    Koridor BRT yang belum mempunyai SEQ_A/B_MAP tetap memperoleh
    toggle arah menggunakan NAME + SEQ_MAP sebagai fallback.
  */
  return hasLegacyBidirectionalRouteData(routeId);
}

function getDefaultRouteDirection(routeId) {
  /*
    Bila NAME = Origin - Destination dan salah satu side secara
    eksplisit menuju Destination, side tersebut menjadi default.
    Jika tidak dapat dipastikan, A tetap fallback aman.
  */
  const endpoints = getRouteNameEndpoints(routeId);
  if (endpoints.length >= 2) {
    const endKey = normalizeDirectionPlaceKey(endpoints[1]);
    for (const side of ["A", "B"]) {
      const destination = normalizeDirectionPlaceKey(
        getRouteDirectionDestination(routeId, side)
      );
      if (
        destination &&
        (destination === endKey || destination.includes(endKey) || endKey.includes(destination))
      ) {
        return side;
      }
    }
  }
  return "A";
}

function getActiveRouteDirection(routeId) {
  const routeKey = String(routeId ?? "");
  if (!routeDirectionById.has(routeKey)) {
    routeDirectionById.set(routeKey, getDefaultRouteDirection(routeKey));
  }
  return normalizeRouteDirectionSide(routeDirectionById.get(routeKey));
}

function setActiveRouteDirection(routeId, side) {
  const normalized = normalizeRouteDirectionSide(side);
  routeDirectionById.set(String(routeId ?? ""), normalized);
  clearDirectionRuntimeCaches();
  return normalized;
}

function toggleActiveRouteDirection(routeId) {
  const current = getActiveRouteDirection(routeId);
  return setActiveRouteDirection(routeId, current === "A" ? "B" : "A");
}

function getRouteDirectionDestinationKey(routeId, side) {
  const labels = getRouteDirectionLabels(routeId);
  return normalizeDirectionPlaceKey(
    getDestinationFromDirectionLabel(
      labels[normalizeRouteDirectionSide(side)]
    )
  );
}

function isStopVisibleInActiveDirection(feature, routeId) {
  if (!isRouteDirectionEnabled(routeId)) return true;

  const activeSide = getActiveRouteDirection(routeId);
  const activeSeq = getDirectionalSequenceRaw(
    feature,
    routeId,
    activeSide
  );

  /* Feature yang sudah memiliki map sequence directional bersifat
     eksplisit: kosong pada side aktif = tidak dilayani side itu. */
  if (hasDirectionalSequenceForRoute(feature, routeId)) {
    return Boolean(activeSeq);
  }

  /* Feature yang belum dimigrasikan TIDAK boleh hilang hanya karena
     rute sudah mulai memakai SEQ_A/B_MAP. Ini memperbaiki regresi
     build v3 yang dapat menyisakan hanya satu halte. */
  const rawDirection = getRawStopDirectionForRoute(feature, routeId);

  if (!rawDirection || isAmbiguousDirectionValue(rawDirection)) {
    return true;
  }

  const stopDestination = normalizeDirectionPlaceKey(
    getUnambiguousDirectionPlace(rawDirection)
  );
  const activeDestination = getRouteDirectionDestinationKey(
    routeId,
    activeSide
  );

  if (
    stopDestination &&
    activeDestination &&
    (
      stopDestination === activeDestination ||
      stopDestination.includes(activeDestination) ||
      activeDestination.includes(stopDestination)
    )
  ) {
    return true;
  }

  /* Satu-satunya physical point pada terminus boleh dipakai untuk
     kedua arah. Terminus dengan dua physical point tetap mengikuti
     DIR_MAP / SEQ_A/B_MAP. */
  const role = getStopRoleForRoute(feature, routeId);
  if (role === "Terminus" || role === "Transit-Terminus") {
    const group = getStopGroupFeatures(feature, routeId);
    return group.length <= 1;
  }

  return false;
}

function getLegacySequenceRawForDirection(feature, routeId) {
  const seqMap = parseRouteMap(
    feature?.properties?.SEQ_MAP ??
    feature?.properties?.ROUTE_SEQ ??
    ""
  );
  return cleanText(seqMap[String(routeId ?? "")]);
}

function parseDirectionalSequenceNumber(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return 999999;
  const match = raw.match(/^(\d+)([a-z]*)$/);
  if (!match) return 999999;
  const major = Number(match[1]);
  const suffix = match[2];
  if (!suffix) return major;
  let suffixValue = 0;
  for (let i = 0; i < suffix.length; i += 1) {
    suffixValue = suffixValue * 26 + (suffix.charCodeAt(i) - 96);
  }
  return major + suffixValue / 1000;
}

function getLegacySequenceNumberForDirection(feature, routeId) {
  return parseDirectionalSequenceNumber(
    getLegacySequenceRawForDirection(feature, routeId)
  );
}

function getRouteLegacySequenceMaximum(routeId) {
  if (!stopData?.features) return 0;
  let maximum = 0;
  stopData.features.forEach(feature => {
    if (!stopServesRoute(feature, routeId)) return;
    const value = getLegacySequenceNumberForDirection(feature, routeId);
    if (value < 999999 && value > maximum) maximum = value;
  });
  return maximum;
}

function getRouteEndpointLegacySequences(routeId) {
  const endpoints = getRouteNameEndpoints(routeId);
  if (endpoints.length < 2 || !stopData?.features) return null;

  const result = endpoints.map(endpoint => {
    const target = normalizeDirectionPlaceKey(endpoint);
    const matches = stopData.features
      .filter(feature => stopServesRoute(feature, routeId))
      .filter(feature => {
        const key = normalizeDirectionPlaceKey(getStopDisplayName(feature));
        return key === target || key.includes(target) || target.includes(key);
      })
      .map(feature => getLegacySequenceNumberForDirection(feature, routeId))
      .filter(value => value < 999999);

    return matches.length ? Math.min(...matches) : null;
  });

  if (result.some(value => value === null)) return null;
  return { endpoints, sequences: result };
}

function shouldReverseLegacySequence(routeId, side) {
  const endpointInfo = getRouteEndpointLegacySequences(routeId);
  if (!endpointInfo) return false;

  const destinationKey = getRouteDirectionDestinationKey(routeId, side);
  const destinationIndex = findMatchingEndpoint(
    endpointInfo.endpoints,
    getDestinationFromDirectionLabel(getRouteDirectionLabels(routeId)[normalizeRouteDirectionSide(side)])
  );

  if (destinationIndex === -1 || !destinationKey) return false;

  const originIndex = destinationIndex === 0 ? 1 : 0;
  return endpointInfo.sequences[destinationIndex] < endpointInfo.sequences[originIndex];
}

function getRouteOperationalSequenceMaximum(routeId) {
  if (!stopData?.features) return 0;

  let maximum = 0;

  stopData.features.forEach(feature => {
    const operationalCode = getOperationalMapValue(feature, routeId);
    const belongsToRoute = stopServesRoute(feature, routeId);

    if (
      !belongsToRoute &&
      operationalCode !== "TEMP_SERVED" &&
      operationalCode !== "TEMP_TERMINUS"
    ) {
      return;
    }

    const value = getStopSequence(feature, routeId);
    if (value < 999999 && value > maximum) {
      maximum = value;
    }
  });

  return maximum;
}

function getRouteOperationalEndpointSequences(routeId) {
  const endpoints = getRouteNameEndpoints(routeId);
  if (endpoints.length < 2 || !stopData?.features) return null;

  const result = endpoints.map(endpoint => {
    const target = normalizeDirectionPlaceKey(endpoint);

    const matches = stopData.features
      .filter(feature => {
        const operationalCode = getOperationalMapValue(feature, routeId);
        return (
          stopServesRoute(feature, routeId) ||
          operationalCode === "TEMP_SERVED" ||
          operationalCode === "TEMP_TERMINUS"
        );
      })
      .filter(feature => {
        const key = normalizeDirectionPlaceKey(getStopDisplayName(feature));
        return key === target || key.includes(target) || target.includes(key);
      })
      .map(feature => getStopSequence(feature, routeId))
      .filter(value => value < 999999);

    return matches.length ? Math.min(...matches) : null;
  });

  if (result.some(value => value === null)) return null;
  return { endpoints, sequences: result };
}

function shouldReverseOperationalSequence(routeId, side) {
  const endpointInfo = getRouteOperationalEndpointSequences(routeId);
  if (!endpointInfo) {
    /*
      Untuk rute legacy tanpa endpoint sequence yang dapat dibaca,
      A mengikuti urutan sumber dan B menjadi arah balik.
    */
    return normalizeRouteDirectionSide(side) === "B";
  }

  const label = getRouteDirectionLabels(routeId)[
    normalizeRouteDirectionSide(side)
  ];

  const destinationIndex = findMatchingEndpoint(
    endpointInfo.endpoints,
    getDestinationFromDirectionLabel(label)
  );

  if (destinationIndex === -1) {
    return normalizeRouteDirectionSide(side) === "B";
  }

  const originIndex = destinationIndex === 0 ? 1 : 0;

  return (
    endpointInfo.sequences[destinationIndex] <
    endpointInfo.sequences[originIndex]
  );
}

function getDirectionalSortSequence(feature, routeId) {
  /*
    Operational diversion tetap menjadi sumber urutan utama, tetapi
    urutannya dapat dibalik untuk sisi perjalanan sebaliknya.
  */
  if (hasRouteDiversion(routeId)) {
    const operationalSequence = getStopSequence(feature, routeId);

    if (!isRouteDirectionEnabled(routeId)) {
      return operationalSequence;
    }

    if (!shouldReverseOperationalSequence(
      routeId,
      getActiveRouteDirection(routeId)
    )) {
      return operationalSequence;
    }

    const maximum = getRouteOperationalSequenceMaximum(routeId);

    return (
      operationalSequence < 999999 && maximum
        ? maximum + 1 - operationalSequence
        : operationalSequence
    );
  }

  if (!isRouteDirectionEnabled(routeId)) {
    return getStopSequence(feature, routeId);
  }

  const side = getActiveRouteDirection(routeId);

  /*
    Endpoint terminus tetap dikunci secara semantik:
    origin = pertama, destination = terakhir.
    Ini juga membuat migrasi bertahap aman ketika sequence endpoint
    belum sempat diperbarui, tanpa hardcode nama halte tertentu.
  */
  const role = getStopRoleForRoute(feature, routeId);
  if (role === "Terminus" || role === "Transit-Terminus") {
    const activeLabel = getRouteDirectionLabels(routeId)[side];
    const originKey = normalizeDirectionPlaceKey(
      getOriginFromDirectionLabel(activeLabel)
    );
    const destinationKey = normalizeDirectionPlaceKey(
      getDestinationFromDirectionLabel(activeLabel)
    );
    const stopKey = normalizeDirectionPlaceKey(
      getStopDisplayName(feature)
    );

    if (
      originKey &&
      (stopKey === originKey || stopKey.includes(originKey) || originKey.includes(stopKey))
    ) {
      return -1000;
    }

    if (
      destinationKey &&
      (stopKey === destinationKey || stopKey.includes(destinationKey) || destinationKey.includes(stopKey))
    ) {
      return 900000;
    }
  }

  const explicit = getDirectionalSequenceRaw(feature, routeId, side);

  if (explicit) {
    return parseDirectionalSequenceNumber(explicit);
  }

  if (hasDirectionalSequenceForRoute(feature, routeId)) {
    return 999999;
  }

  const legacy = getLegacySequenceNumberForDirection(feature, routeId);
  if (legacy >= 999999) return legacy;

  if (!shouldReverseLegacySequence(routeId, side)) {
    return legacy;
  }

  const maximum = getRouteLegacySequenceMaximum(routeId);
  return maximum ? maximum + 1 - legacy : legacy;
}

function compareStopsForActiveDirection(a, b, routeId) {
  const seqA = getDirectionalSortSequence(a, routeId);
  const seqB = getDirectionalSortSequence(b, routeId);
  if (seqA !== seqB) return seqA - seqB;
  return getStopDisplayName(a).localeCompare(getStopDisplayName(b), "id");
}

function getActiveDirectionSequenceRaw(feature, routeId) {
  if (!isRouteDirectionEnabled(routeId) || hasRouteDiversion(routeId)) {
    return getStopSequenceRaw(feature, routeId);
  }

  const explicit = getDirectionalSequenceRaw(
    feature,
    routeId,
    getActiveRouteDirection(routeId)
  );

  return explicit || "";
}

function buildRouteDirectionControlHTML(routeId) {
  if (!isRouteDirectionEnabled(routeId)) return "";

  const side = getActiveRouteDirection(routeId);
  const labels = getRouteDirectionLabels(routeId);
  const nextSide = side === "A" ? "B" : "A";

  return `
    <div class="route-direction-control">
      <div class="route-direction-caption">Arah perjalanan</div>
      <button
        type="button"
        class="route-direction-toggle"
        data-route-direction-toggle="${escapeHTML(routeId)}"
        aria-label="Ganti arah ke ${escapeHTML(labels[nextSide])}"
        title="Ganti ke ${escapeHTML(labels[nextSide])}"
      >
        <span class="route-direction-toggle-text">${escapeHTML(labels[side])}</span>
        <span class="route-direction-toggle-icon" aria-hidden="true">⇄</span>
      </button>
    </div>
  `;
}

function refreshRouteDirectionView(routeId) {
  if (!routeId || !getRouteById(routeId)) return;

  clearSelectedStop();
  renderRouteInfo(getRouteById(routeId));
  renderStopList(routeId);
  drawStops(routeId);
  updateStopLabelVisibility();
  updateRouteDetailCardState();
  syncUrlState();
}

/* =========================================================
   ROUTE SUMMARY
   ========================================================= */

function haversineDistanceMeters(a, b) {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b)
  ) {
    return 0;
  }

  const lng1 = Number(a[0]);
  const lat1 = Number(a[1]);
  const lng2 = Number(b[0]);
  const lat2 = Number(b[1]);

  if (
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng2) ||
    !Number.isFinite(lat2)
  ) {
    return 0;
  }

  const toRad =
    value =>
      value * Math.PI / 180;

  const radius =
    6371008.8;

  const dLat =
    toRad(lat2 - lat1);

  const dLng =
    toRad(lng2 - lng1);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;

  return (
    2 *
    radius *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(h)
      )
    )
  );
}


function getGeometryLengthKm(geometry) {
  if (!geometry) {
    return null;
  }

  let lines = [];

  if (geometry.type === "LineString") {
    lines = [geometry.coordinates];
  }
  else if (geometry.type === "MultiLineString") {
    lines = geometry.coordinates;
  }
  else {
    return null;
  }

  let meters = 0;

  lines.forEach(
    line => {
      if (!Array.isArray(line)) {
        return;
      }

      for (
        let i = 1;
        i < line.length;
        i += 1
      ) {
        meters +=
          haversineDistanceMeters(
            line[i - 1],
            line[i]
          );
      }
    }
  );

  return meters > 0
    ? meters / 1000
    : null;
}


/*
  Panjang lin rail tidak boleh sekadar menjumlahkan semua feature
  dengan LINE_ID yang sama. Saat proses migrasi, sebuah lin dapat
  memiliki geometri baseline/generik sekaligus segmen detail
  ELEVATED / TRANSITION / UNDERGROUND yang menimpa trase yang sama.

  Aturan ringkasan:
  1. feature identik dideduplikasi;
  2. jika tersedia sedikitnya dua jenis struktur detail, segmen
     detail menjadi sumber panjang utama dan geometri generik
     MIXED/UNKNOWN tidak ikut dijumlahkan;
  3. jika struktur detail masih parsial, fallback ke seluruh
     geometri aktif agar panjang tidak terpotong saat digitasi.
*/
function getGeometryFingerprint(geometry) {
  if (!geometry) {
    return "";
  }

  const roundCoord = value => {
    const number = Number(value);
    return Number.isFinite(number)
      ? number.toFixed(6)
      : "";
  };

  const canonicalLine = line => {
    if (!Array.isArray(line)) {
      return "";
    }

    const forward = line
      .map(coord =>
        `${roundCoord(coord?.[0])},${roundCoord(coord?.[1])}`
      )
      .join("|");

    const reverse = [...line]
      .reverse()
      .map(coord =>
        `${roundCoord(coord?.[0])},${roundCoord(coord?.[1])}`
      )
      .join("|");

    return forward <= reverse
      ? forward
      : reverse;
  };

  if (geometry.type === "LineString") {
    return `L:${canonicalLine(geometry.coordinates)}`;
  }

  if (geometry.type === "MultiLineString") {
    const parts = (geometry.coordinates || [])
      .map(canonicalLine)
      .filter(Boolean)
      .sort();

    return `M:${parts.join("||")}`;
  }

  return "";
}


function getUniqueRouteGeometryFeatures(features) {
  const seen = new Set();

  return (features || []).filter(feature => {
    const fingerprint =
      getGeometryFingerprint(feature?.geometry);

    if (!fingerprint) {
      return true;
    }

    if (seen.has(fingerprint)) {
      return false;
    }

    seen.add(fingerprint);
    return true;
  });
}


function getRailSummaryGeometryFeatures(routeId) {
  const active =
    getUniqueRouteGeometryFeatures(
      getActiveRouteGeometryFeatures(routeId)
    );

  const detailedStructures = new Set([
    "ELEVATED",
    "TRANSITION",
    "UNDERGROUND",
    "AT_GRADE"
  ]);

  const detailed = active.filter(feature =>
    detailedStructures.has(
      normalizeStructure(
        feature?.properties?.STRUCTURE
      )
    )
  );

  const detailedTypes = new Set(
    detailed.map(feature =>
      normalizeStructure(
        feature?.properties?.STRUCTURE
      )
    )
  );

  /*
    Dua atau lebih kelas struktur menunjukkan bahwa lin mulai
    dipecah menjadi segmen kartografis. Jika masih ada geometri
    generik/baseline, bandingkan cakupannya agar digitasi parsial
    tidak membuat ringkasan panjang tiba-tiba terpotong.
  */
  if (detailedTypes.size >= 2) {
    const generic = active.filter(feature =>
      !detailedStructures.has(
        normalizeStructure(
          feature?.properties?.STRUCTURE
        )
      )
    );

    if (!generic.length) {
      return detailed;
    }

    const detailedLengthKm = detailed
      .map(feature =>
        getGeometryLengthKm(feature.geometry)
      )
      .filter(Number.isFinite)
      .reduce((sum, value) => sum + value, 0);

    const genericByLength = generic
      .map(feature => ({
        feature,
        lengthKm: getGeometryLengthKm(feature.geometry)
      }))
      .filter(item => Number.isFinite(item.lengthKm))
      .sort((a, b) => b.lengthKm - a.lengthKm);

    const longestGeneric = genericByLength[0];

    /*
      Jika segmen detail sudah mencakup sekurangnya ±80% dari
      geometri baseline terpanjang, baseline dianggap representasi
      lama yang overlap dan tidak ikut dijumlahkan.
    */
    if (
      !longestGeneric ||
      detailedLengthKm >= longestGeneric.lengthKm * 0.8
    ) {
      return detailed;
    }

    /*
      Segmen detail masih parsial: gunakan baseline terpanjang
      sebagai estimasi sementara, bukan baseline + segmen detail.
    */
    return [longestGeneric.feature];
  }

  return active;
}


function getRouteSummaryLengthKm(feature) {
  const routeId = getRouteId(feature);
  const mode = getRouteMode(feature);

  if (mode === "BRT") {
    return getGeometryLengthKm(
      feature.geometry
    );
  }

  return getRailSummaryGeometryFeatures(routeId)
    .map(routeFeature =>
      getGeometryLengthKm(
        routeFeature.geometry
      )
    )
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);
}


function getRouteSummaryStats(feature) {
  const routeId =
    getRouteId(feature);

  const entries =
    getLogicalOperationalStopEntries(
      routeId,
      {
        includeNotServed: false
      }
    );

  const transitCount =
    entries.filter(
      entry => {
        const role =
          getOperationalStopRole(
            entry.feature,
            routeId
          );

        return (
          role === "Transit" ||
          role === "Transit-Terminus"
        );
      }
    ).length;

  const terminusCount =
    entries.filter(
      entry => {
        const role =
          getOperationalStopRole(
            entry.feature,
            routeId
          );

        return (
          role === "Terminus" ||
          role === "Transit-Terminus" ||
          role === "Terminus Sementara"
        );
      }
    ).length;

  const lengthKm =
    getRouteSummaryLengthKm(feature);

  return {
    stopCount: entries.length,
    transitCount,
    terminusCount,
    lengthKm:
      Number.isFinite(lengthKm) && lengthKm > 0
        ? lengthKm
        : null
  };
}


function buildRouteSummaryHTML(
  feature,
  objectName
) {
  const stats =
    getRouteSummaryStats(
      feature
    );

  const mode =
    getRouteMode(
      feature
    );

  const lengthText =
    Number.isFinite(
      stats.lengthKm
    )
      ? `± ${stats.lengthKm.toLocaleString(
          "id-ID",
          {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          }
        )} km`
      : "—";

  return `
    <div class="route-summary-grid">
      <div class="route-summary-item">
        <span>${escapeHTML(objectName)}</span>
        <strong>${stats.stopCount}</strong>
      </div>

      <div class="route-summary-item">
        <span>Transit</span>
        <strong>${stats.transitCount}</strong>
      </div>

      <div class="route-summary-item">
        <span>Terminus</span>
        <strong>${stats.terminusCount}</strong>
      </div>

      <div class="route-summary-item">
        <span>Panjang</span>
        <strong>${escapeHTML(lengthText)}</strong>
      </div>
    </div>

    ${
      Number.isFinite(
        stats.lengthKm
      )
        ? `
          <div class="route-summary-length-note">
            ${
              mode === "BRT"
                ? "* Panjang merupakan estimasi total trase dua arah (pergi–kembali), bukan panjang satu arah."
                : "* Panjang merupakan estimasi geometri lin yang ditampilkan."
            }
          </div>
        `
        : ""
    }
  `;
}


/* =========================================================
   STOP HELPERS
   ========================================================= */

/*
  PEDOMAN BRT v2.0
  ----------------
  STOP_ID = identitas halte logis.
  GEOM_ID = identitas feature/titik fisik dan wajib unik.

  Runtime key karena itu memakai GEOM_ID terlebih dahulu.
  Fallback STOP_ID/FID hanya dipertahankan untuk data lama
  selama proses migrasi.
*/
function assignRuntimeStopKeys() {
  if (!stopData) return;

  const usedKeys =
    new Map();

  stopData.features.forEach(
    (feature, index) => {
      const p =
        feature.properties ?? {};

      const rawGeomId =
        String(
          p.GEOM_ID ?? ""
        ).trim();

      const rawStopId =
        String(
          p.STOP_ID ?? ""
        ).trim();

      const rawFid =
        String(
          p.FID ?? ""
        ).trim();

      let baseKey = "";

      if (rawGeomId) {
        baseKey = rawGeomId;
      }
      else if (rawStopId) {
        baseKey =
          `STOP_${rawStopId}`;
      }
      else if (rawFid !== "") {
        baseKey =
          `FID_${String(rawFid)
            .padStart(3, "0")}`;
      }
      else {
        baseKey =
          `AUTO_STOP_${String(index + 1)
            .padStart(3, "0")}`;
      }

      const usedCount =
        usedKeys.get(baseKey)
        ?? 0;

      usedKeys.set(
        baseKey,
        usedCount + 1
      );

      p.__STOP_KEY =
        usedCount === 0
          ? baseKey
          : `${baseKey}__${usedCount + 1}`;

      feature.properties = p;
    }
  );
}


function getStopKey(feature) {
  return String(
    feature?.properties?.__STOP_KEY ??
    feature?.properties?.GEOM_ID ??
    feature?.properties?.STOP_ID ??
    ""
  );
}


function getStopGeomId(feature) {
  return cleanText(
    feature?.properties?.GEOM_ID
  );
}


function getStopLogicalId(feature) {
  return cleanText(
    feature?.properties?.STOP_ID
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


function normalizeStopVariant(value) {
  const code =
    cleanText(value)
      .toUpperCase();

  if (code === "TEMPORARY") {
    return "TEMPORARY";
  }

  return "BASE";
}


function getStopVariant(feature) {
  return normalizeStopVariant(
    feature?.properties?.STOP_VAR
  );
}


function isTemporaryStopFeature(feature) {
  return (
    getStopVariant(
      feature
    ) === "TEMPORARY"
  );
}


function getStopReplacesId(feature) {
  return cleanText(
    feature
      ?.properties
      ?.REPLACES_ID
  );
}


function getActiveRouteDivId(routeId) {
  const activeRoute =
    getRouteById(
      routeId
    );

  if (
    !activeRoute ||
    normalizeRouteVariant(
      activeRoute
    ) !== "DIVERSION"
  ) {
    return "";
  }

  return cleanText(
    activeRoute
      ?.properties
      ?.DIV_ID
  );
}


function isTemporaryStopActiveForRoute(
  feature,
  routeId
) {
  if (
    !isTemporaryStopFeature(
      feature
    )
  ) {
    return false;
  }

  if (
    !isFeatureWithinValidity(
      feature
    )
  ) {
    return false;
  }

  const stopDivId =
    cleanText(
      feature
        ?.properties
        ?.DIV_ID
    );

  /*
    Jika halte temporary menyebut DIV_ID,
    hanya aktif ketika rute yang sedang dilihat sedang memakai
    DIVERSION dengan DIV_ID yang sama.
  */
  if (stopDivId) {
    const routeDivId =
      getActiveRouteDivId(
        routeId
      );

    return Boolean(
      routeDivId &&
      routeDivId === stopDivId
    );
  }

  /*
    Temporary tanpa DIV_ID tetap didukung, tetapi keberadaannya
    harus lolos VALID_FR / VALID_TO.
  */
  return true;
}


function getActiveTemporaryReplacementForBase(
  feature,
  routeId
) {
  if (
    !stopData?.features ||
    isTemporaryStopFeature(
      feature
    )
  ) {
    return null;
  }

  const baseGeomId =
    getStopGeomId(
      feature
    );

  if (!baseGeomId) {
    return null;
  }

  return (
    stopData.features.find(
      candidate =>
        isTemporaryStopActiveForRoute(
          candidate,
          routeId
        )
        &&
        getStopReplacesId(
          candidate
        ) === baseGeomId
    )
    ??
    null
  );
}


function isBaseStopReplacedDuringActiveDiversion(
  feature,
  routeId
) {
  return Boolean(
    getActiveTemporaryReplacementForBase(
      feature,
      routeId
    )
  );
}


function getPhysicalStopSummary(
  features
) {
  const list =
    Array.isArray(features)
      ? features.filter(Boolean)
      : [];

  const variants =
    new Set(
      list.map(
        getStopVariant
      )
    );

  if (
    variants.has("BASE") &&
    variants.has("TEMPORARY")
  ) {
    return {
      short:
        "Lokasi reguler + sementara",
      long:
        "Halte ini memiliki lokasi reguler dan lokasi sementara untuk layanan yang sama."
    };
  }

  if (list.length > 1) {
    return {
      short:
        `${list.length} lokasi fisik`,
      long:
        `${list.length} lokasi fisik mewakili satu halte yang sama.`
    };
  }

  return {
    short: "",
    long: ""
  };
}


/*
  ROUTES adalah sumber utama keanggotaan halte.
*/
function getStopRoutes(feature) {
  const p = feature?.properties ?? {};

  return splitIds(
    normalizeDelimitedIds(
      p.ROUTES ??
      p.LINES ??
      p.LINE_ID ??
      ""
    )
  );
}

function stopServesRoute(feature, routeId) {
  return getStopRoutes(feature)
    .includes(String(routeId));
}

function getStopSequenceRaw(feature, routeId) {
  const p = feature.properties ?? {};

  /*
    Saat koridor memiliki geometri DIVERSION dan DIV_SEQ
    tersedia, gunakan urutan pengalihan terlebih dahulu.
  */
  if (
    hasRouteDiversion(
      routeId
    )
  ) {
    const diversionSequence =
      getDiversionSequenceRaw(
        feature,
        routeId
      );

    if (diversionSequence) {
      return diversionSequence;
    }
  }

  /*
    FALLBACK OPERASIONAL KORIDOR 3 — MRT JAKARTA FASE 2A

    Selama DIV_SEQ belum diisi pada GeoJSON, urutan akhir
    pelayanan aktif Koridor 3 adalah:

      Roxy -> Petojo -> Monumen Nasional

    Roxy pada SEQ_MAP reguler adalah 12, sehingga titik
    tambahan pengalihan ditempatkan sebagai 12a dan 12b.

    Begitu DIV_SEQ tersedia, blok ini otomatis dilewati karena
    DIV_SEQ selalu mendapat prioritas di atas fallback ini.
  */
  if (
    String(routeId) === "BRT_03"
  ) {
    const stopName =
      normalizeOperationalStopName(
        getStopDisplayName(
          feature
        )
      );

    if (
      stopName ===
      normalizeOperationalStopName(
        "Petojo"
      )
    ) {
      return "12a";
    }

    if (
      stopName ===
      normalizeOperationalStopName(
        "Monumen Nasional"
      )
    ) {
      return "12b";
    }
  }


  /*
    FALLBACK OPERASIONAL KORIDOR 8 — MRT JAKARTA FASE 2A

    Selama DIV_SEQ belum diisi pada GeoJSON, urutan akhir
    pelayanan aktif Koridor 8 adalah:

      Petojo -> Pecenongan -> Juanda -> Pasar Baru

    Petojo pada SEQ_MAP reguler Koridor 8 adalah 23.
    Titik tambahan pengalihan ditempatkan sesudahnya sebagai:

      Petojo       = 23
      Pecenongan   = 23a
      Juanda       = 23b
      Pasar Baru   = 23c

    Jika DIV_SEQ tersedia, blok fallback ini otomatis dilewati
    karena DIV_SEQ selalu mendapat prioritas.
  */
  if (
    String(routeId) === "BRT_08"
  ) {
    const stopName =
      normalizeOperationalStopName(
        getStopDisplayName(
          feature
        )
      );

    if (
      stopName ===
      normalizeOperationalStopName(
        "Pecenongan"
      )
    ) {
      return "23a";
    }

    if (
      stopName ===
      normalizeOperationalStopName(
        "Juanda"
      )
    ) {
      return "23b";
    }

    if (
      stopName ===
      normalizeOperationalStopName(
        "Pasar Baru"
      )
    ) {
      return "23c";
    }
  }

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
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();

  if (!raw) {
    return "";
  }

  /*
    DIR_MAP yang menyebut dua tujuan sekaligus berarti halte
    melayani dua arah. Contoh data K1:
      Kota/Blok M
      Blok M/Kota

    Nilai dua arah dinormalisasi menjadi BOTH agar UI tidak
    menampilkan badge repetitif seperti "Arah Kota/Blok M".
    Titik fisik yang benar-benar satu arah tetap memakai nilai
    tujuan tunggal, mis. Kota atau Blok M.
  */
  const normalizedWords = raw
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalizedWords === "BOTH" ||
    normalizedWords === "DUA ARAH" ||
    normalizedWords === "DUA_ARAH" ||
    /[\/|&]/.test(normalizedWords)
  ) {
    return "BOTH";
  }

  return raw
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function getStopDirection(feature, routeId) {
  return normalizeDirectionCode(
    getRawStopDirectionForRoute(
      feature,
      routeId
    )
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


function getStopDirectionInfo(
  feature,
  routeId
) {
  const rawDirection =
    getStopDirection(
      feature,
      routeId
    );

  const code =
    normalizeDirectionCode(
      rawDirection
    );

  if (
    !code ||
    code === "BOTH"
  ) {
    return {
      isOneWay: false,
      symbol: "↔",
      title: "Dua arah",
      detail: ""
    };
  }

  return {
    isOneWay: true,
    symbol: "→",
    title: "Satu arah",
    detail:
      getDirectionLabel(
        rawDirection
      )
  };
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
function getStopGroupId(feature) {
  const p =
    feature?.properties ?? {};

  return cleanText(
    p.STOP_GROUP ??
    p.PARENT_ID ??
    ""
  );
}


function humanizeStopGroupName(
  value
) {
  const raw =
    cleanText(
      value
    );

  if (!raw) {
    return "";
  }

  return raw
    .replace(
      /[_-]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .replace(
      /\b\w/g,
      letter =>
        letter.toUpperCase()
    );
}


function getStopComplexName(
  feature
) {
  /*
    STOP_GROUP adalah kode internal kompleks/interchange.
    User-facing label dibuat manusiawi:
    BLOK_M -> Blok M.
  */
  return humanizeStopGroupName(
    getStopGroupId(
      feature
    )
  );
}


function getLogicalStopKey(feature) {
  /*
    v2.0: STOP_ID sendiri adalah identitas halte logis.
    STOP_GROUP hanya untuk kompleks/interchange yang lebih luas
    dan tidak boleh menggabungkan dua STOP_ID berbeda menjadi
    satu halte statistik.
  */
  const logicalId =
    getStopLogicalId(
      feature
    );

  if (logicalId) {
    return `STOP:${logicalId}`;
  }

  /*
    Backward compatibility:
    data lama tanpa STOP_ID masih boleh memakai STOP_GROUP.
  */
  const groupId =
    getStopGroupId(
      feature
    );

  if (groupId) {
    return `LEGACY_GROUP:${groupId}`;
  }

  return `GEOM:${getStopKey(feature)}`;
}


function normalizeStopActivity(value) {
  const code =
    cleanText(value)
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  const aliases = {
    BOARD: "BOARD",
    BOARDING: "BOARD",
    NAIK: "BOARD",
    PENAIKAN: "BOARD",

    ALIGHT: "ALIGHT",
    ALIGHTING: "ALIGHT",
    TURUN: "ALIGHT",
    PENURUNAN: "ALIGHT",

    BOTH: "BOTH",
    BOARD_ALIGHT: "BOTH",
    BOARDING_ALIGHTING: "BOTH"
  };

  return aliases[code] || "";
}


function getStopActivityForRoute(
  feature,
  routeId
) {
  const p =
    feature?.properties ?? {};

  const activityMap =
    parseRouteMap(
      p.ACT_MAP ??
      ""
    );

  const routeActivity =
    normalizeStopActivity(
      activityMap[
        String(routeId ?? "")
      ]
    );

  /*
    ACT_MAP kosong = kondisi normal:
    penaikan dan penurunan.
  */
  return routeActivity || "BOTH";
}


function getStopActivityInfo(
  feature,
  routeId
) {
  const activity =
    getStopActivityForRoute(
      feature,
      routeId
    );

  if (activity === "BOARD") {
    return {
      code: "BOARD",
      title: "Penaikan saja",
      symbol: "↑"
    };
  }

  if (activity === "ALIGHT") {
    return {
      code: "ALIGHT",
      title: "Penurunan saja",
      symbol: "↓"
    };
  }

  return {
    code: "BOTH",
    title: "Penaikan & Penurunan",
    symbol: "↕"
  };
}


function getStopGroupFeatures(
  feature,
  routeId = ""
) {
  if (!stopData?.features) {
    return feature ? [feature] : [];
  }

  const logicalKey =
    getLogicalStopKey(
      feature
    );

  return stopData.features
    .filter(
      item =>
        getLogicalStopKey(
          item
        ) === logicalKey
    )
    .filter(
      item => {
        if (!routeId) {
          return true;
        }

        const regularMember =
          stopServesRoute(
            item,
            routeId
          );

        const operational =
          getOperationalMapValue(
            item,
            routeId
          );

        return (
          regularMember ||
          operational === "TEMP_SERVED" ||
          operational === "TEMP_TERMINUS" ||
          operational === "NOT_SERVED"
        );
      }
    );
}


function chooseStopGroupRepresentative(
  features,
  routeId
) {
  if (!features?.length) {
    return null;
  }

  /*
    Saat daftar halte mewakili dua titik fisik terminus,
    titik penaikan lebih berguna sebagai default untuk user
    yang ingin memulai perjalanan.
  */
  return (
    /*
      Jika halte logis memiliki BASE + TEMPORARY untuk
      diversion aktif, panel/list memakai titik temporary
      sebagai representasi aktif.
    */
    features.find(
      feature =>
        isTemporaryStopActiveForRoute(
          feature,
          routeId
        )
    )
    ||
    features.find(
      feature =>
        getOperationalStopState(
          feature,
          routeId
        ).state !== "not-served"
        &&
        getStopActivityForRoute(
          feature,
          routeId
        ) === "BOARD"
    )
    ||
    features.find(
      feature =>
        getOperationalStopState(
          feature,
          routeId
        ).state !== "not-served"
    )
    ||
    features[0]
  );
}


function getLogicalOperationalStopEntries(
  routeId,
  { includeNotServed = true } = {}
) {
  const cacheKey =
    `logical:${getRouteDirectionRuntimeCacheKey(routeId)}:${includeNotServed ? "all" : "active"}`;

  if (logicalOperationalStopEntriesCache.has(cacheKey)) {
    return logicalOperationalStopEntriesCache.get(cacheKey);
  }

  const rawEntries =
    getOperationalStopListEntries(
      routeId
    )
      .filter(
        entry =>
          includeNotServed ||
          entry.state !== "not-served"
      );

  const grouped =
    new Map();

  rawEntries.forEach(entry => {
    const logicalKey =
      getLogicalStopKey(
        entry.feature
      );

    if (!grouped.has(logicalKey)) {
      grouped.set(
        logicalKey,
        []
      );
    }

    grouped.get(logicalKey)
      .push(entry);
  });

  const result = Array.from(
    grouped.entries()
  )
    .map(
      ([logicalKey, groupEntries]) => {
        const physicalFeatures =
          groupEntries.map(
            entry => entry.feature
          );

        const representative =
          chooseStopGroupRepresentative(
            physicalFeatures,
            routeId
          )
          ||
          groupEntries[0].feature;

        const representativeEntry =
          groupEntries.find(
            entry =>
              entry.feature ===
              representative
          )
          ||
          groupEntries[0];

        return {
          ...representativeEntry,
          feature: representative,
          logicalKey,
          physicalFeatures,
          physicalCount:
            physicalFeatures.length
        };
      }
    )
    .sort(
      (a, b) => {
        const seqA =
          getDirectionalSortSequence(
            a.feature,
            routeId
          );

        const seqB =
          getDirectionalSortSequence(
            b.feature,
            routeId
          );

        if (seqA !== seqB) {
          return seqA - seqB;
        }

        return getStopDisplayName(
          a.feature
        ).localeCompare(
          getStopDisplayName(
            b.feature
          ),
          "id"
        );
      }
    );

  logicalOperationalStopEntriesCache.set(cacheKey, result);
  return result;
}


/*
  =========================================================
  HALTE NON-TERMINUS DENGAN TITIK TERPISAH
  =========================================================

  Data yang dibaca:
    STOP_GROUP = identitas halte logis
    DIR_MAP    = arah pelayanan masing-masing titik fisik

  Contoh:
    Titik A
      STOP_GROUP = BRT123
      DIR_MAP    = BRT_01:Kota

    Titik B
      STOP_GROUP = BRT123
      DIR_MAP    = BRT_01:Blok M

  Hasil:
    - 2 marker fisik di peta
    - 1 entri halte di daftar
    - popup tiap marker menjelaskan arah titik tersebut
    - tombol dapat berpindah ke titik arah sebaliknya
*/


function getDirectionDestinationLabel(
  feature,
  routeId
) {
  const fullLabel =
    getDirectionLabel(
      getStopDirection(
        feature,
        routeId
      )
    );

  return String(
    fullLabel ?? ""
  )
    .replace(
      /^Arah\s+/i,
      ""
    )
    .trim();
}


function getSplitNonTerminusStopContext(
  feature,
  routeId
) {
  if (
    !feature ||
    !routeId ||
    isStopTerminusForRoute(
      feature,
      routeId
    )
  ) {
    return null;
  }

  const groupId =
    getStopGroupId(
      feature
    );

  if (!groupId) {
    return null;
  }

  const groupFeatures =
    getStopGroupFeatures(
      feature,
      routeId
    );

  if (
    groupFeatures.length < 2
  ) {
    return null;
  }

  const currentDirection =
    normalizeDirectionCode(
      getStopDirection(
        feature,
        routeId
      )
    );

  /*
    Note titik terpisah hanya dibuat bila titik yang sedang
    dibuka memang memiliki arah spesifik.
    DIR_MAP kosong tetap berarti dua arah.
  */
  if (
    !currentDirection ||
    currentDirection === "BOTH"
  ) {
    return null;
  }

  const counterpart =
    groupFeatures.find(
      candidate => {
        if (
          candidate === feature
          ||
          getStopKey(candidate) ===
          getStopKey(feature)
        ) {
          return false;
        }

        const candidateDirection =
          normalizeDirectionCode(
            getStopDirection(
              candidate,
              routeId
            )
          );

        return Boolean(
          candidateDirection &&
          candidateDirection !== "BOTH" &&
          candidateDirection !==
          currentDirection
        );
      }
    );

  if (!counterpart) {
    return null;
  }

  const currentDestination =
    getDirectionDestinationLabel(
      feature,
      routeId
    );

  const counterpartDestination =
    getDirectionDestinationLabel(
      counterpart,
      routeId
    );

  if (
    !currentDestination ||
    !counterpartDestination
  ) {
    return null;
  }

  return {
    groupId,
    currentDestination,
    counterpartDestination,
    counterpart,
    counterpartStopKey:
      getStopKey(
        counterpart
      )
  };
}


function buildSplitNonTerminusStopNoteHTML(
  feature,
  routeId
) {
  const context =
    getSplitNonTerminusStopContext(
      feature,
      routeId
    );

  if (!context) {
    return "";
  }

  return `
    <div class="stop-popup-split-note">
      <div class="stop-popup-split-note-title">
        <span
          class="stop-popup-split-note-icon"
          aria-hidden="true"
        >
          ↔
        </span>

        <strong>
          Titik halte terpisah
        </strong>
      </div>

      <div class="stop-popup-split-note-text">
        Titik ini melayani
        <strong>
          arah ${escapeHTML(
            context.currentDestination
          )}
        </strong>.
        Titik arah
        <strong>
          ${escapeHTML(
            context.counterpartDestination
          )}
        </strong>
        berada di lokasi terpisah dalam halte yang sama.
      </div>

      <button
        type="button"
        class="stop-popup-split-action"
        data-split-stop-key="${escapeHTML(
          context.counterpartStopKey
        )}"
        data-route-id="${escapeHTML(
          routeId
        )}"
        title="Lihat titik arah ${escapeHTML(
          context.counterpartDestination
        )}"
      >
        <span>
          Lihat titik arah
          ${escapeHTML(
            context.counterpartDestination
          )}
        </span>

        <span
          class="stop-popup-split-action-arrow"
          aria-hidden="true"
        >
          →
        </span>
      </button>
    </div>
  `;
}


function isStopTerminusForRoute(
  feature,
  routeId
) {
  const operational =
    getOperationalStopState(
      feature,
      routeId
    );

  const role =
    getStopRoleForRoute(
      feature,
      routeId
    );

  return Boolean(
    operational.temporaryTerminus ||
    role === "Terminus" ||
    role === "Transit-Terminus"
  );
}


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
    role === "transit-terminus" ||
    role === "transit_terminus" ||
    role === "transit terminus" ||
    role === "terminus-transit" ||
    role === "terminus transit"
  ) {
    return "Transit-Terminus";
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

  if (role === "Transit-Terminus") {
    return "is-transit-terminus";
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
  Field: INT_NM

  Dua pola key diterima:

  A. REKOMENDASI v27 — key = STOP_ID/GEOM_ID target
     BRT073:Lebak Bulus;MRT001:Lebak Bulus BSI

     Pasangannya berada pada INT_STOP:
     BRT:BRT073;MRT_NS:MRT001

  B. LEGACY — key = kode integrasi
     BRT:Lebak Bulus;MRT_NS:Lebak Bulus BSI

  Pola A lebih tahan terhadap perubahan operator/lin karena nama
  melekat langsung pada target fisik/logis yang dituju.
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


/*
  ID target integrasi. Field utama yang direkomendasikan:

    INT_STOP = MRT_NS:MRT012;BRT:BRT073

  Nilainya boleh STOP_ID (logical stop) atau GEOM_ID (physical
  point). Jika GEOM_ID diberikan, titik fisik tersebut diprioritaskan.

  Alias diterima agar migrasi data tidak kaku:
  INT_STOP_ID / INT_ID / INT_TARGET.
*/
function getStopIntegrationTargetMap(feature) {
  const p =
    feature?.properties ?? {};

  return parseRouteMultiMap(
    p.INT_STOP ??
    p.INT_STOP_ID ??
    p.INT_ID ??
    p.INT_TARGET ??
    ""
  );
}


function getIntegrationMultiMapValues(
  map,
  code
) {
  const targetCode =
    String(code ?? "")
      .trim()
      .toUpperCase();

  if (!targetCode) {
    return [];
  }

  for (const [key, rawValues] of Object.entries(map ?? {})) {
    if (String(key).trim().toUpperCase() !== targetCode) {
      continue;
    }

    return (Array.isArray(rawValues) ? rawValues : [rawValues])
      .map(value => String(value ?? "").trim())
      .filter(Boolean);
  }

  return [];
}


/*
  Mengembalikan seluruh ID target yang disebut di INT_STOP.
  Dipakai validator agar INT_NM keyed-by-target-ID tidak salah
  dianggap sebagai "kode yang tidak ada di INTEGRASI".
*/
function getIntegrationTargetIdsFromMap(map) {
  return Object.values(map ?? {})
    .flatMap(rawValues =>
      (Array.isArray(rawValues) ? rawValues : [rawValues])
        .map(value => String(value ?? "").trim())
        .filter(Boolean)
    );
}


function integrationKeyEquals(a, b) {
  return String(a ?? "")
    .trim()
    .toUpperCase() ===
    String(b ?? "")
      .trim()
      .toUpperCase();
}


/*
  Resolver label integrasi v27.

  Prioritas:
  1. INT_NM keyed-by-target-ID, contoh BRT073:Lebak Bulus
  2. INT_NM keyed-by-kode-integrasi, contoh BRT:Lebak Bulus

  legacyIndex menjaga pairing lama ketika satu kode integrasi
  mempunyai beberapa nama yang ditulis berurutan.
*/
function getIntegrationRelatedName(
  integrationNameMap,
  integrationCode,
  targetStopId = "",
  legacyIndex = 0
) {
  if (hasText(targetStopId)) {
    const targetNames = getIntegrationMultiMapValues(
      integrationNameMap,
      targetStopId
    );

    if (targetNames.length) {
      return targetNames[0];
    }
  }

  const legacyNames = getIntegrationMultiMapValues(
    integrationNameMap,
    integrationCode
  );

  return legacyNames[legacyIndex] || "";
}


/*
  Memeriksa apakah sebuah key INT_NM sah. Key dianggap sah bila:
  - sama dengan salah satu kode INTEGRASI; atau
  - sama dengan salah satu target STOP_ID/GEOM_ID pada INT_STOP.
*/
function isValidIntegrationNameKey(
  key,
  integrations = [],
  integrationTargetMap = {}
) {
  const targetIds = getIntegrationTargetIdsFromMap(
    integrationTargetMap
  );

  return (Array.isArray(integrations) ? integrations : [])
    .some(code => integrationKeyEquals(code, key)) ||
    targetIds.some(targetId => integrationKeyEquals(targetId, key));
}



/*
  =========================================================
  INTEGRATION STATUS
  =========================================================

  INT_STATUS hanya perlu diisi untuk integrasi non-eksisting.

  Format utama:
    KODE:Nama=Status

  Contoh:
    MRT_NS:Monumen Nasional=Rencana;
    LRT_JKT_S:Velodrome=Usulan

  Fallback opsional yang juga diterima:
    KODE=Status

  Jika tidak ada pasangan yang cocok, status dianggap Existing.
*/
function normalizeIntegrationStatus(value) {
  const status =
    normalizeStatus(value);

  return [
    "Existing",
    "Construction",
    "Planned",
    "Proposed",
    "Conceptual"
  ].includes(status)
    ? status
    : "";
}


function normalizeIntegrationStatusName(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/\s+/g, " ");
}


function getIntegrationStatusExactKey(
  code,
  relatedName
) {
  return `${String(code ?? "")
    .trim()
    .toUpperCase()}::${normalizeIntegrationStatusName(
      relatedName
    )}`;
}


function parseIntegrationStatusMap(value) {
  const result = {
    exact: {},
    byCode: {},
    entries: []
  };

  splitIds(value)
    .forEach(item => {
      const equalsIndex =
        item.lastIndexOf("=");

      if (equalsIndex === -1) {
        result.entries.push({
          raw: item,
          code: "",
          relatedName: "",
          statusRaw: "",
          status: "",
          valid: false
        });

        return;
      }

      const left =
        item
          .slice(0, equalsIndex)
          .trim();

      const statusRaw =
        item
          .slice(equalsIndex + 1)
          .trim();

      const status =
        normalizeIntegrationStatus(
          statusRaw
        );

      const colonIndex =
        left.indexOf(":");

      const code =
        String(
          colonIndex === -1
            ? left
            : left.slice(0, colonIndex)
        )
          .trim()
          .toUpperCase();

      const relatedName =
        colonIndex === -1
          ? ""
          : left
              .slice(colonIndex + 1)
              .trim();

      const entry = {
        raw: item,
        code,
        relatedName,
        statusRaw,
        status,
        valid:
          Boolean(code && status)
      };

      result.entries.push(entry);

      if (!entry.valid) {
        return;
      }

      if (relatedName) {
        result.exact[
          getIntegrationStatusExactKey(
            code,
            relatedName
          )
        ] = status;
      }
      else {
        result.byCode[code] =
          status;
      }
    });

  return result;
}


function normalizeIntegrationRelationStatus(
  value
) {
  const code =
    cleanText(value)
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  const aliases = {
    INTEGRATED: "INTEGRATED",
    TERINTEGRASI: "INTEGRATED",

    CONNECTION: "CONNECTION",
    SAMBUNGAN: "CONNECTION",
    CONNECTED: "CONNECTION",

    NONE: "NONE",
    TIDAK_ADA: "NONE",

    UNKNOWN: "UNKNOWN",
    BELUM_DIKETAHUI: "UNKNOWN",
    BELUM_DIVERIFIKASI: "UNKNOWN"
  };

  return aliases[code] || "";
}


function getStopIntegrationRelationStatus(
  feature
) {
  const raw =
    feature
      ?.properties
      ?.INT_STATUS
    ??
    feature
      ?.properties
      ?.INTEGRASI_STATUS
    ??
    "";

  return normalizeIntegrationRelationStatus(
    raw
  );
}


function getStopIntegrationStatusMap(feature) {
  const p =
    feature?.properties ?? {};

  const raw =
    p.INT_STATUS ??
    p.INTEGRASI_STATUS ??
    "";

  const relationStatus =
    normalizeIntegrationRelationStatus(
      raw
    );

  /*
    v2.0 memakai INT_STATUS sebagai status HUBUNGAN:
    INTEGRATED / CONNECTION / NONE / UNKNOWN.

    Bila value tersebut ditemukan, tidak lagi diperlakukan
    sebagai map status Eksisting/Rencana per lin.
  */
  if (relationStatus) {
    return {
      exact: {},
      byCode: {},
      entries: [],
      relationStatus,
      isV2Relation: true
    };
  }

  /*
    Backward compatibility untuk file lama:
    KODE:Nama=Rencana;KODE=Usulan
  */
  return {
    ...parseIntegrationStatusMap(
      raw
    ),
    relationStatus: "",
    isV2Relation: false
  };
}


function getPaidLinkStatus(feature) {
  const code =
    cleanText(
      feature
        ?.properties
        ?.PAID_LINK
    )
      .toUpperCase();

  return [
    "YES",
    "NO",
    "NA",
    "UNKNOWN"
  ].includes(code)
    ? code
    : "";
}


function getLinkType(feature) {
  const code =
    cleanText(
      feature
        ?.properties
        ?.LINK_TYPE
    )
      .toUpperCase();

  return [
    "CONCOURSE",
    "BRIDGE",
    "UNDERPASS",
    "CROSSING",
    "NONE",
    "UNKNOWN"
  ].includes(code)
    ? code
    : "";
}


function getLinkTypeLabel(value) {
  return {
    CONCOURSE: "Area penghubung",
    BRIDGE: "Jembatan",
    UNDERPASS: "Terowongan pejalan kaki",
    CROSSING: "Penyeberangan",
    NONE: "Tidak ada koneksi khusus",
    UNKNOWN: "Belum diketahui"
  }[value] || value;
}


function buildIntegrationRelationshipHTML(
  feature
) {
  const integrations =
    getStopIntegrations(
      feature
    );

  /*
    Metadata hubungan simpul hanya aman ditampilkan bila satu
    integrasi dapat dipetakan secara jelas. UI sengaja dibuat
    ringkas karena WebGIS berfungsi sebagai infografis, bukan
    viewer atribut.
  */
  if (integrations.length !== 1) {
    return "";
  }

  const relation =
    getStopIntegrationRelationStatus(
      feature
    );

  const paidLink =
    getPaidLinkStatus(
      feature
    );

  const linkType =
    getLinkType(
      feature
    );

  const relationInfo = {
    INTEGRATED: {
      label: "Terintegrasi",
      className: "is-integrated"
    },
    CONNECTION: {
      label: "Sambungan",
      className: "is-connection"
    },
    UNKNOWN: {
      label: "Belum diverifikasi",
      className: "is-unknown"
    }
  }[relation];

  const linkText =
    linkType &&
    ![
      "NONE",
      "UNKNOWN"
    ].includes(
      linkType
    )
      ? getLinkTypeLabel(
          linkType
        )
      : "";

  /*
    PAID_LINK=YES tidak perlu diberi teks karena menambah
    kepadatan visual. Kondisi NO tetap ditampilkan karena
    merupakan informasi operasional yang perlu diketahui user.
  */
  const paidText =
    paidLink === "NO"
      ? "Perlu keluar paid area"
      : "";

  if (
    !relationInfo &&
    !linkText &&
    !paidText
  ) {
    return "";
  }

  return `
    <div class="integration-relationship-meta">
      ${
        relationInfo
          ? `
            <span class="integration-relationship-pill ${relationInfo.className}">
              ${escapeHTML(relationInfo.label)}
            </span>
          `
          : ""
      }

      ${
        linkText
          ? `
            <span class="integration-relationship-detail">
              ${escapeHTML(linkText)}
            </span>
          `
          : ""
      }

      ${
        paidText
          ? `
            <span class="integration-relationship-detail is-important">
              ${escapeHTML(paidText)}
            </span>
          `
          : ""
      }
    </div>
  `;
}

function getIntegrationStatusFromMap(
  integrationStatusMap,
  code,
  relatedName = ""
) {
  const normalizedCode =
    String(code ?? "")
      .trim()
      .toUpperCase();

  const exactKey =
    getIntegrationStatusExactKey(
      normalizedCode,
      relatedName
    );

  const exactStatus =
    integrationStatusMap
      ?.exact
      ?.[exactKey];

  if (exactStatus) {
    return exactStatus;
  }

  const codeStatus =
    integrationStatusMap
      ?.byCode
      ?.[normalizedCode];

  return codeStatus || "Existing";
}


function getIntegrationStatusPriority(value) {
  const status =
    normalizeIntegrationStatus(value)
    || "Existing";

  return {
    Existing: 10,
    Construction: 15,
    Planned: 20,
    Proposed: 30,
    Conceptual: 40
  }[status] ?? 99;
}


function getIntegrationStatusClass(value) {
  const status =
    normalizeIntegrationStatus(value)
    || "Existing";

  return {
    Existing: "is-existing",
    Construction: "is-construction",
    Planned: "is-planned",
    Proposed: "is-proposed",
    Conceptual: "is-conceptual"
  }[status] || "is-existing";
}


function getIntegrationPlaceStatus(services) {
  const statuses =
    Array.from(
      new Set(
        (services || [])
          .map(
            service =>
              normalizeIntegrationStatus(
                service?.integrationStatus
              ) || "Existing"
          )
      )
    );

  if (!statuses.length) {
    return "Existing";
  }

  /*
    Dalam kondisi normal seluruh lin yang menunjuk stasiun
    fisik yang sama sebaiknya mempunyai status yang sama.

    Jika datanya campuran, status non-eksisting dengan tingkat
    paling lanjut tetap ditampilkan agar user tidak salah
    membaca titik tersebut sebagai seluruhnya eksisting.
  */
  return statuses
    .slice()
    .sort(
      (a, b) =>
        getIntegrationStatusPriority(b)
        -
        getIntegrationStatusPriority(a)
    )[0];
}


function buildIntegrationStatusPill(status) {
  const normalized =
    normalizeIntegrationStatus(status)
    || "Existing";

  if (normalized === "Existing") {
    return "";
  }

  return `
    <span
      class="integration-place-status ${getIntegrationStatusClass(normalized)}"
      title="Status integrasi: ${escapeHTML(getStatusLabel(normalized))}"
    >
      ${escapeHTML(getStatusLabel(normalized))}
    </span>
  `;
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

  return (
    info?.brt ||
    info?.brtOperator ||
    info?.operatorKey === "TRANSJAKARTA"
  )
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
          isTemporaryStopFeature(
            feature
          )
          &&
          !isTemporaryStopActiveForRoute(
            feature,
            routeId
          )
        ) {
          return false;
        }

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

        const routeMode =
          getRouteMode(
            getRouteById(routeId)
          );

        const selectedStatus =
          normalizeStatus(statusSelect?.value || "ALL");

        if (
          routeMode !== "BRT" &&
          selectedStatus !== "ALL" &&
          normalizeStatus(feature?.properties?.STATUS) !== selectedStatus
        ) {
          return false;
        }

        if (
          normalizeStatus(feature?.properties?.STATUS) === "Construction" &&
          !isConstructionStatusAllowedForMode(routeMode)
        ) {
          return false;
        }

        if (
          !isStopVisibleInActiveDirection(
            feature,
            routeId
          )
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

  const currentLogicalKey =
    getLogicalStopKey(feature);

  const currentIndex =
    stops.findIndex(
      item =>
        getLogicalStopKey(item) ===
        currentLogicalKey
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
  Sinkronkan affordance scroll hanya ketika daftar integrasi
  benar-benar lebih tinggi dari ruang yang tersedia. Fade kecil
  di bagian bawah hilang otomatis saat pengguna mencapai akhir.
*/
function syncStopPopupIntegrationOverflow(popupElement) {
  const section =
    popupElement?.querySelector(
      ".stop-popup-section--integration"
    );

  const scroller =
    section?.querySelector(
      ".stop-popup-integration-scroll"
    );

  if (!section || !scroller) {
    return;
  }

  const updateState = () => {
    const overflow =
      scroller.scrollHeight >
      scroller.clientHeight + 2;

    const atBottom =
      !overflow ||
      scroller.scrollTop +
        scroller.clientHeight >=
        scroller.scrollHeight - 2;

    section.classList.toggle(
      "has-scroll-overflow",
      overflow
    );

    section.classList.toggle(
      "is-scroll-end",
      atBottom
    );
  };

  updateState();

  if (!scroller.dataset.overflowBound) {
    scroller.dataset.overflowBound = "true";
    scroller.addEventListener(
      "scroll",
      updateState,
      { passive: true }
    );
  }

  requestAnimationFrame(updateState);
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

/*
  ==========================================================
  SPLIT STOP — DELEGATED COUNTERPART CLICK
  ==========================================================

  Popup Leaflet dapat dibuat ulang, jadi listener ditempel
  sekali pada container peta.
*/
map
  .getContainer()
  .addEventListener(
    "click",
    event => {
      const button =
        event.target
          ?.closest(
            ".stop-popup-split-action"
          );

      if (!button) {
        return;
      }

      const stopKey =
        button.dataset
          .splitStopKey;

      const routeId =
        button.dataset
          .routeId;

      if (
        !stopKey ||
        !routeId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (
        event?.originalEvent
      ) {
        L.DomEvent.stopPropagation(
          event.originalEvent
        );
      }
      else {
        L.DomEvent.stopPropagation(
          event
        );
      }

      /*
        Tetap pada rute yang sama dan zoom yang sama.
        selectStop(..., false) melakukan pan halus ke titik
        fisik pasangan, lalu membuka popup baru.
      */
      selectStop(
        stopKey,
        routeId,
        false,
        0.62
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
    Jika hasil pencarian merupakan titik non-eksisting,
    aktifkan kontrol gabungan Usulan + Gagasan.
  */
  if (
    isProposedStop(feature) ||
    isConceptualStop(feature)
  ) {
    setNonExistingStopsVisible(true);
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

function createAbortError() {
  return new DOMException(
    "Request dibatalkan.",
    "AbortError"
  );
}


function waitWithAbort(
  duration,
  signal
) {
  if (signal?.aborted) {
    return Promise.reject(
      createAbortError()
    );
  }

  if (duration <= 0) {
    return Promise.resolve();
  }

  return new Promise(
    (resolve, reject) => {
      const timeoutId =
        setTimeout(
          () => {
            signal?.removeEventListener(
              "abort",
              abort
            );

            resolve();
          },
          duration
        );

      const abort =
        () => {
          clearTimeout(timeoutId);
          reject(createAbortError());
        };

      signal?.addEventListener(
        "abort",
        abort,
        { once: true }
      );
    }
  );
}


async function requestNominatim(
  params,
  signal
) {
  const cacheKey =
    params.toString();

  if (
    nominatimResponseCache.has(
      cacheKey
    )
  ) {
    return nominatimResponseCache.get(
      cacheKey
    );
  }

  const execute =
    async () => {
      const waitDuration =
        Math.max(
          0,
          NOMINATIM_MIN_INTERVAL_MS -
            (
              Date.now() -
              nominatimLastRequestAt
            )
        );

      await waitWithAbort(
        waitDuration,
        signal
      );

      if (signal?.aborted) {
        throw createAbortError();
      }

      nominatimLastRequestAt =
        Date.now();

      const response =
        await fetch(
          `${NOMINATIM_ENDPOINT}?${cacheKey}`,
          {
            signal,
            cache: "default",
            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (!response.ok) {
        const error =
          new Error(
            `Nominatim HTTP ${response.status}`
          );

        error.code =
          `HTTP_${response.status}`;

        throw error;
      }

      const results =
        await response.json();

      const normalizedResults =
        Array.isArray(results)
          ? results
          : [];

      nominatimResponseCache.set(
        cacheKey,
        normalizedResults
      );

      if (
        nominatimResponseCache.size >
        NOMINATIM_CACHE_LIMIT
      ) {
        const oldestKey =
          nominatimResponseCache
            .keys()
            .next()
            .value;

        nominatimResponseCache.delete(
          oldestKey
        );
      }

      return normalizedResults;
    };

  const queuedRequest =
    nominatimRequestQueue.then(
      execute,
      execute
    );

  nominatimRequestQueue =
    queuedRequest.catch(
      () => undefined
    );

  return queuedRequest;
}

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
      - pencarian hanya setelah tindakan eksplisit user
      - minimal 3 karakter
      - limiter bersama maksimal satu request per 1,1 detik
      - hasil query disimpan dalam cache sesi
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

    const results =
      await requestNominatim(
        params,
        poiSearchAbortController.signal
      );

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
        radius: 8,
        color: "#ffffff",
        weight: 2.5,
        fillColor: "#007ac2",
        fillOpacity: 1
      }
    )
      .addTo(map);

  /*
    POI ditempatkan pada pane khusus di atas rute/halte.
    Tidak memakai fungsi style halte karena POI bukan fitur
    stop dan sebelumnya menyebabkan ReferenceError.
  */
  poiMarker.bringToFront();

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

  const targetZoom =
    Math.max(
      15,
      Math.min(
        17,
        map.getZoom()
      )
    );

  /*
    Klik hasil POI harus langsung membawa pengguna ke lokasi.
    Popup dibuka setelah kamera selesai bergerak; fallback timer
    menjaga popup tetap muncul bila moveend tidak terpanggil.
  */
  let poiPopupOpened = false;

  const openPoiPopupAfterMove =
    () => {
      if (poiPopupOpened) {
        return;
      }

      poiPopupOpened = true;

      poiMarker
        ?.openPopup();
    };

  map.once(
    "moveend",
    openPoiPopupAfterMove
  );

  map.flyTo(
    latlng,
    targetZoom,
    {
      animate: true,
      duration: 0.65
    }
  );

  setTimeout(
    openPoiPopupAfterMove,
    850
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

      /*
        Tidak ada request saat mengetik. Ini sengaja mencegah
        client-side autocomplete pada layanan publik Nominatim.
      */
      closePoiSearchResults();
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
        return;
      }

      if (
        event.key === "Enter"
      ) {
        event.preventDefault();

        searchPoi(
          poiSearchInput.value
        );
      }
    }
  );


poiSearchSubmit
  ?.addEventListener(
    "click",
    () => {
      searchPoi(
        poiSearchInput?.value
      );
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
      "Klik titik atau nama halte/stasiun di peta maupun daftar untuk membuka informasi titik, integrasi, dan urutan perjalanan.",
    target: "tutorial-stop",
    visual: "stop"
  },
  {
    title: "Berpindah rute dari popup",
    text:
      "Pada popup halte, badge Lin/Koridor dapat diklik untuk berpindah rute tanpa meninggalkan titik yang sama.",
    target: "tutorial-route-badges",
    visual: "badges"
  },
  {
    title: "Cari tujuan",
    text:
      "Gunakan Cari Lokasi untuk menemukan halte, stasiun, atau tempat dari satu kotak pencarian.",
    target: "global-search",
    visual: "search"
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
        <span class="tour-mini-stop-label">
          Klik titik atau nama
        </span>
      </div>
    `;
  }

  if (type === "search") {
    return `
      <div class="tour-mini-search">
        <span class="tour-mini-search-icon" aria-hidden="true">⌕</span>
        <span class="tour-mini-search-placeholder">Halte, stasiun, atau tempat…</span>
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


function getProductTourDemoStopFeature() {
  if (
    productTourDemoStopFeature
  ) {
    return productTourDemoStopFeature;
  }

  if (!stopData?.features) {
    return null;
  }

  /*
    STOP_ID BRT015 diprioritaskan karena merupakan ID Monumen
    Nasional pada dataset BRT saat ini. Fallback nama menjaga
    tutorial tetap bekerja jika ID berubah pada pembaruan data.
  */
  productTourDemoStopFeature =
    stopData.features.find(
      feature =>
        String(
          feature
            ?.properties
            ?.STOP_ID
          ?? ""
        ).trim() === "BRT015"
    )
    ||
    findStopFeatureByDisplayName(
      "Monumen Nasional",
      "BRT"
    )
    ||
    null;

  return productTourDemoStopFeature;
}


function getProductTourDemoStopLatLng() {
  const feature =
    getProductTourDemoStopFeature();

  const geometry =
    feature?.geometry;

  if (
    !geometry ||
    geometry.type !== "Point" ||
    !Array.isArray(
      geometry.coordinates
    )
  ) {
    return null;
  }

  const [
    lng,
    lat
  ] = geometry.coordinates;

  if (
    !Number.isFinite(
      Number(lat)
    ) ||
    !Number.isFinite(
      Number(lng)
    )
  ) {
    return null;
  }

  return L.latLng(
    Number(lat),
    Number(lng)
  );
}


function clearProductTourDemoTimer() {
  if (
    productTourDemoTimerId !== null
  ) {
    clearTimeout(
      productTourDemoTimerId
    );

    productTourDemoTimerId = null;
  }
}


function clearProductTourStopHighlightTimer() {
  if (
    productTourStopHighlightTimerId !== null
  ) {
    clearTimeout(
      productTourStopHighlightTimerId
    );

    productTourStopHighlightTimerId = null;
  }
}


function clearProductTourListFocus() {
  document
    .querySelectorAll(
      ".product-tour-list-focus"
    )
    .forEach(
      element =>
        element.classList.remove(
          "product-tour-list-focus"
        )
    );
}


function clearProductTourListDemo() {
  clearProductTourStopHighlightTimer();
  clearProductTourListFocus();

  routeDetailCard
    ?.classList
    .remove(
      "product-tour-list-demo-open"
    );

  if (
    productTourInjectedListDemo
  ) {
    stopListEl.innerHTML = "";
    productTourInjectedListDemo = false;
  }

  productTourStopHighlightPhase =
    "map";
}


function ensureProductTourListDemo() {
  if (isMobileLayout()) {
    return null;
  }

  /*
    Bila daftar asli sudah tersedia (misalnya tutorial dibuka
    manual ketika satu rute aktif), jangan mengubah isinya.
  */
  const existingItems =
    Array.from(
      stopListEl
        ?.querySelectorAll(
          ".stop-list-item"
        ) || []
    );

  if (existingItems.length) {
    return existingItems[0];
  }

  const feature =
    getProductTourDemoStopFeature();

  if (!feature || !stopListEl) {
    return null;
  }

  const routeId = "BRT_01";
  const routeSeq =
    getStopSequenceRaw(
      feature,
      routeId
    ) || "";

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

  const roleHTML =
    role &&
    ![
      "reguler",
      "regular",
      "normal"
    ].includes(
      String(role)
        .trim()
        .toLowerCase()
    )
      ? `
        <span class="stop-role ${escapeHTML(roleClass)}">
          ${escapeHTML(role)}
        </span>
      `
      : "";

  stopListEl.innerHTML = `
    <div class="stop-list-heading">
      HALTE
    </div>

    <div class="stop-list-help">
      Klik nama halte untuk zoom ke lokasi.
    </div>

    <div class="stop-list-scroll product-tour-demo-stop-list-scroll">
      <div
        class="stop-list-item product-tour-demo-stop-list-item ${roleHTML ? "has-edge-role-badge" : ""}"
        aria-hidden="true"
      >
        <div class="stop-list-item-left">
          <span class="stop-list-sequence">
            <span class="stop-seq-badge">
              ${escapeHTML(routeSeq || "01")}
            </span>
          </span>

          <span class="stop-list-route-badges">
            ${buildSmallRouteBadge(routeId, feature)}
          </span>

          <span class="stop-list-name">
            ${escapeHTML(getStopDisplayName(feature))}
          </span>
        </div>

        <span class="stop-list-badges">
          ${roleHTML}
        </span>
      </div>
    </div>
  `;

  productTourInjectedListDemo = true;

  routeDetailCard
    ?.classList
    .add(
      "product-tour-list-demo-open"
    );

  return stopListEl
    .querySelector(
      ".product-tour-demo-stop-list-item"
    );
}


function getProductTourListTargetElement() {
  if (isMobileLayout()) {
    return null;
  }

  const items =
    Array.from(
      stopListEl
        ?.querySelectorAll(
          ".stop-list-item"
        ) || []
    );

  if (!items.length) {
    return ensureProductTourListDemo();
  }

  /*
    Utamakan baris terpilih yang terlihat. Jika tidak ada,
    pilih baris pertama yang sedang berada dalam viewport
    daftar. Ini menjaga tutorial manual tetap relevan meski
    user sebelumnya sudah menggulir daftar.
  */
  const scrollRect =
    stopListEl
      .querySelector(
        ".stop-list-scroll"
      )
      ?.getBoundingClientRect();

  const isVisible =
    element => {
      const rect =
        element
          .getBoundingClientRect();

      if (!scrollRect) {
        return (
          rect.bottom > 0 &&
          rect.top < window.innerHeight
        );
      }

      return (
        rect.bottom > scrollRect.top &&
        rect.top < scrollRect.bottom
      );
    };

  return (
    items.find(
      item =>
        item.classList.contains(
          "is-selected"
        ) &&
        isVisible(item)
    )
    ||
    items.find(isVisible)
    ||
    items[0]
  );
}


function setProductTourStopHighlightPhase(
  phase
) {
  productTourStopHighlightPhase =
    phase === "list"
      ? "list"
      : "map";

  clearProductTourListFocus();

  if (
    productTourStopHighlightPhase ===
    "list"
  ) {
    const target =
      getProductTourListTargetElement();

    target
      ?.classList
      .add(
        "product-tour-list-focus"
      );
  }

  positionProductTour();
}


function scheduleProductTourStopHighlightSequence() {
  clearProductTourStopHighlightTimer();

  if (isMobileLayout()) {
    productTourStopHighlightPhase =
      "map";
    return;
  }

  ensureProductTourListDemo();
  setProductTourStopHighlightPhase(
    "map"
  );

  /*
    Fase pertama memberi waktu user melihat bahwa titik/nama
    di peta dapat dipilih. Sesudah itu spotlight meluncur ke
    baris daftar dan berhenti di sana sampai user menekan
    Berikutnya / Sebelumnya.
  */
  productTourStopHighlightTimerId =
    setTimeout(
      () => {
        productTourStopHighlightTimerId =
          null;

        if (
          !productTour ||
          productTour.hidden ||
          PRODUCT_TOUR_STEPS[
            productTourIndex
          ]?.target !==
            "tutorial-stop"
        ) {
          return;
        }

        setProductTourStopHighlightPhase(
          "list"
        );
      },
      1850
    );
}


function stopProductTourDemoPulseAnimation() {
  if (
    productTourDemoPulseAnimationId !== null
  ) {
    cancelAnimationFrame(
      productTourDemoPulseAnimationId
    );

    productTourDemoPulseAnimationId =
      null;
  }
}


function startProductTourDemoPulseAnimation() {
  stopProductTourDemoPulseAnimation();

  if (
    !productTourDemoPulse ||
    !map.hasLayer(
      productTourDemoPulse
    )
  ) {
    return;
  }

  /*
    Hormati preferensi OS untuk reduced motion.
    Dalam mode ini highlight tetap tampil, hanya tidak bergerak.
  */
  if (
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    productTourDemoPulse
      .setRadius(15);

    productTourDemoPulse
      .setStyle({
        opacity: .92,
        weight: 3
      });

    return;
  }

  const startedAt =
    performance.now();

  const animate =
    now => {
      if (
        !productTourDemoPulse ||
        !map.hasLayer(
          productTourDemoPulse
        )
      ) {
        productTourDemoPulseAnimationId =
          null;

        return;
      }

      /*
        Pulse sinusoidal:
        - radius ±3 px
        - opacity ikut naik-turun
        - pusat marker tidak berubah sama sekali
      */
      const phase =
        (
          (now - startedAt)
          /
          1250
        )
        *
        Math.PI
        *
        2;

      const wave =
        (
          Math.sin(phase) + 1
        )
        /
        2;

      const radius =
        13.5 +
        wave * 4.5;

      const opacity =
        .58 +
        wave * .38;

      const weight =
        2.4 +
        wave * .8;

      productTourDemoPulse
        .setRadius(
          radius
        );

      productTourDemoPulse
        .setStyle({
          opacity,
          weight
        });

      productTourDemoPulseAnimationId =
        requestAnimationFrame(
          animate
        );
    };

  productTourDemoPulseAnimationId =
    requestAnimationFrame(
      animate
    );
}


function removeProductTourDemoLayers({
  closePopup = true
} = {}) {
  clearProductTourDemoTimer();
  clearProductTourListDemo();
  stopProductTourDemoPulseAnimation();

  if (
    closePopup &&
    productTourDemoMarker
  ) {
    try {
      productTourDemoMarker
        .closePopup();
    }
    catch (error) {
      // Tidak perlu mengganggu tutorial bila popup sudah hilang.
    }
  }

  if (
    productTourDemoPulse &&
    map.hasLayer(
      productTourDemoPulse
    )
  ) {
    map.removeLayer(
      productTourDemoPulse
    );
  }

  if (
    productTourDemoMarker &&
    map.hasLayer(
      productTourDemoMarker
    )
  ) {
    map.removeLayer(
      productTourDemoMarker
    );
  }

  productTourDemoPulse = null;
  productTourDemoMarker = null;

  document
    .querySelectorAll(
      ".product-tour-badges-focus"
    )
    .forEach(
      element =>
        element.classList.remove(
          "product-tour-badges-focus"
        )
    );
}


function restoreProductTourInitialMapView({
  animate = false
} = {}) {
  if (!productTourInitialMapView) {
    return;
  }

  const {
    center,
    zoom
  } = productTourInitialMapView;

  if (
    !center ||
    !Number.isFinite(
      Number(zoom)
    )
  ) {
    return;
  }

  map.setView(
    center,
    zoom,
    {
      animate:
        Boolean(animate)
    }
  );
}


function ensureProductTourDemoMarker() {
  const feature =
    getProductTourDemoStopFeature();

  const latlng =
    getProductTourDemoStopLatLng();

  if (
    !feature ||
    !latlng
  ) {
    return null;
  }

  if (
    productTourDemoMarker &&
    map.hasLayer(
      productTourDemoMarker
    )
  ) {
    return productTourDemoMarker;
  }

  /*
    Marker demo memakai tampilan halte BRT reguler dan berada
    di titik data sebenarnya. Marker ini tidak interaktif;
    seluruh fungsi klik tetap dijelaskan melalui tutorial.
  */
  productTourDemoMarker =
    L.circleMarker(
      latlng,
      {
        pane: "stopPane",
        radius: 7.5,
        color: "#c91f2c",
        weight: 3,
        fillColor: "#ffffff",
        fillOpacity: 1,
        opacity: 1,
        interactive: false
      }
    )
      .addTo(map);

  /*
    Ring highlight tutorial dibuat sebagai circleMarker agar
    pusat highlight benar-benar tepat di tengah titik halte.
    Pendekatan ini lebih stabil dibanding divIcon pulse yang
    sebelumnya tampak sedikit bergeser pada beberapa viewport.
  */
  productTourDemoPulse =
    L.circleMarker(
      latlng,
      {
        pane: "stopHitPane",
        radius: 15,
        color: "rgba(0,122,194,.92)",
        weight: 3,
        fillColor: "#ffffff",
        fillOpacity: 0,
        opacity: .92,
        interactive: false,
        bubblingMouseEvents: false
      }
    )
      .addTo(map);

  /*
    Animasi diterapkan pada radius/opacity CircleMarker,
    jadi highlight tetap benar-benar center pada koordinat
    halte saat berdenyut.
  */
  startProductTourDemoPulseAnimation();

  productTourDemoMarker
    .bindTooltip(
      "Monumen Nasional",
      {
        permanent: true,
        direction: "top",
        offset: [0, -10],
        opacity: 1,
        interactive: false,
        className:
          "product-tour-map-stop-tooltip"
      }
    );

  return productTourDemoMarker;
}


function positionProductTourAtDemoStop() {
  const latlng =
    getProductTourDemoStopLatLng();

  if (!latlng) {
    return;
  }

  const currentZoom =
    map.getZoom();

  const targetZoom =
    Math.max(
      14.5,
      Math.min(
        16,
        currentZoom
      )
    );

  map.flyTo(
    latlng,
    targetZoom,
    {
      animate: true,
      duration: 0.62
    }
  );
}


function openProductTourDemoPopup() {
  const feature =
    getProductTourDemoStopFeature();

  const marker =
    ensureProductTourDemoMarker();

  if (
    !feature ||
    !marker
  ) {
    return;
  }

  /*
    BRT_01 dipakai sebagai konteks popup karena Monumen
    Nasional merupakan halte eksisting Koridor 1 dan popup
    tetap menampilkan seluruh koridor/lin lain yang melayani
    titik tersebut.
  */
  marker.bindPopup(
    safeBuildStopPopup(
      feature,
      "BRT_01"
    ),
    getStopPopupOptions()
  );

  marker.openPopup();

  requestAnimationFrame(
    () => {
      requestAnimationFrame(
        () => {
          const routeBadges =
            document.querySelector(
              ".leaflet-popup .stop-popup-direct-routes"
            );

          routeBadges
            ?.classList
            .add(
              "product-tour-badges-focus"
            );

          positionProductTour();
        }
      );
    }
  );
}


function prepareProductTourStopDemo({
  openPopup = false
} = {}) {
  removeProductTourDemoLayers({
    closePopup: true
  });

  const marker =
    ensureProductTourDemoMarker();

  if (!marker) {
    return;
  }

  positionProductTourAtDemoStop();

  /*
    Beri waktu pada flyTo agar titik benar-benar berada pada
    posisi stabil sebelum spotlight final dihitung.
  */
  clearProductTourDemoTimer();

  productTourDemoTimerId =
    setTimeout(
      () => {
        productTourDemoTimerId =
          null;

        if (openPopup) {
          openProductTourDemoPopup();
        }

        positionProductTour();
      },
      openPopup
        ? 690
        : 620
    );
}


function getProductTourMapStopTargetRect() {
  const latlng =
    getProductTourDemoStopLatLng();

  const mapElement =
    document.getElementById(
      "map"
    );

  if (
    !latlng ||
    !mapElement
  ) {
    return null;
  }

  const mapRect =
    mapElement
      .getBoundingClientRect();

  const point =
    map.latLngToContainerPoint(
      latlng
    );

  const markerRadius =
    isMobileLayout()
      ? 30
      : 34;

  let left =
    mapRect.left +
    point.x -
    markerRadius;

  let top =
    mapRect.top +
    point.y -
    markerRadius;

  let right =
    mapRect.left +
    point.x +
    markerRadius;

  let bottom =
    mapRect.top +
    point.y +
    markerRadius;

  /*
    Masukkan label permanen Monumen Nasional ke area
    spotlight agar frame tidak memotong teks tutorial.
  */
  const tooltip =
    document.querySelector(
      ".leaflet-tooltip.product-tour-map-stop-tooltip"
    );

  if (tooltip) {
    const tooltipRect =
      tooltip.getBoundingClientRect();

    left = Math.min(
      left,
      tooltipRect.left
    );

    top = Math.min(
      top,
      tooltipRect.top
    );

    right = Math.max(
      right,
      tooltipRect.right
    );

    bottom = Math.max(
      bottom,
      tooltipRect.bottom
    );
  }

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}


function getProductTourListTargetRect() {
  const element =
    getProductTourListTargetElement();

  if (!element) {
    return null;
  }

  const rect =
    element
      .getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return null;
  }

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
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

  if (step.target === "global-search") {
    const element =
      document.getElementById(
        "globalSearchPanel"
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

  if (step.target === "tutorial-stop") {
    if (
      !isMobileLayout() &&
      productTourStopHighlightPhase ===
        "list"
    ) {
      return (
        getProductTourListTargetRect()
        ||
        getProductTourMapStopTargetRect()
      );
    }

    return getProductTourMapStopTargetRect();
  }

  if (
    step.target ===
    "tutorial-route-badges"
  ) {
    const element =
      document.querySelector(
        ".leaflet-popup .stop-popup-direct-routes"
      );

    if (!element) {
      /*
        Popup sedang dibuat/flyTo belum selesai.
        Gunakan titik Monas sementara agar card tidak meloncat
        ke tengah layar, lalu positionProductTour() akan dipanggil
        lagi setelah popup siap.
      */
      const latlng =
        getProductTourDemoStopLatLng();

      const mapElement =
        document.getElementById(
          "map"
        );

      if (
        !latlng ||
        !mapElement
      ) {
        return null;
      }

      const mapRect =
        mapElement
          .getBoundingClientRect();

      const point =
        map.latLngToContainerPoint(
          latlng
        );

      return {
        left:
          mapRect.left +
          point.x -
          55,

        top:
          mapRect.top +
          point.y -
          55,

        width: 110,
        height: 110
      };
    }

    const rect =
      element
        .getBoundingClientRect();

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
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

  /*
    Pada Tip 2 spotlight boleh pindah dari peta ke daftar,
    tetapi kartu penjelasan tetap berlabuh pada posisi demo
    peta. Dengan begitu hanya fokusnya yang bergerak dan kartu
    tidak ikut meloncat ke sisi kiri layar.
  */
  const cardAnchorRect =
    step.target === "tutorial-stop"
      ? (
          getProductTourMapStopTargetRect()
          || targetRect
        )
      : targetRect;

  if (targetRect) {
    const padding =
      step.target === "tutorial-stop"
        ? 10
        : step.target === "tutorial-route-badges"
          ? 8
          : 6;

    productTourSpotlight.style.setProperty(
      "--tour-dim-opacity",
      (
        step.target === "tutorial-stop" ||
        step.target === "tutorial-route-badges"
      )
        ? "0.36"
        : "0.41"
    );

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

  if (cardAnchorRect) {
    const preferredLeft =
      cardAnchorRect.left +
      cardAnchorRect.width +
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
            cardAnchorRect.left -
            cardWidth -
            18
          )}px`;

    productTourCard.style.top =
      `${Math.max(
        16,
        Math.min(
          cardAnchorRect.top,
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

    if (
      step.target ===
      "tutorial-stop"
    ) {
      prepareProductTourStopDemo({
        openPopup: false
      });
    }
    else if (
      step.target ===
      "tutorial-route-badges"
    ) {
      prepareProductTourStopDemo({
        openPopup: true
      });
    }
    else if (
      step.target !==
      "controls"
    ) {
      /*
        Sama seperti desktop: antar-step hanya membersihkan
        demo, kamera tetap di posisi tutorial terakhir.
      */
      removeProductTourDemoLayers({
        closePopup: true
      });
    }

    return;
  }

  if (step.target === "controls") {
    /*
      Navigasi antar-step tidak lagi mengembalikan kamera
      ke posisi awal. Posisi awal baru dipulihkan ketika
      tutorial benar-benar ditutup (Lewati / Mulai Jelajahi).
    */
    removeProductTourDemoLayers({
      closePopup: true
    });

    setDesktopPanelCollapsed(
      "left",
      false
    );

    return;
  }

  if (
    step.target ===
    "tutorial-stop"
  ) {
    prepareProductTourStopDemo({
      openPopup: false
    });

    scheduleProductTourStopHighlightSequence();

    return;
  }

  if (
    step.target ===
    "tutorial-route-badges"
  ) {
    prepareProductTourStopDemo({
      openPopup: true
    });

    return;
  }

  /*
    Tip Search dan target lain membersihkan popup/marker demo,
    tetapi MEMPERTAHANKAN posisi kamera dari Tip sebelumnya.

    Posisi kamera hanya kembali ke awal ketika tutorial ditutup
    melalui Lewati atau Mulai Jelajahi.
  */
  removeProductTourDemoLayers({
    closePopup: true
  });
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
  closeRoutePlanIntro();

  if (!productTour) {
    return;
  }

  productTourManual =
    Boolean(manual);

  /*
    Simpan view sebelum demo Tip 2–3. Ini berlaku baik pada
    startup tour maupun ketika user membuka Cara Menggunakan
    secara manual.
  */
  const currentCenter =
    map.getCenter();

  productTourInitialMapView = {
    center:
      L.latLng(
        currentCenter.lat,
        currentCenter.lng
      ),
    zoom:
      map.getZoom()
  };

  removeProductTourDemoLayers({
    closePopup: true
  });

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

  removeProductTourDemoLayers({
    closePopup: true
  });

  restoreProductTourInitialMapView({
    animate: false
  });

  productTourInitialMapView = null;
  productTourDemoStopFeature = null;

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


/*
  Tip 2 mengikuti posisi Monas ketika kamera flyTo.
  Tip 3 mengikuti popup bila Leaflet melakukan auto-pan.
*/
map.on(
  "move zoom",
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
  globalSearchRouteResults = [];
  globalSearchPoiResults = [];
  globalSearchPoiLoading = false;

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


function getGlobalRouteSearchMatches(
  query,
  limit = 5
) {
  if (!routeData?.features) {
    return [];
  }

  const normalizedQuery =
    normalizeSearchText(
      query
    );

  if (normalizedQuery.length < 2) {
    return [];
  }

  const unique =
    new Map();

  routeData.features.forEach(
    feature => {
      const routeId =
        getRouteId(feature);

      if (
        routeId &&
        !unique.has(routeId)
      ) {
        unique.set(
          routeId,
          getRouteById(routeId) || feature
        );
      }
    }
  );

  return Array.from(
    unique.values()
  )
    .map(
      feature => {
        const routeId =
          getRouteId(feature);

        const line =
          String(
            feature?.properties?.LINE
            ?? ""
          ).trim();

        const mode =
          getRouteMode(feature);

        const haystack =
          normalizeSearchText(
            [
              getRouteTitle(feature),
              getRouteDisplayName(feature),
              routeId,
              line,
              mode,
              mode === "BRT"
                ? `Koridor ${line}`
                : `Lin ${line}`
            ].join(" ")
          );

        const index =
          haystack.indexOf(
            normalizedQuery
          );

        return {
          feature,
          score:
            index < 0
              ? Number.POSITIVE_INFINITY
              : index
        };
      }
    )
    .filter(
      item =>
        Number.isFinite(item.score)
    )
    .sort(
      (a, b) =>
        a.score - b.score
    )
    .slice(0, limit)
    .map(
      item =>
        item.feature
    );
}


function buildGlobalRouteResult(feature) {
  const routeId =
    getRouteId(feature);

  const mode =
    getRouteMode(feature);

  return `
    <button
      type="button"
      class="global-search-result"
      data-global-type="route"
      data-route-id="${escapeHTML(routeId)}"
      role="option"
    >
      <span class="global-search-result-icon is-route" aria-hidden="true">
        ${
          mode === "BRT"
            ? escapeHTML(
                routeNumberFromId(routeId)
              )
            : "↔"
        }
      </span>

      <span class="global-search-result-content">
        <span class="global-search-result-main">
          <strong>${escapeHTML(getRouteTitle(feature))}</strong>
          <span>${escapeHTML(mode)}</span>
        </span>

        <span class="global-search-result-meta">
          ${escapeHTML(
            getStatusLabel(
              feature.properties.STATUS
            )
          )}
        </span>
      </span>
    </button>
  `;
}


function openRouteFromGlobalSearch(routeId) {
  const route =
    getRouteById(routeId);

  if (!route) {
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

  updateRouteDetailCardState();

  globalSearchInput.value =
    getRouteTitle(route);

  updateGlobalSearchClearButton();
  closeGlobalSearchResults();

  globalSearchInput.blur();
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

  const routeHTML =
    globalSearchRouteResults.length
      ?
      `
        <section class="global-search-group">
          <div class="global-search-group-title">
            Lin / Koridor
          </div>

          ${
            globalSearchRouteResults
              .map(
                buildGlobalRouteResult
              )
              .join("")
          }
        </section>
      `
      :
      "";

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
    !routeHTML &&
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
      routeHTML +
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
      '[data-global-type="route"]'
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            openRouteFromGlobalSearch(
              button.dataset.routeId
            );
          }
        );
      }
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

    const results =
      await requestNominatim(
        params,
        globalSearchAbortController.signal
      );

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
    globalSearchRouteResults =
      getGlobalRouteSearchMatches(
        cleanQuery,
        5
      );

    globalSearchLocalResults =
      getStopSearchMatches(
        cleanQuery,
        6
      );
  }
  else {
    globalSearchRouteResults = [];
    globalSearchLocalResults = [];
  }

  renderGlobalSearchResults();
}


function submitGlobalPoiSearch() {
  const query =
    String(
      globalSearchInput?.value ?? ""
    ).trim();

  if (query.length < 3) {
    updateGlobalSearch(query);
    return;
  }

  fetchGlobalPoiResults(query);
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
        event.preventDefault();
        submitGlobalPoiSearch();
      }
    }
  );


globalSearchSubmit
  ?.addEventListener(
    "click",
    submitGlobalPoiSearch
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
   SHAREABLE URL STATE
   ========================================================= */

function getShareableStopId(stopKey) {
  const feature =
    getStopByKey(stopKey);

  if (!feature) {
    return "";
  }

  return String(
    feature?.properties?.STOP_ID
    ||
    getStopKey(feature)
    ||
    ""
  ).trim();
}


function findStopFromShareableId(stopId) {
  if (
    !stopData?.features ||
    !stopId
  ) {
    return null;
  }

  const target =
    String(stopId).trim();

  return (
    stopData.features.find(
      feature =>
        String(
          feature?.properties?.STOP_ID
          ?? ""
        ).trim() === target
    )
    ||
    getStopByKey(target)
    ||
    null
  );
}


function syncUrlState() {
  if (suppressUrlStateSync) {
    return;
  }

  const params =
    new URLSearchParams();

  const mode =
    String(
      modeSelect?.value ?? "ALL"
    );

  const status =
    String(
      statusSelect?.value ?? "Existing"
    );

  const routeId =
    currentSelectedRouteId
    ||
    (
      routeSelect?.value !== "ALL"
        ? routeSelect?.value
        : ""
    );

  if (mode !== "ALL") {
    params.set("mode", mode);
  }

  if (status !== "Existing") {
    params.set("status", status);
  }

  if (routeId) {
    params.set(
      "route",
      routeId
    );

    if (isRouteDirectionEnabled(routeId)) {
      params.set(
        "dir",
        getActiveRouteDirection(routeId)
      );
    }
  }

  if (
    comparisonRouteId &&
    comparisonRouteId !== routeId
  ) {
    params.set(
      "compare",
      comparisonRouteId
    );
  }

  if (currentSelectedStopKey) {
    const stopId =
      getShareableStopId(
        currentSelectedStopKey
      );

    if (stopId) {
      params.set(
        "stop",
        stopId
      );
    }
  }

  if (
    currentBasemapType &&
    currentBasemapType !== "light"
  ) {
    params.set(
      "basemap",
      currentBasemapType
    );
  }

  const opacity =
    Math.round(
      basemapOpacity * 100
    );

  if (opacity !== 100) {
    params.set(
      "opacity",
      String(opacity)
    );
  }

  const query =
    params.toString();

  const nextUrl =
    `${window.location.pathname}${
      query
        ? `?${query}`
        : ""
    }${window.location.hash || ""}`;

  window.history.replaceState(
    null,
    "",
    nextUrl
  );
}


function applyUrlStateAfterDataLoad() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  suppressUrlStateSync =
    true;

  try {
    const routeId =
      params.get("route");

    const directionSide =
      params.get("dir");

    const comparisonId =
      params.get("compare");

    const stopId =
      params.get("stop");

    const basemap =
      params.get("basemap");

    const opacity =
      Number(
        params.get("opacity")
      );

    const mode =
      params.get("mode");

    const status =
      params.get("status");

    if (
      mode &&
      Array.from(
        modeSelect.options
      ).some(
        option =>
          option.value === mode
      )
    ) {
      modeSelect.value = mode;
      updateStatusAvailabilityForMode();
    }

    if (
      status &&
      Array.from(
        statusSelect.options
      ).some(
        option =>
          option.value === status
      )
    ) {
      statusSelect.value =
        status;

      updateStatusAvailabilityForMode();
    }

    if (
      basemap &&
      BASEMAPS[basemap]
    ) {
      setBasemap(
        basemap
      );
    }

    if (
      Number.isFinite(opacity) &&
      [25, 50, 75, 100]
        .includes(opacity)
    ) {
      setBasemapOpacity(
        opacity
      );
    }

    if (
      routeId &&
      getRouteById(routeId)
    ) {
      const route =
        getRouteById(routeId);

      modeSelect.value =
        getRouteMode(route);

      updateStatusAvailabilityForMode();

      if (!status) {
        statusSelect.value =
          normalizeStatus(
            route.properties.STATUS
          );
      }

      populateRouteDropdown();

      routeSelect.value =
        routeId;

      if (
        directionSide &&
        isRouteDirectionEnabled(routeId)
      ) {
        setActiveRouteDirection(
          routeId,
          directionSide
        );
      }

      showSingleRoute(
        routeId
      );

      if (
        comparisonId &&
        comparisonId !== routeId &&
        getRouteById(
          comparisonId
        )
      ) {
        setComparisonRoute(
          comparisonId,
          {
            fit: true,
            syncUrl: false
          }
        );
      }

      updateRouteDetailCardState();

      if (stopId) {
        const feature =
          findStopFromShareableId(
            stopId
          );

        if (feature) {
          requestAnimationFrame(
            () => {
              selectStop(
                getStopKey(feature),
                routeId,
                true
              );
            }
          );
        }
      }

      return;
    }

    populateRouteDropdown();

    routeSelect.value =
      "ALL";

    showAllRoutes(true);
    updateRouteDetailCardState();
  }
  finally {
    suppressUrlStateSync =
      false;

    setTimeout(
      syncUrlState,
      0
    );
  }
}


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



routePlanIntroCloseEl
  ?.addEventListener(
    "click",
    () => {
      closeRoutePlanIntro();
    }
  );


routePlanIntroDismissEl
  ?.addEventListener(
    "click",
    () => {
      closeRoutePlanIntro();
    }
  );


routePlanIntroSourceEl
  ?.addEventListener(
    "click",
    () => {
      const routeId =
        activeRoutePlanIntroRouteId;

      if (!routeId) {
        return;
      }

      openRoutePlanSourceCard(
        routeId
      );
    }
  );


document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape" &&
      routePlanIntroEl &&
      !routePlanIntroEl.hidden
    ) {
      closeRoutePlanIntro();
    }
  }
);


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

      closeRoutePlanIntro();

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

      closeRoutePlanIntro();

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

function validateRouteData() {
  if (!routeData?.features) {
    return;
  }

  const routeFeatures = routeData.features.filter(
    feature => getRouteMode(feature) === "BRT"
  );

  if (!routeFeatures.length) {
    return;
  }

  const missingIds = [];
  const missingGeomIds = [];
  const geomIdCounts =
    new Map();
  const invalidGeometry = [];
  const variantsByRoute =
    new Map();

  routeFeatures.forEach(
    (feature, index) => {
      const routeId =
        getRouteId(feature);

      if (!routeId) {
        missingIds.push(
          index + 1
        );
      }

      const geomId =
        cleanText(
          feature
            ?.properties
            ?.GEOM_ID
        );

      if (!geomId) {
        missingGeomIds.push(
          routeId ||
          `feature ${index + 1}`
        );
      }
      else {
        geomIdCounts.set(
          geomId,
          (
            geomIdCounts.get(
              geomId
            )
            ??
            0
          ) + 1
        );
      }

      if (
        !feature.geometry ||
        ![
          "LineString",
          "MultiLineString"
        ].includes(
          feature.geometry.type
        )
      ) {
        invalidGeometry.push(
          routeId
        );
      }

      if (
        !variantsByRoute.has(
          routeId
        )
      ) {
        variantsByRoute.set(
          routeId,
          []
        );
      }

      variantsByRoute
        .get(routeId)
        .push(
          normalizeRouteVariant(
            feature
          )
        );
    }
  );

  const duplicateGeomIds =
    Array.from(
      geomIdCounts.entries()
    )
      .filter(
        ([, count]) =>
          count > 1
      );

  const duplicateVariants = [];

  variantsByRoute.forEach(
    (variants, routeId) => {
      const counts = {};

      variants.forEach(
        variant => {
          counts[variant] =
            (counts[variant] || 0) + 1;
        }
      );

      Object.entries(counts)
        .forEach(
          ([variant, count]) => {
            if (count > 1) {
              duplicateVariants.push(
                `${routeId} → ${variant} (${count})`
              );
            }
          }
        );
    }
  );

  debugGroup(
    "Validasi brt_route.geojson"
  );

  debugLog(
    "Jumlah fitur rute:",
    routeFeatures.length
  );

  if (missingIds.length) {
    console.warn(
      "Fitur rute tanpa ID:",
      missingIds
    );
  }

  if (missingGeomIds.length) {
    console.warn(
      "Fitur rute tanpa GEOM_ID:",
      missingGeomIds
    );
  }

  if (duplicateGeomIds.length) {
    console.warn(
      "GEOM_ID rute duplikat:",
      duplicateGeomIds
    );
  }

  if (invalidGeometry.length) {
    console.warn(
      "Geometri rute tidak valid:",
      invalidGeometry
    );
  }

  if (duplicateVariants.length) {
    console.warn(
      "Duplikasi ROUTE_VAR:",
      duplicateVariants
    );
  }

  debugGroupEnd();
}


function validateStopData() {
  if (!stopData?.features) {
    return;
  }

  const stopFeatures = stopData.features.filter(
    feature => normalizeMode(feature?.properties?.MODE) === "BRT"
  );

  if (!stopFeatures.length) {
    return;
  }

  const logicalIds =
    new Map();

  const geomIds =
    new Map();

  const blankStopIds = [];
  const blankGeomIds = [];
  const missingSequence = [];
  const invalidPoints = [];

  const invalidStopRole = [];
  const invalidStopVar = [];
  const invalidPaidLink = [];
  const invalidLinkType = [];
  const invalidIntegrationRelation = [];

  const temporaryMissingDivId = [];
  const temporaryMissingReplaces = [];
  const paidLinkSemanticIssues = [];

  const integrationNameWithoutService = [];
  const integrationTargetWithoutService = [];
  const integrationWithoutDescriptor = [];

  const legacyInvalidIntegrationStatuses = [];
  const legacyIntegrationStatusWithoutService = [];
  const legacyIntegrationStatusWithoutNameMatch = [];

  stopFeatures.forEach(
    (feature, index) => {
      const p =
        feature.properties ?? {};

      const stopName =
        getStopDisplayName(
          feature
        );

      const stopId =
        cleanText(
          p.STOP_ID
        );

      const geomId =
        cleanText(
          p.GEOM_ID
        );

      if (!stopId) {
        blankStopIds.push(
          stopName
        );
      }
      else {
        logicalIds.set(
          stopId,
          (
            logicalIds.get(
              stopId
            )
            ??
            0
          ) + 1
        );
      }

      if (!geomId) {
        blankGeomIds.push(
          stopName
        );
      }
      else {
        geomIds.set(
          geomId,
          (
            geomIds.get(
              geomId
            )
            ??
            0
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

      const role =
        normalizeStopRole(
          p.STOP_ROLE
        );

      if (
        p.STOP_ROLE &&
        ![
          "Regular",
          "Transit",
          "Terminus",
          "Transit-Terminus"
        ].includes(role)
        &&
        !String(
          p.STOP_ROLE
        ).includes(":")
      ) {
        invalidStopRole.push(
          `${stopName} → ${p.STOP_ROLE}`
        );
      }

      const stopVar =
        normalizeStopVariant(
          p.STOP_VAR
        );

      if (
        p.STOP_VAR &&
        ![
          "BASE",
          "TEMPORARY"
        ].includes(
          String(
            p.STOP_VAR
          ).trim().toUpperCase()
        )
      ) {
        invalidStopVar.push(
          `${stopName} → ${p.STOP_VAR}`
        );
      }

      const paidLink =
        getPaidLinkStatus(
          feature
        );

      if (
        hasText(
          p.PAID_LINK
        )
        &&
        !paidLink
      ) {
        invalidPaidLink.push(
          `${stopName} → ${p.PAID_LINK}`
        );
      }

      const linkType =
        getLinkType(
          feature
        );

      if (
        hasText(
          p.LINK_TYPE
        )
        &&
        !linkType
      ) {
        invalidLinkType.push(
          `${stopName} → ${p.LINK_TYPE}`
        );
      }

      if (
        paidLink === "YES"
        &&
        (
          !linkType
          ||
          [
            "NONE",
            "UNKNOWN"
          ].includes(linkType)
        )
      ) {
        paidLinkSemanticIssues.push(
          `${stopName} → PAID_LINK=YES, LINK_TYPE=${linkType || "(kosong)"}`
        );
      }

      if (
        [
          "NO",
          "NA"
        ].includes(paidLink)
        &&
        linkType
        &&
        ![
          "NONE",
          "UNKNOWN"
        ].includes(linkType)
      ) {
        paidLinkSemanticIssues.push(
          `${stopName} → PAID_LINK=${paidLink}, LINK_TYPE=${linkType}`
        );
      }

      const intRaw =
        cleanText(
          p.INT_STATUS
        );

      const relationStatus =
        normalizeIntegrationRelationStatus(
          intRaw
        );

      const isLegacyIntMap =
        Boolean(
          intRaw &&
          !relationStatus
        );

      if (
        intRaw &&
        !relationStatus &&
        !intRaw.includes("=")
      ) {
        invalidIntegrationRelation.push(
          `${stopName} → ${intRaw}`
        );
      }

      if (
        stopVar === "TEMPORARY"
      ) {
        if (
          !hasText(
            p.DIV_ID
          )
        ) {
          temporaryMissingDivId.push(
            stopName
          );
        }

        if (
          !hasText(
            p.REPLACES_ID
          )
        ) {
          temporaryMissingReplaces.push(
            stopName
          );
        }
      }

      const routes =
        getStopRoutes(
          feature
        );

      routes.forEach(
        routeId => {
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
        }
      );

      const integrations =
        getStopIntegrations(
          feature
        );

      const integrationNameMap =
        getStopIntegrationNameMap(
          feature
        );

      const integrationTargetMap =
        getStopIntegrationTargetMap(
          feature
        );

      Object.keys(
        integrationNameMap
      )
        .forEach(
          code => {
            if (
              !isValidIntegrationNameKey(
                code,
                integrations,
                integrationTargetMap
              )
            ) {
              integrationNameWithoutService.push(
                `${stopName} → ${code}`
              );
            }
          }
        );

      Object.keys(
        integrationTargetMap
      )
        .forEach(
          code => {
            if (
              !integrations.some(
                integrationCode =>
                  String(integrationCode).trim().toUpperCase() ===
                  String(code).trim().toUpperCase()
              )
            ) {
              integrationTargetWithoutService.push(
                `${stopName} → ${code}`
              );
            }
          }
        );

      integrations.forEach(
        code => {
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
                  String(
                    value || ""
                  ).trim()
              );

          const hasIntegrationTarget =
            getIntegrationMultiMapValues(
              integrationTargetMap,
              code
            ).length > 0;

          if (
            !hasIntegrationName &&
            !hasIntegrationTarget
          ) {
            integrationWithoutDescriptor.push(
              `${stopName} → ${code}`
            );
          }
        }
      );

      /*
        Validator legacy hanya berjalan bila INT_STATUS masih
        memakai format lama KODE:Nama=Status.
      */
      if (isLegacyIntMap) {
        const integrationStatusMap =
          parseIntegrationStatusMap(
            intRaw
          );

        integrationStatusMap.entries
          .forEach(
            entry => {
              if (!entry.valid) {
                legacyInvalidIntegrationStatuses.push(
                  `${stopName} → ${entry.raw}`
                );
                return;
              }

              if (
                !integrations.includes(
                  entry.code
                )
              ) {
                legacyIntegrationStatusWithoutService.push(
                  `${stopName} → ${entry.code}`
                );
              }

              if (entry.relatedName) {
                const targetIdsForCode =
                  getIntegrationMultiMapValues(
                    integrationTargetMap,
                    entry.code
                  );

                const names = [
                  ...getIntegrationMultiMapValues(
                    integrationNameMap,
                    entry.code
                  ),
                  ...targetIdsForCode.flatMap(targetId =>
                    getIntegrationMultiMapValues(
                      integrationNameMap,
                      targetId
                    )
                  )
                ];

                const normalizedNames =
                  names.map(
                    normalizeIntegrationStatusName
                  );

                if (
                  !normalizedNames.includes(
                    normalizeIntegrationStatusName(
                      entry.relatedName
                    )
                  )
                ) {
                  legacyIntegrationStatusWithoutNameMatch.push(
                    `${stopName} → ${entry.code}:${entry.relatedName}`
                  );
                }
              }
            }
          );
      }
    }
  );

  const duplicateGeomIds =
    Array.from(
      geomIds.entries()
    )
      .filter(
        ([, count]) =>
          count > 1
      );

  const repeatedLogicalIds =
    Array.from(
      logicalIds.entries()
    )
      .filter(
        ([, count]) =>
          count > 1
      );

  const datasetFieldPresence =
    new Map(
      BRT_STOP_SCHEMA_V20_FIELDS
        .map(
          field => [
            field,
            false
          ]
        )
    );

  const featureSchemaGaps = [];
  const schemaDomainIssues = [];

  stopFeatures.forEach(
    (feature, index) => {
      const p =
        feature?.properties ?? {};

      BRT_STOP_SCHEMA_V20_FIELDS
        .forEach(
          field => {
            if (
              Object.prototype
                .hasOwnProperty.call(
                  p,
                  field
                )
            ) {
              datasetFieldPresence.set(
                field,
                true
              );
            }
          }
        );

      const missingFields =
        getStopSchemaV20MissingFields(
          feature
        );

      if (
        missingFields.length
      ) {
        featureSchemaGaps.push({
          feature:
            cleanText(
              p.GEOM_ID
            )
            ||
            cleanText(
              p.STOP_ID
            )
            ||
            `feature ${index + 1}`,
          missingFields
        });
      }

      getStopSchemaV20DomainIssues(
        feature
      )
        .forEach(
          issue => {
            schemaDomainIssues.push({
              feature:
                cleanText(
                  p.GEOM_ID
                )
                ||
                cleanText(
                  p.STOP_ID
                )
                ||
                `feature ${index + 1}`,
              ...issue
            });
          }
        );
    }
  );

  const missingDatasetFields =
    Array.from(
      datasetFieldPresence.entries()
    )
      .filter(
        ([, present]) =>
          !present
      )
      .map(
        ([field]) =>
          field
      );

  debugGroup(
    "Validasi brt_stop.geojson · Pedoman BRT v2.0"
  );

  debugLog(
    "Jumlah feature point:",
    stopFeatures.length
  );

  debugLog(
    "Jumlah halte logis (COUNT DISTINCT STOP_ID):",
    logicalIds.size
  );

  debugLog(
    "Schema target BRT_Stop v2.0:",
    BRT_STOP_SCHEMA_V20_FIELDS
  );

  if (
    missingDatasetFields.length
  ) {
    console.warn(
      "Field schema v2.0 belum ditemukan di dataset:",
      missingDatasetFields
    );
  }
  else {
    console.info(
      "Schema BRT_Stop v2.0 lengkap: 31 field ditemukan."
    );
  }

  if (
    featureSchemaGaps.length
  ) {
    console.info(
      "Feature yang belum membawa seluruh 31 property v2.0:",
      featureSchemaGaps
    );
  }

  if (
    schemaDomainIssues.length
  ) {
    console.warn(
      "Nilai domain schema v2.0 perlu diperiksa:",
      schemaDomainIssues
    );
  }

  if (blankStopIds.length) {
    console.warn(
      "STOP_ID kosong:",
      blankStopIds
    );
  }

  if (blankGeomIds.length) {
    console.warn(
      "GEOM_ID kosong:",
      blankGeomIds
    );
  }

  if (duplicateGeomIds.length) {
    console.warn(
      "GEOM_ID duplikat (tidak diperbolehkan):",
      duplicateGeomIds
    );
  }

  if (repeatedLogicalIds.length) {
    console.info(
      "STOP_ID berulang. Ini valid bila feature mewakili halte logis yang sama:",
      repeatedLogicalIds
    );
  }

  if (invalidStopRole.length) {
    console.warn(
      "STOP_ROLE di luar domain v2.0:",
      invalidStopRole
    );
  }

  if (invalidStopVar.length) {
    console.warn(
      "STOP_VAR di luar domain BASE/TEMPORARY:",
      invalidStopVar
    );
  }

  if (invalidPaidLink.length) {
    console.warn(
      "PAID_LINK tidak valid:",
      invalidPaidLink
    );
  }

  if (invalidLinkType.length) {
    console.warn(
      "LINK_TYPE tidak valid:",
      invalidLinkType
    );
  }

  if (invalidIntegrationRelation.length) {
    console.warn(
      "INT_STATUS v2.0 harus INTEGRATED / CONNECTION / NONE / UNKNOWN:",
      invalidIntegrationRelation
    );
  }

  if (temporaryMissingDivId.length) {
    console.warn(
      "STOP_VAR=TEMPORARY tanpa DIV_ID:",
      temporaryMissingDivId
    );
  }

  if (temporaryMissingReplaces.length) {
    console.info(
      "STOP_VAR=TEMPORARY tanpa REPLACES_ID. Isi bila titik ini menggantikan feature BASE:",
      temporaryMissingReplaces
    );
  }

  if (paidLinkSemanticIssues.length) {
    console.warn(
      "Konsistensi PAID_LINK dan LINK_TYPE perlu diperiksa:",
      paidLinkSemanticIssues
    );
  }

  if (missingSequence.length) {
    console.warn(
      "ROUTES terisi tetapi sequence terkait belum ada di SEQ_MAP:",
      missingSequence
    );
  }

  if (
    integrationNameWithoutService.length
  ) {
    console.warn(
      "INT_NM memiliki key yang bukan kode INTEGRASI maupun target INT_STOP:",
      integrationNameWithoutService
    );
  }

  if (
    integrationTargetWithoutService.length
  ) {
    console.warn(
      "INT_STOP memiliki kode yang tidak ada di INTEGRASI:",
      integrationTargetWithoutService
    );
  }

  if (
    integrationWithoutDescriptor.length
  ) {
    console.warn(
      "INTEGRASI tanpa INT_NM maupun INT_STOP (disembunyikan dari popup):",
      integrationWithoutDescriptor
    );
  }

  if (
    legacyInvalidIntegrationStatuses.length
  ) {
    console.warn(
      "INT_STATUS legacy tidak valid:",
      legacyInvalidIntegrationStatuses
    );
  }

  if (
    legacyIntegrationStatusWithoutService.length
  ) {
    console.warn(
      "INT_STATUS legacy memiliki kode yang tidak ada di INTEGRASI:",
      legacyIntegrationStatusWithoutService
    );
  }

  if (
    legacyIntegrationStatusWithoutNameMatch.length
  ) {
    console.warn(
      "INT_STATUS legacy tidak menemukan pasangan nama di INT_NM:",
      legacyIntegrationStatusWithoutNameMatch
    );
  }

  if (invalidPoints.length) {
    console.warn(
      "Geometry Point tidak valid:",
      invalidPoints
    );
  }

  debugGroupEnd();
}

/* =========================================================
   RAIL DATA VALIDATION
   ========================================================= */

function validateRailData() {
  const routes = routeData?.features?.filter(
    feature =>
      String(feature?.properties?._DATASET ?? "").toUpperCase() === "RAIL"
  ) ?? [];

  const stops = stopData?.features?.filter(
    feature =>
      String(feature?.properties?._DATASET ?? "").toUpperCase() === "RAIL"
  ) ?? [];

  if (!routes.length && !stops.length) {
    console.info(
      "RAIL: rail_route.geojson / rail_stop.geojson belum dimuat. BRT tetap berjalan."
    );
    return;
  }

  const supportedModes = new Set([
    "MRT",
    "KRL",
    "LRT"
  ]);

  const validStructures = new Set([
    "ELEVATED",
    "TRANSITION",
    "UNDERGROUND",
    "AT_GRADE",
    "MIXED",
    "UNKNOWN"
  ]);

  const routeIssues = [];
  const geomIds = new Map();

  routes.forEach((feature, index) => {
    const p = feature?.properties ?? {};
    const routeId = getRouteId(feature);
    const geomId = cleanText(p.GEOM_ID);
    const mode = normalizeMode(p.MODE);
    const structure = normalizeStructure(p.STRUCTURE);

    if (!mode) {
      routeIssues.push(
        `${routeId || `route feature ${index + 1}`}: MODE kosong`
      );
    }
    else if (!supportedModes.has(mode)) {
      routeIssues.push(
        `${routeId || `route feature ${index + 1}`}: MODE=${p.MODE} belum dikenali sebagai MRT/KRL/LRT`
      );
    }

    if (!routeId) {
      routeIssues.push(`route feature ${index + 1}: LINE_ID/ID kosong`);
    }

    if (!geomId) {
      routeIssues.push(`${routeId || `feature ${index + 1}`}: GEOM_ID kosong`);
    }
    else {
      geomIds.set(geomId, (geomIds.get(geomId) ?? 0) + 1);
    }

    if (!cleanText(p.LINE_NAME ?? p.NAME ?? p.ROUTE_NAME)) {
      routeIssues.push(`${routeId || `feature ${index + 1}`}: LINE_NAME kosong`);
    }

    if (!cleanText(p.OPERATOR)) {
      routeIssues.push(`${routeId || `feature ${index + 1}`}: OPERATOR kosong`);
    }

    if (
      !feature?.geometry ||
      !["LineString", "MultiLineString"].includes(feature.geometry.type)
    ) {
      routeIssues.push(
        `${routeId || `feature ${index + 1}`}: geometri bukan LineString/MultiLineString`
      );
    }

    if (!validStructures.has(structure)) {
      routeIssues.push(
        `${routeId || `feature ${index + 1}`}: STRUCTURE=${p.STRUCTURE}`
      );
    }
  });

  Array.from(geomIds.entries())
    .filter(([, count]) => count > 1)
    .forEach(([geomId, count]) =>
      routeIssues.push(`GEOM_ID duplikat: ${geomId} (${count})`)
    );

  const stopIssues = [];
  const stopGeomIds = new Map();
  const integrationIssues = [];

  stops.forEach((feature, index) => {
    const p = feature?.properties ?? {};
    const stopName = getStopDisplayName(feature) || `feature ${index + 1}`;
    const stopId = cleanText(p.STOP_ID);
    const geomId = cleanText(p.GEOM_ID);
    const mode = normalizeMode(p.MODE);
    const routesForStop = getStopRoutes(feature);

    if (!mode) {
      stopIssues.push(`${stopName}: MODE kosong`);
    }
    else if (!supportedModes.has(mode)) {
      stopIssues.push(`${stopName}: MODE=${p.MODE} belum dikenali sebagai MRT/KRL/LRT`);
    }

    if (!cleanText(p.OPERATOR)) {
      stopIssues.push(`${stopName}: OPERATOR kosong`);
    }

    if (!stopId) {
      stopIssues.push(`${stopName}: STOP_ID kosong`);
    }

    if (!geomId) {
      stopIssues.push(`${stopName}: GEOM_ID kosong`);
    }
    else {
      stopGeomIds.set(geomId, (stopGeomIds.get(geomId) ?? 0) + 1);
    }

    if (!feature?.geometry || feature.geometry.type !== "Point") {
      stopIssues.push(`${stopName}: geometri bukan Point`);
    }

    if (!routesForStop.length) {
      stopIssues.push(`${stopName}: LINES/ROUTES kosong`);
    }

    routesForStop.forEach(routeId => {
      const targetRoute = getRouteById(routeId);

      if (!targetRoute) {
        stopIssues.push(
          `${stopName}: lin ${routeId} tidak ditemukan di rail_route`
        );
      }
      else if (
        String(targetRoute?.properties?._DATASET ?? "").toUpperCase() !== "RAIL"
      ) {
        stopIssues.push(
          `${stopName}: lin ${routeId} menunjuk dataset non-RAIL`
        );
      }

      if (!getStopSequenceRaw(feature, routeId)) {
        stopIssues.push(`${stopName}: sequence ${routeId} kosong`);
      }
    });

    const role = getStopRoleForRoute(
      feature,
      routesForStop[0] || ""
    );

    if (
      hasText(p.STOP_ROLE) &&
      ![
        "Regular",
        "Transit",
        "Terminus",
        "Transit-Terminus"
      ].includes(role)
    ) {
      stopIssues.push(`${stopName}: STOP_ROLE=${p.STOP_ROLE}`);
    }

    const integrations = getStopIntegrations(feature);
    const nameMap = getStopIntegrationNameMap(feature);
    const targetMap = getStopIntegrationTargetMap(feature);

    Object.keys(nameMap).forEach(key => {
      if (!isValidIntegrationNameKey(key, integrations, targetMap)) {
        integrationIssues.push(
          `${stopName}: INT_NM key ${key} bukan kode integrasi/target INT_STOP`
        );
      }
    });

    integrations.forEach(code => {
      const legacyNames = getIntegrationMultiMapValues(nameMap, code);
      const targets = getIntegrationMultiMapValues(targetMap, code);
      const targetKeyedNames = targets.flatMap(targetId =>
        getIntegrationMultiMapValues(nameMap, targetId)
      );
      const names = [
        ...legacyNames,
        ...targetKeyedNames
      ];

      if (!names.length && !targets.length) {
        integrationIssues.push(
          `${stopName}: ${code} tanpa INT_NM/INT_STOP (tidak ditampilkan)`
        );
        return;
      }

      const info = getIntegrationInfo(code);
      const routeIds = [info.routeId, info.operatorOnly ? "" : info.code]
        .map(value => String(value ?? "").trim())
        .filter(routeId => Boolean(getRouteById(routeId)));
      const expectedModes = getIntegrationExpectedModes([info]);

      targets.forEach(targetId => {
        const target = findIntegrationStopFeatureByTargetId(
          targetId,
          routeIds,
          expectedModes
        );

        if (!target) {
          integrationIssues.push(
            `${stopName}: ${code} → INT_STOP ${targetId} tidak ditemukan`
          );
        }
      });

      /*
        Bila jaringan target sudah tersedia tetapi hanya INT_NM yang
        dipakai, pastikan fallback nama benar-benar dapat di-resolve.
      */
      const targetNetworkLoaded =
        routeIds.length > 0 ||
        (
          info.operatorKey === "TRANSJAKARTA" &&
          stopData.features.some(stop =>
            normalizeMode(stop?.properties?.MODE) === "BRT"
          )
        );

      if (
        targetNetworkLoaded &&
        !targets.length &&
        names.length
      ) {
        names.forEach(relatedName => {
          const resolved = info.operatorKey === "TRANSJAKARTA"
            ? findTransJakartaIntegrationStopFeature(
                relatedName,
                routeIds
              )
            : findNetworkIntegrationStopFeature(
                relatedName,
                routeIds,
                expectedModes
              );

          if (!resolved) {
            integrationIssues.push(
              `${stopName}: ${code} → INT_NM ${relatedName} tidak menemukan target`
            );
          }
        });
      }
    });
  });

  Array.from(stopGeomIds.entries())
    .filter(([, count]) => count > 1)
    .forEach(([geomId, count]) =>
      stopIssues.push(`GEOM_ID stasiun duplikat: ${geomId} (${count})`)
    );

  const routeCountByMode = routes.reduce((acc, feature) => {
    const mode = getRouteMode(feature) || "UNKNOWN";
    acc[mode] = (acc[mode] ?? 0) + 1;
    return acc;
  }, {});

  const stopCountByMode = stops.reduce((acc, feature) => {
    const mode = normalizeMode(feature?.properties?.MODE) || "UNKNOWN";
    acc[mode] = (acc[mode] ?? 0) + 1;
    return acc;
  }, {});

  debugGroup("Validasi dataset RAIL");
  debugLog("Segmen rail:", routes.length, routeCountByMode);
  debugLog("Stasiun rail:", stops.length, stopCountByMode);
  debugLog(
    "Struktur:",
    Array.from(
      new Set(
        routes.map(feature =>
          normalizeStructure(feature?.properties?.STRUCTURE)
        )
      )
    )
  );

  if (routeIssues.length) {
    console.warn("Catatan rail_route.geojson:", routeIssues);
  }
  else if (routes.length) {
    console.info("rail_route.geojson: struktur dasar valid.");
  }

  if (stopIssues.length) {
    console.warn("Catatan rail_stop.geojson:", stopIssues);
  }
  else if (stops.length) {
    console.info("rail_stop.geojson: struktur dasar valid.");
  }

  if (integrationIssues.length) {
    console.warn("Catatan integrasi RAIL:", integrationIssues);
  }
  else if (stops.length) {
    console.info("Integrasi RAIL: tidak ada target kosong/rusak yang terdeteksi.");
  }

  debugGroupEnd();
}


/* =========================================================
   ROUTE FILTER
   ========================================================= */

function getFilteredRoutes() {
  if (!routeData) {
    return [];
  }

  const selectedMode =
    modeSelect.value;

  const selectedStatus =
    statusSelect.value;

  /*
    Saring dulu berdasarkan moda/status, kemudian kelompokkan
    berdasarkan ROUTE_ID.

    Jika sebuah koridor punya REGULAR + DIVERSION, hanya
    DIVERSION yang tampil pada overview/dropdown.
  */
  const grouped =
    new Map();

  routeData.features
    .filter(feature => {
      const mode =
        getRouteMode(feature);

      const status =
        normalizeStatus(
          feature.properties.STATUS
        );

      const modeMatch =
        selectedMode === "ALL" ||
        mode === selectedMode;

      const statusMatch =
        selectedStatus === "ALL" ||
        status === selectedStatus;

      const constructionAllowed =
        status !== "Construction" ||
        isConstructionStatusAllowedForMode(mode);

      return (
        modeMatch &&
        statusMatch &&
        constructionAllowed
      );
    })
    .forEach(feature => {
      const routeId =
        getRouteId(feature);

      if (!routeId) {
        return;
      }

      const current =
        grouped.get(routeId);

      /*
        DIVERSION menang atas REGULAR.
      */
      if (
        !current ||
        (
          normalizeRouteVariant(
            feature
          ) === "DIVERSION"
          &&
          normalizeRouteVariant(
            current
          ) !== "DIVERSION"
        )
      ) {
        grouped.set(
          routeId,
          feature
        );
      }
    });

  return Array.from(
    grouped.values()
  )
    .sort(
      (a, b) =>
        getRouteOrder(a) -
        getRouteOrder(b)
    );
}

/* =========================================================
   ROUTE STYLE
   ========================================================= */

/*
  Bahasa visual status jaringan:

  Existing
  - garis solid

  Construction status
  - garis utama solid
  - casing luar putus pendek sebagai penanda konstruksi

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

    case "Construction":
      return {
        dashArray: null,
        haloDashArray: "2 5",
        opacity: 0.98
      };

    case "Planned":
      return {
        dashArray: "12 7",
        haloDashArray: "12 7",
        opacity: 0.95
      };

    case "Proposed":
      return {
        dashArray: "7 6",
        haloDashArray: "7 6",
        opacity: 0.88
      };

    case "Conceptual":
      return {
        dashArray: "2 6",
        haloDashArray: "2 6",
        opacity: 0.78
      };

    case "Inactive":
      return {
        dashArray: null,
        haloDashArray: null,
        opacity: 0.42
      };

    case "Existing":
    default:
      return {
        dashArray: null,
        haloDashArray: null,
        opacity: 1
      };
  }
}


function isRuntimeRegularComparison(
  feature
) {
  return Boolean(
    feature
      ?.properties
      ?._RUNTIME_REGULAR_COMPARISON
  );
}


function isRuntimeRouteComparison(
  feature
) {
  return Boolean(
    feature
      ?.properties
      ?._RUNTIME_ROUTE_COMPARISON
  );
}


function getRouteZoomWeightScale() {
  const zoom =
    map?.getZoom?.() ?? 11;

  if (zoom >= 17) {
    return 0.88;
  }

  if (zoom >= 15) {
    return 0.94;
  }

  return 1;
}


function routeStyle(feature) {
  const statusStyle =
    getRouteStatusStyle(feature);

  const zoomWeightScale =
    getRouteZoomWeightScale();

  const comparison =
    isRuntimeRegularComparison(
      feature
    );

  const routeComparison =
    isRuntimeRouteComparison(
      feature
    );

  return {
    pane: "routePane",

    color:
      feature?.properties?.COLOR ||
      "#555555",

    weight:
      (
        comparison
          ? 3.2
          : (
              routeComparison
                ? 3.6
                : 4.4
            )
      ) * zoomWeightScale,

    /*
      - Trase REGULAR pembanding pengalihan dibuat sangat redup.
      - Rute kedua tetap cukup kuat untuk dibandingkan, tetapi
        sedikit lebih ringan dari rute utama.
    */
    opacity:
      comparison
        ? 0.34
        : (
            routeComparison
              ? Math.max(
                  0.62,
                  statusStyle.opacity * 0.82
                )
              : statusStyle.opacity
          ),

    dashArray:
      statusStyle.dashArray,

    lineCap: "round",
    lineJoin: "round"
  };
}


function hasVisibleStructurePattern(feature) {
  if (
    !["Existing", "Construction"].includes(
      normalizeStatus(
        feature?.properties?.STATUS
      )
    )
  ) {
    return false;
  }

  const structure = normalizeStructure(
    feature?.properties?.STRUCTURE
  );

  return [
    "UNDERGROUND",
    "TRANSITION"
  ].includes(structure);
}


/*
  Struktur jalur tidak mengganti bahasa visual STATUS.
  Garis utama tetap solid/dash sesuai Existing/Rencana/Usulan.

  Untuk rail Eksisting/Dalam Pembangunan, lapisan tipis di tengah garis memberi
  pola tambahan:
  - Elevated   : tanpa pola tambahan
  - Transition : dash panjang tipis
  - Underground: titik/dash pendek tipis

  Dengan cara ini warna identitas lin tetap utuh dan dash status
  tidak ditimpa oleh klasifikasi struktur.
*/
function routeStructureStyle(feature) {
  const structure = normalizeStructure(
    feature?.properties?.STRUCTURE
  );

  const zoomScale =
    getRouteZoomWeightScale();

  const base = {
    pane: "routePane",
    color:
      currentBasemapType === "satellite"
        ? "#ffffff"
        : "rgba(255,255,255,0.96)",
    weight: 1.35 * zoomScale,
    opacity: 0,
    lineCap: "round",
    lineJoin: "round",
    interactive: false
  };

  if (!hasVisibleStructurePattern(feature)) {
    return base;
  }

  if (structure === "UNDERGROUND") {
    return {
      ...base,
      opacity: 0.92,
      dashArray: "1 6"
    };
  }

  if (structure === "TRANSITION") {
    return {
      ...base,
      weight: 1.55 * zoomScale,
      opacity: 0.86,
      dashArray: "9 4"
    };
  }

  return base;
}


function haloStyle(feature) {
  const statusStyle =
    getRouteStatusStyle(feature);

  const zoomWeightScale =
    getRouteZoomWeightScale();

  const comparison =
    isRuntimeRegularComparison(
      feature
    );

  const routeComparison =
    isRuntimeRouteComparison(
      feature
    );

  return {
    pane: "routeHaloPane",

    color:
      currentBasemapType === "satellite"
        ? "#ffffff"
        : "#222222",

    weight:
      (
        comparison
          ? 5.5
          : (
              routeComparison
                ? 6.2
                : 7.4
            )
      ) * zoomWeightScale,

    opacity:
      comparison
        ? 0.12
        : (
            routeComparison
              ? (
                  currentBasemapType === "satellite"
                    ? 0.66
                    : 0.34
                )
              : (
                  currentBasemapType === "satellite"
                    ? 0.90
                    : 0.55
                )
          ),

    /*
      Halo mengikuti pola garis utama agar rute Planned
      dan Conceptual tidak terlihat solid dari belakang.
    */
    dashArray:
      statusStyle.haloDashArray ??
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

  if (routeStructureLayer) {
    routeStructureLayer.setStyle(
      routeStructureStyle
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

  const structure = normalizeStructure(
    p.STRUCTURE
  );

  const structureHTML =
    getRouteMode(feature) !== "BRT" &&
    structure !== "UNKNOWN"
      ? `
        <div class="route-popup-row">
          <div class="route-popup-label">Struktur segmen</div>
          <div class="route-popup-value">
            ${escapeHTML(getStructureLabel(structure))}
          </div>
        </div>
      `
      : "";

  const genericVisualizationRemark =
    isPlannedBRTVisualizationRoute(
      getRouteId(feature)
    )
    &&
    /interpret|visualisasi/i.test(
      cleanText(
        p.REMARK
      )
    );

  const remarkHTML =
    hasText(p.REMARK) &&
    !genericVisualizationRemark
      ? `
        <div class="route-popup-row">
          <div class="route-popup-label">Catatan</div>
          <div class="route-popup-value">
            ${escapeHTML(cleanText(p.REMARK))}
          </div>
        </div>
      `
      : "";

  const isVisualizationRoute =
    isPlannedBRTVisualizationRoute(
      getRouteId(feature)
    );

  const routeScenarioNoteHTML =
    isVisualizationRoute
      ? `
        <div class="route-popup-scenario-note">
          <span class="route-popup-scenario-note-icon" aria-hidden="true">i</span>
          <span>
            <strong>Skenario visualisasi.</strong>
            Trase ini disusun berdasarkan analisis penyusun WebGIS
            dan bukan trase resmi.
          </span>
        </div>
      `
      : "";

  const routeVariant =
    normalizeRouteVariant(
      feature
    );

  const isRegularComparison =
    isRuntimeRegularComparison(
      feature
    );

  const isRouteComparison =
    isRuntimeRouteComparison(
      feature
    );

  const comparisonRouteNoteHTML =
    isRouteComparison
      ? `
        <div class="route-popup-comparison-note">
          <strong>Rute pembanding.</strong>
          Ditampilkan bersama rute utama untuk perbandingan trase.
        </div>
      `
      : "";

  const routeVariantHTML =
    routeVariant === "DIVERSION"
      ? `
        <div class="route-popup-operational-note">
          <strong>Pengalihan sementara.</strong>
          Trase ini merupakan kondisi operasional yang sedang
          ditampilkan untuk koridor ini.
        </div>
      `
      : (
          isRegularComparison
            ? `
              <div class="route-popup-regular-note">
                <strong>Trase reguler.</strong>
                Ditampilkan sebagai pembanding terhadap
                pengalihan sementara.
              </div>
            `
            : ""
        );

  const routePopupHTML = `
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

      ${comparisonRouteNoteHTML}
      ${routeVariantHTML}
      ${routeScenarioNoteHTML}
      ${structureHTML}
      ${alignmentHTML}
      ${remarkHTML}

    </div>
  `;

  layer.bindPopup(
    routePopupHTML,
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
    if (event?.originalEvent) {
      L.DomEvent.stopPropagation(
        event.originalEvent
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

    const clickedLatLng =
      event?.latlng || null;

    const clickedRoutePopupHTML =
      routePopupHTML;

    /*
      Klik koridor lain memulai konteks baru sehingga
      pembanding trase reguler kembali OFF.
      Jika user mengklik salah satu geometri koridor yang sama,
      keadaan toggle tetap dipertahankan.
    */
    if (
      String(
        currentSelectedRouteId ?? ""
      ) !== String(routeId)
    ) {
      showRegularRouteComparison =
        false;
    }

    const shouldShowPlanIntroFirst =
      isPlannedBRTVisualizationRoute(
        routeId
      )
      &&
      !shownRoutePlanIntros.has(
        String(routeId)
      );

    if (
      shouldShowPlanIntroFirst
    ) {
      map.closePopup();
    }

    const sameRoute =
      String(
        currentSelectedRouteId ?? ""
      ) === String(routeId);

    /*
      Jika trase yang diklik memang sudah aktif, tidak perlu
      redraw, fitBounds, atau mengubah zoom. Cukup tampilkan
      popup di lokasi klik sehingga feedback terasa langsung.
    */
    if (sameRoute) {
      if (
        !shouldShowPlanIntroFirst &&
        clickedLatLng &&
        clickedRoutePopupHTML
      ) {
        L.popup({
          maxWidth: 320,
          autoPan: true,
          keepInView: true
        })
          .setLatLng(
            clickedLatLng
          )
          .setContent(
            clickedRoutePopupHTML
          )
          .openOn(
            map
          );
      }

      return;
    }

    /*
      Klik trase lain memilih lin/koridor tersebut tetapi
      mempertahankan zoom pengguna. Karena titik yang diklik
      sudah berada di layar, tidak ada alasan melakukan zoom
      mendadak setelah pemilihan.
    */
    showSingleRoute(
      routeId,
      true,
      false
    );

    requestAnimationFrame(
      () => {
        if (
          !shouldShowPlanIntroFirst &&
          clickedLatLng &&
          clickedRoutePopupHTML
        ) {
          L.popup({
            maxWidth: 320,
            autoPan: true,
            keepInView: true
          })
            .setLatLng(
              clickedLatLng
            )
            .setContent(
              clickedRoutePopupHTML
            )
            .openOn(
              map
            );
        }
      }
    );
  });
}

/* =========================================================
   ROUTE LAYER
   ========================================================= */

function removeRouteLayers() {
  map.getContainer()?.classList.remove(
    "is-route-hover"
  );

  if (routeClickLayer) {
    map.removeLayer(routeClickLayer);
    routeClickLayer = null;
  }

  if (routeHaloLayer) {
    map.removeLayer(routeHaloLayer);
    routeHaloLayer = null;
  }

  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  if (routeStructureLayer) {
    map.removeLayer(routeStructureLayer);
    routeStructureLayer = null;
  }
}

function routeClickStyle() {
  return {
    pane: "routeClickPane",
    renderer: routeClickRenderer,
    className: "route-click-target",
    color: "#000000",
    weight: 24,
    opacity: 0.001,
    lineCap: "round",
    lineJoin: "round",
    interactive: true,
    bubblingMouseEvents: false
  };
}

function bindRouteClickTarget(feature, layer) {
  bindRoutePopup(
    feature,
    layer
  );

  layer.on(
    "mouseover",
    () => {
      map.getContainer()?.classList.add(
        "is-route-hover"
      );
    }
  );

  layer.on(
    "mouseout",
    () => {
      map.getContainer()?.classList.remove(
        "is-route-hover"
      );
    }
  );
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

  /*
    Layer pola struktur hanya dibuat bila memang ada segmen
    transition/underground. Overview BRT murni tidak mendapat
    layer ekstra.
  */
  const hasStructurePattern =
    (features || []).some(
      hasVisibleStructurePattern
    );

  if (hasStructurePattern) {
    routeStructureLayer = L.geoJSON(
      fc,
      {
        style: routeStructureStyle,
        interactive: false
      }
    ).addTo(map);
  }

  /*
    Layer transparan khusus interaksi. Garis visual tetap tipis,
    tetapi target klik menjadi ±22 px sehingga koridor/lin mudah
    dipilih pada desktop maupun perangkat sentuh.
  */
  routeClickLayer = L.geoJSON(
    fc,
    {
      pane: "routeClickPane",
      renderer: routeClickRenderer,
      bubblingMouseEvents: false,
      style: routeClickStyle,
      onEachFeature:
        bindRouteClickTarget
    }
  ).addTo(map);
}


function cloneRouteFeatureForRuntime(
  feature,
  extraProperties = {}
) {
  return {
    type: "Feature",

    geometry:
      feature?.geometry ?? null,

    properties: {
      ...(
        feature?.properties ??
        {}
      ),
      ...extraProperties
    }
  };
}


function getSelectedRouteGeometryFeatures(
  routeId
) {
  const active =
    getRouteById(routeId);

  if (!active) {
    return [];
  }

  const result = [];

  /*
    Jika pengalihan aktif dan user meminta pembanding,
    gambar REGULAR lebih dulu agar DIVERSION tetap berada
    di lapisan visual paling atas.
  */
  if (
    hasRouteDiversion(routeId) &&
    showRegularRouteComparison
  ) {
    const regular =
      getRegularRouteFeature(
        routeId
      );

    if (regular) {
      result.push(
        cloneRouteFeatureForRuntime(
          regular,
          {
            _RUNTIME_REGULAR_COMPARISON:
              true
          }
        )
      );
    }
  }

  const activeGeometry =
    getActiveRouteGeometryFeatures(
      routeId
    );

  if (activeGeometry.length) {
    result.push(
      ...activeGeometry
    );
  }
  else {
    result.push(active);
  }

  return result;
}


function drawSelectedRouteGeometry(
  routeId
) {
  const primaryFeatures =
    getSelectedRouteGeometryFeatures(
      routeId
    );

  const primaryActive =
    primaryFeatures.filter(
      feature =>
        !isRuntimeRegularComparison(
          feature
        )
    );

  const primaryRegularComparison =
    primaryFeatures.filter(
      isRuntimeRegularComparison
    );

  const comparisonFeature =
    getComparisonRouteFeature();

  const comparisonFeatures =
    comparisonFeature
      ? getActiveRouteGeometryFeatures(
          getRouteId(comparisonFeature)
        )
          .map(feature =>
            cloneRouteFeatureForRuntime(
              feature,
              {
                _RUNTIME_ROUTE_COMPARISON:
                  true
              }
            )
          )
      : [];

  /*
    Urutan gambar:
    1. trase reguler pembanding pengalihan (paling bawah)
    2. rute kedua
    3. rute utama (paling atas)

    Rute utama dengan demikian tetap dominan secara visual.
  */
  drawRoutes([
    ...primaryRegularComparison,
    ...comparisonFeatures,
    ...primaryActive
  ]);
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
      "Manggarai – Universitas Indonesia (Layang)",

    note:
      "RTRW Jakarta 2024–2044 mencantumkan Koridor 19 sebagai jaringan layang."
  }

};



function isPlannedBRTVisualizationRoute(
  routeId
) {
  return Boolean(
    ROUTE_PLAN_INFO[
      String(routeId ?? "").trim()
    ]
  );
}


/*
  Badge Koridor 15–19 hanya boleh terlihat sebagai bagian
  "Koridor yang dilayani" ketika user memang sedang
  mengeksplorasi salah satu Koridor 15–19.

  Contoh:
  - aktif K12 di Sunter Utara -> badge K15 disembunyikan
  - aktif K15 di Sunter Utara -> badge K15 boleh tampil
    bersama koridor eksisting lain yang juga melayani titik itu
*/
function shouldShowPlannedRouteBadgeInContext(
  candidateRouteId,
  activeRouteId
) {
  if (
    !isPlannedBRTVisualizationRoute(
      candidateRouteId
    )
  ) {
    return true;
  }

  return isPlannedBRTVisualizationRoute(
    activeRouteId
  );
}


/*
  Integrasi yang melibatkan K15–19 tidak ditampilkan.

  - Pada koridor eksisting, kode integrasi K15–19 dibuang.
  - Saat K15–19 aktif, seluruh bagian Integrasi disembunyikan
    karena hubungan integrasinya masih merupakan bagian dari
    skenario visualisasi WebGIS.
*/
function getVisibleStopIntegrationsForContext(
  feature,
  activeRouteId
) {
  if (
    isPlannedBRTVisualizationRoute(
      activeRouteId
    )
  ) {
    return [];
  }

  return getStopIntegrations(
    feature
  ).filter(
    integrationId =>
      !isPlannedBRTVisualizationRoute(
        integrationId
      )
  );
}


/*
  Catatan integrasi skenario muncul jika:
  1. popup sedang dilihat dalam konteks Koridor 15–19; atau
  2. salah satu integrasi pada halte adalah Koridor 15–19.

  Dengan demikian:
  - Koridor 9 -> integrasi Koridor 19 mendapat catatan;
  - Koridor 19 -> integrasi Koridor 9 juga mendapat catatan.

  Badge/logo tetap tampil normal karena moda/rute terkait dapat
  merupakan jaringan eksisting. Yang belum resmi adalah hubungan
  integrasinya pada skenario Koridor 15–19.
*/
function shouldShowPlannedIntegrationNote(
  routeId,
  integrations
) {
  if (
    isPlannedBRTVisualizationRoute(
      routeId
    )
  ) {
    return true;
  }

  return (
    Array.isArray(integrations)
    &&
    integrations.some(
      integrationId =>
        isPlannedBRTVisualizationRoute(
          integrationId
        )
    )
  );
}


function getRoutePlanIntroTitle(
  routeId
) {
  const route =
    getRouteById(
      routeId
    );

  if (!route) {
    return "Koridor Rencana";
  }

  const line =
    cleanText(
      route.properties.LINE
    );

  if (line) {
    return `Koridor ${line}`;
  }

  return (
    cleanText(
      route.properties.OBJECTNAME
    )
    ||
    "Koridor Rencana"
  );
}


function getRoutePlanIntroExtraText(
  routeId
) {
  const info =
    getRoutePlanInfo(
      routeId
    );

  if (!info) {
    return "";
  }

  if (
    routeId === "BRT_15" ||
    routeId === "BRT_18" ||
    routeId === "BRT_19"
  ) {
    return (
      info.note ||
      ""
    );
  }

  return "";
}


function closeRoutePlanIntro() {
  if (
    routePlanIntroTimerId
  ) {
    clearTimeout(
      routePlanIntroTimerId
    );

    routePlanIntroTimerId =
      null;
  }

  if (!routePlanIntroEl) {
    return;
  }

  routePlanIntroEl.classList.remove(
    "is-visible"
  );

  /*
    Beri waktu transisi singkat sebelum hidden.
  */
  setTimeout(
    () => {
      if (
        !routePlanIntroEl
          .classList
          .contains(
            "is-visible"
          )
      ) {
        routePlanIntroEl.hidden =
          true;
      }
    },
    170
  );

  activeRoutePlanIntroRouteId =
    null;
}


function showRoutePlanIntro(
  routeId
) {
  const normalizedRouteId =
    String(
      routeId ||
      ""
    );

  const planInfo =
    getRoutePlanInfo(
      normalizedRouteId
    );

  if (
    !planInfo ||
    shownRoutePlanIntros.has(
      normalizedRouteId
    )
  ) {
    return;
  }

  /*
    Jangan menumpuk route intro di atas Disclaimer atau
    Cara Menggunakan.
  */
  const infoIsOpen =
    Boolean(
      infoModalBackdrop &&
      !infoModalBackdrop.hidden
    );

  const tourIsOpen =
    Boolean(
      productTour &&
      !productTour.hidden
    );

  if (
    startupExperienceActive ||
    infoIsOpen ||
    tourIsOpen
  ) {
    return;
  }

  shownRoutePlanIntros.add(
    normalizedRouteId
  );

  activeRoutePlanIntroRouteId =
    normalizedRouteId;

  if (
    routePlanIntroTitleEl
  ) {
    routePlanIntroTitleEl.textContent =
      getRoutePlanIntroTitle(
        normalizedRouteId
      );
  }

  if (
    routePlanIntroTextEl
  ) {
    routePlanIntroTextEl.innerHTML = `
      Koridor ini tercantum dalam Rencana Tata Ruang DKI Jakarta
      (RTRW dan RDTR). Trase, lokasi, dan penamaan halte yang
      ditampilkan merupakan skenario visualisasi yang disusun
      berdasarkan analisis penyusun WebGIS. Informasi tersebut
      bukan trase maupun halte resmi yang telah ditetapkan oleh
      pemerintah atau operator transportasi.
    `;
  }

  const extraText =
    getRoutePlanIntroExtraText(
      normalizedRouteId
    );

  if (
    routePlanIntroExtraEl
  ) {
    routePlanIntroExtraEl.hidden =
      !extraText;

    routePlanIntroExtraEl.textContent =
      extraText;
  }

  if (!routePlanIntroEl) {
    return;
  }

  routePlanIntroEl.hidden =
    false;

  requestAnimationFrame(
    () => {
      requestAnimationFrame(
        () => {
          routePlanIntroEl
            .classList
            .add(
              "is-visible"
            );
        }
      );
    }
  );
}


function queueRoutePlanIntro(
  routeId
) {
  const normalizedRouteId =
    String(
      routeId ||
      ""
    );

  if (
    !getRoutePlanInfo(
      normalizedRouteId
    ) ||
    shownRoutePlanIntros.has(
      normalizedRouteId
    )
  ) {
    return;
  }

  if (
    routePlanIntroTimerId
  ) {
    clearTimeout(
      routePlanIntroTimerId
    );
  }

  routePlanIntroTimerId =
    setTimeout(
      () => {
        routePlanIntroTimerId =
          null;

        /*
          Pastikan user masih berada pada koridor yang sama.
        */
        if (
          String(
            currentSelectedRouteId ||
            ""
          ) !==
          normalizedRouteId
        ) {
          return;
        }

        showRoutePlanIntro(
          normalizedRouteId
        );
      },
      220
    );
}


function openRoutePlanSourceCard(
  routeId
) {
  const normalizedRouteId =
    String(
      routeId ||
      ""
    );

  /*
    Simpan ID terlebih dahulu karena closeRoutePlanIntro()
    mengosongkan activeRoutePlanIntroRouteId.
  */
  closeRoutePlanIntro();

  const planCard =
    document.querySelector(
      `.route-plan-card[data-route-id="${normalizedRouteId}"]`
    );

  if (!planCard) {
    return;
  }

  planCard.open =
    true;

  planCard.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

  planCard
    .querySelector(
      ".route-plan-summary"
    )
    ?.focus({
      preventScroll: true
    });
}


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


function splitRouteSourceValues(value) {
  return String(value ?? "")
    .split(
      /(?:\r?\n|;)+/
    )
    .map(
      item =>
        item.trim()
    )
    .filter(Boolean);
}


function sanitizeRouteSourceUrl(value) {
  const raw =
    String(value ?? "")
      .trim();

  if (!raw) {
    return "";
  }

  try {
    const parsed =
      new URL(raw);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return "";
    }

    return parsed.href;
  }
  catch (error) {
    return "";
  }
}


function getRouteSourceTypeLabel(feature) {
  const status =
    normalizeStatus(
      feature
        ?.properties
        ?.STATUS
    );

  return {
    Existing:
      "Sumber Data",

    Construction:
      "Sumber Pembangunan",

    Planned:
      "Sumber Rencana",

    Proposed:
      "Sumber Usulan",

    Conceptual:
      "Dasar Analisis"
  }[status] || "Sumber Data";
}


function buildRouteSourceMetadataHTML(
  feature
) {
  const p =
    feature?.properties ?? {};

  const sourceRaw =
    String(
      p.SOURCE ??
      p.SRC_NAME ??
      p.SOURCE_NAME ??
      ""
    ).trim();

  const urlRaw =
    String(
      p.SRC_URL ??
      p.SOURCE_URL ??
      ""
    ).trim();

  const note =
    String(
      p.SRC_NOTE ??
      p.SOURCE_NOTE ??
      ""
    ).trim();

  const sources =
    splitRouteSourceValues(
      sourceRaw
    );

  const urls =
    splitRouteSourceValues(
      urlRaw
    )
      .map(
        sanitizeRouteSourceUrl
      )
      .filter(Boolean);

  if (
    !sources.length &&
    !urls.length &&
    !note
  ) {
    return "";
  }

  const sourceType =
    getRouteSourceTypeLabel(
      feature
    );

  const sourceRows = [];

  if (sources.length) {
    sources.forEach(
      (source, index) => {
        const pairedUrl =
          urls.length === sources.length
            ? urls[index]
            : "";

        sourceRows.push(`
          <div class="route-source-item">
            <div class="route-source-name">
              ${escapeHTML(source)}
            </div>

            ${
              pairedUrl
                ? `
                  <a
                    class="route-source-link"
                    href="${escapeHTML(pairedUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka sumber
                    <span aria-hidden="true">↗</span>
                  </a>
                `
                : ""
            }
          </div>
        `);
      }
    );
  }
  else {
    sourceRows.push(`
      <div class="route-source-item">
        <div class="route-source-name is-generic">
          Sumber daring
        </div>
      </div>
    `);
  }

  /*
    Bila jumlah URL tidak sama dengan jumlah SOURCE,
    jangan menebak pasangan antar-item.
    Tampilkan tautan sebagai daftar terpisah.
  */
  const unpairedLinksHTML =
    urls.length &&
    urls.length !== sources.length
      ? `
        <div class="route-source-links">
          ${
            urls
              .map(
                (url, index) => `
                  <a
                    class="route-source-link"
                    href="${escapeHTML(url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${
                      urls.length > 1
                        ? `Buka sumber ${index + 1}`
                        : "Buka sumber"
                    }
                    <span aria-hidden="true">↗</span>
                  </a>
                `
              )
              .join("")
          }
        </div>
      `
      : "";

  const noteHTML =
    note
      ? `
        <div class="route-source-note">
          <div class="route-source-note-label">
            Keterangan
          </div>

          <div class="route-source-note-text">
            ${escapeHTML(note)}
          </div>
        </div>
      `
      : "";

  return `
    <details class="route-source-card">

      <summary class="route-source-summary">

        <span
          class="route-source-icon"
          aria-hidden="true"
        >
          ↗
        </span>

        <span class="route-source-summary-copy">

          <span class="route-source-type">
            ${escapeHTML(sourceType)}
          </span>

          <span class="route-source-title">
            Sumber &amp; Dasar Data
          </span>

        </span>

        <span
          class="route-source-chevron"
          aria-hidden="true"
        >
          ›
        </span>

      </summary>


      <div class="route-source-body">

        <div class="route-source-list">
          ${sourceRows.join("")}
        </div>

        ${unpairedLinksHTML}

        ${noteHTML}

      </div>

    </details>
  `;
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
    <details
      class="route-plan-card"
      data-route-id="${escapeHTML(routeId)}"
    >

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
          Koridor ini tercantum dalam Rencana Tata Ruang DKI Jakarta
          (RTRW dan RDTR).
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
            Trase, lokasi, dan penamaan halte yang ditampilkan
            merupakan skenario visualisasi yang disusun berdasarkan
            analisis penyusun WebGIS. Informasi tersebut bukan trase
            maupun halte resmi yang telah ditetapkan oleh pemerintah
            atau operator transportasi.
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
      "Petojo",
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
  const explicitCode =
    getOperationalMapValue(
      feature,
      routeId
    );

  /*
    OPS_MAP adalah sumber utama bila tersedia.
    ROUTE_ALERTS tetap menjadi fallback supaya GeoJSON lama
    masih kompatibel.
  */
  if (explicitCode === "NOT_SERVED") {
    return {
      state: "not-served",
      temporaryTerminus: false
    };
  }

  if (explicitCode === "TEMP_SERVED") {
    return {
      state: "temporary-served",
      temporaryTerminus: false
    };
  }

  if (explicitCode === "TEMP_TERMINUS") {
    return {
      state: "temporary-served",
      temporaryTerminus: true
    };
  }

  /*
    PEDOMAN v2.0:
    STOP_VAR / DIV_ID / REPLACES_ID adalah sumber data utama
    untuk relokasi titik halte sementara.
  */
  if (
    isTemporaryStopActiveForRoute(
      feature,
      routeId
    )
  ) {
    return {
      state: "temporary-served",
      temporaryTerminus: false
    };
  }

  if (
    isBaseStopReplacedDuringActiveDiversion(
      feature,
      routeId
    )
  ) {
    return {
      state: "not-served",
      temporaryTerminus: false
    };
  }

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
  const cacheKey =
    `operational:${getRouteDirectionRuntimeCacheKey(routeId)}`;

  if (operationalStopEntriesCache.has(cacheKey)) {
    return operationalStopEntriesCache.get(cacheKey);
  }

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

  const existingKeys =
    new Set(
      entries.map(
        entry =>
          getStopKey(
            entry.feature
          )
      )
    );

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

  /*
    OPS_MAP dapat menambahkan halte ke rute pengalihan
    meskipun ROUTES regulernya tidak mencantumkan routeId.

    Contoh:
      Petojo -> BRT_03:TEMP_SERVED
  */
  if (stopData?.features) {
    const fallbackTemporaryOrder =
      new Map(
        (
          config?.temporaryServed
          ??
          []
        ).map(
          (name, index) => [
            normalizeOperationalStopName(
              name
            ),
            index + 1
          ]
        )
      );

    const explicitTemporary =
      stopData.features
        .filter(feature => {
          const code =
            getOperationalMapValue(
              feature,
              routeId
            );

          return (
            code === "TEMP_SERVED"
            ||
            code === "TEMP_TERMINUS"
          );
        })
        .filter(
          feature =>
            !existingKeys.has(
              getStopKey(feature)
            )
        )
        .map(feature => {
          const state =
            getOperationalStopState(
              feature,
              routeId
            );

          const normalizedName =
            normalizeOperationalStopName(
              getStopDisplayName(
                feature
              )
            );

          return {
            feature,
            state: "temporary-served",
            temporaryTerminus:
              state.temporaryTerminus,
            virtual: true,
            temporaryIndex:
              fallbackTemporaryOrder.get(
                normalizedName
              )
              ??
              9999
          };
        })
        .sort(
          (a, b) => {
            const seqA =
              getStopSequence(
                a.feature,
                routeId
              );

            const seqB =
              getStopSequence(
                b.feature,
                routeId
              );

            const hasDivA =
              seqA < 999999;

            const hasDivB =
              seqB < 999999;

            if (hasDivA && hasDivB) {
              return seqA - seqB;
            }

            if (hasDivA) {
              return -1;
            }

            if (hasDivB) {
              return 1;
            }

            return (
              a.temporaryIndex -
              b.temporaryIndex
            );
          }
        );

    explicitTemporary
      .forEach(entry => {
        const key =
          getStopKey(
            entry.feature
          );

        const name =
          normalizeOperationalStopName(
            getStopDisplayName(
              entry.feature
            )
          );

        entries.push(entry);

        existingKeys.add(key);
        existingNames.add(name);
      });
  }

  /*
    Fallback lama berbasis nama tetap dipertahankan.
    Berguna bila brt_stop.geojson belum memiliki OPS_MAP.
  */
  if (config) {
    (config.temporaryServed || [])
      .forEach(
        (stopName, index) => {
          const normalizedName =
            normalizeOperationalStopName(
              stopName
            );

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

          existingKeys.add(
            getStopKey(
              feature
            )
          );
        }
      );
  }

  operationalStopEntriesCache.set(cacheKey, entries);
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
  return getLogicalOperationalStopEntries(
    routeId,
    {
      includeNotServed: false
    }
  )
    .map(
      entry =>
        entry.feature
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


/*
  =========================================================
  OPERATIONAL ROUTE BADGE STATE
  =========================================================

  Badge rute di popup/list dibaca PER KORIDOR, bukan hanya
  berdasarkan koridor aktif.

  Visual grammar:
  - TEMP_SERVED   -> ring amber dashed + "Sementara"
  - TEMP_TERMINUS -> ring amber solid + "Terminus sementara"
  - NOT_SERVED    -> tidak masuk "Koridor yang dilayani";
                     tampil redup pada "Terdampak pengalihan"
*/


function getOperationalRouteBadgeState(
  feature,
  routeId
) {
  const state =
    getOperationalStopState(
      feature,
      routeId
    );

  if (
    state.state ===
    "not-served"
  ) {
    return {
      code: "NOT_SERVED",
      className:
        "is-operational-not-served",
      label:
        "Tidak dilayani sementara"
    };
  }

  if (
    state.temporaryTerminus
  ) {
    return {
      code: "TEMP_TERMINUS",
      className:
        "is-operational-temp-terminus",
      label:
        "Terminus sementara"
    };
  }

  if (
    state.state ===
    "temporary-served"
  ) {
    return {
      code: "TEMP_SERVED",
      className:
        "is-operational-temporary",
      label:
        "Sementara"
    };
  }

  return {
    code: "REGULAR",
    className: "",
    label: ""
  };
}


function getOperationalRouteIdsForStop(
  feature
) {
  const ids =
    new Set();

  /*
    ROUTE_ALERTS menjadi fallback untuk data lama.
  */
  Object.keys(
    ROUTE_ALERTS || {}
  )
    .forEach(
      routeId =>
        ids.add(
          String(routeId)
        )
    );

  /*
    OPS_MAP dapat membawa route operasional yang tidak ada
    pada ROUTES reguler, mis. Petojo -> BRT_03:TEMP_SERVED.
  */
  const opsMap =
    parseRouteMap(
      feature
        ?.properties
        ?.OPS_MAP
      ?? ""
    );

  Object.keys(
    opsMap
  )
    .forEach(
      routeId =>
        ids.add(
          String(routeId)
        )
    );

  return Array.from(ids)
    .filter(
      routeId =>
        Boolean(
          getRouteById(
            routeId
          )
        )
    )
    .filter(
      routeId =>
        getOperationalRouteBadgeState(
          feature,
          routeId
        ).code !== "REGULAR"
    );
}


function getTemporarilyServedRouteIdsForStop(
  feature,
  activeRouteId = ""
) {
  return getOperationalRouteIdsForStop(
    feature
  )
    .filter(
      routeId => {
        const state =
          getOperationalRouteBadgeState(
            feature,
            routeId
          );

        return (
          state.code === "TEMP_SERVED"
          ||
          state.code === "TEMP_TERMINUS"
        );
      }
    )
    .filter(
      routeId =>
        shouldShowPlannedRouteBadgeInContext(
          routeId,
          activeRouteId
        )
    );
}


function getNotServedRouteIdsForStop(
  feature,
  activeRouteId = ""
) {
  return getOperationalRouteIdsForStop(
    feature
  )
    .filter(
      routeId =>
        getOperationalRouteBadgeState(
          feature,
          routeId
        ).code ===
        "NOT_SERVED"
    )
    .filter(
      routeId =>
        shouldShowPlannedRouteBadgeInContext(
          routeId,
          activeRouteId
        )
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
    return isTemporaryStopFeature(
      feature
    )
      ? "Halte Sementara"
      : "Sementara";
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

  if (
    role === "Sementara" ||
    role === "Halte Sementara"
  ) {
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
    )
      .filter(
        routeId =>
          getOperationalRouteBadgeState(
            feature,
            routeId
          ).code !==
          "NOT_SERVED"
      );

  const temporaryRoutes =
    getTemporarilyServedRouteIdsForStop(
      feature,
      activeRouteId
    );

  temporaryRoutes
    .forEach(
      routeId => {
        if (
          !routes.includes(
            String(routeId)
          )
        ) {
          routes.push(
            String(routeId)
          );
        }
      }
    );

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

  const configured =
    ROUTE_ALERTS[
      routeId
    ];

  /*
    PEDOMAN v2.0:
    ketika feature aktif memang ROUTE_VAR=DIVERSION,
    metadata DIV_ID / DIV_NOTE / DIV_SRC menjadi sumber utama.

    ROUTE_ALERTS tetap dipakai sebagai fallback untuk daftar
    halte terdampak lama selama migrasi OPS_MAP belum selesai.
  */
  if (
    normalizeRouteVariant(
      feature
    ) === "DIVERSION"
  ) {
    return {
      hasAlert: true,

      type:
        "Pengalihan Sementara",

      title:
        getRouteTitle(
          feature
        ),

      note:
        cleanText(
          p.DIV_NOTE
        )
        ||
        cleanText(
          configured?.note
        ),

      source:
        cleanText(
          p.DIV_SRC
        )
        ||
        cleanText(
          configured?.source
        ),

      geometryUnchanged: false,

      temporaryTerminus:
        cleanText(
          configured
            ?.temporaryTerminus
        ),

      notServed:
        Array.isArray(
          configured?.notServed
        )
          ? configured.notServed
              .map(cleanText)
              .filter(Boolean)
          : [],

      temporaryServed:
        Array.isArray(
          configured?.temporaryServed
        )
          ? configured.temporaryServed
              .map(cleanText)
              .filter(Boolean)
          : [],

      stops:
        Array.isArray(
          configured?.temporaryServed
        )
          ? configured.temporaryServed
              .map(cleanText)
              .filter(Boolean)
          : []
    };
  }

  /*
    Backward compatibility:
    konfigurasi operasional lama di map.js.
  */
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
        )
        &&
        !hasRouteDiversion(
          routeId
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

  const routeSummaryHTML =
    buildRouteSummaryHTML(
      feature,
      objectName
    );

  const routeAlertHTML =
    buildRouteAlertHTML(
      feature,
      objectName
    );

  const routePlanInfoHTML =
    buildRoutePlanInfoHTML(
      feature
    );

  const routeSourceMetadataHTML =
    buildRouteSourceMetadataHTML(
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

  const structureSummary =
    getRouteMode(feature) !== "BRT"
      ? getRouteStructureSummary(routeId)
      : "";

  const structureSummaryHTML = structureSummary
    ? `
      <div class="route-meta-row">
        <div class="route-meta-label">Struktur jalur</div>
        <div>${escapeHTML(structureSummary)}</div>
      </div>
    `
    : "";

  const nonExistingCount =
    proposedCount + conceptualCount;

  const regularRouteToggleHTML =
    hasRouteDiversion(
      routeId
    )
      ? `
        <div
          class="optional-stop-control route-regular-control"
          data-route-regular-control
        >
          <div class="optional-stop-control-copy">
            <div class="optional-stop-control-title">
              Tampilkan trase reguler
            </div>

            <div class="optional-stop-control-hint">
              Tampilkan trase normal sebagai pembanding
              terhadap pengalihan sementara.
            </div>
          </div>

          <label
            class="optional-stop-switch"
            title="Tampilkan atau sembunyikan trase reguler"
          >
            <input
              type="checkbox"
              data-route-regular-toggle
              ${showRegularRouteComparison ? "checked" : ""}
              aria-label="Tampilkan trase reguler"
            />

            <span
              class="optional-stop-switch-track"
              aria-hidden="true"
            >
              <span class="optional-stop-switch-thumb"></span>
            </span>
          </label>
        </div>
      `
      : "";

  const optionalStopsHTML =
    nonExistingCount
      ? `
        <div
          class="optional-stop-control"
          data-optional-stop-status="NonExisting"
        >
          <div class="optional-stop-control-copy">
            <div class="optional-stop-control-title">
              Tampilkan ${escapeHTML(objectName.toLowerCase())} non-eksisting
              <span
                class="optional-stop-count optional-stop-count-nonexisting"
              >
                ${nonExistingCount}
              </span>
            </div>

            <div class="optional-stop-control-hint">
              Mencakup status Usulan dan Gagasan.
            </div>
          </div>

          <label
            class="optional-stop-switch"
            title="Tampilkan atau sembunyikan ${escapeHTML(objectName.toLowerCase())} non-eksisting"
          >
            <input
              type="checkbox"
              data-optional-stop-toggle="NonExisting"
              ${areNonExistingStopsVisible() ? "checked" : ""}
              aria-label="Tampilkan ${escapeHTML(objectName.toLowerCase())} non-eksisting"
            />

            <span
              class="optional-stop-switch-track"
              aria-hidden="true"
            >
              <span class="optional-stop-switch-thumb"></span>
            </span>
          </label>
        </div>
      `
      : "";

  const routeTitle =
    getRouteTitle(feature);

  const routeTitleLength =
    Array.from(routeTitle).length;

  const routeTitleClass =
    routeTitleLength >= 38
      ? "route-title is-very-long"
      : routeTitleLength >= 30
        ? "route-title is-long"
        : "route-title";

  routeInfoEl.innerHTML = `
    <h2 class="${routeTitleClass}">
      ${escapeHTML(routeTitle)}
    </h2>

    ${buildRouteDirectionControlHTML(routeId)}

    <div class="route-meta">
      <div class="route-meta-row">
        <div class="route-meta-label">Moda</div>
        <div>${escapeHTML(getRouteMode(feature))}</div>
      </div>

      <div class="route-meta-row">
        <div class="route-meta-label">Status</div>
        <div>${escapeHTML(getRouteStatusSummary(routeId) || getStatusLabel(p.STATUS))}</div>
      </div>

      ${structureSummaryHTML}
      ${alignmentHTML}
    </div>

    ${routeSummaryHTML}

    ${routeSourceMetadataHTML}

    ${routePlanInfoHTML}

    ${routeAlertHTML}

    <div class="optional-stop-controls">
      ${regularRouteToggleHTML}
      ${optionalStopsHTML}
    </div>
  `;
}


/*
  Route direction memakai event delegation pada routeInfoEl yang
  persisten. Tombol boleh dirender ulang tanpa kehilangan handler.
*/
routeInfoEl
  ?.addEventListener(
    "click",
    event => {
      const button =
        event.target
          ?.closest?.(
            "[data-route-direction-toggle]"
          );

      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const routeId = String(
        button.dataset.routeDirectionToggle ||
        currentSelectedRouteId ||
        ""
      );

      if (!routeId || !isRouteDirectionEnabled(routeId)) return;

      toggleActiveRouteDirection(routeId);
      refreshRouteDirectionView(routeId);
    }
  );


/*
  Toggle memakai event delegation karena routeInfo dirender
  ulang setiap kali rute berubah.
*/
routeInfoEl
  ?.addEventListener(
    "change",
    event => {

      const regularToggle =
        event.target
          ?.closest?.(
            "[data-route-regular-toggle]"
          );

      if (regularToggle) {
        const routeId =
          currentSelectedRouteId
          ||
          (
            routeSelect?.value !== "ALL"
              ? routeSelect?.value
              : ""
          );

        if (
          !routeId ||
          !hasRouteDiversion(
            routeId
          )
        ) {
          regularToggle.checked =
            false;

          showRegularRouteComparison =
            false;

          return;
        }

        showRegularRouteComparison =
          Boolean(
            regularToggle.checked
          );

        /*
          Hanya geometri yang digambar ulang.
          Daftar halte, popup stop, dan status operasional
          tetap mengikuti pelayanan aktif/pengalihan.
        */
        drawSelectedRouteGeometry(
          routeId
        );

        fitRouteToScreen();

        return;
      }


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

      if (status !== "NonExisting") {
        return;
      }

      setNonExistingStopsVisible(
        Boolean(toggle.checked)
      );

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
          selectedFeature &&
          (
            (
              isProposedStopFeature(
                selectedFeature
              )
              &&
              !isOptionalStopVisible(
                "Proposed"
              )
            )
            ||
            (
              isConceptualStopFeature(
                selectedFeature
              )
              &&
              !isOptionalStopVisible(
                "Conceptual"
              )
            )
          );

        if (hiddenNow) {
          clearSelectedStop();
        }
      }

      renderRouteInfo(
        getRouteById(
          routeId
        )
      );

      renderStopList(
        routeId
      );

      drawStops(
        routeId
      );
    }
  );

/* =========================================================
   DROPDOWN ROUTE
   ========================================================= */

function populateRouteDropdown() {
  updateStatusAvailabilityForMode();

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

function buildSmallRouteBadge(
  routeId,
  feature = null
) {
  const route =
    getRouteById(routeId);

  if (!route) {
    return "";
  }

  const mode =
    getRouteMode(route);

  const operational =
    feature
      ? getOperationalRouteBadgeState(
          feature,
          routeId
        )
      : {
          code: "REGULAR",
          className: "",
          label: ""
        };

  const status =
    normalizeStatus(
      route.properties.STATUS
    );

  const titleParts = [
    getRouteTitle(route)
  ];

  if (status) {
    titleParts.push(
      getStatusLabel(status)
    );
  }

  if (operational.label) {
    titleParts.push(
      operational.label
    );
  }

  if (mode === "BRT") {
    const number =
      routeNumberFromId(
        routeId
      );

    return `
      <span
        class="
          stop-list-route-badge
          ${Number(number) >= 10 ? "is-double-digit" : ""}
          ${operational.className}
        "
        style="
          background:
          ${escapeHTML(getRouteColor(routeId))};
        "
        title="${escapeHTML(
          titleParts.join(" · ")
        )}"
      >
        ${escapeHTML(number)}
      </span>
    `;
  }

  const lineBadgeHTML =
    buildLineBadge(routeId);

  if (!lineBadgeHTML) {
    return "";
  }

  return `
    <span
      class="
        stop-list-route-badge
        is-rail
        ${operational.className}
      "
      title="${escapeHTML(
        titleParts.join(" · ")
      )}"
    >
      ${lineBadgeHTML}
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
          Boolean(
            getRouteById(routeId)
          )
      )
      .filter(
        candidateRouteId =>
          shouldShowPlannedRouteBadgeInContext(
            candidateRouteId,
            activeRouteId
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
    Saat rute aktif Rencana / Usulan / Gagasan:
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
    OPERATOR-LEVEL ALIASES

    Berguna ketika titik integrasi diketahui tetapi koridor/lin
    spesifik tidak perlu disimpan pada INTEGRASI. Navigasi tetap
    dapat dilakukan melalui INT_STOP.
  */
  if (
    code === "TRANSJAKARTA" ||
    code === "TJ" ||
    code === "BRT"
  ) {
    return {
      code,
      operatorKey: "TRANSJAKARTA",
      operator: "TransJakarta",
      route: "",
      logo: TRANSIT_LOGOS.TJ,
      brtOperator: true,
      operatorOnly: true
    };
  }

  if (
    code === "MRT" ||
    code === "MRT_JAKARTA"
  ) {
    return {
      code,
      operatorKey: "MRT_JAKARTA",
      operator: "MRT Jakarta",
      route: "",
      logo: TRANSIT_LOGOS.MRT,
      mrtOperator: true,
      operatorOnly: true
    };
  }


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
  integrationNameMap = {},
  integrationStatusMap = {
    exact: {},
    byCode: {},
    entries: []
  },
  integrationTargetMap = {}
) {

  const groups = new Map();

  ids.forEach(id => {
    const info = getIntegrationInfo(id);
    const key = info.operatorKey;

    const legacyRelatedNames =
      getIntegrationMultiMapValues(
        integrationNameMap,
        info.code || id
      );

    const targetStopIds =
      getIntegrationMultiMapValues(
        integrationTargetMap,
        info.code || id
      );

    /*
      INT_NM v27 dapat memakai target ID sebagai key. Karena itu
      presence check tidak hanya melihat nama keyed-by-kode.
    */
    const hasTargetKeyedName = targetStopIds.some(targetStopId =>
      getIntegrationMultiMapValues(
        integrationNameMap,
        targetStopId
      ).length > 0
    );

    /*
      Tidak lagi membuat placeholder kosong.
      INTEGRASI tanpa INT_NM maupun INT_STOP dianggap data belum
      lengkap: disembunyikan dari UI dan dilaporkan validator.
    */
    if (
      !legacyRelatedNames.length &&
      !targetStopIds.length &&
      !hasTargetKeyedName
    ) {
      return;
    }

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

    const serviceCount = Math.max(
      legacyRelatedNames.length,
      targetStopIds.length,
      1
    );

    for (let index = 0; index < serviceCount; index += 1) {
      const targetStopId = targetStopIds[index] || "";
      let relatedName = getIntegrationRelatedName(
        integrationNameMap,
        info.code || id,
        targetStopId,
        index
      );

      /*
        Bila hanya INT_STOP yang diisi, nama target dapat diturunkan
        dari dataset yang sedang dimuat. Ini menjaga UI tetap bersih
        tanpa memaksa duplikasi nama di master data.
      */
      if (!relatedName && targetStopId) {
        const candidateRouteIds = [
          info.routeId,
          info.code
        ]
          .map(value => String(value ?? "").trim())
          .filter(routeId => Boolean(getRouteById(routeId)));

        const targetFeature =
          findIntegrationStopFeatureByTargetId(
            targetStopId,
            candidateRouteIds,
            getIntegrationExpectedModes([info])
          );

        if (targetFeature) {
          relatedName = stripTransitPlacePrefix(
            getStopDisplayName(targetFeature)
          );
        }
      }

      groups
        .get(key)
        .services
        .push({
          ...info,
          relatedName,
          targetStopId,
          integrationStatus:
            getIntegrationStatusFromMap(
              integrationStatusMap,
              info.code || id,
              relatedName
            )
        });
    }
  });

  return Array.from(groups.values())
    .filter(group => group.services.length > 0)
    .sort((a, b) => {
      const priorityDiff =
        getIntegrationOperatorPriority(a.operatorKey)
        -
        getIntegrationOperatorPriority(b.operatorKey);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return String(a.operator || a.operatorKey)
        .localeCompare(
          String(b.operator || b.operatorKey),
          "id"
        );
    });
}


function stripTransitPlacePrefix(value) {
  return String(value ?? "")
    .replace(/^\s*(?:halte|stasiun)\s+/i, "")
    .trim();
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

  if (
    prefix &&
    new RegExp(`^${prefix}\\s+`, "i").test(relatedName)
  ) {
    return relatedName;
  }

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
    service.terminal ||
    service.operatorOnly ||
    service.brtOperator
  ) {
    return "";
  }

  const badgeHTML =
    service.brt
      ? buildBrtBadge(
          service.routeId
        )
      : buildLineBadge(
          service.code
        );

  if (!badgeHTML) {
    return "";
  }

  const status =
    normalizeIntegrationStatus(
      service.integrationStatus
    ) || "Existing";

  return `
    <span
      class="integration-badge-state ${getIntegrationStatusClass(status)}"
      data-integration-status="${escapeHTML(status)}"
    >
      ${badgeHTML}
    </span>
  `;
}


function groupServicesByRelatedPlace(services) {
  const groups =
    new Map();


  services.forEach((service, serviceIndex) => {

    const placeLabel =
      getIntegrationPlaceLabel(
        service
      );

    /*
      Jika beberapa lin menuju titik yang sama:
      [CB] [BK] Stasiun Dukuh Atas
    */
    const targetStopId =
      cleanText(service?.targetStopId);

    const key =
      placeLabel ||
      (
        targetStopId
          ? `__TARGET__${service.code}::${targetStopId}`
          : `__NO_PLACE__${service.code}`
      );


    if (!groups.has(key)) {
      groups.set(
        key,
        {
          placeLabel,
          services: [],

          /*
            Urutan pertama pada INT_NM / INT_STOP disimpan agar
            tie-break antar titik pada koridor yang sama tetap
            mengikuti urutan yang ditulis pengelola data.
          */
          firstIndex: serviceIndex
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
  )
    .map(
      group => ({
        ...group,
        integrationStatus:
          getIntegrationPlaceStatus(
            group.services
          )
      })
    )
    .sort(
      (a, b) => {
        const statusDiff =
          getIntegrationStatusPriority(
            a.integrationStatus
          )
          -
          getIntegrationStatusPriority(
            b.integrationStatus
          );

        if (statusDiff !== 0) {
          return statusDiff;
        }

        return String(
          a.placeLabel || ""
        ).localeCompare(
          String(
            b.placeLabel || ""
          ),
          "id"
        );
      }
    );
}


function getIntegrationExpectedModes(services) {
  const modes = new Set();

  (Array.isArray(services) ? services : [])
    .forEach(service => {
      if (service?.brt || service?.brtOperator || service?.operatorKey === "TRANSJAKARTA") {
        modes.add("BRT");
      }
      else if (service?.operatorKey === "MRT_JAKARTA") {
        modes.add("MRT");
      }
      else if (service?.operatorKey === "KRL") {
        modes.add("KRL");
      }
      else if (
        service?.operatorKey === "LRT_JAKARTA" ||
        service?.operatorKey === "LRT_JABODEBEK"
      ) {
        modes.add("LRT");
      }
    });

  return Array.from(modes);
}


function stopMatchesExpectedModes(
  feature,
  expectedModes = []
) {
  if (!Array.isArray(expectedModes) || !expectedModes.length) {
    return true;
  }

  return expectedModes.includes(
    normalizeMode(feature?.properties?.MODE)
  );
}


function stopMatchesIntegrationRoute(
  feature,
  routeId
) {
  if (!feature || !routeId) {
    return false;
  }

  if (stopServesRoute(feature, routeId)) {
    return true;
  }

  const operational =
    getOperationalMapValue(
      feature,
      routeId
    );

  return [
    "TEMP_SERVED",
    "TEMP_TERMINUS",
    "NOT_SERVED"
  ].includes(operational);
}


function findIntegrationStopFeatureByTargetId(
  targetId,
  routeIds = [],
  expectedModes = []
) {
  if (!stopData?.features || !hasText(targetId)) {
    return null;
  }

  const target = String(targetId).trim().toUpperCase();
  const validRouteIds = (Array.isArray(routeIds) ? routeIds : [])
    .map(value => String(value ?? "").trim())
    .filter(Boolean);

  /* GEOM_ID adalah target paling spesifik. */
  const exactGeom = stopData.features
    .filter(feature => stopMatchesExpectedModes(feature, expectedModes))
    .find(feature =>
      String(feature?.properties?.GEOM_ID ?? "")
        .trim()
        .toUpperCase() === target
    );

  if (exactGeom) {
    return exactGeom;
  }

  const candidates = stopData.features
    .filter(feature => stopMatchesExpectedModes(feature, expectedModes))
    .filter(feature => {
      const p = feature?.properties ?? {};
      const ids = [
        p.STOP_ID,
        p._RUNTIME_STOP_KEY,
        p.STATION_ID,
        p.ID
      ]
        .map(value => String(value ?? "").trim().toUpperCase())
        .filter(Boolean);

      return ids.includes(target);
    });

  if (!candidates.length) {
    return null;
  }

  for (const routeId of validRouteIds) {
    const routeMatched = candidates.filter(feature =>
      stopMatchesIntegrationRoute(feature, routeId)
    );

    if (routeMatched.length) {
      return (
        chooseStopGroupRepresentative(routeMatched, routeId)
        || routeMatched[0]
      );
    }
  }

  return candidates[0] || null;
}


function getIntegrationRouteIdsForServices(services) {
  return Array.from(
    new Set(
      (Array.isArray(services) ? services : [])
        .flatMap(service => [
          service?.routeId,
          service?.operatorOnly ? "" : service?.code
        ])
        .map(value => String(value ?? "").trim())
        .filter(routeId => Boolean(getRouteById(routeId)))
    )
  );
}


function findTransJakartaIntegrationStopFeature(
  relatedName,
  routeIds = []
) {
  if (
    !stopData?.features ||
    !hasText(relatedName)
  ) {
    return null;
  }

  const targetName =
    normalizeOperationalStopName(
      relatedName
    );

  const validRouteIds =
    routeIds
      .map(
        value =>
          String(value ?? "")
            .trim()
      )
      .filter(Boolean);

  const matches =
    stopData.features
      .filter(
        feature =>
          normalizeMode(
            feature?.properties?.MODE
          ) === "BRT"
      )
      .filter(
        feature =>
          normalizeOperationalStopName(
            getStopDisplayName(
              feature
            )
          ) === targetName
      );

  if (!matches.length) {
    return null;
  }

  /*
    Bila INT_NM menunjuk nama halte yang kebetulan sama,
    route integration dipakai sebagai discriminator tambahan.
  */
  const routeMatched =
    matches.filter(
      feature =>
        validRouteIds.some(
          routeId => {
            if (
              stopServesRoute(
                feature,
                routeId
              )
            ) {
              return true;
            }

            const operational =
              getOperationalMapValue(
                feature,
                routeId
              );

            return (
              operational === "TEMP_SERVED" ||
              operational === "TEMP_TERMINUS" ||
              operational === "NOT_SERVED"
            );
          }
        )
    );

  const candidates =
    routeMatched.length
      ? routeMatched
      : matches;

  /*
    Jika satu halte logis memiliki dua titik fisik
    BOARD / ALIGHT, prioritaskan titik penaikan.
  */
  for (
    const routeId
    of validRouteIds
  ) {
    const groupedCandidates =
      candidates.filter(
        feature =>
          stopServesRoute(
            feature,
            routeId
          )
          ||
          Boolean(
            getOperationalMapValue(
              feature,
              routeId
            )
          )
      );

    if (groupedCandidates.length) {
      return (
        chooseStopGroupRepresentative(
          groupedCandidates,
          routeId
        )
        ||
        groupedCandidates[0]
      );
    }
  }

  return candidates[0] || null;
}


function normalizeIntegrationStopMatchName(value) {
  return normalizeOperationalStopName(
    String(value ?? "")
      .replace(/^\s*(?:halte|stasiun)\s+/i, "")
      .trim()
  );
}


function isIntegrationStopNameMatch(a, b) {
  const left = normalizeIntegrationStopMatchName(a);
  const right = normalizeIntegrationStopMatchName(b);

  if (!left || !right) return false;
  if (left === right) return true;

  /*
    Sponsorship / naming suffix dapat berbeda antara dataset BRT
    dan rail, mis. "ASEAN Headquarters" vs "ASEAN", atau
    "Dukuh Atas BNI" vs "Dukuh Atas". Route context tetap
    menjadi discriminator utama sehingga fuzzy match ini tidak
    dipakai lintas lin secara bebas.
  */
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;

  return (
    shorter.length >= 4 &&
    (
      longer.startsWith(`${shorter} `) ||
      longer.endsWith(` ${shorter}`) ||
      longer.includes(` ${shorter} `)
    )
  );
}


function findNetworkIntegrationStopFeature(
  relatedName,
  routeIds = [],
  expectedModes = []
) {
  if (
    !stopData?.features ||
    !hasText(relatedName)
  ) {
    return null;
  }

  const targetName =
    normalizeIntegrationStopMatchName(
      relatedName
    );

  const validRouteIds = routeIds
    .map(value => String(value ?? "").trim())
    .filter(routeId => Boolean(getRouteById(routeId)));

  const matches = stopData.features
    .filter(feature =>
      stopMatchesExpectedModes(
        feature,
        expectedModes
      )
    )
    .filter(feature =>
      isIntegrationStopNameMatch(
        getStopDisplayName(feature),
        targetName
      )
    );

  if (!matches.length) {
    return null;
  }

  const routeMatched = matches.filter(feature =>
    validRouteIds.some(routeId =>
      stopMatchesIntegrationRoute(
        feature,
        routeId
      )
    )
  );

  const candidates = routeMatched.length
    ? routeMatched
    : matches;

  for (const routeId of validRouteIds) {
    const grouped = candidates.filter(feature =>
      stopMatchesIntegrationRoute(
        feature,
        routeId
      )
    );

    if (grouped.length) {
      return (
        chooseStopGroupRepresentative(
          grouped,
          routeId
        ) || grouped[0]
      );
    }
  }

  return candidates[0] || null;
}


function openNetworkIntegrationStop(
  stopKey,
  preferredRouteId = ""
) {
  const feature =
    getStopByKey(
      stopKey
    );

  if (!feature) {
    return;
  }

  const stopRoutes =
    getStopRoutes(
      feature
    )
      .filter(
        routeId =>
          Boolean(
            getRouteById(
              routeId
            )
          )
      );

  const preferred =
    String(
      preferredRouteId ?? ""
    )
      .trim();

  /*
    Prioritas konteks:
    1. route dari badge integrasi yang diklik
    2. route valid pertama pada halte target
  */
  const routeId =
    (
      preferred &&
      getRouteById(preferred) &&
      (
        stopServesRoute(
          feature,
          preferred
        )
        ||
        Boolean(
          getOperationalMapValue(
            feature,
            preferred
          )
        )
      )
    )
      ? preferred
      : stopRoutes[0];

  if (!routeId) {
    console.warn(
      "Titik integrasi tidak memiliki konteks lin/koridor yang valid:",
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
    Sinkronkan filter/dropdown dengan koridor halte integrasi.
  */
  modeSelect.value =
    getRouteMode(
      route
    );

  statusSelect.value =
    normalizeStatus(
      route.properties.STATUS
    );

  populateRouteDropdown();

  routeSelect.value =
    String(routeId);

  /*
    Navigasi dari popup Integrasi tidak melakukan fit/zoom ulang
    terhadap rute target. Pertahankan level zoom user saat ini
    agar perpindahan terasa seperti sliding di atas peta.
  */
  showSingleRoute(
    routeId,
    false,
    false
  );

  /*
    Marker target sudah dibuat oleh showSingleRoute().
    selectStop(..., false) mempertahankan zoom dan melakukan
    pan halus sebelum popup target dibuka.
  */
  requestAnimationFrame(
    () => {
      selectStop(
        stopKey,
        routeId,
        false
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


function resolveIntegrationPlaceTarget(placeGroup) {
  const services = Array.isArray(placeGroup?.services)
    ? placeGroup.services
    : [];

  const routeIds =
    getIntegrationRouteIdsForServices(
      services
    );

  const expectedModes =
    getIntegrationExpectedModes(
      services
    );

  const targetStopIds = services
    .map(service => cleanText(service?.targetStopId))
    .filter(Boolean);

  let targetFeature = null;

  /* INT_STOP selalu menjadi resolver utama. */
  for (const targetStopId of targetStopIds) {
    targetFeature =
      findIntegrationStopFeatureByTargetId(
        targetStopId,
        routeIds,
        expectedModes
      );

    if (targetFeature) {
      break;
    }
  }

  /* Fallback kompatibilitas: INT_NM + konteks route/operator. */
  if (!targetFeature) {
    const relatedName = services
      .map(service => cleanText(service?.relatedName))
      .find(Boolean) || "";

    if (relatedName) {
      const isTransJakartaGroup = services.some(service =>
        service?.brt ||
        service?.brtOperator ||
        service?.operatorKey === "TRANSJAKARTA"
      );

      targetFeature = isTransJakartaGroup
        ? findTransJakartaIntegrationStopFeature(
            relatedName,
            routeIds
          )
        : findNetworkIntegrationStopFeature(
            relatedName,
            routeIds,
            expectedModes
          );
    }
  }

  if (!targetFeature) {
    return {
      targetFeature: null,
      targetStopKey: "",
      targetRouteId: "",
      routeIds,
      expectedModes
    };
  }

  const targetStopKey =
    getStopKey(targetFeature);

  const targetRouteIds =
    getStopRoutes(targetFeature)
      .filter(routeId => Boolean(getRouteById(routeId)));

  const targetRouteId =
    routeIds.find(routeId =>
      stopMatchesIntegrationRoute(
        targetFeature,
        routeId
      )
    )
    || targetRouteIds[0]
    || "";

  return {
    targetFeature,
    targetStopKey,
    targetRouteId,
    routeIds,
    expectedModes
  };
}


function buildIntegrationPlaceRow(placeGroup) {
  const placeStatus =
    normalizeIntegrationStatus(
      placeGroup.integrationStatus
    ) || "Existing";

  const placeStatusClass =
    getIntegrationStatusClass(
      placeStatus
    );

  const statusPillHTML =
    buildIntegrationStatusPill(
      placeStatus
    );

  const resolved =
    resolveIntegrationPlaceTarget(
      placeGroup
    );

  let placeLabel =
    String(placeGroup.placeLabel || "").trim();

  /*
    Jika INT_NM kosong tetapi INT_STOP valid, tampilkan nama yang
    berasal dari feature target. Tidak ada lagi teks placeholder.
  */
  if (!placeLabel && resolved.targetFeature) {
    const representativeService = placeGroup.services[0] || {};
    const targetName = stripTransitPlacePrefix(
      getStopDisplayName(resolved.targetFeature)
    );

    placeLabel = getIntegrationPlaceLabel({
      ...representativeService,
      relatedName: targetName
    });
  }

  /*
    Guard terakhir: baris integrasi tanpa nama yang dapat ditampilkan
    tidak dirender. Validator tetap memberi catatan untuk pengelola.
  */
  if (!placeLabel) {
    return "";
  }

  let badgesHTML = placeGroup.services
    .map(buildIntegrationBadge)
    .join("");

  /*
    Operator-level TRANSJAKARTA + INT_STOP dapat menurunkan badge
    koridor dari target aktual tanpa memaksa INTEGRASI berisi semua
    kode koridor.
  */
  if (
    !badgesHTML &&
    resolved.targetFeature &&
    placeGroup.services.some(service =>
      service?.brtOperator ||
      service?.operatorKey === "TRANSJAKARTA"
    )
  ) {
    badgesHTML = getStopRoutes(resolved.targetFeature)
      .filter(routeId => {
        const route = getRouteById(routeId);
        return route && getRouteMode(route) === "BRT";
      })
      .map(routeId => buildBrtBadge(routeId))
      .join("");
  }

  const placeHTML = `
    <span class="integration-place-name-wrap">
      <span class="integration-place-name">
        ${escapeHTML(placeLabel)}
      </span>
      ${statusPillHTML}
    </span>
  `;

  const isClickable = Boolean(
    resolved.targetStopKey &&
    resolved.targetRouteId
  );

  if (isClickable) {
    return `
      <button
        type="button"
        class="
          integration-place-row
          integration-place-row-button
          is-network-link
          ${placeStatusClass}
        "
        data-integration-stop-key="${escapeHTML(resolved.targetStopKey)}"
        data-integration-route-id="${escapeHTML(resolved.targetRouteId)}"
        title="Buka ${escapeHTML(placeLabel)}"
        aria-label="Buka ${escapeHTML(placeLabel)} pada peta"
      >
        <span class="integration-line-badges">
          ${badgesHTML}
        </span>

        ${placeHTML}

        <span
          class="integration-place-link-arrow"
          aria-hidden="true"
        >›</span>
      </button>
    `;
  }

  /*
    Integrasi ke jaringan yang datanya belum dimuat tetap boleh tampil
    secara informatif jika INT_NM tersedia, tetapi tanpa chevron/link.
  */
  return `
    <div class="integration-place-row ${placeStatusClass}">
      <div class="integration-line-badges">
        ${badgesHTML}
      </div>
      ${placeHTML}
    </div>
  `;
}


/*
  =========================================================
  URUTAN TITIK INTEGRASI TRANSJAKARTA
  =========================================================

  Di dalam satu grup operator TransJakarta, titik integrasi
  diurutkan menurut nomor koridor yang ditampilkan. Contoh:

    1  Halte ASEAN
    1  Halte Kejaksaan Agung
    13 Halte CSW

  Bukan menurut alfabet nama halte. Bila dua titik sama-sama
  berada pada koridor yang sama, urutan sumber INT_NM/INT_STOP
  dipertahankan melalui firstIndex.
*/
function getBrtCorridorSortParts(routeId) {
  const label = String(
    routeNumberFromId(routeId) ?? ""
  )
    .trim()
    .toUpperCase();

  const match = label.match(/^(\d+)(.*)$/);

  if (!match) {
    return {
      number: Number.POSITIVE_INFINITY,
      suffix: label
    };
  }

  return {
    number: Number(match[1]),
    suffix: String(match[2] || "").trim()
  };
}


function compareBrtRouteIdsForIntegration(a, b) {
  const pa = getBrtCorridorSortParts(a);
  const pb = getBrtCorridorSortParts(b);

  if (pa.number !== pb.number) {
    return pa.number - pb.number;
  }

  return pa.suffix.localeCompare(
    pb.suffix,
    "id",
    {
      numeric: true,
      sensitivity: "base"
    }
  );
}


function getIntegrationPlaceBrtRouteIds(placeGroup) {
  const explicitRouteIds = (placeGroup?.services || [])
    .flatMap(service => [
      service?.routeId,
      (
        service?.brt &&
        String(service?.code || "")
          .toUpperCase()
          .startsWith("BRT_")
      )
        ? service.code
        : ""
    ])
    .map(value => String(value ?? "").trim())
    .filter(routeId => {
      const route = getRouteById(routeId);
      return route && getRouteMode(route) === "BRT";
    });

  /*
    Operator-level INTEGRASI=BRT tidak mempunyai routeId eksplisit.
    Jika INT_STOP menunjuk halte TransJakarta, koridor diturunkan
    dari ROUTES pada halte target sehingga urutannya tetap benar.
  */
  const resolved = resolveIntegrationPlaceTarget(placeGroup);

  const targetRouteIds = resolved?.targetFeature
    ? getStopRoutes(resolved.targetFeature)
        .filter(routeId => {
          const route = getRouteById(routeId);
          return route && getRouteMode(route) === "BRT";
        })
    : [];

  return Array.from(
    new Set([
      ...explicitRouteIds,
      ...targetRouteIds
    ])
  )
    .sort(compareBrtRouteIdsForIntegration);
}


function compareTransJakartaIntegrationPlaces(a, b) {
  const routesA = getIntegrationPlaceBrtRouteIds(a);
  const routesB = getIntegrationPlaceBrtRouteIds(b);

  const firstA = routesA[0] || "";
  const firstB = routesB[0] || "";

  if (firstA || firstB) {
    if (!firstA) return 1;
    if (!firstB) return -1;

    const routeDiff = compareBrtRouteIdsForIntegration(
      firstA,
      firstB
    );

    if (routeDiff !== 0) {
      return routeDiff;
    }
  }

  /*
    Koridor sama: pertahankan urutan yang ditulis di data.
  */
  const indexDiff =
    Number(a?.firstIndex ?? Number.POSITIVE_INFINITY)
    -
    Number(b?.firstIndex ?? Number.POSITIVE_INFINITY);

  if (indexDiff !== 0) {
    return indexDiff;
  }

  return String(a?.placeLabel || "")
    .localeCompare(
      String(b?.placeLabel || ""),
      "id",
      {
        numeric: true,
        sensitivity: "base"
      }
    );
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


  let placeGroups =
    groupServicesByRelatedPlace(
      group.services
    );

  /*
    TransJakarta dibaca sebagai jaringan berbasis koridor. Urutan
    titik di popup karena itu mengikuti nomor koridor, bukan alfabet
    nama halte. Operator lain mempertahankan aturan sebelumnya.
  */
  if (
    String(group.operatorKey || "")
      .trim()
      .toUpperCase() === "TRANSJAKARTA"
  ) {
    placeGroups = placeGroups
      .slice()
      .sort(compareTransJakartaIntegrationPlaces);
  }


  const placesHTML =
    placeGroups
      .map(
        buildIntegrationPlaceRow
      )
      .filter(Boolean)
      .join("");

  if (!placesHTML) {
    return "";
  }


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
    return isTemporaryStopFeature(
      feature
    )
      ? "HALTE BRT SEMENTARA"
      : "HALTE BRT";
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
    Badge lin selalu memprioritaskan aset visual yang tersedia
    di assets/lines/. Fallback teks hanya dipakai bila file aset
    gagal dimuat atau belum tersedia.
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
  activeRouteId,
  feature = null
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
    routeStatus === "Construction"
      ? "is-construction-route"
      : routeStatus === "Planned"
        ? "is-planned-route"
      : routeStatus === "Proposed"
        ? "is-proposed-route"
        : routeStatus === "Conceptual"
          ? "is-concept-route"
          : "is-existing-route";

  const isActive =
    String(routeId) ===
    String(activeRouteId);

  const operational =
    feature
      ? getOperationalRouteBadgeState(
          feature,
          routeId
        )
      : {
          code: "REGULAR",
          className: "",
          label: ""
        };

  /*
    NOT_SERVED tidak boleh dipanggil dari bagian
    "Koridor yang dilayani".
  */
  if (
    operational.code ===
    "NOT_SERVED"
  ) {
    return "";
  }

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

  const operationalSuffix =
    operational.label
      ? ` · ${operational.label}`
      : "";

  return `
    <span
      class="
        stop-popup-route-option
        ${operational.className}
      "
      data-operational-code="${escapeHTML(operational.code)}"
    >
      <button
        type="button"
        class="
          stop-popup-route-button
          ${statusClass}
          ${isActive ? "is-active" : ""}
          ${operational.className}
        "
        data-route-switch="${escapeHTML(routeId)}"
        ${
          isActive
            ? "disabled"
            : ""
        }
        aria-label="${
          isActive
            ? `Rute aktif: ${escapeHTML(routeTitle)}${escapeHTML(statusSuffix)}${escapeHTML(operationalSuffix)}`
            : `Tampilkan ${escapeHTML(routeTitle)}${escapeHTML(statusSuffix)}${escapeHTML(operationalSuffix)}`
        }"
        title="${
          isActive
            ? `Rute aktif: ${escapeHTML(routeTitle)}${escapeHTML(statusSuffix)}${escapeHTML(operationalSuffix)}`
            : `Tampilkan ${escapeHTML(routeTitle)}${escapeHTML(statusSuffix)}${escapeHTML(operationalSuffix)}`
        }"
      >
        ${badgeHTML}
      </button>
    </span>
  `;
}

function buildDirectServiceOperationalNoteHTML(
  routeIds,
  feature
) {
  if (!feature || !routeIds.length) {
    return "";
  }

  const hasTemporary =
    routeIds.some(
      routeId =>
        getOperationalRouteBadgeState(
          feature,
          routeId
        ).code === "TEMP_SERVED"
    );

  const hasTemporaryTerminus =
    routeIds.some(
      routeId =>
        getOperationalRouteBadgeState(
          feature,
          routeId
        ).code === "TEMP_TERMINUS"
    );

  if (
    !hasTemporary &&
    !hasTemporaryTerminus
  ) {
    return "";
  }

  const notes = [];

  if (hasTemporaryTerminus) {
    notes.push(
      '<span><strong>Ring kuning penuh</strong> = terminus sementara</span>'
    );
  }

  if (hasTemporary) {
    notes.push(
      '<span><strong>Ring kuning putus-putus</strong> = layanan sementara</span>'
    );
  }

  return `
    <div class="stop-popup-route-state-note">
      <span class="stop-popup-route-state-note-label">Catatan:</span>
      ${notes.join('<span class="stop-popup-route-state-note-separator">•</span>')}
    </div>
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

  /*
    Perpindahan antar koridor/lin dari badge pelayanan tidak
    boleh mengubah skala peta secara tiba-tiba.

    Rute baru tetap digambar ulang, tetapi fitBounds dinonaktifkan.
    Setelah marker tersedia kembali, titik yang sama dipilih dengan
    mode pan/sliding sehingga zoom pengguna dipertahankan.
  */
  showSingleRoute(
    routeId,
    true,
    false
  );

  requestAnimationFrame(
    () => {
      selectStop(
        stopKey,
        routeId,
        false,
        0.56
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


/*
  ==========================================================
  POPUP INTEGRATION — TRANSJAKARTA CLICK HANDLER
  ==========================================================

  Titik integrasi yang sudah mempunyai dataset jaringan aktif
  dapat dibuka langsung. Fasilitas tanpa route/stop dataset
  (mis. Terminal/KAJJ pada tahap ini) tetap informasi statis.
*/
map
  .getContainer()
  .addEventListener(
    "click",
    event => {
      const button =
        event.target
          ?.closest(
            ".integration-place-row-button[data-integration-stop-key]"
          );

      if (!button) {
        return;
      }

      const stopKey =
        button.dataset
          .integrationStopKey;

      const routeId =
        button.dataset
          .integrationRouteId;

      if (
        !stopKey ||
        !routeId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      L.DomEvent.stopPropagation(
        event
      );

      openNetworkIntegrationStop(
        stopKey,
        routeId
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

  if (status === "Construction") {
    return "is-construction";
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

  if (status === "Inactive") {
    return "is-inactive";
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


function isDiversionAffectedStop(
  feature,
  routeId
) {
  const operational =
    getOperationalStopState(
      feature,
      routeId
    );

  return Boolean(
    operational.state === "not-served"
    ||
    operational.state === "temporary-served"
    ||
    operational.temporaryTerminus
  );
}


function buildDiversionAffectedNoteHTML(
  feature,
  routeId
) {
  if (
    !isDiversionAffectedStop(
      feature,
      routeId
    )
  ) {
    return "";
  }

  return `
    <div class="stop-diversion-affected-note">
      <span
        class="stop-diversion-affected-note-icon"
        aria-hidden="true"
      >
        !
      </span>

      <span>
        Halte ini terdampak pengalihan sementara
        ${escapeHTML(
          getOperationalRouteShortLabel(
            routeId
          )
        )}.
      </span>
    </div>
  `;
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
    isTemporaryStopActiveForRoute(
      feature,
      routeId
    )
  ) {
    const replacesId =
      getStopReplacesId(
        feature
      );

    const divId =
      cleanText(
        feature
          ?.properties
          ?.DIV_ID
      );

    return `
      <div class="stop-operational-notice is-temporary is-physical-temporary">
        <div class="stop-operational-notice-title">
          Halte sementara
        </div>

        <div class="stop-operational-notice-text">
          Titik ini merupakan lokasi fisik sementara
          ${escapeHTML(routeLabel)}
          ${
            replacesId
              ? `dan menggantikan sementara titik reguler <strong>${escapeHTML(replacesId)}</strong>`
              : ""
          }.
          ${
            divId
              ? `<span class="stop-operational-div-id">DIV_ID: ${escapeHTML(divId)}</span>`
              : ""
          }
        </div>
      </div>
    `;
  }

  if (
    operational.state ===
    "not-served"
  ) {
    return `
      <div class="stop-operational-notice is-not-served">
        <div class="stop-operational-notice-title">
          Terdampak pengalihan · Tidak dilayani sementara
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
          Terdampak pengalihan · Terminus sementara
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
          Terdampak pengalihan · Pelayanan sementara
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


/*
  Kebijakan final:
  - SRC_URL = URL sumber / provenance.
  - Google Maps = dibentuk otomatis dari geometry Point.
*/
function getStopGoogleMapsUrl(
  feature
) {
  const geometry =
    feature?.geometry;

  if (
    !geometry ||
    geometry.type !== "Point" ||
    !Array.isArray(
      geometry.coordinates
    ) ||
    geometry.coordinates.length < 2
  ) {
    return "";
  }

  const lng =
    Number(
      geometry.coordinates[0]
    );

  const lat =
    Number(
      geometry.coordinates[1]
    );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return "";
  }

  /*
    Google Maps URL dibuat dari koordinat feature.
    SRC_URL tetap digunakan untuk provenance / sumber data.
  */
  return (
    "https://www.google.com/maps/search/" +
    "?api=1&query=" +
    encodeURIComponent(
      `${lat},${lng}`
    )
  );
}


function buildStopLocationHTML(
  feature
) {
  const mapsUrl =
    getStopGoogleMapsUrl(
      feature
    );

  if (!mapsUrl) {
    return "";
  }

  return `
    <div class="stop-popup-section stop-popup-section--location">

      <div class="stop-popup-label">
        Lokasi
      </div>

      <a
        class="stop-popup-external-link stop-popup-maps-link"
        href="${escapeHTML(mapsUrl)}"
        target="_blank"
        rel="noopener noreferrer"
        title="Buka lokasi halte di Google Maps"
      >
        <span
          class="stop-popup-external-link-icon"
          aria-hidden="true"
        >
          ↗
        </span>

        <span>
          Google Maps
        </span>
      </a>

    </div>
  `;
}


function getStopSourceTypeLabel(
  feature
) {
  const status =
    normalizeStatus(
      feature
        ?.properties
        ?.STATUS
    );

  return {
    Existing: "Sumber Data",
    Construction: "Sumber Pembangunan",
    Planned: "Sumber Rencana",
    Proposed: "Sumber Usulan",
    Conceptual: "Dasar Analisis",
    Inactive: "Sumber Data"
  }[status] || "Sumber Data";
}


function buildStopSourceMetadataHTML(
  feature
) {
  const p =
    feature?.properties ?? {};

  const sourceRaw =
    cleanText(
      p.SOURCE
      ??
      p.SRC_NAME
      ??
      p.SOURCE_NAME
    );

  const urlRaw =
    cleanText(
      p.SRC_URL
      ??
      p.SOURCE_URL
    );

  const note =
    cleanText(
      p.SRC_NOTE
      ??
      p.SOURCE_NOTE
    );

  const sources =
    splitRouteSourceValues(
      sourceRaw
    );

  const urls =
    splitRouteSourceValues(
      urlRaw
    )
      .map(
        sanitizeRouteSourceUrl
      )
      .filter(Boolean);

  if (
    !sources.length &&
    !urls.length &&
    !note
  ) {
    return "";
  }

  const sourceType =
    getStopSourceTypeLabel(
      feature
    );

  const sourceSummaryTitle =
    sources.length === 1
      ? sources[0]
      : (
          sources.length > 1
            ? `${sources.length} sumber`
            : "Sumber & Dasar Data"
        );

  const sourceRows = [];

  if (sources.length) {
    sources.forEach(
      (source, index) => {
        /*
          Hanya pasangkan SOURCE <-> SRC_URL bila jumlahnya sama.
          Kalau tidak sama, jangan menebak pasangan sumber.
        */
        const pairedUrl =
          urls.length ===
          sources.length
            ? urls[index]
            : "";

        sourceRows.push(`
          <div class="stop-source-item">

            <div class="stop-source-name">
              ${escapeHTML(source)}
            </div>

            ${
              pairedUrl
                ? `
                  <a
                    class="stop-popup-source-link"
                    href="${escapeHTML(pairedUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka sumber
                    <span aria-hidden="true">↗</span>
                  </a>
                `
                : ""
            }

          </div>
        `);
      }
    );
  }

  const unpairedLinksHTML =
    urls.length &&
    urls.length !==
      sources.length
      ? `
        <div class="stop-source-links">
          ${
            urls
              .map(
                (url, index) => `
                  <a
                    class="stop-popup-source-link"
                    href="${escapeHTML(url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${
                      urls.length > 1
                        ? `Buka sumber ${index + 1}`
                        : "Buka sumber"
                    }
                    <span aria-hidden="true">↗</span>
                  </a>
                `
              )
              .join("")
          }
        </div>
      `
      : "";

  const noteHTML =
    note
      ? `
        <div class="stop-source-note">
          <div class="stop-source-note-label">
            Keterangan
          </div>

          <div class="stop-source-note-text">
            ${escapeHTML(note)}
          </div>
        </div>
      `
      : "";

  return `
    <details class="stop-source-card">

      <summary class="stop-source-summary">

        <span
          class="stop-source-summary-icon"
          aria-hidden="true"
        >
          i
        </span>

        <span class="stop-source-summary-copy">

          <span class="stop-source-type">
            ${escapeHTML(sourceType)}
          </span>

          <span class="stop-source-title">
            ${escapeHTML(sourceSummaryTitle)}
          </span>

        </span>

        <span
          class="stop-source-chevron"
          aria-hidden="true"
        >
          ›
        </span>

      </summary>

      <div class="stop-source-body">

        ${
          sourceRows.length
            ? `
              <div class="stop-source-list">
                ${sourceRows.join("")}
              </div>
            `
            : ""
        }

        ${unpairedLinksHTML}
        ${noteHTML}

      </div>

    </details>
  `;
}



function buildStopPopup(feature, routeId) {
  const p = feature.properties;

  const stopComplexName =
    getStopComplexName(
      feature
    );

  const stopComplexHTML =
    stopComplexName
      ? `
        <div class="stop-popup-complex-note">
          <span class="stop-popup-complex-label">
            Kompleks
          </span>

          <span
            class="stop-popup-complex-separator"
            aria-hidden="true"
          >
            ·
          </span>

          <strong>
            ${escapeHTML(stopComplexName)}
          </strong>
        </div>
      `
      : "";

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
    Status operasional dihitung PER KORIDOR.

    NOT_SERVED selalu dikeluarkan dari "Koridor yang dilayani",
    walaupun user sedang membuka koridor lain.
  */
  directRoutes =
    directRoutes.filter(
      directRouteId =>
        getOperationalRouteBadgeState(
          feature,
          directRouteId
        ).code !==
        "NOT_SERVED"
    );

  /*
    Koridor yang melayani hanya selama pengalihan ditambahkan
    secara virtual meskipun tidak tercantum pada ROUTES reguler.
    Contoh: K3 di Petojo / Monumen Nasional.
  */
  getTemporarilyServedRouteIdsForStop(
    feature,
    routeId
  )
    .forEach(
      temporaryRouteId => {
        if (
          !directRoutes.includes(
            String(
              temporaryRouteId
            )
          )
        ) {
          directRoutes.push(
            String(
              temporaryRouteId
            )
          );
        }
      }
    );

  /*
    Koridor 15–19 tidak ditampilkan sebagai badge pelayanan
    saat konteks aktif masih jaringan eksisting/koridor lain.
    Badge rencana tersebut baru muncul di konteks K15–19.
  */
  directRoutes =
    directRoutes.filter(
      directRouteId =>
        shouldShowPlannedRouteBadgeInContext(
          directRouteId,
          routeId
        )
    );

  const integrations =
    getVisibleStopIntegrationsForContext(
      feature,
      routeId
    );

  const integrationNameMap =
    getStopIntegrationNameMap(
      feature
    );

  const integrationTargetMap =
    getStopIntegrationTargetMap(
      feature
    );

  const integrationStatusMap =
    getStopIntegrationStatusMap(
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

  const stopStructure = normalizeStructure(
    p.STRUCTURE
  );

  const structureBadgeHTML =
    normalizeMode(p.MODE) !== "BRT" &&
    stopStructure !== "UNKNOWN"
      ? `
        <span class="stop-popup-structure-pill is-${stopStructure.toLowerCase()}">
          ${escapeHTML(getStructureLabel(stopStructure))}
        </span>
      `
      : "";

  const directionInfo =
    routeId
      ? getStopDirectionInfo(
          feature,
          routeId
        )
      : null;

  /*
    WebGIS ini bersifat infografis. Kondisi dua arah dianggap
    normal dan tidak perlu diberi blok atribut tersendiri.
    Hanya pengecualian satu arah yang ditampilkan sebagai pill
    ringkas di baris status/fungsi halte.
  */
  const directionBadgeHTML =
    directionInfo &&
    directionInfo.isOneWay &&
    !isStopTerminusForRoute(
      feature,
      routeId
    )
      ? `
        <span class="stop-popup-direction-pill">
          <span aria-hidden="true">${escapeHTML(directionInfo.symbol)}</span>
          <span>${escapeHTML(directionInfo.detail || directionInfo.title)}</span>
        </span>
      `
      : "";

  const activityInfo =
    routeId
      ? getStopActivityInfo(
          feature,
          routeId
        )
      : null;

  const shouldShowActivity =
    Boolean(
      activityInfo &&
      (
        isStopTerminusForRoute(
          feature,
          routeId
        )
        ||
        activityInfo.code !== "BOTH"
      )
    );

  const activityHTML =
    shouldShowActivity
      ? `
        <div class="stop-popup-activity">
          <div class="stop-popup-activity-label">
            Pelayanan Penumpang
          </div>

          <div class="stop-popup-activity-value is-${activityInfo.code.toLowerCase()}">
            <span
              class="stop-popup-activity-symbol"
              aria-hidden="true"
            >
              ${escapeHTML(activityInfo.symbol)}
            </span>

            <strong>
              ${escapeHTML(activityInfo.title)}
            </strong>
          </div>
        </div>
      `
      : "";

  const splitStopNoteHTML =
    buildSplitNonTerminusStopNoteHTML(
      feature,
      routeId
    );

  const operationalNoticeHTML =
    buildOperationalStopNoticeHTML(
      feature,
      routeId
    );

  const notServedOperationalRouteIds =
    getNotServedRouteIdsForStop(
      feature,
      routeId
    );

  const affectedRoutesHTML =
    notServedOperationalRouteIds.length
      ? `
        <div class="stop-popup-section stop-popup-affected-routes">
          <div class="stop-popup-label">
            Terdampak pengalihan
          </div>

          <div class="stop-popup-affected-route-list is-inline">
            ${
              notServedOperationalRouteIds
                .map(
                  affectedRouteId => {
                    const route =
                      getRouteById(
                        affectedRouteId
                      );

                    if (!route) {
                      return "";
                    }

                    const number =
                      routeNumberFromId(
                        affectedRouteId
                      );

                    const isActive =
                      String(
                        affectedRouteId
                      ) ===
                      String(routeId);

                    return `
                      <button
                        type="button"
                        class="
                          stop-popup-route-button
                          stop-popup-affected-route-button
                          is-operational-not-served
                          ${isActive ? "is-active" : ""}
                        "
                        data-route-switch="${escapeHTML(
                          affectedRouteId
                        )}"
                        ${
                          isActive
                            ? "disabled"
                            : ""
                        }
                        title="Koridor ${escapeHTML(number)} · Tidak dilayani sementara"
                        aria-label="Koridor ${escapeHTML(number)} · Tidak dilayani sementara"
                      >
                        ${buildBrtBadge(
                          affectedRouteId
                        )}
                      </button>
                    `;
                  }
                )
                .join("")
            }
          </div>

          <div class="stop-popup-affected-route-note">
            Badge redup menandakan koridor yang biasanya melayani halte ini,
            tetapi <strong>tidak dilayani sementara</strong> selama pengalihan.
          </div>
        </div>
      `
      : "";


  const stopScenarioNoteHTML =
    isPlannedBRTVisualizationRoute(
      routeId
    )
      ? `
        <div class="stop-popup-scenario-note">
          <span class="stop-popup-scenario-note-icon" aria-hidden="true">i</span>
          <span>
            <strong>Halte skenario.</strong>
            Lokasi dan penamaan halte ini disusun berdasarkan
            analisis penyusun WebGIS dan belum merupakan
            penetapan resmi.
          </span>
        </div>
      `
      : "";

  const directServiceHTML =
    directRoutes.length
      ? `
        <div class="stop-popup-section stop-popup-section--service">

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
                      routeId,
                      feature
                    )
                )
                .join("")
            }
          </div>

          ${buildDirectServiceOperationalNoteHTML(
            directRoutes,
            feature
          )}

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
      integrationNameMap,
      integrationStatusMap,
      integrationTargetMap
    )
      .filter(group =>
        groupServicesByRelatedPlace(group.services)
          .some(placeGroup =>
            Boolean(
              placeGroup.placeLabel ||
              resolveIntegrationPlaceTarget(placeGroup).targetFeature
            )
          )
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


  /*
    Catatan integrasi K15–19 tidak diperlukan lagi karena
    relasi integrasi K15–19 sekarang tidak ditampilkan.
  */
  const integrationScenarioNoteHTML = "";

  const integrationHTML =
    integrationGroups.length
      ?
      `
        <div class="stop-popup-section stop-popup-section--integration">

          <div class="stop-popup-label">
            Integrasi
          </div>

          ${buildIntegrationRelationshipHTML(feature)}

          ${integrationScenarioNoteHTML}

          <div class="stop-popup-integration-scroll">
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

          <div
            class="stop-popup-integration-fade"
            aria-hidden="true"
          ></div>

        </div>
      `
      :
      "";

  const locationHTML =
    buildStopLocationHTML(
      feature
    );

  const stopSourceHTML =
    buildStopSourceMetadataHTML(
      feature
    );

  const stopActionRowHTML =
    (
      locationHTML ||
      stopSourceHTML
    )
      ? `
        <div class="stop-popup-action-row">

          ${
            locationHTML
              ? `
                <div class="stop-popup-action-cell">
                  ${locationHTML}
                </div>
              `
              : ""
          }

          ${
            stopSourceHTML
              ? `
                <div class="stop-popup-action-cell">
                  ${stopSourceHTML}
                </div>
              `
              : ""
          }

        </div>
      `
      : "";

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

  const previousNavigationHTML =
    previousStop
      ? `
        <button
          type="button"
          class="stop-popup-nav-button stop-popup-nav-prev"
          data-stop-nav="previous"
          data-stop-key="${escapeHTML(getStopKey(previousStop))}"
          data-route-id="${escapeHTML(routeId)}"
          title="Halte/stasiun sebelumnya: ${escapeHTML(previousName)}"
          aria-label="Sebelumnya: ${escapeHTML(previousName)}"
        >
          <span class="stop-popup-nav-arrow" aria-hidden="true">‹</span>
          <span class="stop-popup-nav-text">
            <span class="stop-popup-nav-label">Sebelumnya</span>
            <span class="stop-popup-nav-name">${escapeHTML(previousName)}</span>
          </span>
        </button>
      `
      : "";

  const nextNavigationHTML =
    nextStop
      ? `
        <button
          type="button"
          class="stop-popup-nav-button stop-popup-nav-next"
          data-stop-nav="next"
          data-stop-key="${escapeHTML(getStopKey(nextStop))}"
          data-route-id="${escapeHTML(routeId)}"
          title="Halte/stasiun berikutnya: ${escapeHTML(nextName)}"
          aria-label="Berikutnya: ${escapeHTML(nextName)}"
        >
          <span class="stop-popup-nav-text">
            <span class="stop-popup-nav-label">Berikutnya</span>
            <span class="stop-popup-nav-name">${escapeHTML(nextName)}</span>
          </span>
          <span class="stop-popup-nav-arrow" aria-hidden="true">›</span>
        </button>
      `
      : "";

  const navigationModeClass =
    previousStop && nextStop
      ? "has-both"
      : (
          previousStop
            ? "has-previous-only"
            : (
                nextStop
                  ? "has-next-only"
                  : "has-none"
              )
        );

  const navigationHTML =
    routeId &&
    (
      previousStop ||
      nextStop
    )
      ? `
        <div class="stop-popup-navigation ${navigationModeClass}">
          ${previousNavigationHTML}
          ${nextNavigationHTML}
        </div>
      `
      : "";

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

        <div class="stop-popup-meta-row">
          <div class="stop-popup-status ${getStopStatusClass(feature)}">
            ${escapeHTML(getStopStatusLabel(feature))}
          </div>

          ${roleHTML}
          ${structureBadgeHTML}
          ${directionBadgeHTML}
        </div>

        ${stopComplexHTML}

        ${splitStopNoteHTML}

        ${activityHTML}

        ${operationalNoticeHTML}

        ${stopScenarioNoteHTML}

        <div class="stop-popup-divider"></div>

        ${directServiceHTML}
        ${affectedRoutesHTML}
        ${integrationHTML}

        ${stopActionRowHTML}

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

function getStopMarkerRoleFill(
  feature,
  routeId
) {
  const operational =
    feature
      ? getOperationalStopState(
          feature,
          routeId
        )
      : {
          temporaryTerminus: false
        };

  if (
    operational.temporaryTerminus
  ) {
    return String(routeId ?? "")
      .toUpperCase()
      .startsWith("BRT_")
        ? getRouteColor(routeId)
        : "#20242a";
  }

  const role =
    feature
      ? getStopRoleForRoute(
          feature,
          routeId
        )
      : "";

  if (role === "Terminus") {
    return String(routeId ?? "")
      .toUpperCase()
      .startsWith("BRT_")
        ? getRouteColor(routeId)
        : "#20242a";
  }

  if (role === "Transit") {
    return "#8a9098";
  }

  /*
    Regular / Reguler / role kosong:
    isi putih.
  */
  return "#ffffff";
}


/*
  =========================================================
  ADAPTIVE STOP MARKER SIZE
  =========================================================

  Tujuan kartografis:
  - full route / zoom jauh  -> marker lebih kecil
  - zoom menengah           -> ukuran normal
  - zoom dekat              -> marker lebih mudah dibaca
  - selected stop           -> selalu sedikit lebih besar

  Hit-area klik tetap 30x30 px, jadi perubahan ini hanya
  memengaruhi simbol visual.
*/


function getStopZoomBand() {
  const zoom =
    Number(
      map.getZoom()
    );

  if (zoom <= 13) {
    return "far";
  }

  if (zoom <= 15) {
    return "mid";
  }

  return "near";
}


function getStopMarkerRadius(
  routeId,
  feature = null,
  selected = false
) {
  const zoomBand =
    getStopZoomBand();

  const terminus =
    Boolean(
      feature &&
      isStopTerminusForRoute(
        feature,
        routeId
      )
    );

  const transit =
    Boolean(
      feature &&
      getStopRoleForRoute(
        feature,
        routeId
      ) === "Transit"
    );

  let radius;

  if (zoomBand === "far") {
    radius =
      terminus
        ? 5.2
        : transit
          ? 4.5
          : 4.0;
  }
  else if (zoomBand === "mid") {
    radius =
      terminus
        ? 6.6
        : transit
          ? 5.6
          : 5.1;
  }
  else {
    radius =
      terminus
        ? 8.0
        : transit
          ? 6.9
          : 6.3;
  }

  if (
    feature &&
    isConceptualStop(feature)
  ) {
    radius += 0.25;
  }

  if (selected) {
    radius +=
      zoomBand === "far"
        ? 1.8
        : zoomBand === "mid"
          ? 2.0
          : 2.2;
  }

  return radius;
}


function getStopMarkerWeight(
  routeId,
  feature = null,
  selected = false
) {
  const zoomBand =
    getStopZoomBand();

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

  if (selected) {
    return notServed
      ? 2.5
      : (
          zoomBand === "far"
            ? 2.4
            : zoomBand === "mid"
              ? 2.8
              : 3.1
        );
  }

  if (notServed) {
    return zoomBand === "far"
      ? 1.35
      : 1.7;
  }

  return zoomBand === "far"
    ? 1.5
    : zoomBand === "mid"
      ? 1.8
      : 2.0;
}


function getStopLabelDeclutterConfig() {
  const zoomBand =
    getStopZoomBand();

  if (zoomBand === "near") {
    return {
      stride: 1,
      minDistance: 0
    };
  }

  if (zoomBand === "mid") {
    return {
      stride: 2,
      minDistance: 56
    };
  }

  return {
    stride: 4,
    minDistance: 82
  };
}


function getVisibleStopLabelMarkerKeys(
  routeId
) {
  const visibleKeys =
    new Set();

  if (
    !routeId ||
    !stopMarkerByKey.size
  ) {
    return visibleKeys;
  }

  /*
    Satu halte logis cukup satu label, walaupun memiliki
    dua titik fisik untuk dua arah.
  */
  const markerGroups =
    new Map();

  stopMarkerByKey.forEach(
    (marker, stopKey) => {
      const feature =
        getStopByKey(
          stopKey
        );

      if (
        !marker ||
        !feature
      ) {
        return;
      }

      const logicalKey =
        getLogicalStopKey(
          feature
        );

      if (
        !markerGroups.has(
          logicalKey
        )
      ) {
        markerGroups.set(
          logicalKey,
          []
        );
      }

      markerGroups
        .get(logicalKey)
        .push({
          marker,
          stopKey:
            String(stopKey),
          feature
        });
    }
  );

  const logicalEntries =
    getLogicalOperationalStopEntries(
      routeId
    );

  const orderMap =
    new Map();

  logicalEntries.forEach(
    (entry, index) => {
      orderMap.set(
        entry.logicalKey ||
          getLogicalStopKey(
            entry.feature
          ),
        {
          index,
          entry
        }
      );
    }
  );

  const total =
    logicalEntries.length;

  const selectedKey =
    String(
      currentSelectedStopKey ?? ""
    );

  const selectedFeature =
    selectedKey
      ? getStopByKey(
          selectedKey
        )
      : null;

  const selectedLogicalKey =
    selectedFeature
      ? getLogicalStopKey(
          selectedFeature
        )
      : "";

  const config =
    getStopLabelDeclutterConfig();

  const zoomBand =
    getStopZoomBand();

  /*
    Ketika satu rute/lin sedang dipilih, semua halte/stasiun
    logis ditampilkan. Decluttering berbasis hide hanya dipakai
    untuk konteks selain selected-route. Penyesuaian posisi
    dilakukan oleh getStopLabelPlacement().
  */
  const forceAllSelectedRouteLabels =
    String(routeId ?? "") ===
    String(currentSelectedRouteId ?? "");

  const candidates = [];

  markerGroups.forEach(
    (
      group,
      logicalKey
    ) => {
      if (!group.length) {
        return;
      }

      const representative =
        group.find(
          item =>
            item.stopKey ===
            selectedKey
        )
        ||
        group[0];

      const feature =
        representative.feature;

      const orderData =
        orderMap.get(
          logicalKey
        );

      const index =
        Number.isFinite(
          orderData?.index
        )
          ? orderData.index
          : candidates.length;

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

      const isSelected =
        logicalKey ===
        selectedLogicalKey;

      const isDismissed =
        Boolean(
          dismissedStopLogicalKey
        )
        &&
        logicalKey ===
          dismissedStopLogicalKey
        &&
        !isSelected;

      /*
        Popup sudah ditutup oleh user:
        jangan buka kembali tooltip permanennya hanya karena
        zoom band dekat menampilkan semua label.
      */
      if (isDismissed) {
        return;
      }

      const isTerminus =
        role === "Terminus" ||
        Boolean(
          operationalState
            .temporaryTerminus
        );

      const isTransit =
        role === "Transit";

      const isEndpoint =
        index === 0 ||
        index === total - 1;

      const isTemporaryServed =
        operationalState.state ===
        "temporary-served";

      const sampled =
        config.stride <= 1 ||
        index %
          config.stride === 0;

      const eligible =
        forceAllSelectedRouteLabels ||
        zoomBand === "near" ||
        isSelected ||
        isTerminus ||
        isTransit ||
        isEndpoint ||
        isTemporaryServed ||
        sampled;

      if (!eligible) {
        return;
      }

      let priority = 100;

      if (sampled) {
        priority += 80;
      }

      if (isTemporaryServed) {
        priority += 180;
      }

      if (isTransit) {
        priority += 300;
      }

      if (isEndpoint) {
        priority += 360;
      }

      if (isTerminus) {
        priority += 430;
      }

      if (isSelected) {
        priority += 10000;
      }

      candidates.push({
        ...representative,
        logicalKey,
        index,
        priority,
        isSelected,
        point:
          map.latLngToContainerPoint(
            representative.marker
              .getLatLng()
          )
      });
    }
  );

  candidates.sort(
    (a, b) =>
      (
        b.priority -
        a.priority
      )
      ||
      (
        a.index -
        b.index
      )
  );

  const accepted = [];

  candidates.forEach(
    candidate => {
      if (
        forceAllSelectedRouteLabels ||
        zoomBand === "near" ||
        candidate.isSelected
      ) {
        visibleKeys.add(
          candidate.stopKey
        );

        accepted.push(
          candidate
        );

        return;
      }

      const collision =
        accepted.some(
          acceptedItem =>
            candidate.point
              .distanceTo(
                acceptedItem.point
              )
            <
            config.minDistance
        );

      if (collision) {
        return;
      }

      visibleKeys.add(
        candidate.stopKey
      );

      accepted.push(
        candidate
      );
    }
  );

  return visibleKeys;
}


function updateStopLabelVisibility() {
  if (
    !currentSelectedRouteId ||
    !stopMarkerByKey.size
  ) {
    return;
  }

  const visibleKeys =
    getVisibleStopLabelMarkerKeys(
      currentSelectedRouteId
    );

  stopMarkerByKey.forEach(
    (marker, stopKey) => {
      if (
        !marker ||
        !marker.getTooltip?.()
      ) {
        return;
      }

      if (
        visibleKeys.has(
          String(stopKey)
        )
      ) {
        marker.openTooltip();
      }
      else {
        marker.closeTooltip();
      }
    }
  );
}


function refreshStopLabelPlacements() {
  if (
    !currentSelectedRouteId ||
    !stopMarkerByKey.size
  ) {
    return;
  }

  stopMarkerByKey.forEach(
    (marker, stopKey) => {
      const feature =
        getStopByKey(
          stopKey
        );

      const tooltip =
        marker?.getTooltip?.();

      if (
        !feature ||
        !tooltip
      ) {
        return;
      }

      const placement =
        getStopLabelPlacement(
          feature,
          currentSelectedRouteId
        );

      tooltip.options.direction =
        placement.direction;

      tooltip.options.offset =
        L.point(
          placement.offset[0],
          placement.offset[1]
        );

      if (
        marker.isTooltipOpen?.()
      ) {
        tooltip.update();
      }
    }
  );
}

function updateStopZoomVisualState() {
  const mapElement =
    map.getContainer();

  if (mapElement) {
    mapElement.dataset.stopZoomBand =
      getStopZoomBand();
  }

  if (
    !currentSelectedRouteId ||
    !stopMarkerByKey.size
  ) {
    return;
  }

  stopMarkerByKey.forEach(
    (marker, stopKey) => {
      const feature =
        getStopByKey(
          stopKey
        );

      if (
        !marker ||
        !feature
      ) {
        return;
      }

      const selected =
        String(stopKey) ===
        String(
          currentSelectedStopKey ?? ""
        );

      marker.setStyle(
        selected
          ? selectedStopStyle(
              currentSelectedRouteId,
              feature
            )
          : normalStopStyle(
              currentSelectedRouteId,
              feature
            )
      );

      if (selected) {
        marker.bringToFront();
      }
    }
  );

  refreshStopLabelPlacements();
  updateStopLabelVisibility();
}


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
      getStopMarkerRadius(
        routeId,
        feature,
        false
      ),

    color:
      notServed
        ? "#838991"
        : getRouteColor(routeId),

    weight:
      getStopMarkerWeight(
        routeId,
        feature,
        false
      ),

    fillColor:
      getStopMarkerRoleFill(
        feature,
        routeId
      ),

    interactive: true,
    bubblingMouseEvents: false,

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

    radius:
      getStopMarkerRadius(
        routeId,
        feature,
        true
      ),

    color:
      notServed
        ? "#50555c"
        : getRouteColor(routeId),

    weight:
      getStopMarkerWeight(
        routeId,
        feature,
        true
      ),

    fillColor:
      getStopMarkerRoleFill(
        feature,
        routeId
      ),

    interactive: true,
    bubblingMouseEvents: false,

    fillOpacity:
      notServed
        ? 0.62
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
      370,
      availableWidth
    );

  const minWidth =
    Math.min(
      280,
      maxWidth
    );

  return {
    maxWidth,
    minWidth,

    maxHeight:
      Math.min(
        640,
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

  if (stopHitLayer) {
    map.removeLayer(stopHitLayer);
    stopHitLayer = null;
  }

  stopMarkerByKey.clear();
}


function getPointLatLngFromFeature(
  feature
) {
  const geometry =
    feature?.geometry;

  if (
    !geometry ||
    geometry.type !== "Point" ||
    !Array.isArray(
      geometry.coordinates
    ) ||
    geometry.coordinates.length < 2
  ) {
    return null;
  }

  const [
    lng,
    lat
  ] = geometry.coordinates;

  if (
    !Number.isFinite(
      Number(lat)
    ) ||
    !Number.isFinite(
      Number(lng)
    )
  ) {
    return null;
  }

  return L.latLng(
    Number(lat),
    Number(lng)
  );
}

function getStopLabelPlacement(
  feature,
  routeId
) {
  const stops =
    getActiveOperationalStopsForRoute(
      routeId
    );

  const currentKey =
    getLogicalStopKey(
      feature
    );

  const currentIndex =
    stops.findIndex(
      item =>
        getLogicalStopKey(
          item
        ) === currentKey
    );

  const fallback = {
    direction: "right",
    offset: [5, 0]
  };

  if (currentIndex === -1) {
    return fallback;
  }

  const currentLatLng =
    getPointLatLngFromFeature(
      feature
    );

  const prevLatLng =
    currentIndex > 0
      ? getPointLatLngFromFeature(
          stops[
            currentIndex - 1
          ]
        )
      : null;

  const nextLatLng =
    currentIndex <
    stops.length - 1
      ? getPointLatLngFromFeature(
          stops[
            currentIndex + 1
          ]
        )
      : null;

  if (!currentLatLng) {
    return fallback;
  }

  const currentPoint =
    map?.latLngToContainerPoint
      ? map.latLngToContainerPoint(
          currentLatLng
        )
      : null;

  const prevPoint =
    prevLatLng &&
    map?.latLngToContainerPoint
      ? map.latLngToContainerPoint(
          prevLatLng
        )
      : null;

  const nextPoint =
    nextLatLng &&
    map?.latLngToContainerPoint
      ? map.latLngToContainerPoint(
          nextLatLng
        )
      : null;

  let dx = 0;
  let dy = 0;

  if (
    prevPoint &&
    nextPoint
  ) {
    dx =
      nextPoint.x -
      prevPoint.x;
    dy =
      nextPoint.y -
      prevPoint.y;
  } else if (
    currentPoint &&
    nextPoint
  ) {
    dx =
      nextPoint.x -
      currentPoint.x;
    dy =
      nextPoint.y -
      currentPoint.y;
  } else if (
    prevPoint &&
    currentPoint
  ) {
    dx =
      currentPoint.x -
      prevPoint.x;
    dy =
      currentPoint.y -
      prevPoint.y;
  }

  const isMostlyHorizontal =
    Math.abs(dx) >=
    Math.abs(dy);

  /*
    Semua label pada rute terpilih dipertahankan. Agar tidak
    menumpuk, posisi dibuat stagger kiri/kanan atau atas/bawah
    dan diberi sedikit pergeseran searah trase (tangent shift).
  */
  const zoomBand =
    getStopZoomBand();

  const stopCount =
    stops.length;

  const tierCount =
    stopCount >= 20
      ? 4
      : 3;

  const tier =
    Math.floor(
      currentIndex / 2
    ) % tierCount;

  const baseDistance =
    zoomBand === "far"
      ? 7
      : zoomBand === "mid"
        ? 6
        : 5;

  const tierStep =
    zoomBand === "far"
      ? 3
      : zoomBand === "mid"
        ? 3
        : 2;

  const distance =
    baseDistance +
    tier * tierStep;

  const tangentCycle =
    Math.floor(
      currentIndex / 2
    ) % 3;

  const tangentUnit =
    zoomBand === "far"
      ? 5
      : zoomBand === "mid"
        ? 4
        : 3;

  const tangentShift =
    (tangentCycle - 1) *
    tangentUnit;

  if (
    isMostlyHorizontal
  ) {
    const placeTop =
      currentIndex % 2 === 0;

    return {
      direction:
        placeTop
          ? "top"
          : "bottom",
      offset: [
        tangentShift,
        placeTop
          ? -distance
          : distance
      ]
    };
  }

  const placeLeft =
    currentIndex % 2 === 0;

  return {
    direction:
      placeLeft
        ? "left"
        : "right",
    offset: [
      placeLeft
        ? -distance
        : distance,
      tangentShift
    ]
  };
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

  /*
    Layer khusus hit-area transparan.
    Radius 12 px memberi target klik yang nyaman, tetapi tidak
    mengubah ukuran visual marker.
  */
  stopHitLayer = L.layerGroup().addTo(map);

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

        /*
          DOM hit target.

          Marker visual tetap CircleMarker/Canvas agar ringan.
          Area klik dibuat sebagai DivIcon transparan sehingga
          tidak bergantung pada Canvas hit-testing Leaflet.

          Ukuran visual halte TIDAK berubah, tetapi target klik
          menjadi 30 x 30 px.
        */
        const hitMarker =
          L.marker(
            layer.getLatLng(),
            {
              pane: "stopClickPane",

              icon:
                L.divIcon({
                  className:
                    "stop-hit-target",

                  html: "",

                  iconSize:
                    [36, 36],

                  iconAnchor:
                    [18, 18]
                }),

              interactive: true,
              keyboard: false,
              bubblingMouseEvents: false,
              riseOnHover: false
            }
          )
            .addTo(
              stopHitLayer
            );

        hitMarker.on(
          "click",
          event => {
            /*
              Leaflet event != DOM event.
              Stop hanya originalEvent agar handler tidak
              berhenti karena tipe event yang salah.
            */
            if (
              event?.originalEvent
            ) {
              L.DomEvent.stopPropagation(
                event.originalEvent
              );
            }

            selectStop(
              stopKey,
              routeId,
              true
            );
          }
        );

        /*
          Terminus BRT tetap berupa lingkaran, tetapi diberi
          nomor koridor di tengah. Overlay teks non-interaktif
          ini tidak mengganggu hit-area transparan 30x30 px.
        */
        if (
          isStopTerminusForRoute(
            feature,
            routeId
          )
          &&
          String(routeId ?? "")
            .toUpperCase()
            .startsWith("BRT_")
        ) {
          L.marker(
            layer.getLatLng(),
            {
              pane: "stopHitPane",
              icon:
                L.divIcon({
                  className:
                    "stop-terminus-number-marker",
                  html:
                    `<span>${escapeHTML(routeNumberFromId(routeId))}</span>`,
                  iconSize: [22, 22],
                  iconAnchor: [11, 11]
                }),
              interactive: false,
              keyboard: false
            }
          )
            .addTo(
              stopHitLayer
            );
        }

        layer.bindPopup(
          safeBuildStopPopup(
            feature,
            routeId
          ),
          getStopPopupOptions()
        );

        const labelOperationalState =
          getOperationalStopState(
            feature,
            routeId
          );

        const labelRole =
          getOperationalStopRole(
            feature,
            routeId
          );

        const labelClasses = [
          "route-stop-name-label",
          labelOperationalState.state === "not-served"
            ? "is-not-served"
            : "",
          labelOperationalState.temporaryTerminus
            ? "is-terminus"
            : (
                labelRole === "Terminus"
                  ? "is-terminus"
                  : ""
              ),
          labelRole === "Transit"
            ? "is-transit"
            : ""
        ]
          .filter(Boolean)
          .join(" ");

        const labelPlacement =
          getStopLabelPlacement(
            feature,
            routeId
          );

        const stackedLabel =
          buildStackedStopLabel(
            getStopDisplayName(
              feature
            )
          );

        layer.bindTooltip(
          stackedLabel.html,
          {
            permanent: true,
            direction:
              labelPlacement.direction,
            offset:
              labelPlacement.offset,
            opacity:
              labelOperationalState.state === "not-served"
                ? 0.55
                : 0.96,
            interactive: true,
            className: [
              labelClasses,
              "is-clickable-stop-label",
              stackedLabel.isStacked
                ? "is-stacked"
                : ""
            ]
              .filter(Boolean)
              .join(" ")
          }
        );

        /*
          Nama halte/stasiun pada peta adalah target klik kedua
          selain marker. Klik label mempertahankan zoom saat ini,
          lalu menggunakan pan/sliding ringan bila titik perlu
          diposisikan lebih dekat ke pusat sebelum popup dibuka.
        */
        const stopTooltip =
          layer.getTooltip();

        if (stopTooltip) {
          stopTooltip.on(
            "click",
            event => {
              if (event?.originalEvent) {
                L.DomEvent.stopPropagation(
                  event.originalEvent
                );
                L.DomEvent.preventDefault(
                  event.originalEvent
                );
              }

              selectStop(
                stopKey,
                routeId,
                false,
                0.34
              );
            }
          );
        }

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

            syncStopPopupIntegrationOverflow(
              popupElement
            );

          }
        );


        /*
          Menutup popup halte = keluar dari state "halte terpilih".

          Guard stopKey + routeId penting:
          ketika user berpindah lewat Sebelumnya/Berikutnya,
          Leaflet otomatis menutup popup lama saat membuka popup
          baru. Popup lama tidak boleh membersihkan halte baru.
        */
        layer.on(
          "popupclose",
          () => {
            const isCurrentSelectedStop =
              String(
                currentSelectedStopKey ?? ""
              ) ===
              String(stopKey);

            const isCurrentSelectedRoute =
              String(
                currentSelectedRouteId ?? ""
              ) ===
              String(routeId);

            if (
              !isCurrentSelectedStop ||
              !isCurrentSelectedRoute
            ) {
              return;
            }

            dismissedStopLogicalKey =
              getLogicalStopKey(
                feature
              );

            clearSelectedStop();

            /*
              clearSelectedStop menghapus card kiri dan style
              selected marker. Refresh ini sekaligus menutup
              tooltip nama halte yang tadi dipaksa tampil.
            */
            updateStopLabelVisibility();

            /*
              Hilangkan parameter stop=... dari shareable URL,
              tetapi pertahankan mode / route / compare / map.
            */
            syncUrlState();
          }
        );


        layer.on(
          "click",
          event => {
            if (
              event?.originalEvent
            ) {
              L.DomEvent.stopPropagation(
                event.originalEvent
              );
            }

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

  /*
    Sinkronkan band zoom untuk marker terminus bernomor dan
    pastikan marker visual memakai skala zoom saat ini.
  */
  updateStopZoomVisualState();
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

  updateRouteDetailToggleTerminology();
}


function renderStopList(routeId) {
  const entries =
    getLogicalOperationalStopEntries(
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
            ? "Halte/stasiun non-eksisting pada rute ini sedang disembunyikan."
            : "Belum ada halte / stasiun yang terhubung ke koridor ini."
        }
      </div>
    `;
    return;
  }

  const listHTML = entries
    .map((entry, entryIndex) => {
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

      const logicalKey =
        entry.logicalKey ||
        getLogicalStopKey(feature);

      const physicalFeatures =
        Array.isArray(
          entry.physicalFeatures
        )
          ? entry.physicalFeatures
          : [feature];

      const physicalCount =
        Number(
          entry.physicalCount
          ??
          physicalFeatures.length
          ??
          1
        );

      const physicalSummary =
        getPhysicalStopSummary(
          physicalFeatures
        );

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
      const explicitDirectionSeq =
        getActiveDirectionSequenceRaw(
          feature,
          routeId
        );

      const routeSeq =
        isRouteDirectionEnabled(routeId) &&
        !hasRouteDiversion(routeId)
          ? String(entryIndex + 1).padStart(2, "0")
          : (
              explicitDirectionSeq ||
              getStopSequenceRaw(
                feature,
                routeId
              )
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

      const visibleRouteIds =
        getOperationalStopListVisibleRoutes(
          feature,
          routeId
        );

      const routeBadgeHTML =
        visibleRouteIds
          .map(
            visibleRouteId =>
              buildSmallRouteBadge(
                visibleRouteId,
                feature
              )
          )
          .join("");

      /*
        Koridor yang sementara tidak melayani halte tetap dapat
        ditampilkan sebagai konteks visual redup, tetapi dipisah
        dari badge pelayanan aktif.
      */
      const affectedRouteBadgeHTML =
        getNotServedRouteIdsForStop(
          feature,
          routeId
        )
          .map(
            affectedRouteId =>
              buildSmallRouteBadge(
                affectedRouteId,
                feature
              )
          )
          .join("");

      const rightBadges = [];

      /*
        Badge arah pada daftar hanya berguna untuk halte yang
        benar-benar satu arah. Halte dua arah sudah dinormalisasi
        menjadi direction kosong oleh getDirectionLabel().

        Untuk Terminus / Transit-Terminus, fungsi halte lebih
        penting daripada arah pada daftar ringkas. Informasi arah
        titik fisik tetap tersedia di popup bila relevan.
      */
      const roleNormalized =
        String(role ?? "")
          .trim()
          .toLowerCase();

      const hideDirectionForRole =
        roleNormalized === "terminus" ||
        roleNormalized === "transit-terminus" ||
        roleNormalized === "terminus sementara";

      if (
        direction &&
        !hideDirectionForRole
      ) {
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
      if (
        physicalCount > 1 &&
        physicalSummary.short
      ) {
        rightBadges.push(`
          <span
            class="stop-physical-count-badge"
            title="${escapeHTML(physicalSummary.long)}"
          >
            ${escapeHTML(physicalSummary.short)}
          </span>
        `);
      }

      /*
        Status Eksisting tidak perlu diulang di setiap baris.
        Rencana / Usulan / Gagasan ditampilkan agar halte khusus langsung terbaca.
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

      const isComplexListRow =
        rightBadges.length > 1 ||
        visibleRouteIds.length > 2 ||
        physicalCount > 1;

      const hasOnlyRoleBadge =
        rightBadges.length === 1 &&
        (role === "Transit" ||
          role === "Terminus" ||
          role === "Transit-Terminus" ||
          role === "Terminus Sementara");

      return `
        <div
          class="
            stop-list-item
            ${isNotServed ? "is-operational-not-served" : ""}
            ${isTemporaryServed ? "is-operational-temporary" : ""}
            ${isTemporaryTerminus ? "is-operational-temp-terminus" : ""}
            ${isComplexListRow ? "is-complex-row" : ""}
            ${hasOnlyRoleBadge ? "has-edge-role-badge" : ""}
          "
          data-stop-key="${escapeHTML(stopKey)}"
          data-stop-logical-key="${escapeHTML(logicalKey)}"
          tabindex="0"
          role="button"
          aria-label="${escapeHTML(
            isNotServed
              ? `Buka informasi ${getStopDisplayName(feature)}; sementara tidak dilayani`
              : `Pilih ${getStopDisplayName(feature)}`
          )}"
        >

          <div class="stop-list-item-left">

            <span class="stop-list-sequence">
              ${seqBadgeHTML}
            </span>

            <span class="stop-list-route-badges">
              ${routeBadgeHTML}

              ${
                affectedRouteBadgeHTML
                  ? `
                    <span
                      class="stop-list-affected-route-badges"
                      title="Koridor yang sementara tidak melayani halte ini"
                    >
                      ${affectedRouteBadgeHTML}
                    </span>
                  `
                  : ""
              }
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
    .forEach(item => {
      item.classList.remove(
        "is-selected"
      );
      item.removeAttribute(
        "aria-current"
      );
    });
}

function selectStop(
  stopKey,
  routeId,
  zoomIn = true,
  panDuration = 0.42
) {
  /*
    Memilih halte baru berarti user kembali berinteraksi
    dengan jaringan; suppression label sebelumnya dihapus.
  */
  dismissedStopLogicalKey = "";

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

  clearPoiMarker();

  currentSelectedStopKey =
    String(stopKey);

  currentSelectedRouteId =
    String(routeId);
  marker.setPopupContent(
    safeBuildStopPopup(
      feature,
      routeId
    )
  );

  /*
    Selected stop selalu tampil walaupun labelnya sebelumnya
    disembunyikan oleh decluttering.
  */
  updateStopLabelVisibility();

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
          duration:
            Math.max(
              0.2,
              Number(panDuration) || 0.42
            ),
          easeLinearity: 0.22
        }
      );

      /*
        Fallback jika browser tidak memicu moveend karena
        jarak pergeseran sangat kecil.
      */
      setTimeout(
        openOnce,
        Math.max(
          260,
          Math.round(
            (Number(panDuration) || 0.42) * 1000 + 80
          )
        )
      );
    }
  }

  const p = feature.properties;

  const directionInfo =
    getStopDirectionInfo(
      feature,
      routeId
    );

  const activityInfo =
    getStopActivityInfo(
      feature,
      routeId
    );

  const groupFeatures =
    getStopGroupFeatures(
      feature,
      routeId
    );

  const physicalCount =
    groupFeatures.length;

  const physicalSummary =
    getPhysicalStopSummary(
      groupFeatures
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
          <strong>Terdampak pengalihan · Tidak dilayani sementara.</strong>
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
            <strong>Terdampak pengalihan · Terminus sementara.</strong>
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
              <strong>Terdampak pengalihan · Pelayanan sementara.</strong>
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

  const showSelectedRole =
    role &&
    role.toLowerCase() !== "reguler" &&
    role.toLowerCase() !== "regular" &&
    role.toLowerCase() !== "normal";

  const showSelectedActivity =
    isStopTerminusForRoute(
      feature,
      routeId
    )
    ||
    activityInfo.code !== "BOTH";

  selectedStopInfoEl.innerHTML = `
    <div class="eyebrow">
      ${escapeHTML(
        selectedTerms.selectedUpper
      )}
    </div>

    <div class="selected-stop-summary-line">
      <h3 class="selected-stop-title">
        ${escapeHTML(getStopDisplayName(feature))}
      </h3>

      <div class="selected-stop-meta">
        <span class="selected-stop-status ${getStopStatusClass(feature)}">
          ${escapeHTML(getStopStatusLabel(feature))}
        </span>

        ${
          showSelectedRole
            ? `
              <span class="selected-stop-role ${getOperationalStopRoleClass(feature, routeId)}">
                ${escapeHTML(role)}
              </span>
            `
            : ""
        }

        ${
          directionInfo?.isOneWay &&
          !isStopTerminusForRoute(
            feature,
            routeId
          )
            ? `
              <span class="selected-stop-direction-pill">
                <span aria-hidden="true">${escapeHTML(directionInfo.symbol)}</span>
                <span>${escapeHTML(directionInfo.detail || directionInfo.title)}</span>
              </span>
            `
            : ""
        }

        ${
          showSelectedActivity
            ? `
              <span class="selected-stop-meta-text">
                ${escapeHTML(activityInfo.symbol)}
                ${escapeHTML(activityInfo.title)}
              </span>
            `
            : ""
        }

        ${
          physicalCount > 1
            ? `
              <span class="selected-stop-meta-text">
                ${escapeHTML(String(physicalCount))} lokasi fisik
              </span>
            `
            : ""
        }
      </div>
    </div>

    ${selectedOperationalNotice}
  `;

  stopListEl
    .querySelectorAll(
      ".stop-list-item"
    )
    .forEach(item => {
      const isSelected =
        (
          item.dataset.stopLogicalKey ||
          `STOP:${item.dataset.stopKey}`
        ) ===
        getLogicalStopKey(feature);

      item.classList.toggle(
        "is-selected",
        isSelected
      );

      if (isSelected) {
        item.setAttribute(
          "aria-current",
          "true"
        );
      } else {
        item.removeAttribute(
          "aria-current"
        );
      }
    });

  syncUrlState();
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


function setRouteDetailCollapsed(
  collapsed,
  options = {}
) {
  if (
    !routeDetailCard ||
    !routeDetailToggle ||
    !routeDetailBody
  ) {
    return;
  }

  const {
    persist = true
  } = options;

  const isCollapsed =
    Boolean(collapsed);

  routeDetailCard
    .classList
    .toggle(
      "is-collapsed",
      isCollapsed
    );

  routeDetailBody.hidden =
    isCollapsed;

  routeDetailToggle
    .setAttribute(
      "aria-expanded",
      String(!isCollapsed)
    );

  const sectionLabel =
    getRouteDetailSectionLabel();

  const label = isCollapsed
    ? `Tampilkan bagian ${sectionLabel.toLowerCase()}`
    : `Sembunyikan bagian ${sectionLabel.toLowerCase()}`;

  routeDetailToggle
    .setAttribute(
      "title",
      label
    );

  routeDetailToggle
    .setAttribute(
      "aria-label",
      label
    );

  updateRouteDetailToggleTerminology();

  if (persist) {
    try {
      localStorage.setItem(
        ROUTE_DETAIL_COLLAPSED_STORAGE_KEY,
        isCollapsed ? "1" : "0"
      );
    } catch (error) {
      /* no-op */
    }
  }

  setTimeout(
    () => {
      map.invalidateSize();
    },
    120
  );
}


function restoreRouteDetailCollapseState() {
  try {
    const saved =
      localStorage.getItem(
        ROUTE_DETAIL_COLLAPSED_STORAGE_KEY
      );

    setRouteDetailCollapsed(
      saved === "1",
      { persist: false }
    );
  } catch (error) {
    setRouteDetailCollapsed(
      false,
      { persist: false }
    );
  }
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


routeDetailToggle
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      setRouteDetailCollapsed(
        !routeDetailCard
          ?.classList
          .contains(
            "is-collapsed"
          )
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


function updateStructureLegend(
  routeId = ""
) {
  if (!structureLegendSection) {
    return;
  }

  let show = false;

  if (routeId) {
    const route = getRouteById(routeId);
    show = Boolean(
      route &&
      getRouteMode(route) === "MRT" &&
      getRouteFeaturesById(routeId)
        .some(feature =>
          ["ELEVATED", "TRANSITION", "UNDERGROUND"]
            .includes(
              normalizeStructure(
                feature?.properties?.STRUCTURE
              )
            )
        )
    );
  }
  else {
    const selectedMode = normalizeMode(
      modeSelect?.value
    );

    show = Boolean(
      (selectedMode === "MRT" || selectedMode === "ALL") &&
      routeData?.features?.some(feature =>
        getRouteMode(feature) === "MRT" &&
        ["ELEVATED", "TRANSITION", "UNDERGROUND"]
          .includes(
            normalizeStructure(
              feature?.properties?.STRUCTURE
            )
          )
      )
    );
  }

  structureLegendSection.hidden = !show;

  if (!show) {
    structureLegendSection.open = false;
  }
}


function updateOperationalLegend(
  routeId = ""
) {
  if (!operationalLegendSection) {
    return;
  }

  const show =
    Boolean(
      routeId &&
      hasRouteDiversion(
        routeId
      )
    );

  operationalLegendSection.hidden =
    !show;

  if (!show) {
    operationalLegendSection.open =
      false;
  }
}


/* =========================================================
   SHOW ROUTES
   ========================================================= */

function showAllRoutes(
  fit = false
) {
  dismissedStopLogicalKey = "";

  clearPoiMarker();
  closeRoutePlanIntro();

  currentSelectedRouteId = null;
  comparisonRouteId = null;
  showRegularRouteComparison = false;

  updateRouteDetailCardState();

  clearSelectedStop();
  removeStops();

  stopListEl.innerHTML = "";

  const features =
    getFilteredRoutes();

  drawRoutes(
    expandLogicalRouteGeometryFeatures(
      features
    )
  );
  renderAllRouteInfo();

  updateOperationalLegend("");
  updateStructureLegend("");

  updateRouteCompareUI();
  updateRecenterButtonLabel();

  syncUrlState();

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
  resetOptionalStops = true,
  fitToRoute = true
) {
  dismissedStopLogicalKey = "";

  clearPoiMarker();

  const previousRouteId =
    String(
      currentSelectedRouteId ?? ""
    );

  if (
    previousRouteId !==
    String(routeId)
  ) {
    showRegularRouteComparison =
      false;

    /*
      Saat user benar-benar pindah rute utama, pembanding lama
      dibersihkan supaya konteks tidak terbawa tanpa sengaja.
      Initial load (previousRouteId kosong) juga aman.
    */
    if (previousRouteId) {
      comparisonRouteId =
        null;
    }
  }

  const feature =
    getRouteById(routeId);

  if (!feature) {
    return;
  }

  /*
    Default visibilitas titik Usulan/Gagasan mengikuti
    status rutenya.

    - Eksisting -> OFF
    - Rencana / Usulan / Gagasan -> ON

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
      [
        "Planned",
        "Proposed",
        "Conceptual"
      ].includes(routeStatus);

    setNonExistingStopsVisible(
      showOptionalByDefault
    );
  }

  currentSelectedRouteId =
    String(routeId);

  updateRouteDetailCardState();

  clearSelectedStop();

  updateOperationalLegend(
    routeId
  );

  updateStructureLegend(
    routeId
  );

  drawSelectedRouteGeometry(
    routeId
  );

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
    secara default zoom rute agar pas dengan area layar.

    Navigasi melalui integrasi dapat menonaktifkan fit ini agar
    zoom saat ini dipertahankan dan kamera hanya bergeser halus
    (sliding/pan) menuju halte/stasiun target.
  */
  if (fitToRoute) {
    fitRouteToScreen();
  }

  /*
    Untuk BRT 15–19, tampilkan pengantar compact satu kali
    per koridor dalam page load ini.
  */
  queueRoutePlanIntro(
    routeId
  );

  updateRouteCompareUI();
  updateRecenterButtonLabel();

  syncUrlState();
}

/*
  Marker hanya dihitung ulang setelah perubahan zoom selesai,
  sehingga pan/zoom Leaflet tetap ringan.
*/
map.on(
  "zoomend",
  () => {
    updateStopZoomVisualState();

    if (routeLayer) {
      routeLayer.setStyle(
        routeStyle
      );
    }

    if (routeStructureLayer) {
      routeStructureLayer.setStyle(
        routeStructureStyle
      );
    }

    if (routeHaloLayer) {
      routeHaloLayer.setStyle(
        haloStyle
      );
    }
  }
);


map.on(
  "resize",
  () => {
    updateStopLabelVisibility();
  }
);


/* =========================================================
   FILTER EVENTS
   ========================================================= */

function refreshFilters() {
  populateRouteDropdown();
  showAllRoutes(true);
}

modeSelect.addEventListener(
  "change",
  () => {
    updateStatusAvailabilityForMode();
    refreshFilters();
  }
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


routeCompareAdd
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      if (
        !currentSelectedRouteId
      ) {
        return;
      }

      populateComparisonRouteDropdown();

      routeComparePicker.hidden =
        false;

      routeCompareAdd.hidden =
        true;

      routeCompareAdd
        .setAttribute(
          "aria-expanded",
          "true"
        );

      requestAnimationFrame(
        () => {
          comparisonRouteSelect
            ?.focus();
        }
      );
    }
  );


comparisonRouteSelect
  ?.addEventListener(
    "change",
    () => {
      const routeId =
        comparisonRouteSelect.value;

      if (!routeId) {
        clearComparisonRoute();

        /*
          Picker tetap terbuka agar user bisa langsung
          memilih pembanding lain.
        */
        routeComparePicker.hidden =
          false;

        routeCompareAdd.hidden =
          true;

        return;
      }

      setComparisonRoute(
        routeId
      );
    }
  );


routeCompareClear
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      clearComparisonRoute();

      routeComparePicker.hidden =
        true;

      routeCompareAdd.hidden =
        false;

      routeCompareAdd
        .setAttribute(
          "aria-expanded",
          "false"
        );
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

  syncUrlState();
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

  syncUrlState();
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
   RECENTER / CONTEXT EXTENT
   ========================================================= */

/*
  Recenter hanya mengubah kamera peta, bukan state jaringan.

  - Bila satu rute sedang dipilih:
    kembali ke extent rute tersebut.
  - Bila sedang melihat ALL:
    kembali ke extent jaringan yang sedang lolos filter.
  - Bila layer belum tersedia:
    kembali ke view awal Jabodetabek.

  Dengan demikian pengguna tidak kehilangan pilihan rute,
  status, moda, maupun daftar halte hanya karena ingin
  memusatkan kembali peta.
*/
function recenterMap(
  {
    animate = true
  } = {}
) {
  closeGlobalSearchResults();
  closePoiSearchResults();

  if (
    currentSelectedRouteId &&
    routeLayer &&
    routeLayer.getBounds().isValid()
  ) {
    fitRouteToScreen({
      animate
    });

    return;
  }

  if (
    routeLayer &&
    routeLayer.getBounds().isValid()
  ) {
    const padding =
      getRouteFitPadding();

    map.fitBounds(
      routeLayer.getBounds(),
      {
        ...padding,
        maxZoom: 13,
        animate,
        duration:
          animate
            ? 0.55
            : 0
      }
    );

    return;
  }

  map.setView(
    [-6.20, 106.83],
    11,
    {
      animate
    }
  );
}


function updateRecenterButtonLabel() {
  if (!homeButton) {
    return;
  }

  let label =
    "Pusatkan kembali jaringan";

  if (currentSelectedRouteId) {
    const feature =
      getRouteById(
        currentSelectedRouteId
      );

    if (feature) {
      const comparisonFeature =
        getComparisonRouteFeature();

      label =
        comparisonFeature
          ? `Pusatkan kembali dua rute yang dibandingkan`
          : `Pusatkan kembali ${getRouteTitle(feature)}`;
    }
  }

  homeButton.title =
    label;

  homeButton.setAttribute(
    "aria-label",
    label
  );
}


homeButton.addEventListener(
  "click",
  () => {
    recenterMap();

    updateRecenterButtonLabel();

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

async function fetchGeoJSON(
  path,
  {
    required = false,
    label = path
  } = {}
) {
  try {
    const response = await fetch(
      path,
      {
        /* Revalidasi ETag tanpa memaksa unduh penuh setiap reload. */
        cache: "no-cache"
      }
    );

    if (!response.ok) {
      if (required) {
        throw new Error(
          `${label} gagal dimuat (${response.status})`
        );
      }

      console.info(
        `${label} belum tersedia; dataset ini dilewati.`
      );

      return featureCollection([]);
    }

    const data = await response.json();

    if (!Array.isArray(data?.features)) {
      throw new Error(
        `${label} bukan FeatureCollection GeoJSON yang valid`
      );
    }

    return data;
  }
  catch (error) {
    if (required) {
      throw error;
    }

    console.warn(
      `${label} tidak dapat dimuat; BRT tetap dijalankan.`,
      error
    );

    return featureCollection([]);
  }
}


async function loadData() {
  try {

    routeInfoEl.innerHTML = `
      <div class="eyebrow">MEMUAT</div>
      <h2>Memuat data jaringan…</h2>
      <p>Menyiapkan rute dan halte/stasiun.</p>
    `;

    if (isMobileLayout()) {
      setMobileFilterOpen(
        false
      );

      setMobileInfoOpen(
        false
      );
    }

    /*
      BRT wajib agar baseline tidak berubah.
      RAIL bersifat optional: bila rail_route.geojson / rail_stop.geojson
      belum diletakkan di folder data, WebGIS tetap terbuka sebagai BRT-only.

      Semua MRT, KRL, dan LRT berada di dua file RAIL yang sama.
      Script tidak perlu menambah request baru ketika moda/lin bertambah.
    */
    const [
      brtRouteRaw,
      brtStopRaw,
      railRouteRaw,
      railStopRaw
    ] = await Promise.all([
      fetchGeoJSON(
        "data/brt_route.geojson",
        {
          required: true,
          label: "brt_route.geojson"
        }
      ),

      fetchGeoJSON(
        "data/brt_stop.geojson",
        {
          required: true,
          label: "brt_stop.geojson"
        }
      ),

      fetchGeoJSON(
        "data/rail_route.geojson",
        {
          required: false,
          label: "rail_route.geojson"
        }
      ),

      fetchGeoJSON(
        "data/rail_stop.geojson",
        {
          required: false,
          label: "rail_stop.geojson"
        }
      )
    ]);

    const brtRoutes =
      adaptFeatureCollectionForRuntime(
        brtRouteRaw,
        {
          type: "route",
          datasetKey: "BRT"
        }
      );

    const brtStops =
      adaptFeatureCollectionForRuntime(
        brtStopRaw,
        {
          type: "stop",
          datasetKey: "BRT"
        }
      );

    const railRoutes =
      adaptFeatureCollectionForRuntime(
        railRouteRaw,
        {
          type: "route",
          datasetKey: "RAIL"
        }
      );

    const railStops =
      adaptFeatureCollectionForRuntime(
        railStopRaw,
        {
          type: "stop",
          datasetKey: "RAIL"
        }
      );

    routeData = mergeFeatureCollections(
      brtRoutes,
      railRoutes
    );

    stopData = mergeFeatureCollections(
      brtStops,
      railStops
    );

    assignRuntimeStopKeys();

    /*
      STOP_ROLE rail tidak diinferensikan dari sequence.
      Ini penting agar dataset testing/parsial tidak membuat
      stasiun terakhir yang kebetulan tersedia menjadi Terminus.
    */
    applyRailStopRolePolicy();

    validateRouteData();
    validateStopData();
    validateRailData();

    modeSelect.value = "ALL";
    statusSelect.value = "Existing";
    updateStatusAvailabilityForMode();

    applyUrlStateAfterDataLoad();
    updateScale();

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

    debugLog(
      "Rute total:",
      routeData.features?.length ?? 0
    );

    debugLog(
      "Halte/stasiun total:",
      stopData.features?.length ?? 0
    );

    debugLog(
      "RAIL:",
      `${railRoutes.features.length} segmen · ${railStops.features.length} stasiun`
    );
  }

  catch (error) {
    console.error(error);

    routeInfoEl.innerHTML = `
      <div class="eyebrow">GAGAL MEMUAT</div>
      <h2>Data jaringan gagal dimuat</h2>
      <p>Muat ulang halaman untuk mencoba kembali.</p>
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

restoreRouteDetailCollapseState();

    layoutDesktopRightCards();

    if (
      basemapPanel &&
      !basemapPanel.hidden
    ) {
      updateBasemapPanelState();
    }
  }
);
