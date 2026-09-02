# QA Navigasi Popup — v0.13.10

Audit data otomatis dijalankan pada 19 koridor BRT dan 395 entri halte logis lintas-koridor. Tidak ditemukan benturan sequence antarhalte logis pada field navigasi yang terisi.

## Matriks uji browser yang disarankan

| Kasus | Contoh | Hasil yang diharapkan |
|---|---|---|
| Terminus arah maju | Galunggung, Koridor 4 arah Pulo Gadung → Galunggung | Hanya **Sebelumnya**, selebar footer |
| Terminus arah balik | Galunggung setelah arah dibalik | Hanya **Berikutnya**, selebar footer |
| Halte tengah | Manggarai, Koridor 4 | **Sebelumnya** dan **Berikutnya** tampil 50:50 |
| Split stop | Halte dengan dua titik fisik satu `STOP_GROUP` | Navigasi bergerak per halte logis, bukan menduplikasi titik fisik |
| Koridor dua arah baru | Koridor 1 (`SEQ_A_MAP`/`SEQ_B_MAP`) | Urutan mengikuti side aktif |
| Koridor legacy | Koridor 2–19 | Urutan `SEQ_MAP` dibalik secara konsisten saat arah dibalik |
| Pengalihan | Koridor yang memiliki diversion aktif | Halte `NOT_SERVED` tidak masuk Previous/Next; halte sementara yang aktif dapat masuk |
| Popup kompleks | Galunggung/Dukuh Atas | Integrasi dapat di-scroll; footer tetap terlihat |

Jalankan audit data dengan:

```bash
node tools/audit-navigation.mjs
```

> v0.13.7: Logika navigasi tidak diubah; QA ini dijalankan ulang setelah polishing UI.
