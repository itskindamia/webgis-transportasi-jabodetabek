import collections
import json
import pathlib
import re
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
BRT_STOP = ROOT / 'data' / 'brt_stop.geojson'
BRT_ROUTE = ROOT / 'data' / 'brt_route.geojson'
RAIL_STOP = ROOT / 'data' / 'rail_stop.geojson'
K01_K10 = {f'BRT_{i:02d}' for i in range(1, 11)}


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def dump(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')


def clean(value):
    return '' if value is None else str(value).strip()


def split_semis(value):
    return [x.strip() for x in str(value or '').split(';') if x.strip()]


def normalize_name(value):
    return re.sub(r'\s+', ' ', clean(value).lower())


def display_name(properties):
    return clean(properties.get('DISPLAY_NM')) or clean(properties.get('STOP_NAME'))


def serves_k01_k10(properties):
    return bool(set(split_semis(properties.get('ROUTES'))) & K01_K10)


def append_route_map(value, route_id, mapped_value):
    entries = []
    found = False
    for item in split_semis(value):
        if ':' in item:
            key, val = item.split(':', 1)
            if key.strip() == route_id:
                entries.append(f'{route_id}:{mapped_value}')
                found = True
            else:
                entries.append(item)
        else:
            entries.append(item)
    if not found:
        entries.append(f'{route_id}:{mapped_value}')
    return ';'.join(entries)


brt = load(BRT_STOP)
routes = load(BRT_ROUTE)
rail = load(RAIL_STOP)
features = brt['features']

# 1) Protect K1-K10 logical stop identity from legacy STOP_ID collisions.
#    Only the legacy colliding record (blank GEOM_ID) is renumbered; route/sequence
#    semantics for K11-K19 are intentionally not edited in this scoped hardening.
by_id = collections.defaultdict(list)
for idx, feature in enumerate(features):
    p = feature.get('properties', {})
    sid = clean(p.get('STOP_ID'))
    if sid:
        by_id[sid].append((idx, display_name(p), clean(p.get('GEOM_ID'))))

numeric_ids = []
for sid in by_id:
    match = re.fullmatch(r'BRT(\d+)', sid)
    if match:
        numeric_ids.append(int(match.group(1)))
next_id = max(numeric_ids or [0]) + 1
renumbered = []

for sid, rows in sorted(by_id.items()):
    names = {name for _, name, _ in rows}
    if len(names) <= 1:
        continue

    # Only act when the collision touches K1-K10; this is why the legacy ID
    # contaminates the reviewed scope.
    touches_scope = any(serves_k01_k10(features[idx].get('properties', {})) for idx, _, _ in rows)
    if not touches_scope:
        continue

    for idx, name, geom_id in rows:
        if geom_id:
            continue
        p = features[idx]['properties']
        old = clean(p.get('STOP_ID'))
        new = f'BRT{next_id:03d}'
        next_id += 1
        p['STOP_ID'] = new
        renumbered.append((old, name, new))

# 2) K9/K10 metadata fixes from the review.
for feature in features:
    p = feature.get('properties', {})
    if display_name(p) == 'Penjaringan' and 'BRT_09' in split_semis(p.get('ROUTES')):
        p['DIR_MAP'] = append_route_map(p.get('DIR_MAP'), 'BRT_09', 'Pluit/Pinang Ranti')

    if clean(p.get('STOP_ID')) == 'BRT172' and display_name(p) == 'Kali Grogol':
        if clean(p.get('GEOM_ID')) in {'BRT172_DIV_A', 'BRT172_DIV_B', 'BRT172_REG_A', 'BRT172_REG_B'}:
            p['DIV_ID'] = 'LATUMENTEN_2026'

    # Source formatting cleanup in reviewed K1-K10 scope only.
    if serves_k01_k10(p):
        src = clean(p.get('SOURCE'))
        if src:
            src = src.replace('Transjakarta', 'TransJakarta')
            if src == 'TransJakarta, OpenStreetMap':
                src = 'TransJakarta; OpenStreetMap'
            src = re.sub(r'\s*;\s*', '; ', src)
            p['SOURCE'] = src

        for field in ('INTEGRASI', 'INT_NM'):
            if isinstance(p.get(field), str):
                p[field] = p[field].replace('KRL_RA', 'KRL_RK')

for feature in routes['features']:
    p = feature.get('properties', {})
    if clean(p.get('ID')) in {'BRT_09', 'BRT_10'} and clean(p.get('STATUS')) == 'Eksisting':
        p['NETWORK'] = 'TransJakarta'
        p['OPERATOR'] = 'TransJakarta'

# 3) GlobalID uniqueness is technical identity, so duplicates outside the scope
#    must also be resolved if they collide with reviewed K1-K10 records.
guid_re = re.compile(r'^\{?([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})\}?$')
namespace = uuid.UUID('0d93e9ba-687c-45e8-8650-10a716952b4e')
seen = set()
order = sorted(range(len(features)), key=lambda i: 0 if serves_k01_k10(features[i].get('properties', {})) else 1)
for idx in order:
    p = features[idx].get('properties', {})
    raw = clean(p.get('GlobalID'))
    match = guid_re.match(raw)
    normalized = match.group(1).lower() if match else ''
    if normalized and normalized not in seen:
        p['GlobalID'] = '{' + normalized.upper() + '}'
        seen.add(normalized)
        continue

    seed = '|'.join([
        clean(p.get('STOP_ID')),
        clean(p.get('GEOM_ID')),
        clean(p.get('OBJECTID')),
        display_name(p),
    ])
    new_id = uuid.uuid5(namespace, seed)
    while str(new_id).lower() in seen:
        seed += '|x'
        new_id = uuid.uuid5(namespace, seed)
    p['GlobalID'] = '{' + str(new_id).upper() + '}'
    seen.add(str(new_id).lower())

# 4) Repair rail -> BRT pointer IDs from the human-readable integration names.
name_to_ids = collections.defaultdict(set)
for feature in features:
    p = feature.get('properties', {})
    sid = clean(p.get('STOP_ID'))
    if sid:
        name_to_ids[normalize_name(display_name(p))].add(sid)

for feature in rail['features']:
    p = feature.get('properties', {})
    int_stop_items = split_semis(p.get('INT_STOP'))
    int_nm_items = split_semis(p.get('INT_NM'))
    brt_names = [item.split(':', 1)[1].strip() for item in int_nm_items if item.upper().startswith('BRT:')]
    brt_positions = [i for i, item in enumerate(int_stop_items) if item.upper().startswith('BRT:BRT')]

    for ordinal, pos in enumerate(brt_positions):
        if ordinal >= len(brt_names):
            break
        ids = {x for x in name_to_ids.get(normalize_name(brt_names[ordinal]), set()) if x}
        if len(ids) == 1:
            int_stop_items[pos] = f'BRT:{next(iter(ids))}'

    if int_stop_items:
        p['INT_STOP'] = ';'.join(int_stop_items)

    for field in ('INTEGRASI', 'INT_NM', 'INT_STOP', 'REMARK'):
        if isinstance(p.get(field), str):
            p[field] = p[field].replace('KRL_RA', 'KRL_RK')

    if display_name(p) == 'Kebayoran' and clean(p.get('MODE')) == 'KRL':
        p['REMARK'] = 'Terhubung dengan halte BRT Velbak/Kebayoran.'

    if display_name(p) == 'Guntur' and 'LRT_JKT_S' in clean(p.get('LINES')) and not clean(p.get('SRC_URL')):
        p['SRC_URL'] = 'https://jutpi3.github.io/JUTPI3_MapVisualization/'

# Write datasets.
dump(BRT_STOP, brt)
dump(BRT_ROUTE, routes)
dump(RAIL_STOP, rail)

# Transparent migration trace.
trace = ROOT / 'docs' / 'STOP_ID_MIGRATION_K01_K10_20260914.md'
lines = [
    '# STOP_ID Collision Hardening — K1–K10 scope — 14 September 2026',
    '',
    'Only legacy records whose reused STOP_ID collided with a K1–K10 logical stop were renumbered.',
    'No K11–K19 route membership or sequence was changed by this scoped hardening.',
    '',
    '| Old STOP_ID | Legacy stop | New STOP_ID |',
    '|---|---|---|',
]
for old, name, new in renumbered:
    lines.append(f'| `{old}` | {name} | `{new}` |')
if renumbered or not trace.exists():
    trace.write_text('\n'.join(lines) + '\n', encoding='utf-8')

print(f'Renumbered legacy collisions touching K1-K10: {len(renumbered)}')
print(f'Next unused BRT numeric ID: {next_id}')
