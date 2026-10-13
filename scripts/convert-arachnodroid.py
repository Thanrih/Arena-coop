"""Map the original Arachnodroid ZIP into palette-colored, articulated geometry."""
import hashlib
import json
import zipfile
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('converter', Path(__file__).with_name('convert-fieldfighter.py'))
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
with zipfile.ZipFile(ROOT / 'personagem/Arachnodroid.zip') as archive:
    obj = archive.read('Package/Arachnoid.obj')
    pixels = helper.palette_pixels(archive.read('Package/Arachnoid.png'))
vertices, uv, triangles = [], [], []
for line in obj.decode().splitlines():
    t = line.split()
    if not t: continue
    if t[0] == 'v':
        x,y,z = map(float,t[1:4]); vertices.append((-x,y,-z))
    elif t[0] == 'vt': uv.append(tuple(map(float,t[1:3])))
    elif t[0] == 'f':
        face = [tuple(int(n) if n else 0 for n in v.split('/')) for v in t[1:]]
        for i in range(1,len(face)-1):
            items = [face[0],face[i],face[i+1]]
            colors = [pixels[min(len(pixels)-1,int(uv[v[1]-1][0]*len(pixels)))] for v in items]
            assert colors[0] == colors[1] == colors[2]
            triangles.append(([vertices[v[0]-1] for v in items],colors[0]))
regions = {'body': [(1,2.2,True)]}
pivots = {'body':[0,0,0]}
for x in [-1,1]:
    for z in [-1,1]:
        name = ('left' if x<0 else 'right') + ('Front' if z>0 else 'Back')
        regions[name] = [(1,2.2,False),(0,0,x>0),(2,0,z>0)]
        pivots[name] = [x*.8,2.2,z*.8]
palette = sorted(set(c for _,c in triangles))
parts, counts, total = {}, {}, 0
def pack(v):
    x,y,z = round((v[0]+1.4)*20),round(v[1]*20),round((v[2]+1.8)*20)
    assert all(0 <= n < 128 for n in (x,y,z))
    return helper.base36((x<<14)|(y<<7)|z,5)
for name,conditions in regions.items():
    data=[]
    for triangle,color in triangles:
        polygon=triangle
        for axis,boundary,greater in conditions:
            polygon=helper.clip(polygon,axis,boundary,greater)
        for i in range(1,len(polygon)-1):
            face=[polygon[0],polygon[i],polygon[i+1]]; area=helper.area(face)
            if area<1e-9: continue
            total+=area
            data.append(''.join(pack(v) for v in face)+helper.base36(palette.index(color),2))
    parts[name]=''.join(data); counts[name]=len(data)
assert abs(total-sum(helper.area(t) for t,_ in triangles)) < 1e-6
model={'source':'personagem/Arachnodroid.zip','objSha256':hashlib.sha256(obj).hexdigest(),
       'sourceTriangles':len(triangles),'triangles':counts,'pivots':pivots,'parts':parts,
       'palette':[''.join(f'{v:02x}' for v in c) for c in palette]}
(ROOT/'personagem/arachnodroid-model.js').write_text('// Generated from the original Arachnodroid.zip.\nconst ARACHNODROID_MODEL='+json.dumps(model,separators=(',',':'))+';\n')
print(json.dumps({'triangles':counts,'palette':model['palette']}))
