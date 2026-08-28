// ============================================================
// JARINGAN TRANSPORTASI UMUM JAKARTA & JABODETABEK
// ============================================================
//
// PUBLIC WEBGIS
//
// MODA:
// - BRT
// - BRT Lintas
// - KRL
// - MRT
// - LRT
// - KA Bandara
//
// STATUS:
// - Eksisting
// - Rencana Resmi
// - Usulan Pemerintah
//
// ============================================================



// ============================================================
// 1. SUMBER DATA RUTE
// ============================================================
//
// File yang belum ada tidak akan membuat aplikasi berhenti.
// Jadi moda bisa ditambahkan bertahap.
//
// ============================================================

const ROUTE_SOURCES = [

    {
        url:
            "data/brt_route.geojson",

        mode:
            "BRT"
    },


    {
        url:
            "data/brt_lintas.geojson",

        mode:
            "BRT Lintas"
    },


    {
        url:
            "data/krl_route.geojson",

        mode:
            "KRL"
    },


    {
        url:
            "data/mrt_route.geojson",

        mode:
            "MRT"
    },


    {
        url:
            "data/lrt_route.geojson",

        mode:
            "LRT"
    },


    {
        url:
            "data/airport_rail_route.geojson",

        mode:
            "KA Bandara"
    }

];



// ============================================================
// 2. SUMBER DATA HALTE / STASIUN
// ============================================================
//
// Bisa ditambah lagi kalau diperlukan.
//
// ============================================================

const STOP_SOURCES = [

    {
        url:
            "data/brt_stop.geojson"
    },


    {
        url:
            "data/rail_stop.geojson"
    }

];



// ============================================================
// 3. URUTAN MODA
// ============================================================

const MODE_ORDER = [

    "BRT",

    "BRT Lintas",

    "KRL",

    "MRT",

    "LRT",

    "KA Bandara"

];



// ============================================================
// 4. KONFIGURASI
// ============================================================

// Saat semua rute tampil,
// halte/stasiun disembunyikan.
const SHOW_STOPS_WHEN_ALL =
    false;



// ============================================================
// 5. MEMBUAT MAP
// ============================================================

const map =
    L.map(
        "map",
        {
            zoomControl:
                true,

            preferCanvas:
                true
        }
    )
    .setView(
        [-6.20, 106.83],
        11
    );



// ============================================================
// 6. PANE
// ============================================================

// Halo
map.createPane(
    "routeHaloPane"
);

map.getPane(
    "routeHaloPane"
).style.zIndex = 450;


// Garis
map.createPane(
    "routePane"
);

map.getPane(
    "routePane"
).style.zIndex = 460;


// Halte/stasiun
map.createPane(
    "stopPane"
);

map.getPane(
    "stopPane"
).style.zIndex = 480;


// GPS accuracy
map.createPane(
    "gpsAccuracyPane"
);

map.getPane(
    "gpsAccuracyPane"
).style.zIndex = 490;


// GPS marker
map.createPane(
    "gpsMarkerPane"
);

map.getPane(
    "gpsMarkerPane"
).style.zIndex = 500;



// ============================================================
// 7. BASEMAP
// ============================================================


// ------------------------------------------------------------
// OPENSTREETMAP
// ------------------------------------------------------------

const osm =
    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {
            maxZoom:
                19,

            attribution:
                "&copy; OpenStreetMap contributors"
        }

    );



// ------------------------------------------------------------
// LIGHT CANVAS
// ------------------------------------------------------------

const lightCanvas =
    L.tileLayer(

        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",

        {
            maxNativeZoom:
                16,

            maxZoom:
                19,

            attribution:
                "Tiles &copy; Esri"
        }

    );



// ------------------------------------------------------------
// SATELLITE
// ------------------------------------------------------------

const satellite =
    L.tileLayer(

        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

        {
            maxZoom:
                19,

            attribution:
                "Tiles &copy; Esri"
        }

    );



// ============================================================
// 8. BASEMAP STATE
// ============================================================

let currentBasemap =
    lightCanvas;


let currentBasemapType =
    "light";


let basemapOpacity =
    1;


currentBasemap.addTo(
    map
);



// ============================================================
// 9. DATA STATE
// ============================================================

let allRoutes = [];

let allStops = [];


let routeHaloLayer =
    null;


let routeLayer =
    null;


let stopLayer =
    null;


let selectedRouteId =
    "ALL";



// GPS

let userLocationMarker =
    null;


let userAccuracyCircle =
    null;



// ============================================================
// 10. HTML ELEMENT
// ============================================================

const modeSelect =
    document.getElementById(
        "modeSelect"
    );


const routeSelect =
    document.getElementById(
        "routeSelect"
    );


const routeInfo =
    document.getElementById(
        "routeInfo"
    );


const statusCheckboxes =
    document.querySelectorAll(
        ".status-checkbox"
    );



// ============================================================
// 11. ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}



// ============================================================
// 12. URL AMAN
// ============================================================

function getSafeURL(value) {

    if (!value) {

        return null;

    }


    try {

        const url =
            new URL(
                value,
                window.location.href
            );


        if (
            url.protocol === "http:" ||
            url.protocol === "https:"
        ) {

            return url.href;

        }

    }

    catch {

        return null;

    }


    return null;

}



// ============================================================
// 13. NORMALISASI STATUS
// ============================================================

function normalizeStatus(value) {

    const text =
        String(
            value || ""
        )
        .trim()
        .toLowerCase();


    if (
        text.includes(
            "eksis"
        )
    ) {

        return "Eksisting";

    }


    if (
        text === "rencana" ||
        text.includes(
            "rencana resmi"
        )
    ) {

        return "Rencana Resmi";

    }


    if (
        text.includes(
            "usulan"
        )
    ) {

        return "Usulan Pemerintah";

    }


    return (
        value ||
        "Eksisting"
    );

}



// ============================================================
// 14. REMARK
// ============================================================

function hasUsefulRemark(value) {

    if (!value) {

        return false;

    }


    const text =
        String(value)
        .trim()
        .toLowerCase();


    return ![
        "",
        "-",
        "tidak ada",
        "tidak ada.",
        "none",
        "null"
    ].includes(
        text
    );

}



// ============================================================
// 15. ROUTE ID
// ============================================================

function getRouteId(feature) {

    return String(
        feature.properties.ID
    );

}



// ============================================================
// 16. DISPLAY NAME
// ============================================================

function getRouteDisplayName(feature) {

    const p =
        feature.properties;


    const mode =
        p.MODE ||
        "";


    const line =
        String(
            p.LINE ||
            ""
        ).trim();


    const name =
        p.NAME ||
        "-";



    // --------------------------------------------------------
    // BRT
    // --------------------------------------------------------

    if (
        mode === "BRT"
    ) {

        return line

            ? `Koridor ${line} (${name})`

            : `BRT (${name})`;

    }



    // --------------------------------------------------------
    // BRT LINTAS
    // --------------------------------------------------------

    if (
        mode ===
        "BRT Lintas"
    ) {

        return line

            ? `BRT Lintas ${line} (${name})`

            : `BRT Lintas (${name})`;

    }



    // --------------------------------------------------------
    // RAIL
    // --------------------------------------------------------

    if (line) {

        return `${mode} ${line} (${name})`;

    }


    return `${mode} (${name})`;

}



// ============================================================
// 17. SHORT LABEL
// ============================================================

function getRouteShortLabel(feature) {

    const p =
        feature.properties;


    if (
        p.SHORT_NAME
    ) {

        return String(
            p.SHORT_NAME
        );

    }


    if (
        p.LINE
    ) {

        return String(
            p.LINE
        );

    }


    return String(
        p.MODE ||
        "Rute"
    );

}



// ============================================================
// 18. ROUTE SORT
// ============================================================

function sortRoutes(
    a,
    b
) {

    const modeA =
        MODE_ORDER.indexOf(
            a.properties.MODE
        );


    const modeB =
        MODE_ORDER.indexOf(
            b.properties.MODE
        );


    if (
        modeA !== modeB
    ) {

        return modeA - modeB;

    }


    return String(
        a.properties.LINE ||
        a.properties.NAME ||
        ""
    )
    .localeCompare(

        String(
            b.properties.LINE ||
            b.properties.NAME ||
            ""
        ),

        undefined,

        {
            numeric:
                true,

            sensitivity:
                "base"
        }

    );

}



// ============================================================
// 19. NORMALISASI ROUTE FEATURE
// ============================================================

function normalizeRouteFeature(
    feature,
    source,
    index
) {

    const copy =
        structuredClone(
            feature
        );


    const p =
        copy.properties ||
        {};


    copy.properties =
        p;


    // Mode dipaksa sesuai file sumber.
    p.MODE =
        source.mode;


    p.STATUS =
        normalizeStatus(
            p.STATUS
        );


    // ID fallback.
    if (
        !p.ID
    ) {

        const safeMode =
            source.mode
            .replaceAll(
                " ",
                "_"
            )
            .toUpperCase();


        p.ID =
            `${safeMode}_${p.LINE || index + 1}`;

    }


    return copy;

}



// ============================================================
// 20. LOAD GEOJSON OPTIONAL
// ============================================================

async function loadRouteSource(
    source
) {

    try {

        const response =
            await fetch(

                source.url,

                {
                    cache:
                        "no-store"
                }

            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !Array.isArray(
                data.features
            )
        ) {

            return [];

        }


        return data.features.map(

            (
                feature,
                index
            ) =>

                normalizeRouteFeature(
                    feature,
                    source,
                    index
                )

        );

    }


    catch (error) {

        console.warn(
            `Data ${source.mode} belum tersedia:`,
            source.url
        );


        return [];

    }

}



// ============================================================
// 21. LOAD STOP SOURCE
// ============================================================

async function loadStopSource(
    source
) {

    try {

        const response =
            await fetch(

                source.url,

                {
                    cache:
                        "no-store"
                }

            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        return Array.isArray(
            data.features
        )

            ? data.features

            : [];

    }


    catch {

        console.warn(
            "Data halte/stasiun belum tersedia:",
            source.url
        );


        return [];

    }

}



// ============================================================
// 22. INITIAL LOAD
// ============================================================

async function initializeData() {

    const routeResults =
        await Promise.all(

            ROUTE_SOURCES.map(
                loadRouteSource
            )

        );


    allRoutes =
        routeResults
        .flat()
        .sort(
            sortRoutes
        );


    const stopResults =
        await Promise.all(

            STOP_SOURCES.map(
                loadStopSource
            )

        );


    allStops =
        stopResults.flat();



    // --------------------------------------------------------
    // TIDAK ADA DATA
    // --------------------------------------------------------

    if (
        allRoutes.length === 0
    ) {

        routeInfo.innerHTML = `

            <span class="small-title">
                Error
            </span>

            <h2>
                Data jaringan belum tersedia
            </h2>

            <p>
                Periksa file GeoJSON pada folder data.
            </p>

        `;


        return;

    }



    buildModeDropdown();


    modeSelect.disabled =
        false;


    routeSelect.disabled =
        false;


    rebuildRouteDropdown();


    renderCurrentView();

}



// ============================================================
// 23. BUILD MODE DROPDOWN
// ============================================================

function buildModeDropdown() {

    modeSelect.innerHTML = `

        <option value="ALL">
            Semua Moda
        </option>

    `;


    const modes =
        MODE_ORDER.filter(

            mode =>

                allRoutes.some(

                    feature =>

                        feature.properties.MODE ===
                        mode

                )

        );


    modes.forEach(
        mode => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                mode;


            option.textContent =
                mode;


            modeSelect.appendChild(
                option
            );

        }
    );

}



// ============================================================
// 24. ACTIVE STATUS
// ============================================================

function getActiveStatuses() {

    return Array.from(
        statusCheckboxes
    )

    .filter(
        checkbox =>
            checkbox.checked
    )

    .map(
        checkbox =>
            checkbox.value
    );

}



// ============================================================
// 25. FILTER ROUTES
// ============================================================

function getFilteredRoutes() {

    const mode =
        modeSelect.value;


    const statuses =
        getActiveStatuses();


    return allRoutes.filter(

        feature => {

            const p =
                feature.properties;


            const modeMatch =

                mode === "ALL" ||

                p.MODE === mode;


            const statusMatch =

                statuses.includes(
                    p.STATUS
                );


            return (
                modeMatch &&
                statusMatch
            );

        }

    );

}



// ============================================================
// 26. REBUILD ROUTE DROPDOWN
// ============================================================

function rebuildRouteDropdown() {

    const routes =
        getFilteredRoutes();


    routeSelect.innerHTML =
        "";


    const allOption =
        document.createElement(
            "option"
        );


    allOption.value =
        "ALL";


    allOption.textContent =
        "Semua Rute";


    routeSelect.appendChild(
        allOption
    );



    // --------------------------------------------------------
    // GROUP BY MODE
    // --------------------------------------------------------

    const grouped =
        new Map();


    routes.forEach(
        feature => {

            const mode =
                feature.properties.MODE;


            if (
                !grouped.has(
                    mode
                )
            ) {

                grouped.set(
                    mode,
                    []
                );

            }


            grouped.get(
                mode
            ).push(
                feature
            );

        }
    );



    MODE_ORDER.forEach(
        mode => {

            if (
                !grouped.has(
                    mode
                )
            ) {

                return;

            }


            const optgroup =
                document.createElement(
                    "optgroup"
                );


            optgroup.label =
                mode;


            grouped
                .get(mode)
                .sort(sortRoutes)
                .forEach(

                    feature => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            getRouteId(
                                feature
                            );


                        option.textContent =
                            getRouteDisplayName(
                                feature
                            );


                        optgroup.appendChild(
                            option
                        );

                    }

                );


            routeSelect.appendChild(
                optgroup
            );

        }
    );



    const selectedExists =
        routes.some(

            feature =>

                getRouteId(
                    feature
                ) ===
                selectedRouteId

        );


    if (
        selectedRouteId !== "ALL" &&
        !selectedExists
    ) {

        selectedRouteId =
            "ALL";

    }


    routeSelect.value =
        selectedRouteId;


    routeSelect.disabled =
        routes.length === 0;

}



// ============================================================
// 27. STATUS DASH
// ============================================================

function getDashArray(
    status
) {

    if (
        status ===
        "Rencana Resmi"
    ) {

        return "8 5";

    }


    if (
        status ===
        "Usulan Pemerintah"
    ) {

        return "3 5";

    }


    return null;

}



// ============================================================
// 28. ROUTE STYLE
// ============================================================
//
// Garis sengaja dibuat lebih tipis.
//
// Semua jaringan:
// 2.5 px
//
// Selected:
// 3.5 px
//
// ============================================================

function getRouteStyle(
    feature,
    selected
) {

    const p =
        feature.properties;


    return {

        pane:
            "routePane",

        color:
            p.COLOR ||
            "#555555",

        weight:
            selected
                ? 3.5
                : 2.5,

        opacity:
            selected
                ? 1
                : 0.90,

        dashArray:
            getDashArray(
                p.STATUS
            ),

        lineCap:
            "round",

        lineJoin:
            "round"

    };

}



// ============================================================
// 29. HALO COLOR
// ============================================================

function getHaloColor() {

    return (
        currentBasemapType ===
        "satellite"
    )

        ? "#FFFFFF"

        : "#202020";

}



// ============================================================
// 30. HALO STYLE
// ============================================================

function getHaloStyle(
    feature,
    selected
) {

    const p =
        feature.properties;


    return {

        pane:
            "routeHaloPane",

        color:
            getHaloColor(),

        weight:
            selected
                ? 5.5
                : 4.2,

        opacity:

            currentBasemapType ===
            "satellite"

                ? (
                    selected
                        ? 0.85
                        : 0.70
                )

                : (
                    selected
                        ? 0.55
                        : 0.35
                ),

        dashArray:
            getDashArray(
                p.STATUS
            ),

        lineCap:
            "round",

        lineJoin:
            "round",

        interactive:
            false

    };

}



// ============================================================
// 31. REMOVE ROUTE LAYERS
// ============================================================

function removeRouteLayers() {

    if (
        routeHaloLayer
    ) {

        map.removeLayer(
            routeHaloLayer
        );


        routeHaloLayer =
            null;

    }


    if (
        routeLayer
    ) {

        map.removeLayer(
            routeLayer
        );


        routeLayer =
            null;

    }

}



// ============================================================
// 32. CREATE ROUTE LAYERS
// ============================================================

function createRouteLayers(
    features,
    selected
) {

    removeRouteLayers();


    if (
        features.length === 0
    ) {

        return;

    }


    const data = {

        type:
            "FeatureCollection",

        features:
            features

    };



    // Halo

    routeHaloLayer =
        L.geoJSON(

            data,

            {
                pane:
                    "routeHaloPane",

                style:
                    feature =>
                        getHaloStyle(
                            feature,
                            selected
                        ),

                interactive:
                    false
            }

        )
        .addTo(
            map
        );



    // Garis utama

    routeLayer =
        L.geoJSON(

            data,

            {
                pane:
                    "routePane",

                style:
                    feature =>
                        getRouteStyle(
                            feature,
                            selected
                        ),

                onEachFeature:
                    routePopup
            }

        )
        .addTo(
            map
        );

}



// ============================================================
// 33. UPDATE HALO
// ============================================================

function updateRouteHalo() {

    if (
        !routeHaloLayer
    ) {

        return;

    }


    const selected =
        selectedRouteId !==
        "ALL";


    routeHaloLayer.setStyle(

        feature =>

            getHaloStyle(
                feature,
                selected
            )

    );

}



// ============================================================
// 34. ROUTE POPUP
// ============================================================

function routePopup(
    feature,
    layer
) {

    const p =
        feature.properties;


    const alignmentHTML =
        p.ALIGNMENT

        ? `

            <div class="popup-section">

                <div class="popup-label">
                    Trase
                </div>

                <div class="popup-value">
                    ${escapeHTML(
                        p.ALIGNMENT
                    )}
                </div>

            </div>

        `

        : "";


    const remarkHTML =
        hasUsefulRemark(
            p.REMARK
        )

        ? `

            <div class="popup-section">

                <div class="popup-label">
                    Catatan
                </div>

                <div class="popup-value popup-note">
                    ${escapeHTML(
                        p.REMARK
                    )}
                </div>

            </div>

        `

        : "";


    const safeURL =
        getSafeURL(
            p.SOURCE_URL
        );


    const sourceLinkHTML =
        safeURL

        ? `

            <div class="popup-source-link">

                <a
                    href="${escapeHTML(
                        safeURL
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Buka sumber ↗
                </a>

            </div>

        `

        : "";



    layer.bindPopup(

        `

        <div class="route-popup">

            <div
                class="popup-route-title"

                style="
                    color:
                    ${escapeHTML(
                        p.COLOR ||
                        "#151515"
                    )}
                "
            >

                ${escapeHTML(
                    getRouteDisplayName(
                        feature
                    )
                )}

            </div>


            <div class="popup-mode">

                ${escapeHTML(
                    p.MODE
                )}

            </div>


            <div class="popup-divider">
            </div>


            <div class="popup-section">

                <div class="popup-label">
                    Status
                </div>

                <div class="popup-value">
                    ${escapeHTML(
                        p.STATUS
                    )}
                </div>

            </div>


            ${alignmentHTML}


            <div class="popup-section">

                <div class="popup-label">
                    Sumber
                </div>

                <div class="popup-value">
                    ${escapeHTML(
                        p.SOURCE ||
                        "-"
                    )}
                </div>

                ${sourceLinkHTML}

            </div>


            ${remarkHTML}

        </div>

        `,

        {
            maxWidth:
                350
        }

    );

}



// ============================================================
// 35. HIDE STOPS
// ============================================================

function hideStops() {

    if (
        stopLayer
    ) {

        map.removeLayer(
            stopLayer
        );


        stopLayer =
            null;

    }

}



// ============================================================
// 36. PARSE LIST
// ============================================================

function parseList(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return [];

    }


    return String(value)

        .split(
            /[;,|]/
        )

        .map(
            item =>
                item.trim()
        )

        .filter(
            Boolean
        );

}



// ============================================================
// 37. STOP ROUTES
// ============================================================

function getStopRouteIds(
    feature
) {

    return parseList(
        feature.properties.ROUTES
    );

}



// ============================================================
// 38. STOP SERVES ROUTE
// ============================================================

function stopServesRoute(
    stopFeature,
    routeFeature
) {

    const stopRouteIds =
        getStopRouteIds(
            stopFeature
        );


    const routeId =
        getRouteId(
            routeFeature
        );


    // --------------------------------------------------------
    // METODE UTAMA: ROUTES
    // --------------------------------------------------------

    if (
        stopRouteIds.length >
        0
    ) {

        return stopRouteIds.includes(
            routeId
        );

    }



    // --------------------------------------------------------
    // FALLBACK LAMA UNTUK BRT:
    // LINES = 1;2;3;8
    // --------------------------------------------------------

    const lines =
        parseList(
            stopFeature
                .properties
                .LINES
        );


    if (
        lines.length === 0
    ) {

        return false;

    }


    const routeLine =
        String(
            routeFeature
                .properties
                .LINE ||
            ""
        );


    return lines.includes(
        routeLine
    );

}



// ============================================================
// 39. LINKED ROUTES FOR STOP
// ============================================================

function getLinkedRoutes(
    stopFeature
) {

    const ids =
        getStopRouteIds(
            stopFeature
        );


    if (
        ids.length >
        0
    ) {

        return ids

            .map(
                id =>

                    allRoutes.find(

                        route =>

                            getRouteId(
                                route
                            ) === id

                    )
            )

            .filter(
                Boolean
            );

    }



    // Fallback BRT LINES

    const lines =
        parseList(
            stopFeature
                .properties
                .LINES
        );


    return allRoutes.filter(

        route =>

            (
                route.properties.MODE ===
                "BRT"
            )

            &&

            lines.includes(

                String(
                    route.properties.LINE
                )

            )

    );

}



// ============================================================
// 40. STOP NAME
// ============================================================

function getStopName(
    feature
) {

    const p =
        feature.properties;


    return (
        p.STOP_NAME ||
        p.STATION_NAME ||
        p.NAME ||
        "-"
    );

}



// ============================================================
// 41. STOP TYPE
// ============================================================

function getStopType(
    feature
) {

    const p =
        feature.properties;


    if (
        p.STOP_TYPE
    ) {

        return p.STOP_TYPE;

    }


    const linked =
        getLinkedRoutes(
            feature
        );


    const onlyBRT =
        linked.length > 0 &&

        linked.every(

            route =>

                route.properties.MODE ===
                "BRT" ||

                route.properties.MODE ===
                "BRT Lintas"

        );


    return onlyBRT

        ? "Halte"

        : "Stasiun";

}



// ============================================================
// 42. CREATE STOP LAYER
// ============================================================

function showStopsForRoute(
    routeFeature
) {

    hideStops();


    if (
        allStops.length ===
        0
    ) {

        return;

    }


    const stops =
        allStops.filter(

            stop =>

                stopServesRoute(
                    stop,
                    routeFeature
                )

        );


    if (
        stops.length === 0
    ) {

        return;

    }


    const routeColor =
        routeFeature
            .properties
            .COLOR ||
        "#444444";


    const data = {

        type:
            "FeatureCollection",

        features:
            stops

    };


    stopLayer =
        L.geoJSON(

            data,

            {
                pane:
                    "stopPane",


                pointToLayer:
                    function (
                        feature,
                        latlng
                    ) {

                        const linkedRoutes =
                            getLinkedRoutes(
                                feature
                            );


                        const interchange =
                            linkedRoutes.length >
                            1;


                        return L.circleMarker(

                            latlng,

                            {
                                pane:
                                    "stopPane",

                                radius:
                                    interchange
                                        ? 6
                                        : 4.5,

                                color:
                                    routeColor,

                                weight:
                                    interchange
                                        ? 2.5
                                        : 2,

                                fillColor:
                                    "#FFFFFF",

                                fillOpacity:
                                    1,

                                opacity:
                                    1
                            }

                        );

                    },


                onEachFeature:
                    stopPopup
            }

        )
        .addTo(
            map
        );

}



// ============================================================
// 43. STOP POPUP
// ============================================================

function stopPopup(
    feature,
    layer
) {

    const p =
        feature.properties;


    const linked =
        getLinkedRoutes(
            feature
        );


    const badges =
        linked.length > 0

        ? linked

            .sort(
                sortRoutes
            )

            .map(
                route => {

                    const color =
                        route.properties.COLOR ||
                        "#555555";


                    return `

                        <span
                            class="stop-line-badge"

                            title="${escapeHTML(
                                getRouteDisplayName(
                                    route
                                )
                            )}"

                            style="
                                border-color:
                                ${escapeHTML(
                                    color
                                )};

                                color:
                                ${escapeHTML(
                                    color
                                )};
                            "
                        >

                            ${escapeHTML(
                                getRouteShortLabel(
                                    route
                                )
                            )}

                        </span>

                    `;

                }
            )

            .join("")

        : "-";


    layer.bindPopup(

        `

        <div class="stop-popup">

            <div class="popup-stop-label">

                ${escapeHTML(
                    getStopType(
                        feature
                    )
                )}

            </div>


            <div class="popup-stop-name">

                ${escapeHTML(
                    getStopName(
                        feature
                    )
                )}

            </div>


            <div class="popup-divider">
            </div>


            <div class="popup-section">

                <div class="popup-label">
                    Melayani
                </div>


                <div class="stop-lines">

                    ${badges}

                </div>

            </div>


            ${
                p.STATUS

                ? `

                    <div class="popup-section">

                        <div class="popup-label">
                            Status
                        </div>

                        <div class="popup-value">

                            ${escapeHTML(
                                normalizeStatus(
                                    p.STATUS
                                )
                            )}

                        </div>

                    </div>

                `

                : ""
            }

        </div>

        `,

        {
            maxWidth:
                320
        }

    );

}



// ============================================================
// 44. RENDER CURRENT VIEW
// ============================================================

function renderCurrentView() {

    const filteredRoutes =
        getFilteredRoutes();



    // --------------------------------------------------------
    // KOSONG
    // --------------------------------------------------------

    if (
        filteredRoutes.length ===
        0
    ) {

        removeRouteLayers();


        hideStops();


        routeInfo.innerHTML = `

            <span class="small-title">
                Tampilan
            </span>

            <h2>
                Tidak ada rute
            </h2>

            <p>
                Tidak ada jaringan yang sesuai dengan filter saat ini.
            </p>

        `;


        return;

    }



    // --------------------------------------------------------
    // SELECTED ROUTE
    // --------------------------------------------------------

    if (
        selectedRouteId !==
        "ALL"
    ) {

        const route =
            filteredRoutes.find(

                feature =>

                    getRouteId(
                        feature
                    ) ===
                    selectedRouteId

            );


        if (route) {

            renderSelectedRoute(
                route
            );


            return;

        }

    }



    // --------------------------------------------------------
    // ALL ROUTES
    // --------------------------------------------------------

    renderAllRoutes(
        filteredRoutes
    );

}



// ============================================================
// 45. RENDER ALL ROUTES
// ============================================================

function renderAllRoutes(
    routes
) {

    selectedRouteId =
        "ALL";


    routeSelect.value =
        "ALL";


    createRouteLayers(
        routes,
        false
    );


    if (
        !SHOW_STOPS_WHEN_ALL
    ) {

        hideStops();

    }


    if (
        routeLayer &&
        routeLayer
            .getBounds()
            .isValid()
    ) {

        map.fitBounds(

            routeLayer.getBounds(),

            {
                padding:
                    [30, 30]
            }

        );

    }


    const mode =
        modeSelect.value;


    const modeText =
        mode === "ALL"

        ? "Semua Moda"

        : mode;


    routeInfo.innerHTML = `

        <span class="small-title">
            Tampilan
        </span>


        <h2>
            ${escapeHTML(
                modeText
            )}
        </h2>


        <p>
            ${routes.length}
            rute ditampilkan.
        </p>


        <p>
            Pilih satu rute untuk menampilkan
            halte atau stasiun yang dilayaninya.
        </p>

    `;

}



// ============================================================
// 46. SELECTED ROUTE
// ============================================================

function renderSelectedRoute(
    route
) {

    createRouteLayers(
        [route],
        true
    );


    showStopsForRoute(
        route
    );


    if (
        routeLayer &&
        routeLayer
            .getBounds()
            .isValid()
    ) {

        map.fitBounds(

            routeLayer.getBounds(),

            {
                padding:
                    [50, 50]
            }

        );

    }


    const p =
        route.properties;


    const alignmentHTML =
        p.ALIGNMENT

        ? `

            <div class="route-info-row">

                <span class="small-title">
                    Trase
                </span>

                <p>
                    ${escapeHTML(
                        p.ALIGNMENT
                    )}
                </p>

            </div>

        `

        : "";


    const remarkHTML =
        hasUsefulRemark(
            p.REMARK
        )

        ? `

            <div class="route-info-row">

                <span class="small-title">
                    Catatan
                </span>

                <p>
                    ${escapeHTML(
                        p.REMARK
                    )}
                </p>

            </div>

        `

        : "";


    const safeURL =
        getSafeURL(
            p.SOURCE_URL
        );


    const sourceLink =
        safeURL

        ? `

            <a
                class="sidebar-source-link"

                href="${escapeHTML(
                    safeURL
                )}"

                target="_blank"

                rel="noopener noreferrer"
            >
                Buka sumber ↗
            </a>

        `

        : "";


    routeInfo.innerHTML = `

        <span class="small-title">
            Rute terpilih
        </span>


        <h2
            style="
                color:
                ${escapeHTML(
                    p.COLOR ||
                    "#151515"
                )}
            "
        >

            ${escapeHTML(
                getRouteDisplayName(
                    route
                )
            )}

        </h2>


        <div class="route-mode-chip">

            ${escapeHTML(
                p.MODE
            )}

        </div>


        <div class="route-info-row">

            <span class="small-title">
                Status
            </span>

            <p>
                ${escapeHTML(
                    p.STATUS
                )}
            </p>

        </div>


        ${alignmentHTML}


        <div class="route-info-row">

            <span class="small-title">
                Sumber
            </span>

            <p>
                ${escapeHTML(
                    p.SOURCE ||
                    "-"
                )}
            </p>

            ${sourceLink}

        </div>


        ${remarkHTML}

    `;

}



// ============================================================
// 47. MODE EVENT
// ============================================================

modeSelect.addEventListener(

    "change",

    function () {

        selectedRouteId =
            "ALL";


        rebuildRouteDropdown();


        renderCurrentView();

    }

);



// ============================================================
// 48. ROUTE EVENT
// ============================================================

routeSelect.addEventListener(

    "change",

    function () {

        selectedRouteId =
            this.value;


        renderCurrentView();

    }

);



// ============================================================
// 49. STATUS EVENT
// ============================================================

statusCheckboxes.forEach(

    checkbox => {

        checkbox.addEventListener(

            "change",

            function () {

                rebuildRouteDropdown();


                renderCurrentView();

            }

        );

    }

);



// ============================================================
// 50. TILE POSITION
// ============================================================

function latLngToTile(
    lat,
    lng,
    zoom
) {

    const n =
        Math.pow(
            2,
            zoom
        );


    const x =
        Math.floor(

            (
                lng +
                180
            )

            /

            360

            *

            n

        );


    const latRad =
        lat *
        Math.PI /
        180;


    const y =
        Math.floor(

            (
                1 -

                Math.asinh(
                    Math.tan(
                        latRad
                    )
                )

                /

                Math.PI
            )

            /

            2

            *

            n

        );


    return {
        x,
        y,
        z:
            zoom
    };

}



// ============================================================
// 51. BASEMAP THUMBNAILS
// ============================================================

function updateBasemapThumbnails() {

    const center =
        map.getCenter();


    const zoom =
        Math.min(

            map.getZoom() +
            2,

            16

        );


    const tile =
        latLngToTile(

            center.lat,

            center.lng,

            zoom

        );


    const lightURL =

        "https://server.arcgisonline.com/" +

        "ArcGIS/rest/services/" +

        "Canvas/World_Light_Gray_Base/" +

        "MapServer/tile/" +

        `${tile.z}/${tile.y}/${tile.x}`;


    const osmURL =

        "https://tile.openstreetmap.org/" +

        `${tile.z}/${tile.x}/${tile.y}.png`;


    const satelliteURL =

        "https://server.arcgisonline.com/" +

        "ArcGIS/rest/services/" +

        "World_Imagery/MapServer/tile/" +

        `${tile.z}/${tile.y}/${tile.x}`;



    document
        .querySelectorAll(
            ".preview-light"
        )
        .forEach(

            element => {

                element.style.backgroundImage =
                    `url("${lightURL}")`;

            }

        );


    document
        .querySelectorAll(
            ".preview-osm"
        )
        .forEach(

            element => {

                element.style.backgroundImage =
                    `url("${osmURL}")`;

            }

        );


    document
        .querySelectorAll(
            ".preview-satellite"
        )
        .forEach(

            element => {

                element.style.backgroundImage =
                    `url("${satelliteURL}")`;

            }

        );

}



// ============================================================
// 52. GPS
// ============================================================

function locateUser(
    button
) {

    if (
        !navigator.geolocation
    ) {

        alert(
            "Browser tidak mendukung fitur lokasi."
        );


        return;

    }


    button.classList.add(
        "gps-loading"
    );


    navigator.geolocation.getCurrentPosition(

        // SUCCESS

        function (
            position
        ) {

            button.classList.remove(
                "gps-loading"
            );


            button.classList.add(
                "gps-active"
            );


            const lat =
                position.coords.latitude;


            const lng =
                position.coords.longitude;


            const accuracy =
                position.coords.accuracy;


            const latlng =
                L.latLng(
                    lat,
                    lng
                );



            if (
                userLocationMarker
            ) {

                map.removeLayer(
                    userLocationMarker
                );

            }


            if (
                userAccuracyCircle
            ) {

                map.removeLayer(
                    userAccuracyCircle
                );

            }



            userAccuracyCircle =
                L.circle(

                    latlng,

                    {
                        pane:
                            "gpsAccuracyPane",

                        radius:
                            accuracy,

                        color:
                            "#007AC2",

                        weight:
                            1,

                        opacity:
                            0.55,

                        fillColor:
                            "#007AC2",

                        fillOpacity:
                            0.10,

                        interactive:
                            false
                    }

                )
                .addTo(
                    map
                );



            userLocationMarker =
                L.circleMarker(

                    latlng,

                    {
                        pane:
                            "gpsMarkerPane",

                        radius:
                            7,

                        color:
                            "#FFFFFF",

                        weight:
                            3,

                        fillColor:
                            "#007AC2",

                        fillOpacity:
                            1
                    }

                )
                .addTo(
                    map
                );



            userLocationMarker.bindPopup(

                `

                <div class="gps-popup">

                    <div class="gps-popup-title">
                        Lokasi Anda
                    </div>

                    <div class="gps-popup-accuracy">

                        Akurasi ±${Math.round(
                            accuracy
                        )} meter

                    </div>

                </div>

                `

            );



            map.setView(

                latlng,

                Math.max(
                    map.getZoom(),
                    16
                ),

                {
                    animate:
                        true
                }

            );

        },



        // ERROR

        function (
            error
        ) {

            button.classList.remove(
                "gps-loading"
            );


            let message =
                "Lokasi tidak dapat diperoleh.";


            if (
                error.code ===
                error.PERMISSION_DENIED
            ) {

                message =
                    "Izin lokasi ditolak. Aktifkan izin lokasi pada browser.";

            }


            else if (
                error.code ===
                error.POSITION_UNAVAILABLE
            ) {

                message =
                    "Informasi lokasi tidak tersedia.";

            }


            else if (
                error.code ===
                error.TIMEOUT
            ) {

                message =
                    "Permintaan lokasi terlalu lama.";

            }


            alert(
                message
            );

        },



        {
            enableHighAccuracy:
                true,

            timeout:
                10000,

            maximumAge:
                30000
        }

    );

}



// ============================================================
// 53. TOOLBAR
// ============================================================

const MapToolbar =
    L.Control.extend({

        options: {

            position:
                "bottomleft"

        },


        onAdd:
            function () {

                const container =
                    L.DomUtil.create(

                        "div",

                        "map-toolbar"

                    );



                // ====================================================
                // BASEMAP
                // ====================================================

                const basemapButton =
                    L.DomUtil.create(

                        "button",

                        "toolbar-button basemap-button",

                        container

                    );


                basemapButton.type =
                    "button";


                basemapButton.title =
                    "Pilih basemap";


                basemapButton.innerHTML = `

                    <span
                        class="
                            basemap-preview
                            preview-light
                        "
                    ></span>

                `;



                // ====================================================
                // GPS
                // ====================================================

                const gpsButton =
                    L.DomUtil.create(

                        "button",

                        "toolbar-button gps-button",

                        container

                    );


                gpsButton.type =
                    "button";


                gpsButton.title =
                    "Lokasi saya";


                gpsButton.innerHTML = `

                    <span class="gps-icon">

                        <span class="gps-ring">
                        </span>

                        <span class="gps-dot">
                        </span>

                    </span>

                `;


                gpsButton.addEventListener(

                    "click",

                    function () {

                        locateUser(
                            gpsButton
                        );

                    }

                );



                // ====================================================
                // SCALE
                // ====================================================

                const scaleDisplay =
                    L.DomUtil.create(

                        "div",

                        "toolbar-scale",

                        container

                    );


                scaleDisplay.id =
                    "toolbarScaleDisplay";


                scaleDisplay.textContent =
                    "1:—";



                // ====================================================
                // NORTH
                // ====================================================

                const northDisplay =
                    L.DomUtil.create(

                        "div",

                        "toolbar-north",

                        container

                    );


                northDisplay.innerHTML = `

                    <span class="north-letter">
                        N
                    </span>

                    <span class="north-arrow">
                        ↑
                    </span>

                `;



                // ====================================================
                // BASEMAP GALLERY
                // ====================================================

                const menu =
                    L.DomUtil.create(

                        "div",

                        "basemap-gallery",

                        container

                    );


                menu.innerHTML = `

                    <div class="basemap-gallery-title">
                        Pilih Basemap
                    </div>


                    <div class="basemap-gallery-grid">


                        <button
                            class="
                                basemap-card
                                active
                            "

                            data-basemap="light"

                            type="button"
                        >

                            <div
                                class="
                                    basemap-card-preview
                                    preview-light
                                "
                            ></div>

                            <span>
                                Light
                            </span>

                        </button>



                        <button
                            class="basemap-card"

                            data-basemap="osm"

                            type="button"
                        >

                            <div
                                class="
                                    basemap-card-preview
                                    preview-osm
                                "
                            ></div>

                            <span>
                                OSM
                            </span>

                        </button>



                        <button
                            class="basemap-card"

                            data-basemap="satellite"

                            type="button"
                        >

                            <div
                                class="
                                    basemap-card-preview
                                    preview-satellite
                                "
                            ></div>

                            <span>
                                Satellite
                            </span>

                        </button>


                    </div>



                    <div class="basemap-opacity">


                        <div class="basemap-opacity-header">

                            <span>
                                Opacity
                            </span>

                            <span
                                id="basemapOpacityValue"
                            >
                                100%
                            </span>

                        </div>


                        <input
                            id="basemapOpacity"

                            type="range"

                            min="20"

                            max="100"

                            step="5"

                            value="100"
                        >


                    </div>

                `;



                // ====================================================
                // OPEN GALLERY
                // ====================================================

                basemapButton.addEventListener(

                    "click",

                    function () {

                        menu.classList.toggle(
                            "show"
                        );


                        updateBasemapThumbnails();

                    }

                );



                const basemapLayers = {

                    light:
                        lightCanvas,

                    osm:
                        osm,

                    satellite:
                        satellite

                };



                // ====================================================
                // OPACITY
                // ====================================================

                const opacitySlider =
                    menu.querySelector(
                        "#basemapOpacity"
                    );


                const opacityValue =
                    menu.querySelector(
                        "#basemapOpacityValue"
                    );


                opacitySlider.addEventListener(

                    "input",

                    function () {

                        basemapOpacity =
                            Number(
                                this.value
                            )
                            /
                            100;


                        currentBasemap.setOpacity(
                            basemapOpacity
                        );


                        opacityValue.textContent =
                            `${this.value}%`;

                    }

                );



                // ====================================================
                // CHANGE BASEMAP
                // ====================================================

                menu
                    .querySelectorAll(
                        ".basemap-card"
                    )
                    .forEach(

                        card => {

                            card.addEventListener(

                                "click",

                                function () {

                                    const type =
                                        this.dataset
                                            .basemap;



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



                                    currentBasemapType =
                                        type;


                                    currentBasemap =
                                        basemapLayers[
                                            type
                                        ];


                                    currentBasemap.setOpacity(
                                        basemapOpacity
                                    );


                                    currentBasemap.addTo(
                                        map
                                    );



                                    menu
                                        .querySelectorAll(
                                            ".basemap-card"
                                        )
                                        .forEach(

                                            item => {

                                                item.classList.remove(
                                                    "active"
                                                );

                                            }

                                        );


                                    this.classList.add(
                                        "active"
                                    );



                                    updateBasemapPreview(

                                        type,

                                        basemapButton

                                    );


                                    updateRouteHalo();


                                    updateBasemapThumbnails();


                                    menu.classList.remove(
                                        "show"
                                    );

                                }

                            );

                        }

                    );



                L.DomEvent
                    .disableClickPropagation(
                        container
                    );


                L.DomEvent
                    .disableScrollPropagation(
                        container
                    );


                return container;

            }

    });



map.addControl(
    new MapToolbar()
);



// ============================================================
// 54. BASEMAP PREVIEW BUTTON
// ============================================================

function updateBasemapPreview(
    type,
    button
) {

    const preview =
        button.querySelector(
            ".basemap-preview"
        );


    if (
        !preview
    ) {

        return;

    }


    preview.classList.remove(

        "preview-light",

        "preview-osm",

        "preview-satellite"

    );


    preview.classList.add(
        `preview-${type}`
    );


    updateBasemapThumbnails();

}



// ============================================================
// 55. SCALE
// ============================================================

function updateScaleDisplay() {

    const scaleDisplay =
        document.getElementById(
            "toolbarScaleDisplay"
        );


    if (
        !scaleDisplay
    ) {

        return;

    }


    const center =
        map.getCenter();


    const zoom =
        map.getZoom();


    const metersPerPixel =

        156543.03392

        *

        Math.cos(
            center.lat *
            Math.PI /
            180
        )

        /

        Math.pow(
            2,
            zoom
        );


    const rawScale =

        metersPerPixel

        *

        96

        *

        39.37;


    const niceScale =
        getNiceScale(
            rawScale
        );


    scaleDisplay.textContent =

        "1:" +

        niceScale.toLocaleString(
            "id-ID"
        );

}



// ============================================================
// 56. NICE SCALE
// ============================================================

function getNiceScale(
    scale
) {

    if (
        !Number.isFinite(
            scale
        ) ||
        scale <= 0
    ) {

        return 1;

    }


    const exponent =
        Math.floor(
            Math.log10(
                scale
            )
        );


    const magnitude =
        Math.pow(
            10,
            exponent
        );


    const normalized =
        scale /
        magnitude;


    let nice;


    if (
        normalized <=
        1
    ) {

        nice =
            1;

    }


    else if (
        normalized <=
        2
    ) {

        nice =
            2;

    }


    else if (
        normalized <=
        5
    ) {

        nice =
            5;

    }


    else {

        nice =
            10;

    }


    return Math.round(
        nice *
        magnitude
    );

}



// ============================================================
// 57. MAP EVENTS
// ============================================================

map.on(

    "zoomend moveend",

    function () {

        updateScaleDisplay();


        updateBasemapThumbnails();

    }

);



// ============================================================
// 58. INITIALIZE
// ============================================================

updateScaleDisplay();


updateBasemapThumbnails();


initializeData();



// ============================================================
// SELESAI
// ============================================================