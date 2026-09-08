# Audit kepatuhan teknis v0.13

Tanggal audit: 5 September 2026

## Ringkasan

Baseline v0.13 memisahkan **kelayakan runtime** dari **kelengkapan/migrasi data**. Paket dapat diuji secara teknis tanpa menganggap GeoJSON yang belum dimigrasikan sebagai masalah kode.

## Pemeriksaan runtime

| Area | Status |
|---|---|
| Content Security Policy | diperiksa oleh `tools/audit.mjs` |
| APP_DEBUG produksi | harus `false` |
| Aset lokal | referensi hilang memblokir audit |
| OpenStreetMap | URL tile resmi dan atribusi dipertahankan |
| Nominatim | request eksplisit, interval minimum 1,1 detik, cache sesi |
| Geolocation | hanya setelah tindakan pengguna |
| Radius/Jangkauan Jalan Kaki | tidak ada pada rilis publik |
| Integrasi lintas moda | resolver target diperketat; regex KRL/MRT diperbaiki pada v0.10 |
| Gagasan WebGIS | label publik; nilai internal/legacy tetap kompatibel |

## Catatan GeoJSON yang tidak diperbaiki pada v0.13

- Migrasi schema BRT 31 field belum merata pada seluruh feature.
- Terdapat duplikasi `GlobalID` pada data BRT.
- `audit-navigation.mjs` masih menemukan konflik sequence pada BRT_11 dan BRT_16.
- Alias integrasi lama dapat masih terdapat di rail; runtime mempertahankan kompatibilitas.
- Lin Cibubur LRT Jabodebek belum lengkap sampai Harjamukti.
- `SRC_URL` pada rute rail masih perlu dilengkapi.

Catatan tersebut tidak dihapus atau disamarkan oleh audit karena membutuhkan perubahan GeoJSON.

## Validasi

```bash
node tools/audit.mjs
node tools/audit-navigation.mjs
node --check js/map.js
```

Hasil ideal akhir proyek adalah ketiganya lulus. Pada v0.13 tanpa perubahan GeoJSON, `audit.mjs` diharapkan lulus dengan catatan data dan `audit-navigation.mjs` dapat tetap gagal sampai konflik sequence diperbaiki pada dataset.

## Batas audit

Audit ini bukan sertifikasi hukum dan tidak menentukan hak penggunaan seluruh data, logo, atau merek. Tinjau kebijakan sumber pihak ketiga serta izin yang relevan sebelum penggunaan komersial atau operasional.
