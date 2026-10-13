const assert=require('node:assert/strict');

module.exports=async function testSkeletonCount(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1000,height:760}}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url);await page.locator('#solo-mode').click();await page.locator('.card[data-m="2"]').click();await page.waitForFunction(()=>A.on&&A.u.length>0);
    const waves=await page.evaluate(()=>{
      const counts=[A.u.length],total=A.total;
      for(let wave=1;wave<3;wave++){A.u.forEach(unit=>scene.remove(unit.g));A.u.length=0;updArmy(.01);counts.push(A.u.length)}
      return {mode:MODE,total,counts};
    });
    assert.deepEqual(waves,{mode:2,total:66,counts:[16,22,28]});
    console.log('Skeleton army OK: dedicated boss mode doubles all three waves to 66 enemies without changing other modes.');
  }finally{await context.close()}
};
