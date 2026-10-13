const deathFragments=[],shatteredModels=new WeakSet(),cubeGeometry=new T.BoxGeometry(1,1,1),cubeMaterials=new Map();
function fragmentMaterial(hex){
  if(!cubeMaterials.has(hex))cubeMaterials.set(hex,new T.MeshLambertMaterial({color:hex}));return cubeMaterials.get(hex);
}
function shatterModel(model,count=64,owner=null){
  if(shatteredModels.has(model))return;shatteredModels.add(model);model.updateWorldMatrix(true,true);
  const meshes=[];model.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position)return;const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>=.7)))meshes.push(o)});
  if(!meshes.length)return;
  for(let i=0;i<count;i++){
    const source=meshes[i%meshes.length],positions=source.geometry.attributes.position,vertex=Math.floor(Math.random()*positions.count);
    const point=new T.Vector3().fromBufferAttribute(positions,vertex).applyMatrix4(source.matrixWorld);
    const colors=source.geometry.attributes.color,material=Array.isArray(source.material)?source.material[0]:source.material;
    const color=colors?new T.Color().fromArray([colors.getX(vertex),colors.getY(vertex),colors.getZ(vertex)]):material?.color?.clone()||new T.Color(0xcccccc);
    if(colors&&material?.color)color.multiply(material.color);
    const size=rnd(.12,.26),cube=new T.Mesh(cubeGeometry,fragmentMaterial(color.getHex()));cube.name='Death cube';cube.userData.owner=owner;cube.scale.setScalar(size);cube.position.copy(point);cube.position.y=Math.max(size,point.y);cube.castShadow=true;
    const angle=rnd(0,Math.PI*2),speed=rnd(2,7);scene.add(cube);
    deathFragments.push({m:cube,size,velocity:new T.Vector3(Math.cos(angle)*speed,rnd(4,9),Math.sin(angle)*speed),spin:new T.Vector3(rnd(-9,9),rnd(-9,9),rnd(-9,9)),life:4.5,bounces:0});
  }
  // Fragments share cube geometry; bound the active physics bodies.
  while(deathFragments.length>800){const old=deathFragments.shift();scene.remove(old.m)}
  model.visible=false;
}
function shatterPlayer(player){
  if(player.deathExploded)return;player.deathExploded=true;shatterModel(player.g,72,player.id);
  player.g.visible=false;player.ring.visible=false;if(player.meleeRing)player.meleeRing.visible=false;if(player.laserBeam)player.laserBeam.visible=false;if(player.specialEffect)player.specialEffect.visible=false;player.specialState=null;
}
function updateEnemyDeaths(){
  for(const u of A.u)if(u.dead)shatterModel(u.g,32);
  if(B.dead&&B.hp<=0)for(const segment of B.segs)shatterModel(segment.root,8);
  if(R.dead)shatterModel(rg,100);
}
function updateDeathPhysics(dt){
  const steps=Math.max(1,Math.ceil(dt/.016)),step=dt/steps;
  for(let i=deathFragments.length-1;i>=0;i--){
    const body=deathFragments[i];body.life-=dt;
    for(let j=0;j<steps;j++){
      body.velocity.y-=22*step;body.m.position.addScaledVector(body.velocity,step);
      body.m.rotation.x+=body.spin.x*step;body.m.rotation.y+=body.spin.y*step;body.m.rotation.z+=body.spin.z*step;
      const ground=body.size*.87;
      if(body.m.position.y<ground){body.m.position.y=ground;if(body.velocity.y<-.8){body.velocity.y*=-.38;body.bounces++;body.spin.multiplyScalar(.65)}else{body.velocity.y=0;body.spin.multiplyScalar(Math.exp(-9*step))};body.velocity.x*=Math.exp(-5*step);body.velocity.z*=Math.exp(-5*step)}
      const radius=Math.hypot(body.m.position.x,body.m.position.z),limit=arenaRadius-body.size;
      if(radius>limit){const nx=body.m.position.x/radius,nz=body.m.position.z/radius,velocity=body.velocity.x*nx+body.velocity.z*nz;body.m.position.x=nx*limit;body.m.position.z=nz*limit;if(velocity>0){body.velocity.x-=nx*velocity*1.4;body.velocity.z-=nz*velocity*1.4}}
    }
    const shrink=Math.min(1,Math.max(0,body.life)/.7);body.m.scale.setScalar(body.size*shrink);
    if(body.life<=0){scene.remove(body.m);deathFragments.splice(i,1)}
  }
}
function resetShatter(model){shatteredModels.delete(model)}
