# Verifikasi produksi — mobile UX refinement

Website live: https://itskindamia.github.io/webgis-transportasi-jabodetabek/

- Main produksi: **`3946e21011c681a3c6a3cc4d8f8ffc4e4b2b04ae`**.
- Implementasi: [PR #5](https://github.com/itskindamia/webgis-transportasi-jabodetabek/pull/5).
- Koreksi satu langkah script smoke: [PR #6](https://github.com/itskindamia/webgis-transportasi-jabodetabek/pull/6).
- [Workflow Pages #42281508886](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/42281508886): **completed / success**.
- Pages build API: **built**, commit sama, error null.
- Smoke browser: **lulus**, Chromium **155.0.8059.79**, `2026-11-06T19:41:22.910Z` (7 November WIB).
- Produksi sebelum perubahan: `2900440884f9887343a2e440cb8b4479e2d8f2b9`.
- Backup rollback: `backup/production-before-mobile-ux-2900440`, menunjuk SHA lama.

Bukti disimpan di branch `docs/mobile-ux-live-verification` agar penyimpanan hasil verifikasi
tidak memicu deployment dokumentasi lagi. Branch ini tidak mengubah runtime aplikasi.

## Hasil pemeriksaan

| Pemeriksaan | Hasil |
| --- | --- |
| Respons HTTPS aktual | 569 respons, seluruhnya HTTP 200 |
| Asset aplikasi | 23 respons asset sendiri cocok byte/hash dengan checkout main yang diverifikasi |
| GeoJSON | 4 sumber dimuat, seluruh hash cocok; data tidak berubah |
| Font | PT Sans lokal 400 dan 700 berhasil dimuat; masing-masing WOFF2 diminta sekali |
| Font UI | Native select/status, panel Detail, daftar halte, kartu tutorial, dan tombol toolbar memakai PT Sans; popup LRT turut diuji pada suite font/regresi yang sama dengan asset produksi |
| Cache | CSS/JS UI memakai `mobile-ux-20261107-1`; mesin map.js tetap memakai versi lama karena isinya tidak berubah |
| Popup LRT | Velodrome, stasiun Jabodebek satu lin, Cawang multi-lin; pindah konteks BK/CB dan navigasi berikutnya berhasil |
| Mobile/landscape | Popup, sumber data, Google Maps, zoom, close, ukuran viewport dan overflow diverifikasi pada 390, 568 dan 844 px |
| Panel Jaringan | Dibuka kembali setelah memilih rute; tombol perbandingan terjangkau, tanpa filler flex |
| Panel Detail | Mini/Sedang/Penuh mempertahankan route/seleksi/URL/center/zoom |
| Koridor 3 | Daftar desktop/mobile, badge Damai/Jelambar multi-koridor, nama rute penuh/native select/chip peta |
| Tutorial | 5 kartu; 2 kolom desktop, 1 kolom mobile; dapat ditutup |
| Error | 0 JavaScript/console error, 0 HTTP gagal/404 |
| Integritas main | 8/8 file terlindungi cocok dengan manifest asli |

Seluruh respons produksi/CDN/tile diperoleh dari HTTPS aktual melalui proxy lingkungan.
Helper Python memvalidasi TLS dengan trust store lingkungan dan meneruskan byte respons ke
Chromium; tidak menonaktifkan pemeriksaan sertifikat dan tidak menggunakan mock data/asset.
Setiap respons asset aplikasi dibandingkan SHA-256 terhadap checkout main. Detail respons,
font, capture dan hash ada di [smoke.json](smoke.json), status deployment di
[deployment.json](deployment.json), [pages-build.json](pages-build.json), dan hash file
terlindungi di [integrity.json](integrity.json).

Tes sebelum publikasi: **baseline 50/50 → kandidat 62/62 lulus**, 0 gagal/dilewati pada
delapan viewport. Seluruh asset runtime pada main final identik dengan source yang diuji
(`7794501`). Perubahan PR #6 hanya memperbaiki script verifikasi yang tidak dimuat aplikasi.
Dua audit data lama masih exit 1, dengan output identik baseline; audit navigasi exit 0.
Tidak ada GeoJSON, js/map.js, ID, sequence, geometri, warna, arah/status jaringan, database,
atau branch A01 yang diubah.

## Catatan percobaan awal

[first-attempt.txt](first-attempt.txt) menyimpan kegagalan script pertama pada produksi PR #5.
Script mencoba tombol perbandingan sesudah handler asli menutup panel Jaringan ketika rute
dipilih di mobile. Reproduksi browser memastikan panel `inert=true`, `display=none`, sementara
kontrol perbandingan `hidden=false`; membuka Jaringan kembali membuat tombol terjangkau.
PR #6 menambahkan langkah pembukaan panel melalui tombol asli. Percobaan akhir dari main
final lulus seluruh skenario. Ini koreksi alur otomasi, bukan perubahan perilaku transportasi.

## Screenshot browser produksi

| Skenario | Screenshot |
| --- | --- |
| Velodrome desktop | [PNG](live-velodrome-desktop.png) |
| Cawang multi-lin mobile | [PNG](live-cawang-mobile.png) |
| Landscape 568×320 | [PNG](live-landscape-568.png) |
| Landscape 844×390 | [PNG](live-landscape-844.png) |
| Daftar K3 desktop | [PNG](live-k3-list-desktop.png) |
| Jaringan mobile | [PNG](live-network-mobile.png) |
| Daftar K3 mobile | [PNG](live-k3-list-mobile.png) |
| Tutorial desktop | [PNG](live-guide-desktop.png) |
| Tutorial mobile | [PNG](live-guide-mobile.png) |

Sebanyak 28 screenshot sebelum/sesudah dan hasil regresi tersedia pada
[laporan implementasi main](https://github.com/itskindamia/webgis-transportasi-jabodetabek/blob/3946e21011c681a3c6a3cc4d8f8ffc4e4b2b04ae/docs/MOBILE_UX_REFINEMENT.md).
Belum diuji pada perangkat fisik atau Safari iOS; keyboard diuji dengan simulasi viewport.
Tidak ada klaim benchmark FPS. Benturan sequence kanonis 02 pada ASEAN/Kejaksaan Agung dan
masalah audit data baseline tetap dicatat untuk pekerjaan data terpisah.
