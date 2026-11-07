# A01 — finalisasi dengan Tabler, LRT, PT Sans dan mobile sheet

PR #1, branch `fix/a01-toggle-non-existing`. Baseline main:
`3946e21011c681a3c6a3cc4d8f8ffc4e4b2b04ae` (mencakup PR #3–#6).
Implementasi lama `fc56479` dipertahankan. Main digabungkan ke branch PR melalui
`3132d446e412e9c80cc4f16f8947795e4ac47368`, tanpa konflik atau penulisan ulang solusi A01.
Tidak ada merge ke main atau deployment tahap ini.

## Audit helper dan perubahan minimal

Main masih merujuk `isProposedStopFeature`, `isConceptualStopFeature` serta
`isOptionalStopVisible` yang tidak tersedia pada handler toggle. Helper aktual adalah
`isProposedStop(feature)` dan `isConceptualStop(feature)`, dengan flag
`showProposedStops` / `showConceptualStops`. Perbaikan PR lama memakai helper/flag tersebut.

Solusi lama juga memulihkan seleksi setelah `drawStops()` mengganti marker melalui
`selectStop(..., { restoreOnly: true, popupWasOpen })`. Mode ini tidak menjalankan navigasi
kamera, tidak menutup filter mobile atau menghapus POI, dan hanya membuka popup yang
memang terbuka sebelum redraw. Auto-pan ditahan selama pembukaan/update popup.

Integrasi Tabler menemukan dua hal tambahan: popup yang sedang disembunyikan untuk
menampilkan Detail kembali muncul setelah `popupopen`, dan sinkronisasi seleksi yang
tertunda bisa mengganti tab desktop. Handler kini mengambil state melalui API yang sudah
ada, `webgisLayout.capture()`, lalu memanggil `restore()` sesudah MutationObserver Tabler
menjadwalkan sinkronisasi dan sesudah guard auto-pan selesai. Tidak menambahkan API UI baru.
Pemulihan opsional ini juga aman saat layout Tabler tidak tersedia.

State yang dipulihkan mencakup tab, posisi sheet, panel, popup yang disembunyikan dan
scroll. Seleksi yang tidak lagi terlihat tetap dibersihkan oleh mesin; marker/list/kartu/
aria-current dan parameter stop URL mengikuti hasil tersebut. Penutupan popup lewat X
tetap menghapus seleksi sesuai perilaku asli.

`js/app-loader.js` dan query loader pada `index.html` memakai `a01-20261107-1`, agar
implementasi engine baru tidak memakai cache map.js lama ketika PR kelak digabungkan.
Tidak ada perubahan styling atau desain UI di PR ini.

## Regresi dan reproduksi

| Baseline | Bukti |
| --- | --- |
| Main saat ini | 62 tes regresi lulus; skenario A01 390 px gagal dengan `isProposedStopFeature is not defined`. |
| PR A01 lama + main terbaru | ReferenceError sudah diatasi, tetapi popup yang disembunyikan untuk Detail kembali muncul. |
| Kandidat final | Log seluruh regresi dan suite A01 pada tautan di bawah. |

[Reproduksi main](a01-finalization/verification/main-reproduction.tap),
[reproduksi efek Tabler](a01-finalization/verification/tabler-before.tap),
[baseline 62 tes](a01-finalization/verification/baseline-layout.tap),
[regresi final](a01-finalization/verification/final-layout-verified.tap),
[A01 final](a01-finalization/verification/final-a01-verified.tap).

Suite A01 mempertahankan skenario lama dan memperluasnya menjadi **18/18 tes lulus**
(427.234,29 ms):

- Desktop 1366×900, mobile 390×844, landscape 568×320.
- K13 tanpa seleksi, seleksi Eksisting, peta telah digeser >90 px dari titik terpilih.
- Popup terbuka, disembunyikan oleh Detail, tertutup saat masih menunggu timer seleksi,
  dan ditutup lewat X.
- K11 Usulan dan K13 Konseptual; K15–K19 pada ketiga viewport, toggle dua arah dan
  penghapusan seleksi feature Konseptual yang menjadi tersembunyi.
- Marker/list memakai identitas feature fisik; tidak menganggap satu logical STOP_ID
  harus hilang seluruhnya jika masih ada feature Eksisting lain. Tidak memperbaiki ID data.
- Kamera tidak memanggil panTo/panBy/flyTo/setView/setZoom/fitBounds selama toggle;
  zoom sama dan pusat berada dalam toleransi satu pixel proyeksi Leaflet.
- Filter, rute, tab, sheet, popup, kartu, gaya marker, aria-current dan URL diperiksa.

Rute konseptual dibuka menggunakan filter Semua Status; dialog pengenalan rute ditutup
melalui tombol asli sebelum melanjutkan interaksi. Kebijakan default visibilitas ALL
tidak diubah. Fixture awal yang salah mengasumsikan semua rute ada dalam Eksisting,
semua toggle mulai mati, atau logical STOP_ID sama dengan feature fisik, disimpan
sebagai iterasi terpisah dan tidak dipakai sebagai hasil akhir.

Jalankan `npm run test:regression` untuk suite layout/font/LRT lalu A01.
Lingkungan ini memakai `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.
Tes deterministik memakai aplikasi/Leaflet/font/GeoJSON asli dengan tile/geocoding
diisolasi. Screenshot terpisah memakai server HTTP lokal dan tile provider aktual.
Perangkat fisik, Safari iOS dan GPS/geocoding nyata belum diuji.

## Integritas dan audit lama

Empat GeoJSON, STOP_ID, GEOM_ID, sequence, integrasi, geometri dan keputusan jaringan
tidak berubah. Tujuh hash terlindungi lain tetap sama. Hash map.js pada manifest integritas
Tabler diperbarui secara eksplisit hanya untuk diff A01 yang direview, disertai hash baseline
dan alasan pada `approvedChanges`; bukan penggantian baseline data secara menyeluruh.

Audit navigasi exit 0; dua audit data lama exit 1. Seluruh output identik baseline:
[audits.json](a01-finalization/verification/audits.json).
Tidak ada A02 atau migrasi/database dalam perubahan ini.

## Screenshot sebelum/sesudah integrasi Tabler

Baseline gambar: `3132d44` (implementasi PR A01 lama dengan main terbaru), bukan main yang
masih memiliki ReferenceError. Sumber sesudah: `99bf1bb`, dengan mesin A01 final yang sama.

| Viewport | Sebelum | Sesudah |
| --- | --- | --- |
| Desktop 1366 | [PNG](a01-finalization/screenshots/before/brt_13-1366.png) | [PNG](a01-finalization/screenshots/after/brt_13-1366.png) |
| Mobile 390 | [PNG](a01-finalization/screenshots/before/brt_13-390.png) | [PNG](a01-finalization/screenshots/after/brt_13-390.png) |
| Landscape 568 | [PNG](a01-finalization/screenshots/before/brt_13-568.png) | [PNG](a01-finalization/screenshots/after/brt_13-568.png) |

Pada 390 px, Detail sebelumnya menyusut menjadi 72 px dan popup tampil; sesudahnya
tetap Penuh 648 px dengan popup tersimpan. Pada 568×320, Detail sebelumnya tertutup;
sesudahnya tetap tersedia setinggi 216 px. Tidak ada penambahan layer/UI dekoratif.
Manifest menyimpan ukuran panel/peta, state popup dan hash PNG.

File runtime: `js/map.js` (A01 saja), `js/app-loader.js`, satu query loader pada `index.html`.
File pendukung: tes A01 lama yang diperluas, script capture, npm scripts, manifest
integritas dan dokumentasi. Perubahan Ringkasan CSS tetap di branch UI terpisah.
