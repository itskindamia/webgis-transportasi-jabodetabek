# Tambahan scope: Ringkasan Koridor

Branch `fix/mobile-ux-refinement`, baseline main
`3946e21011c681a3c6a3cc4d8f8ffc4e4b2b04ae`.
Baseline main terkini disinkronkan ke `19f49e8d50f18dcbb3f19147b3466b295b616f07`.
Saat finalisasi, proses paralel juga mengintegrasikan A01 ke branch PR #7 pada `a320b32`.
Sinkronisasi lokal `8538584` mempertahankan tree yang persis sama dengan integrasi remote itu.
PR #7 saat ini memuat patch A01 yang sudah masuk tersebut; perubahan font di sini tidak
menambahkan perubahan mesin di atasnya. Branch PR #1 tidak diubah oleh pekerjaan font ini.
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
| Identitas | PT Sans; judul 16 px, relasi 12 px, operator 11 px. Nama dan badge tetap dari renderer. |
| Pilihan trase | Teks 12 px, target minimal 44 px, dua pilihan per baris. `is-active`, `aria-pressed`, value dan handler asli dipertahankan. |
| Statistik | Label 12 px, angka 16 px; berjajar saat muat dan membungkus saat sempit, tanpa ellipsis. Kartu statis minimal 36 px; Moda/status 13 px dalam baris 32 px. |
| Panjang BRT | Catatan asli dua arah diberi ukuran 12 px, spacing dan latar yang jelas. Nilai/rumus/teks tidak diubah. |
| Panjang rail | Mempertahankan deskripsi asli masing-masing moda; tidak diberi interpretasi dua arah baru. |
| Referensi/pengalihan | Accordion ditumpuk satu kolom pada panel sempit; judul 13 px, isi 12–13 px; target interaktif minimal 44 px. Klik summary tetap native. |
| Ruang panel | Konten tetap memakai scroll panel yang sudah ada. Tidak menambahkan konten dekoratif atau mengisi sisa ruang putih. |

Perubahan font hanya CSS dan query asset: GeoJSON, statistik, sequence, arah/status,
pengalihan, warna jaringan dan event handler tidak diedit oleh revisi font.
Perbedaan `js/map.js` terhadap main berasal dari integrasi A01 yang sudah ada pada `a320b32`.
Tidak menambahkan `!important`, font atau dependensi.
Cache-busting hanya mengubah query `css/layout-tabler.css` menjadi
`summary-precision-a01-20261107-1`, mengikuti versi asset integrasi remote.

## Revisi font compact terbaru

Baseline revisi font: head PR #7 sebelumnya `3e7ae37`, dengan runtime yang identik dengan
source `e955ef7`. Source font baru: `03704d1`, kini bersama layout precision dan A01
pada tree `a320b32`/`8538584`. Font PT Sans 400/700 tetap dari aset lokal.
Judul dan angka yang sebelumnya 18/20 px kini 16 px; informasi pendukung 12–13 px,
operator dan kategori accordion 11 px. Jarak dan padding dipadatkan kembali.

Kartu statistik adalah informasi statis setinggi 36 px, metadata 32 px. Tombol trase,
close dan summary accordion tetap memiliki target minimal 44 px. Tidak ada bagian data,
catatan, atau kontrol yang disembunyikan. Label dapat membungkus bila perlu.

| Viewport | Tinggi konten K3 sebelumnya | Font compact | Pengurangan tambahan |
| --- | --- | --- | --- |
| 320×568 | 656,6 px | 572,8 px | 12,8% |
| 390×844 | 609,5 px | 539,7 px | 11,4% |
| 768×1024 | 639,8 px | 556,6 px | 13,0% |
| 1366×900 | 638,8 px | 571,8 px | 10,5% |
| 568×320 | 575,9 px | 507,3 px | 11,9% |

Ukuran ini adalah tinggi konten; posisi/tinggi sheet, kamera, dan state tetap.
Inset desktop 20 px dari main terbaru dipertahankan, sehingga teks membutuhkan satu
baris tambahan dibanding pengukuran 555,6 px sebelum sinkronisasi layout precision.
Tidak ditemukan clipping atau overflow pada lima viewport pengukuran.
[Pengukuran terbaru](summary-refinement/compact-font/verification/parallel-sync/comparison-current.json).

Validasi baseline terintegrasi terkini:

- [Layout precision QA](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/42340960726)
  sukses, menjalankan suite layout yang kini mencakup 112 kasus/subkasus.
- [Release regression QA](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/42340956222)
  sukses menjalankan `npm run test:regression` (layout 112 + A01 18).
- [A01 lokal](summary-refinement/compact-font/verification/a01-current-branch.tap): **18/18 lulus**,
  0 gagal/dilewati. Validasi sumber CI dan tree lokal identik dicatat pada
  [metadata](summary-refinement/compact-font/verification/parallel-sync/current-results.json).
- Empat GeoJSON tetap identik. Hash mesin cocok dengan patch A01 yang sudah terintegrasi,
  bukan dinyatakan identik dengan mesin main sebelum A01.

Sebelum update paralel, font compact sudah lulus 76/76 lokal dan 3/3 integrasi;
log tersebut tetap disimpan sebagai bukti tahap awal. Pengujian layout lokal duplikat
dihentikan setelah CI pada tree identik sukses; log parsial tidak diklaim sebagai tes lengkap.

| Skenario | Sebelum penyesuaian font | Sesudah |
| --- | --- | --- |
| K1 desktop | [PNG](summary-refinement/compact/screenshots/after/brt_01-1366.png) | [PNG](summary-refinement/compact-font/screenshots/current-branch/brt_01-1366.png) |
| K3 desktop | [PNG](summary-refinement/compact/screenshots/after/brt_03-1366.png) | [PNG](summary-refinement/compact-font/screenshots/current-branch/brt_03-1366.png) |
| K3 mobile | [PNG](summary-refinement/compact/screenshots/after/brt_03-390.png) | [PNG](summary-refinement/compact-font/screenshots/current-branch/brt_03-390.png) |
| K9 mobile | [PNG](summary-refinement/compact/screenshots/after/brt_09-390.png) | [PNG](summary-refinement/compact-font/screenshots/current-branch/brt_09-390.png) |
| MRT desktop | [PNG](summary-refinement/compact/screenshots/after/mrt_ns-1366.png) | [PNG](summary-refinement/compact-font/screenshots/current-branch/mrt_ns-1366.png) |
| LRT Jabodebek mobile | [PNG](summary-refinement/compact/screenshots/after/lrt_jb_bk-390.png) | [PNG](summary-refinement/compact-font/screenshots/current-branch/lrt_jb_bk-390.png) |

Screenshot sebelum berasal dari pengambilan browser aktual pada revisi sebelumnya;
runtime-nya identik dengan baseline `3e7ae37`. Screenshot sesudah terkini diambil ulang
dari source gabungan `8538584` (tree identik `a320b32`), dengan tile provider aktual.
Tidak ada merge/deployment ke main oleh pekerjaan font ini.

## Revisi compact pertama

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
