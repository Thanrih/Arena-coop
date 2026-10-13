const assert=require('node:assert/strict');

module.exports=async function testBoostParry(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url);await page.locator('#solo-mode').click();await page.locator('.card[data-m="1"]').click();
    const shield=await page.evaluate(()=>{
      guestOnly=true;guestFrame=()=>{};P=localPlayer;P.pos.set(0,0,0);P.g.position.copy(P.pos);P.hp=100;P.pcd=P.parry=P.pHit=0;over=false;aim.set(0,1,10);startParry();updParry(.08);
      resetThirdPersonCamera(Math.PI);camT.set(0,5,11);for(let i=0;i<30;i++)updateCamera(1/60,0,0);ren.setRenderTarget(null);ren.render(scene,cam);
      const omni=[[0,0,3],[0,0,-3],[3,0,0],[-3,0,0]].every(([x,y,z])=>parryCovers(new T.Vector3(x,y,z),PARRY_RADIUS));
      return {name:P.ring.name,visible:P.ring.visible,children:P.ring.children.length,scale:P.ring.scale.x,geometry:P.ring.geometry.type,omni,outside:parryCovers(new T.Vector3(4,0,0),PARRY_RADIUS)};
    });
    assert.deepEqual({name:shield.name,visible:shield.visible,children:shield.children,geometry:shield.geometry},{name:'Campo de força do parry',visible:true,children:2,geometry:'SphereGeometry'});assert.ok(shield.scale>.7&&shield.omni&&!shield.outside);
    await page.screenshot({path:'test-results/parry-force-field.png'});

    const ranger=await page.evaluate(()=>{
      configureCharacter(P,'ranger');P.pos.set(0,0,0);P.g.position.copy(P.pos);P.hp=100;P.face=0;P.fire=100;P.vx=P.vz=P.kx=P.kz=0;P.dashFuel=100;P.dashFuelDelay=P.dashCooldown=P.dashTime=0;P.dashActive=false;aim.set(0,1,100);
      const input={keys:{KeyD:true,ShiftLeft:true},dash:true,dashHeld:true,shoot:true,parry:false,cameraYaw:Math.PI};updatePlayer(.05,input);const immediate=P.dashFuel;
      for(let i=0;i<12;i++)updatePlayer(.05,{...input,dash:false});const sustained=P.dashFuel,distance=P.pos.x;
      updateCamera(.2,0,0);updateTeamUI();ren.setRenderTarget(null);ren.render(scene,cam);return {immediate,sustained,distance,particles:P.boostEffect.children.length,visible:P.boostEffect.visible,emitters:P.boostEffect.userData.emitters,pose:P.boostPose,lean:P.rigRefs.rig.rotation.z,arm:P.rigRefs.aR.rotation.x};
    });
    assert.equal(ranger.immediate,75);assert.ok(ranger.sustained>69&&ranger.sustained<70&&ranger.distance>10,JSON.stringify(ranger));assert.equal(ranger.particles,20);assert.equal(ranger.emitters.length,4);assert.ok(ranger.emitters.filter(e=>e[1]>2).length===2&&ranger.visible);assert.ok(ranger.pose>.98&&Math.abs(ranger.lean)>.45&&ranger.arm>.45,JSON.stringify(ranger));
    await page.screenshot({path:'test-results/boost-bipede-slide.png'});

    const fieldfighter=await page.evaluate(()=>{
      configureCharacter(P,'fieldfighter');P.pos.set(0,0,0);P.g.position.copy(P.pos);P.hp=100;P.face=0;P.fire=100;P.vx=P.vz=P.kx=P.kz=0;P.dashFuel=100;P.dashFuelDelay=P.dashCooldown=P.dashTime=0;P.dashActive=false;aim.set(0,1,100);
      const input={keys:{KeyD:true,ShiftLeft:true},dash:true,dashHeld:true,shoot:true,parry:false,cameraYaw:Math.PI};for(let i=0;i<10;i++){updatePlayer(.05,input);input.dash=false}
      updateCamera(.2,0,0);updateTeamUI();ren.setRenderTarget(null);ren.render(scene,cam);return {pose:P.boostPose,lean:P.rigRefs.rig.rotation.z,leftLeg:P.rigRefs.lL.rotation.x,rightLeg:P.rigRefs.lR.rotation.x,visible:P.boostEffect.visible};
    });
    assert.ok(fieldfighter.pose>.99&&Math.abs(fieldfighter.lean)>.45&&fieldfighter.leftLeg>0&&fieldfighter.rightLeg<0&&fieldfighter.visible,JSON.stringify(fieldfighter));
    await page.screenshot({path:'test-results/boost-fieldfighter-slide.png'});

    const arachnodroid=await page.evaluate(()=>{
      configureCharacter(P,'arachnodroid');P.pos.set(0,0,0);P.g.position.copy(P.pos);P.hp=100;P.face=0;P.vx=P.vz=P.kx=P.kz=0;P.dashFuel=100;P.dashFuelDelay=P.dashCooldown=P.dashTime=0;P.dashActive=false;
      const input={keys:{KeyD:true,ShiftLeft:true},dash:true,dashHeld:true,shoot:false,parry:false,cameraYaw:Math.PI};for(let i=0;i<8;i++){updatePlayer(.05,input);input.dash=false}P.face=0;P.g.rotation.y=0;animateCharacter(P,.05);
      updateCamera(.2,0,0);updateTeamUI();ren.setRenderTarget(null);ren.render(scene,cam);return {fuel:P.dashFuel,visible:P.boostEffect.visible,emitters:P.boostEffect.userData.emitters,allAtFeet:P.boostEffect.userData.emitters.every(e=>e[1]<1),pose:P.boostPose,lean:P.rigRefs.rig.rotation.z,leg:P.rigRefs.legs[1].rotation.x};
    });
    assert.ok(arachnodroid.fuel<75&&arachnodroid.visible&&arachnodroid.allAtFeet&&arachnodroid.pose>.99&&Math.abs(arachnodroid.lean)>.45&&arachnodroid.leg<-.3,JSON.stringify(arachnodroid));assert.equal(arachnodroid.emitters.length,4);
    await page.screenshot({path:'test-results/boost-arachnodroid-slide.png'});

    const recovery=await page.evaluate(()=>{for(let i=0;i<120;i++)updatePlayer(.05,{keys:{},dash:false,dashHeld:false,shoot:false,parry:false,cameraYaw:Math.PI});updateTeamUI();return {fuel:P.dashFuel,pose:P.boostPose,label:$('boost-label').textContent,width:$('boost-fill').style.width}});
    assert.equal(recovery.fuel,100);assert.equal(recovery.pose,0);assert.match(recovery.label,/100%/);assert.equal(recovery.width,'100%');assert.deepEqual(errors,[]);
    console.log('Boost/parry OK: force field, fuel, directional slide poses and character-specific thrusters.');
  }finally{await context.close()}
};
