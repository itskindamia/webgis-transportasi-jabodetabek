# Verifikasi font compact di produksi

Diperiksa pada 7 November 2026 pukul 12.23 WIB menggunakan Chromium 155 otomatis.
Situs: https://itskindamia.github.io/webgis-transportasi-jabodetabek/

Main produksi: `4939453abb2872e49d8a3dea6f6b13e9f93e0959`.
[Deployment Pages 42341917863](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/42341917863)
selesai dengan status sukses. PR #1 dan #7 di-merge/deploy oleh proses paralel;
pekerjaan font ini tidak menjalankan merge atau deployment baru.

## Pemeriksaan aktual

- Desktop 1366×900 dan mobile 390×844: judul dan empat angka statistik 16 px,
  label statistik 12 px, tombol pilihan trase 12 px dengan tinggi 44 px.
- PT Sans 400/700 dimuat dari `assets/fonts/`. Seluruh aset aplikasi yang dimuat
  identik byte dengan checkout main di atas, termasuk CSS dengan query
  `summary-precision-a01-20261107-1` dan empat GeoJSON.
- Tidak ada horizontal overflow, error JavaScript, atau console error.
- 93 respons aktual berstatus HTTP 200, termasuk aset, font, GeoJSON dan tile provider.
  Browser menerima byte HTTPS aktual melalui proxy lingkungan dengan validasi TLS Python;
  tidak memakai aset, data atau tile pengganti.

| Desktop live | Mobile live |
| --- | --- |
| [Screenshot](live-summary-1366.png) | [Screenshot](live-summary-390.png) |

[Hasil rinci, computed styles dan SHA-256](fonts-live.json).
[Metadata deployment](deployment.json).
Probe baca-saja: `tools/verify-summary-font-live.mjs`.

## Regresi dan batas pengujian

[Release regression QA](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/42340956222)
berhasil pada tree runtime identik: 112 kasus/subkasus layout dan 18 A01.
[Layout precision QA](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/42340960726)
juga berhasil; A01 lokal 18/18 lulus.
[Bukti baseline terintegrasi](../verification/parallel-sync/README.md).

Dua audit data lama tetap gagal sesuai baseline; data tidak diperbaiki dalam scope font.
Perangkat fisik dan Safari iOS belum diuji. Probe produksi ini memverifikasi Ringkasan K3
di dua viewport; cakupan lintas jaringan dan viewport lainnya berasal dari suite regresi.
