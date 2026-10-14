const assert=require('node:assert/strict');
const fs=require('node:fs');

module.exports=async function testMultiplayerSync(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:800}});
  const host=await context.newPage(),guest=await context.newPage();
  try{
    for(const page of [host,guest])page.on('pageerror',error=>errors.push(error.message));
    await host.goto(url);await guest.goto(url);
    await host.locator('#group-mode').click();await host.locator('#create-room-flow').click();
    await host.locator('#room-mode').selectOption('2');await host.locator('#difficulty-health').fill('1');
    await host.locator('#difficulty-speed').fill('.25');await host.locator('#difficulty-attacks').fill('.25');await host.locator('#difficulty-per-player').uncheck();
    await host.locator('#create-room').click();await host.locator('#room-info').waitFor({state:'visible'});
    await guest.locator('#group-mode').click();await guest.locator('#join-room-flow').click();
    await guest.getByRole('radio',{name:/Fieldfighter/}).check();await guest.getByRole('button',{name:'Entrar',exact:true}).click();
    await host.waitForFunction(()=>netRoom?.players.length===2);await host.locator('#start-room').click();
    const guestId=await guest.evaluate(()=>myId);
    await guest.waitForFunction(id=>lastState?.sequence>3&&[...replicas.values()].some(root=>root.kind==='player'&&root.id===id),guestId);
    await guest.keyboard.down('d');
    const motion=await guest.evaluate(async id=>{
      const samples=[];
      for(let i=0;i<70;i++)await new Promise(resolve=>requestAnimationFrame(()=>{
        const replica=[...replicas.values()].find(root=>root.kind==='player'&&root.id===id);
        samples.push({model:replica?.object.position.toArray(),state:localPlayer.pos.toArray(),sequence:lastReceivedSnapshot,renderTime:networkRenderTime});resolve();
      }));
      let movingFrames=0,maxMismatch=0,sequenceRegressions=0;
      for(let i=1;i<samples.length;i++){
        if(Math.hypot(samples[i].model[0]-samples[i-1].model[0],samples[i].model[2]-samples[i-1].model[2])>.0001)movingFrames++;
        if(samples[i].sequence<samples[i-1].sequence)sequenceRegressions++;
      }
      for(const sample of samples)maxMismatch=Math.max(maxMismatch,Math.hypot(sample.model[0]-sample.state[0],sample.model[1]-sample.state[1],sample.model[2]-sample.state[2]));
      return {movingFrames,maxMismatch,sequenceRegressions,sequences:new Set(samples.map(sample=>sample.sequence)).size,renderAdvances:samples.at(-1).renderTime>samples[0].renderTime};
    },guestId);
    await guest.keyboard.up('d');
    assert.ok(motion.movingFrames>35,`movement only advanced on ${motion.movingFrames} rendered frames`);
    assert.ok(motion.maxMismatch<.08,`camera state and player replica diverged by ${motion.maxMismatch}`);
    assert.equal(motion.sequenceRegressions,0);assert.ok(motion.sequences>8&&motion.renderAdvances);
    assert.ok(await guest.evaluate(()=>[...replicas.values()].some(root=>root.object.name==='Fieldfighter shockwave')));
    assert.ok(await guest.evaluate(()=>[...replicas.values()].every(root=>root.readyAt===null||root.readyAt>networkRenderTime)));
    fs.mkdirSync('test-results',{recursive:true});await guest.screenshot({path:'test-results/multiplayer-sync.png'});
    console.log('Multiplayer sync OK: ordered snapshots, shared render timeline, smooth player motion and synchronized Fieldfighter effects.');
  }finally{await host.close();await guest.close();await context.close()}
};
