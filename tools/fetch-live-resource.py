"""TLS-verified HTTP transport for production browser smoke tests.

Chromium does not trust the managed proxy CA by default; urllib uses the
environment's configured CA bundle. Responses are real production bytes.
"""
import base64
import hashlib
import json
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

url, directory = sys.argv[1:3]
parsed = urllib.parse.urlsplit(url)
if parsed.scheme != 'https' or parsed.hostname not in {
    'itskindamia.github.io', 'unpkg.com', 'cdnjs.cloudflare.com',
    'server.arcgisonline.com', 'tile.openstreetmap.org'
}:
    raise ValueError('Unsupported production resource host')
cache = pathlib.Path(directory)
cache.mkdir(parents=True, exist_ok=True)
target = cache / hashlib.sha256(url.encode()).hexdigest()
if target.exists():
    result = target.read_text()
else:
    request = urllib.request.Request(url, headers={'User-Agent': 'WebGIS-Release-Smoke/1.0'})
    for attempt in range(3):
        try:
            response = urllib.request.urlopen(request, timeout=40)
            break
        except urllib.error.HTTPError as error:
            if error.code >= 500 and attempt < 2:
                continue
            response = error
            break
    with response:
        result = json.dumps({'status': response.status,
            'headers': {key: value for key, value in response.headers.items()
                        if key.lower() in {'content-type', 'access-control-allow-origin'}},
            'body': base64.b64encode(response.read()).decode()})
    target.write_text(result)
print(result)
