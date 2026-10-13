const assert=require('node:assert/strict');
module.exports=async function(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1100,height:900}});
  try{
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('#solo-mode').click();await page.locator('.card[data-m="5"]').click();
    assert.ok(await page.evaluate(()=>E.on&&!A.on&&!R.on&&B.dead&&ETTIN_MODEL.author==='Thomas DR'));
    const result=await page.evaluate(()=>{
      guestOnly=true;guestFrame=()=>{};P=localPlayer;
      function reset(){over=false;startEttin();eg.position.set(0,0,0);P=localPlayer;P.pos.set(0,0,4);P.hp=100;P.inv=P.parry=P.pcd=P.pHit=P.kx=P.kz=0;P.specialState=null;E.face=0;ettinResetAnimation()}
      reset();E.attack='combo';const cone=[];
      for(const [x,y,z]of [[0,0,4],[2,0,4],[5,0,2],[0,0,-3],[0,0,9],[0,5,4]]){P.pos.set(x,y,z);P.hp=100;P.inv=P.parry=0;E.hits.clear();ettinHitArea(eg.position,8,20,16,true);cone.push(100-P.hp)}
      reset();E.attack='combo';P.parry=.3;P.parryFace=Math.PI;ettinHitArea(eg.position,8,20,16,true);const parry=P.hp===100&&E.rage===0;
      reset();E.attack='combo';for(let i=0;i<4;i++){P.parry=.3;P.parryFace=Math.PI;P.pHit=0;E.hits.clear();ettinHitArea(eg.position,8,20,16,true)}const stagger=E.state==='stagger'&&E.stun===6.5&&E.par===4;const staggerHp=E.hp;ettinHurt(100);const vulnerable=staggerHp-E.hp===160;updEttin(6.6);const recovered=E.state==='chase'&&E.stun===0&&E.par===0;
      E.hits.clear();P.parry=0;P.inv=1;ettinHitArea(eg.position,8,20,16,true);const invulnerable=P.hp===100&&E.rage===0;
      reset();E.attack='combo';for(let i=0;i<9;i++){P.hp=100;P.inv=0;E.hits.clear();ettinHitArea(eg.position,8,1,0,true)}const partial=E.rage===90&&!E.enraged&&ettinAttackRate()===1;
      P.inv=0;E.hits.clear();ettinHitArea(eg.position,8,1,0,true);const full=E.rage===100&&E.enraged&&ettinAttackRate()===2;
      P.inv=0;E.hits.clear();ettinHitArea(eg.position,8,1,0,true);const capped=E.rage===100;
      function runCombo(rage){reset();P.inv=100;E.rage=rage?100:0;E.enraged=rage;ettinBeginAttack('combo',P);let time=0;while(E.state!=='recover'&&time<8){updEttin(.01);time+=.01}return {time,hits:E.impactCount,swings:E.swingCount,finite:Object.values(ettinJoints).every(j=>j.pivot.rotation.toArray().slice(0,3).every(Number.isFinite))}}
      const normal=runCombo(false),rage=runCombo(true);
      reset();ettinBeginAttack('combo',P);P.inv=100;while(E.state==='windup')updEttin(.01);for(let i=0;i<11;i++)updEttin(.01);const before=E.impactCount;updEttin(.02);const timedImpact=before===0&&E.impactCount===1;const effects=ettinShock.visible&&ettinTrails.some(t=>t.mesh.visible);for(let i=0;i<25;i++)ettinUpdateEffects(.02);const effectsExpire=!ettinShock.visible&&ettinTrails.every(t=>!t.mesh.visible);
      reset();P.pos.set(0,0,25);P.inv=100;E.cooldown=10;for(let i=0;i<60;i++)updEttin(1/60);const chase=eg.position.z>7&&E.velocity.length()>8.5&&Math.abs(ettinJoints.leftShin.pivot.rotation.x)+Math.abs(ettinJoints.rightShin.pivot.rotation.x)>.1;
      reset();P.pos.set(0,0,18);P.inv=100;ettinBeginAttack('combo',P);const attackStart=eg.position.clone();for(let i=0;i<25;i++)updEttin(.01);const attackMove=eg.position.distanceTo(attackStart);const movingAttack=attackMove>.08&&attackMove<1.5;
      reset();ettinBeginAttack('slam',P);E.state='swing';E.clip='double';P.inv=100;ettinAxeImpact();const one=E.impactCount;ettinAxeImpact();const dedup=one===1&&E.impactCount===1;
      reset();const random=Math.random;Math.random=()=>.299999;const yes=ettinUltimate(P),target=E.target;reset();Math.random=()=>.3;const no=ettinUltimate(P);
      reset();Math.random=()=>.1;ettinBeginAttack('combo',P);const queued=ettinUltimate(P)&&E.pending===P.id;E.state='recover';E.time=1;updEttin(.01);updEttin(.01);const consumed=E.attack==='jump'&&!E.pending&&E.target===P.id;
      reset();let rolls=0;Math.random=()=>{rolls++;return .5};P.specialCooldown=0;aim.set(0,1.7,20);aimY=1.7;prepareSpecial(.01,{special:true});prepareSpecial(.01,{special:true});const once=rolls===1;Math.random=random;
      reset();ettinBeginAttack('jump',P);E.time=E.windup;updEttin(.01);const destination=E.destination.clone();P.inv=100;for(let i=0;i<30&&E.state==='air';i++)updEttin(.04);const landed=eg.position.distanceTo(destination)<.01&&E.state==='recover';
      reset();configureCharacter(P,'fieldfighter');P.pos.set(0,0,3);P.face=Math.PI;P.combo={face:Math.PI};meleeImpact();const melee=E.hp===E.max-240;
      reset();damageSpecialTargets(()=>true,240,new Set());const special=E.hp===E.max-240;
      reset();configureCharacter(P,'arachnodroid');P.pos.set(0,0,10);aim.set(0,3,0);aimY=3;eg.updateMatrixWorld(true);fireLaser(.1);const laser=E.hp<E.max;
      reset();return {cone,parry,stagger,vulnerable,recovered,invulnerable,partial,full,capped,normal,rage,timedImpact,effects,effectsExpire,chase,movingAttack,dedup,yes,no,target,queued,consumed,once,landed,melee,special,laser,noPhysics:typeof ettinRagdoll==='undefined'&&typeof ettinBodies==='undefined'};
    });
    assert.deepEqual(result.cone,[20,20,0,0,0,0]);
    for(const key of ['parry','stagger','vulnerable','recovered','invulnerable','partial','full','capped','timedImpact','effects','effectsExpire','chase','movingAttack','dedup','yes','queued','consumed','once','landed','melee','special','laser','noPhysics'])assert.ok(result[key],key+': '+JSON.stringify(result));
    for(const combo of [result.normal,result.rage]){assert.equal(combo.hits,3);assert.equal(combo.swings,3);assert.ok(combo.finite)}
    assert.ok(result.normal.time<2.6,JSON.stringify(result));
    assert.ok(Math.abs(result.normal.time/2-result.rage.time)<.04,JSON.stringify(result));assert.equal(result.no,false);assert.equal(result.target,'solo');
    await page.evaluate(()=>{
      P=localPlayer;configureCharacter(P,'ranger');updateControls();updateTeamUI();$('bn').style.display='none';P.inv=100;ettinBeginAttack('combo',P);E.time=.48;updEttin(0);
      cam.position.set(12,9,16);cam.lookAt(0,3,1);ren.setRenderTarget(null);ren.render(scene,cam);
    });await page.screenshot({path:'test-results/ettin-authored-windup.png'});
    await page.evaluate(()=>{E.state='combo';E.time=0;E.rage=100;E.enraged=true;for(let i=0;i<6;i++)updEttin(.01);ren.render(scene,cam)});await page.screenshot({path:'test-results/ettin-cone-rage.png'});await page.close();
    const host=await context.newPage(),guest=await context.newPage();
    for(const p of [host,guest]){p.on('pageerror',e=>errors.push(e.message));await p.goto(url)}
    await host.locator('#group-mode').click();await host.locator('#create-room-flow').click();await host.locator('#room-mode').selectOption('5');await host.locator('#difficulty-per-player').uncheck();await host.locator('#create-room').click();await host.locator('#room-info').waitFor({state:'visible'});
    await guest.locator('#group-mode').click();await guest.locator('#join-room-flow').click();await guest.getByRole('button',{name:'Entrar',exact:true}).click();await host.waitForFunction(()=>netRoom?.players.length===2);await host.locator('#start-room').click();
    await guest.waitForFunction(()=>lastState?.players.length===2&&[...replicas.values()].some(r=>r.object.name==='Ettin · Thomas DR'));
    await guest.waitForFunction(()=>[...replicas.values()].some(r=>r.object.name==='Ettin weapon trails and shockwave'&&r.nodes.length===26));
    assert.equal(await host.evaluate(()=>E.max),6400);await guest.locator('#ettin-rage').waitFor({state:'visible'});assert.match(await guest.locator('#ettin-rage-label').innerText(),/0\/100/);
    await host.evaluate(()=>{for(const p of players.values())p.inv=100});await guest.keyboard.press('f');await host.waitForFunction(()=>[...players.values()].some(p=>p!==localPlayer&&p.specialCooldown>0));
    const roar=await host.evaluate(()=>{
      const team=[...players.values()];team[0].pos.set(10,0,0);team[1].pos.set(-10,0,0);for(const p of team){p.hp=100;p.inv=0;p.parry=0;p.kx=p.kz=0}
      eg.position.set(0,0,0);E.rage=0;E.enraged=false;E.attack='roar';E.hits.clear();ettinHitArea(eg.position,arenaRadius*2,10,38);return {players:team.map(p=>({hp:p.hp,push:Math.hypot(p.kx,p.kz)})),rage:E.rage};
    });assert.ok(roar.players.every(p=>p.hp===90&&p.push===38));assert.equal(roar.rage,20);await guest.waitForFunction(()=>lastState?.ettin?.rage===20);
    const teamCone=await host.evaluate(()=>{const team=[...players.values()];team[0].pos.set(-2,0,4);team[1].pos.set(2,0,4);for(const p of team){p.hp=100;p.inv=p.parry=0}E.face=0;E.attack='combo';E.rage=0;E.hits.clear();ettinHitArea(eg.position,8,20,16,true);return {hp:team.map(p=>p.hp),rage:E.rage}});assert.deepEqual(teamCone,{hp:[80,80],rage:20});
    await host.evaluate(()=>{const p=localPlayer;E.rage=90;E.enraged=false;p.inv=0;ettinDamagePlayer(p,eg.position,1,0);for(const player of players.values())player.inv=100});
    await guest.waitForFunction(()=>lastState?.ettin?.enraged&&lastState.ettin.rage===100);assert.match(await guest.locator('#ettin-rage-label').innerText(),/2×/);assert.equal(await guest.locator('#ettin-rage-fill').evaluate(e=>e.style.width),'100%');
    await host.evaluate(()=>ettinHurt(E.max));await guest.waitForFunction(()=>lastState.boss.percent===0);await guest.locator('#ettin-rage').waitFor({state:'hidden'});await guest.waitForFunction(()=>over);assert.match(await guest.locator('#msg').innerText(),/venceu/);
    assert.deepEqual(errors,[]);console.log('Ettin OK: authored axe clips, cone hits, four-parry stagger with vulnerability, rage, ultimate, LAN HUD and victory.');
  }finally{await context.close()}
};
