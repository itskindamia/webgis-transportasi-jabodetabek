# D4 — Visualisasi semua tujuan integrasi stasiun terpilih

**Status:** Draft PR #37 bertumpuk di atas QA P0 PR #39 (yang telah lulus 163/163 tes). Belum di-merge atau deploy; tunggu hasil regresi penuh D4.

## Perilaku

- Desktop ≥1024 px: ketika stasiun/halte dipilih, overlay menampilkan **semua tujuan integrasi langsung yang bisa dipetakan dengan aman** dari data yang sama dengan popup dan panel.
- Overlay menggunakan tombol tujuan navigasi yang benar-benar dihasilkan oleh resolver integrasi WebGIS (termasuk perbaikan kompatibilitas pada markup yang sudah ter-render). Jika tujuan hanya informatif, tidak mempunyai target yang valid, atau moda target tidak sesuai, **tidak** digambar garis/marker fiktif.
- Semua tujuan tampil bersamaan sebagai marker khusus di peta beserta garis putus-putus abu-abu dari stasiun sumber. Marker tujuan dapat di-klik/diakses lewat keyboard untuk membuka tujuan menggunakan `openNetworkIntegrationStop()`.
- Pengguna bisa mematikan overlay lewat **Peta dasar → Tampilkan integrasi di peta**. Preferensi disimpan di localStorage, default aktif.
- Label lokasi tujuan tampil saat hover/focus. Status ringkas menampilkan jumlah tujuan yang dipetakan; **Lihat semua** menyesuaikan framing peta hanya jika diminta.
- **Mode Popup:** ketika `Lihat semua` diklik, popup hanya **disembunyikan secara visual**, bukan dihapus dari DOM atau menghapus pilihan halte. Ini mencegah popup menutupi marker tujuan. Tombol berubah menjadi `Kembali ke popup`, yang memulihkan detail dan kamera semula.
- **Mode Panel kanan:** `Lihat semua` hanya membingkai seluruh tujuan, tanpa menutup panel.
- Integrasi sangat berdekatan (misalnya LRT ↔ Transjakarta Cawang, ±9 m) menggunakan **pergeseran simbol layar** dengan leader line kecil. Koordinat fitur, ujung garis relasi dan identitas tujuan **tidak berubah**. Simbol bukan posisi geografis baru.
- Peta, zoom dan pusat **tidak berubah otomatis** hanya karena overlay ditampilkan. Tombol Lihat semua memang dapat mengubah viewport.
- Popup dan Panel kanan D3.2 diperlakukan sama. Saat stasiun terpilih berubah atau pemilihan dibersihkan, overlay ikut diperbarui.
- Tablet dan mobile tidak menerima overlay baru.

## Representasi geografis

Garis adalah **relasi integrasi**, bukan jalur pejalan kaki terverifikasi. Tidak ada poligon, perhitungan waktu berjalan, routing, geometri baru permanen, atau perubahan GeoJSON.

Keputusan kartografis: jangan mengasumsikan bahwa jarak lurus merepresentasikan akses pedestrian. Bila data tapak atau jalur pedestrian resmi kelak tersedia, layer tersebut dapat dibuat terpisah.

## Data dan keterbatasan

Overlay memakai `.integration-place-row` dengan `data-integration-stop-key`, `data-integration-route-id`, dan `data-integration-basis`. Rujukan `INT_STOP` menjadi dasar utama; fallback `INT_NM` hanya boleh dipetakan jika nama tujuan **sama persis** setelah normalisasi ringan dan merujuk ke satu lokasi fisik unik dalam moda yang sama (presisi koordinat enam desimal). Moda target harus cocok dengan moda rutenya. Data yang belum dapat dipetakan tetap muncul sebagai informasi dalam popup/panel. Beberapa entri di Dukuh Atas tidak mempunyai pasangan titik dengan moda yang sesuai, sehingga jumlah marker peta mungkin lebih kecil daripada seluruh baris integrasi yang tertera.

Target yang mempunyai identitas STOP_ID dan titik geografis yang sama digabung menjadi satu marker. Trase moda lain tidak ditambahkan permanen hanya karena ada integrasi.

## Pemeriksaan yang perlu dilakukan sebelum merge

1. Jalankan `node --test tools/test-layout-integration-overlay-d4.mjs` dan seluruh suite regresi.
2. Screenshot Cawang (LRT ↔ BRT), Dukuh Atas (LRT ↔ BRT/MRT/KRL/KA Bandara yang terpetakan), ASEAN (BRT ↔ MRT), serta stasiun tanpa integrasi pada mode Popup/Panel.
3. Periksa marker tidak menutupi popup, kontrol peta, legend dan panel samping pada 1366×768, 1440×900, 1920×1080.
4. Audit seluruh relasi yang muncul dalam peta dengan `INT_STOP`, `INT_NM`, `ROUTES`, `MODE` dan coordinate target.
5. Pergantian lin dan stasiun berulang, tombol matikan/nyalakan, klik marker tujuan, navigasi tab/keyboard, dan direct permalink.
6. Gunakan basis QA PR #39 yang memperbaiki 13 kegagalan historis dan menghasilkan 163/163 lulus; lanjutkan pemeriksaan regresi penuh gabungan D4. Tidak menurunkan cakupan QA.
7. Jangan menggabungkan PR #33, #34, #36 atau D4 ke `main` sampai QA resmi dan review visual disetujui.

## Bukti hasil yang sudah tersedia

- [QA P0 PR #39](https://github.com/itskindamia/webgis-transportasi-jabodetabek/pull/39): regresi resmi **163/163 lulus** pada branch QA terpisah.
- [D4 Spatial Interaction QA](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/45940242612): **6/6 lulus**, mencakup sumber target, Cawang name fallback, klik marker offset, mode Panel, serta Popup `Lihat semua` dan pemulihan kamera.
- [Screenshot D4](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/45940094828): **18 screenshot** pada tiga viewport desktop. Di Popup Dukuh Atas `Lihat semua`, marker diuji harus **di dalam viewport** dan **menang hit-test**, bukan hanya ada di DOM.
- Screenshot dari browser fixture memakai **basemap tile netral**, bukan Esri/OSM produksi. Jangan menggunakannya sebagai bukti tampilan basemap produksi.

**Gerbang rilis tetap:** hasil QA penuh gabungan, review visual akhir, urutan merge, serta persetujuan publikasi. Tidak ada deployment otomatis dari pekerjaan ini.
