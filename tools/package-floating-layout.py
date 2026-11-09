"""Build a complete, deterministic static-runtime replacement for review."""
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
output = root / 'docs/floating-layout'
output.mkdir(parents=True, exist_ok=True)
source = subprocess.check_output(['git', 'log', '-1', '--format=%H', '--', 'index.html', 'css', 'js'], cwd=root, text=True).strip()
files = [root / 'index.html', root / 'THIRD_PARTY_NOTICES.md']
for directory in ['assets', 'css', 'data', 'js']:
    files.extend(p for p in (root / directory).rglob('*') if p.is_file())
entries = {str(p.relative_to(root)): p.read_bytes() for p in sorted(files)}
entries['BACA_DULU.md'] = f'''# Paket runtime WebGIS — siap review

Sumber runtime: {source}
Repositori: https://github.com/itskindamia/webgis-transportasi-jabodetabek
Branch: codex/floating-network-layout

Paket ini adalah penggantian penuh runtime statis, bukan overlay potongan kode.
`index.html`, `assets/`, `css/`, `data/`, dan `js/` disertakan lengkap.
Empat GeoJSON, mesin transportasi, logo, ikon, PT Sans lokal 400/700, dan CSS
hasil build tersedia. `node_modules` tidak dibutuhkan untuk menjalankan runtime.
Dependensi development dan tes ada di branch sumber beserta package-lock.json.

## Preview lokal

1. Ekstrak ZIP ke folder kosong.
2. Dari folder itu, jalankan `python3 -m http.server 8000`.
3. Buka http://localhost:8000/ di browser. Jangan buka index.html melalui file://.

Koneksi internet tetap diperlukan untuk Leaflet 1.9.4 dari CDN (dengan SRI dan
fallback CDN), tile basemap serta pencarian tempat daring, sesuai konfigurasi
proyek semula. Font, data jaringan, logo, ikon dan CSS aplikasi disertakan lokal.
GPS memerlukan izin browser; localhost atau HTTPS diperlukan untuk lokasi.

## Penerapan setelah review

Tugas ini belum melakukan merge atau deploy. Sesudah disetujui, backup runtime
lama, lalu ganti index.html serta keempat direktori runtime dengan isi paket ini.
Jangan menyalin .git, node_modules, atau kredensial ke hosting. Daftar hash file
tersedia di SHA256SUMS. Lisensi komponen tetap ada dalam paket.
'''.encode()
entries['SHA256SUMS'] = ''.join(f'{hashlib.sha256(data).hexdigest()}  {name}\n' for name, data in sorted(entries.items())).encode()
archive = output / 'webgis-runtime.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
    for name, data in sorted(entries.items()):
        info = zipfile.ZipInfo(name, date_time=(2026, 11, 9, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        target.writestr(info, data)
with zipfile.ZipFile(archive) as target:
    assert target.testzip() is None
    assert set(target.namelist()) == set(entries)
    for name in entries:
        assert target.read(name) == entries[name]
report = {'file': archive.name, 'runtimeCommit': source, 'files': len(entries), 'bytes': archive.stat().st_size,
          'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'type': 'complete static runtime replacement'}
(output / 'verification/package.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
