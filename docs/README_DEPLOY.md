# WebGIS Transportasi Jabodetabek v0.16

Paket ini adalah versi lengkap WebGIS statis untuk GitHub Pages. Salin seluruh isi direktori ke root situs agar struktur `index.html`, `css/`, `js/`, `data/`, dan `assets/` tetap sama.

## Perubahan v0.16

### Taxonomy rail v0.16
- MODE baku rail: `MRT`, `LRT`, `KRL`, `KA_BANDARA`, `ICT`.
- `ICT` wajib memakai `SERVICE_TYPE=LOCAL` atau `SERVICE_TYPE=KAJJ`.
- Filter Jenis Layanan menambahkan **KA Bandara** / **KA Antarkota** otomatis setelah route aktual tersedia.
- Data MRT/LRT/KRL eksisting tidak dimigrasikan.
- Pedoman lengkap: `docs/RAIL_SCHEMA_V2.md`.


- Label **Eksplorasi WebGIS** pada legenda Status Jaringan sekarang hanya mengelompokkan **Gagasan WebGIS**.
- Resolver integrasi menerima **KAJJ** dan **KAI_KAJJ** sebagai KA Jarak Jauh secara langsung.
- Fallback font mempertahankan **Avenir Next Local** sebagai pilihan pertama ketika tersedia pada sistem pengguna.
- Popup stasiun rail menampilkan `STN_CODE` sebagai metadata kecil **Kode stasiun · XXX**, bukan bagian dari judul utama.
- **Tidak ada perubahan feature GeoJSON eksisting pada v0.16.**

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

1. Semua jenis layanan/rute dapat dimuat tanpa error JavaScript.
2. Popup halte/stasiun dapat dibuka dan ditutup; label titik kembali mengikuti decluttering normal setelah popup ditutup.
3. Integrasi Manggarai/Kota tidak jatuh ke halte atau moda lain hanya karena nama sama.
4. Kategori **KA Jarak Jauh** tampil tanpa logo/slot kosong.
5. Pencarian tempat hanya mengirim request setelah Enter/tombol Cari.
6. Tombol Lokasi Saya meminta izin hanya setelah diklik.
7. Atribusi peta tetap terlihat pada desktop dan mobile.
8. KA Bandara / KA Antarkota tidak muncul sebagai kategori kosong; keduanya baru tampil setelah route aktual tersedia.

## Batasan data yang masih terbuka

Rilis v0.16 tidak memodifikasi feature GeoJSON eksisting. Karena itu beberapa catatan masih dapat muncul, antara lain migrasi schema BRT yang belum merata, dua konflik sequence navigasi BRT, cabang Lin Cibubur yang belum lengkap, dan `SRC_URL` rail yang masih kosong.

## Batas penggunaan

WebGIS ini bersifat informatif dan bukan sumber resmi operator. Nilai `SOURCE`/`SRC_URL` merupakan catatan provenance dan tidak otomatis membuktikan lisensi penggunaan data.
