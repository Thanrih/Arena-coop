const assert=require('node:assert/strict');
const fs=require('node:fs');

module.exports=async function testInferno(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1280,height:800}}),solo=await context.newPage();solo.on('pageerror',error=>errors.push(error.message));
  try{
    await solo.goto(url);await solo.locator('#solo-mode').click();await solo.locator('.card[data-m="6"]').click();
    await solo.waitForFunction(()=>infernoMode&&finalEncounter&&arenaRadius===640&&infernoWave===0&&A.on&&!R.on&&!E.on&&!B.dead);
    const stageOne=await solo.evaluate(()=>({radius:arenaRadius,wave:infernoWave,centipede:!B.dead,golem:R.on,ettin:E.on,bossHealth:B.max,bossScale:B.segs[0].root.scale.x,mode:MODE,terrain:infernoTerrain.visible,floor:floor.visible}));
    assert.deepEqual(stageOne,{radius:640,wave:0,centipede:true,golem:false,ettin:false,bossHealth:4800,bossScale:3,mode:6,terrain:true,floor:false});
    await solo.keyboard.down('w');
    const liveLoop=await solo.evaluate(async()=>{
      const start={bossTime:B.t,grassTime:grassSystem.time,pos:localPlayer.pos.toArray()},begin=performance.now();let frames=0;
      await new Promise(resolve=>{const tick=()=>{frames++;if(performance.now()-begin>=1200)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});
      return {frames,bossAdvance:B.t-start.bossTime,grassAdvance:grassSystem.time-start.grassTime,distance:localPlayer.pos.distanceTo(new T.Vector3().fromArray(start.pos))};
    });
    await solo.keyboard.up('w');assert.ok(liveLoop.frames>20&&liveLoop.bossAdvance>.5&&liveLoop.grassAdvance>.5&&liveLoop.distance>.5,JSON.stringify(liveLoop));
    const stageTwo=await solo.evaluate(()=>{
      const heights=INFERNO_HILLS.map(h=>terrainHeightAt(h.x,h.z)),treeCount=infernoProps.filter(p=>p.kind==='tree').length,rockCount=infernoProps.filter(p=>p.kind==='rock').length;
      const hill=INFERNO_HILLS[0];P=localPlayer;P.pos.set(hill.x,0,hill.z);P.vy=0;P.ground=true;updatePlayer(.016,{keys:{},shoot:false,parry:false,dash:false,dashHeld:false,special:false,aim:[0,1,0],cameraYaw:Math.PI});grassSystem.update(.016,players.values());
      const matrix=new T.Matrix4(),position=new T.Vector3();let nearestGrass=Infinity,highestGrass=0;for(let i=0;i<grassSystem.mesh.count;i++){grassSystem.mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);nearestGrass=Math.min(nearestGrass,Math.hypot(position.x-P.pos.x,position.z-P.pos.z));highestGrass=Math.max(highestGrass,position.y)}
      const canopy=infernoPropMeshes.trees.find(layer=>/Copas altas/.test(layer.mesh.name));canopy.mesh.geometry.computeBoundingBox();return {treeCount,rockCount,maxHeight:Math.max(...heights),playerHeight:P.pos.y,terrainTriangles:infernoTerrain.geometry.index.count/3,grassCount:grassSystem.mesh.count,nearestGrass,highestGrass,flowers:infernoFloraMeshes.reduce((sum,mesh)=>sum+(/Hastes/.test(mesh.name)?mesh.count:0),0),floraDistance:infernoFloraDistance,canopyTop:canopy.mesh.geometry.boundingBox.max.y};
    });
    assert.equal(stageTwo.treeCount,4800);assert.equal(stageTwo.rockCount,4000);assert.ok(stageTwo.maxHeight>5&&stageTwo.playerHeight>1&&stageTwo.canopyTop>13);assert.ok(stageTwo.terrainTriangles>10000);assert.ok(stageTwo.grassCount>=10000&&stageTwo.nearestGrass<5&&stageTwo.highestGrass>1,JSON.stringify(stageTwo));assert.ok(stageTwo.flowers>400&&stageTwo.floraDistance===100,JSON.stringify(stageTwo));
    const stageThree=await solo.evaluate(()=>{
      const first=infernoProps.find(prop=>!prop.destroyed);B.chain[0].set(first.x,0,first.z);B.disp[0].copy(B.chain[0]);const before=infernoDestroyed.size;beginBurrowEmerge();
      return {before,after:infernoDestroyed.size,firstDestroyed:first.destroyed,revision:infernoWorldRevision};
    });
    assert.ok(stageThree.after>stageThree.before&&stageThree.firstDestroyed&&stageThree.revision>0);
    const waves=await solo.evaluate(()=>{A.wave=2;A.u.forEach(u=>u.dead=.1);B.dead=true;B.dt=10;updateInfernoWaves(2.3);const second={wave:infernoWave,golem:R.on,ettin:E.on,max:R.max,scale:rg.scale.x};A.wave=2;A.u.forEach(u=>u.dead=.1);R.dead=true;R.deathComplete=true;updateInfernoWaves(2.3);return{second,third:{wave:infernoWave,golem:R.on&&!R.dead,ettin:E.on,max:E.max,scale:eg.scale.x}}});
    assert.deepEqual(waves,{second:{wave:1,golem:true,ettin:false,max:3600,scale:3},third:{wave:2,golem:false,ettin:true,max:6400,scale:3}});
    fs.mkdirSync('test-results',{recursive:true});await solo.screenshot({path:'test-results/inferno-world.png'});
    await solo.close();

    const host=await context.newPage(),guest=await context.newPage();for(const page of [host,guest])page.on('pageerror',error=>errors.push(error.message));
    await host.goto(url);await guest.goto(url);await host.locator('#group-mode').click();await host.locator('#create-room-flow').click();await host.locator('#room-mode').selectOption('6');await host.locator('#difficulty-per-player').uncheck();await host.locator('#create-room').click();await host.locator('#room-info').waitFor({state:'visible'});
    await guest.locator('#group-mode').click();await guest.locator('#join-room-flow').click();await guest.getByRole('button',{name:'Entrar',exact:true}).click();await host.waitForFunction(()=>netRoom?.players.length===2);await host.locator('#start-room').click();
    await guest.waitForFunction(()=>infernoMode&&arenaRadius===640&&lastState?.infernoMode);
    const guestLoop=await guest.evaluate(async()=>{const sequence=lastReceivedSnapshot,renderTime=networkRenderTime,start=performance.now();let frames=0;await new Promise(resolve=>{const tick=()=>{frames++;if(performance.now()-start>1200)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});return{frames,sequences:lastReceivedSnapshot-sequence,renderAdvance:networkRenderTime-renderTime}});
    assert.ok(guestLoop.frames>20&&guestLoop.sequences>5&&guestLoop.renderAdvance>500,JSON.stringify(guestLoop));
    const destroyedId=await host.evaluate(()=>{const prop=infernoProps.find(item=>!item.destroyed);destroyInfernoProps(new T.Vector3(prop.x,prop.y,prop.z),1);return prop.id});
    await guest.waitForFunction(id=>infernoProps[id]?.destroyed,destroyedId);
    assert.equal(await guest.evaluate(id=>infernoDestroyed.has(id),destroyedId),true);
    await host.close();await guest.close();
    console.log('Inferno OK: three giant boss waves with skeletons, dense streamed grass, taller forest, destructible props and LAN sync.');
  }finally{await context.close()}
};
