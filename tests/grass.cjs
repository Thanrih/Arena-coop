const assert=require('node:assert/strict');

module.exports=async function testGrass(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/shader|webgl|grass/i.test(message.text()))errors.push(message.text())});
  try{
    await page.goto(url);await page.locator('#solo-mode').click();await page.locator('.card[data-m="1"]').click();
    await page.waitForFunction(()=>grassSystem?.material?.userData?.shader&&grassSystem.mesh?.count===1200);
    const normal=await page.evaluate(()=>{
      const meshes=[];scene.traverse(object=>{if(object.userData.grassSystem)meshes.push(object)});
      const matrix=new T.Matrix4(),position=new T.Vector3(),radii=[];
      for(let i=0;i<grassSystem.mesh.count;i++){grassSystem.mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);radii.push(Math.hypot(position.x,position.z))}
      const before=grassSystem.uniforms.uGrassTime.value,matrixVersion=grassSystem.mesh.instanceMatrix.version;
      grassSystem.addImpact(new T.Vector3(2,0,3),8,1.2);grassSystem.update(.25,[new T.Vector3(1,0,1),new T.Vector3(-2,0,4)]);
      return {count:grassSystem.mesh.count,meshes:meshes.length,maxRadius:Math.max(...radii),uniqueRadii:new Set(radii.map(v=>v.toFixed(2))).size,legacyVegetation:typeof GN==='undefined'&&typeof leaves==='undefined',outerInstanced:scene.children.filter(object=>object.isInstancedMesh&&!object.userData.grassSystem).length,flowers:FLOWERS.length,flowerLayers:flowerLayers.length,wallBlocks:wall.count,treeBase:TR[0].y,
        drawCalls:ren.info.render.calls,castShadow:grassSystem.mesh.castShadow,receiveShadow:grassSystem.mesh.receiveShadow,
        phaseCount:grassSystem.mesh.geometry.attributes.grassPhase.count,flexCount:grassSystem.mesh.geometry.attributes.grassFlex.count,tintCount:grassSystem.mesh.geometry.attributes.grassTint.count,
        timeAdvanced:grassSystem.uniforms.uGrassTime.value>before,matrixUnchanged:grassSystem.mesh.instanceMatrix.version===matrixVersion,players:grassSystem.uniforms.uPlayerCount.value,impacts:grassSystem.uniforms.uImpactCount.value,
        shader:/uPlayerData\[4\]/.test(grassSystem.material.userData.shader.vertexShader)&&/uImpactData\[4\]/.test(grassSystem.material.userData.shader.vertexShader)};
    });
    assert.equal(normal.count,1200);assert.equal(normal.meshes,1);assert.ok(normal.maxRadius<32);assert.ok(normal.uniqueRadii>700);assert.ok(normal.legacyVegetation);assert.equal(normal.outerInstanced,8);
    assert.equal(normal.flowers,420);assert.equal(normal.flowerLayers,3);assert.equal(normal.wallBlocks,96);assert.ok(normal.treeBase>2.9);
    assert.equal(normal.phaseCount,1200);assert.equal(normal.flexCount,1200);assert.equal(normal.tintCount,1200);assert.ok(normal.timeAdvanced&&normal.matrixUnchanged&&normal.shader);assert.equal(normal.players,2);assert.equal(normal.impacts,1);
    assert.equal(normal.castShadow,false);assert.equal(normal.receiveShadow,false);
    await page.screenshot({path:'test-results/grass-normal.png'});
    const final=await page.evaluate(()=>{
      configureArena(56);grassSystem.update(.1,[localPlayer]);
      const matrix=new T.Matrix4(),position=new T.Vector3();let maxRadius=0;for(let i=0;i<grassSystem.mesh.count;i++){grassSystem.mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);maxRadius=Math.max(maxRadius,Math.hypot(position.x,position.z))}
      return {count:grassSystem.mesh.count,maxRadius,meshCount:scene.children.filter(object=>object.userData.grassSystem).length,radius:grassSystem.radius};
    });
    assert.deepEqual(final,{count:2600,maxRadius:final.maxRadius,meshCount:1,radius:56});assert.ok(final.maxRadius<56);
    await page.screenshot({path:'test-results/grass-final.png'});
    console.log('Grass OK: dynamic grass and distributed flowers stay inside both arenas; trees sit on the instanced hexagonal stone wall.');
  }finally{await context.close()}
};
