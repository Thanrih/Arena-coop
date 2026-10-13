const assert=require('node:assert/strict');

module.exports=async function testThirdPersonCamera(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url);await page.locator('#solo-mode').click();await page.locator('.card[data-m="1"]').click();
    const initial=await page.evaluate(()=>{
      guestOnly=true;guestFrame=()=>{};localPlayer.pos.set(0,0,0);localPlayer.g.position.copy(localPlayer.pos);localPlayer.vx=localPlayer.vz=0;localPlayer.ph=0;resetThirdPersonCamera(Math.PI);camT.set(0,5,11);
      for(let i=0;i<30;i++)updateCamera(1/60,0,0);
      const right=cameraRelativeInput(1,0,Math.PI),forward=cameraRelativeInput(0,-1,Math.PI);
      const playerOnScreen=localPlayer.pos.clone().add(new T.Vector3(0,1.5,0)).project(cam);
      const cursor=$('aim-cursor').getBoundingClientRect();
      return {perspective:cam.isPerspectiveCamera,distance:cam.position.distanceTo(localPlayer.pos),height:cam.position.y,right,forward,targetDistance:thirdPersonCamera.targetDistance,blurUniform:'b' in pq.material.uniforms&&'d' in pq.material.uniforms,playerScreenY:playerOnScreen.y,cursorX:cursor.left+cursor.width/2,cursorY:cursor.top+cursor.height/2};
    });
    assert.ok(initial.perspective&&initial.distance>10&&initial.distance<13&&initial.height>4,JSON.stringify(initial));
    assert.ok(initial.right.x>.99&&Math.abs(initial.right.z)<.01&&initial.forward.z<-.99,JSON.stringify(initial));assert.ok(initial.blurUniform);
    assert.ok(initial.playerScreenY<-.15,`the player must remain below the centered crosshair: ${JSON.stringify(initial)}`);
    assert.ok(Math.abs(initial.cursorX-600)<2&&Math.abs(initial.cursorY-450)<2,`crosshair must stay centered: ${JSON.stringify(initial)}`);
    await page.mouse.move(600,450);await page.mouse.wheel(0,400);
    const motion=await page.evaluate(()=>{
      for(let i=0;i<30;i++)updateCamera(1/60,0,0);const zoomed=thirdPersonCamera.distance;
      const yaw=thirdPersonCamera.yaw;rotateThirdPersonCamera(150,-35);updateCamera(1/60,0,0);const blurPeak=PU.b.value,rotated=thirdPersonCamera.yaw!==yaw;
      localPlayer.vx=9;localPlayer.vz=0;for(let i=0;i<24;i++){localPlayer.ph+=.18;updateCamera(1/60,0,0)}const movingFov=cam.fov,roll=cam.rotation.z;
      localPlayer.vx=localPlayer.vz=0;for(let i=0;i<90;i++)updateCamera(1/60,0,0);return {zoomed,target:thirdPersonCamera.targetDistance,blurPeak,blurEnd:PU.b.value,rotated,movingFov,roll};
    });
    assert.ok(motion.target>15&&motion.zoomed>14,JSON.stringify(motion));assert.ok(motion.rotated&&motion.blurPeak>.1&&motion.blurEnd<motion.blurPeak,JSON.stringify(motion));assert.ok(motion.movingFov>58&&Math.abs(motion.roll)>.001,JSON.stringify(motion));
    const verticalAim=await page.evaluate(()=>{
      localPlayer.vx=localPlayer.vz=0;resetThirdPersonCamera(Math.PI);camT.set(0,5,11);
      rotateThirdPersonCamera(0,-500);for(let i=0;i<30;i++)updateCamera(1/60,0,0);ray.setFromCamera(thirdPersonAimPoint,cam);const up=ray.ray.direction.y;
      aim.copy(ray.ray.direction).multiplyScalar(70).add(ray.ray.origin);aimY=aim.y;localPlayer.fire=10;
      for(let i=0;i<20;i++)updatePlayer(1/60,{keys:{},shoot:true,cameraYaw:thirdPersonCamera.yaw});
      const armUp=localPlayer.rigRefs.aR.rotation.x,face=localPlayer.face,expectedFace=Math.atan2(aim.x-localPlayer.pos.x,aim.z-localPlayer.pos.z);
      rotateThirdPersonCamera(0,1000);for(let i=0;i<30;i++)updateCamera(1/60,0,0);ray.setFromCamera(thirdPersonAimPoint,cam);const down=ray.ray.direction.y;
      aim.copy(ray.ray.direction).multiplyScalar(70).add(ray.ray.origin);aimY=aim.y;updatePlayer(1/60,{keys:{},shoot:true,cameraYaw:thirdPersonCamera.yaw});
      return {up,down,armUp,armDown:localPlayer.rigRefs.aR.rotation.x,faceError:Math.abs(ad(face,expectedFace))};
    });
    assert.ok(verticalAim.up>.55&&verticalAim.down<-.55,`vertical aim must cover both directions: ${JSON.stringify(verticalAim)}`);
    assert.ok(verticalAim.armUp< -2&&verticalAim.armDown>-.8,`weapon must follow aim height: ${JSON.stringify(verticalAim)}`);
    assert.ok(verticalAim.faceError<.02,`character must face the shot horizontally: ${JSON.stringify(verticalAim)}`);
    await page.keyboard.press('p');
    const isometric=await page.evaluate(()=>{mouse.set(.45,.35);for(let i=0;i<45;i++)updateCamera(1/60,0,0);updateAimCursor();const cursor=$('aim-cursor').getBoundingClientRect();return {mode:cameraMode,distance:cam.position.distanceTo(localPlayer.pos),cursorX:cursor.left+cursor.width/2,cursorY:cursor.top+cursor.height/2,label:$('camera-status').textContent}});
    assert.equal(isometric.mode,'isometric');assert.ok(isometric.distance>40,JSON.stringify(isometric));assert.ok(isometric.cursorX>850&&isometric.cursorY<300,JSON.stringify(isometric));assert.match(isometric.label,/isométrica/);
    await page.evaluate(()=>{ren.setRenderTarget(null);ren.render(scene,cam)});await page.screenshot({path:'test-results/camera-isometric.png'});
    await page.keyboard.press('p');assert.equal(await page.evaluate(()=>cameraMode),'third');
    await page.evaluate(()=>{resetThirdPersonCamera(Math.PI);camT.set(localPlayer.pos.x,5,localPlayer.pos.z+11);localPlayer.vx=5;localPlayer.vz=-5;localPlayer.ph=2;for(let i=0;i<30;i++)updateCamera(1/60,0,0);ren.setRenderTarget(null);ren.render(scene,cam)});await page.screenshot({path:'test-results/third-person-camera.png'});
    assert.deepEqual(errors,[]);console.log('Camera modes OK: P toggles isometric/third person, with orbit, vertical aim, motion feel, turn blur and wheel zoom.');
  }finally{await context.close()}
};
