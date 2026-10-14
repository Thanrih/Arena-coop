const INFERNO_RADIUS=32*20;
let infernoMode=false,infernoTerrain=null,infernoWorldRevision=0;
const infernoProps=[],infernoPropMeshes={trees:[],rocks:[],pillars:[]},infernoShadowMeshes=[],infernoDestroyed=new Set(),infernoGrid=new Map();
const infernoFloraMeshes=[];let infernoFloraDistance=Math.max(30,Math.min(180,Number(localStorage.getItem('arena-vegetation-distance')??100))),infernoFloraCenter=new T.Vector2(99999,99999),infernoPropRenderCenter=new T.Vector2(99999,99999);
const infernoRandom=(()=>{let state=0x1f3e7a91;return()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}})();
const infernoRnd=(a,b)=>a+infernoRandom()*(b-a);
const INFERNO_HILLS=Array.from({length:72},()=>{const a=infernoRnd(0,Math.PI*2),distance=infernoRnd(42,INFERNO_RADIUS-70);return{x:Math.cos(a)*distance,z:Math.sin(a)*distance,r:infernoRnd(28,82),h:infernoRnd(5,18)}});

function infernoBaseHeightAt(x,z){
  let height=0;
  for(const hill of INFERNO_HILLS){const dx=x-hill.x,dz=z-hill.z,q=(dx*dx+dz*dz)/(hill.r*hill.r);if(q<1)height+=hill.h*(1-q)*(1-q)}
  const radius=Math.hypot(x,z),edge=Math.max(0,Math.min(1,1-Math.pow(radius/INFERNO_RADIUS,8)));
  return height*edge;
}
// Broad plateaus interrupt the continuous slopes while keeping their borders smooth.
const INFERNO_FLATS=INFERNO_HILLS.filter((_,index)=>index%5===0).slice(0,12).map(hill=>({x:hill.x,z:hill.z,r:Math.max(18,Math.min(34,hill.r*.42)),h:infernoBaseHeightAt(hill.x,hill.z)}));
function terrainHeightAt(x,z){
  if(!infernoMode)return 0;
  let height=infernoBaseHeightAt(x,z);
  for(const flat of INFERNO_FLATS){const distance=Math.hypot(x-flat.x,z-flat.z);if(distance>=flat.r)continue;const inner=flat.r*.58,t=Math.max(0,Math.min(1,(distance-inner)/(flat.r-inner))),blend=t*t*(3-2*t);height=flat.h+(height-flat.h)*blend}
  return height;
}
function makeInfernoTerrain(){
  const radial=96,angular=256,positions=[0,terrainHeightAt(0,0),0],uvs=[.5,.5],indices=[];
  for(let ring=1;ring<=radial;ring++)for(let slice=0;slice<angular;slice++){
    const radius=INFERNO_RADIUS*ring/radial,angle=slice/angular*Math.PI*2,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    positions.push(x,terrainHeightAt(x,z),z);uvs.push(x/64+.5,.5-z/64);
  }
  for(let slice=0;slice<angular;slice++)indices.push(0,1+(slice+1)%angular,1+slice);
  for(let ring=1;ring<radial;ring++)for(let slice=0;slice<angular;slice++){
    const a=1+(ring-1)*angular+slice,b=1+(ring-1)*angular+(slice+1)%angular,c=1+ring*angular+slice,d=1+ring*angular+(slice+1)%angular;
    indices.push(a,b,c,b,d,c);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  infernoTerrain=new T.Mesh(geometry,new T.MeshLambertMaterial({map:groundTexture,color:0xffffff}));infernoTerrain.name='Terreno montanhoso do Inferno';infernoTerrain.receiveShadow=true;infernoTerrain.visible=false;scene.add(infernoTerrain);
}
function infernoCell(x,z){return `${Math.floor(x/24)},${Math.floor(z/24)}`}
function infernoCollidersNear(x,z,radius){
  const result=[],reach=radius+4,minX=Math.floor((x-reach)/24),maxX=Math.floor((x+reach)/24),minZ=Math.floor((z-reach)/24),maxZ=Math.floor((z+reach)/24);
  for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++)for(const prop of infernoGrid.get(`${cx},${cz}`)||[])if(!prop.destroyed&&Math.abs(prop.x-x)<=reach+prop.radius&&Math.abs(prop.z-z)<=reach+prop.radius)result.push(prop);
  return result;
}
function addInfernoProp(kind,index,x,z,radius,scale,rotation,height){
  const prop={id:infernoProps.length,kind,index,x,z,y:terrainHeightAt(x,z),radius:radius*scale,height:height*scale,scale,rotation,destroyed:false,rendered:Math.hypot(x,z)<=infernoFloraDistance};infernoProps.push(prop);
  const key=infernoCell(x,z);if(!infernoGrid.has(key))infernoGrid.set(key,[]);infernoGrid.get(key).push(prop);return prop;
}
function scatterInfernoProps(){
  const scatter=(kind,count,minScale,maxScale,radius,height)=>{for(let i=0;i<count;i++){let x,z,r;do{const a=infernoRnd(0,Math.PI*2);r=Math.sqrt(infernoRandom())*(INFERNO_RADIUS-18);x=Math.cos(a)*r;z=Math.sin(a)*r}while(r<18);addInfernoProp(kind,i,x,z,radius,infernoRnd(minScale,maxScale),infernoRnd(0,Math.PI*2),height)}};
  scatter('tree',4800,.68,1.38,2.4,14);scatter('rock',4000,.5,1.7,1.5,2.5);scatter('pillar',900,.72,1.65,1.7,8);
  const treeMatrix=(dummy,prop)=>{dummy.position.set(prop.x,prop.y,prop.z);dummy.rotation.set(0,prop.rotation,0);dummy.scale.setScalar(prop.destroyed||!prop.rendered?0:prop.scale);dummy.updateMatrix()};
  const rockMatrix=(dummy,prop)=>{dummy.position.set(prop.x,prop.y,prop.z);dummy.rotation.set(prop.tiltX??(prop.tiltX=infernoRnd(-.18,.18)),prop.rotation,prop.tiltZ??(prop.tiltZ=infernoRnd(-.18,.18)));dummy.scale.set(prop.destroyed||!prop.rendered?0:prop.scale*1.3,prop.destroyed||!prop.rendered?0:prop.scale*.8,prop.destroyed||!prop.rendered?0:prop.scale);dummy.updateMatrix()};
  const pillarMatrix=(dummy,prop)=>{dummy.position.set(prop.x,prop.y,prop.z);dummy.rotation.set(0,prop.rotation,0);dummy.scale.setScalar(prop.destroyed||!prop.rendered?0:prop.scale);dummy.updateMatrix()};
  const trees=infernoProps.filter(prop=>prop.kind==='tree'),rocks=infernoProps.filter(prop=>prop.kind==='rock'),pillars=infernoProps.filter(prop=>prop.kind==='pillar'),dummy=new T.Object3D();
  const addLayer=(kind,geometry,material,items,matrix)=>{const mesh=new T.InstancedMesh(geometry,material,items.length);items.forEach((prop,i)=>{matrix(dummy,prop);mesh.setMatrixAt(i,dummy.matrix)});mesh.visible=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.infernoWorld=true;scene.add(mesh);infernoPropMeshes[kind].push({mesh,items,matrix});return mesh};
  addLayer('trees',new T.CylinderGeometry(.55,.82,7,6).translate(0,3.5,0),new T.MeshLambertMaterial({map:trunkTexture,color:0xffffff}),trees,treeMatrix).name='Troncos destrutíveis do Inferno';
  addLayer('trees',new T.ConeGeometry(3.35,8,7).translate(0,10,0),new T.MeshLambertMaterial({map:leavesTexture,color:0xffffff}),trees,treeMatrix).name='Copas altas destrutíveis do Inferno';
  addLayer('rocks',new T.DodecahedronGeometry(1.5,0).translate(0,1,0),new T.MeshLambertMaterial({map:stoneTexture,color:0xffffff}),rocks,rockMatrix).name='Pedras destrutíveis do Inferno';
  addLayer('pillars',new T.BoxGeometry(2.8,8,3.2).translate(0,4,0),new T.MeshLambertMaterial({map:pillarTexture,color:0xffffff}),pillars,pillarMatrix).name='Pilares retangulares destrutíveis do Inferno';
  // Cheap ground silhouettes give the streamed scenery contact without adding
  // thousands of objects to the real-time shadow pass.
  const shadowGeometry=new T.CircleGeometry(1,8).rotateX(-Math.PI/2),shadowMaterial=new T.MeshBasicMaterial({color:0x19331d,transparent:true,opacity:.24,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const addShadow=(items,sizeX,sizeZ)=>{const mesh=new T.InstancedMesh(shadowGeometry,shadowMaterial,items.length),shadowMatrix=(dummy,prop)=>{dummy.position.set(prop.x+prop.scale*.8,prop.y+.045,prop.z+prop.scale*.62);dummy.rotation.set(0,-.65,0);dummy.scale.set(prop.destroyed||!prop.rendered?0:prop.scale*sizeX,1,prop.destroyed||!prop.rendered?0:prop.scale*sizeZ);dummy.updateMatrix()};items.forEach((prop,i)=>{shadowMatrix(dummy,prop);mesh.setMatrixAt(i,dummy.matrix)});mesh.visible=infernoMode&&lightingEffects;mesh.frustumCulled=false;mesh.renderOrder=1;mesh.userData.infernoShadow=true;scene.add(mesh);infernoShadowMeshes.push({mesh,items,matrix:shadowMatrix});return mesh};
  addShadow(trees,3.8,1.65).name='Sombras leves das árvores';addShadow(rocks,1.9,.9).name='Sombras leves das pedras';addShadow(pillars,2.4,1.05).name='Sombras leves dos pilares';
}
function updateInfernoPropVisibility(x=0,z=0,force=false){
  if(!infernoMode)return;const threshold=Math.max(8,infernoFloraDistance*.25);if(!force&&Math.hypot(x-infernoPropRenderCenter.x,z-infernoPropRenderCenter.y)<threshold)return;
  infernoPropRenderCenter.set(x,z);const changed=new Set(),limit2=infernoFloraDistance*infernoFloraDistance;
  for(const prop of infernoProps){const rendered=(prop.x-x)*(prop.x-x)+(prop.z-z)*(prop.z-z)<=limit2;if(rendered!==prop.rendered){prop.rendered=rendered;changed.add(prop)}}
  if(!changed.size&&!force)return;const dummy=new T.Object3D(),layers=[...Object.values(infernoPropMeshes).flat(),...infernoShadowMeshes];for(const layer of layers){let dirty=false;for(let i=0;i<layer.items.length;i++){const prop=layer.items[i];if(!force&&!changed.has(prop))continue;layer.matrix(dummy,prop);layer.mesh.setMatrixAt(i,dummy.matrix);dirty=true}if(dirty)layer.mesh.instanceMatrix.needsUpdate=true}
}
function setInfernoLightingEffects(enabled){for(const layer of infernoShadowMeshes)layer.mesh.visible=infernoMode&&!!enabled}
function clearInfernoFlora(){for(const mesh of infernoFloraMeshes){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()}infernoFloraMeshes.length=0}
function rebuildInfernoFlora(x=0,z=0){
  clearInfernoFlora();infernoFloraCenter.set(x,z);if(!infernoMode)return;
  const distance=infernoFloraDistance,count=Math.max(48,Math.round(distance*distance*.055)),cellX=Math.floor(x/12),cellZ=Math.floor(z/12),random=(()=>{let state=(0x7f4a7c15^Math.imul(cellX,73856093)^Math.imul(cellZ,19349663)^Math.round(distance))>>>0;return()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}})();
  const flowers=[];for(let i=0;i<count;i++){let px,pz,r;do{const angle=random()*Math.PI*2;r=Math.sqrt(random())*distance;px=x+Math.cos(angle)*r;pz=z+Math.sin(angle)*r}while(Math.hypot(px,pz)>INFERNO_RADIUS-3);flowers.push({x:px,z:pz,y:terrainHeightAt(px,pz),s:.55+random()*.62,ry:random()*Math.PI*2,white:random()<.42})}
  const add=(items,geometry,material,name,head=false)=>{const mesh=new T.InstancedMesh(geometry,material,items.length),dummy=new T.Object3D();items.forEach((flower,index)=>{dummy.position.set(flower.x,flower.y+.035,flower.z);dummy.rotation.set(0,flower.ry,0);dummy.scale.setScalar(flower.s);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix)});mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;mesh.visible=infernoMode;mesh.userData.infernoFlora=true;scene.add(mesh);infernoFloraMeshes.push(mesh)};
  add(flowers,new T.BoxGeometry(.04,.24,.04).translate(0,.12,0),mat(0x459141),'Hastes das flores do Inferno');
  const headGeometry=()=>new T.CircleGeometry(.13,4).rotateX(-Math.PI/2).translate(0,.27,0);add(flowers.filter(f=>!f.white),headGeometry(),mat(0xffd849,0x2a1900),'Flores amarelas do Inferno',true);add(flowers.filter(f=>f.white),headGeometry(),mat(0xf8f1d4,0x18160c),'Flores brancas do Inferno',true);
}
function setInfernoFloraDistance(value){infernoFloraDistance=Math.max(30,Math.min(180,Number(value)));if(infernoMode){const x=infernoFloraCenter.x===99999?0:infernoFloraCenter.x,z=infernoFloraCenter.y===99999?0:infernoFloraCenter.y;rebuildInfernoFlora(x,z);updateInfernoPropVisibility(x,z,true)}}
function updateInfernoFlora(playerPositions){if(!infernoMode||!playerPositions)return;const focus=[...playerPositions].find(entry=>entry&&(entry.hp===undefined||entry.hp>0)),position=focus&&(focus.pos||focus);if(!position)return;updateInfernoPropVisibility(position.x,position.z);if(Math.hypot(position.x-infernoFloraCenter.x,position.z-infernoFloraCenter.y)>infernoFloraDistance*.32)rebuildInfernoFlora(position.x,position.z)}
function updateInfernoProp(prop){
  const layers=prop.kind==='tree'?infernoPropMeshes.trees:prop.kind==='pillar'?infernoPropMeshes.pillars:infernoPropMeshes.rocks;
  for(const layer of layers){const dummy=new T.Object3D();layer.matrix(dummy,prop);layer.mesh.setMatrixAt(prop.index,dummy.matrix);layer.mesh.instanceMatrix.needsUpdate=true}
  for(const layer of infernoShadowMeshes){const index=prop.index;if(layer.items[index]!==prop)continue;const dummy=new T.Object3D();layer.matrix(dummy,prop);layer.mesh.setMatrixAt(index,dummy.matrix);layer.mesh.instanceMatrix.needsUpdate=true}
}
function destroyInfernoProp(prop,withEffect=true){
  if(!prop||prop.destroyed)return false;prop.destroyed=true;infernoDestroyed.add(prop.id);updateInfernoProp(prop);
  if(withEffect&&typeof shatterInfernoProp==='function')shatterInfernoProp(prop);
  if(withEffect&&typeof burst==='function')burst(prop.x,prop.y+Math.min(2,prop.height*.3),prop.z,prop.kind==='tree'?0x6f4a2c:0x888f8b,prop.kind==='pillar'?12:8,7);
  return true;
}
function infernoPropFromIntersection(hit){
  if(!infernoMode||!hit||hit.instanceId===undefined)return null;
  for(const layers of Object.values(infernoPropMeshes))for(const layer of layers)if(layer.mesh===hit.object)return layer.items[hit.instanceId]||null;
  return null;
}
function hitInfernoPropAtPoint(position,radius=.2){
  if(!infernoMode)return false;
  for(const prop of infernoCollidersNear(position.x,position.z,radius))if(position.y>=prop.y-radius&&position.y<=prop.y+prop.height+radius&&Math.hypot(position.x-prop.x,position.z-prop.z)<=prop.radius+radius){destroyInfernoProp(prop);infernoWorldRevision++;return true}
  return false;
}
function destroyInfernoProps(position,radius){
  if(!infernoMode||!position)return 0;let destroyed=0;
  const minX=Math.floor((position.x-radius-3)/24),maxX=Math.floor((position.x+radius+3)/24),minZ=Math.floor((position.z-radius-3)/24),maxZ=Math.floor((position.z+radius+3)/24);
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)for(const prop of infernoGrid.get(`${x},${z}`)||[]){
    if(prop.destroyed||Math.hypot(prop.x-position.x,prop.z-position.z)>radius+prop.radius)continue;
    if(destroyInfernoProp(prop))destroyed++;
  }
  if(destroyed)infernoWorldRevision++;return destroyed;
}
function applyInfernoDestroyed(ids=[]){
  for(const id of ids){const prop=infernoProps[id];if(!prop||prop.destroyed)continue;destroyInfernoProp(prop,false)}
}
function setInfernoWorld(enabled){
  infernoMode=!!enabled;if(!infernoTerrain){makeInfernoTerrain();scatterInfernoProps()}
  Collision.setWorld(infernoMode?terrainHeightAt:null,infernoMode?infernoCollidersNear:null);
  floor.visible=!infernoMode;infernoTerrain.visible=infernoMode;
  for(const layers of Object.values(infernoPropMeshes))for(const layer of layers)layer.mesh.visible=infernoMode;
  setInfernoLightingEffects(lightingEffects);
  for(const layer of flowerLayers)layer.mesh.visible=!infernoMode;
  if(infernoMode&&!infernoFloraMeshes.length)rebuildInfernoFlora(0,0);else for(const mesh of infernoFloraMeshes)mesh.visible=infernoMode;if(infernoMode)updateInfernoPropVisibility(0,0,true);
}
function infernoBossImpact(position,radius){return destroyInfernoProps(position,radius)}
