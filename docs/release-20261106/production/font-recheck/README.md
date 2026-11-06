# Verifikasi ulang PT Sans pada website live

Main yang diverifikasi: `2900440884f9887343a2e440cb8b4479e2d8f2b9`.
PR #3 dan PR #4 sudah merged. Workflow Pages
[42245462828](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/42245462828)
berstatus **success**, dan build Pages terbaru berstatus `built` pada SHA tersebut.
Tidak diperlukan perubahan atau merge ulang; tidak ada perubahan runtime/data.

Hasil pemeriksaan ulang pada 6 November 2026, sekitar 23:28 WIB:

- Build berhasil; [50/50 tes regresi lulus](tests.tap).
- Delapan hash terlindungi cocok. [Audit pembanding](audits.json): navigasi
  lulus, kedua kegagalan audit data tetap identik baseline.
- **180 pemeriksaan gaya font dalam 12 konteks** semuanya menghasilkan
  `"PT Sans", Arial, sans-serif`.
- Sidebar/filter, header, input dan tombol Search, panel detail, daftar halte,
  popup/title, kartu pelayanan dan tombol navigasi diperiksa. Panel/filter/
  daftar dibuka langsung pada mobile dan desktop; status visibilitas dicatat.
- Regular 400 dan bold 700 benar-benar termuat dari URL produksi berikut:
  - `assets/fonts/pt-sans-latin-400-normal.woff2`
  - `assets/fonts/pt-sans-latin-700-normal.woff2`
- Ketujuh CSS/JS UI utama memakai query versi `release-20261106-1` dan
  responsnya cocok dengan source main. `js/map.js` tetap memakai versi lama
  karena byte-nya tidak berubah.
- Empat GeoJSON termuat; tidak ada error JavaScript/console atau 404 dalam
  skenario produksi yang diuji. Velodrome, Halim, Cawang multi-lin, navigasi
  serta viewport 390×844, 568×320 dan 844×390 diverifikasi kembali.

[verification.json](verification.json) menyimpan waktu presisi, URL font,
nilai computed style per elemen, cache-busting, checksum respons yang dibandingkan
langsung dengan objek Git main, serta state/checksum screenshot.

| Screenshot terbaru situs live | File |
| --- | --- |
| Velodrome desktop | [live-velodrome-desktop.png](live-velodrome-desktop.png) |
| Cawang mobile | [live-cawang-mobile.png](live-cawang-mobile.png) |
| Landscape kecil | [live-landscape-568.png](live-landscape-568.png) |
| Landscape lebar | [live-landscape-844.png](live-landscape-844.png) |

Chromium 155 mengeksekusi respons website/CDN asli melalui proxy lingkungan;
TLS divalidasi transport Python menggunakan CA runtime. Tidak ada stub aset,
font, GeoJSON atau tile. Perangkat fisik/Safari iOS belum diuji.

Bukti ini berada di branch dokumentasi agar pembaruan laporan tidak memicu
deployment ulang. Source main, GeoJSON, `js/map.js` dan branch A01 tetap utuh.
