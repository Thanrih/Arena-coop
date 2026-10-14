const assert=require('node:assert/strict');

async function openPair(context,url,errors){
  const host=await context.newPage(),guest=await context.newPage();
  for(const page of [host,guest]){page.on('pageerror',error=>errors.push(error.message));await page.goto(url)}
  return{host,guest};
}
async function enterRoom(host,guest,{lives=3,infinite=false}={}){
  await host.locator('#group-mode').click();await host.locator('#create-room-flow').click();await host.locator('#room-mode').selectOption('1');
  await host.locator('#difficulty-health').fill('1');await host.locator('#difficulty-speed').fill('.25');await host.locator('#difficulty-attacks').fill('.25');await host.locator('#difficulty-per-player').uncheck();
  await host.locator('#player-lives').fill(String(lives));if(infinite)await host.locator('#infinite-respawn').check();await host.locator('#create-room').click();await host.locator('#room-info').waitFor({state:'visible'});
  await guest.locator('#group-mode').click();await guest.locator('#join-room-flow').click();await guest.getByRole('button',{name:'Entrar',exact:true}).click();await host.waitForFunction(()=>netRoom?.players.length===2);
  await host.locator('#start-room').click();await guest.waitForFunction(()=>lastState?.players.length===2);return await guest.evaluate(()=>myId);
}
async function killGuest(host,id){
  return host.evaluate(id=>{const victim=players.get(id),saved=P;P=victim;victim.inv=victim.parry=0;hurt(200,new T.Vector3(victim.pos.x+2,victim.pos.y,victim.pos.z));P=saved;return{hp:victim.hp,lives:victim.livesRemaining,waiting:victim.respawnAt>performance.now(),over}},id);
}
module.exports=async function testRespawn(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  try{
    {
      const {host,guest}=await openPair(context,url,errors),id=await enterRoom(host,guest,{lives:2});
      assert.match(await host.locator('#difficulty').innerText(),/2 vida\(s\) por jogador/);
      assert.deepEqual(await killGuest(host,id),{hp:0,lives:1,waiting:true,over:false});
      await guest.waitForFunction(id=>lastState?.players.find(player=>player.id===id)?.hp===0&&lastState.players.find(player=>player.id===id).livesRemaining===1,id);
      await guest.waitForFunction(()=>$('team').textContent.includes('ressurge em'));
      await host.evaluate(id=>{players.get(id).respawnAt=performance.now()-1;updateRespawns()},id);
      await guest.waitForFunction(id=>lastState?.players.find(player=>player.id===id)?.hp===100,id);
      assert.equal(await host.evaluate(id=>players.get(id).g.visible&&players.get(id).livesRemaining===1,id),true);
      assert.deepEqual(await killGuest(host,id),{hp:0,lives:0,waiting:false,over:false});
      await host.waitForTimeout(100);assert.equal(await host.evaluate(id=>players.get(id).respawnAt,id),0);
      await host.close();await guest.close();
    }
    {
      const {host,guest}=await openPair(context,url,errors),id=await enterRoom(host,guest,{lives:7,infinite:true});
      assert.equal(await host.locator('#player-lives').isDisabled(),true);assert.match(await host.locator('#difficulty').innerText(),/ressurgimento infinito/);
      for(let death=0;death<2;death++){
        const result=await killGuest(host,id);assert.equal(result.hp,0);assert.equal(result.lives,Infinity);assert.equal(result.waiting,true);assert.equal(result.over,false);
        await guest.waitForFunction(id=>{const player=lastState?.players.find(entry=>entry.id===id);return player?.hp===0&&player.infiniteLives&&player.livesRemaining===null},id);
        await host.evaluate(id=>{players.get(id).respawnAt=performance.now()-1;updateRespawns()},id);await guest.waitForFunction(id=>lastState?.players.find(player=>player.id===id)?.hp===100,id);
      }
      assert.equal(await host.evaluate(()=>over),false);await host.close();await guest.close();
    }
    console.log('Respawn OK: finite lives decrement and end; infinite respawn survives repeated deaths with synchronized countdowns.');
  }finally{await context.close()}
};
