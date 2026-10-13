const assert=require('node:assert/strict');
module.exports=async function testSpecials(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  try{
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('#solo-mode').click();await page.locator('.card[data-m="1"]').click();
    const result=await page.evaluate(()=>{
      guestOnly=true;guestFrame=()=>{};P=localPlayer;B.dead=true;R.on=false;over=false;
      function reset(character){
        configureCharacter(P,character);P.pos.set(0,0,0);P.vx=P.vz=P.vy=P.kx=P.kz=0;P.hp=100;P.inv=100;P.ground=true;
        A.u.forEach(u=>scene.remove(u.g));A.u.length=0;specialMissiles.forEach(m=>scene.remove(m.m));specialMissiles.length=0;
        for(const [x,z]of [[0,4],[0,8],[5,4],[0,-3]]){const u=mkSkel('w');u.rise=1;u.hp=1000;u.g.position.set(x,0,z);scene.add(u.g);A.u.push(u)}
        aim.set(0,1.7,30);aimY=1.7;
      }
      reset('fieldfighter');for(let i=0;i<7;i++)updatePlayer(.05,{keys:{KeyA:true,Space:true},special:true,dash:true});
      const charge={hp:A.u.map(u=>u.hp),pos:P.pos.toArray(),cd:P.specialCooldown,ended:!P.specialState};
      reset('arachnodroid');const start=P.pos.clone();let fixed=true;
      for(let i=0;i<28;i++){P.kx=12;P.kz=-10;updatePlayer(.05,{keys:{KeyD:true,Space:true},special:true,dash:true,shoot:true});fixed=fixed&&P.pos.equals(start)}
      const mega={hp:A.u.map(u=>u.hp),fixed,cd:P.specialCooldown,ended:!P.specialState&&!P.specialEffect.visible};
      reset('ranger');for(let i=0;i<12;i++)updatePlayer(.05,{keys:{},special:true});
      const count=specialMissiles.length,cd=P.specialCooldown;
      for(let i=0;i<150;i++)updateSpecialMissiles(.02);
      const missiles={count,cd,hp:A.u.map(u=>u.hp),expired:specialMissiles.length===0};
      P.specialCooldown=0;P.hp=0;updatePlayer(.05,{keys:{},special:true});const deadBlocked=!P.specialState&&P.specialCooldown===0;
      P.hp=100;P.specialCooldown=1;updatePlayer(.05,{keys:{},special:true});const cooldownBlocked=!P.specialState;
      for(let i=0;i<20;i++)updatePlayer(.05,{keys:{}});updatePlayer(.05,{keys:{},special:true});const recovered=!!P.specialState;
      return {charge,mega,missiles,deadBlocked,cooldownBlocked,recovered};
    });
    assert.deepEqual(result.charge.hp,[760,760,1000,1000]);assert.ok(Math.abs(result.charge.pos[0])<1e-8);assert.ok(Math.abs(result.charge.pos[2]-10.88)<1e-8);assert.ok(result.charge.ended&&result.charge.cd>5);
    assert.ok(result.mega.fixed&&result.mega.ended&&result.mega.cd>8);assert.ok(Math.abs(result.mega.hp[0]-664)<1e-7);assert.ok(Math.abs(result.mega.hp[1]-664)<1e-7);assert.equal(result.mega.hp[2],1000);assert.equal(result.mega.hp[3],1000);
    assert.equal(result.missiles.count,6);assert.ok(result.missiles.hp[0]<1000);assert.equal(result.missiles.hp[3],1000);assert.ok(result.missiles.expired&&result.missiles.cd>7);assert.ok(result.deadBlocked&&result.cooldownBlocked&&result.recovered);await page.close();
    for(const character of ['ranger','fieldfighter','arachnodroid']){
      const host=await context.newPage(),guest=await context.newPage();for(const p of [host,guest]){p.on('pageerror',e=>errors.push(e.message));await p.goto(url)}
      await host.locator('#group-mode').click();await host.locator('#create-room-flow').click();await host.locator('#room-mode').selectOption('1');await host.locator('#create-room').click();await host.locator('#room-info').waitFor({state:'visible'});
      await guest.locator('#group-mode').click();await guest.locator('#join-room-flow').click();await guest.locator(`input[name="character"][value="${character}"]`).check();await guest.getByRole('button',{name:'Entrar',exact:true}).click();await host.waitForFunction(()=>netRoom?.players.length===2);
      await host.locator('#start-room').click();await guest.waitForFunction(()=>lastState?.players.length===2);const id=await guest.evaluate(()=>myId);
      await host.evaluate(()=>{for(const p of players.values())p.inv=100});await guest.keyboard.press('f');
      await host.waitForFunction(id=>players.get(id).specialCooldown>0,id);await guest.waitForFunction(()=>localPlayer.specialCooldown>0);await guest.waitForFunction(()=>$('special-status').textContent.endsWith('s'));assert.match(await guest.locator('#special-status').innerText(),/s$/);
      if(character==='ranger')await guest.waitForFunction(id=>[...replicas.values()].some(r=>r.kind==='bullet'&&r.id===id&&r.object.name==='Player special missile'),id);
      else await guest.waitForFunction(id=>[...replicas.values()].some(r=>r.id===id&&r.object.name==='Special effect'&&r.object.visible),id);
      if(character==='arachnodroid'){
        const before=await host.evaluate(id=>players.get(id).pos.toArray(),id);await guest.keyboard.down('d');await guest.keyboard.press('Shift');
        const immobile=await host.evaluate(id=>{const p=players.get(id);return {pos:p.pos.toArray(),active:!!p.specialState}},id);assert.deepEqual(immobile.pos,before);assert.ok(immobile.active);await guest.keyboard.up('d');
      }
      await host.close();await guest.close();
    }
    console.log('Specials OK: six missiles with damage, straight charge hits once, immobilized piercing megalaser, cooldown/death guards and F/effects synchronized for all LAN guests.');
  }finally{await context.close()}
};
