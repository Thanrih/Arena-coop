const assert=require('node:assert/strict');

module.exports=async function testMenuDesign(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url);await page.locator('#main-actions').waitFor({state:'visible'});
    const tokens=await page.evaluate(()=>{
      const title=getComputedStyle(document.querySelector('#menu h1')),button=getComputedStyle(document.querySelector('.menu-choice')),menu=getComputedStyle(document.querySelector('#menu'));
      return {titleSize:parseFloat(title.fontSize),titleColor:title.color,titleShadow:title.textShadow,buttonBackground:button.backgroundImage,buttonBorder:button.borderTopColor,menuBackground:menu.backgroundImage,columns:getComputedStyle(document.querySelector('#main-actions')).gridTemplateColumns};
    });
    assert.ok(tokens.titleSize>=60&&tokens.titleShadow!=='none',JSON.stringify(tokens));assert.match(tokens.buttonBackground,/linear-gradient/);assert.match(tokens.menuBackground,/menu-forest\.png/);assert.ok(!tokens.columns.includes(' '),tokens.columns);
    await page.locator('#solo-mode').hover();await page.screenshot({path:'test-results/menu-main.png'});

    await page.locator('#solo-mode').click();await page.locator('#single-panel').waitFor({state:'visible'});assert.equal(await page.locator('#menu').getAttribute('data-screen'),'single');
    await page.screenshot({path:'test-results/menu-singleplayer.png'});await page.locator('#single-panel .back-main').click();

    await page.locator('#group-mode').click();await page.locator('#multiplayer-panel').waitFor({state:'visible'});await page.screenshot({path:'test-results/menu-multiplayer.png'});
    await page.locator('#create-room-flow').click();await page.locator('#create-room-panel').waitFor({state:'visible'});await page.screenshot({path:'test-results/menu-create-room.png'});await page.locator('#create-room-panel .back-multiplayer').click();await page.locator('#multiplayer-panel .back-main').click();

    await page.locator('#instructions-mode').click();await page.locator('#instructions-panel').waitFor({state:'visible'});await page.screenshot({path:'test-results/menu-instructions.png'});await page.locator('#instructions-panel .back-main').click();

    await page.locator('#solo-mode').click();await page.locator('.card[data-m="1"]').click();await page.keyboard.press('Escape');await page.locator('#pause-menu').waitFor({state:'visible'});
    const pause=await page.locator('.pause-panel').evaluate(element=>{const style=getComputedStyle(element);return {background:style.backgroundImage,border:style.borderTopColor,shadow:style.boxShadow}});assert.match(pause.background,/linear-gradient/);assert.notEqual(pause.shadow,'none');
    await page.screenshot({path:'test-results/menu-pause.png'});
    const mobile=await context.newPage();mobile.on('pageerror',error=>errors.push(error.message));await mobile.setViewportSize({width:390,height:844});await mobile.goto(url);await mobile.locator('#main-actions').waitFor({state:'visible'});await mobile.screenshot({path:'test-results/menu-mobile.png'});
    const mobileBounds=await mobile.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth,title:document.querySelector('h1').getBoundingClientRect().width}));assert.equal(mobileBounds.scrollWidth,mobileBounds.width);assert.ok(mobileBounds.title<mobileBounds.width-20);await mobile.close();assert.deepEqual(errors,[]);
    console.log('Menu design OK: forest palette, pixel frames and interaction states cover main, solo, multiplayer, room, instructions and pause screens.');
  }finally{await context.close()}
};
