# Tambahan scope: Ringkasan Koridor

Branch `fix/mobile-ux-refinement`, baseline main
`3946e21011c681a3c6a3cc4d8f8ffc4e4b2b04ae`.
Kelanjutan Mobile UX Refinement & UI Consistency pada PR #5, bukan redesign panel baru.
PR #5 sudah merged sebelum scope tambahan diterima, sehingga perubahan dilanjutkan pada
branch yang sama melalui PR lanjutan yang menautkan PR #5. Tidak ada merge/deployment tahap ini.

## Audit dan perubahan

Struktur renderer sudah memiliki identitas, Kondisi Trase, Tampilan Trase, statistik,
Sumber & Dasar Data dan Pengalihan Sementara. Catatan estimasi panjang dua arah pada BRT
juga sudah tersedia. Masalah utama berasal dari ukuran teks legacy dan baris statistik
horizontal dengan label ellipsis. CSS Tabler memperbesar target sentuh, tetapi ukuran
teks desktop dan hierarki statistik belum diseragamkan.

| Komponen | Perbaikan |
| --- | --- |
| Identitas | PT Sans; judul 18 px, relasi 14 px, operator 12 px. Nama dan badge tetap dari renderer. |
| Pilihan trase | Teks 12–13 px, target minimal 44 px, dua pilihan per baris. `is-active`, `aria-pressed`, value dan handler asli dipertahankan. |
| Statistik | Label 12 px, angka 20 px; label di atas angka sehingga Panjang tidak menjadi “P…”. Kartu mengikuti tinggi konten, tanpa tinggi baris legacy. Moda/status 14 px. |
| Panjang BRT | Catatan asli dua arah diberi ukuran 12 px, spacing dan latar yang jelas. Nilai/rumus/teks tidak diubah. |
| Panjang rail | Mempertahankan deskripsi asli masing-masing moda; tidak diberi interpretasi dua arah baru. |
| Referensi/pengalihan | Accordion ditumpuk satu kolom pada panel sempit; judul 14 px, isi 13 px; klik summary tetap native. |
| Ruang panel | Konten tetap memakai scroll panel yang sudah ada. Tidak menambahkan konten dekoratif atau mengisi sisa ruang putih. |

Tidak ada perubahan `js/map.js`, GeoJSON, statistik, sequence, arah/status, pengalihan,
warna jaringan, maupun event handler. Tidak menambahkan `!important`, font atau dependensi.
Cache-busting hanya mengubah query `css/layout-tabler.css` menjadi
`mobile-ux-summary-20261107-1`; ini juga menjaga perubahan index independen dari versi
engine pada PR A01.

## Pengujian

Baseline: 62 tes layout/font/LRT pada main lulus. Tambahan 14 skenario memeriksa:

- BRT Koridor 1, 3, 9; MRT_NS, LRT Jakarta S, LRT Jabodebek BK dan KRL Tanjung Priok.
- Desktop 1366×900 dan mobile 390×844.
- Seluruh teks metadata, nilai statistik dan deskripsi sumber dibandingkan dengan snapshot DOM baseline.
- Ukuran tombol, target sentuh, label statistik tidak terpotong dan angka muat dalam kartu.
- Kondisi CURRENT/REGULAR dan geometri FULL/DIRECTION, termasuk tampilan aktif/aria.
- Buka/tutup accordion sumber dan pengalihan tanpa mengubah filter/konteks/URL/seleksi/kamera.
- Regresi layout lama tetap mencakup delapan viewport, popup LRT, keyboard, tour dan pencarian.

Perintah akhir: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:layout`.
Log otoritatif: [final-verified.tap](summary-refinement/verification/final-verified.tap).
Snapshot: [baseline-summary.json](summary-refinement/verification/baseline-summary.json).
Percobaan awal yang digantikan disimpan dalam `verification/iterations`, dengan penjelasan
kesalahan asumsi tes panjang rail; bukan perubahan matematika aplikasi.

Audit navigasi exit 0. Dua audit data lama exit 1 dengan output sebelum/sesudah identik.
[Audit pembanding](summary-refinement/verification/audits.json) dan
[integritas](summary-refinement/verification/protected-integrity.json) membuktikan seluruh
delapan berkas terlindungi tetap sama, termasuk mesin map.js dan empat GeoJSON.

## Screenshot browser aktual

Server lokal, Leaflet serta font lokal asli, tile provider aktual melalui proxy TLS.
Manifest menyimpan SHA sumber, versi Chromium, ukuran peta/panel dan hash PNG; bukan mockup.

| Skenario | Sebelum | Sesudah |
| --- | --- | --- |
| K1 desktop | [PNG](summary-refinement/screenshots/before/brt_01-1366.png) | [PNG](summary-refinement/screenshots/after/brt_01-1366.png) |
| K3 desktop | [PNG](summary-refinement/screenshots/before/brt_03-1366.png) | [PNG](summary-refinement/screenshots/after/brt_03-1366.png) |
| K3 mobile | [PNG](summary-refinement/screenshots/before/brt_03-390.png) | [PNG](summary-refinement/screenshots/after/brt_03-390.png) |
| K9 mobile | [PNG](summary-refinement/screenshots/before/brt_09-390.png) | [PNG](summary-refinement/screenshots/after/brt_09-390.png) |
| MRT desktop | [PNG](summary-refinement/screenshots/before/mrt_ns-1366.png) | [PNG](summary-refinement/screenshots/after/mrt_ns-1366.png) |
| LRT Jabodebek mobile | [PNG](summary-refinement/screenshots/before/lrt_jb_bk-390.png) | [PNG](summary-refinement/screenshots/after/lrt_jb_bk-390.png) |

Tangkapan sesudah berasal dari commit CSS `f8cf931`; commit berikutnya hanya mempersempit
query cache asset dan memperbaiki assertion rail tanpa mengubah tampilan.
Tidak diuji pada perangkat fisik atau Safari iOS. Panel panjang tetap memerlukan scrolling
untuk mencapai sumber/pengalihan, terutama pada posisi Sedang. Main/live tidak diubah.

File implementasi: `css/layout-tabler.css`, satu query stylesheet dalam `index.html`,
`tools/test-layout-summary.mjs`, `tools/capture-review-panels.mjs`, serta laporan/artefak ini.
