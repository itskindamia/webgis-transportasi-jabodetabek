# Jaringan Transportasi Umum Jabodetabek

WebGIS statis untuk eksplorasi jaringan transportasi umum Jabodetabek, termasuk BRT dan jaringan rel, halte/stasiun, status jaringan, serta integrasi antarmoda.

**Baseline saat ini: v0.16 — 11 September 2026.**

## Perubahan v0.16

- Taxonomy rail baku diperluas menjadi `MRT`, `LRT`, `KRL`, `KA_BANDARA`, dan `ICT`.
- Label publik `KA_BANDARA` adalah **KA Bandara**; label publik `ICT` adalah **KA Antarkota**.
- `ICT` wajib memiliki `SERVICE_TYPE`, dengan domain `LOCAL` (KA Lokal) atau `KAJJ` (KA Jarak Jauh).
- Dropdown **Jenis Layanan** bersifat data-driven. KA Bandara / KA Antarkota baru muncul setelah `rail_route.geojson` benar-benar memiliki lin pada MODE tersebut.
- Alias legacy (`KAI_BANDARA`, `AIRPORT_RAIL`, `KAJJ`, `KAI_KAJJ`) tetap diterima oleh adapter runtime.
- Dataset GeoJSON eksisting tidak dimigrasikan pada rilis ini; field `SERVICE_TYPE` baru wajib saat mulai memasukkan feature `MODE=ICT`.


- BRT directional mendukung pengalihan per arah dengan fallback ke trase reguler untuk arah yang tidak terdampak.
- Koridor dengan pengalihan aktif memiliki mode **Kondisi trase: Saat ini / Reguler**. Mode Reguler menampilkan trase normal secara utuh dan bukan sebagai overlay pembanding.
- Kontrol **Semua trase / Sesuai arah** tetap tersedia pada kedua kondisi trase.
- Revisi minor turunan v0.16 tidak dipublikasikan sebagai nomor versi terpisah.

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
- Field internal tetap `MODE`; tidak ada migrasi GeoJSON pada v0.16.
- Istilah `moda` tetap dipakai pada konteks umum seperti integrasi antarmoda.

## v0.16 directional diversion
Build v0.16 kini mendukung fallback pengalihan per arah untuk BRT directional. Lihat `README_V0.16.txt` untuk rekap publik singkat.
