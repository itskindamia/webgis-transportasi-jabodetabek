import collections
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
K = {f'BRT_{i:02d}' for i in range(1, 11)}


def load(name):
    with open(ROOT / 'data' / name, encoding='utf-8') as f:
        return json.load(f)


def clean(v):
    return '' if v is None else str(v).strip()


def split(v):
    return [x.strip() for x in str(v or '').split(';') if x.strip()]


def name(p):
    return clean(p.get('DISPLAY_NM')) or clean(p.get('STOP_NAME'))


brt = load('brt_stop.geojson')
routes = load('brt_route.geojson')
rail = load('rail_stop.geojson')
scoped = [f for f in brt['features'] if set(split(f['properties'].get('ROUTES'))) & K]
errors = []

for f in scoped:
    p = f['properties']
    if not clean(p.get('STOP_ID')):
        errors.append(f'blank STOP_ID: {name(p)}')
    if not clean(p.get('GEOM_ID')):
        errors.append(f'blank GEOM_ID: {name(p)}')

geom = collections.Counter(clean(f['properties'].get('GEOM_ID')) for f in scoped)
for gid, count in geom.items():
    if gid and count > 1:
        errors.append(f'duplicate K1-K10 stop GEOM_ID: {gid} x{count}')

scope_ids = {clean(f['properties'].get('STOP_ID')) for f in scoped}
by_id = collections.defaultdict(set)
for f in brt['features']:
    p = f['properties']
    sid = clean(p.get('STOP_ID'))
    if sid in scope_ids:
        by_id[sid].add(name(p))
for sid, names in by_id.items():
    if len(names) > 1:
        errors.append(f'STOP_ID collision touching K1-K10: {sid} -> {sorted(names)}')

rfs = [f for f in routes['features'] if clean(f['properties'].get('ID')) in K]
rgeom = collections.Counter(clean(f['properties'].get('GEOM_ID')) for f in rfs)
for gid, count in rgeom.items():
    if gid and count > 1:
        errors.append(f'duplicate K1-K10 route GEOM_ID: {gid} x{count}')

for f in rfs:
    p = f['properties']
    if clean(p.get('ID')) in {'BRT_09', 'BRT_10'} and clean(p.get('STATUS')) == 'Eksisting':
        if clean(p.get('NETWORK')) != 'TransJakarta' or clean(p.get('OPERATOR')) != 'TransJakarta':
            errors.append(f'K9/K10 network/operator incomplete: {p.get("GEOM_ID")}')

penjaringan = [f for f in scoped if name(f['properties']) == 'Penjaringan' and 'BRT_09' in split(f['properties'].get('ROUTES'))]
if not penjaringan or not all('BRT_09:Pluit/Pinang Ranti' in clean(f['properties'].get('DIR_MAP')) for f in penjaringan):
    errors.append('K9 Penjaringan DIR_MAP incomplete')

kali = [f for f in scoped if clean(f['properties'].get('STOP_ID')) == 'BRT172' and name(f['properties']) == 'Kali Grogol']
if not kali or not all(clean(f['properties'].get('DIV_ID')) == 'LATUMENTEN_2026' for f in kali):
    errors.append('K9 Kali Grogol DIV_ID incomplete')

guid = re.compile(r'^\{[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\}$')
gids = [clean(f['properties'].get('GlobalID')) for f in brt['features']]
if any(not guid.match(x) for x in gids):
    errors.append('invalid BRT GlobalID remains')
if len(gids) != len(set(gids)):
    errors.append('duplicate BRT GlobalID remains')

names_by_id = collections.defaultdict(set)
for f in brt['features']:
    p = f['properties']
    names_by_id[clean(p.get('STOP_ID'))].add(name(p))
for f in rail['features']:
    p = f['properties']
    brt_names = [x.split(':', 1)[1].strip() for x in split(p.get('INT_NM')) if x.upper().startswith('BRT:')]
    brt_ids = [x.split(':', 1)[1].strip() for x in split(p.get('INT_STOP')) if x.upper().startswith('BRT:BRT')]
    for target_name, sid in zip(brt_names, brt_ids):
        if target_name not in names_by_id.get(sid, set()):
            errors.append(f'rail BRT pointer mismatch: {name(p)} -> {target_name} ({sid})')

print(f'K1-K10 physical stops checked: {len(scoped)}')
print(f'K1-K10 route features checked: {len(rfs)}')
print(f'Rail stops checked: {len(rail["features"])}')
if errors:
    print('SCOPED AUDIT FAILED')
    for item in errors:
        print('-', item)
    sys.exit(1)
print('SCOPED AUDIT K1-K10 + RAIL: PASS')
