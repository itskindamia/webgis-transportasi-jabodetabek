# Schema Rail v2.0 — WebGIS Transportasi Jabodetabek

Tanggal: 9 September 2026  
Baseline runtime: v0.16

## 1. Taxonomy MODE

| Label publik | Nilai `MODE` | Keterangan |
|---|---|---|
| MRT | `MRT` | Moda MRT |
| LRT | `LRT` | LRT Jakarta / LRT Jabodebek; operator dibedakan lewat `OPERATOR` |
| KRL | `KRL` | KRL Commuter Line |
| KA Bandara | `KA_BANDARA` | Layanan kereta bandara |
| KA Antarkota | `ICT` | Kelompok layanan antarkota/intercity |

Alias legacy `KAI_BANDARA` dan `AIRPORT_RAIL` dinormalisasi menjadi `KA_BANDARA`. Alias MODE legacy `KAJJ` / `KAI_KAJJ` tetap dibaca sebagai `ICT`, tetapi data baru sebaiknya langsung memakai nilai baku di atas.

## 2. SERVICE_TYPE untuk KA Antarkota

`SERVICE_TYPE` hanya wajib ketika `MODE=ICT`.

| Label publik | Nilai `SERVICE_TYPE` |
|---|---|
| KA Lokal | `LOCAL` |
| KA Jarak Jauh | `KAJJ` |

Untuk MRT, LRT, KRL, dan KA Bandara, `SERVICE_TYPE` boleh kosong.

## 3. rail_route.geojson

Field inti yang disarankan:

`LINE_ID`, `GEOM_ID`, `LINE_NAME`, `MODE`, `SERVICE_TYPE`, `OPERATOR`, `STATUS`, `STRUCTURE`, `COLOR`, `RELATION`, `SOURCE`, `SRC_URL`, `REMARK`.

Contoh properti rute KA Lokal Leuwiliang (geometri tidak ditampilkan):

```json
{
  "LINE_ID": "ICT_LL",
  "GEOM_ID": "ICT_LL_01",
  "LINE_NAME": "KA Lokal Leuwiliang",
  "MODE": "ICT",
  "SERVICE_TYPE": "LOCAL",
  "OPERATOR": "",
  "STATUS": "Rencana",
  "STRUCTURE": "AT_GRADE",
  "COLOR": "",
  "RELATION": "Bojonggede - Rangkasbitung",
  "SOURCE": "JUTPI-3",
  "SRC_URL": "",
  "REMARK": "Relasi mengikuti skenario/sumber yang dicantumkan."
}
```

## 4. rail_stop.geojson

Field inti yang disarankan:

`STOP_ID`, `GEOM_ID`, `STOP_NAME`, `DISPLAY_NM`, `STN_CODE`, `MODE`, `SERVICE_TYPE`, `OPERATOR`, `STATUS`, `STRUCTURE`, `LINES`, `STOP_ROLE`, `SEQ_MAP`, `INTEGRASI`, `INT_NM`, `INT_STOP`, `SOURCE`, `SRC_URL`, `REMARK`.

Contoh properti titik ICT:

```json
{
  "STOP_ID": "ICTLL001",
  "GEOM_ID": "ICTLL001_01",
  "STOP_NAME": "Bojonggede",
  "DISPLAY_NM": "Bojonggede",
  "STN_CODE": "BJD",
  "MODE": "ICT",
  "SERVICE_TYPE": "LOCAL",
  "STATUS": "Rencana",
  "STRUCTURE": "AT_GRADE",
  "LINES": "ICT_LL",
  "STOP_ROLE": "Terminus",
  "SEQ_MAP": "ICT_LL:01"
}
```

## 5. Aturan UI

- Dropdown publik memakai **KA Bandara** dan **KA Antarkota**, bukan kode internal.
- Opsi tersebut hanya muncul bila ada route aktual pada `rail_route.geojson`.
- Saat `MODE=ICT`, dropdown lin dikelompokkan menjadi **KA Lokal** dan **KA Jarak Jauh** berdasarkan `SERVICE_TYPE`.
- Popup `MODE=ICT; SERVICE_TYPE=LOCAL` memakai header **STASIUN KA LOKAL**.
- Popup `MODE=ICT; SERVICE_TYPE=KAJJ` memakai header **STASIUN KA JARAK JAUH**.
- Integrasi legacy `KAJJ` pada popup KRL tetap didukung agar data eksisting Manggarai dan titik lain tidak rusak.

## 6. Migrasi data eksisting

Tidak perlu mengubah MRT/LRT/KRL yang sudah ada. Jangan menambahkan `SERVICE_TYPE` kosong secara massal hanya demi schema. Tambahkan field tersebut ketika feature ICT pertama dibuat di geodatabase/GeoJSON.

Untuk KA Bandara sebagai lin aktual, gunakan `MODE=KA_BANDARA`. Untuk KA Jarak Jauh sebagai layer aktual, gunakan `MODE=ICT` dan `SERVICE_TYPE=KAJJ`.


### Catatan nomenklatur UI v0.16
Antarmuka publik menggunakan istilah **Jenis Layanan** / **Semua Layanan**. Nama field schema tetap `MODE` agar kompatibel dengan data dan adapter runtime.
