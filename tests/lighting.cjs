const assert=require('node:assert/strict');
const fs=require('node:fs');

module.exports=async function testLighting(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url);await page.locator('#solo-mode').click();await page.getByRole('radio',{name:/Arachondroid/}).check();await page.locator('.card[data-m="1"]').click();
    await page.waitForFunction(()=>started&&localPlayer.character==='arachnodroid'&&ren.shadowMap.enabled);
    const enabled=await page.evaluate(()=>({enabled:lightingEffects,renderer:ren.shadowMap.enabled,basic:ren.shadowMap.type===T.BasicShadowMap,map:[sun.shadow.mapSize.x,sun.shadow.mapSize.y],sun:sun.intensity,sky:skyLight.intensity,focus:[lightFocus.x,lightFocus.z]}));
    assert.deepEqual(enabled.map,[512,512]);assert.equal(enabled.enabled,true);assert.equal(enabled.renderer,true);assert.equal(enabled.basic,true);assert.ok(enabled.sun>1&&enabled.sky<1);assert.notDeepEqual(enabled.focus,[99999,99999]);
    await page.keyboard.press('Escape');await page.locator('#pause-open-options').click();assert.equal(await page.locator('#lighting-effects').isChecked(),true);
    await page.locator('#lighting-effects').uncheck();
    assert.deepEqual(await page.evaluate(()=>({enabled:lightingEffects,renderer:ren.shadowMap.enabled,sun:sun.intensity,saved:localStorage.getItem('arena-lighting-effects')})),{enabled:false,renderer:false,sun:0,saved:'0'});
    await page.locator('#lighting-effects').check();await page.locator('#pause-options-back').click();await page.locator('#pause-resume').click();
    await page.waitForFunction(()=>ren.shadowMap.enabled&&sun.intensity>1);
    fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/light-and-shadows.png'});
    console.log('Lighting OK: lightweight 512px hard shadows follow the player and the saved option toggles them.');
  }finally{await context.close()}
};
