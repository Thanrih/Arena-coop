"""Articulate original Ettin mesh islands without slicing its axes into the body."""
import hashlib
import json
import zipfile
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source='personagem/Ettin by Thomas DR - dcintbXV5iA.zip'
with zipfile.ZipFile(ROOT/source) as z:
    obj=z.read('model.obj'); mtl=z.read('materials.mtl').decode()
materials={}
for line in mtl.splitlines():
    t=line.split()
    if not t: continue
    if t[0]=='newmtl': material=t[1]
    elif t[0]=='Kd': materials[material]=list(map(float,t[1:4]))
vertices=[]; faces=[]
for line in obj.decode().splitlines():
    t=line.split()
    if not t: continue
    if t[0]=='v':
        x,y,z=map(float,t[1:4]);vertices.append((-z*2.65,(y+1.234133)*2.65,x*2.65))
    elif t[0]=='usemtl': material=t[1]
    elif t[0]=='f': faces.append(([int(v.split('/')[0])-1 for v in t[1:]],material))
parents=list(range(len(vertices)))
def find(i):
    while parents[i]!=i: parents[i]=parents[parents[i]];i=parents[i]
    return i
seen={}
for i,v in enumerate(vertices):
    key=tuple(round(n,5) for n in v)
    if key in seen: parents[find(i)]=find(seen[key])
    else: seen[key]=i
for indices,_ in faces:
    for i in indices[1:]: parents[find(i)]=find(indices[0])
islands=defaultdict(list)
for i,v in enumerate(vertices): islands[find(i)].append(v)
assignment={}
for root,points in islands.items():
    lo=[min(v[k] for v in points) for k in range(3)]
    hi=[max(v[k] for v in points) for k in range(3)]
    x,y,z=[(lo[k]+hi[k])*.5 for k in range(3)]
    side='left' if x<0 else 'right'
    # Long weapon handles and their silver blades are separate source islands.
    if len(points)<150 and (hi[2]-lo[2]>3 or hi[1]-lo[1]>3.8): part=side+'Axe'
    elif y>5.35: part=('left' if x<.55 else 'right')+'Head'
    elif y<3.05 and abs(x)>.35: part=side+('Leg' if y>1.4 else 'Shin' if y>.65 else 'Foot')
    elif abs(x)>.45 and y>3.05: part=side+('Forearm' if abs(x)>1.3 or y<3.85 else 'Arm')
    else: part='torso'
    assignment[root]=part
joints={'pelvis':[0,2.65,0],'chest':[0,4.55,0]}
for side,sign in [('left',-1),('right',1)]:
    joints.update({side+'Neck':[sign*.65,5.4,.4],side+'Crown':[sign*.65,6.45,.6],
        side+'Shoulder':[sign*.85,4.85,.15],side+'Elbow':[sign*1.45,4,.1],
        side+'Hand':[sign*1.95,3.2,-.35],side+'Hip':[sign*.55,2.65,0],
        side+'Knee':[sign*.65,1.4,-.3],side+'Ankle':[sign*.7,.35,.1],side+'Toe':[sign*.7,.2,.85]})
joints['leftBlade']=[-1.95,1.65,3.4];joints['rightBlade']=[1.35,7.65,-.55]
joints['leftNeck']=[.1,5.4,.9];joints['leftCrown']=[.1,6.45,.95]
joints['rightNeck']=[.95,5.4,0];joints['rightCrown']=[.95,6.45,.05]
bones={'torso':['pelvis','chest']}
for side in ['left','right']:
    bones.update({side+'Head':[side+'Neck',side+'Crown'],side+'Arm':[side+'Shoulder',side+'Elbow'],
        side+'Forearm':[side+'Elbow',side+'Hand'],side+'Leg':[side+'Hip',side+'Knee'],
        side+'Shin':[side+'Knee',side+'Ankle'],side+'Foot':[side+'Ankle',side+'Toe'],
        side+'Axe':[side+'Hand',side+'Blade']})
parts={n:{'positions':[],'colors':[],'indices':[]} for n in bones}; unique={n:{} for n in bones};count=0
for indices,mat in faces:
    part=assignment[find(indices[0])]
    if mat=='mat15':
        x=sum(vertices[i][0] for i in indices)/len(indices);part=('left' if x<0 else 'right')+'Axe'
    data=parts[part];pivot=joints[bones[part][0]]
    for k in range(1,len(indices)-1):
        count+=1
        for i in [indices[0],indices[k],indices[k+1]]:
            point=tuple(round(vertices[i][a]-pivot[a],5) for a in range(3));key=point+tuple(materials[mat])
            if key not in unique[part]:
                unique[part][key]=len(data['positions'])//3;data['positions'].extend(point);data['colors'].extend(materials[mat])
            data['indices'].append(unique[part][key])
model={'source':source,'author':'Thomas DR','objSha256':hashlib.sha256(obj).hexdigest(),'parts':parts,
       'joints':joints,'bones':bones,'pivots':{n:joints[b[0]] for n,b in bones.items()},'sourceTriangles':count}
(ROOT/'personagem/ettin-model.js').write_text('// Original Ettin islands and animation joint bind positions.\nconst ETTIN_MODEL='+json.dumps(model,separators=(',',':'))+';\n')
print(json.dumps({n:len(p['indices'])//3 for n,p in parts.items()}))
