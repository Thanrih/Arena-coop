const assert=require('node:assert/strict');
const fs=require('node:fs');

module.exports=async function testInferno(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1280,height:800}}),solo=await context.newPage();solo.on('pageerror',error=>errors.push(error.message));
  try{
    await solo.goto(url);if(await solo.locator('#solo-mode').count())await solo.locator('#solo-mode').click();await solo.locator('.card[data-m="6"]').click();
    await solo.waitForFunction(()=>infernoMode&&finalEncounter&&arenaRadius===640&&infernoWave===0&&A.on&&!R.on&&!E.on&&!B.dead);
    await solo.waitForFunction(()=>[groundTexture,trunkTexture,pillarTexture,leavesTexture,stoneTexture].every(texture=>texture.userData.sourceLoaded));
    const stageOne=await solo.evaluate(()=>({radius:arenaRadius,wave:infernoWave,centipede:!B.dead,golem:R.on,ettin:E.on,bossHealth:B.max,bossScale:B.segs[0].root.scale.x,mode:MODE,terrain:infernoTerrain.visible,floor:floor.visible,bossDistance:Math.hypot(B.chain[0].x-localPlayer.pos.x,B.chain[0].z-localPlayer.pos.z),nearestSkeleton:Math.min(...A.u.map(u=>Math.hypot(u.g.position.x-localPlayer.pos.x,u.g.position.z-localPlayer.pos.z)))}));
    assert.equal(stageOne.radius,640);assert.equal(stageOne.wave,0);assert.equal(stageOne.centipede,true);assert.equal(stageOne.golem,false);assert.equal(stageOne.ettin,false);assert.equal(stageOne.bossHealth,4800);assert.equal(stageOne.bossScale,3);assert.equal(stageOne.mode,6);assert.equal(stageOne.terrain,true);assert.equal(stageOne.floor,false);assert.ok(stageOne.bossDistance>=75&&stageOne.nearestSkeleton>=57,JSON.stringify(stageOne));
    await solo.keyboard.down('w');
    const liveLoop=await solo.evaluate(async()=>{
      const start={bossTime:B.t,grassTime:grassSystem.time,pos:localPlayer.pos.toArray()},begin=performance.now();let frames=0;
      await new Promise(resolve=>{const tick=()=>{frames++;if(performance.now()-begin>=1200)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});
      return {frames,bossAdvance:B.t-start.bossTime,grassAdvance:grassSystem.time-start.grassTime,distance:localPlayer.pos.distanceTo(new T.Vector3().fromArray(start.pos))};
    });
    await solo.keyboard.up('w');assert.ok(liveLoop.frames>20&&liveLoop.bossAdvance>.5&&liveLoop.grassAdvance>.5&&liveLoop.distance>.5,JSON.stringify(liveLoop));
    const stageTwo=await solo.evaluate(()=>{
      const heights=INFERNO_HILLS.map(h=>terrainHeightAt(h.x,h.z)),treeCount=infernoProps.filter(p=>p.kind==='tree').length,rockCount=infernoProps.filter(p=>p.kind==='rock').length,pillarCount=infernoProps.filter(p=>p.kind==='pillar').length;
      const hill=INFERNO_HILLS[0];P=localPlayer;P.pos.set(hill.x,0,hill.z);P.vy=0;P.ground=true;updatePlayer(.016,{keys:{},shoot:false,parry:false,dash:false,dashHeld:false,special:false,aim:[0,1,0],cameraYaw:Math.PI});updateInfernoFlora(players.values());grassSystem.update(.016,players.values());
      const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),quaternion=new T.Quaternion();let nearestGrass=Infinity,highestGrass=0,minGrassHeight=Infinity,maxGrassHeight=0;for(let i=0;i<grassSystem.mesh.count;i++){grassSystem.mesh.getMatrixAt(i,matrix);matrix.decompose(position,quaternion,scale);nearestGrass=Math.min(nearestGrass,Math.hypot(position.x-P.pos.x,position.z-P.pos.z));highestGrass=Math.max(highestGrass,position.y);minGrassHeight=Math.min(minGrassHeight,scale.y);maxGrassHeight=Math.max(maxGrassHeight,scale.y)}
      const canopy=infernoPropMeshes.trees.find(layer=>/Copas altas/.test(layer.mesh.name)),infernoTrunk=infernoPropMeshes.trees.find(layer=>/Troncos/.test(layer.mesh.name)),pillar=infernoPropMeshes.pillars[0];canopy.mesh.geometry.computeBoundingBox();
      const visibleInstances=layer=>{let count=0;for(let i=0;i<layer.mesh.count;i++){layer.mesh.getMatrixAt(i,matrix);matrix.decompose(position,quaternion,scale);if(scale.lengthSq()>.001)count++}return count},visibleTrees=visibleInstances(infernoTrunk),visibleRocks=visibleInstances(infernoPropMeshes.rocks[0]);
      const flatRanges=INFERNO_FLATS.map(flat=>{const d=flat.r*.3,values=[[0,0],[d,0],[-d,0],[0,d],[0,-d]].map(([dx,dz])=>terrainHeightAt(flat.x+dx,flat.z+dz));return Math.max(...values)-Math.min(...values)});
      return {treeCount,rockCount,pillarCount,maxHeight:Math.max(...heights),playerHeight:P.pos.y,terrainTriangles:infernoTerrain.geometry.index.count/3,terrainUvs:infernoTerrain.geometry.attributes.uv.count,terrainVertices:infernoTerrain.geometry.attributes.position.count,groundTexture:floor.material.map===groundTexture&&infernoTerrain.material.map===groundTexture,groundRepeat:groundTexture.repeat.toArray(),textureCanvas:[groundTexture.image.width,trunkTexture.image.width,pillarTexture.image.width,leavesTexture.image.width,stoneTexture.image.width],trunkTexture:trM.map===trunkTexture&&infernoTrunk.mesh.material.map===trunkTexture,leavesTexture:canopy.mesh.material.map===leavesTexture&&forestMeshes.slice(1,4).every(mesh=>mesh.material.map===leavesTexture),pillarTexture:pillar.mesh.material.map===pillarTexture,stoneTexture:infernoPropMeshes.rocks[0].mesh.material.map===stoneTexture&&wall.material.map===stoneTexture,pillarGeometry:pillar.mesh.geometry.type,visibleTrees,visibleRocks,flatCount:INFERNO_FLATS.length,flatRange:Math.max(...flatRanges),grassCount:grassSystem.mesh.count,nearestGrass,highestGrass,minGrassHeight,maxGrassHeight,flowers:infernoFloraMeshes.reduce((sum,mesh)=>sum+(/Hastes/.test(mesh.name)?mesh.count:0),0),floraDistance:infernoFloraDistance,canopyTop:canopy.mesh.geometry.boundingBox.max.y};
    });
    assert.equal(stageTwo.treeCount,4800);assert.equal(stageTwo.rockCount,4000);assert.equal(stageTwo.pillarCount,900);assert.ok(stageTwo.maxHeight>5&&stageTwo.playerHeight>1&&stageTwo.canopyTop>13);assert.ok(stageTwo.terrainTriangles>10000);assert.equal(stageTwo.terrainUvs,stageTwo.terrainVertices);assert.equal(stageTwo.groundTexture,true);assert.deepEqual(stageTwo.groundRepeat,[8,8]);assert.deepEqual(stageTwo.textureCanvas,[1024,1024,1024,1024,1024]);assert.equal(stageTwo.trunkTexture,true);assert.equal(stageTwo.leavesTexture,true);assert.equal(stageTwo.pillarTexture,true);assert.equal(stageTwo.stoneTexture,true);assert.equal(stageTwo.pillarGeometry,'BoxGeometry');assert.ok(stageTwo.visibleTrees>0&&stageTwo.visibleTrees<stageTwo.treeCount&&stageTwo.visibleRocks>0&&stageTwo.visibleRocks<stageTwo.rockCount,JSON.stringify(stageTwo));assert.ok(stageTwo.flatCount>=10&&stageTwo.flatRange<.01,JSON.stringify(stageTwo));assert.ok(stageTwo.grassCount>=10000&&stageTwo.nearestGrass<5&&stageTwo.highestGrass>1&&stageTwo.maxGrassHeight/stageTwo.minGrassHeight>3,JSON.stringify(stageTwo));assert.ok(stageTwo.flowers>400&&stageTwo.floraDistance===100,JSON.stringify(stageTwo));
    const collision=await solo.evaluate(()=>{
      const prop=infernoProps.find(item=>!item.destroyed&&item.y>1),probe=new T.Vector3(prop.x,prop.y,prop.z);Collision.resolve(probe,.65,arenaRadius,{ground:true});
      const obstacleDistance=Math.hypot(probe.x-prop.x,probe.z-prop.z),groundError=Math.abs(probe.y-terrainHeightAt(probe.x,probe.z));
      const a={position:new T.Vector3(80,0,80),radius:1,inverseMass:1},b={position:new T.Vector3(80,0,80),radius:1,inverseMass:1};Collision.separate([a,b]);
      const separated=Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
      const edgeX=INFERNO_RADIUS*.94,edgeHeight=terrainHeightAt(edgeX,0),rawHeight=(()=>{let value=0;for(const hill of INFERNO_HILLS){const dx=edgeX-hill.x,dz=-hill.z,q=(dx*dx+dz*dz)/(hill.r*hill.r);if(q<1)value+=hill.h*(1-q)*(1-q)}return value})();
      return {obstacleDistance,required:prop.radius+.65,groundError,separated,edgeHeight,rawHeight,colliders:infernoCollidersNear(prop.x,prop.z,.65).length};
    });
    assert.ok(collision.obstacleDistance>=collision.required-.001&&collision.groundError<.001&&collision.separated>=1.999&&collision.colliders>0,JSON.stringify(collision));assert.ok(collision.edgeHeight<=collision.rawHeight+.001,JSON.stringify(collision));
    const stageThree=await solo.evaluate(()=>{
      const samples=['tree','rock','pillar'].map(kind=>infernoProps.find(prop=>prop.kind===kind&&!prop.destroyed)),before=infernoDestroyed.size,fragments=deathFragments.length;samples.forEach(prop=>destroyInfernoProp(prop));infernoWorldRevision++;
      P=localPlayer;P.hp=100;P.inv=0;B.state='chase';B.next=100;B.chain[0].set(P.pos.x,0,P.pos.z);B.disp[0].copy(B.chain[0]);updBoss(.001);
      return {before,after:infernoDestroyed.size,allDestroyed:samples.every(prop=>prop.destroyed),revision:infernoWorldRevision,voxelFragments:deathFragments.length-fragments,contactHp:P.hp};
    });
    assert.ok(stageThree.after>=stageThree.before+3&&stageThree.allDestroyed&&stageThree.revision>0&&stageThree.voxelFragments>=60,JSON.stringify(stageThree));assert.equal(stageThree.contactHp,100);
    const waves=await solo.evaluate(()=>{const skeletonsAliveBefore=A.u.filter(u=>!u.dead).length;B.dead=true;B.dt=10;updateInfernoWaves(2.3);P=localPlayer;P.pos.copy(rg.position);P.hp=100;P.inv=0;R.state='idle';R.st=0;updRobot(.001);let visibleMeshes=0;rg.traverse(object=>{if(object.isMesh&&object.visible)visibleMeshes++});const second={wave:infernoWave,golem:R.on,visible:rg.visible&&rg.parent===scene&&visibleMeshes>0,ettin:E.on,max:R.max,scale:rg.scale.x,contactHp:P.hp,skeletonsAliveBefore};R.dead=true;R.deathComplete=true;updateInfernoWaves(2.3);P.pos.copy(eg.position);P.hp=100;P.inv=0;E.state='chase';E.cooldown=100;updEttin(.001);return{second,third:{wave:infernoWave,golem:R.on&&!R.dead,ettin:E.on,max:E.max,scale:eg.scale.x,contactHp:P.hp}}});
    assert.equal(waves.second.wave,1);assert.ok(waves.second.skeletonsAliveBefore>0);delete waves.second.skeletonsAliveBefore;assert.deepEqual(waves,{second:{wave:1,golem:true,visible:true,ettin:false,max:3600,scale:3,contactHp:100},third:{wave:2,golem:false,ettin:true,max:6400,scale:3,contactHp:100}});
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
