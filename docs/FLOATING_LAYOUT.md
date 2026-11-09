# Layout WebGIS — header ringkas dan panel mengambang

Hasil disiapkan pada branch `codex/floating-network-layout` untuk review sebelum merge/publikasi.
Baseline: branch `main`, commit `46c3913042934b67712327d566e34c287178845e`.
Commit runtime final: `d6c88684e124d03c755239567ae3e5f177d9cd47`.
Checkout awal bersih; tidak ada AGENTS.md yang ditemukan pada workspace atau repositori.
Referensi gambar Kota Deltamas tidak tersedia di lampiran sesi; komposisi mengikuti uraian brief.

## Hasil dan alur yang dipertahankan

- Header desktop satu baris dengan judul persis **PETA JARINGAN TRANSPORTASI JABODETABEK** serta aksi **Cari, Jaringan, Legenda, Tentang**. Judul menjadi heading H1; heading Legenda menjadi H2.
- Judul mobile tetap dua baris: **PETA JARINGAN** / **TRANSPORTASI JABODETABEK**. Aksi dikelompokkan sebagai ikon bernama aksesibel dan navigasi bawah sesuai ruang. Search tetap langsung tersedia; pada landscape pendek ia menempati ruang header tersendiri.
- Panel Jaringan desktop selebar 320 px mengambang, memiliki margin, radius, bayangan, batas tinggi, scroll isi, serta tombol tutup/buka. Cari, Legenda dan Peta dasar bergantian memakai area kiri; panel yang tidak tampil juga `inert`.
- Detail rute tetap memakai area kanan tersendiri di desktop. Tidak ada duplikasi data/navigasi atau perpindahan detail ke slot filter, sehingga alur Kembali baru tidak diperlukan. Tombol Detail desktop dipindahkan dari header ke dock yang sudah ada; ID dan handler tetap sama.
- Peta memenuhi viewport di bawah header. Lokasi, cakupan, orientasi, dan zoom tersusun vertikal di kanan; ketika detail terbuka, rail kontrol tetap di sebelah kiri panel detail. Padding fit/popup mengikuti ruang panel.
- PT Sans lokal 400/700 dan bottom sheet **Mini / Sedang / Penuh** dipertahankan. Select mobile diperbesar dari 40 menjadi 44 px. Safe area, reduced motion, scroll isi dan fokus keyboard tetap ditangani.
- Buka/tutup panel tidak mengganti objek map/layer/marker dan tidak memanggil metode kamera maupun invalidateSize saat container tidak berubah. Query dan scroll hasil Search tetap tersimpan. Legend ditranslasikan ke sheet yang sesuai saat melintasi breakpoint; pilihan rute dan preferensi sheet dipertahankan.

Inventaris kontrol/alur awal dan penanganannya:

| Kontrol / alur | Penanganan |
| --- | --- |
| Jenis layanan, status, lin/koridor, perbandingan rute | DOM, native select, nilai dan handler asli dipertahankan di Jaringan. |
| Ringkasan, arah, kondisi trase, semua trase/sesuai arah, sumber/peringatan | Tetap pada tab Ringkasan di panel Detail asli. |
| Daftar halte/stasiun, badge integrasi/lin, detail terpilih | Tab dan handler asli; satu area scroll konten. |
| Search halte/stasiun/koridor, deduplikasi, tempat daring | Input dan hasil asli; tombol Cari membuka panel di desktop. |
| Popup BRT/LRT, sebelumnya/berikutnya, perpindahan lin dan integrasi | Mesin asli tetap; padding popup disesuaikan dengan chrome mengambang. |
| GPS, cakupan, utara, zoom, basemap/opacity, skala dan atribusi | Kontrol asli tetap tersedia; Pusatkan tidak menghapus filter. |
| Disclaimer, Tentang, tutorial/onboarding | Modal dan tour asli dengan anchor Search yang dapat dibuka dan pemulihan state. |
| URL direct-link dan A01 | Tetap memakai mesin serta capture/restore asli; state Search ditambahkan ke capture UI. |

## Berkas yang berubah

| Area | Berkas |
| --- | --- |
| Runtime | `index.html`, `css/layout-floating.css`, `js/layout-tabler.js`, `js/layout-tabler-ux.js`. |
| Tes lama yang mengikuti kontrak layout baru | `tools/test-layout-brand-title.mjs`, `tools/test-layout-compact-filter.mjs`, `tools/test-layout-mobile-sheets.mjs`, `tools/test-layout-mobile.mjs`, `tools/test-layout-precision.mjs`, `tools/test-layout-tabler.mjs`, `tools/test-a01-toggle.mjs`. Pemeriksaan kolom tetap diganti dengan bounds panel mengambang; pemeriksaan select mengikuti target 44 px; Search dibuka melalui tombol asli. |
| Tes perilaku baru | `tools/test-layout-floating.mjs`: enam viewport, eksklusivitas panel, query/scroll, fokus, state tour, identitas layer, kamera, URL dan breakpoint. |
| Bukti / paket | `tools/capture-floating-layout.mjs`, `tools/package-floating-layout.py`, `tools/smoke-runtime-package.mjs`. |
| CI | `.github/workflows/layout-precision.yml`, `.github/workflows/responsive-density-smoke.yml`, `.github/workflows/release-regression.yml`: perubahan stylesheet baru memicu pemeriksaan, termasuk A01 pada PR. |
| Dokumentasi / artefak | Dokumen ini, `docs/floating-layout/` berisi log, hash, audit, screenshot, galeri, patch sumber dan ZIP runtime. |

Empat GeoJSON, `js/map.js`, `js/layout-concept.js`, `css/style.css`, dan `css/layout-concept.css`
identik byte dengan baseline. Font, ID/urutan/geometri/atribut/warna rute, taxonomy,
penamaan status, paket dependency dan lockfile juga tidak berubah. Delapan hash terlindungi
tersedia di [integrity.json](floating-layout/verification/integrity.json).

## Verifikasi

<!-- RESULTS -->
| Pemeriksaan | Hasil aktual | Bukti |
| --- | --- | --- |
| `npm run build:ui` | Lulus; CSS hasil build tidak memiliki diff terhadap source yang dikomit. | [build.txt](floating-layout/verification/build.txt) |
| Baseline `npm run test:regression` | **146/146 layout + 18/18 A01 lulus**, 0 gagal/dilewati. | [baseline-regression.tap](floating-layout/verification/baseline-regression.tap) |
| Regresi layout, fase `npm run test:regression` | **156/156 lulus**, 0 gagal/dilewati. | [layout-final.tap](floating-layout/verification/layout-final.tap) |
| Uji ulang `npm run test:a01` setelah stabilisasi fixture | **18/18 lulus**, 0 gagal/dilewati. **174 tes regresi total lulus**. | [a01-final.tap](floating-layout/verification/a01-final.tap) |
| State panel setelah perbaikan scroll hasil Search | **19/19 lulus**, meliputi popup, tour, keyboard, state dan kamera; satu kasus tambahan memeriksa scroll nyata 40 px pada viewport pendek. | [final-panel-state.tap](floating-layout/verification/final-panel-state.tap), [search-scroll-final.tap](floating-layout/verification/search-scroll-final.tap) |
| Heading responsif dengan nama aksesibel | **6/6 lulus** pada HTML akhir. | [heading-accessibility.tap](floating-layout/verification/heading-accessibility.tap) |
| Fokus Legenda responsif | **3/3 viewport lulus**, termasuk navigasi landscape yang dikelompokkan. | [legend-focus.json](floating-layout/verification/legend-focus.json) |
| Uji tambahan layar kecil/landscape | **7/7 lulus**; panel, scroll, tutorial dan LRT. | [touch-landscape.tap](floating-layout/verification/touch-landscape.tap) |
| Ekstraksi ZIP dan HTTP runtime | Lulus; onboarding, LRT Bekasi/Cawang dan stasiun berikutnya; 0 error JS dan 0 HTTP lokal 4xx/5xx. | [package-smoke.json](floating-layout/verification/package-smoke.json) |
| Galeri perbandingan | 24 gambar, pemilih viewport/tampilan dan unduhan ZIP termuat melalui HTTP. | [gallery.json](floating-layout/verification/gallery.json) |
| Screenshot provider aktual | 12 sebelum + 12 sesudah; 0 error runtime, 0 kegagalan tile. | Manifest di bawah. |

Ringkasan terstruktur: [results.json](floating-layout/verification/results.json).
ZIP **53 file**, ukuran **1,218,217 byte**, SHA-256:
`c6b763172a6af06123637ffe9ef829bbf26c279790545ac0c13910c2588851a1`.
<!-- /RESULTS -->

Enam viewport wajib: **1440×900, 1280×720, 1024×768, 768×1024, 390×844, 360×800**.
Suite lama juga mencakup 320×568, 568×320, 844×390, 1366×900 dan 1600×1000.
Cakupan meliputi header/panel, scroll daftar, popup LRT Jakarta/Jabodebek, navigasi
sebelumnya/berikutnya, integrasi dan multi-lin, pencarian, arah/kondisi trase,
direct-link, onboarding/tutorial, ukuran keyboard virtual, breakpoint dan A01.

Regresi memakai aplikasi, data, font dan Leaflet asli; tile/geocoding serta lokasi
pengguna diisolasi melalui fixture. Screenshot terpisah memakai HTTP lokal dan tile
penyedia sebenarnya melalui koneksi TLS tervalidasi; bytes Leaflet berasal dari paket
1.9.4 identik yang dipin. Ini bukan mockup atau pengujian aplikasi produksi.

Iterasi awal tersimpan di [initial-integration.tap](floating-layout/verification/initial-integration.tap):
dua kegagalan berasal dari asumsi tes kolom tetap yang sudah tidak berlaku, dan dua lainnya
menangkap Search menutupi ruang sheet/popup LRT di 568×320. Perbaikan mengembalikan Search
ke kolom header landscape, tanpa mengecilkan area isi popup atau menghapus pemeriksaannya.

[Iterasi sebelum perbaikan tablet](floating-layout/verification/pre-tablet-fix.tap) mencatat
153/154 tes layout lulus dan satu kegagalan pemulihan kamera tutorial pada 768 px. Popup
mencoba auto-pan saat ruangnya terhimpit panel kiri dan detail kanan. Perbaikan menahan
auto-pan saat pembaruan ukuran chrome saja, serta menyimpan popup secara inert/tersembunyi
ketika slot auxiliary tablet aktif. Seleksi dan popup Leaflet tetap ada. Uji ulang
[tutorial tiga viewport](floating-layout/verification/tablet-tour.tap) dan
[pergantian panel dengan popup terbuka](floating-layout/verification/selected-popup-panels.tap)
lulus; pengujian tersebut tidak dilonggarkan.

[Regresi lengkap sebelum stabilisasi fixture A01](floating-layout/verification/full-regression-before-a01-fixture.tap)
mencatat 156/156 layout lulus dan 17/18 A01 lulus. Satu snapshot pending-selection menangkap
zoom pecahan `11.0128…` sebelum animasi pembulatan `map.stop()` Leaflet selesai. Tidak ada
panggilan kamera dari toggle. Pengulangan kasus terpisah pada baseline dan kandidat sama-sama
lulus. Fixture kini menyelesaikan snap melalui API publik `setZoom(..., { animate: false })`
sebelum `stop()` dan snapshot, tetap dalam event turn yang sama dan sebelum popup 380 ms.
Assert zoom persis, kamera satu pixel, selection, popup tertutup, dan seluruh state tetap ada.
Hanya fixture tes berubah; `js/map.js` tetap identik. Seluruh 18 A01 dijalankan ulang; suite
layout yang sudah lulus tidak diulang untuk perubahan fixture ini.

Audit navigasi exit **0**. Dua audit data lama (`tools/audit.mjs`, `tools/audit-k01-k10-rail.py`)
masih exit **1**, dengan output **identik baseline**; antara lain benturan identitas,
kelengkapan atribut serta pointer integrasi rail. Tidak diperbaiki dalam scope layout.
Lihat [audits.json](floating-layout/verification/audits.json).

Keterbatasan: belum diuji di perangkat fisik, Safari iOS, pembaca layar, GPS nyata atau
pencarian Nominatim langsung. Keyboard dan rotasi disimulasikan melalui viewport browser;
inset safe area perangkat nyata belum diverifikasi. Ketergantungan CDN/tile/geocoding
online sesuai konfigurasi semula; paket bukan aplikasi offline.

## Screenshot sebelum / sesudah

[Galeri perbandingan interaktif](floating-layout/compare.html) dapat dibuka melalui server
preview lokal. Gambar PNG di bawah dapat langsung dilihat di GitHub. Semua pasangan memakai
viewport, filter Existing dan Koridor 3 yang sama; padding fit rute mengikuti komposisi
panel masing-masing versi, sehingga zoom/kamera gambar tidak dipaksakan identik.

| Viewport | Jaringan sebelum | Jaringan sesudah | Daftar sebelum | Daftar sesudah |
| --- | --- | --- | --- | --- |
| 1440×900 | [PNG](floating-layout/screenshots/before/network-1440.png) | [PNG](floating-layout/screenshots/after/network-1440.png) | [PNG](floating-layout/screenshots/before/stops-1440.png) | [PNG](floating-layout/screenshots/after/stops-1440.png) |
| 1280×720 | [PNG](floating-layout/screenshots/before/network-1280.png) | [PNG](floating-layout/screenshots/after/network-1280.png) | [PNG](floating-layout/screenshots/before/stops-1280.png) | [PNG](floating-layout/screenshots/after/stops-1280.png) |
| 1024×768 | [PNG](floating-layout/screenshots/before/network-1024.png) | [PNG](floating-layout/screenshots/after/network-1024.png) | [PNG](floating-layout/screenshots/before/stops-1024.png) | [PNG](floating-layout/screenshots/after/stops-1024.png) |
| 768×1024 | [PNG](floating-layout/screenshots/before/network-768.png) | [PNG](floating-layout/screenshots/after/network-768.png) | [PNG](floating-layout/screenshots/before/stops-768.png) | [PNG](floating-layout/screenshots/after/stops-768.png) |
| 390×844 | [PNG](floating-layout/screenshots/before/network-390.png) | [PNG](floating-layout/screenshots/after/network-390.png) | [PNG](floating-layout/screenshots/before/stops-390.png) | [PNG](floating-layout/screenshots/after/stops-390.png) |
| 360×800 | [PNG](floating-layout/screenshots/before/network-360.png) | [PNG](floating-layout/screenshots/after/network-360.png) | [PNG](floating-layout/screenshots/before/stops-360.png) | [PNG](floating-layout/screenshots/after/stops-360.png) |

Manifest [sebelum](floating-layout/screenshots/before/manifest.json) dan
[sesudah](floating-layout/screenshots/after/manifest.json) mencatat versi browser, viewport,
SHA sumber, hash PNG, ukuran peta/panel, rute, font, serta error runtime/tile.

## ZIP lengkap dan preview

[Unduh webgis-runtime.zip](floating-layout/webgis-runtime.zip?raw=true) ·
[Metadata dan SHA-256 ZIP](floating-layout/verification/package.json) ·
[Patch perubahan sumber](floating-layout/source.patch)

ZIP merupakan **penggantian penuh runtime statis**, berisi 53 file: `index.html`,
seluruh `assets/`, `css/`, `js/`, `data/`, atribusi/lisensi, `BACA_DULU.md`, dan `SHA256SUMS`.
Tidak diperlukan `node_modules` untuk menjalankan runtime. Jangan mengganti berkas satu per
satu dari potongan kode; gunakan seluruh isi paket pada folder preview kosong.

```sh
unzip webgis-runtime.zip -d webgis-preview
cd webgis-preview
python3 -m http.server 8000
```

Buka **http://localhost:8000/**. Jangan membuka `index.html` melalui `file://`.
Leaflet dari CDN, tile basemap, dan pencarian tempat daring tetap memerlukan internet.
Font PT Sans, ikon, logo, data jaringan dan CSS aplikasi ada dalam paket lokal.
Untuk development dan galeri, checkout branch PR lalu:

```sh
npm ci
npm run dev
# Aplikasi: http://localhost:5173/
# Galeri: http://localhost:5173/docs/floating-layout/compare.html
```

Reproduksi pengujian:

```sh
npm run build:ui
npx playwright install chromium
npm run test:regression
CAPTURE_STAGE=after node tools/capture-floating-layout.mjs
python3 tools/package-floating-layout.py
```

Pada lingkungan dengan Chromium sistem, gunakan
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.
Paket dapat direproduksi dengan script packaging; source.patch hanya memuat perubahan
sumber dan tes akhir (lihat SHA lengkap di hasil terstruktur), tanpa artefak review biner. Tidak ada merge atau deploy.
