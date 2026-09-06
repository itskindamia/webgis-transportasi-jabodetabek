# QA Navigasi Popup — v0.12

`tools/audit-navigation.mjs` memeriksa sequence BRT yang menjadi dasar tombol **Sebelumnya/Berikutnya**.

## Status dataset pada 5 September 2026

Audit masih menemukan dua konflik data yang **tidak diperbaiki pada v0.12 karena GeoJSON sengaja tidak diubah**:

- `BRT_11` — `SEQ_MAP` sequence `16` dipakai dua halte logis: `BRT067` dan `BRT215`.
- `BRT_16` — `SEQ_MAP` sequence `22` dipakai dua halte logis: `BRT016` dan `BRT200`.

Sampai data tersebut diperbaiki, audit navigasi memang seharusnya tetap gagal; jangan mengubah script audit hanya untuk menyembunyikan konflik.

## Matriks uji browser

| Kasus | Hasil yang diharapkan |
|---|---|
| Terminus | hanya satu tombol navigasi, selebar footer |
| Halte tengah | Sebelumnya dan Berikutnya tampil 50:50 |
| Split stop | navigasi bergerak per halte logis, bukan per titik fisik |
| Koridor directional | urutan mengikuti `SEQ_A_MAP`/`SEQ_B_MAP` ketika tersedia |
| Koridor legacy | `SEQ_MAP` dibalik secara konsisten saat arah dibalik |
| Pengalihan | titik yang tidak dilayani tidak masuk urutan aktif |
| Popup kompleks | daftar integrasi dapat di-scroll dan footer tetap terlihat |

Jalankan:

```bash
node tools/audit-navigation.mjs
```
