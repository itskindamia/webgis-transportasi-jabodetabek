# WebGIS Transportasi Jabodetabek v0.13.10

Paket ini adalah versi lengkap WebGIS statis untuk GitHub Pages. Salin seluruh
isi direktori ini ke root situs agar `index.html`, `css/`, `js/`, `data/`, dan
`assets/` tetap berada pada struktur yang sama.

## Perubahan v0.13.10

- Mengganti label publik status **Konseptual** menjadi **Gagasan** agar lebih mudah dipahami pengguna umum.
- Definisi **Gagasan**: ide pengembangan jaringan yang disusun untuk eksplorasi dalam WebGIS dan bukan merupakan rencana resmi pemerintah atau operator transportasi.
- Nilai internal `Conceptual` serta nilai data lama `Konseptual` tetap didukung untuk kompatibilitas, sehingga GeoJSON tidak perlu dimigrasikan pada rilis ini.
- Tidak ada perubahan integrasi, sequence, geometri, maupun logika navigasi.

## Perubahan v0.13.9

- Menetralkan definisi status **Dalam Pembangunan** menjadi “jaringan moda yang telah memasuki tahap konstruksi fisik dan belum beroperasi”.
- Menghapus pemakaian istilah **non-BRT** sebagai kategori umum pada penjelasan status, legenda, dan metodologi agar istilah tersebut tetap dapat digunakan secara spesifik untuk layanan TransJakarta non-BRT.
- Tidak ada perubahan GeoJSON, integrasi, sequence, status data, maupun logika navigasi.

## Perubahan v0.13.8

- Memulihkan border atas accordion **Kredit Aset Visual** pada panel **Informasi & Catatan** agar konsisten dengan tiga accordion lainnya.
- Tidak ada perubahan GeoJSON, integrasi, sequence, status, maupun logika navigasi.

## Perubahan v0.13.7

- Dokumentasi QA dan deployment dipindahkan ke folder `docs/` agar root situs lebih ringkas.
- Log validasi rutin JavaScript dibungkam pada mode produksi melalui `APP_DEBUG = false`; warning/error data tetap aktif.
- Audit rilis memeriksa mode debug produksi dan keberadaan dokumen inti.
- Tidak ada perubahan GeoJSON, integrasi, sequence, status, maupun tata letak antarmuka.

## Menjalankan dan menguji

Jalankan melalui HTTP lokal, bukan dengan membuka `index.html` memakai skema
`file://`. Contoh:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000/`. Sebelum publikasi, uji sekurangnya:

1. pemuatan semua rute dan halte/stasiun;
2. pencarian lokal serta pencarian tempat melalui tombol **Cari** atau Enter;
3. tombol **Lokasi Saya** dan alur izin browser;
4. popup halte/stasiun kompleks, termasuk footer **Sebelumnya/Berikutnya** pada viewport pendek;
5. atribusi OpenStreetMap dan Leaflet pada desktop serta ponsel;
6. konsol browser untuk error data, JavaScript, atau aset yang hilang.

## Audit sebelum rilis

Selain pemeriksaan browser, jalankan:

```bash
node tools/audit.mjs
node tools/audit-navigation.mjs
node --check js/map.js
```

`audit-navigation.mjs` memeriksa sequence BRT yang menjadi dasar urutan
Sebelumnya/Berikutnya dan menolak benturan sequence antarhalte logis.

## Ketentuan operasional layanan pihak ketiga

- **OpenStreetMap Standard Tiles** memakai URL resmi dan atribusi yang terlihat.
  Jangan menyembunyikan atribusi, melakukan bulk download, atau menghindari
  cache HTTP bawaan browser.
- **Nominatim publik** hanya dipanggil setelah tindakan eksplisit pengguna,
  diserialkan dengan jeda sedikit di atas satu detik, dan memiliki cache sesi.
  Jangan mengaktifkan kembali autocomplete jaringan pada setiap ketikan.
- **Geolocation** hanya diminta setelah pengguna menekan tombol **Lokasi Saya**.
  Pertahankan penjelasan privasi di dalam aplikasi.

Kebijakan penyedia dapat berubah. Tinjau kembali tautan pada
`../THIRD_PARTY_NOTICES.md` sebelum setiap rilis besar.

## Batasan

WebGIS ini bersifat informatif dan bukan sumber resmi operator. Fokus versi
ini adalah visualisasi jaringan, pelayanan, serta integrasi antarmoda; fitur
radius/buffer akses halte dan stasiun tidak ditampilkan. Paket ini meningkatkan
kepatuhan teknis dan transparansi, tetapi bukan opini atau jaminan hukum.

## Lisensi proyek

Lisensi kode aplikasi belum dinyatakan dalam paket sumber. Tanpa file `LICENSE`
yang dipilih pemegang hak, hak cipta kode tetap pada pemegang hak dan tidak ada
lisensi penggunaan ulang yang diberikan secara tersirat. Komponen pihak ketiga
tetap mengikuti lisensi masing-masing sebagaimana dicatat dalam
`../THIRD_PARTY_NOTICES.md`.
