# Layout lama dengan zoom objek penuh

Perubahan menggunakan layout stabil dari `main`, commit
`46c3913042934b67712327d566e34c287178845e`. Eksperimen panel floating pada PR #18
tidak menjadi bagian dari runtime ini. Header, panel desktop, PT Sans lokal,
bottom sheet mobile, serta seluruh data transportasi mengikuti versi stabil.

## Perilaku zoom

- Memilih rute menampilkan seluruh extent geometri yang sedang dirender.
- Tidak ada tambahan buffer geografis 4,5–8,5 persen di luar extent rute.
- Langkah zoom 0,1 memungkinkan fit yang lebih rapat daripada pembulatan satu
  tingkat zoom penuh. Langkah tombol zoom tetap menggunakan konfigurasi semula.
- Batas zoom otomatis mengikuti batas basemap. Ruang panel dan kontrol peta
  tetap diperhitungkan; panel desktop tidak dihitung dua kali karena sudah
  berada di luar container peta pada layout stabil.
- Tombol Pusatkan menggunakan extent yang sama tanpa menghapus pilihan rute,
  jenis layanan, status, arah, atau URL.
- Perhitungan extent menunggu ukuran peta, panel, dan animasi stabil, kemudian
  memperbarui ukuran Leaflet sebelum fit. Memilih stasiun lain atau menggeser
  peta membatalkan permintaan fit yang belum dijalankan.
- Navigasi stasiun tetap memakai perilaku engine semula.

## Validasi dan batas pemeriksaan

Pemeriksaan lokal: sintaks JavaScript, build UI, kesamaan CSS hasil build,
whitespace patch, integritas ZIP, dan kesamaan data/aset dengan baseline.
Browser lokal tidak dapat diluncurkan karena Chromium gagal membuat socket
(`Operation not permitted`). Pemeriksaan browser dijalankan melalui CI GitHub;
status workflow pada commit PR adalah sumber hasil terbarunya.

`tools/test-layout-object-zoom.mjs` memeriksa rute BRT Koridor 3, LRT Jakarta,
dan KRL Rangkasbitung pada desktop 1440×900, tablet 768×1024, dan mobile 390×844:
seluruh batas objek terlihat, minimal 90 persen sisi pembatas ruang peta terisi
kecuali sudah mencapai zoom maksimum, serta Pusatkan mempertahankan rute/URL.
Suite layout dan A01 yang sudah ada tetap dijalankan dalam workflow regresi.

Tes startup tutorial menunggu target spotlight siap pada animation frame,
kemudian mempertahankan assertion target yang sama. Ini menggantikan pemeriksaan
yang terlalu dini segera setelah dialog muncul.

Fixture A01 menyelesaikan zoom snap Leaflet secara sinkron sebelum mengambil
snapshot pending-selection. Popup tetap belum dibuka pada event turn yang sama;
assertion zoom persis, kamera, seleksi, serta state lainnya tidak dilonggarkan.

## Paket lengkap dan preview

[Unduh ZIP runtime lengkap](object-zoom/webgis-layout-lama-zoom-penuh.zip?raw=true)
dan [metadata beserta SHA-256](object-zoom/package.json).

Ekstrak ZIP ke folder kosong, jalankan `python3 -m http.server 8000`, lalu buka
`http://localhost:8000/`. Font, ikon, CSS, JavaScript dan data ada dalam paket;
Leaflet CDN, tile basemap dan geocoding tetap memerlukan internet.

Reproduksi paket pada checkout sumber:

```sh
npm ci
npm run build:ui
python3 tools/package-object-zoom.py
```

Script packaging memeriksa isi ZIP setelah dibuat. Paket adalah penggantian penuh,
bukan sekumpulan potongan kode. Penerapan ke hosting dilakukan sesudah review.
