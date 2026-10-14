const deathFragments=[],shatteredModels=new WeakSet(),cubeGeometry=new T.BoxGeometry(1,1,1),cubeMaterials=new Map();
function fragmentMaterial(hex){
  if(!cubeMaterials.has(hex))cubeMaterials.set(hex,new T.MeshLambertMaterial({color:hex}));return cubeMaterials.get(hex);
}
function spawnVoxelExplosion(position,palette,count=18,spread=2,height=3,owner=null){
  for(let i=0;i<count;i++){
    const size=rnd(.14,.34),cube=new T.Mesh(cubeGeometry,fragmentMaterial(palette[i%palette.length]));cube.name='World voxel debris';cube.userData.owner=owner;cube.scale.setScalar(size);
    const angle=rnd(0,Math.PI*2),radial=rnd(0,spread);cube.position.set(position.x+Math.cos(angle)*radial,position.y+rnd(.2,height),position.z+Math.sin(angle)*radial);cube.castShadow=true;scene.add(cube);
    const speed=rnd(3,9);deathFragments.push({m:cube,size,velocity:new T.Vector3(Math.cos(angle)*speed,rnd(4,11),Math.sin(angle)*speed),spin:new T.Vector3(rnd(-11,11),rnd(-11,11),rnd(-11,11)),life:rnd(3.4,5),bounces:0});
  }
  while(deathFragments.length>800){const old=deathFragments.shift();scene.remove(old.m)}
}
function shatterInfernoProp(prop){
  const style=prop.kind==='tree'?{palette:[0x5b3822,0x74492b,0x34773c,0x4d984d],count:22,spread:prop.radius*.8,height:Math.min(11,prop.height)}:prop.kind==='pillar'?{palette:[0x626b69,0x7e8782,0x9ba19a],count:26,spread:prop.radius*.75,height:prop.height}:{palette:[0x646b69,0x858d89,0xa3aaa5],count:16,spread:prop.radius,height:prop.height};
  spawnVoxelExplosion(new T.Vector3(prop.x,prop.y,prop.z),style.palette,style.count,style.spread,style.height,'inferno-prop-'+prop.id);
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
    const size=rnd(.12,.26),cube=new T.Mesh(cubeGeometry,fragmentMaterial(color.getHex()));cube.name='Death cube';cube.userData.owner=owner;cube.scale.setScalar(size);cube.position.copy(point);cube.position.y=Math.max(Collision.heightAt(point.x,point.z)+size,point.y);cube.castShadow=true;
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
      const ground=Collision.heightAt(body.m.position.x,body.m.position.z)+body.size*.87;
      if(body.m.position.y<ground){body.m.position.y=ground;if(body.velocity.y<-.8){body.velocity.y*=-.38;body.bounces++;body.spin.multiplyScalar(.65)}else{body.velocity.y=0;body.spin.multiplyScalar(Math.exp(-9*step))};body.velocity.x*=Math.exp(-5*step);body.velocity.z*=Math.exp(-5*step)}
      const beforeX=body.m.position.x,beforeZ=body.m.position.z;Collision.resolve(body.m.position,body.size,arenaRadius);if(body.m.position.x!==beforeX||body.m.position.z!==beforeZ){body.velocity.x*=-.28;body.velocity.z*=-.28}
    }
    const shrink=Math.min(1,Math.max(0,body.life)/.7);body.m.scale.setScalar(body.size*shrink);
    if(body.life<=0){scene.remove(body.m);deathFragments.splice(i,1)}
  }
}
function resetShatter(model){shatteredModels.delete(model)}
