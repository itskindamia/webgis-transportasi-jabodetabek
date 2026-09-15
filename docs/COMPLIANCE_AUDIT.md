# Audit kepatuhan teknis v0.16

Tanggal audit: 14 September 2026

## Ringkasan

Baseline v0.16 memisahkan **kelayakan runtime**, **integritas identitas data**, dan **kelengkapan provenance**. Pada build 14 September 2026, runtime dan audit navigasi sudah lulus setelah hardening GeoJSON BRT/rail serta sinkronisasi script audit dengan schema directional terbaru.

## Pemeriksaan runtime

| Area | Status |
|---|---|
| Content Security Policy | diperiksa oleh `tools/audit.mjs` |
| APP_DEBUG produksi | `false` |
| Aset lokal | referensi hilang memblokir audit |
| OpenStreetMap | URL tile resmi dan atribusi dipertahankan |
| Nominatim | request eksplisit, interval minimum 1,1 detik, cache sesi |
| Geolocation | hanya setelah tindakan pengguna |
| Radius/Jangkauan Jalan Kaki | tidak ada pada rilis publik |
| Integrasi lintas moda | resolver target memakai identitas yang telah dinormalisasi |
| STOP_ID BRT | tidak ada lagi satu STOP_ID untuk dua nama halte berbeda |
| GEOM_ID BRT | tidak ada nilai kosong atau duplikat pada stop/route |
| GlobalID BRT | format valid dan unik |
| Sequence BRT | diperiksa oleh `tools/audit-navigation.mjs` |
| Lin Cibubur LRT Jabodebek | sudah mencapai Harjamukti |

## Hardening data 14 September 2026 — scope K1–K10 + rail

- 55 benturan `STOP_ID` legacy yang menyentuh identitas canonical K1–K10 dipisahkan tanpa mengubah membership/sequence K11–K19.
- `GlobalID` BRT dinormalisasi agar unik secara teknis di seluruh dataset.
- K9/K10 dipulihkan metadata jaringan/operator dan metadata operasional yang terdeteksi regresi.
- Referensi integrasi rail→BRT diselaraskan kembali dengan target nama pada `INT_NM`.
- Global Search dideduplikasi pada tingkat logical stop (`STOP_ID`).
- Nomenklatur current K3 ditampilkan sebagai `Kalideres – Monumen Nasional via Veteran` hanya di layer presentasi UI.
- Kelengkapan schema/geometri legacy K11–K19 tidak dinilai sebagai syarat lulus review scoped ini.

## Catatan yang masih bersifat kelengkapan, bukan blocker runtime

- Banyak feature BRT masih belum memiliki `SRC_URL` spesifik per halte.
- Beberapa koridor legacy K10–K19 belum dimigrasikan penuh ke sequence directional A/B; runtime masih mendukung `SEQ_MAP` legacy.
- Pada K1, `SEQ_MAP` legacy nomor `02` dipakai ASEAN dan Kejaksaan Agung, tetapi sequence directional A/B sudah menjadi sumber navigasi utama dan tidak bentrok.

## Validasi

```bash
node tools/audit.mjs
node tools/audit-navigation.mjs
node --check js/map.js
```

Hasil build 14 September 2026: `audit.mjs` lulus dan `audit-navigation.mjs` lulus dengan satu catatan non-blocking pada `SEQ_MAP` legacy K1.

## Batas audit

Audit ini bukan sertifikasi hukum dan tidak menentukan hak penggunaan seluruh data, logo, atau merek. Tinjau kebijakan sumber pihak ketiga serta izin yang relevan sebelum penggunaan komersial atau operasional.
