"""Package the complete static runtime, with hashes and a pinned source commit."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source-commit')
args = parser.parse_args()
source = args.source_commit or subprocess.check_output(
    ['git', 'log', '-1', '--format=%H', '--', 'index.html', 'js/layout-tabler.js'],
    cwd=root, text=True,
).strip()
baseline = '46c3913042934b67712327d566e34c287178845e'
output = root / 'docs/object-zoom'
output.mkdir(parents=True, exist_ok=True)
files = [root / 'index.html', root / 'THIRD_PARTY_NOTICES.md']
for directory in ['assets', 'css', 'data', 'js']:
    files.extend(p for p in (root / directory).rglob('*') if p.is_file())
entries = {str(p.relative_to(root)): p.read_bytes() for p in sorted(files)}
entries['BACA_DULU.md'] = f'''# WebGIS — layout lama, zoom objek penuh

Sumber runtime: {source}
Layout dasar: {baseline}
Versi: full-object-zoom-20261109-1

Paket penggantian penuh runtime statis: index.html, assets/, css/, data/, js/,
dan lisensi disertakan lengkap. Tidak memuat layout floating eksperimental.
Data jaringan, font PT Sans dan struktur panel mengikuti layout dasar.

Zoom rute menggunakan seluruh geometri tanpa tambahan buffer geografis.
Langkah zoom pecahan membuat extent lebih rapat mengisi ruang peta yang tersedia.
Kontrol peta dan panel yang terlihat tetap mendapat ruang. Tombol Pusatkan
memakai extent yang sama tanpa menghapus pilihan rute atau filter.

## Preview

Ekstrak ke folder kosong, jalankan python3 -m http.server 8000 dari folder itu,
lalu buka http://localhost:8000/. Jangan membuka index.html melalui file://.
CDN Leaflet, tile basemap, dan geocoding tetap memerlukan internet.
SHA256SUMS memuat hash seluruh berkas paket selain daftar hash itu sendiri.

Paket ini disiapkan untuk review. Merge dan deployment tidak dilakukan oleh
script packaging ini. Simpan salinan runtime lama sebelum mengganti hosting.
'''.encode()
entries['SHA256SUMS'] = ''.join(
    f'{hashlib.sha256(data).hexdigest()}  {name}\n'
    for name, data in sorted(entries.items())
).encode()
archive = output / 'webgis-layout-lama-zoom-penuh.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as target:
    for name, data in sorted(entries.items()):
        info = zipfile.ZipInfo(name, date_time=(2026, 11, 9, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        target.writestr(info, data, compresslevel=9)
with zipfile.ZipFile(archive) as target:
    assert target.testzip() is None
    assert set(target.namelist()) == set(entries)
    for name, content in entries.items():
        assert target.read(name) == content, name
metadata = {
    'file': archive.name, 'sourceCommit': source, 'layoutBaseline': baseline,
    'files': len(entries), 'bytes': archive.stat().st_size,
    'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
    'type': 'complete static runtime replacement',
}
(output / 'package.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata))
