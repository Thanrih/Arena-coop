const assert=require('node:assert/strict');
module.exports=async function testDeathPhysics(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  try{
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('#solo-mode').click();await page.locator('.card[data-m="1"]').click();
    const shattered=await page.evaluate(()=>{
      guestOnly=true;guestFrame=()=>{};over=false;P=localPlayer;const results=[];
      for(const character of ['ranger','fieldfighter','arachnodroid']){
        deathFragments.forEach(p=>scene.remove(p.m));deathFragments.length=0;
        configureCharacter(P,character);P.hp=0;P.pos.set(0,0,0);P.g.position.copy(P.pos);shatterPlayer(P);const count=deathFragments.length;shatterPlayer(P);
        const once=deathFragments.length===count,colors=new Set(deathFragments.map(p=>p.m.material.color.getHex())).size;
        for(let i=0;i<100;i++)updateDeathPhysics(.03);
        const grounded=deathFragments.every(p=>p.m.position.y>=p.size*.87-1e-8),bounced=deathFragments.some(p=>p.bounces>0),hidden=!P.g.visible;
        updateDeathPhysics(2);results.push({character,count,once,colors,grounded,bounced,hidden,expired:deathFragments.length===0});
      }return results;
    });
    for(const result of shattered){assert.equal(result.count,72);assert.ok(result.once&&result.colors>1&&result.grounded&&result.bounced&&result.hidden&&result.expired)}
    await page.close();
    const host=await context.newPage(),guest=await context.newPage();for(const p of [host,guest]){p.on('pageerror',e=>errors.push(e.message));await p.goto(url)}
    await host.locator('#group-mode').click();await host.locator('#create-room-flow').click();await host.locator('#room-mode').selectOption('1');await host.locator('#difficulty-health').fill('1');await host.locator('#difficulty-speed').fill('0.25');await host.locator('#difficulty-attacks').fill('0.25');await host.locator('#difficulty-per-player').uncheck();
    await host.locator('#create-room').click();await host.locator('#room-info').waitFor({state:'visible'});await guest.locator('#group-mode').click();await guest.locator('#join-room-flow').click();await guest.getByRole('button',{name:'Entrar',exact:true}).click();await host.waitForFunction(()=>netRoom?.players.length===2);
    await host.locator('#start-room').click();await guest.waitForFunction(()=>lastState?.players.length===2);const id=await guest.evaluate(()=>myId);
    const spawn=await host.evaluate(()=>{B.next=100;for(const p of players.values())p.inv=100;flyers.forEach(f=>scene.remove(f.g));flyers.length=0;spawnFlyer();const f=flyers[0];f.g.position.set(localPlayer.pos.x,FLYER_HEIGHT,localPlayer.pos.z+4);f.v.set(0,0,0);f.hp=1000;f.cd=100;return f.g.position.y});assert.equal(spawn,1.3);
    await host.waitForFunction(()=>flyers[0].t>1);assert.equal(await host.evaluate(()=>flyers[0].g.position.y),1.3);
    await host.keyboard.down('Space');await host.waitForFunction(()=>localPlayer.pos.y>1);await host.keyboard.up('Space');assert.equal(await host.evaluate(()=>flyers[0].g.position.y),1.3);
    await host.evaluate(()=>{localPlayer.pos.set(0,0,0);localPlayer.vx=localPlayer.vz=localPlayer.vy=0;localPlayer.ground=true;B.state='chase';B.next=100;flyers[0].g.position.set(0,FLYER_HEIGHT,2);flyers[0].v.set(0,0,0);P=localPlayer;aim.set(0,1.3,10);aimY=1.3;shoot()});
    await host.waitForFunction(()=>flyers[0].hp<1000);
    await host.evaluate(id=>{P=players.get(id);P.inv=0;P.parry=0;hurt(200,new T.Vector3());P=localPlayer},id);
    await guest.waitForFunction(id=>[...replicas.values()].filter(r=>r.kind==='debris'&&r.id===id).length===72,id);
    await guest.waitForFunction(id=>[...replicas.values()].some(r=>r.kind==='player'&&r.id===id&&!r.object.visible),id);
    const debris=await guest.evaluate(id=>[...replicas.values()].find(r=>r.kind==='debris'&&r.id===id).object.position.toArray(),id);
    await guest.waitForFunction(({id,before})=>[...replicas.values()].some(r=>r.kind==='debris'&&r.id===id&&r.object.position.distanceTo(new T.Vector3().fromArray(before))>.1),{id,before:debris});
    await host.close();await guest.close();
    console.log('Death physics OK: all playable models shatter once, colored cubes bounce/expire and sync on LAN; centipede flyers stay at bullet height and take damage.');
  }finally{await context.close()}
};
