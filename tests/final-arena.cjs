const assert=require('node:assert/strict');
module.exports=async function testFinalArena(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  try{
    const solo=await context.newPage();solo.on('pageerror',e=>errors.push(e.message));await solo.goto(url);await solo.locator('#solo-mode').click();await solo.locator('.card[data-m="4"]').click();
    await solo.waitForFunction(()=>finalEncounter&&!B.dead&&A.on&&R.on&&E.on&&!E.dead&&A.u.length>0);
    const arena=await solo.evaluate(()=>({radius:arenaRadius,floor:floor.scale.x*32,border:arenaBoundary.scale.x*32,trees:Math.min(...TR.map(t=>Math.hypot(t.x,t.z)*forestMeshes[0].matrixWorld.elements[0]*floor.scale.x)),army:A.total,bossHP:[B.max,R.max,E.max]}));
    assert.equal(arena.radius,56);assert.equal(arena.floor,56);assert.equal(arena.border,56);assert.equal(arena.army,33);assert.deepEqual(arena.bossHP,[2400,1800,3200]);
    await solo.screenshot({path:'test-results/final-arena.png'});
    const limits=await solo.evaluate(()=>{
      guestOnly=true;guestFrame=()=>{};P=localPlayer;P.inv=100;P.pos.set(45,0,0);P.vx=P.vz=P.vy=P.kx=P.kz=0;
      for(let i=0;i<4;i++)updatePlayer(.05,{keys:{KeyD:true},dash:i===0});const walked=P.pos.x;
      P.pos.set(54,0,0);P.dashCooldown=0;for(let i=0;i<5;i++)updatePlayer(.05,{keys:{KeyD:true},dash:i===0});
      const clamped=P.pos.length();return {walked,clamped};
    });assert.ok(limits.walked>49);assert.ok(limits.clamped<=54.5+1e-8);
    const ending=await solo.evaluate(()=>{
      robotHurt(R.hp,true);updRobot(3.21);checkFinalVictory();const golemOnly=!over;
      B.hp=0;B.dead=true;checkFinalVictory();const twoBosses=!over;
      A.wave=2;A.killed=A.total;A.u.forEach(u=>u.dead=.01);checkFinalVictory();const threeBosses=!over;
      E.hp=0;E.dead=true;E.deathComplete=true;checkFinalVictory();return {golemOnly,twoBosses,threeBosses,all:over&&matchWon};
    });assert.ok(ending.golemOnly&&ending.twoBosses&&ending.threeBosses&&ending.all);await solo.close();
    const campaign=await context.newPage();campaign.on('pageerror',e=>errors.push(e.message));await campaign.goto(url);await campaign.locator('#solo-mode').click();await campaign.locator('.card[data-m="0"]').click();
    const transition=await campaign.evaluate(()=>{
      guestOnly=true;guestFrame=()=>{};B.hp=0;B.dead=true;A.on=true;A.wave=2;startRobot();robotHurt(R.hp,true);updRobot(3.21);
      return {final:finalEncounter,over,mode:MODE,radius:arenaRadius,alive:!B.dead&&!R.dead&&E.on&&!E.dead&&A.u.some(u=>!u.dead),hp:[B.max,R.max,E.max]};
    });assert.ok(transition.final&&transition.alive&&!transition.over);assert.equal(transition.mode,0);assert.equal(transition.radius,56);assert.deepEqual(transition.hp,[2400,1800,3200]);await campaign.close();
    for(const mode of [4,0]){
      const host=await context.newPage(),guest=await context.newPage();for(const p of [host,guest]){p.on('pageerror',e=>errors.push(e.message));await p.goto(url)}
      await host.locator('#group-mode').click();await host.locator('#create-room-flow').click();await host.locator('#room-mode').selectOption(String(mode));await host.locator('#difficulty-health').fill('3');await host.locator('#difficulty-speed').fill('0.5');await host.locator('#difficulty-attacks').fill('0.5');await host.locator('#difficulty-per-player').uncheck();
      await host.locator('#create-room').click();await host.locator('#room-info').waitFor({state:'visible'});await guest.locator('#group-mode').click();await guest.locator('#join-room-flow').click();await guest.getByRole('button',{name:'Entrar',exact:true}).click();await host.waitForFunction(()=>netRoom?.players.length===2);
      await host.locator('#start-room').click();await guest.waitForFunction(()=>lastState?.players.length===2);
      if(mode===0)await host.evaluate(()=>{B.hp=0;B.dead=true;A.on=true;A.wave=2;startRobot();robotHurt(R.hp,true);updRobot(3.21)});
      await host.waitForFunction(()=>finalEncounter);await guest.waitForFunction(()=>finalEncounter&&arenaRadius===56&&lastState?.finalEncounter);
      assert.deepEqual(await host.evaluate(()=>[B.max,R.max,E.max]),[7200,5400,9600]);assert.equal(await guest.evaluate(()=>floor.scale.x*32),56);
      await guest.waitForFunction(()=>[...replicas.values()].filter(r=>r.kind==='enemy'&&r.object.visible).length>=31);
      assert.match(await guest.locator('#bt').innerText(),/BATALHA FINAL/);
      await host.evaluate(()=>{for(const p of players.values())p.inv=100;B.hp=0;B.dead=true;R.hp=0;R.dead=true;R.deathComplete=true;E.hp=0;E.dead=true;E.deathComplete=true;A.wave=2;A.killed=A.total;A.u.forEach(u=>u.dead=.01);checkFinalVictory()});
      await guest.waitForFunction(()=>over&&lastState?.won);assert.match(await guest.locator('#msg').innerText(),/venceu/);
      await host.close();await guest.close();
    }
    console.log('Final arena OK: every boss appears simultaneously, with larger terrain, all-boss victory and scaled LAN synchronization.');
  }finally{await context.close()}
};
