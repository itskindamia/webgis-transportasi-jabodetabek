# Deployment WebGIS Transportasi Jabodetabek

GitHub Pages memublikasikan WebGIS statis dari root branch `main`. Periksa hasil QA pada commit kandidat sebelum merge. Sesudah merge, cocokkan commit deployment Pages dengan SHA hasil merge dan uji kembali popup, panel, integrasi, dan permalink pada situs produksi.

## Perubahan v0.16

### Taxonomy rail v0.16
- MODE baku rail: `MRT`, `LRT`, `KRL`, `KA_BANDARA`, `ICT`.
- `ICT` wajib memakai `SERVICE_TYPE=LOCAL` atau `SERVICE_TYPE=KAJJ`.
- Filter Jenis Layanan menambahkan **KA Bandara** / **KA Antarkota** otomatis setelah route aktual tersedia.
- Data MRT/LRT/KRL eksisting tidak dimigrasikan.
- Pedoman lengkap: `docs/RAIL_SCHEMA_V2.md`.


- Label **Eksplorasi WebGIS** pada legenda Status Jaringan sekarang hanya mengelompokkan **Skenario**.
- Resolver integrasi menerima **KAJJ** dan **KAI_KAJJ** sebagai KA Jarak Jauh secara langsung.
- Antarmuka aktif memakai **PT Sans** lokal.
- Popup stasiun rail menampilkan `STN_CODE` sebagai metadata kecil **Kode stasiun · XXX**, bukan bagian dari judul utama.
- Build 14 September 2026 melakukan hardening GeoJSON terukur: normalisasi identitas BRT, sequence koridor yang terdeteksi bermasalah, dan referensi integrasi yang stale.

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
npm run build:ui
npm run test:regression
```

- Workflow regresi mencatat hasil `audit.mjs` sebagai pembanding data. Bandingkan dengan hasil pada commit dasar dan selidiki setiap temuan baru sebelum rilis.
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

Audit navigasi lulus. Untuk review scoped K1–K10 + rail, pemeriksaan identitas, sequence, route geometry, dan pointer integrasi lulus; audit runtime global masih dapat melaporkan kelengkapan schema/geometri legacy K11–K19 yang memang berada di luar scope build ini. Pekerjaan lanjutan utama tetap kelengkapan `SRC_URL` BRT dan migrasi directional koridor legacy.

## Batas penggunaan

WebGIS ini bersifat informatif dan bukan sumber resmi operator. Nilai `SOURCE`/`SRC_URL` merupakan catatan provenance dan tidak otomatis membuktikan lisensi penggunaan data.
