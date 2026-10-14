const assert=require('node:assert/strict');

module.exports=async function testPauseOptions(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url);
    const large=await page.evaluate(()=>({scale:pixelScale(),width:rt.width,strength:pixelStrength}));
    await page.setViewportSize({width:480,height:360});await page.waitForTimeout(80);
    const small=await page.evaluate(()=>({scale:pixelScale(),width:rt.width}));
    assert.ok(small.scale<large.scale);assert.ok(small.width>480/large.scale);
    await page.locator('#solo-mode').click();await page.locator('.card[data-m="1"]').click();await page.keyboard.press('Escape');
    await page.locator('#pause-menu').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>paused),true);
    const frozen=await page.evaluate(()=>grassSystem.time);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>grassSystem.time),frozen);
    await page.locator('#pause-open-options').click();await page.screenshot({path:'test-results/pause-options.png'});await page.locator('#pixel-strength').fill('0');
    assert.deepEqual(await page.evaluate(()=>({scale:pixelScale(),mix:PU.s.value,width:rt.width,saved:localStorage.getItem('arena-pixel-strength')})),{scale:1,mix:0,width:480,saved:'0'});
    await page.locator('#pixel-strength').fill('100');assert.equal(await page.locator('#pixel-value').textContent(),'100%');
    assert.equal(await page.locator('#camera-blur').getAttribute('max'),'10');
    await page.locator('#camera-blur').fill('0');
    const disabledBlur=await page.evaluate(()=>{resetThirdPersonCamera();thirdPersonCamera.turnImpulse=120;thirdPersonCamera.blurDirection.set(.0065,0);updateCamera(1/60,0,0);return {level:cameraBlurLevel,strength:PU.b.value,saved:localStorage.getItem('arena-camera-blur')}});
    assert.deepEqual(disabledBlur,{level:0,strength:0,saved:'0'});
    await page.locator('#camera-blur').fill('6');assert.equal(await page.locator('#camera-blur-value').textContent(),'6 / 10');
    const reducedBlur=await page.evaluate(()=>{resetThirdPersonCamera();thirdPersonCamera.turnImpulse=120;thirdPersonCamera.blurDirection.set(.0065,0);updateCamera(1/60,0,0);return {level:cameraBlurLevel,strength:PU.b.value,saved:localStorage.getItem('arena-camera-blur')}});
    assert.equal(reducedBlur.level,6);assert.ok(reducedBlur.strength>0&&reducedBlur.strength<.6,JSON.stringify(reducedBlur));assert.equal(reducedBlur.saved,'6');
    assert.equal(await page.locator('#grass-amount').getAttribute('max'),'100');
    await page.locator('#grass-amount').fill('60');await page.waitForFunction(()=>grassSystem.mesh.count===7200);
    assert.equal(await page.locator('#grass-amount-value').textContent(),'60%');
    assert.deepEqual(await page.evaluate(()=>({amount:grassAmount,multiplier:grassSystem.config.grassDensityMultiplier,saved:localStorage.getItem('arena-grass-amount-v2')})),{amount:60,multiplier:6,saved:'60'});
    assert.equal(await page.locator('#vegetation-distance').getAttribute('max'),'180');
    await page.locator('#vegetation-distance').fill('70');assert.equal(await page.locator('#vegetation-distance-value').textContent(),'70 m');
    assert.deepEqual(await page.evaluate(()=>({distance:vegetationDistance,grassDistance:grassSystem.config.grassRenderDistance,saved:localStorage.getItem('arena-vegetation-distance'),shadows:ren.shadowMap.enabled})),{distance:70,grassDistance:70,saved:'70',shadows:false});
    await page.locator('#pause-options-back').click();await page.locator('#pause-resume').click();await page.waitForFunction(value=>grassSystem.time>value,frozen);
    await page.keyboard.press('Escape');await page.locator('#pause-exit').click();await page.locator('#menu').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>started),false);
    console.log('Pause/options OK: pause freezes the game; pixel scale, camera blur, grass amount and vegetation distance persist; exit returns to menu.');
  }finally{await context.close()}
};
