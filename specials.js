const SPECIALS={
  ranger:{name:'Saraivada de mísseis',cooldown:8,duration:.55},
  fieldfighter:{name:'Avanço devastador',cooldown:6,duration:.32},
  arachnodroid:{name:'Megalaser',cooldown:10,duration:1.4}
};
const specialMissiles=[];
function setupSpecial(player){
  if(player.specialEffect)scene.remove(player.specialEffect);
  player.specialCooldown=0;player.specialState=null;
  player.specialEffect=new T.Mesh(new T.CylinderGeometry(1,1,1,8),new T.MeshBasicMaterial({color:player.character==='fieldfighter'?0xffb83e:0x86f7ff,transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false}));
  player.specialEffect.name='Special effect';player.specialEffect.visible=false;scene.add(player.specialEffect);
}
function prepareSpecial(dt,input){
  P.specialCooldown=Math.max(0,(P.specialCooldown||0)-dt);
  if(!input.special||P.specialCooldown>0||P.specialState||P.hp<=0||over)return;
  const info=SPECIALS[P.character],origin=new T.Vector3(P.pos.x,P.pos.y+1.7,P.pos.z),direction=new T.Vector3(aim.x,aimY,aim.z).sub(origin);
  if(direction.lengthSq()<.01)direction.set(Math.sin(P.face),0,Math.cos(P.face));direction.normalize();
  P.specialCooldown=info.cooldown;P.specialState={type:P.character,time:info.duration,elapsed:0,direction,origin,aim:new T.Vector3(aim.x,aimY,aim.z),hits:new Set(),fired:0};
  P.dashTime=0;P.combo=null;P.strike=0;
  ettinUltimate(P);
  if(P.character!=='ranger'){P.vx=P.vz=P.kx=P.kz=P.vy=0;P.face=Math.atan2(direction.x,direction.z)}
  if(P.character==='fieldfighter'){P.inv=Math.max(P.inv,.35);grassSystem.addImpact(P.pos,7,1.3)}
}
function lineEffect(mesh,start,end,width){
  const direction=end.clone().sub(start),length=direction.length();mesh.visible=length>.001;
  mesh.position.copy(start).addScaledVector(direction,.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());mesh.scale.set(width,length,width);
}
function damageSpecialTargets(inRange,damage,hits){
  const damageOnce=(key,fn)=>{if(hits?.has(key))return;if(hits)hits.add(key);fn()};
  if(!B.dead&&B.disp.some((q,i)=>inRange(new T.Vector3(q.x,B.Y[i],q.z),B.segs[i].s*.5)))damageOnce(B,()=>{
    B.hp=Math.max(0,B.hp-damage);B.segs.forEach(s=>s.f=.3);
    if(!B.hp){B.dead=true;B.state='dead';flyers.forEach(f=>scene.remove(f.g));flyers.length=0}
  });
  for(let i=flyers.length-1;i>=0;i--){const f=flyers[i];if(inRange(f.g.position,.6))damageOnce(f,()=>{f.hp-=damage;f.f=.15;if(f.hp<=0){shatterModel(f.g,32);scene.remove(f.g);flyers.splice(i,1)}})}
  for(const u of A.u)if(!u.dead&&u.rise>=1&&inRange(u.g.position.clone().add(new T.Vector3(0,1.2,0)),.6))damageOnce(u,()=>skelHurt(u,damage,true));
  if(R.on&&!R.dead&&inRange(rg.position.clone().add(new T.Vector3(0,4,0)),3))damageOnce(R,()=>robotHurt(damage));
  if(E.on&&!E.dead&&inRange(eg.position.clone().add(new T.Vector3(0,3,0)),2.7))damageOnce(E,()=>ettinHurt(damage));
}
function segmentRange(start,end,width,flat=false){
  const delta=end.clone().sub(start);if(flat)delta.y=0;const lengthSq=delta.lengthSq();
  return (point,padding=0)=>{
    if(flat&&Math.abs(point.y-start.y)>3.6)return false;
    const offset=point.clone().sub(start);if(flat)offset.y=0;
    const projection=lengthSq?offset.dot(delta)/lengthSq:0;if(projection<0||projection>1)return false;
    return offset.addScaledVector(delta,-projection).length()<=width+padding;
  };
}
function applySpecial(dt){
  const state=P.specialState;if(!state)return;
  if(P.hp<=0||over){P.specialState=null;P.specialEffect.visible=false;return}
  const step=Math.min(dt,state.time);
  if(state.type==='ranger'){
    while(state.fired<6&&state.elapsed+step>=state.fired*.09)launchSpecialMissile(P,state,state.fired++);
  }else if(state.type==='fieldfighter'){
    const from=P.pos.clone(),horizontal=state.direction.clone();horizontal.y=0;
    if(horizontal.lengthSq()<.001)horizontal.set(Math.sin(P.face),0,Math.cos(P.face));horizontal.normalize();
    P.pos.addScaledVector(horizontal,34*step);Collision.resolve(P.pos,.65,arenaRadius,{ground:P.ground});if(typeof destroyInfernoProps==='function')destroyInfernoProps(P.pos,1.25);
    damageSpecialTargets(segmentRange(from,P.pos,1.4,true),240,state.hits);
    lineEffect(P.specialEffect,state.origin,P.pos.clone().add(new T.Vector3(0,1.7,0)),.45);
  }else{
    // Lock position and aim for the whole cast, including jump, dash and knockback.
    P.pos.copy(state.origin).y-=1.7;P.vx=P.vz=P.kx=P.kz=P.vy=0;
    const end=state.origin.clone().addScaledVector(state.direction,55);
    lineEffect(P.specialEffect,state.origin,end,.8);damageSpecialTargets(segmentRange(state.origin,end,.8),240*step);
  }
  state.elapsed+=step;state.time=Math.max(0,state.time-step);
  if(state.time<=1e-8){P.specialState=null;P.specialEffect.visible=false}
}
function launchSpecialMissile(player,state,index){
  const m=new T.Group();m.name='Player special missile';m.userData.owner=player.id;
  m.add(new T.Mesh(missileBodyGeometry,steel),new T.Mesh(missileNoseGeometry,redM),new T.Mesh(missileFlameGeometry,flM));
  m.position.set(player.pos.x,player.pos.y+1.7,player.pos.z);
  const direction=state.direction.clone().applyAxisAngle(new T.Vector3(0,1,0),(index-2.5)*.1);
  m.lookAt(m.position.clone().add(direction));scene.add(m);specialMissiles.push({m,direction,target:state.aim.clone(),life:2.6,time:0});
}
function updateSpecialMissiles(dt){
  scene.updateMatrixWorld(true);
  for(let i=specialMissiles.length-1;i>=0;i--){
    const missile=specialMissiles[i];missile.time+=dt;missile.life-=dt;
    if(missile.time>.12&&missile.m.position.distanceTo(missile.target)>1)missile.direction.lerp(missile.target.clone().sub(missile.m.position).normalize(),Math.min(1,dt*5)).normalize();
    const distance=24*dt,hit=new T.Raycaster(missile.m.position,missile.direction,0,distance+.25).intersectObjects(picks(),true).find(h=>h.object.material!==lineM);
    missile.m.position.addScaledVector(missile.direction,distance);missile.m.lookAt(missile.m.position.clone().add(missile.direction));
    if(hit){const point=hit.point,worldProp=typeof infernoPropFromIntersection==='function'?infernoPropFromIntersection(hit):null;if(worldProp){destroyInfernoProp(worldProp);infernoWorldRevision++}damageSpecialTargets((q,padding)=>q.distanceTo(point)<=2+padding,80);destroyInfernoProps(point,2.2);burst(point.x,point.y,point.z,0xffaa33,12,7);grassSystem.addImpact(point,5,.9)}
    if(hit||missile.life<=0||over||missile.m.position.y<Collision.heightAt(missile.m.position.x,missile.m.position.z)||Math.hypot(missile.m.position.x,missile.m.position.z)>arenaRadius+28){scene.remove(missile.m);specialMissiles.splice(i,1)}
  }
}
