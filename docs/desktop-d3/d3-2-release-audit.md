# D3.2 · Audit regresi historis dan kesiapan rilis

Baseline D3.1 `b63e89a` mencatat **144/157 lulus dan 13 gagal** di CI. Putaran lokal D3.1 mencatat 143/157 dengan satu kegagalan tambahan yang intermiten pada pemulihan kamera tur di 390 px. Angka resmi menggunakan tes repository. [CI D3.1](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/45912031729/job/140222421950)

## Diagnosis terpisah

Diagnosis menggunakan salinan tes di luar suite dan menjalankannya terhadap aplikasi D3.1 asli. Salinan dipakai untuk melewati asumsi markup lama sambil mempertahankan pemeriksaan fungsi setelahnya. Hasil diagnosis membantu menentukan perbaikan QA. Ke-13 kasus tetap gagal pada laporan resmi baseline.

| Jumlah | Kegagalan resmi | Diagnosis pada D3.1 |
| ---: | --- | --- |
| 1 | `test-layout-refinement.mjs` menunggu `#tlDetailResume` di dalam sheet LRT yang sedang disembunyikan. | Membuka Detail dari `#tlMobileDetails` lulus untuk Mini/Sedang/Penuh, tab, seleksi, URL, kamera, dan pengembalian popup. |
| 2 | `test-layout-release.mjs` mewajibkan teks petunjuk scroll LRT yang sudah disembunyikan oleh gaya mobile aktif. | Menguji area scroll aktif dan tombol yang dapat dijangkau lulus, termasuk portrait 320/360/390 px dan landscape 568×320. Pemeriksaan kamera, kontrol peta, serta tombol sumber juga berjalan. |
| 9 | `test-lrt-popup.mjs` membaca `.lrt-line-symbol`, padahal popup sudah memakai gambar badge asli. | Pemeriksaan aset yang benar-benar termuat, label, warna, dan nomor/nama lin lulus. Pemeriksaan lanjutan turut lulus untuk navigasi dua cabang Cawang, sumber, clipping, serta enam viewport. Pemeriksaan warna teks Maps mengikuti gaya netral D3.1 pada desktop. |
| 1 | Tes tur LRT 390 px menuntut `scrollTop > 0` setelah menggulir menuju footer yang berada di luar area scroll. Konten Velodrome juga muat di fixture ini. | Pada fixture Dukuh Atas yang benar-benar overflow, menggulir isi lalu membuka dan menutup tur memulihkan posisi gulir, pilihan, tab, dan URL. |

Putaran diagnostik pertama memberi 12/13. Kasus yang tersisa lulus dengan fixture Dukuh Atas yang benar-benar perlu digulir. Audit ini mendukung pembaruan ekspektasi dan fixture dalam perubahan QA tersendiri. Pemeriksaan aset, aksesibilitas aksi, kamera, dan pemulihan state perlu tetap dipertahankan setelah pembaruan.

## Keputusan rilis

**Tahan publikasi.** Tiga belas kasus persisten masih merah pada suite resmi. Perbaiki tes lama dalam review QA terpisah, lalu jalankan ulang suite dan periksa kembali kasus tur 390 px yang intermiten. Pertahankan ambang kamera yang ada saat mencari penyebab intermitensi. Audit data sebelumnya juga mencatat duplikasi `STOP_ID` halte dan `GEOM_ID` rute BRT. Temuan itu memerlukan penilaian terpisah dari pilihan tampilan.

Setelah perubahan dan bukti QA disetujui, integrasikan #33, #34, dan D3.2 ke `main` secara berurutan dengan pemeriksaan ulang tiap base. Setelah GitHub Pages melaporkan deployment dari commit `main` yang disetujui, buka situs publik pada profil browser bersih. Uji Popup default, preferensi Panel setelah reload, tautan langsung stasiun, Cawang di dua lin, integrasi Dukuh Atas ke MRT, serta popup pada mobile. Cocokkan commit deployment, periksa pemuatan GeoJSON/aset dari cache bersih, dan periksa console serta jaringan browser. [Situs GitHub Pages](https://itskindamia.github.io/webgis-transportasi-jabodetabek/)
