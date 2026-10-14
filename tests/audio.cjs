const assert=require('node:assert/strict');

module.exports=async function testAudio(browser,url,errors){
  const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url);await page.evaluate(()=>{window.audioStarts={music:0,spawn:0,golemGun:0,playerGun:0};for(const [key,audio]of Object.entries({music:gameAudio.inferno,spawn:gameAudio.golemSpawn,golemGun:gameAudio.golemGun,playerGun:gameAudio.playerGun}))audio.addEventListener('play',()=>audioStarts[key]++)});
    await page.locator('#solo-mode').click();await page.locator('.card[data-m="6"]').click();await page.waitForFunction(()=>infernoMode&&audioStarts.music>0);await page.evaluate(()=>startInfernoWave(1));await page.waitForFunction(()=>audioStarts.spawn>0);
    const inferno=await page.evaluate(()=>({music:gameAudio.inferno.src,loop:gameAudio.inferno.loop,paused:gameAudio.inferno.paused,spawn:golemSpawnSerial,starts:{...audioStarts}}));
    assert.match(inferno.music,/the-outsider-apocalypse-mix\.mp3$/);assert.ok(inferno.loop&&!inferno.paused&&inferno.spawn>0);
    await page.evaluate(()=>{R.state='mg';R.st=1;localPlayer.minigunFiring=true;gameAudio.golemGun.currentTime=2.1;gameAudio.playerGun.currentTime=2.1;updateCombatAudio()});
    await page.waitForFunction(()=>audioStarts.golemGun>0&&audioStarts.playerGun>0);
    const guns=await page.evaluate(()=>({golem:gameAudio.golemGun.src,player:gameAudio.playerGun.src,golemLoop:gameAudio.golemGun.loop,playerLoop:gameAudio.playerGun.loop,golemTime:gameAudio.golemGun.currentTime,playerTime:gameAudio.playerGun.currentTime,segment:GUN_LOOP_SECONDS,golemSpatial:!!spatialGuns.golem.panner,playerSpatial:!!spatialGuns.player.panner}));
    assert.match(guns.golem,/fire-minigun\.mp3$/);assert.match(guns.player,/fire-minigun\.mp3$/);assert.ok(!guns.golemLoop&&!guns.playerLoop&&guns.golemTime<.3&&guns.playerTime<.3&&guns.segment===2&&guns.golemSpatial&&guns.playerSpatial,JSON.stringify(guns));
    await page.keyboard.press('Escape');await page.waitForFunction(()=>gameAudio.inferno.paused&&gameAudio.golemGun.paused&&gameAudio.playerGun.paused);
    const responses=await Promise.all(['/audio/the-outsider-apocalypse-mix.mp3','/audio/fire-minigun.mp3','/audio/spawn-gollen.mp3'].map(path=>page.request.head(url+path)));
    assert.ok(responses.every(response=>response.ok()&&response.headers()['content-type']==='audio/mpeg'));
    console.log('Audio OK: Inferno music, Golem spawn and spatial miniguns loop only their first two seconds while firing.');
  }finally{await context.close()}
};
