# D4 — Visualisasi semua tujuan integrasi stasiun terpilih

**Status:** implementasi awal pada branch terpisah dari PR #36 (D3.2). **Belum siap merge atau deploy.**

## Perilaku

- Desktop ≥1024 px: ketika stasiun/halte dipilih, overlay menampilkan **semua tujuan integrasi langsung yang bisa dipetakan dengan aman** dari data yang sama dengan popup dan panel.
- Overlay menggunakan tombol tujuan navigasi yang benar-benar dihasilkan oleh resolver integrasi WebGIS (termasuk perbaikan kompatibilitas pada markup yang sudah ter-render). Jika tujuan hanya informatif, tidak mempunyai target yang valid, atau moda target tidak sesuai, **tidak** digambar garis/marker fiktif.
- Semua tujuan tampil bersamaan sebagai marker khusus di peta beserta garis putus-putus abu-abu dari stasiun sumber. Marker tujuan dapat di-klik/diakses lewat keyboard untuk membuka tujuan menggunakan `openNetworkIntegrationStop()`.
- Pengguna bisa mematikan overlay lewat **Peta dasar → Tampilkan integrasi di peta**. Preferensi disimpan di localStorage, default aktif.
- Label lokasi tujuan tampil saat hover/focus. Status ringkas menampilkan jumlah tujuan yang dipetakan; **Lihat semua** menyesuaikan framing peta hanya jika diminta.
- Peta, zoom dan pusat **tidak berubah otomatis** hanya karena overlay ditampilkan. Tombol Lihat semua memang dapat mengubah viewport.
- Popup dan Panel kanan D3.2 diperlakukan sama. Saat stasiun terpilih berubah atau pemilihan dibersihkan, overlay ikut diperbarui.
- Tablet dan mobile tidak menerima overlay baru.

## Representasi geografis

Garis adalah **relasi integrasi**, bukan jalur pejalan kaki terverifikasi. Tidak ada poligon, perhitungan waktu berjalan, routing, geometri baru permanen, atau perubahan GeoJSON.

Keputusan kartografis: jangan mengasumsikan bahwa jarak lurus merepresentasikan akses pedestrian. Bila data tapak atau jalur pedestrian resmi kelak tersedia, layer tersebut dapat dibuat terpisah.

## Data dan keterbatasan

Overlay hanya menggunakan `.integration-place-row-button` yang mempunyai `data-integration-stop-key` dan `data-integration-route-id` yang cocok dengan fitur di dataset dan moda rutenya. Data yang belum dapat dipetakan tetap muncul sebagai informasi dalam popup/panel. Beberapa entri di Dukuh Atas tidak mempunyai pasangan titik dengan moda yang sesuai, sehingga jumlah marker peta mungkin lebih kecil daripada seluruh baris integrasi yang tertera.

Target yang mempunyai identitas STOP_ID dan titik geografis yang sama digabung menjadi satu marker. Trase moda lain tidak ditambahkan permanen hanya karena ada integrasi.

## Pemeriksaan yang perlu dilakukan sebelum merge

1. Jalankan `node --test tools/test-layout-integration-overlay-d4.mjs` dan seluruh suite regresi.
2. Screenshot Cawang (LRT ↔ BRT), Dukuh Atas (LRT ↔ BRT/MRT/KRL/KA Bandara yang terpetakan), ASEAN (BRT ↔ MRT), serta stasiun tanpa integrasi pada mode Popup/Panel.
3. Periksa marker tidak menutupi popup, kontrol peta, legend dan panel samping pada 1366×768, 1440×900, 1920×1080.
4. Audit seluruh relasi yang muncul dalam peta dengan `INT_STOP`, `INT_NM`, `ROUTES`, `MODE` dan coordinate target.
5. Pergantian lin dan stasiun berulang, tombol matikan/nyalakan, klik marker tujuan, navigasi tab/keyboard, dan direct permalink.
6. Pastikan overlay tidak menyebabkan regressi pada 13 tes layout historis yang masih gagal di D3.2. Perbaikan baseline QA adalah pekerjaan terpisah.
7. Jangan menggabungkan PR #33, #34, #36 atau D4 ke `main` sampai QA resmi dan review visual disetujui.

**Catatan:** belum ada bukti screenshot atau hasil Playwright untuk D4 dalam commit ini. Jangan mencatat uji sebagai lulus hanya karena file tes dibuat.
