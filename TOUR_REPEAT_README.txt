V6 — Repeating Startup Tutorial
15 September 2026

Tujuan:
- Tutorial Cara Menggunakan tampil sekali setiap halaman/WebGIS dibuka ulang.
- Disclaimer/Tentang Peta tetap hanya perlu diterima sekali melalui localStorage.
- Pengguna lama dapat menekan Lewati kapan saja.
- Tombol Cara Menggunakan tetap dapat membuka tutorial secara manual.

Perubahan utama:
1. startStartupExperience(): kebutuhan tour dibuat selalu true per page load.
2. closeInfoModalAndContinueStartup(): startup tour tetap dilanjutkan setelah modal awal ditutup walau tour pernah diselesaikan.
3. Progress label menambahkan "PENGINGAT SINGKAT".
4. Animasi existing dipertahankan: spotlight bergerak, marker pulse, highlight daftar halte, dan pulse badge rute.

Tour tidak dipanggil ulang saat user mengganti rute/filter; hanya sekali pada proses startup setiap page load.


V7 FINAL TOUR HARDENING — 15 Sep 2026
- Restore state: center/zoom, collapse sidebar, flyout Search/Legenda, panel mobile, basemap panel, dan konteks rute tidak ditinggalkan dalam state demo.
- Tip 2: pulse marker dibatasi dua siklus lalu menjadi ring statis.
- Tip 4: popup demo memakai autoPan=false dan pulse badge dibatasi dua siklus agar frame stabil.
- Tip 5: panel Cari Lokasi asli dibuka dan difokuskan; mock search pada kartu tutorial disembunyikan.
