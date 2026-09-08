# WebGIS Transportasi Jabodetabek v0.13

Paket ini adalah versi lengkap WebGIS statis untuk GitHub Pages. Salin seluruh isi direktori ke root situs agar struktur `index.html`, `css/`, `js/`, `data/`, dan `assets/` tetap sama.

## Perubahan v0.13

- Badge **Gagasan WebGIS** pada integrasi memakai penjelasan ringkas yang muncul di atas badge dan tidak lagi mendorong/menutupi tombol aksi popup.
- Disclaimer besar tetap dipakai hanya bila titik utama memang berstatus Gagasan WebGIS.


- Legenda **Struktur Jalur Kereta** kini berlaku khusus untuk rail: Layang, Permukaan, Transisi, dan Bawah tanah.
- BRT tidak menerima treatment struktur rail.
- Layang dan Permukaan dibedakan secara halus lewat bobot/casing garis tanpa mengubah warna lin atau pola status.
- Perbaikan runtime/integrasi dari v0.10 tetap dipertahankan.
- **Tidak ada perubahan GeoJSON pada v0.13.** Konflik sequence BRT, kelengkapan Lin Cibubur, dan kelengkapan `SRC_URL` rail tetap dilaporkan sebagai pekerjaan data terpisah.

## Menjalankan dan menguji

Jalankan melalui HTTP lokal, bukan `file://`. Contoh:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000/` dan lakukan hard reload (`Ctrl+F5`).

## Audit sebelum rilis

```bash
node tools/audit.mjs
node tools/audit-navigation.mjs
node --check js/map.js
```

- `audit.mjs` memblokir rilis untuk masalah runtime/kode dan menampilkan kekurangan GeoJSON sebagai **catatan data**.
- `audit-navigation.mjs` tetap ketat terhadap benturan sequence BRT. Jika audit ini gagal, perbaikan harus dilakukan pada GeoJSON; script tidak menutup-nutupi konflik data.

## Checklist browser

1. Semua moda/rute dapat dimuat tanpa error JavaScript.
2. Popup halte/stasiun dapat dibuka dan ditutup; label titik kembali mengikuti decluttering normal setelah popup ditutup.
3. Integrasi Manggarai/Kota tidak jatuh ke halte atau moda lain hanya karena nama sama.
4. Kategori **KA Jarak Jauh** tampil tanpa logo/slot kosong.
5. Pencarian tempat hanya mengirim request setelah Enter/tombol Cari.
6. Tombol Lokasi Saya meminta izin hanya setelah diklik.
7. Atribusi peta tetap terlihat pada desktop dan mobile.

## Batasan data yang masih terbuka

Rilis v0.13 tidak memodifikasi data. Karena itu beberapa catatan masih dapat muncul, antara lain migrasi schema BRT yang belum merata, dua konflik sequence navigasi BRT, cabang Lin Cibubur yang belum lengkap, dan `SRC_URL` rail yang masih kosong.

## Batas penggunaan

WebGIS ini bersifat informatif dan bukan sumber resmi operator. Nilai `SOURCE`/`SRC_URL` merupakan catatan provenance dan tidak otomatis membuktikan lisensi penggunaan data.
