# Mobile-first route discovery — draft review (11 November 2026)

## Tujuan
Meningkatkan kepadatan informasi pada panel Jaringan dan Detail di ponsel, terinspirasi kemudahan mencari rute di ModaHub, tanpa menyalin UI atau data luar.

## Perubahan
- Status dan Pilih Lin/Koridor memakai kolom label sejajar pada portrait, agar tidak memakan baris ekstra.
- Native select minimum 44px dengan teks 16px untuk mencegah zoom fokus otomatis di iOS.
- Tiga tab Ringkasan / Daftar halte(stasiun) / Terpilih berbagi lebar sama tanpa scrolling horizontal.
- Spacing header detail dan baris daftar sedikit dipadatkan; target sentuh tetap minimum 44px.
- Nama lengkap rute yang sudah tersedia tetap ditampilkan di bawah pemilih.

## Batas
CSS mobile portrait only, width <=767px dan tinggi >=560px. Tidak menyentuh js/map.js, data, popup LRT, pencarian, filter, status, integrasi, state URL, desktop, tablet, atau PR zoom #19.

## Pengujian sebelum merge
- npm ci, npm run build:ui, npm run test:layout
- Viewport 320x568, 360x800, 390x844, 568x320, 768x1024, desktop
- Semua moda/status, judul panjang, daftar multi-koridor, tiga tab, Mini/Sedang/Penuh, keyboard/safe area dan popup LRT
- Verifikasi alur klik/listener dan regresi kamera/URL. Belum ada hasil test browser yang terverifikasi.
