# LRT popup portrait density — 11 November 2026

Feedback pengguna: popup pada Android hampir memenuhi lebar dan tinggi peta walaupun integrasi sudah dipadatkan.

Perubahan CSS khusus portrait mobile (lebar maksimum 767px, tinggi minimum 560px):
- Lebar konten popup menjadi maksimum 308px dengan margin viewport minimal sekitar 26px per sisi.
- Tinggi maksimum mengikuti 55% dynamic viewport dan dibatasi 380px; satu scroll untuk isi dan kontrol navigasi terpisah.
- Identitas stasiun sticky; judul 15px; logo operator 30px; metadata tetap tersedia.
- Dua tombol lin tetap sejajar dengan target sentuh minimal 44px; logo dan daftar integrasi diperkecil secukupnya.
- Interaksi, atribut, semua koneksi, data GeoJSON, popup moda selain LRT, dan tampilan landscape/desktop tidak diubah.
- JS Leaflet menyelaraskan maxWidth/maxHeight dengan CSS agar pan dan kalkulasi ukuran konsisten.

Validasi yang harus dilakukan: CI smoke, uji popup 320/360/390 portrait, 568 landscape, verifikasi scroll/title/nav/badge/klik integrasi serta visual di Android fisik.
