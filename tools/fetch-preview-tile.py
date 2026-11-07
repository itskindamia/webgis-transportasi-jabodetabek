"""Fetch only visible preview tiles through the inherited HTTPS proxy.

Used by capture-layout.mjs; cache files are outside the repository. No transport
source files are read or written. TLS verification remains enabled.
"""
import hashlib
import pathlib
import sys
import urllib.parse
import urllib.request

url, cache_dir = sys.argv[1:3]
parsed = urllib.parse.urlsplit(url)
if parsed.scheme != "https" or parsed.hostname not in {
    "server.arcgisonline.com", "tile.openstreetmap.org"
}:
    raise ValueError("Unsupported tile URL")
cache = pathlib.Path(cache_dir)
cache.mkdir(parents=True, exist_ok=True)
target = cache / hashlib.sha256(url.encode()).hexdigest()
if target.exists():
    body = target.read_bytes()
else:
    request = urllib.request.Request(url, headers={"User-Agent": "WebGIS-Tabler-Layout-Review/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        if not response.headers.get("Content-Type", "").startswith("image/"):
            raise ValueError("Tile response is not an image")
        body = response.read()
    target.write_bytes(body)
sys.stdout.buffer.write(body)
