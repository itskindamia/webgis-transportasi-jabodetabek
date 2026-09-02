# QA Antarmuka — v0.13.10

Checklist visual setelah deploy/reload keras (`Ctrl+F5`):

1. **ASEAN — Koridor 1 arah Kota**: Google Maps dan Sumber Data sama-sama terbaca; Sebelumnya = Blok M, Berikutnya = Masjid Agung.
2. **Galunggung — Koridor 4 menuju Galunggung**: tombol tunggal Sebelumnya memenuhi lebar footer dan tidak terpotong.
3. **Halte tengah** (mis. Manggarai Koridor 4): dua tombol navigasi 50:50 dan nama panjang terpotong dengan ellipsis, bukan keluar kartu.
4. **Simpul integrasi kompleks** (mis. Galunggung/Dukuh Atas): area integrasi dapat di-scroll dan footer tetap terlihat.
5. **Panel kiri desktop**: Halte Terpilih lebih pendek dibanding v0.13.4; daftar halte mendapat ruang tambahan.
6. **Mobile <= 760 px**: Halte Terpilih kembali bertumpuk; popup tidak melewati viewport dan action/footer tetap dapat digunakan.
7. **Sumber Data dibuka**: detail dapat memanjang/scroll tanpa mendorong footer keluar popup.

Tidak ada perubahan data pada v0.13.7.

## Tambahan QA v0.13.7

- Pencarian global: placeholder tidak terpotong pada desktop 100% zoom.
- Keyboard: Tab menampilkan fokus yang jelas pada daftar halte dan action popup.
- Halte terpilih: state visual tidak berubah, dan `aria-current=true` hanya berada pada halte logis aktif.
- Tidak ada perubahan data pada v0.13.7.
