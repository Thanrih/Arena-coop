const INFERNO_RADIUS=32*20;
let infernoMode=false,infernoTerrain=null,infernoWorldRevision=0;
const infernoProps=[],infernoPropMeshes={trees:[],rocks:[]},infernoDestroyed=new Set(),infernoGrid=new Map();
const infernoFloraMeshes=[];let infernoFloraDistance=Math.max(30,Math.min(180,Number(localStorage.getItem('arena-vegetation-distance')??100))),infernoFloraCenter=new T.Vector2(99999,99999);
const infernoRandom=(()=>{let state=0x1f3e7a91;return()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}})();
const infernoRnd=(a,b)=>a+infernoRandom()*(b-a);
const INFERNO_HILLS=Array.from({length:72},()=>{const a=infernoRnd(0,Math.PI*2),distance=infernoRnd(42,INFERNO_RADIUS-70);return{x:Math.cos(a)*distance,z:Math.sin(a)*distance,r:infernoRnd(28,82),h:infernoRnd(5,18)}});

function terrainHeightAt(x,z){
  if(!infernoMode)return 0;
  let height=0;
  for(const hill of INFERNO_HILLS){const dx=x-hill.x,dz=z-hill.z,q=(dx*dx+dz*dz)/(hill.r*hill.r);if(q<1)height+=hill.h*(1-q)*(1-q)}
  return height;
}
function makeInfernoTerrain(){
  const radial=48,angular=144,positions=[0,terrainHeightAt(0,0),0],indices=[];
  for(let ring=1;ring<=radial;ring++)for(let slice=0;slice<angular;slice++){
    const radius=INFERNO_RADIUS*ring/radial,angle=slice/angular*Math.PI*2,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    positions.push(x,terrainHeightAt(x,z)*(1-Math.pow(ring/radial,8)),z);
  }
  for(let slice=0;slice<angular;slice++)indices.push(0,1+(slice+1)%angular,1+slice);
  for(let ring=1;ring<radial;ring++)for(let slice=0;slice<angular;slice++){
    const a=1+(ring-1)*angular+slice,b=1+(ring-1)*angular+(slice+1)%angular,c=1+ring*angular+slice,d=1+ring*angular+(slice+1)%angular;
    indices.push(a,b,c,b,d,c);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  infernoTerrain=new T.Mesh(geometry,new T.MeshLambertMaterial({map:groundTexture,color:0xa8b08a}));infernoTerrain.name='Terreno montanhoso do Inferno';infernoTerrain.receiveShadow=true;infernoTerrain.visible=false;scene.add(infernoTerrain);
}
function infernoCell(x,z){return `${Math.floor(x/24)},${Math.floor(z/24)}`}
function addInfernoProp(kind,index,x,z,radius,scale,rotation){
  const prop={id:infernoProps.length,kind,index,x,z,y:terrainHeightAt(x,z),radius,scale,rotation,destroyed:false};infernoProps.push(prop);
  const key=infernoCell(x,z);if(!infernoGrid.has(key))infernoGrid.set(key,[]);infernoGrid.get(key).push(prop);return prop;
}
function scatterInfernoProps(){
  const scatter=(kind,count,minRadius,maxRadius)=>{for(let i=0;i<count;i++){let x,z,r;do{const a=infernoRnd(0,Math.PI*2);r=Math.sqrt(infernoRandom())*(INFERNO_RADIUS-18);x=Math.cos(a)*r;z=Math.sin(a)*r}while(r<18);addInfernoProp(kind,i,x,z,kind==='tree'?2.4:1.5,infernoRnd(minRadius,maxRadius),infernoRnd(0,Math.PI*2))}};
  scatter('tree',4800,.68,1.38);scatter('rock',4000,.5,1.7);
  const treeMatrix=(dummy,prop)=>{dummy.position.set(prop.x,prop.y,prop.z);dummy.rotation.set(0,prop.rotation,0);dummy.scale.setScalar(prop.destroyed?0:prop.scale);dummy.updateMatrix()};
  const rockMatrix=(dummy,prop)=>{dummy.position.set(prop.x,prop.y,prop.z);dummy.rotation.set(infernoRnd(-.18,.18),prop.rotation,infernoRnd(-.18,.18));dummy.scale.set(prop.destroyed?0:prop.scale*1.3,prop.destroyed?0:prop.scale*.8,prop.destroyed?0:prop.scale);dummy.updateMatrix()};
  const trees=infernoProps.filter(prop=>prop.kind==='tree'),rocks=infernoProps.filter(prop=>prop.kind==='rock'),dummy=new T.Object3D();
  const addLayer=(kind,geometry,material,items,matrix)=>{const mesh=new T.InstancedMesh(geometry,material,items.length);items.forEach((prop,i)=>{matrix(dummy,prop);mesh.setMatrixAt(i,dummy.matrix)});mesh.visible=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.infernoWorld=true;scene.add(mesh);infernoPropMeshes[kind].push({mesh,items,matrix});return mesh};
  addLayer('trees',new T.CylinderGeometry(.55,.82,7,6).translate(0,3.5,0),mat(0x69472d,0x120a04),trees,treeMatrix).name='Troncos destrutíveis do Inferno';
  addLayer('trees',new T.ConeGeometry(3.35,8,7).translate(0,10,0),mat(0x438b49,0x071507),trees,treeMatrix).name='Copas altas destrutíveis do Inferno';
  addLayer('rocks',new T.DodecahedronGeometry(1.5,0).translate(0,1,0),mat(0x858d89,0x0a0b0b),rocks,rockMatrix).name='Pedras destrutíveis do Inferno';
}
function clearInfernoFlora(){for(const mesh of infernoFloraMeshes){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()}infernoFloraMeshes.length=0}
function rebuildInfernoFlora(x=0,z=0){
  clearInfernoFlora();infernoFloraCenter.set(x,z);if(!infernoMode)return;
  const distance=infernoFloraDistance,count=Math.max(48,Math.round(distance*distance*.055)),cellX=Math.floor(x/12),cellZ=Math.floor(z/12),random=(()=>{let state=(0x7f4a7c15^Math.imul(cellX,73856093)^Math.imul(cellZ,19349663)^Math.round(distance))>>>0;return()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}})();
  const flowers=[];for(let i=0;i<count;i++){let px,pz,r;do{const angle=random()*Math.PI*2;r=Math.sqrt(random())*distance;px=x+Math.cos(angle)*r;pz=z+Math.sin(angle)*r}while(Math.hypot(px,pz)>INFERNO_RADIUS-3);flowers.push({x:px,z:pz,y:terrainHeightAt(px,pz),s:.55+random()*.62,ry:random()*Math.PI*2,white:random()<.42})}
  const add=(items,geometry,material,name,head=false)=>{const mesh=new T.InstancedMesh(geometry,material,items.length),dummy=new T.Object3D();items.forEach((flower,index)=>{dummy.position.set(flower.x,flower.y+.035,flower.z);dummy.rotation.set(0,flower.ry,0);dummy.scale.setScalar(flower.s);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix)});mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;mesh.visible=infernoMode;mesh.userData.infernoFlora=true;scene.add(mesh);infernoFloraMeshes.push(mesh)};
  add(flowers,new T.BoxGeometry(.04,.24,.04).translate(0,.12,0),mat(0x459141),'Hastes das flores do Inferno');
  const headGeometry=()=>new T.CircleGeometry(.13,4).rotateX(-Math.PI/2).translate(0,.27,0);add(flowers.filter(f=>!f.white),headGeometry(),mat(0xffd849,0x2a1900),'Flores amarelas do Inferno',true);add(flowers.filter(f=>f.white),headGeometry(),mat(0xf8f1d4,0x18160c),'Flores brancas do Inferno',true);
}
function setInfernoFloraDistance(value){infernoFloraDistance=Math.max(30,Math.min(180,Number(value)));if(infernoMode)rebuildInfernoFlora(infernoFloraCenter.x===99999?0:infernoFloraCenter.x,infernoFloraCenter.y===99999?0:infernoFloraCenter.y)}
function updateInfernoFlora(playerPositions){if(!infernoMode||!playerPositions)return;const focus=[...playerPositions].find(entry=>entry&&(entry.hp===undefined||entry.hp>0)),position=focus&&(focus.pos||focus);if(position&&Math.hypot(position.x-infernoFloraCenter.x,position.z-infernoFloraCenter.y)>infernoFloraDistance*.32)rebuildInfernoFlora(position.x,position.z)}
function updateInfernoProp(prop){
  const layers=prop.kind==='tree'?infernoPropMeshes.trees:infernoPropMeshes.rocks;
  for(const layer of layers){const dummy=new T.Object3D();layer.matrix(dummy,prop);layer.mesh.setMatrixAt(prop.index,dummy.matrix);layer.mesh.instanceMatrix.needsUpdate=true}
}
function destroyInfernoProps(position,radius){
  if(!infernoMode||!position)return 0;let destroyed=0;
  const minX=Math.floor((position.x-radius-3)/24),maxX=Math.floor((position.x+radius+3)/24),minZ=Math.floor((position.z-radius-3)/24),maxZ=Math.floor((position.z+radius+3)/24);
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)for(const prop of infernoGrid.get(`${x},${z}`)||[]){
    if(prop.destroyed||Math.hypot(prop.x-position.x,prop.z-position.z)>radius+prop.radius)continue;
    prop.destroyed=true;infernoDestroyed.add(prop.id);updateInfernoProp(prop);destroyed++;
    if(typeof burst==='function')burst(prop.x,prop.y+1,prop.z,prop.kind==='tree'?0x6f4a2c:0x888f8b,prop.kind==='tree'?7:5,6);
  }
  if(destroyed)infernoWorldRevision++;return destroyed;
}
function applyInfernoDestroyed(ids=[]){
  for(const id of ids){const prop=infernoProps[id];if(!prop||prop.destroyed)continue;prop.destroyed=true;infernoDestroyed.add(id);updateInfernoProp(prop)}
}
function setInfernoWorld(enabled){
  infernoMode=!!enabled;if(!infernoTerrain){makeInfernoTerrain();scatterInfernoProps()}
  floor.visible=!infernoMode;infernoTerrain.visible=infernoMode;
  for(const layers of Object.values(infernoPropMeshes))for(const layer of layers)layer.mesh.visible=infernoMode;
  for(const layer of flowerLayers)layer.mesh.visible=!infernoMode;
  if(infernoMode&&!infernoFloraMeshes.length)rebuildInfernoFlora(0,0);else for(const mesh of infernoFloraMeshes)mesh.visible=infernoMode;
}
function infernoBossImpact(position,radius){return destroyInfernoProps(position,radius)}
