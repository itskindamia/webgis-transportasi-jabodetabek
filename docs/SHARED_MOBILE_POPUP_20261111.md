# Shared mobile stop popup — 11 November 2026

## Arsitektur
- Renderer data `buildStopPopup(feature, routeId)` dalam `js/map.js` sudah menjadi komponen bersama seluruh moda; tetap dipakai tanpa menyalin/memigrasi konten maupun handler.
- `js/lrt-popup.js` tetap menjadi adaptor khusus logo dan kartu lin LRT, bukan pengelola kedua untuk logika popup.
- `css/stop-popup-mobile.css` adalah sumber aturan ukuran, hierarki teks, kepadatan, area scroll dan footer pada portrait mobile untuk seluruh moda; dimuat paling akhir.
- Aturan mobile LRT eksperimental ganda dari 11 Nov di `css/lrt-popup-mobile-v2.css` dihapus. Gaya LRT khusus landcape/short viewport dan desktop dipertahankan.
- `js/layout-tabler.js` membuat Leaflet memakai envelope yang sama dengan CSS: maksimal 308px lebar dan 400px tinggi, dikurangi lagi jika viewport sempit.
- `css/mobile-active-route.css` tetap menangani penanda aktif, tanpa menduplikasi state.

## Yang tidak berubah
GeoJSON, fungsi pemilihan layanan, navigasi sebelum/berikut, URL/stasiun terpilih, filter, status resmi maupun gagasan, urutan halte/stasiun, logo aset, popup non-halte, mode desktop dan landscape.

## QA
Responsive smoke menambah 8 kasus kombinasi empat moda × dua viewport, memeriksa bounding box popup, scrolling, target navigasi minimal 44px, status rute aktif dan error browser, ditambah perpindahan BK → CB.
Uji fisik Android tetap penting karena Chrome toolbar/keyboard dapat mengubah dynamic viewport.