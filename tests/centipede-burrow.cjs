const assert=require('node:assert/strict');

module.exports=async function testCentipedeBurrow(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(url);await page.locator('#solo-mode').click();await page.locator('.card[data-m="1"]').click();
    const result=await page.evaluate(()=>{
      guestOnly=true;guestFrame=()=>{};P=localPlayer;over=false;
      P.pos.set(0,0,20);P.g.position.copy(P.pos);P.hp=100;P.inv=P.parry=P.pHit=0;P.kx=P.kz=P.vy=0;P.ground=true;
      B.dead=false;B.state='chase';B.next=0;B.h=0;B.vs=0;B.t=0;B.dirtClock=0;clearBurrowDust();
      for(let i=0;i<N;i++){B.chain[i].set(0,0,-i*SP);B.disp[i].copy(B.chain[i]);B.Y[i]=1}
      updBoss(.01);const triggered=B.state==='burrow';
      for(let i=0;i<20&&B.state==='burrow';i++){updBoss(.05);updateBurrowDust(.05)}
      const buried=B.state==='underground'&&Math.max(...B.Y)<.2,start=B.chain[0].clone();
      let trail=false;for(let i=0;i<100&&B.state==='underground';i++){updBoss(.025);updateBurrowDust(.025);trail=trail||burrowDustPool.filter(p=>p.m.visible).length>=4}
      const dashed=B.chain[0].distanceTo(start)>8,emerged=B.state==='emerge',damaged=P.hp===70,launched=Math.hypot(P.kx,P.kz)>=29&&P.vy===12&&!P.ground;
      const dirt=burrowDustPool.filter(p=>p.m.visible).length,networked=dynamicRoots().some(root=>root.object===burrowDust&&root.kind==='effect');
      ren.setRenderTarget(null);ren.render(scene,cam);
      for(let i=0;i<70&&B.state==='emerge';i++){updBoss(.025);updateBurrowDust(.025)}
      return {triggered,buried,trail,dashed,emerged,damaged,launched,dirt,networked,recovered:B.state==='chase',cooldown:B.next};
    });
    assert.ok(result.triggered&&result.buried&&result.trail&&result.dashed&&result.emerged,JSON.stringify(result));
    assert.ok(result.damaged&&result.launched&&result.dirt>20&&result.networked,JSON.stringify(result));
    assert.ok(result.recovered&&result.cooldown>0,JSON.stringify(result));
    await page.screenshot({path:'test-results/centipede-burrow.png'});
    assert.deepEqual(errors,[]);console.log('Centipede burrow OK: long-range dive, underground dirt trail, emergence damage, launch and LAN effect synchronization.');
  }finally{await context.close()}
};
