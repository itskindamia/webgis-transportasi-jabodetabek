# D3 · Popup halte dan stasiun desktop

D3 bertumpuk di atas Draft PR #33 pada `feat/d1-desktop-webgis`, dengan baseline `09c4e2c`. Pada desktop, kartu popup Leaflet berukuran 311 px di viewport yang diuji. Nama halte atau stasiun tampil di atas, diikuti badge lin asli, integrasi dari data, serta tautan Google Maps dan Sumber Data. Sebelumnya dan Berikutnya tetap terlihat saat isi perlu digulir.

## Audit dan implementasi

| Berkas | Peran |
| --- | --- |
| `js/map.js` | Renderer dan popup Leaflet yang sudah dipakai. Pemilihan marker/daftar, urutan stasiun, pengalihan, resolver integrasi, dan URL tetap memakai mesin ini. |
| `js/stop-popup-ui.js` | Adapter memakai kembali DOM layanan, tujuan integrasi, dan navigasi. Warna aksen dibaca dari lin aktif. |
| `js/layout-tabler.js` | Ukuran dan padding auto-pan Leaflet mengikuti sel peta, caption, rel kontrol, dan bilah peta dasar. Panel Detail yang ditutup tetap tertutup selama berpindah stasiun di lin yang sama. |
| `css/layout-tabler.css` | Grid D1 tetap menyediakan ruang terpisah untuk Jaringan, peta, dan Detail pada desktop. Sorotan daftar stasiun memakai `aria-current` dari mesin. |
| `css/stop-popup-desktop.css`, `css/lrt-popup.css`, `index.html` | Satu stylesheet desktop untuk seluruh moda menggantikan blok desktop khusus LRT. Gaya dasar dan mobile tetap dimuat. Legacy di `css/legacy-components.css` tetap menyediakan gaya markup lama. |
| `tools/test-layout-desktop-popup-d3.mjs` | Uji browser untuk posisi, aset, navigasi, pergantian lin, permalink, sinkronisasi Detail, serta integrasi dengan ID tujuan eksplisit. |

Prototipe menjadi rujukan untuk hierarki nama, penekanan lin aktif, kelompok integrasi, dan footer dua arah. Aplikasi memakai jangkar popup Leaflet di atas marker dan auto-pan bawaan. Konten operasional dan sumber data mengikuti renderer asli. Halte yang belum memiliki integrasi terisi tetap menampilkan identitas layanan dan navigasi.

## Data integrasi

- `INTEGRASI` menyatakan layanan atau operator. Mesin memprioritaskan `INT_STOP` untuk tujuan dan mendukung `INT_NM` yang sudah tercatat dengan konteks lin atau operator. Relasi, label, dan `INT_STATUS` bersumber dari data WebGIS.
- Di Dukuh Atas Bank Syariah Indonesia (`LRTJB001`), data menyimpan `BRT:BRT010` untuk Halte Dukuh Atas dan `MRT_NS:MRT012` untuk Stasiun Dukuh Atas BNI. Uji D3 mengikuti tautan kedua hingga popup MRT terbuka.
- `INT_STOP` terisi pada 30 dari 54 fitur rail yang memiliki `INTEGRASI`. Sebanyak 23 fitur rail mengandalkan `INT_NM`, dan satu fitur belum punya nama maupun ID tujuan. Pada BRT, 234 dari 370 fitur memiliki kode dan nama integrasi dengan `INT_STOP` kosong. Ini adalah hitungan fitur. Satu fitur dapat memuat beberapa tujuan dan hanya sebagian tujuan bisa memiliki ID.
- Tujuan yang belum dapat dipetakan ke fitur yang sesuai tampil sebagai label informatif. BNI City pada contoh Dukuh Atas tercatat sebagai relasi KA Bandara, sementara fitur BNI City yang tersedia bertipe KRL. Renderer menyembunyikan relasi tanpa nama maupun ID tujuan.

## Screenshot

Screenshot diambil dengan Chromium, data aplikasi, dan tile Esri. Popup memakai zoom 17 agar trase tetap terlihat di sekitar stasiun. Untuk skenario dengan daftar stasiun, tab Daftar stasiun dibuka setelah memilih titik.

Pada 1440 × 900, kartu Cawang berkurang dari 424 × 487 px menjadi 311 × 370 px. Kartu Halim berkurang dari 424 × 382 px menjadi 311 × 280 px. Kartu Dukuh Atas memiliki satu area gulir karena daftar integrasinya lebih panjang.

| Viewport | Skenario | D1.1 | D3 |
| --- | --- | --- | --- |
| 1366 × 768 | Cawang, dua lin dan Detail | [Sebelum](screenshots/before/1366x768-cawang.webp) | [Sesudah](screenshots/after/1366x768-cawang.webp) |
| 1440 × 900 | Lin Bekasi aktif dan daftar stasiun | [Sebelum](screenshots/before/1440x900-lin-bekasi.webp) | [Sesudah](screenshots/after/1440x900-lin-bekasi.webp) |
| 1440 × 900 | Halim dengan Detail tertutup | [Sebelum](screenshots/before/1440x900-halim-tanpa-detail.webp) | [Sesudah](screenshots/after/1440x900-halim-tanpa-detail.webp) |
| 1440 × 900 | Cawang, dua lin dan Detail | [Sebelum](screenshots/before/1440x900-cawang.webp) | [Sesudah](screenshots/after/1440x900-cawang.webp) |
| 1440 × 900 | Dukuh Atas dengan referensi BRT eksplisit | [Sebelum](screenshots/before/1440x900-dukuh-atas.webp) | [Sesudah](screenshots/after/1440x900-dukuh-atas.webp) |
| 1920 × 1080 | Cawang, dua lin dan Detail | [Sebelum](screenshots/before/1920x1080-cawang.webp) | [Sesudah](screenshots/after/1920x1080-cawang.webp) |

## QA

- Tes khusus desktop D3 lulus 7/7, termasuk viewport 1024 × 650 dan ketiga viewport target, pemilihan marker di tepi peta, auto-pan, perpindahan rute, dan navigasi lintas moda.
- Responsive smoke lulus 48/48 pada D1.1 dan D3. Dimensi kartu Cawang, pilihan stasiun, dan tujuan navigasi cocok pada cek tambahan di 390 × 844, 768 × 1024, dan 1023 × 768.
- Build UI, audit navigasi, dan pemeriksaan integritas GeoJSON, aset, `js/map.js`, serta dependensi lulus. Audit runtime data menghasilkan laporan yang sama pada kedua revisi, termasuk duplikasi `STOP_ID` halte BRT dan `GEOM_ID` rute BRT.
