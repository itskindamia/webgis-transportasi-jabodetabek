# PT Sans

Font utama aplikasi: `"PT Sans", Arial, sans-serif`.

Hanya dua face normal dipakai: Regular **400** dan Bold **700**. Berkas Latin
WOFF2 yang sudah dibangun diambil dari distribusi Fontsource PT Sans; font tidak
dikonversi atau dimodifikasi dalam repository ini. Glyph yang tidak tersedia
menggunakan fallback Arial/sans-serif. Lisensi OFL 1.1 disertakan di `OFL.txt`.

| Berkas | Ukuran | SHA-256 | Blob sumber Fontsource |
| --- | --- | --- | --- |
| pt-sans-latin-400-normal.woff2 | 45.532 byte | `2dea6190c113af617923c6b71f7f10ffbdf72074556f79963610254fe40e49be` | `0a75bf948d100ef45c38668f596d1c6b7ab06ea6` |
| pt-sans-latin-700-normal.woff2 | 47.180 byte | `05ea99a48ece3c624fd9df15f5cf4e1d94703bde9ed2b384495900f55e28befe` | `b4bbe89694de172f65e5e3f50a838c29cf149852` |

Sumber: https://github.com/fontsource/font-files/tree/main/fonts/pt-sans

Lisensi resmi: https://github.com/google/fonts/blob/main/ofl/ptsans/OFL.txt

Regular dipreload dengan URL identik yang digunakan `@font-face`; browser
menggunakan respons yang sama, bukan mengunduh dua kali. Bold diminta ketika
teks bold pertama dirender. `font-display: swap` menjaga teks tetap tersedia
selama pemuatan awal; tidak ada ketergantungan font eksternal saat runtime.
Basemap tetap berupa tile dari penyedia dan font di dalam gambarnya tidak diubah.
