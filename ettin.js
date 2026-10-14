// Ettin: authored animation clips, cone attacks and damage-driven rage.
const E={on:false,dead:false,deathComplete:false,hp:3200,max:3200,state:'chase',time:0,clock:0,cooldown:1.6,face:0,velocity:new T.Vector3(),pending:null,hits:new Set(),combo:0,rage:0,rageMax:100,enraged:false,par:0,stun:0};
const eg=new T.Group();eg.name='Ettin · Thomas DR';eg.userData={source:ETTIN_MODEL.source,author:ETTIN_MODEL.author};eg.visible=false;scene.add(eg);
const ettinMaterial=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,flatShading:true}),ettinJoints={};
for(const [name,data]of Object.entries(ETTIN_MODEL.parts)){
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(data.colors,3));geometry.setIndex(data.indices);geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,ettinMaterial);mesh.name=name;mesh.castShadow=true;
  const pivot=new T.Group();pivot.name=name+' animation joint';pivot.position.fromArray(ETTIN_MODEL.pivots[name]);pivot.add(mesh);ettinJoints[name]={pivot,rest:pivot.position.clone()};
}
eg.add(ettinJoints.torso.pivot);
for(const [name,joint]of Object.entries(ettinJoints))if(name!=='torso'){
  const side=name.startsWith('left')?'left':'right';
  const parent=name.endsWith('Axe')?side+'Forearm':name.endsWith('Forearm')?side+'Arm':name.endsWith('Shin')?side+'Leg':name.endsWith('Foot')?side+'Shin':'torso';
  joint.pivot.position.sub(ettinJoints[parent].rest);ettinJoints[parent].pivot.add(joint.pivot);
}
const ETTIN_CONE_ANGLE=Math.PI*110/180;
const ETTIN_MOVE_SPEED=9.2,ETTIN_DASH_SPEED=21;
const ETTIN_TIMING={windup:.52,roar:.65,swing:.48,strike:.12,comboWindup:.24,recover:.34,cooldown:.42,jump:.64};
// A fixed pool keeps the weapon trails inexpensive and synchronizable over LAN.
const ettinEffects=new T.Group();ettinEffects.name='Ettin weapon trails and shockwave';scene.add(ettinEffects);
const ettinTrailGeometry=new T.CylinderGeometry(1,1,1,6),ettinTrails=[];
for(let i=0;i<24;i++){const mesh=new T.Mesh(ettinTrailGeometry,new T.MeshBasicMaterial({color:0xffbd55,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));mesh.visible=false;ettinEffects.add(mesh);ettinTrails.push({mesh,life:0})}
const ettinShock=new T.Mesh(new T.RingGeometry(.9,1,64).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xffd478,transparent:true,opacity:0,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false}));ettinShock.visible=false;ettinEffects.add(ettinShock);
const ettinTips={left:new T.Vector3(),right:new T.Vector3()},ettinTrailUp=new T.Vector3(0,1,0);
let ettinTrailIndex=0;
const ettinWarning=new T.Mesh(new T.RingGeometry(.88,1,64).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xff9e35,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}));ettinWarning.name='Ettin attack warning';ettinWarning.visible=false;scene.add(ettinWarning);
const ettinCone=new T.Mesh(new T.CircleGeometry(1,48,-Math.PI/2-ETTIN_CONE_ANGLE/2,ETTIN_CONE_ANGLE).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xffac39,transparent:true,opacity:.23,side:T.DoubleSide,depthWrite:false}));ettinCone.name='Ettin axe cone';ettinCone.visible=false;scene.add(ettinCone);
const ETTIN_CLIPS={
  chop:[{t:0,p:{}},{t:.32,p:{torso:[-.18,-.3,-.08],rightArm:[-1.3,0,-.2],rightForearm:[-.55,0,0],leftArm:[.2,.1,-.2],leftLeg:[-.25,0,0],rightLeg:[.2,0,0],rightHead:[-.12,.1,0]}},{t:.49,p:{torso:[.38,.35,.12],rightArm:[1.35,0,.18],rightForearm:[.3,0,0],leftArm:[-.2,0,-.3],leftLeg:[.3,0,0],rightLeg:[-.22,0,0],rightHead:[.15,-.1,0]}},{t:.7,p:{torso:[.2,.2,.06],rightArm:[.85,0,.1],rightForearm:[.15,0,0]}},{t:1,p:{}}],
  sweep:[{t:0,p:{}},{t:.32,p:{torso:[-.08,-.55,-.12],leftArm:[-.4,1.3,-.4],leftForearm:[-.35,.3,0],rightArm:[-.2,0,.2],leftLeg:[-.18,0,-.08],rightLeg:[.25,0,.08]}},{t:.49,p:{torso:[.18,.65,.15],leftArm:[.45,-1.2,-.2],leftForearm:[.25,-.35,0],rightArm:[.25,0,.3],leftLeg:[.2,0,-.08],rightLeg:[-.25,0,.08]}},{t:.7,p:{torso:[.12,.35,.08],leftArm:[.3,-.7,-.15],leftForearm:[.1,-.2,0]}},{t:1,p:{}}],
  double:[{t:0,p:{}},{t:.32,p:{torso:[-.3,0,0],leftArm:[-2,0,-.2],rightArm:[-1.45,0,.2],leftForearm:[-.5,0,0],rightForearm:[-.5,0,0],leftLeg:[-.28,0,-.08],rightLeg:[-.28,0,.08],leftHead:[-.15,0,0],rightHead:[-.15,0,0]}},{t:.49,p:{torso:[.48,0,0],leftArm:[.7,0,-.1],rightArm:[1.5,0,.1],leftForearm:[.3,0,0],rightForearm:[.3,0,0],leftLeg:[.25,0,-.1],rightLeg:[.25,0,.1]}},{t:.7,p:{torso:[.28,0,0],leftArm:[.4,0,0],rightArm:[.9,0,0]}},{t:1,p:{}}]
};
function ettinEase(t){return t*t*(3-2*t)}
function ettinPose(clip,progress){
  const frames=ETTIN_CLIPS[clip];let a=frames[0],b=frames[1];
  for(let i=1;i<frames.length;i++){a=frames[i-1];b=frames[i];if(progress<=b.t)break}
  const blend=ettinEase(Math.max(0,Math.min(1,(progress-a.t)/(b.t-a.t))));
  for(const [name,joint]of Object.entries(ettinJoints)){const from=(a.t===0?E.poseStart?.[name]:null)||a.p[name]||[0,0,0],to=b.p[name]||[0,0,0];joint.pivot.rotation.set(...from.map((v,k)=>v+(to[k]-v)*blend))}
}
function ettinCapturePose(){return Object.fromEntries(Object.entries(ettinJoints).map(([name,joint])=>[name,joint.pivot.rotation.toArray().slice(0,3)]))}
function ettinImpactFX(radius){E.shockLife=.38;E.shockRadius=radius;ettinShock.position.copy(eg.position);ettinShock.position.y=.12;burst(eg.position.x,.3,eg.position.z,0xffb83e,24,10);grassSystem.addImpact(eg.position,radius,1.35);infernoBossImpact(eg.position,radius+2)}
function ettinUpdateEffects(dt){
  for(const trail of ettinTrails){trail.life=Math.max(0,trail.life-dt);trail.mesh.visible=trail.life>0;trail.mesh.material.opacity=trail.life/.16*.6}
  const swinging=E.state==='swing'||E.state==='combo',active=swinging&&E.time<.3;
  eg.updateMatrixWorld(true);
  for(const side of ['left','right']){
    const joint=ettinJoints[side+'Axe'],tip=new T.Vector3().fromArray(ETTIN_MODEL.joints[side+'Blade']).sub(joint.rest);joint.pivot.localToWorld(tip);
    if(active&&E.trailActive&&(E.clip==='double'||side===(E.clip==='sweep'?'left':'right'))){
      const delta=tip.clone().sub(ettinTips[side]),length=delta.length();
      if(length>.015){const trail=ettinTrails[ettinTrailIndex++%ettinTrails.length];trail.life=.16;trail.mesh.visible=true;trail.mesh.position.copy(tip).add(ettinTips[side]).multiplyScalar(.5);trail.mesh.quaternion.setFromUnitVectors(ettinTrailUp,delta.normalize());trail.mesh.scale.set(.14,length,.14);trail.mesh.material.opacity=.6}
    }
    ettinTips[side].copy(tip);
  }
  E.trailActive=active;E.shockLife=Math.max(0,(E.shockLife||0)-dt);ettinShock.visible=E.shockLife>0;
  if(ettinShock.visible){const t=1-E.shockLife/.38;ettinShock.scale.setScalar(1+t*E.shockRadius);ettinShock.material.opacity=(1-t)*.8}
}
function ettinResetAnimation(){for(const joint of Object.values(ettinJoints))joint.pivot.rotation.set(0,0,0);ettinJoints.torso.pivot.position.copy(ettinJoints.torso.rest);eg.rotation.set(0,E.face,0)}
function ettinAttackRate(){return bossDifficulty.attacks*(E.enraged?2:1)}
const ettinRageHUD=document.createElement('div');ettinRageHUD.id='ettin-rage';ettinRageHUD.hidden=true;ettinRageHUD.innerHTML='<div id="ettin-rage-label">RAGE · 0/100</div><div class="ettin-rage-track"><i id="ettin-rage-fill"></i></div>';document.body.append(ettinRageHUD);
function renderEttinRage(active,rage=0,enraged=false){
  ettinRageHUD.hidden=!active;const value=Math.max(0,Math.min(100,rage));
  $('ettin-rage-label').textContent=enraged?'RAGE CHEIA · ATAQUES 2×':'RAGE · '+value+'/100';$('ettin-rage-fill').style.width=value+'%';ettinRageHUD.classList.toggle('enraged',enraged);
}
function startEttin(){
  Object.assign(E,{on:true,dead:false,deathComplete:false,shattered:false,hp:3200*bossDifficulty.health,max:3200*bossDifficulty.health,state:'chase',time:0,clock:0,cooldown:.65,pending:null,combo:0,face:0,wave:0,rage:0,enraged:false,par:0,stun:0,swingCount:0,impactCount:0,slashTime:0,gait:0,stride:0,trailActive:false,shockLife:0,poseStart:null});
  ettinEffects.visible=true;ettinShock.visible=false;for(const trail of ettinTrails){trail.life=0;trail.mesh.visible=false}
  eg.visible=true;eg.position.set(0,0,-10);E.velocity.set(0,0,0);E.hits.clear();ettinWarning.visible=ettinCone.visible=false;ettinResetAnimation();
  $('bt').textContent='ETTIN · MACHADOS · ◇◇◇◇';$('bb').style.background='#f59838';renderEttinRage(true,0,false);
}
function ettinHurt(damage){if(!E.on||E.dead)return;E.hp=Math.max(0,E.hp-damage*(E.stun>0?1.6:1));if(!E.hp){E.dead=true;E.state='dead';E.time=0;E.stun=0;ettinWarning.visible=ettinCone.visible=false}}
function ettinUltimate(player){
  if(!E.on||E.dead||player.hp<=0||Math.random()>=.3)return false;
  E.pending=player.id;if(E.state==='chase'||E.state==='recover')ettinBeginAttack('jump',player);return true;
}
function ettinBeginAttack(kind,player){
  E.poseStart=ettinCapturePose();E.attack=kind;E.state='windup';E.time=0;E.target=player.id;E.destination=player.pos.clone();E.destination.y=0;
  const radius=Math.hypot(E.destination.x,E.destination.z);if(radius>arenaRadius-4)E.destination.multiplyScalar((arenaRadius-4)/radius);
  E.face=Math.atan2(E.destination.x-eg.position.x,E.destination.z-eg.position.z);E.velocity.multiplyScalar(.35);E.hits.clear();E.combo=0;E.pending=null;E.impact=false;
  E.windup=kind==='roar'?ETTIN_TIMING.roar:ETTIN_TIMING.windup;E.clip=kind==='axeSweep'?'sweep':kind==='slam'?'double':'chop';
  $('bt').textContent='ETTIN · '+({jump:'SALTO',slam:'MACHADOS EM CONE',axeSweep:'VARREDURA EM CONE',dash:'INVESTIDA',roar:'GRITO · PARRY!',combo:'COMBO DE 3 CONES'}[kind])+(E.enraged?' · RAGE 2×':'');
}
function ettinDamagePlayer(player,center,damage,push){
  const saved=P;P=player;
  if(parryCovers(center)){parrySucc('ettin');P=saved;return false}
  const before=P.hp;
  if(P.inv<=0&&!over){hurt(damage,center,'ettin',.24);if(P.hp>0&&P.specialState?.type!=='arachnodroid'){const dx=P.pos.x-center.x,dz=P.pos.z-center.z,l=Math.hypot(dx,dz)||1;P.kx=dx/l*push;P.kz=dz/l*push}}
  const dealt=P.hp<before;P=saved;
  if(dealt){E.rage=Math.min(E.rageMax,E.rage+10);if(E.rage===E.rageMax&&!E.enraged){E.enraged=true;banner('ETTIN EM RAGE · FREQUÊNCIA DE ATAQUES 2×',2500)}renderEttinRage(E.on&&!E.dead,E.rage,E.enraged)}
  return dealt;
}
function ettinHitArea(center,radius,damage,push,cone=false){
  for(const player of players.values()){
    if(player.hp<=0||E.hits.has(player.id)||over)continue;
    const dx=player.pos.x-center.x,dz=player.pos.z-center.z,d=Math.hypot(dx,dz);
    if(d>radius||(E.attack!=='roar'&&Math.abs(player.pos.y-center.y)>3.6))continue;
    if(cone&&d>.01&&(dx*Math.sin(E.face)+dz*Math.cos(E.face))/d<Math.cos(ETTIN_CONE_ANGLE/2))continue;
    E.hits.add(player.id);ettinDamagePlayer(player,center,damage,push);
  }
}
function ettinAxeImpact(){
  if(E.impact)return;E.impact=true;E.impactCount++;E.hits.clear();
  const final=E.clip==='double';E.coneRadius=final?10:8;ettinHitArea(eg.position,E.coneRadius,final?30:20,final?24:16,true);E.slashTime=.22;
  burst(eg.position.x+Math.sin(E.face)*4,.5,eg.position.z+Math.cos(E.face)*4,0xffb83e,18,8);shake=Math.max(shake,.65);
  ettinImpactFX(E.coneRadius);
}
function ettinStartSwing(){E.state=E.attack==='combo'?'combo':'swing';E.time=0;E.impact=false;E.swingCount++}
function ettinAnimate(){
  ettinResetAnimation();
  if(E.dead){const t=ettinEase(Math.min(1,E.time/.9));ettinJoints.torso.pivot.rotation.x=t*1.3;return}
  if(E.state==='stagger'){ettinJoints.torso.pivot.rotation.x=.42;ettinJoints.torso.pivot.rotation.z=Math.sin(E.clock*34)*.035;ettinJoints.leftHead.pivot.rotation.x=.45;ettinJoints.rightHead.pivot.rotation.x=.45;ettinJoints.leftArm.pivot.rotation.x=.7;ettinJoints.rightArm.pivot.rotation.x=.7;return}
  if(E.state==='windup'&&['combo','slam','axeSweep'].includes(E.attack))ettinPose(E.clip,Math.min(.32,E.time/E.windup*.32));
  else if(E.state==='comboWindup')ettinPose(E.clip,Math.min(.32,E.time/ETTIN_TIMING.comboWindup*.32));
  else if(E.state==='combo'||E.state==='swing')ettinPose(E.clip,.32+Math.min(1,E.time/ETTIN_TIMING.swing)*.68);
  else if(E.state==='air'){const t=Math.min(1,E.time/ETTIN_TIMING.jump);ettinPose('double',.32+ettinEase(t)*.17);ettinJoints.leftLeg.pivot.rotation.x=.65*Math.sin(t*Math.PI);ettinJoints.rightLeg.pivot.rotation.x=-.45*Math.sin(t*Math.PI)}
  else if(E.state==='dash'){ettinJoints.torso.pivot.rotation.x=.35;ettinJoints.leftArm.pivot.rotation.x=-.5;ettinJoints.rightArm.pivot.rotation.x=-.35;ettinJoints.leftLeg.pivot.rotation.x=Math.sin(E.clock*18)*.65;ettinJoints.rightLeg.pivot.rotation.x=-Math.sin(E.clock*18)*.65}
  else if(E.state==='windup'&&E.attack==='roar'){const t=ettinEase(Math.min(1,E.time/E.windup));ettinJoints.leftHead.pivot.rotation.x=-.35*t;ettinJoints.rightHead.pivot.rotation.x=-.35*t}
  else if(E.state==='windup'){ettinPose('double',Math.min(.32,E.time/E.windup*.32))}
  else {
    const walk=Math.sin(E.stride)*E.gait,breath=Math.sin(E.clock*3)*.035;
    ettinJoints.torso.pivot.rotation.set(.13*E.gait+breath,walk*.1,-walk*.07);
    for(const [side,sign]of [['left',1],['right',-1]]){const phase=E.stride+(sign===1?0:Math.PI);ettinJoints[side+'Leg'].pivot.rotation.x=sign*walk*.65;ettinJoints[side+'Shin'].pivot.rotation.x=-Math.max(0,-Math.sin(phase))*.75*E.gait;ettinJoints[side+'Foot'].pivot.rotation.x=Math.sin(phase+.6)*.2*E.gait;ettinJoints[side+'Arm'].pivot.rotation.x=-sign*walk*.28;ettinJoints[side+'Forearm'].pivot.rotation.x=-.12*E.gait;ettinJoints[side+'Head'].pivot.rotation.x=-breath-sign*walk*.035}
    ettinJoints.torso.pivot.position.y+=Math.abs(Math.cos(E.stride))*.16*E.gait+breath;
    if(E.state==='recover'&&E.recoverPose){const blend=ettinEase(Math.min(1,E.time/ETTIN_TIMING.recover));for(const [name,joint]of Object.entries(ettinJoints)){const from=E.recoverPose[name];joint.pivot.rotation.set(...from.map((v,k)=>v+(joint.pivot.rotation.toArray()[k]-v)*blend))}}
  }
}
function ettinRecover(){E.recoverPose=ettinCapturePose();E.state='recover';E.time=0;E.velocity.multiplyScalar(.55)}
function ettinCombatAdvance(player,dt,factor,turn=true){
  const delta=player.pos.clone().sub(eg.position);delta.y=0;const distance=delta.length();if(distance<.01)return;
  const targetFace=Math.atan2(delta.x,delta.z);if(turn)E.face+=ad(E.face,targetFace)*(1-Math.exp(-dt*6));
  const desired=delta.normalize().multiplyScalar(distance>3.8?ETTIN_MOVE_SPEED*factor*bossDifficulty.speed:0);
  E.velocity.lerp(desired,1-Math.exp(-dt*8));eg.position.addScaledVector(E.velocity,dt);
}
function updEttin(dt){
  if(!E.on||over)return;const step=dt*ettinAttackRate();E.clock+=dt;E.time+=step;
  if(E.dead){ettinEffects.visible=false;ettinAnimate();renderEttinRage(false);if(E.time>.95&&!E.shattered){E.shattered=true;shatterModel(eg,100)}if(E.time>2.2&&!E.deathComplete){E.deathComplete=true;eg.visible=false;if(!finalEncounter)finish(true)}P=localPlayer;return}
  selectTarget(eg.position,E,dt);const player=P;
  if(E.state==='stagger'){
    E.stun=Math.max(0,E.stun-dt);E.velocity.multiplyScalar(Math.exp(-dt*10));
    if(E.stun<=0){E.par=0;E.state='chase';E.time=0;E.cooldown=.7}
  }else if(E.state==='chase'){
    const delta=player.pos.clone().sub(eg.position);delta.y=0;const distance=delta.length();E.face+=ad(E.face,Math.atan2(delta.x,delta.z))*(1-Math.exp(-dt*12));
    const desired=delta.normalize().multiplyScalar(distance>4.8?ETTIN_MOVE_SPEED*bossDifficulty.speed*(E.enraged?1.12:1):0);E.velocity.lerp(desired,1-Math.exp(-dt*10));eg.position.addScaledVector(E.velocity,dt);E.cooldown-=step;
    if(E.pending){const target=players.get(E.pending);E.pending=null;if(target?.hp>0)ettinBeginAttack('jump',target)}
    else if(E.cooldown<=0){const choices=distance>12?['jump','dash','dash']:['slam','axeSweep','combo','combo','roar'];ettinBeginAttack(choices[Math.floor(Math.random()*choices.length)],player)}
  }else if(E.state==='windup'&&E.time>=E.windup){
    E.time=0;
    if(E.attack==='jump'){E.state='air';E.jumpStart=eg.position.clone()}
    else if(E.attack==='dash')E.state='dash';
    else if(E.attack==='roar'){ettinHitArea(eg.position,arenaRadius*2,10,38);E.wave=.7;E.waveOrigin=eg.position.clone();ettinImpactFX(16);shake=Math.max(shake,.7);ettinRecover()}
    else ettinStartSwing();
  }else if(E.state==='air'){
    const t=Math.min(1,E.time/ETTIN_TIMING.jump);eg.position.lerpVectors(E.jumpStart,E.destination,t);eg.position.y=4*t*(1-t)*7;
    if(t===1){eg.position.copy(E.destination);E.hits.clear();ettinHitArea(eg.position,9,32,24);ettinImpactFX(12);ettinRecover();shake=1.3}
  }else if(E.state==='dash'){
    const steps=Math.ceil(dt*ETTIN_DASH_SPEED*bossDifficulty.speed/.5)||1;
    for(let i=0;i<steps;i++){eg.position.x+=Math.sin(E.face)*ETTIN_DASH_SPEED*dt*bossDifficulty.speed/steps;eg.position.z+=Math.cos(E.face)*ETTIN_DASH_SPEED*dt*bossDifficulty.speed/steps;ettinHitArea(eg.position,3,22,26)}
    if(E.time>.5)ettinRecover();
  }else if(E.state==='combo'||E.state==='swing'){
    // One synchronized impact as the authored axe clip crosses its strike frame.
    if(E.time>=ETTIN_TIMING.strike)ettinAxeImpact();
    if(E.time>=ETTIN_TIMING.swing){
      if(E.attack==='combo'&&E.combo<2){E.poseStart=ettinCapturePose();E.combo++;E.clip=E.combo===1?'sweep':'double';E.state='comboWindup';E.time=0;E.impact=false}
      else ettinRecover();
    }
  }else if(E.state==='comboWindup'&&E.time>=ETTIN_TIMING.comboWindup)ettinStartSwing();
  else if(E.state==='recover'&&E.time>=ETTIN_TIMING.recover){E.state='chase';E.cooldown=ETTIN_TIMING.cooldown;E.time=0}
  if(E.state==='windup')ettinCombatAdvance(player,dt,E.attack==='roar'?.12:.36,true);
  else if(E.state==='comboWindup')ettinCombatAdvance(player,dt,.28,true);
  else if(E.state==='combo'||E.state==='swing')ettinCombatAdvance(player,dt,.2,false);
  else if(E.state==='recover')ettinCombatAdvance(player,dt,.24,true);
  const radius=Math.hypot(eg.position.x,eg.position.z);if(radius>arenaRadius-3){eg.position.x*=(arenaRadius-3)/radius;eg.position.z*=(arenaRadius-3)/radius}
  E.gait+=((['chase','recover'].includes(E.state)?Math.min(1,E.velocity.length()/ETTIN_MOVE_SPEED):0)-E.gait)*(1-Math.exp(-dt*12));E.stride+=dt*E.velocity.length()*1.15;
  ettinAnimate();ettinUpdateEffects(dt);E.wave=Math.max(0,E.wave-dt);E.slashTime=Math.max(0,E.slashTime-step);
  const melee=['combo','slam','axeSweep'].includes(E.attack),preparing=E.state==='windup'||E.state==='comboWindup';
  ettinCone.visible=melee&&(preparing||E.slashTime>0);ettinCone.position.copy(eg.position);ettinCone.position.y=.09;ettinCone.rotation.y=E.face;ettinCone.scale.setScalar(E.clip==='double'?10:8);ettinCone.material.opacity=E.slashTime>0?.55:.18;
  ettinWarning.visible=E.wave>0||(!melee&&(E.state==='windup'||E.state==='air'));ettinWarning.position.copy(E.wave>0?E.waveOrigin:E.attack==='jump'?E.destination:eg.position);ettinWarning.position.y=.08;ettinWarning.scale.setScalar(E.wave>0?1+(1-E.wave/.7)*arenaRadius*2:E.attack==='roar'?arenaRadius:9);
  if(!finalEncounter&&E.state==='stagger')$('bt').textContent='ETTIN · VULNERÁVEL!';
  renderEttinRage(true,E.rage,E.enraged);P=localPlayer;
}
