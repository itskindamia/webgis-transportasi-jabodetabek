# Migrasi kode Lin Rangkasbitung: RA → RK

Mulai baseline v0.13, kode kanonik Lin Rangkasbitung adalah `KRL_RK` dan badge publiknya `RK`.

Perubahan diterapkan pada runtime WebGIS, integrasi BRT yang sudah ada, serta nama aset badge `krl-rk.png`.

Jika data rail berikutnya ditambahkan, gunakan pola berikut:

- `LINE_ID = KRL_RK`
- `LINES = KRL_RK` (atau gabungan dengan lin lain bila relevan)
- `SEQ_MAP = KRL_RK:xx`
- `INTEGRASI` / `INT_NM` menggunakan prefix `KRL_RK`
