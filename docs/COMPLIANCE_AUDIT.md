# Audit kepatuhan teknis v0.13.10

Tanggal audit: 2 September 2026

## Ringkasan

Paket ini memperbaiki masalah teknis, atribusi, dan transparansi yang dapat
ditangani langsung pada aplikasi statis. Statusnya **siap untuk pengujian dan
deployment dengan prasyarat**, bukan sertifikasi hukum.

## Perbaikan yang diterapkan

| Area | Perbaikan |
|---|---|
| OpenStreetMap tiles | URL tile resmi tanpa subdomain acak, zoom native 19, cache browser dipertahankan, dan atribusi selalu terlihat. |
| Nominatim | Autocomplete jaringan pada setiap ketikan dihapus; request hanya melalui Enter/tombol Cari, diserialkan dengan interval 1,1 detik, dan dicache selama sesi. |
| Esri basemaps | Atribusi Light Gray Canvas dan World Imagery diperluas sesuai `copyrightText` service pada saat audit. |
| Analisis jangkauan | Fitur Jangkauan Jalan Kaki eksperimental dan Radius Jangkauan geometris 400/600/800 m dihapus dari rilis publik agar WebGIS tetap fokus pada jaringan dan integrasi, sekaligus menghindari pembacaan buffer sebagai akses berjalan kaki aktual. |
| Privasi | GPS tidak lagi diminta otomatis; penjelasan transfer data ke layanan pihak ketiga dan kanal pelaporan ditambahkan. |
| Supply chain | Leaflet 1.9.4 diberi Subresource Integrity dan `crossorigin`; Content Security Policy membatasi sumber daya eksternal. |
| Atribusi aset | Kredit FDTJ, Vulphere, Flaticon, Leaflet, OSM, Esri, dan PT Sans didokumentasikan. |
| Data BRT | Schema aplikasi 31 field dilengkapi pada semua 324 feature, ID geometri/GlobalID dibuat unik, istilah dinormalisasi, sumber BRT146 dilengkapi, dan benturan sequence BRT200/BRT215 diperbaiki. |
| Data rail | `Reguler` dinormalisasi menjadi `Regular` dan kode `KA_BANDARA` menjadi `KAI_BANDARA`. |
| Reliabilitas | CSS literal `\\n`, referensi aset LRT Jakarta yang hilang, cache fetch data, dan penempatan atribusi diperbaiki. |

## Prasyarat sebelum deployment publik

1. Konfirmasikan hak penggunaan data yang berasal dari sumber selain dataset
   terbuka. Nilai `SOURCE` di GeoJSON adalah catatan asal, bukan bukti lisensi.
2. Konfirmasikan izin penggunaan logo/merek operator. Pernyataan nominatif dan
   nonafiliasi mengurangi kebingungan, tetapi tidak menggantikan izin bila izin
   memang diwajibkan oleh pemegang merek.
3. Pilih lisensi kode proyek secara eksplisit jika repositori dimaksudkan untuk
   dipakai ulang oleh publik. Tanpa `LICENSE`, hak cipta kode tetap dilindungi.
4. Tinjau ulang kebijakan OSM, Esri, CDN, dan font pada setiap rilis
   besar karena ketentuan layanan dapat berubah.

## Batas audit

Audit ini tidak menilai kontrak privat, status badan hukum, dasar pemrosesan data
pribadi menurut yurisdiksi tertentu, atau keaslian hak atas setiap koordinat dan
aset. Konsultasikan penasihat hukum bila aplikasi digunakan secara komersial,
memproses data pengguna di backend, atau menjadi dasar keputusan operasional.

## Validasi ulang

Jalankan:

```bash
node tools/audit.mjs
node tools/audit-navigation.mjs
node --check js/map.js
```

Hasil yang diharapkan adalah `AUDIT LULUS` tanpa error sintaks JavaScript.

## UI v0.13.7

- Radius jangkauan tetap tidak ada pada UI maupun logic publik.
- Footer popup tetap berada di luar area konten yang dapat memanjang.
- Action `Google Maps` dan `Sumber Data` memiliki hierarki visual yang setara.
- Kartu `Halte Terpilih` hanya dipadatkan secara presentasi; nilai status, role, arah, aktivitas, dan jumlah lokasi fisik tetap berasal dari data/logika yang sama.
- Perubahan v0.13.7 tidak mengubah skema data ataupun sequence navigasi.
