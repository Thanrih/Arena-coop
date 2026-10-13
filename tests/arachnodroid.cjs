const assert=require('node:assert/strict');

module.exports=async function testArachnodroid(browser,url,errors){
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  try{
    for(const mode of [0,1,2,3]){
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);await page.locator('#solo-mode').click();await page.getByRole('radio',{name:/Arachondroid/}).check();
      await page.locator(`.card[data-m="${mode}"]`).click();
      await page.waitForFunction(()=>started&&localPlayer.character==='arachnodroid');
      assert.equal(await page.evaluate(()=>localPlayer.g.userData.source),'personagem/Arachnodroid.zip');
      assert.match(await page.locator('#help').innerText(),/laser/);
      await page.keyboard.down('j');await page.keyboard.down('d');
      await page.waitForFunction(()=>localPlayer.laserBeam.visible&&localPlayer.vx>4.4&&localPlayer.vx<4.6);
      assert.equal(await page.evaluate(()=>bullets.length),0);
      if(mode===1){
        const damage=await page.evaluate(()=>{
          guestOnly=true;guestFrame=()=>{};P=localPlayer;P.pos.set(0,0,0);P.vx=P.vz=P.kx=P.kz=0;P.inv=100;B.dead=true;R.on=false;
          A.u.forEach(u=>scene.remove(u.g));A.u.length=0;const u=mkSkel('w');u.rise=1;u.hp=10000;u.g.position.set(0,0,4);scene.add(u.g);A.u.push(u);
          aim.set(0,1.3,4);aimY=1.3;const result=[];
          for(const dt of [.01,.05]){u.hp=10000;for(let i=0;i<Math.round(1/dt);i++){updatePlayer(dt,{keys:{},shoot:true});if(!P.laserBeam.visible)throw Error('Laser interrupted while held')};result.push(10000-u.hp)}
          updatePlayer(.01,{keys:{},shoot:false});return {result,off:!P.laserBeam.visible};
        });
        assert.ok(Math.abs(damage.result[0]-32/.22)<1e-7);assert.ok(Math.abs(damage.result[0]-damage.result[1])<1e-7);assert.ok(damage.off);
      }
      await page.keyboard.up('j');await page.keyboard.up('d');await page.close();
    }
    const host=await context.newPage(),guest=await context.newPage();
    for(const page of [host,guest]){page.on('pageerror',e=>errors.push(e.message));await page.goto(url)}
    await host.locator('#group-mode').click();await host.locator('#create-room-flow').click();await host.locator('#room-mode').selectOption('1');await host.locator('#create-room').click();await host.locator('#room-info').waitFor({state:'visible'});
    await guest.locator('#group-mode').click();await guest.locator('#join-room-flow').click();await guest.getByRole('radio',{name:/Arachondroid/}).check();await guest.getByRole('button',{name:'Entrar',exact:true}).click();
    await host.waitForFunction(()=>netRoom?.players.length===2);await host.locator('#start-room').click();await guest.waitForFunction(()=>lastState?.players.length===2);
    const id=await guest.evaluate(()=>myId);
    await host.evaluate(()=>{for(const p of players.values())p.inv=100});
    await guest.waitForFunction(id=>[...replicas.values()].some(r=>r.id===id&&r.kind==='player'&&r.object.userData.source==='personagem/Arachnodroid.zip'),id);
    await guest.keyboard.down('j');await guest.keyboard.down('d');
    await host.waitForFunction(id=>{const p=players.get(id);return p.laserBeam.visible&&p.vx>4.4&&p.vx<4.6},id);
    await guest.waitForFunction(id=>[...replicas.values()].some(r=>r.id===id&&r.kind==='effect'&&r.object.geometry?.type==='CylinderGeometry'&&r.object.visible),id);
    await guest.keyboard.up('j');
    await host.waitForFunction(id=>{const p=players.get(id);return !p.laserBeam.visible&&p.vx>8.5},id);
    await guest.waitForFunction(id=>[...replicas.values()].some(r=>r.id===id&&r.kind==='effect'&&r.object.geometry?.type==='CylinderGeometry'&&!r.object.visible),id);
    await guest.keyboard.up('d');
    console.log('Arachondroid OK: starts in all solo modes and as LAN guest; continuous beam, half movement speed, release recovery and frame-independent damage.');
  }finally{await context.close()}
};
