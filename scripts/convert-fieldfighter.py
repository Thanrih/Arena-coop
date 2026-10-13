"""Convert the original ZIP's OBJ into the game's compact, articulated vertex-color rig.

Uses only the Python standard library. Source geometry/colors are preserved; clipping
partitions the surface at the shoulders/hips instead of replacing it with primitives.
"""
import hashlib
import json
import math
from pathlib import Path
import struct
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'personagem' / 'FieldFighter.zip'
OUTPUT = ROOT / 'personagem' / 'fieldfighter-model.js'


def palette_pixels(data):
    offset, compressed, width = 8, bytearray(), None
    while offset < len(data):
        length = struct.unpack_from('>I', data, offset)[0]
        kind = data[offset + 4:offset + 8]
        chunk = data[offset + 8:offset + 8 + length]
        if kind == b'IHDR':
            width, height, bits, color, _, _, interlace = struct.unpack('>IIBBBBB', chunk)
            assert height == 1 and bits == 8 and color == 6 and interlace == 0
        if kind == b'IDAT':
            compressed.extend(chunk)
        offset += length + 12
    raw = zlib.decompress(compressed)
    filter_type, row = raw[0], bytearray(raw[1:])
    assert filter_type in (0, 1, 2, 3, 4)
    for i in range(len(row)):
        left = row[i - 4] if i >= 4 else 0
        if filter_type in (1, 4):
            row[i] = (row[i] + left) & 255
        elif filter_type == 3:
            row[i] = (row[i] + left // 2) & 255
    return [tuple(row[i:i + 3]) for i in range(0, width * 4, 4)]


def clip(polygon, axis, boundary, greater):
    if not polygon:
        return []
    # Surfaces lying exactly on a cut belong to the upper/right part only.
    if not greater and all(abs(v[axis] - boundary) < 1e-9 for v in polygon):
        return []
    def inside(v):
        return v[axis] >= boundary - 1e-9 if greater else v[axis] <= boundary + 1e-9
    output = []
    for previous, current in zip(polygon[-1:] + polygon[:-1], polygon):
        a, b = inside(previous), inside(current)
        if a != b:
            t = (boundary - previous[axis]) / (current[axis] - previous[axis])
            output.append(tuple(previous[k] + t * (current[k] - previous[k]) for k in range(3)))
        if b:
            output.append(current)
    return output


def area(triangle):
    a, b, c = triangle
    u, v = [b[k] - a[k] for k in range(3)], [c[k] - a[k] for k in range(3)]
    cross = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
    return math.sqrt(sum(n*n for n in cross)) / 2


def base36(value, width):
    digits, result = '0123456789abcdefghijklmnopqrstuvwxyz', ''
    while value:
        value, remainder = divmod(value, 36)
        result = digits[remainder] + result
    assert len(result) <= width
    return result.rjust(width, '0')


def packed_vertex(vertex):
    # Same 4-character base36 vertex representation as the original character.
    # 7-bit X/Y and 6-bit Z allow exact 0.05-unit joint cuts on the 0.1-unit mesh.
    x, y, z = (round((vertex[0]+1.9)*20), round(vertex[1]*20), round((vertex[2]+.8)*20))
    assert 0 <= x < 128 and 0 <= y < 128 and 0 <= z < 64
    return base36((x << 13) | (y << 6) | z, 4)


def main():
    with zipfile.ZipFile(SOURCE) as archive:
        obj_bytes = archive.read('Package/FieldFighter.obj')
        pixels = palette_pixels(archive.read('Package/FieldFighter.png'))

    vertices, texcoords, triangles = [], [], []
    for line in obj_bytes.decode('utf-8').splitlines():
        tokens = line.split()
        if not tokens:
            continue
        if tokens[0] == 'v':
            x, y, z = map(float, tokens[1:4])
            # The OBJ faces -Z. The game aims +Z: rotate the source 180 degrees about Y.
            vertices.append((-x, y, -z))
        elif tokens[0] == 'vt':
            texcoords.append(tuple(map(float, tokens[1:3])))
        elif tokens[0] == 'f':
            face = [tuple(int(v) if v else 0 for v in token.split('/')) for token in tokens[1:]]
            for i in range(1, len(face)-1):
                items = [face[0], face[i], face[i+1]]
                colors = [pixels[min(len(pixels)-1, int(texcoords[item[1]-1][0]*len(pixels)))] for item in items]
                assert colors[0] == colors[1] == colors[2], 'Expected flat palette color per face'
                triangles.append(([vertices[item[0]-1] for item in items], colors[0]))

    regions = {
        'body': [[(1, 4.4, True)], [(0, -1.15, True), (0, 1.15, False), (1, 2.65, True), (1, 4.4, False)]],
        'leftArm': [[(0, -1.15, False), (1, 4.4, False)]],
        'rightArm': [[(0, 1.15, True), (1, 4.4, False)]],
        'leftLeg': [[(0, -1.15, True), (0, 0, False), (1, 2.65, False)]],
        'rightLeg': [[(0, 0, True), (0, 1.15, False), (1, 2.65, False)]],
    }
    parts = {name: [] for name in regions}
    palette = sorted(set(color for _, color in triangles))
    total_area = 0
    counts = {}
    for name, sets in regions.items():
        count = 0
        for triangle, color in triangles:
            for conditions in sets:
                polygon = triangle
                for axis, boundary, greater in conditions:
                    polygon = clip(polygon, axis, boundary, greater)
                for i in range(1, len(polygon)-1):
                    face = [polygon[0], polygon[i], polygon[i+1]]
                    face_area = area(face)
                    if face_area < 1e-9:
                        continue
                    parts[name].append(''.join(packed_vertex(v) for v in face) + base36(palette.index(color), 2))
                    total_area += face_area
                    count += 1
        counts[name] = count
    source_area = sum(area(face) for face, _ in triangles)
    assert abs(total_area-source_area) < 1e-6, (source_area, total_area)
    model = {
        'source': 'personagem/FieldFighter.zip', 'objSha256': hashlib.sha256(obj_bytes).hexdigest(),
        'orientation': 'source rotated 180 degrees around Y to face game +Z',
        'sourceTriangles': len(triangles), 'triangles': counts,
        'palette': [''.join(f'{c:02x}' for c in color) for color in palette],
        'parts': {name: ''.join(data) for name, data in parts.items()},
        'pivots': {'body': [0,0,0], 'leftArm': [-1.3,4.4,0], 'rightArm': [1.3,4.4,0],
                   'leftLeg': [-.7,2.65,0], 'rightLeg': [.7,2.65,0]},
    }
    OUTPUT.write_text('// Generated from the original FieldFighter.zip; run scripts/convert-fieldfighter.py.\nconst FIELD_FIGHTER_MODEL=' + json.dumps(model, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(json.dumps({'sourceTriangles': len(triangles), 'articulatedTriangles': counts,
                      'palette': model['palette'], 'preservedSurfaceArea': total_area,
                      'outputBytes': OUTPUT.stat().st_size}, indent=2))

if __name__ == '__main__':
    main()
