# QA Antarmuka — v0.13

Checklist visual setelah hard reload (`Ctrl+F5`):

1. **Halte tengah BRT**: dua tombol Sebelumnya/Berikutnya tetap 50:50 dan tidak keluar kartu.
2. **Terminus**: tombol navigasi tunggal memenuhi lebar footer.
3. **Popup integrasi kompleks**: daftar integrasi dapat di-scroll tanpa mendorong footer keluar popup.
4. **KA Jarak Jauh**: header tampil tanpa logo dan tanpa slot kosong di sisi kiri.
5. **KRL Commuter Line / MRT / LRT**: identitas operator tetap terdeteksi dan target integrasi tidak berpindah ke BRT hanya karena nama titik sama.
6. **Status integrasi**: `Dalam Pembangunan`, `Rencana`, dan status lain tampil sebagai chip terpisah dari nama titik.
7. **Popup close**: setelah popup ditutup, label halte/stasiun kembali mengikuti aturan decluttering normal.
8. **Mobile <= 760 px**: popup tidak melewati viewport; action/footer tetap dapat digunakan.
9. **Legenda**: label publik **Gagasan WebGIS** berada pada kelompok Eksplorasi WebGIS.

v0.13 tidak mengubah GeoJSON atau urutan navigasi.


## Struktur jalur rail

- Legenda Struktur Jalur hanya muncul untuk jaringan rail yang memiliki atribut struktur yang dikenali.
- Kategori publik: Layang, Permukaan, Transisi, Bawah tanah.
- Saat moda BRT dipilih, bagian Struktur Jalur Kereta harus tersembunyi.
- Warna tetap mengikuti identitas lin; pola dash utama tetap mengikuti status jaringan.
