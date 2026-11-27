# Jaringan Transportasi Umum Jabodetabek

## Antarmuka Tabler + Leaflet

Jalankan `npm ci` dan `npm run dev` (Node 22), lalu buka `http://localhost:5173/`.
Aplikasi memakai PT Sans 400/700 yang disimpan di repositori. CSS hasil build sudah disertakan.

- Desktop menyediakan **Popup di peta** untuk ringkasan dan **Panel kanan** untuk detail lengkap. Gunakan **Tampilkan di panel** atau **Popup** untuk berpindah dengan pilihan halte tetap aktif. Preferensi mode tersedia di **Peta Dasar**.
- Tujuan integrasi yang terpetakan dapat dipilih pada peta. **Lihat semua** menyesuaikan tampilan peta agar tujuan terlihat. Garis menandai relasi antarmoda, tanpa memberikan petunjuk berjalan kaki.
- **Bandingkan rute** menampilkan dua trase jaringan. Slider **Kejelasan peta dasar** mengatur lapisan peta dasar dengan nilai 0–100% yang tersimpan di permalink.
- Di ponsel, tab **Detail** memakai bottom sheet. **Cara Menggunakan** mendemonstrasikan alur aplikasi dan mengembalikan tampilan setelah tutorial selesai. Cari Lokasi menampilkan hasil jaringan setempat. Tombol **Cari** meminta hasil tempat dari Nominatim.

[Validasi rilis dan rollback](docs/RELEASE_20261106.md) ·
[Laporan popup/font/mobile](docs/LRT_POPUP_PT_SANS_MOBILE.md) ·
[Screenshot akhir](docs/release-20261106/screenshots/) ·
[Website](https://itskindamia.github.io/webgis-transportasi-jabodetabek/)

WebGIS statis untuk eksplorasi jaringan transportasi umum Jabodetabek, termasuk BRT dan jaringan rel, halte/stasiun, status jaringan, serta integrasi antarmoda.

**Baseline data dan skema v0.16.** Bagian berikut mendokumentasikan audit 14 September 2026. Repositori mencatat perubahan terakhir pada berkas GeoJSON pada 23 September 2026 ([riwayat Git](https://github.com/itskindamia/webgis-transportasi-jabodetabek/commit/3835e534f4aa0ee8889b77924cf58ccaab20f4db)). Tanggal pembaruan setiap sumber tercantum hanya jika tersedia pada metadata masing-masing.

## Perubahan v0.16

- Taxonomy rail baku diperluas menjadi `MRT`, `LRT`, `KRL`, `KA_BANDARA`, dan `ICT`.
- Label publik `KA_BANDARA` adalah **KA Bandara**; label publik `ICT` adalah **KA Antarkota**.
- `ICT` wajib memiliki `SERVICE_TYPE`, dengan domain `LOCAL` (KA Lokal) atau `KAJJ` (KA Jarak Jauh).
- Dropdown **Jenis Layanan** bersifat data-driven. KA Bandara / KA Antarkota baru muncul setelah `rail_route.geojson` benar-benar memiliki lin pada MODE tersebut.
- Alias legacy (`KAI_BANDARA`, `AIRPORT_RAIL`, `KAJJ`, `KAI_KAJJ`) tetap diterima oleh adapter runtime.
- Hardening scoped 14 September 2026 untuk review K1–K10 + rail memisahkan `STOP_ID` legacy yang bentrok dengan halte canonical K1–K10, menormalkan `GlobalID`, memperbaiki metadata K9/K10 dan referensi integrasi rail→BRT, tanpa mengubah membership/sequence K11–K19.


- BRT directional mendukung pengalihan per arah dengan fallback ke trase reguler untuk arah yang tidak terdampak.
- Koridor dengan pengalihan aktif memiliki mode **Kondisi trase: Saat ini / Reguler**. Mode Reguler menampilkan trase normal secara utuh dan bukan sebagai overlay pembanding.
- Kontrol **Semua trase / Sesuai arah** tetap tersedia pada kedua kondisi trase.
- Revisi minor turunan v0.16 tidak dipublikasikan sebagai nomor versi terpisah.

## Hardening data 14 September 2026 — scope K1–K10 + rail

- `STOP_ID` legacy yang bentrok dengan halte canonical K1–K10 dipisahkan; tabel perubahan tersedia di `docs/STOP_ID_MIGRATION_20260914.md`.
- `GlobalID` BRT dinormalisasi menjadi GUID unik agar identitas feature tidak bertabrakan.
- Metadata K9/K10 yang terdeteksi regresi dipulihkan (`NETWORK`, `OPERATOR`, arah Penjaringan, dan event Kali Grogol).
- Referensi integrasi rail→BRT yang stale diperbaiki berdasarkan nama target `INT_NM`.
- Global Search sekarang melakukan dedupe berdasarkan logical stop (`STOP_ID`) sehingga geometri A/B/temporary tidak tampil sebagai hasil ganda.
- Nama operasional current K3 ditampilkan sebagai **Kalideres – Monumen Nasional via Veteran** tanpa mengubah endpoint/sequence data reguler.
- **K11–K19 tidak diaudit atau diubah pada membership/sequence dalam build scoped ini.** Error runtime yang murni berasal dari kelengkapan legacy K11–K19 tetap diperlakukan di luar scope.

## Struktur utama

- `index.html` — halaman aplikasi.
- `css/`, `js/`, `data/`, `assets/` — berkas runtime WebGIS.
- `tools/` — audit data dan navigasi sebelum rilis.
- `docs/` — dokumentasi deployment, QA, dan schema rail.
- `THIRD_PARTY_NOTICES.md` — atribusi dan catatan komponen/sumber pihak ketiga.

Lihat `docs/RAIL_SCHEMA_V2.md` untuk pedoman field KA Bandara dan KA Antarkota.

> WebGIS ini bersifat informatif dan bukan sumber resmi operator.


## Nomenklatur UI v0.16
- Antarmuka publik memakai **Jenis Layanan** dan **Semua Layanan**.
- Label publik **Skenario** digunakan pada filter, legenda, popup dan keterangan status. Nilai internal `Conceptual` dan alias data lama `Konseptual` tetap didukung untuk menjaga kompatibilitas.
- Field internal tetap `MODE`; migrasi data pada build 14 September difokuskan pada integritas identitas dan navigasi, bukan perubahan taxonomy layanan.
- Istilah `moda` tetap dipakai pada konteks umum seperti integrasi antarmoda.

## v0.16 directional diversion
Build v0.16 kini mendukung fallback pengalihan per arah untuk BRT directional. Lihat `README_V0.16.txt` untuk rekap publik singkat.
