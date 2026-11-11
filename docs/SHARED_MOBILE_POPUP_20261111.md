# Shared mobile stop popup — 11 November 2026

## Alasan
Sebelumnya ukuran popup LRT dikendalikan di `js/layout-tabler.js` dan bertumpuk di `css/lrt-popup.css`, `css/lrt-popup-mobile-v2.css`, serta `css/mobile-active-route.css`, sementara popup moda lain memakai aturan berbeda. Tujuan refaktor adalah satu perilaku layout mobile tanpa mengganti data atau alur jaringan.

## Arsitektur
- `js/map.js` tetap menjadi sumber data dan mesin popup tunggal (`buildStopPopup`, `switchRouteFromStopPopup`, integrasi, navigasi, fitur).
- `js/stop-popup-ui.js` menjadi adapter presentasi bersama. Semua popup halte/stasiun mendapat kelas `stop-popup-ui`. Popup non-LRT di mobile menempatkan metadata ke header sticky di dalam scroller asli. Popup LRT mempertahankan dekorator logo/kartu dan wrapper scroll yang sudah dipakai.
- `css/stop-popup-mobile.css` adalah **satu sumber desain popup mobile yang aktif**, mencakup dimensi, tipografi, satu scroll surface, navigasi, highlight, dan variasi LRT.
- `js/layout-tabler.js` memberi envelope 308px × maksimum 400px untuk seluruh moda di portrait, sambil tetap menghormati ruang peta yang tersedia. Short landscape tetap adaptif.
- `index.html` tidak lagi memuat stylesheet `lrt-popup-mobile-v2.css` / `mobile-active-route.css` atau adapter `lrt-popup.js` lama. Berkas lama tetap disimpan hanya untuk referensi, bukan dieksekusi.
- Konfigurasi khusus LRT (logo sebenarnya, warna aktual rute) tetap berasal dari data/aplikasi, bukan data demo hardcode.
- Tidak mengubah GeoJSON, `js/map.js`, relasi, SEQ_MAP, status, arah, sumber atau pola pengalihan.

## Target QA
Viewport 320×568 dan 390×844, masing-masing: BRT, MRT, KRL, LRT; header sticky, viewport lebar/tinggi, scroll tunggal, footer navigasi, status/rute aktif; LRT BK→CB; halaman desktop dan landscape via suite lama. Tidak ada klaim browser fisik sebelum diuji.
