# Rilis live terverifikasi — 6 November 2026

Website: https://itskindamia.github.io/webgis-transportasi-jabodetabek/

| Pemeriksaan | Hasil |
| --- | --- |
| Main sebelum finalisasi | `10abd9eb918d81c9bd0f696d1e3742615c28ca37` |
| Main sesudah merge/publish | `2900440884f9887343a2e440cb8b4479e2d8f2b9` |
| PR #3 | Merge `ba838579eacd24f20301205e3f404910be96a5bc` |
| PR #4 | Merge `2900440884f9887343a2e440cb8b4479e2d8f2b9`; head yang disetujui `4e4264eeeeb4cb5803f48d2e54e3ee786ced9cc2` |
| Build/deploy Pages | **Success**, run [42245462828](https://github.com/itskindamia/webgis-transportasi-jabodetabek/actions/runs/42245462828) |
| Pages build terbaru | `built`, commit main rilis di atas |
| Deployment environment | `success`, URL produksi sesuai |
| Smoke test browser produksi | **Lulus**, Chromium 155, 6 November 2026 pukul 22:45 WIB |
| Regresi sebelum merge | 50/50 lulus; 5/5 uji ulang perubahan landscape lulus; PR #3 19/19 lulus |
| Integritas | Delapan hash terlindungi cocok; GeoJSON dan `js/map.js` tidak berubah |

Refinement akhir mencakup popup landscape dua kolom, spacing portrait, petunjuk
scroll, pemulihan panel detail dan ruang kontrol tablet, serta cache-busting URL
CSS/JS. PT Sans 400/700 lokal, metadata aktual kedua operator LRT, status,
struktur, integrasi, sumber dan navigasi sesuai lin tetap tersedia. Tidak ada
perubahan data jaringan, A01/A02, migrasi database atau domain.

## Bukti smoke test

[smoke.json](smoke.json) menyimpan waktu, browser, checksum, semua respons dan
state screenshot. [deployment.json](deployment.json) menyimpan status workflow,
Pages build dan deployment environment. Pengujian menemukan:

- 477 respons resource berhasil; **23 resource aplikasi** cocok checksum dengan
  source main rilis. Tidak ada respons gagal/404 atau error JavaScript/console
  dalam skenario yang diuji.
- Keempat GeoJSON termuat dengan HTTP 200 dan byte identik.
- PT Sans regular 400 dan bold 700 benar-benar termuat.
- Velodrome, Halim dan Cawang multi-lin menampilkan operator/lin yang benar.
- Peralihan BK→CB dan navigasi stasiun berikutnya mengikuti konteks lin.
- Maps, sumber, zoom dan close popup dapat dijangkau pada kedua landscape.

Respons berasal dari website/CDN sesungguhnya melalui proxy lingkungan.
Transport Python memverifikasi TLS memakai CA runtime; Chromium mengeksekusi
byte respons tersebut. Tidak digunakan stub HTML, font, data maupun tile.

| Screenshot situs live | File |
| --- | --- |
| Velodrome desktop 1366×900 | [live-velodrome-desktop.png](live-velodrome-desktop.png) |
| Cawang multi-lin 390×844 | [live-cawang-mobile.png](live-cawang-mobile.png) |
| Landscape 568×320 | [live-landscape-568.png](live-landscape-568.png) |
| Landscape 844×390 | [live-landscape-844.png](live-landscape-844.png) |

Empat gambar live ini melengkapi 14 screenshot akhir sebelum publish yang sudah
tersedia pada main di `docs/release-20261106/screenshots/`.

## Catatan yang tersisa

Audit navigasi lulus. Dua audit data tetap gagal pada temuan identitas/metadata/
pointer lama dengan output identik baseline. Perangkat fisik dan Safari iOS
belum diuji; pengujian pan/zoom bukan benchmark FPS ponsel kelas rendah.

Deployment PR #3 pertama timeout sebelum rilis final. Metadata retry lama pada
API masih menampilkan queued; endpoint pembatalan menyatakan run telah selesai,
sedangkan endpoint force-cancel menyatakan re-run belum queued (HTTP 409).
Status tersebut dicatat apa adanya pada `deployment.json`. Rilis final memakai
workflow, Pages build dan deployment baru yang semuanya sukses pada SHA main
`2900440`, dan respons live cocok dengan SHA ini.

Deployment GitHub yang ditemukan hanya environment `github-pages`. Tidak ada
layanan Cloudflare baru, perubahan domain atau pengalihan hosting.

## Rollback tanpa force-push

Backup: `backup/production-20261106-10abd9e`, menunjuk produksi sebelumnya.
Jika rollback diperlukan, revert kedua merge melalui branch rollback, periksa
diff terhadap backup, lalu gabungkan hasilnya ke main dan tunggu Pages sukses:

```sh
git fetch origin
git switch -c rollback/ui-20261106 origin/main
git revert --no-commit -m 1 2900440884f9887343a2e440cb8b4479e2d8f2b9
git revert --no-commit -m 1 ba838579eacd24f20301205e3f404910be96a5bc
git diff --cached origin/backup/production-20261106-10abd9e
git commit -m "revert: restore UI before release 20261106"
git push -u origin rollback/ui-20261106
```

Dengan main belum memiliki perubahan lanjutan, diff terhadap backup harus kosong.
Rollback ini hanya didokumentasikan, tidak dijalankan.

Bukti pascapublikasi disimpan di branch dokumentasi
`docs/release-20261106-verification` agar penambahan bukti tidak memicu deployment
ulang atau mengubah SHA main yang sudah diverifikasi.
