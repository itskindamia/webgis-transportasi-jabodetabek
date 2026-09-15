# QA Navigasi Popup — v0.16

> Review/fix 14 September ini difokuskan pada K1–K10 + rail. Membership/sequence K11–K19 tidak diubah pada build scoped ini.

`tools/audit-navigation.mjs` memeriksa sequence BRT yang menjadi dasar tombol **Sebelumnya/Berikutnya**.

## Status dataset pada 14 September 2026

Audit navigasi sudah menggunakan `STOP_ID` sebagai identitas halte logis, sama seperti runtime. `STOP_GROUP` hanya menjadi fallback kompatibilitas bila `STOP_ID` tidak tersedia.

Perbaikan data yang sudah masuk:

- Benturan `STOP_ID` antarhalte berbeda sudah dihilangkan.

K1 masih memiliki nomor `02` yang sama pada **field legacy `SEQ_MAP`** untuk ASEAN dan Kejaksaan Agung. Ini tidak menjadi blocker karena koridor tersebut sudah memakai `SEQ_A_MAP`/`SEQ_B_MAP` sebagai sumber navigasi directional.

## Matriks uji browser

| Kasus | Hasil yang diharapkan |
|---|---|
| Terminus | hanya satu tombol navigasi, selebar footer |
| Halte tengah | Sebelumnya dan Berikutnya tampil 50:50 |
| Split stop | navigasi bergerak per `STOP_ID`, bukan per `GEOM_ID` |
| Koridor directional | urutan mengikuti `SEQ_A_MAP`/`SEQ_B_MAP` ketika tersedia |
| Koridor legacy | `SEQ_MAP` tetap dipakai sebagai fallback |
| Pengalihan | titik yang tidak dilayani tidak masuk urutan aktif |
| Relokasi halte tanpa diversion geometri | `OPS_MAP=TEMP_SERVED` tetap dapat mengaktifkan halte TEMPORARY |
| Popup kompleks | daftar integrasi dapat di-scroll dan footer tetap terlihat |

Jalankan:

```bash
node tools/audit-navigation.mjs
```
