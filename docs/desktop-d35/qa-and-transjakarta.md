# D3.5 · Integrasi, badge Transjakarta, dan verifikasi

Popup desktop memakai heading grup operator asli. Tiga tujuan pertama mengikuti urutan data dan menampilkan badge lin atau koridor di kanan nama. Tombol jumlah tujuan tambahan membuka tab Terpilih pada Panel kanan. Semua tujuan tetap berada di markup yang dibaca visualisasi D4. Panel menampilkan seluruh tujuan, termasuk relasi yang hanya dapat ditampilkan sebagai informasi. Mobile dan tablet mempertahankan daftar lengkap.

## Inventaris jaringan

`data/brt_route.geojson` menyimpan 59 fitur geometri untuk 19 ID unik. Seluruh fitur memiliki `MODE=BRT` dan `CLASS=Koridor Utama`. `data/rail_route.geojson` tidak berisi rute Transjakarta. Pemeriksaan ID, `LINE`, `MODE`, `CLASS`, dan `STATUS` membedakan dua kelompok di WebGIS.

| Identitas di WebGIS | Kode | Penerapan |
| --- | --- | --- |
| Koridor utama berstatus Eksisting | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 | Lingkaran warna rute WebGIS dengan kode di tengah. |
| Koridor 15–19 berstatus Rencana pada data sumber | 15, 16, 17, 18, 19 | Badge lokal konsisten dengan warna jaringan WebGIS serta penanda status yang sudah ditampilkan aplikasi. |
| BRT tambahan pada daftar resmi | 3F, 10H sebagai contoh | Fixture visual saja. Dataset WebGIS saat ini tidak mempunyai ID rute BRT alfanumerik. |
| Angkutan Pengumpan | 1A sebagai contoh | Fixture visual saja. Dataset juga belum memiliki rute non-BRT, Mikrotrans, atau Transjabodetabek beridentitas Transjakarta. |

## Referensi visual dan penggunaan aset

Daftar resmi menggolongkan `3F` dan `10H` sebagai BRT dan `1A` sebagai Angkutan Pengumpan. Kedua daftar memakai komponen `.nomor` yang sama dengan warna masing-masing rute. Stylesheet publik menunjukkan lingkaran 44 × 44 px, kode 0,75 rem yang dipusatkan, dan warna latar per rute. Pemeriksaan ini menggunakan halaman dan stylesheet sebagai referensi visual. [Rute](https://transjakarta.co.id/rute) · [BRT](https://transjakarta.co.id/layanan/brt) · [Angkutan Pengumpan](https://transjakarta.co.id/layanan/angkutan-pengumpan) · [Stylesheet resmi](https://transjakarta.co.id/aset/kustom.css)

Renderer lokal memakai teks PT Sans dalam lingkaran yang sudah ada. Ukuran kode menyesuaikan diameter dan panjang kode supaya tetap terbaca pada badge kecil. Warna latar memakai `COLOR` WebGIS agar konsisten dengan trase dan legenda. Kode memilih tinta gelap atau putih berdasarkan luminans latar. `buildBrtBadgeLabel()` dipakai oleh badge rute utama dan versi daftar halte, termasuk pada salinan Panel. Badge lokal adalah representasi WebGIS.

Aset operator `assets/logos/transjakarta.svg` sudah tersedia sejak `c34bc49` dan digunakan pada versi produksi sebelum D3.5. Repository tidak mencatat izin redistribusi terpisah untuk logo operator tersebut. D3.5 menggunakan file lokal yang sama. Tidak ada gambar peta rute, logo, atau stylesheet yang diambil dari situs resmi dan disertakan dalam perubahan ini. Halaman resmi mencantumkan hak cipta PT Transportasi Jakarta.

## Pemeriksaan

QA browser merender semua 19 kode jaringan melalui kedua varian badge dan tiga kode fixture. Pemeriksaan mencakup isi kode, bentuk, ruang di sekeliling teks, warna sumber, dan konsistensi ukuran satu serta dua digit. Pengujian Popup memeriksa heading dan logo operator, letak badge dan panah, batas tiga tujuan, tautan jumlah tambahan, aksi, serta transisi ke Panel dan kembali.

Workflow **D3.5 Popup/Panel Screenshot Review** memakai tile jaringan yang benar dan menyimpan tangkapan serta `report.json`. Skenario mencakup Halte Dukuh Atas, LRT Dukuh Atas dan Cawang, KRL Sudirman, serta MRT ASEAN pada desktop 1440×900 dan 1280×720 serta mobile 390×844 dan 360×800. Jalankan input `production` pada commit `main` yang sudah terbit untuk smoke test dan tangkapan situs GitHub Pages.
