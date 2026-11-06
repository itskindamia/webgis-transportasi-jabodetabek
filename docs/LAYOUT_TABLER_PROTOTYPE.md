# Prototipe layout Tabler + Leaflet — laporan sementara

**Status: implementasi lokal telah dibuat dan 10 tes terakhir lulus, tetapi kode layout dan screenshot belum ter-push. Lingkungan eksekusi menjadi unavailable sebelum handoff. Commit laporan ini hanya berisi dokumentasi, bukan implementasi layout.**

Tanggal pekerjaan: 6 November 2026.

## Branch dan batas perubahan

- Branch: `feat/layout-tabler-prototype`, dibuat dari `main` pada `3835e534f4aa0ee8889b77924cf58ccaab20f4db`.
- PR A01 / `fix/a01-toggle-non-existing` tetap terpisah, head terakhir diperiksa `fc56479fc5ee21584efee0c7550a7538bdc1326c`.
- Tidak ada merge, deployment, perubahan URL publik, atau migrasi database.
- Pada hasil lokal, seluruh empat GeoJSON dan `js/map.js` dipertahankan byte demi byte. GeoJSON, geometri, atribut, STOP_ID, GEOM_ID, keputusan operasional, arah, dan urutan halte tidak diedit.
- Pengujian integritas juga melindungi kedua stylesheet lama dan `js/layout-concept.js`, serta keberadaan seluruh 87 ID DOM asli.

## Audit struktur dan keputusan layout

| Area | Kondisi awal | Pendekatan prototipe lokal |
| --- | --- | --- |
| Entry HTML | Shell lama dengan kontrol filter, informasi, pencarian, basemap, dan detail | Susun ulang shell; pertahankan semua ID dan isi komponen yang dipakai engine |
| CSS | `style.css` sekitar 447 KB ditambah `layout-concept.css`; banyak aturan global, aturan berulang, dan prioritas tinggi | Pisahkan layer Tabler, komponen dinamis lama, dan shell prototipe; CSS lama tetap disimpan tetapi tidak dimuat oleh entry prototipe |
| JavaScript | `map.js` sekitar 635 KB / 31 ribu baris; logika transportasi dan ukuran panel saling terkait | Engine tidak diedit; adapter layout terpisah mengganti pengukuran panel dan padding popup/peta |
| Desktop | Overlay panel lama memakai ukuran viewport | Header minimalis, sidebar collapsible, peta fleksibel, panel detail di kanan |
| Tablet 768 px | Kontrol berpotensi menghabiskan area peta | Sidebar dan detail menjadi overlay; hanya satu panel samping terbuka |
| Mobile 390 px | Panel lama dan toolbar bersaing dengan peta | Search mengambang, dock empat tombol, filter/informasi/detail sebagai bottom sheet |
| Ukuran Leaflet | Layout lama melakukan pengukuran dan fit ulang khusus shell lama | ResizeObserver pada kontainer dan invalidateSize; perubahan chrome tidak memanggil fit ulang rute |
| Popup dan atribusi | Opsi popup lama menghitung viewport dan sidebar lama | Padding berdasarkan kontainer peta; popup dan atribusi dijaga di atas bottom sheet |
| Seleksi halte | Daftar, marker, popup, kartu, dan URL ditangani engine | Kontrol lama tetap dipakai; adapter mengamati isi komponen untuk tab dan judul detail |

Komponen Tabler UI 1.4.0 dikompilasi dari Sass terpilih: typography, forms, buttons, cards, badges, navigation, icons, dan dasar layout. Tidak memuat bundle JavaScript Tabler. Leaflet tetap versi 1.9.4. Subset lokal Tabler Icons terdiri dari 17 ikon.

Shell dan CSS komponen lama hasil ekstraksi tidak menambahkan `!important`. Build Tabler terakhir yang berhasil masih memuat 18 deklarasi prioritas dari vendor. Usaha berikutnya untuk menormalisasi deklarasi vendor tidak berhasil dijalankan karena lingkungan terputus; jangan menganggap perubahan tersebut telah diterapkan.

## Berkas lokal yang sudah dibuat atau diubah

Lokasi checkout sebelum lingkungan terputus: `/workspace/work/webgis-tabler`.

| Berkas | Perubahan lokal |
| --- | --- |
| `index.html` | Shell Tabler, sidebar, peta, detail bertab, dock dan bottom sheet; semua hook DOM lama dipertahankan |
| `js/app-loader.js` | Menambahkan event kesiapan engine untuk adapter layout |
| `js/layout-tabler.js` | Toggle panel, adapter fungsi pengukuran UI, ResizeObserver, tab, mode layanan proxy, aksesibilitas kontrol, ruang popup dan atribusi |
| `css/layout-tabler.css` | Shell responsif, spacing, typography, komponen, dan breakpoint |
| `css/tabler-components.scss` / `css/tabler-components.css` | Sumber Sass pilihan dan CSS Tabler hasil build |
| `css/legacy-components.css` | Presentasi popup, badge, legenda, daftar, dialog dan komponen dinamis lama yang tetap diperlukan |
| `tools/build-tabler-css.mjs` | Build CSS terpilih serta ekstraksi komponen lama tanpa shell lama |
| `tools/serve-layout.mjs` | Server statis lokal Node |
| `tools/layout-browser.mjs` | Fixture browser dengan data dan Leaflet asli serta tile/geocoding terisolasi |
| `tools/test-layout-tabler.mjs` | Sepuluh tes integritas dan interaksi browser |
| `docs/layout-tabler/source-integrity.json` | Hash SHA-256 berkas terlindungi dari baseline dan daftar ID DOM asli |
| `assets/icons/tabler.svg` | Sprite subset ikon Tabler |
| `assets/licenses/*` / `THIRD_PARTY_NOTICES.md` | Lisensi Tabler, Bootstrap 5.3.7, dan Tabler Icons |
| `package.json` / `package-lock.json` / `.gitignore` | Perintah dev/build/test, versi dependensi terkunci, dan pengabaian artefak lokal |
| `docs/layout-tabler/screenshots/*` | Tujuh screenshot aktual pada empat lebar layar; belum dapat diekspor |

Berkas implementasi dalam tabel ini belum tersedia di branch remote. Jangan menjalankan instruksi berikut dari clone remote saat ini dengan menganggap prototipe sudah tersimpan.

## Menjalankan hasil lokal setelah workspace pulih

Node 20+; CSS hasil build sudah tersedia di checkout lokal.

```sh
cd /workspace/work/webgis-tabler
npm run dev
```

Server terakhir berjalan pada `http://localhost:5173/`. Server lokal terputus bersama lingkungan; URL ini bukan deployment publik.

Untuk membangun ulang CSS dan menjalankan tes setelah berkas berhasil diserahkan:

```sh
npm ci
npm run build:ui
npx playwright install chromium
npm run test:layout
```

Dalam lingkungan kerja terakhir, Chromium yang telah tersedia digunakan melalui:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:layout
```

## Hasil pengujian terakhir yang berhasil

**10 tes lulus, 0 gagal, durasi 58,43 detik, Chromium headless.** Pemeriksaan ini dilakukan sebelum gangguan lingkungan dan sebelum normalisasi vendor yang gagal diterapkan. Pemformatan whitespace HTML sesudah tes belum diuji ulang.

| Pengujian | Hasil |
| --- | --- |
| Hash data/engine/CSS lama dan hook DOM | Lulus |
| Layout dan resize Leaflet 390 × 844 | Lulus |
| Layout dan resize Leaflet 768 × 1024 | Lulus |
| Layout dan resize Leaflet 1366 × 900 | Lulus |
| Layout dan resize Leaflet 1600 × 1000 | Lulus |
| Seleksi halte, popup, navigasi sebelumnya/berikutnya, integrasi, tab dan URL | Lulus |
| Pencarian transportasi, pencarian tempat, basemap, opasitas, legenda, informasi | Lulus |
| Keyboard tab dan perpindahan breakpoint | Lulus |
| Popup mobile dan atribusi tidak tertutup detail sheet | Lulus |
| GPS, home, zoom dan perbandingan rute | Lulus |

Tidak ditemukan error JavaScript baru dalam alur tersebut atau overflow horizontal. Ukuran Leaflet cocok dengan ukuran kontainer setelah panel dibuka/ditutup. Zoom tetap; center saat resize diperiksa dalam toleransi pembulatan satu piksel Leaflet.

Pencarian tempat dan GPS memakai respons/posisi uji yang deterministik. Tile pada tes regresi diisolasi. Screenshot visual menggunakan tile Esri aktual yang diambil melalui proxy dan cache sementara, bukan tile kosong pada fixture tes.

### Baseline audit repository

| Pemeriksaan | Main 3835e534 | Prototipe lokal |
| --- | --- | --- |
| `node --check` untuk JavaScript aplikasi | Lulus | Pemeriksaan adapter baru lulus sebelum pengujian browser |
| `node tools/audit-navigation.mjs` | Lulus, dengan catatan lama | Lulus; output identik |
| `node tools/audit.mjs` | Gagal pada konflik identitas data yang sudah ada | Gagal; output identik |
| `python tools/audit-k01-k10-rail.py` | Gagal pada temuan data/rail lama | Gagal; output identik |

Kegagalan baseline tersebut tidak diperbaiki pada pekerjaan layout. A01 dari main juga tetap ada karena PR A01 belum digabung; suite layout ini tidak mengklaim memperbaiki toggle non-eksisting.

## Screenshot yang dibuat tetapi belum berhasil diserahkan

- `layout-1366.png`: desktop, Koridor 1 dengan daftar halte.
- `layout-1600.png`: desktop lebar, Koridor 1.
- `layout-768.png`: tablet dengan panel detail.
- `layout-390.png`: mobile dengan detail sheet ringkas.
- `mobile-filter.png`: bottom sheet jaringan.
- `mobile-detail-expanded.png`: bottom sheet detail diperbesar.
- `desktop-route-summary.png`: tab ringkasan rute.

Screenshot ini dibuat sebelum penyempurnaan terakhir posisi atribusi, batas tinggi sheet, dan pemulihan sheet ringkas saat memilih halte; screenshot final harus diambil ulang setelah workspace pulih. Jangan menafsirkan daftar nama berkas ini sebagai lampiran yang sudah tersedia.

## Belum selesai diintegrasikan atau diverifikasi

1. **P0 — Pulihkan akses workspace, simpan implementasi, jalankan ulang tes final, ambil ulang dan ekspor screenshot.** Branch remote saat laporan ini dibuat hanya memuat baseline dan laporan ini.
2. **P1 — Review visual layout dan perilaku sheet** sebelum merge apa pun.
3. **P1 — Validasi ulang onboarding/guided tour lama** terhadap anchor layout baru; tes layout menutup onboarding untuk menguji aplikasi utama.
4. **P2 — Gestur drag/swipe bottom sheet** belum diimplementasikan; prototipe memakai tombol handle untuk memperbesar/memperkecil.
5. **P2 — Safari/iOS, perangkat sentuh nyata, keyboard virtual, dan audit aksesibilitas lengkap** belum diuji.
6. **P2 — Kurangi sisa CSS komponen lama** setelah review visual; ekstraksi sengaja mempertahankan presentasi badge dan informasi jaringan.
7. **Terpisah — A01 dan konflik GEOM_ID/STOP_ID serta temuan audit lain** tetap mengikuti jalur perbaikan masing-masing.

Adapter layout masih bergantung pada beberapa fungsi UI global di monolit `map.js`; perubahan engine di masa depan membutuhkan pengujian kontrak layout. Belum ada klaim kesiapan produksi.

## Langkah handoff berikutnya

Setelah lingkungan tersedia, periksa checkout tanpa menimpa perubahan, verifikasi baseline dan head PR A01, jalankan build/tes final, bandingkan hash data/engine dengan baseline, simpan screenshot final, lalu commit/push hanya ke branch prototipe. Siapkan review layout terpisah. Jangan merge atau deploy.
