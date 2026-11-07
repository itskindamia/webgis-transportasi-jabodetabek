# Mobile UX refinement & UI consistency

Branch: `fix/mobile-ux-refinement`, berbasis `main` produksi
`2900440884f9887343a2e440cb8b4479e2d8f2b9` (PR #3 dan #4 sudah tergabung).
Backup remote: `backup/production-before-mobile-ux-2900440`, menunjuk SHA produksi tersebut.
Commit implementasi bertahap: `14698c4`, kemudian `7794501`.

## Perubahan yang disiapkan

| Area | Perubahan | Batas yang dipertahankan |
| --- | --- | --- |
| Jaringan mobile | Konten flex mengikuti ukuran intrinsik, dengan batas viewport dan scroll internal; header/footer tidak menyusut. Spacing dipadatkan. Pada lebar ≥360 px, lima moda memakai satu baris dengan target minimal 44 px; 320 px memakai dua baris. | Native select, filter, nilai moda/status/rute, handler mesin, safe area, dan posisi kamera. |
| Perbandingan rute | Override scoped mengembalikan kontrol mobile ketika mesin menghapus atribut `hidden`. CSS legacy sebelumnya selalu menyembunyikannya. | Pemilihan dan penggambaran rute pembanding tetap melalui handler asli. |
| Detail mobile | Label posisi menjadi **Mini / Sedang / Penuh**; state `collapsed / half / expanded` dan ID kontrol tetap. Header dipadatkan; daftar memakai satu area scroll konten. | Seleksi, tab, URL, filter, popup dan mekanisme fokus saat memilih halte. Tidak ada gesture baru. |
| Daftar halte | Baris sederhana desktop 40 px, mobile/tablet 44 px. Grid dan badge dapat membungkus; nama panjang tampil utuh dan memiliki `title`. Baris kompleks boleh lebih tinggi. | Seluruh nomor, nama, warna lin, arah, terminus/transit/status, aria-current, handler dan urutan. |
| Nama rute | Native select diberi `title`, setiap option diberi `title`, dan teks nama lengkap ditampilkan di bawahnya melalui `aria-describedby`. Chip peta tetap compact dengan `title` lengkap. | Value/select/event handler asli; tidak memperlebar sidebar. |
| Cara Menggunakan | Filter build kini menyertakan `info-guide`; hasil CSS dibangun ulang. Lima kartu bernomor, dua kolom desktop/tablet dan satu kolom mobile. Modal desktop maksimal 760 px agar kartu terbaca. Microcopy disesuaikan dengan Detail, navigasi bawah, Cari, dan konteks lin popup. | Guided tour interaktif dan alur onboarding tetap. |
| Font/cache | PT Sans lokal 400/700 dipertahankan. Versi query asset aplikasi: `mobile-ux-20261107-1`. | Tidak ada font atau library baru; font label tile eksternal tidak disentuh. |

## Penyebab styling tutorial hilang

HTML dan aturan sumber `.info-guide-*` masih tersedia. Regex pemilih komponen pada
`tools/build-tabler-css.mjs` hanya mengizinkan `info-modal/status/release/changelog`, sehingga
aturan tutorial hilang dari hasil build. Regex sumber diperbaiki, bukan hanya output CSS.
Hasil `legacy-components.css`: metrik `legacyRules` builder (blok tingkat atas) naik
1.351 → **1.364** (+13), 175.733 → **176.840 byte**. Diff AST menambah 14 aturan
selector `info-guide`, termasuk di media query; tidak menghapus aturan lama.
Build dapat diarahkan ke direktori sementara melalui `TABLER_OUTPUT_DIR`, sehingga tes dapat
membandingkan output yang dibangun ulang dengan file yang dikomit tanpa menimpanya.
Tidak ada penambahan `!important` atau dependensi.

## Perbandingan terukur

Pengukuran dari browser Chromium dan manifest screenshot, dengan rute/filter/viewport yang sama.

| Ukuran | Sebelum | Sesudah | Interpretasi |
| --- | --- | --- | --- |
| Jaringan 390×844 | 496,50 px | 475,69 px | Lebih pendek 20,81 px, sekaligus menampilkan kembali tombol Bandingkan rute. Tidak ada filler flex pada konten. |
| Jaringan 320×568 | 372 px | 372 px | Mencapai batas viewport; konten menggulir, header/footer tetap dapat dijangkau. |
| Baris sederhana desktop | 44 px | 40 px | Jarak antarpangkal baris juga 44 → 40 px. |
| Baris sederhana mobile/tablet | 44 px | 44 px | Target sentuh dipertahankan. |
| Detail Sedang 390×844 | 340 px | 340 px | Header lebih compact memberi ruang tambahan untuk konten, tanpa memperbesar sheet. |
| Detail Penuh 390×844 | 648 px | 648 px | Daftar dan informasi tetap dapat digulir. |
| Kartu tutorial desktop/mobile | Teks biasa | Grid 2 / 1 kolom | Lima kartu, tanpa teks terpotong. |

## Audit sequence Koridor 1 — temuan terpisah, tanpa perubahan

| Halte | STOP_ID | GEOM_ID | SEQ_MAP | SEQ_A_MAP | SEQ_B_MAP | DIR_MAP | STATUS / STOP_VAR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ASEAN | BRT002 | BRT002_REG_A | BRT_01:02 | BRT_01:02 | null | BRT_01:Kota | Eksisting / BASE |
| Kejaksaan Agung | BRT003 | BRT003_REG_B | BRT_01:02 | null | BRT_01:19 | BRT_01:Blok M | Eksisting / BASE |

Keduanya memiliki `ROUTES=BRT_01`. Pada tampilan **FULL / Semua trase**,
`getDisplayedStopSequenceRawForFeature()` sengaja memakai sequence kanonis `SEQ_MAP`.
Itulah sebabnya UI menampilkan 02 dua kali. Nilai arah A/B memang berbeda, tetapi tampilan
FULL tidak memakai field arah sebagai penomoran ulang. Ini merupakan benturan sequence
kanonis pada sumber yang terlihat melalui kebijakan FULL yang sudah ada, bukan akibat CSS.

`audit-navigation.mjs` lulus karena pemeriksaan itu mengabaikan benturan kanonis apabila field
directional tersedia. Kelulusannya tidak membuktikan penomoran FULL bebas benturan.
Rekomendasi: review konvensi sequence kanonis versus per-arah dalam pekerjaan data terpisah,
dengan persetujuan pemilik jaringan. Tidak ada renumber, fallback baru, atau perubahan mesin
pada PR ini. Bukti atribut: [sequence-audit.json](mobile-ux-refinement/verification/sequence-audit.json).

Damai (`BRT054_REG`) dan Jelambar (`BRT055_REG`) melayani **Koridor 3 dan 8**.
Tes memeriksa kedua badge dan batas visual barisnya pada daftar K3. Snapshot baseline K1/K3
membandingkan seluruh identitas, urutan, label, warna badge lin, dan badge peran/status/arah.

## Pengujian

Perintah reproduksi:

```sh
npm ci
npx playwright install chromium
npm run build:ui
npm run test:layout
node tools/audit-navigation.mjs
node tools/audit.mjs
python3 tools/audit-k01-k10-rail.py
npm run capture:mobile-ux
```

Lingkungan pengujian ini menggunakan Chromium sistem melalui
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.
Sebelum: **50/50** tes regresi lulus. Kandidat akhir: **62/62 lulus, 0 gagal, 0 dilewati**
(452.887,52 ms), pada source commit `779450176fadc4bca314423ea86a3be6fa26fb3d`. Log disimpan dalam
[final-tests.tap](mobile-ux-refinement/verification/final-tests.tap).
Terdapat 12 tes baru: build guide reproducible; delapan viewport; seluruh metadata baris K1/K3;
state Mini/Sedang/Penuh; dan keterjangkauan semua moda/status/perbandingan rute.

Viewport: **320×568, 360×800, 390×844, 768×1024, 1366×900, 1600×1000,
568×320, 844×390**. Cakupan termasuk onboarding, K1/K3, Velodrome/Cawang multi-lin,
navigasi/pencarian/integrasi, popup, guided tour, landscape, simulasi viewport keyboard,
overflow, tombol close, state URL/seleksi, kamera, identitas layer, dan font lokal.
Overlay mobile/tablet tidak memanggil `invalidateSize()` saat ukuran peta tetap; panel tidak
membuat ulang layer/marker. Ukuran peta desktop mengikuti container melalui mekanisme lama.

Tes integrasi deterministik mengisolasi tile/geocoding eksternal melalui fixture, tetapi memakai
aplikasi, Leaflet, GeoJSON dan font asli. Screenshot terpisah memakai server HTTP lokal dan
tile provider aktual melalui proxy TLS yang tervalidasi. Tidak ada gambar mockup.

| Pemeriksaan | Baseline | Kandidat |
| --- | --- | --- |
| `audit-navigation.mjs` | exit 0 | exit 0, output identik |
| `audit.mjs` | exit 1 | exit 1, output identik |
| `audit-k01-k10-rail.py` | exit 1 | exit 1, output identik |
| Hash delapan file terlindungi | Sesuai manifest | Seluruhnya identik |

Dua audit yang sudah gagal mencatat benturan STOP_ID, kelengkapan atribut K9/GlobalID dan
pointer integrasi rail. Tidak diperbaiki dalam scope UI. Output lengkap sebelum/sesudah ada di
[audits.json](mobile-ux-refinement/verification/audits.json); hash di
[integrity.json](mobile-ux-refinement/verification/integrity.json).
Iterasi awal sempat menangkap kontrol perbandingan mobile yang tertutup CSS legacy
(61/62), lalu diperbaiki; log [initial-tests.tap](mobile-ux-refinement/verification/initial-tests.tap)
dipertahankan agar berbeda jelas dari kegagalan audit data baseline.

## Screenshot aktual sebelum/sesudah

Manifest masing-masing menyimpan SHA sumber, versi browser, ukuran peta/container, identitas
rute, tinggi panel, baris, hash PNG, serta kegagalan runtime/tile.

| Skenario | Sebelum | Sesudah |
| --- | --- | --- |
| Sidebar desktop | [PNG](mobile-ux-refinement/screenshots/before/desktop-sidebar.png) | [PNG](mobile-ux-refinement/screenshots/after/desktop-sidebar.png) |
| Daftar K3 desktop | [PNG](mobile-ux-refinement/screenshots/before/desktop-k3-list.png) | [PNG](mobile-ux-refinement/screenshots/after/desktop-k3-list.png) |
| Nama koridor panjang 1600 | [PNG](mobile-ux-refinement/screenshots/before/desktop-long-route.png) | [PNG](mobile-ux-refinement/screenshots/after/desktop-long-route.png) |
| Tablet 768 | [PNG](mobile-ux-refinement/screenshots/before/tablet-k3-list.png) | [PNG](mobile-ux-refinement/screenshots/after/tablet-k3-list.png) |
| Jaringan 320 | [PNG](mobile-ux-refinement/screenshots/before/mobile-network-320.png) | [PNG](mobile-ux-refinement/screenshots/after/mobile-network-320.png) |
| Daftar 360 | [PNG](mobile-ux-refinement/screenshots/before/mobile-list-360.png) | [PNG](mobile-ux-refinement/screenshots/after/mobile-list-360.png) |
| Jaringan 390 | [PNG](mobile-ux-refinement/screenshots/before/mobile-network.png) | [PNG](mobile-ux-refinement/screenshots/after/mobile-network.png) |
| Detail daftar | [PNG](mobile-ux-refinement/screenshots/before/mobile-detail-list.png) | [PNG](mobile-ux-refinement/screenshots/after/mobile-detail-list.png) |
| Detail ringkasan | [PNG](mobile-ux-refinement/screenshots/before/mobile-detail-summary.png) | [PNG](mobile-ux-refinement/screenshots/after/mobile-detail-summary.png) |
| Detail Penuh | [PNG](mobile-ux-refinement/screenshots/before/mobile-detail-full.png) | [PNG](mobile-ux-refinement/screenshots/after/mobile-detail-full.png) |
| Tutorial desktop | [PNG](mobile-ux-refinement/screenshots/before/guide-desktop.png) | [PNG](mobile-ux-refinement/screenshots/after/guide-desktop.png) |
| Tutorial mobile | [PNG](mobile-ux-refinement/screenshots/before/guide-mobile.png) | [PNG](mobile-ux-refinement/screenshots/after/guide-mobile.png) |
| Landscape 568 | [PNG](mobile-ux-refinement/screenshots/before/landscape-568.png) | [PNG](mobile-ux-refinement/screenshots/after/landscape-568.png) |
| Landscape 844 | [PNG](mobile-ux-refinement/screenshots/before/landscape-844.png) | [PNG](mobile-ux-refinement/screenshots/after/landscape-844.png) |

## File dan batas perubahan

- `css/layout-tabler.css`: spacing, sizing sheet, daftar, nama lengkap, kartu tutorial dan modal.
- `css/legacy-components.css`: hasil build yang kini memuat komponen tutorial.
- `index.html`: teks nama lengkap, microcopy dan versi asset.
- `js/layout-tabler.js`: label Mini dan sinkronisasi akses nama lengkap; tidak mengubah handler transportasi.
- `tools/build-tabler-css.mjs`: selector guide dan output build sementara.
- `tools/test-layout-refinement.mjs`: regresi build/interaksi/visual terukur.
- `tools/capture-mobile-ux.mjs`, `package.json`: pengambilan screenshot yang dapat diulang.
- `tools/smoke-live.mjs`: verifikasi produksi diperluas untuk sheet, K3, label dan tutorial.
- `docs/mobile-ux-refinement/`: baseline, hasil pengujian, audit dan 28 PNG sebelum/sesudah.

Tidak ada perubahan GeoJSON, `js/map.js`, `js/layout-concept.js`, `css/style.css`,
`css/layout-concept.css`, dependensi/lockfile, database, atau branch A01. Semua 87 hook DOM
yang dilindungi tetap tersedia. Pekerjaan A01/A02 tidak digabungkan.

## Publikasi dan keterbatasan

Kandidat harus melewati tes akhir, review diff dan verifikasi main/backup sebelum merge.
Status produksi baru hanya dinyatakan sesudah workflow Pages sukses dan smoke browser
memastikan byte CSS/JS/font/empat GeoJSON produksi sesuai kandidat, tanpa HTTP 404 atau
error JavaScript. Script smoke juga memeriksa LRT Jakarta/Jabodebek, konteks multi-lin,
navigasi, landscape, panel Jaringan/Detail, nama penuh, badge K3 dan kartu tutorial.
Bukti pascapublikasi dicatat pada percakapan PR dan artefak verifikasi terpisah agar laporan
SHA deployment tidak memicu deployment baru hanya untuk memperbarui dokumentasi.

Belum diuji pada perangkat fisik atau Safari iOS. Keyboard diuji melalui perubahan viewport
otomatis; safe area diperiksa pada CSS dan viewport browser tanpa inset perangkat nyata. Native select/title
dapat dirender berbeda menurut OS; teks nama penuh tersedia tanpa bergantung pada hover.
Performa yang diperiksa berupa stabilitas layer/listener/resize dan interaksi, bukan benchmark
FPS atau jaminan kecepatan pada seluruh perangkat. Benturan sequence/data baseline tetap
ada dan memerlukan review terpisah.
