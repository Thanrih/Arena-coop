const CHARACTERS={
  ranger:{name:'Artilheiro',description:'Tiros rápidos à distância',interval:.13},
  fieldfighter:{name:'Fieldfighter',description:'Combo de 2 golpes massivos em cone',interval:.85,radius:4.8},
  arachnodroid:{name:'Arachondroid',description:'Laser contínuo · mais lento ao disparar',interval:.22}
};
const originalPlayerModel=P.g.clone(true);
const fieldFighterGeometries={};
function fieldFighterGeometry(name){
  if(fieldFighterGeometries[name])return fieldFighterGeometries[name];
  const data=FIELD_FIGHTER_MODEL.parts[name],pivot=FIELD_FIGHTER_MODEL.pivots[name];
  const count=data.length/14,positions=new Float32Array(count*9),colors=new Float32Array(count*9),solid=[],lights=[];
  const palette=FIELD_FIGHTER_MODEL.palette.map(hex=>[0,2,4].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255));
  for(let i=0;i<count;i++){
    const offset=i*14,index=parseInt(data.slice(offset+12,offset+14),36),color=palette[index];
    const indices=['78fef9','f93a1d','fed578'].includes(FIELD_FIGHTER_MODEL.palette[index])?lights:solid;
    indices.push(i*3,i*3+1,i*3+2);
    for(let k=0;k<3;k++){
      const v=parseInt(data.slice(offset+k*4,offset+k*4+4),36),j=i*9+k*3;
      positions[j]=(v>>13)/20-1.9-pivot[0];
      positions[j+1]=((v>>6)&127)/20-pivot[1];
      positions[j+2]=(v&63)/20-.8-pivot[2];
      colors.set(color,j);
    }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setIndex(solid.concat(lights));
  if(solid.length)geometry.addGroup(0,solid.length,0);if(lights.length)geometry.addGroup(solid.length,lights.length,1);
  geometry.computeVertexNormals();
  geometry.userData={source:FIELD_FIGHTER_MODEL.source,part:name};
  fieldFighterGeometries[name]=geometry;return geometry;
}
function characterInfo(id){return CHARACTERS[id]||CHARACTERS.ranger}
function selectedCharacter(){return document.querySelector('input[name="character"]:checked')?.value||'ranger'}
function buildFieldfighter(){
  const g=new T.Group(),rig=new T.Group(),mech=new T.Group();g.add(rig);rig.add(mech);mech.scale.setScalar(.45);
  g.name='Fieldfighter · original ZIP model';rig.name='Fieldfighter rig';
  g.userData={character:'fieldfighter',source:FIELD_FIGHTER_MODEL.source,objSha256:FIELD_FIGHTER_MODEL.objSha256};
  const material=[new T.MeshLambertMaterial({vertexColors:true,emissive:0x100a07}),new T.MeshBasicMaterial({vertexColors:true})];
  function part(name){
    const group=new T.Group();group.name='Fieldfighter '+name;
    group.position.fromArray(FIELD_FIGHTER_MODEL.pivots[name]);
    const mesh=new T.Mesh(fieldFighterGeometry(name),material);mesh.name=name+' · source triangles';group.add(mesh);mech.add(group);return group;
  }
  part('body');const legs=[part('leftLeg'),part('rightLeg')],arms=[part('leftArm'),part('rightArm')];
  g.traverse(o=>o.castShadow=true);
  return {g,rigRefs:{rig,lL:legs[0],lR:legs[1],aL:arms[0],aR:arms[1]}};
}
function configureCharacter(player,id,index=0){
  const character=Object.hasOwn(CHARACTERS,id)?id:'ranger';
  let model;
  if(character==='fieldfighter')model=buildFieldfighter();
  else if(character==='arachnodroid')model=buildArachnodroid();
  else{
    const g=originalPlayerModel.clone(true),rig=g.children[0],mech=rig.children[0];
    const colors=[0xffffff,0x88cfff,0xffb988,0xbbff99,0xe9a8ff,0xffef88,0xff91c2,0x91ffe8];
    g.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.color.setHex(colors[index%colors.length])}});
    model={g,rigRefs:{rig,lL:mech.children[1],lR:mech.children[2],aL:mech.children[3],aR:mech.children[4]}};
  }
  scene.remove(player.g);if(player.meleeRing)scene.remove(player.meleeRing);if(player.laserBeam)scene.remove(player.laserBeam);
  player.g=model.g;player.rigRefs=model.rigRefs;player.character=character;player.strike=0;player.fire=0;
  player.combo=null;player.dashCooldown=0;player.dashTime=0;player.laserTime=0;
  player.deathExploded=false;
  setupSpecial(player);
  player.g.position.copy(player.pos);scene.add(player.g);
  player.laserBeam=null;
  if(character==='arachnodroid'){
    player.laserBeam=new T.Mesh(new T.CylinderGeometry(.045,.045,1,6),new T.MeshBasicMaterial({color:0x37ccff,transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false}));
    player.laserBeam.visible=false;scene.add(player.laserBeam);
  }
  if(typeof $==='function'&&player===localPlayer)updateControls();
  player.meleeRing=null;
  if(character==='fieldfighter'){
    player.meleeRing=new T.Mesh(new T.TorusGeometry(1,.09,4,32,Math.PI*.6).rotateZ(Math.PI*.2).rotateX(Math.PI/2),new T.MeshBasicMaterial({color:0xffc34a,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));
    player.meleeRing.visible=false;scene.add(player.meleeRing);
  }
}
function performAttack(){
  if(P.character==='arachnodroid'){fireLaser();return}
  if(P.character!=='fieldfighter'){shoot();return}
  if(P.combo)return;
  const dx=aim.x-P.pos.x,dz=aim.z-P.pos.z;
  if(Math.hypot(dx,dz)>.01)P.face=Math.atan2(dx,dz);
  P.combo={elapsed:0,second:false,face:P.face};
  meleeImpact();
}
function meleeImpact(){
  const radius=CHARACTERS.fieldfighter.radius;
  const face=P.combo.face;
  const inRange=(position,padding=0,height=position.y)=>{
    const dx=position.x-P.pos.x,dz=position.z-P.pos.z,d=Math.hypot(dx,dz);
    return d<=radius+padding&&Math.abs(height-P.pos.y)<3.6&&(d<.05||(dx*Math.sin(face)+dz*Math.cos(face))/d>=Math.cos(Math.PI*.3));
  };
  P.strike=.25;P.inv=Math.max(P.inv,.12);shake=Math.max(shake,.7);
  burst(P.pos.x+Math.sin(face)*2,P.pos.y+.3,P.pos.z+Math.cos(face)*2,0xffb83e,20,8);
  grassSystem.addImpact(new T.Vector3(P.pos.x+Math.sin(face)*2,0,P.pos.z+Math.cos(face)*2),radius,1.1);
  if(!B.dead&&B.disp.some((position,i)=>inRange(position,B.segs[i].s*.4,B.Y[i]))){
    // One shared-health hit per strike, even when several body segments are in range.
    B.hp=Math.max(0,B.hp-260);B.segs.forEach((s,i)=>{if(inRange(B.disp[i],s.s*.4,B.Y[i]))s.f=.8});
    if(B.hp===0){B.dead=true;B.state='dead';flyers.forEach(f=>scene.remove(f.g));flyers.length=0}
  }
  for(let i=flyers.length-1;i>=0;i--){const f=flyers[i];if(!inRange(f.g.position,.3))continue;f.hp-=160;f.f=.15;if(f.hp<=0){shatterModel(f.g,32);burst(f.g.position.x,f.g.position.y,f.g.position.z,0x44ff99,12);scene.remove(f.g);flyers.splice(i,1)}}
  for(const u of A.u)if(!u.dead&&u.rise>=1&&inRange(u.g.position,.4)){skelHurt(u,160);if(!u.dead){const dx=u.g.position.x-P.pos.x,dz=u.g.position.z-P.pos.z,d=Math.hypot(dx,dz)||1;u.g.position.x+=dx/d*.8;u.g.position.z+=dz/d*.8}}
  if(R.on&&!R.dead&&inRange(rg.position,2,rg.position.y))robotHurt(240);
  if(E.on&&!E.dead&&inRange(eg.position,2.7,eg.position.y))ettinHurt(240);
}
function animateCharacter(player,dt){
  if(player.hp<=0||over){player.specialState=null;if(player.specialEffect)player.specialEffect.visible=false}
  if(player.laserBeam){player.laserTime=Math.max(0,player.laserTime-dt);player.laserBeam.visible=player.laserTime>0&&player.hp>0}
  if(player.character==='arachnodroid'){
    const moving=Math.min(1,Math.hypot(player.vx,player.vz)/9);
    player.rigRefs.legs.forEach((leg,i)=>{const phase=player.ph+(i===0||i===3?0:Math.PI);leg.rotation.set(Math.sin(phase)*.24*moving,0,0);leg.position.y=2.2+Math.max(0,Math.cos(phase))*.15*moving});return;
  }
  if(player.character!=='fieldfighter')return;
  if(player.combo){
    if(player.hp<=0||over)player.combo=null;
    else{player.combo.elapsed+=dt;if(!player.combo.second&&player.combo.elapsed>=.28){player.combo.second=true;meleeImpact()}if(player.combo.elapsed>=.58)player.combo=null}
  }
  player.strike=Math.max(0,player.strike-dt);
  const active=player.strike>0&&player.hp>0;
  player.meleeRing.visible=active;
  if(!active)return;
  const progress=1-player.strike/.25;
  const arm=player.combo?.second?player.rigRefs.aR:player.rigRefs.aL;arm.rotation.x=-2.5+progress*3.5;
  player.rigRefs.rig.rotation.x+=Math.sin(progress*Math.PI)*.25;
  player.meleeRing.position.set(player.pos.x,player.pos.y+.12,player.pos.z);
  player.meleeRing.rotation.y=player.combo?.face??player.face;
  player.meleeRing.scale.setScalar(.5+progress*CHARACTERS.fieldfighter.radius);
  player.meleeRing.material.opacity=(1-progress)*.95;
}
function buildArachnodroid(){
  const g=new T.Group(),rig=new T.Group(),mech=new T.Group();g.add(rig);rig.add(mech);mech.scale.setScalar(.65);
  g.name='Arachondroid · original ZIP model';g.userData={character:'arachnodroid',source:ARACHNODROID_MODEL.source,objSha256:ARACHNODROID_MODEL.objSha256};
  const materials=[new T.MeshLambertMaterial({vertexColors:true}),new T.MeshBasicMaterial({vertexColors:true})];
  const parts={};
  for(const [name,data]of Object.entries(ARACHNODROID_MODEL.parts)){
    const pivot=ARACHNODROID_MODEL.pivots[name],count=data.length/17,positions=[],colors=[],solid=[],lights=[];
    for(let i=0;i<count;i++){
      const hex=ARACHNODROID_MODEL.palette[parseInt(data.slice(i*17+15,i*17+17),36)],color=[0,2,4].map(k=>parseInt(hex.slice(k,k+2),16)/255);
      (['37aaf8','f98c5a','fe78e7'].includes(hex)?lights:solid).push(i*3,i*3+1,i*3+2);
      for(let k=0;k<3;k++){const v=parseInt(data.slice(i*17+k*5,i*17+k*5+5),36);positions.push((v>>14)/20-1.4-pivot[0],((v>>7)&127)/20-pivot[1],(v&127)/20-1.8-pivot[2]);colors.push(...color)}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(solid.concat(lights));geometry.addGroup(0,solid.length,0);geometry.addGroup(solid.length,lights.length,1);geometry.computeVertexNormals();geometry.userData={source:ARACHNODROID_MODEL.source,part:name};
    const part=new T.Group();part.position.fromArray(pivot);part.add(new T.Mesh(geometry,materials));mech.add(part);parts[name]=part;
  }
  g.traverse(o=>o.castShadow=true);
  return {g,rigRefs:{rig,legs:[parts.leftBack,parts.leftFront,parts.rightBack,parts.rightFront],lL:new T.Group(),lR:new T.Group(),aL:new T.Group(),aR:new T.Group()}};
}
function fireLaser(dt){
  const factor=dt===undefined?1:dt/CHARACTERS.arachnodroid.interval;
  P.laserFx=Math.max(0,(P.laserFx||0)-(dt||0));const spark=dt===undefined||P.laserFx<=0;if(spark)P.laserFx=.08;
  const origin=new T.Vector3(P.pos.x,P.pos.y+1.7,P.pos.z),direction=new T.Vector3(aim.x,aimY,aim.z).sub(origin);
  if(direction.lengthSq()<.01)direction.set(Math.sin(P.face),0,Math.cos(P.face));direction.normalize();
  scene.updateMatrixWorld(true);
  const hit=new T.Raycaster(origin,direction,.1,42).intersectObjects(picks(),true).find(h=>h.object.material!==lineM);
  const length=hit?hit.distance:42;
  P.laserBeam.position.copy(origin).addScaledVector(direction,length/2);P.laserBeam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);P.laserBeam.scale.set(1,length,1);P.laserTime=.14;P.laserBeam.visible=true;
  if(!hit)return;
  const belongs=root=>{for(let o=hit.object;o;o=o.parent)if(o===root)return true;return false};
  if(!B.dead&&B.segs.some(s=>belongs(s.root))){B.hp=Math.max(0,B.hp-28*factor);B.segs.forEach(s=>{if(belongs(s.root))s.f=.15});if(!B.hp){B.dead=true;B.state='dead';flyers.forEach(f=>scene.remove(f.g));flyers.length=0}}
  else if(R.on&&!R.dead&&belongs(rg))robotHurt(32*factor);
  else if(E.on&&!E.dead&&belongs(eg))ettinHurt(32*factor);
  else {const u=A.u.find(u=>!u.dead&&belongs(u.g));if(u)skelHurt(u,32*factor,!spark);else{const index=flyers.findIndex(f=>belongs(f.g));if(index>=0){const f=flyers[index];f.hp-=32*factor;f.f=.15;if(f.hp<=0){shatterModel(f.g,32);scene.remove(f.g);flyers.splice(index,1)}}}}
  if(spark)burst(hit.point.x,hit.point.y,hit.point.z,0x37ccff,5,4);
}
function updateDash(dt,input,ix,iz){
  P.dashCooldown=Math.max(0,(P.dashCooldown||0)-dt);
  if(input.dash&&P.dashCooldown<=0&&!P.specialState){
    const length=Math.hypot(ix,iz);P.dashX=length?ix/length:Math.sin(P.face);P.dashZ=length?iz/length:Math.cos(P.face);
    P.dashTime=.18;P.dashCooldown=1.5;P.inv=Math.max(P.inv,.2);burst(P.pos.x,P.pos.y+.3,P.pos.z,0x88ddff,8,4);
  }
  if(P.dashTime>0){const step=Math.min(dt,P.dashTime)*30;P.pos.x+=P.dashX*step;P.pos.z+=P.dashZ*step;P.dashTime=Math.max(0,P.dashTime-dt)}
}
function drawCharacterPreviews(){
  const palette={o:'#451500',y:'#fed578',b:'#363636',v:'#78fef9',w:'#e4e5e1',g:'#7096ba',r:'#f93a1d',k:'#070707'};
  const sprites={
    ranger:['.....wwwwww.....','....wwwwwwww....','....wbvvvvbw....','....wwwwwwww....','.....wwwwww.....','..ggwwwwwwwwgg..','.gggwwwwwwwwggg.','.gggbbwwwwbbggg.','..ggbbwwwwbbgg..','..ggbbwwwwbbgg..','...gbbbbbbbbgggg','.....bbbbbb.....','.....ww..ww.....','.....ww..ww.....','....www..www....','....bbb..bbb....'],
    fieldfighter:['..v..........v..','..kb........bk..','..kkbbrrrrbbkk..','...bbbbbbbbbb...','...ovbkkkbvo....','...obbkkkbbo....','..obkkbbkkkbo...','..bbkkbbkkkbb...','..obkkbbkkkbo...','..obkkbbkkkbo...','..obkkkkkkkbo...','..vb.bb..bb.bv..','.....bb..bb.....','.....bb..bb.....','.....bk..kb.....','.....vk..kv.....']
  };
  sprites.arachnodroid=['....oooooooo....','...oooooooooo...','...ovoooooovoo..','....bbbbbbbb....','.....bbbbbb.....','..o..bbvvbb..o..','.oooobbbbbboooo.','.o.o.bbbbbbo.o..','.o.o..brrb.o.o..','.o.o..bbbb.o.o..','.v.o.......o.v..','.b.v.......v.b..','.b.b.......b.b..','.b.b.......b.b..','.w.w.......w.w..','.www.......www..'];
  document.querySelectorAll('.character-preview').forEach(canvas=>{const context=canvas.getContext('2d');sprites[canvas.dataset.character].forEach((row,y)=>[...row].forEach((pixel,x)=>{if(palette[pixel]){context.fillStyle=palette[pixel];context.fillRect(x,y,1,1)}}))});
}
