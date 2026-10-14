let arenaRadius=32,finalEncounter=false;
let infernoWave=-1,infernoWaveDelay=0,infernoWavePending=false;
const INFERNO_WAVE_NAMES=['CENTOPEIA TITÃ','GOLEM COLOSSAL','ETTIN GIGANTE'];

function configureArena(radius){
  arenaRadius=radius;const scale=radius/32;
  grassSystem.setArenaRadius(radius);
  floor.scale.set(scale,1,scale);arenaBoundary.scale.set(scale,1,scale);
  for(const mesh of forestMeshes){const dummy=new T.Object3D();TR.forEach((tree,i)=>{place(dummy,i,scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true}
  for(const mesh of wallMeshes){const dummy=new T.Object3D();WALL.forEach((block,i)=>{placeWall(dummy,i,scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true}
  for(const layer of flowerLayers){const dummy=new T.Object3D();layer.items.forEach((flower,i)=>{layer.place(dummy,i,scale);dummy.updateMatrix();layer.mesh.setMatrixAt(i,dummy.matrix)});layer.mesh.instanceMatrix.needsUpdate=true}
  sc.left=sc.bottom=-(radius+4);sc.right=sc.top=radius+4;sc.far=radius*2+16;sc.updateProjectionMatrix();
  cam.far=radius===32?200:radius>100?radius*2.2:300;cam.updateProjectionMatrix();scene.fog.near=radius===32?55:radius>100?180:90;scene.fog.far=radius===32?120:radius>100?900:200;
}
function clearArenaProjectiles(){
  EP.forEach(p=>scene.remove(p.m));EP.length=0;specialMissiles.forEach(p=>scene.remove(p.m));specialMissiles.length=0;
  bullets.forEach(b=>scene.remove(b.m));bullets.length=0;flyers.forEach(f=>scene.remove(f.g));flyers.length=0;
}
function resetCentipede(healthMultiplier=1,sizeMultiplier=1){
  Object.assign(B,{hp:2400*bossDifficulty.health*healthMultiplier,max:2400*bossDifficulty.health*healthMultiplier,dead:false,dt:0,state:'chase',st:0,next:2,t:0,travel:0,h:0,vs:0,rear:0,mouth:0,jaw:0,w:0,warn:0,sp:0,dirtClock:0,emergeHit:false});clearBurrowDust();
  B.segs.forEach((segment,i)=>{resetShatter(segment.root);segment.gone=false;segment.f=0;segment.root.visible=true;segment.root.scale.setScalar(sizeMultiplier);scene.add(segment.root);B.chain[i].set(-18,0,-6-i*SP*sizeMultiplier);B.disp[i].copy(B.chain[i]);B.Y[i]=sizeMultiplier;segment.root.position.set(B.disp[i].x,B.Y[i],B.disp[i].z)});
}
function clearSkeletonArmy(){A.u.forEach(u=>scene.remove(u.g));A.u.length=0;Object.assign(A,{on:false,wave:-1,killed:0,total:0,t:0})}
function resetGolem(healthMultiplier=1,sizeMultiplier=1){
  Object.assign(R,{on:false,hp:1800*bossDifficulty.health*healthMultiplier,max:1800*bossDifficulty.health*healthMultiplier,dead:false,deathComplete:false,dt:0,state:'land',st:0,stun:0,par:0,t:0,f:0,vx:0,vz:0,face:0,desperate:false,barrage:0,barrageIndex:0,hover:1,open:0,dr:0,vol:0,fc:0,lock:0,spin:0,rec:[0,0],txt:''});
  resetShatter(rg);rg.visible=false;rg.rotation.set(0,0,0);rg.scale.setScalar(sizeMultiplier);scene.remove(rg);
}
function resetTeamForArena(){
  const team=[...players.values()];team.forEach((player,index)=>{if(player.hp<=0)return;player.pos.set((index-(team.length-1)/2)*3,0,28);player.g.position.copy(player.pos);player.vx=player.vz=player.vy=player.kx=player.kz=0;player.ground=true;player.inv=Math.max(player.inv,2);player.dashTime=0;player.combo=null;player.strike=0;player.specialState=null;player.specialEffect.visible=false;player.laserTime=0;if(player.laserBeam)player.laserBeam.visible=false});
}
function startFinalEncounter(radius=56,staged=false){
  if(finalEncounter||over)return;
  finalEncounter=true;configureArena(radius);clearArenaProjectiles();resetCentipede();clearSkeletonArmy();resetGolem();
  eg.scale.setScalar(1);E.on=false;E.dead=false;E.deathComplete=false;eg.visible=false;renderEttinRage(false);
  const saved=P;P=localPlayer;
  if(staged){B.dead=true;B.segs.forEach(segment=>segment.root.visible=false)}
  else{startArmy();startRobot();rg.scale.setScalar(1);rg.position.set(20,14,-18);startEttin();eg.scale.setScalar(1);eg.position.set(-20,0,8)}
  P=saved;resetTeamForArena();
  if(!staged)banner('⚔ ÚLTIMA BATALHA: TODOS OS BOSSES JUNTOS!',4500);
  updateFinalHUD();
}
function startInfernoWave(wave){
  infernoWave=wave;infernoWavePending=false;infernoWaveDelay=0;clearSkeletonArmy();const saved=P;P=localPlayer;startArmy();P=saved;
  if(wave===0){resetCentipede(2,3);const spawn=enemySpawnPoint(76,106),face=Math.atan2(localPlayer.pos.x-spawn.x,localPlayer.pos.z-spawn.z);B.h=face;for(let i=0;i<N;i++){B.chain[i].set(spawn.x-Math.sin(face)*i*SP,0,spawn.z-Math.cos(face)*i*SP);B.disp[i].copy(B.chain[i])}}
  else if(wave===1){resetGolem(2,3);P=localPlayer;startRobot();P=saved;R.hp=R.max=3600*bossDifficulty.health;rg.scale.setScalar(3);const spawn=enemySpawnPoint(76,106);rg.position.set(spawn.x,spawn.y+14,spawn.z)}
  else if(wave===2){P=localPlayer;startEttin();P=saved;E.hp=E.max=6400*bossDifficulty.health;eg.scale.setScalar(3);const spawn=enemySpawnPoint(76,106);eg.position.copy(spawn)}
  banner(`🔥 ONDA ${wave+1}/3 · ${INFERNO_WAVE_NAMES[wave]} + ESQUELETOS`,4200);updateFinalHUD();
}
function startInfernoEncounter(){setInfernoWorld(true);startInfernoMusic();startFinalEncounter(INFERNO_RADIUS,true);startInfernoWave(0)}
function infernoBossDefeated(){
  if(infernoWave===0)return B.dead&&B.dt>N*.09+.5;
  if(infernoWave===1)return R.dead&&R.deathComplete;
  if(infernoWave===2)return E.dead&&E.deathComplete;
  return false;
}
function updateInfernoWaves(dt){
  if(!infernoMode||over||infernoWave<0)return;
  if(!infernoWavePending&&infernoBossDefeated()){infernoWavePending=true;infernoWaveDelay=2.2;banner(infernoWave<2?'BOSS DERROTADO · PRÓXIMA ONDA':'INFERNO CONCLUÍDO',2100)}
  if(!infernoWavePending)return;
  infernoWaveDelay-=dt;if(infernoWaveDelay>0)return;
  if(infernoWave===2)finish(true);else startInfernoWave(infernoWave+1);
}
function updateFinalHUD(){
  if(!finalEncounter)return;
  const armyLeft=Math.max(0,(A.total||0)-A.killed);
  if(infernoMode){
    const bossPercent=infernoWave===0?Math.max(0,B.hp/B.max):infernoWave===1?Math.max(0,R.hp/R.max):Math.max(0,E.hp/E.max),skeletonPercent=A.total?Math.max(0,armyLeft/A.total):0,percent=(bossPercent+skeletonPercent)*50;
    $('bt').textContent=`INFERNO · ONDA ${infernoWave+1}/3 · ${INFERNO_WAVE_NAMES[infernoWave]||'PREPARANDO'} ${Math.ceil(bossPercent*100)}% · ESQUELETOS ${armyLeft}`;$('bb').style.background='#ff7138';$('bb').style.width=percent+'%';return percent;
  }
  const percent=(Math.max(0,B.hp/B.max)+Math.max(0,R.hp/R.max)+Math.max(0,E.hp/E.max)+armyLeft/A.total)/4*100;
  $('bt').textContent=`BATALHA FINAL · Centopeia ${Math.ceil(Math.max(0,B.hp/B.max)*100)}% · Esqueletos ${armyLeft} · Golem ${Math.ceil(Math.max(0,R.hp/R.max)*100)}% · Ettin ${Math.ceil(Math.max(0,E.hp/E.max)*100)}%`;
  $('bb').style.background='#c87bff';$('bb').style.width=percent+'%';return percent;
}
function checkFinalVictory(){if(infernoMode)return;if(finalEncounter&&!over&&B.dead&&R.dead&&R.deathComplete&&E.dead&&E.deathComplete&&A.wave===2&&A.u.every(u=>u.dead))finish(true)}
