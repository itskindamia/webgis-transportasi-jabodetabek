# Prototipe layout Tabler + Leaflet

Implementasi map-first tersedia pada branch `feat/layout-tabler-prototype` untuk
review layout. Workspace asli `/workspace/work/webgis-tabler` berhasil diakses
kembali dan perubahan lokal dipulihkan; implementasi ini **bukan rekonstruksi**
dari laporan. Kode, dependensi, stylesheet hasil build, tes, dan screenshot
disimpan melalui commit bertahap.

Baseline: main pada `3835e534f4aa0ee8889b77924cf58ccaab20f4db`. PR A01 tetap
terpisah. Tidak ada merge, deployment GitHub Pages, perubahan URL publik,
atau migrasi database.

## Menjalankan secara lokal

Node 20+ diperlukan. CSS hasil build disertakan, sehingga server statis dapat
dijalankan tanpa memasang dependensi pengembangan:

~~~sh
git clone --branch feat/layout-tabler-prototype https://github.com/itskindamia/webgis-transportasi-jabodetabek.git
cd webgis-transportasi-jabodetabek
npm run dev
~~~

Buka http://localhost:5173/. Leaflet CDN, tile basemap, dan pencarian Nominatim
tetap menggunakan layanan eksternal seperti aplikasi sebelumnya.

Untuk build dan tes:

~~~sh
npm ci
npm run build:ui
npx playwright install chromium
npm run test:layout
~~~

Chromium yang telah terpasang dapat dipilih secara eksplisit:

~~~sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:layout
~~~

## Audit struktur dan hasil implementasi

| Area | Struktur awal | Hasil prototipe |
| --- | --- | --- |
| HTML | Kontrol dan informasi bergantung pada shell lama | Header minimalis, sidebar jaringan, peta utama, panel detail bertab; semua 87 ID DOM asli dipertahankan |
| CSS | Dua stylesheet shell, banyak selector global dan aturan berulang | Layer tabler, legacy-components, prototype; stylesheet shell lama disimpan tetapi tidak dimuat entry baru |
| JavaScript | map.js sekitar 635 KB mencampur operasi transportasi dan pengukuran UI | Engine tetap byte-identical; adapter layout terpisah untuk panel dan ukuran |
| Desktop | Pengukuran panel bergantung pada viewport | Grid sidebar–peta–detail; sidebar dan detail dapat ditutup; peta mengikuti grid |
| Tablet 768 px | Panel berpotensi menyisakan area peta terlalu sempit | Panel menjadi overlay; jaringan dan detail dibuka bergantian |
| Mobile 390 px | Kontrol bersaing dengan peta | Search mengambang, dock empat tombol, bottom sheet filter/informasi/detail, handle expand |
| Leaflet | Padding dan fit bergantung pada shell lama | ResizeObserver dan invalidateSize mengikuti kontainer; penutupan panel tidak memanggil fit ulang rute |
| Popup mobile | Margin, sheet, atribusi dan kontrol membutuhkan ruang tersendiri | Padding dan isi popup responsif; seleksi ulang halte yang sama juga memperkecil sheet |
| State | Engine memegang seleksi, marker, daftar dan URL | Kontrol lama tetap digunakan; adapter mengamati hasil render dan meneruskan pilihan layanan ke select asli |

Tabler UI **1.4.0** dikompilasi dari Sass terpilih: typography, forms, buttons,
cards, badges, navigation, icons, dan dasar layout. Bundle JavaScript Tabler
tidak dimuat. Leaflet tetap **1.9.4**. Sprite lokal berisi 17 ikon Tabler Icons
**3.35.0**. Versi dependensi terkunci dalam package-lock.json.

CSS shell baru dan ekstraksi komponen lama memiliki **0 deklarasi !important**.
CSS Tabler mempertahankan 18 deklarasi vendor. Aturan lama untuk badge,
popup, legenda dan informasi jaringan diekstraksi agar presentasi data tetap
tersedia; seluruh duplikasi CSS proyek belum dibersihkan.

## Integritas dan batas perubahan

- Empat GeoJSON dan js/map.js tidak berubah byte demi byte. Geometri, atribut,
  STOP_ID, GEOM_ID, nama, status, arah, pengalihan dan urutan halte tidak diedit.
- Adapter hanya mengganti helper pengukuran dan kontrol panel UI; fungsi
  transportasi, seleksi/navigasi dan sinkronisasi URL tetap memakai engine asli.
- [source-integrity.json](layout-tabler/source-integrity.json) melindungi SHA-256
  delapan berkas: empat GeoJSON, js/map.js, js/layout-concept.js dan kedua CSS lama.
- Semua 87 ID DOM baseline tetap ada; entry prototipe memiliki 109 ID unik.
  Select lama tetap menjadi hook engine walaupun pilihan layanan ditampilkan
  melalui tombol baru.
- Pencarian transportasi/tempat, basemap/opasitas, legenda, popup, integrasi,
  GPS, home, zoom, perbandingan rute dan navigasi halte tetap terhubung.

## Berkas utama yang berubah

| Berkas | Peran |
| --- | --- |
| index.html | Shell Tabler dan penempatan ulang komponen |
| js/app-loader.js | Event kesiapan engine |
| js/layout-tabler.js | Panel, tab, mode proxy, resize, padding popup dan atribusi |
| css/layout-tabler.css | Shell responsif, spacing, typography dan breakpoint |
| css/tabler-components.scss / css/tabler-components.css | Sass terpilih dan hasil build |
| css/legacy-components.css | Presentasi komponen dinamis lama yang masih diperlukan |
| assets/icons/tabler.svg / assets/licenses/* | Sprite ikon dan lisensi |
| package.json / package-lock.json / .gitignore | Perintah lokal, dependensi dan pengabaian artefak sementara |
| tools/build-tabler-css.mjs / tools/serve-layout.mjs | Build dan server lokal |
| tools/layout-browser.mjs / tools/test-layout-tabler.mjs | Fixture dan regresi browser |
| tools/capture-layout.mjs / tools/fetch-preview-tile.py | Capture aktual dengan tile penyedia |
| docs/layout-tabler/verification/* | Log tes/audit dan ringkasan |
| docs/layout-tabler/screenshots/* | Delapan PNG dan manifest |
| README.md / THIRD_PARTY_NOTICES.md | Cara menjalankan dan atribusi |

## Pengujian terbaru

**10 tes lulus, 0 gagal**, Chromium headless.
[Log lengkap](layout-tabler/verification/layout-tests.tap) dan
[ringkasan mesin](layout-tabler/verification/summary.json) disertakan.

| Pengujian | Hasil |
| --- | --- |
| Hash sumber, hook DOM, ID unik dan prioritas CSS shell/komponen lama | Lulus |
| Layout dan resize Leaflet 390 × 844 | Lulus |
| Layout dan resize Leaflet 768 × 1024 | Lulus |
| Layout dan resize Leaflet 1366 × 900 | Lulus |
| Layout dan resize Leaflet 1600 × 1000 | Lulus |
| Seleksi halte, popup, sebelumnya/berikutnya, integrasi, tab dan URL | Lulus |
| Pencarian transportasi/tempat, basemap, opasitas, legenda dan informasi | Lulus |
| Keyboard tab dan perpindahan breakpoint | Lulus |
| Popup mobile bebas dari kontrol/atribusi/sheet, seleksi ulang keyboard dan tombol tutup | Lulus |
| GPS, home, zoom dan perbandingan rute | Lulus |

Tidak ada overflow horizontal atau error runtime baru dalam alur tersebut.
Ukuran Leaflet cocok dengan kontainer setelah perubahan panel. Zoom tidak
berubah saat menutup panel; center diperiksa dalam toleransi pembulatan satu
piksel Leaflet.

Tes regresi mengisolasi tile/geocoding dan memakai posisi GPS uji. HTML, data,
engine dan Leaflet yang dijalankan merupakan berkas asli. Screenshot memakai
server HTTP lokal sesungguhnya dan tile aktual. Bytes Leaflet CDN dipasok dari
paket npm versi identik dengan SRI; Google Fonts opsional memakai system
fallback saat capture. Ini bukan pengujian menyeluruh ketersediaan layanan
eksternal.

QA visual menemukan popup mobile bertabrakan dengan atribusi dan ruang
kontrol. Reproduksi negatif checkpoint lama tersimpan dalam
[mobile-popup-before.tap](layout-tabler/verification/mobile-popup-before.tap);
regresi setelah perbaikan dalam
[mobile-popup-after.tap](layout-tabler/verification/mobile-popup-after.tap).
Keduanya terpisah dari audit data di bawah.

### Perbandingan audit repository

| Pemeriksaan | Baseline main | Prototipe |
| --- | --- | --- |
| npm ci dan npm run build:ui | Belum tersedia | Lulus |
| node --check JavaScript aplikasi/adapter/tooling | Aplikasi lama lulus | Lulus |
| node tools/audit-navigation.mjs | Lulus dengan catatan lama | Lulus, output identik |
| node tools/audit.mjs | Gagal: konflik STOP_ID dan GEOM_ID | Gagal, output identik |
| python tools/audit-k01-k10-rail.py | Gagal: temuan identitas/data/rail lama | Gagal, output identik |

Stdout/stderr lengkap baseline dan prototipe tersedia di
[audits.json](layout-tabler/verification/audits.json). Temuan data lama tidak
diperbaiki pada pekerjaan layout.

## Screenshot untuk review

| Viewport / keadaan | Berkas |
| --- | --- |
| Desktop 1366 × 900 | [layout-1366.png](layout-tabler/screenshots/layout-1366.png) |
| Desktop 1600 × 1000 | [layout-1600.png](layout-tabler/screenshots/layout-1600.png) |
| Tablet 768 × 1024 | [layout-768.png](layout-tabler/screenshots/layout-768.png) |
| Mobile 390 × 844 | [layout-390.png](layout-tabler/screenshots/layout-390.png) |
| Ringkasan rute desktop | [desktop-route-summary.png](layout-tabler/screenshots/desktop-route-summary.png) |
| Detail mobile diperbesar | [mobile-detail-expanded.png](layout-tabler/screenshots/mobile-detail-expanded.png) |
| Filter mobile | [mobile-filter.png](layout-tabler/screenshots/mobile-filter.png) |
| Popup dan seleksi mobile | [mobile-stop-popup.png](layout-tabler/screenshots/mobile-stop-popup.png) |

Timestamp, commit aplikasi saat capture, versi Chromium, dimensi kontainer,
jumlah tile aktual dan SHA-256 PNG tercatat dalam
[manifest.json](layout-tabler/screenshots/manifest.json).

Untuk mengambil ulang, diperlukan Python 3 standard library dan akses HTTPS
ke penyedia tile melalui konfigurasi proxy yang diwariskan:

~~~sh
npm run capture:layout
~~~

Tool memulai server lokal sementara pada port 5187 dan menutupnya setelah
capture. Cache tile berada di direktori sementara, tidak masuk repository.

## Batas integrasi yang tersisa

1. **Onboarding/guided tour lama:** anchor dan copy belum disesuaikan penuh;
   suite layout menutup onboarding untuk menguji aplikasi utama. Perlu review
   terpisah sebelum produksi.
2. **Gestur drag/swipe bottom sheet:** belum tersedia; gunakan tombol handle.
3. **Safari/iOS, perangkat sentuh nyata, keyboard virtual dan screen reader:**
   belum divalidasi menyeluruh; pengujian memakai Chromium headless.
4. **Ketergantungan helper UI global:** perubahan engine memerlukan regresi
   layout. CSS komponen lama juga masih memiliki aturan berulang.
5. **A01 dan audit data:** bug toggle non-eksisting tetap mengikuti PR A01;
   konflik STOP_ID/GEOM_ID dan temuan lain tetap ada.

Prototipe disiapkan untuk review layout melalui Draft PR, belum untuk
produksi. Jangan merge atau deploy sebelum review selesai.
