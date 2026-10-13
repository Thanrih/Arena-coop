let arenaRadius=32,finalEncounter=false;
function configureArena(radius){
  arenaRadius=radius;const scale=radius/32;
  grassSystem.setArenaRadius(radius);
  floor.scale.set(scale,1,scale);arenaBoundary.scale.set(scale,1,scale);
  for(const mesh of forestMeshes){const dummy=new T.Object3D();TR.forEach((tree,i)=>{place(dummy,i);dummy.position.x*=scale;dummy.position.z*=scale;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true}
  sc.left=sc.bottom=-(radius+4);sc.right=sc.top=radius+4;sc.far=radius*2+16;sc.updateProjectionMatrix();
  cam.far=radius===32?200:300;cam.updateProjectionMatrix();scene.fog.near=radius===32?55:90;scene.fog.far=radius===32?120:200;
}
function startFinalEncounter(){
  if(finalEncounter||over)return;
  finalEncounter=true;configureArena(56);
  EP.forEach(p=>scene.remove(p.m));EP.length=0;specialMissiles.forEach(p=>scene.remove(p.m));specialMissiles.length=0;
  bullets.forEach(b=>scene.remove(b.m));bullets.length=0;
  flyers.forEach(f=>scene.remove(f.g));flyers.length=0;
  Object.assign(B,{hp:2400*bossDifficulty.health,max:2400*bossDifficulty.health,dead:false,dt:0,state:'chase',st:0,next:2,t:0,travel:0,h:0,vs:0,rear:0,mouth:0,jaw:0,w:0,warn:0,sp:0,dirtClock:0,emergeHit:false});clearBurrowDust();
  B.segs.forEach((segment,i)=>{resetShatter(segment.root);segment.gone=false;segment.f=0;segment.root.visible=true;scene.add(segment.root);B.chain[i].set(-18,0,-6-i*SP);B.disp[i].copy(B.chain[i]);B.Y[i]=1;segment.root.position.set(B.disp[i].x,1,B.disp[i].z)});
  A.u.forEach(u=>scene.remove(u.g));A.u.length=0;Object.assign(A,{on:false,wave:-1,killed:0,t:0});
  Object.assign(R,{hp:1800*bossDifficulty.health,max:1800*bossDifficulty.health,dead:false,deathComplete:false,dt:0,state:'land',st:0,stun:0,par:0,t:0,f:0,vx:0,vz:0,face:0,desperate:false,barrage:0,barrageIndex:0,hover:1,open:0,dr:0,vol:0,fc:0,lock:0,spin:0,rec:[0,0],txt:''});
  resetShatter(rg);rg.visible=true;rg.rotation.set(0,0,0);rUp.rotation.set(0,0,0);rg.scale.setScalar(1);
  const saved=P;P=localPlayer;startArmy();startRobot();rg.position.set(20,14,-18);startEttin();eg.position.set(-20,0,8);P=saved;
  const team=[...players.values()];team.forEach((player,index)=>{if(player.hp<=0)return;player.pos.set((index-(team.length-1)/2)*3,0,28);player.g.position.copy(player.pos);player.vx=player.vz=player.vy=player.kx=player.kz=0;player.ground=true;player.inv=Math.max(player.inv,2);player.dashTime=0;player.combo=null;player.strike=0;player.specialState=null;player.specialEffect.visible=false;player.laserTime=0;if(player.laserBeam)player.laserBeam.visible=false});
  banner('⚔ ÚLTIMA BATALHA: TODOS OS BOSSES JUNTOS!',4500);
  updateFinalHUD();
}
function updateFinalHUD(){
  if(!finalEncounter)return;
  const armyLeft=Math.max(0,A.total-A.killed),percent=(Math.max(0,B.hp/B.max)+Math.max(0,R.hp/R.max)+Math.max(0,E.hp/E.max)+armyLeft/A.total)/4*100;
  $('bt').textContent=`BATALHA FINAL · Centopeia ${Math.ceil(Math.max(0,B.hp/B.max)*100)}% · Esqueletos ${armyLeft} · Golem ${Math.ceil(Math.max(0,R.hp/R.max)*100)}% · Ettin ${Math.ceil(Math.max(0,E.hp/E.max)*100)}%`;
  $('bb').style.background='#c87bff';$('bb').style.width=percent+'%';return percent;
}
function checkFinalVictory(){
  if(finalEncounter&&!over&&B.dead&&R.dead&&R.deathComplete&&E.dead&&E.deathComplete&&A.wave===2&&A.u.every(u=>u.dead))finish(true);
}
