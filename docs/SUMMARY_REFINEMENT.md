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
| Identitas | PT Sans; judul 18 px, relasi 13 px, operator 12 px. Nama dan badge tetap dari renderer. |
| Pilihan trase | Teks 12–13 px, target minimal 44 px, dua pilihan per baris. `is-active`, `aria-pressed`, value dan handler asli dipertahankan. |
| Statistik | Label 12 px, angka 20 px; berjajar saat muat dan membungkus saat sempit, tanpa ellipsis. Kartu mengikuti konten, minimal 44 px; Moda/status 14 px dalam baris 36 px. |
| Panjang BRT | Catatan asli dua arah diberi ukuran 12 px, spacing dan latar yang jelas. Nilai/rumus/teks tidak diubah. |
| Panjang rail | Mempertahankan deskripsi asli masing-masing moda; tidak diberi interpretasi dua arah baru. |
| Referensi/pengalihan | Accordion ditumpuk satu kolom pada panel sempit; judul 14 px, isi 13 px; klik summary tetap native. |
| Ruang panel | Konten tetap memakai scroll panel yang sudah ada. Tidak menambahkan konten dekoratif atau mengisi sisa ruang putih. |

Tidak ada perubahan `js/map.js`, GeoJSON, statistik, sequence, arah/status, pengalihan,
warna jaringan, maupun event handler. Tidak menambahkan `!important`, font atau dependensi.
Cache-busting hanya mengubah query `css/layout-tabler.css` menjadi
`mobile-ux-summary-20261107-2`; ini juga menjaga perubahan index independen dari versi
engine pada PR A01.

## Revisi compact terbaru

Baseline revisi ini adalah head PR #7 sebelumnya, `0daafe3`; source CSS compact pada
`e955ef7`. Jarak judul, kontrol, hint dan accordion dirapatkan. Label/angka dapat membungkus
tanpa terpotong; target sentuh pilihan trase tetap ≥44 px. Metadata Moda/Status berkurang
dari 69 menjadi 36 px. Kartu statistik sederhana berkurang dari 76,8 menjadi 44 px;
nilai panjang yang perlu dua baris memakai 56,2 px. Tidak ada data/kontrol yang disembunyikan.

| Viewport | Tinggi konten K3 sebelum | Sesudah | Pengurangan |
| --- | --- | --- | --- |
| 320×568 | 841,2 px | 656,6 px | 21,9% |
| 390×844 | 784,0 px | 609,5 px | 22,3% |
| 768×1024 | 823,2 px | 639,8 px | 22,3% |
| 1366×900 | 822,2 px | 638,8 px | 22,3% |
| 568×320 | 748,0 px | 575,9 px | 23,0% |

Ini pengukuran tinggi konten, bukan pengurangan tinggi sheet atau perubahan kamera.
Nilai, nama dan catatan asli tetap ada. Snapshot metadata, overflow dan accordion tetap
diuji. [Pengukuran sebelum/sesudah](summary-refinement/compact/verification/comparison.json).
Log regresi compact: [final-layout.tap](summary-refinement/compact/verification/final-layout.tap).
Hasil akhir compact: **76/76 lulus, 0 gagal/dilewati** (458.335,90 ms), serta **3/3**
tes integrasi dengan A01. Penggabungan lokal bersih; branch A01 dan main tidak diubah.
[Log integrasi compact](summary-refinement/compact/verification/integration.tap).

Screenshot compact terbaru, dibandingkan langsung dengan versi PR #7 sebelumnya:

| Skenario | Sebelum compact | Sesudah compact |
| --- | --- | --- |
| K1 desktop | [PNG](summary-refinement/compact/screenshots/before/brt_01-1366.png) | [PNG](summary-refinement/compact/screenshots/after/brt_01-1366.png) |
| K3 desktop | [PNG](summary-refinement/compact/screenshots/before/brt_03-1366.png) | [PNG](summary-refinement/compact/screenshots/after/brt_03-1366.png) |
| K3 mobile | [PNG](summary-refinement/compact/screenshots/before/brt_03-390.png) | [PNG](summary-refinement/compact/screenshots/after/brt_03-390.png) |
| K9 mobile | [PNG](summary-refinement/compact/screenshots/before/brt_09-390.png) | [PNG](summary-refinement/compact/screenshots/after/brt_09-390.png) |
| MRT desktop | [PNG](summary-refinement/compact/screenshots/before/mrt_ns-1366.png) | [PNG](summary-refinement/compact/screenshots/after/mrt_ns-1366.png) |
| LRT Jabodebek mobile | [PNG](summary-refinement/compact/screenshots/before/lrt_jb_bk-390.png) | [PNG](summary-refinement/compact/screenshots/after/lrt_jb_bk-390.png) |

## Pengujian tahap awal

Baseline tahap awal: **62/62** tes layout/font/LRT pada main lulus. Kandidat sebelum compact:
**76/76 lulus, 0 gagal, 0 dilewati** (605.852,31 ms), termasuk 14 skenario tambahan:

- BRT Koridor 1, 3, 9; MRT_NS, LRT Jakarta S, LRT Jabodebek BK dan KRL Tanjung Priok.
- Desktop 1366×900 dan mobile 390×844.
- Seluruh teks metadata, nilai statistik dan deskripsi sumber dibandingkan dengan snapshot DOM baseline.
- Ukuran tombol, target sentuh, label statistik tidak terpotong dan angka muat dalam kartu.
- Kondisi CURRENT/REGULAR dan geometri FULL/DIRECTION, termasuk tampilan aktif/aria.
- Buka/tutup accordion sumber dan pengalihan tanpa mengubah filter/konteks/URL/seleksi/kamera.
- Regresi layout lama tetap mencakup delapan viewport, popup LRT, keyboard, tour dan pencarian.

Perintah akhir: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:layout`.
Log otoritatif: [final-verified.tap](summary-refinement/verification/final-verified.tap).
Pemeriksaan gabungan lokal dengan A01: **3/3 lulus**, tanpa konflik penggabungan atau
perubahan main; [log](summary-refinement/verification/integration.tap) dan
[metadata](summary-refinement/verification/integration.json).
Snapshot: [baseline-summary.json](summary-refinement/verification/baseline-summary.json).
Percobaan awal yang digantikan disimpan dalam `verification/iterations`, dengan penjelasan
kesalahan asumsi tes panjang rail; bukan perubahan matematika aplikasi.

Audit navigasi exit 0. Dua audit data lama exit 1 dengan output sebelum/sesudah identik.
[Audit pembanding](summary-refinement/verification/audits.json) dan
[integritas](summary-refinement/verification/protected-integrity.json) membuktikan seluruh
delapan berkas terlindungi tetap sama, termasuk mesin map.js dan empat GeoJSON.

## Screenshot tahap awal (sebelum revisi compact)

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
`tools/test-layout-summary.mjs`, `tools/capture-review-panels.mjs`,
`tools/measure-summary.mjs`, serta laporan/artefak ini.
