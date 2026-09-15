# Jaringan Transportasi Umum Jabodetabek

WebGIS statis untuk eksplorasi jaringan transportasi umum Jabodetabek, termasuk BRT dan jaringan rel, halte/stasiun, status jaringan, serta integrasi antarmoda.

**Baseline saat ini: v0.16 — 14 September 2026.**

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
- Field internal tetap `MODE`; migrasi data pada build 14 September difokuskan pada integritas identitas dan navigasi, bukan perubahan taxonomy layanan.
- Istilah `moda` tetap dipakai pada konteks umum seperti integrasi antarmoda.

## v0.16 directional diversion
Build v0.16 kini mendukung fallback pengalihan per arah untuk BRT directional. Lihat `README_V0.16.txt` untuk rekap publik singkat.
