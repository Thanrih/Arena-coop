const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {WebSocket}=require('ws');
const {createArenaServer}=require('../server');
(async()=>{
  const arena=createArenaServer();await new Promise(r=>arena.server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${arena.server.address().port}`;
  let browser;
  try{
    const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    browser=await chromium.launch({headless:true,...(fs.existsSync(chromium.executablePath())?{}:{executablePath:edge}),args:['--enable-unsafe-swiftshader']});
    const errors=[];
    if(process.argv.includes('--ettin')){await require('./ettin.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--death-physics')){await require('./death-physics.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--grass')){await require('./grass.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--pause-options')){await require('./pause-options.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--skeleton-count')){await require('./skeleton-count.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--centipede-burrow')){await require('./centipede-burrow.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--third-person-camera')){await require('./third-person-camera.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--boost-parry')){await require('./boost-parry.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--menu-design')){await require('./menu-design.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--multiplayer-sync')){await require('./multiplayer-sync.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--inferno')){await require('./inferno.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--audio')){await require('./audio.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--arachnodroid')){await require('./arachnodroid.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--lighting')){await require('./lighting.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    if(process.argv.includes('--respawn')){await require('./respawn.cjs')(browser,url,errors);assert.deepEqual(errors,[]);return}
    const context=await browser.newContext({viewport:{width:1200,height:800}});
    const host=await context.newPage(),guest=await context.newPage();
    for(const page of [host,guest])page.on('pageerror',e=>errors.push(e.message));
    await host.goto(url);await guest.goto(url);
    assert.equal(await host.locator('#cards').isVisible(),false);for(const label of ['SINGLEPLAYER','MULTIPLAYER','INSTRUÇÕES'])await host.getByRole('button',{name:new RegExp(label)}).waitFor();
    await host.locator('#group-mode').click();await host.locator('#create-room-flow').click();await host.locator('#robot-name').fill('Titã');
    await host.locator('#create-room').click();await host.locator('#room-info').waitFor({state:'visible'});
    await guest.locator('#group-mode').click();await guest.locator('#join-room-flow').click();await guest.locator('#robot-name').fill('Atlas');
    await guest.getByRole('button',{name:'Entrar',exact:true}).click();
    await host.waitForFunction(()=>netRoom?.players.length===2);
    assert.match(await host.locator('#difficulty').innerText(),/4×/);
    await host.locator('#start-room').click();
    await guest.waitForFunction(()=>lastState?.players.length===2,{},{timeout:30000});
    await guest.mouse.move(900,300);await guest.locator('#aim-cursor').waitFor({state:'visible'});
    assert.equal(await guest.locator('#aim-cursor').evaluate(e=>e.style.left),'600px');
    assert.equal(await guest.locator('#aim-cursor').evaluate(e=>e.style.top),'400px');
    assert.equal(await guest.locator('#aim-cursor canvas').evaluate(e=>getComputedStyle(e).animationName),'aim-spin');
    assert.equal(await guest.locator('.aim-pulse').evaluate(e=>getComputedStyle(e).animationName),'aim-pulse');
    await guest.evaluate(()=>{resetThirdPersonCamera(Math.PI);mouse.set(0,0)});
    assert.equal(await host.evaluate(()=>B.max),9600);
    assert.deepEqual(await host.evaluate(()=>bossDifficulty),{health:4,speed:4,attacks:4});
    const guestId=await guest.evaluate(()=>myId);
    const before=await host.evaluate(id=>players.get(id).pos.x,guestId);
    await guest.keyboard.down('d');await guest.keyboard.down('j');await guest.keyboard.press('e');
    await host.waitForFunction(({id,before})=>players.get(id).pos.x>before+.3,{id:guestId,before});
    assert.ok(await host.evaluate(()=>bullets.length)>0);
    await guest.waitForFunction(({id,before})=>lastState.players.find(p=>p.id===id).pos[0]>before+.3,{id:guestId,before});
    await guest.keyboard.up('d');await guest.keyboard.up('j');
    await host.evaluate(id=>{P=players.get(id);P.inv=0;P.parry=0;hurt(150,new T.Vector3());P=localPlayer},guestId);
    assert.equal(await host.evaluate(()=>over),false);
    await guest.waitForFunction(()=>localPlayer.hp===0);
    await host.evaluate(()=>finish(true));await guest.waitForFunction(()=>over);
    assert.match(await guest.locator('#msg').innerText(),/venceu/);
    fs.mkdirSync('test-results',{recursive:true});await guest.screenshot({path:'test-results/multiplayer.png'});
    await guest.close();await host.close();
    for(const mode of [2,3,0]){
      const creator=await context.newPage(),friend=await context.newPage();
      for(const page of [creator,friend])page.on('pageerror',e=>errors.push(e.message));
      await creator.goto(url);await friend.goto(url);
      await creator.locator('#group-mode').click();await creator.locator('#create-room-flow').click();await creator.locator('#room-mode').selectOption(String(mode));await creator.locator('#create-room').click();await creator.locator('#room-info').waitFor({state:'visible'});
      await friend.locator('#group-mode').click();await friend.locator('#join-room-flow').click();await friend.getByRole('button',{name:'Entrar',exact:true}).click();
      await creator.waitForFunction(()=>netRoom?.players.length===2);
      const extra=[];
      if(mode===3){
        const roomId=await creator.evaluate(()=>netRoom.id);
        for(let i=0;i<6;i++){
          const peer=new WebSocket(url.replace('http','ws')+'/ws');extra.push(peer);
          await new Promise((resolve,reject)=>{peer.on('error',reject);peer.on('open',()=>{peer.send(JSON.stringify({type:'join',roomId,name:'Robô '+i}));resolve()})});
        }
        await creator.waitForFunction(()=>netRoom?.players.length===8);
      }
      await creator.locator('#start-room').click();
      try{await friend.waitForFunction(count=>lastState?.players.length===count,mode===3?8:2,{timeout:30000})}
      catch(error){console.error('Mode',mode,'host',await creator.evaluate(()=>({started,room:netRoom?.players.length,socket:netSocket.readyState,status:$('net-status').textContent})), 'guest',await friend.evaluate(()=>({started,state:lastState?.players.length,socket:netSocket.readyState,status:$('net-status').textContent})),errors);throw error}
      if(mode===2){
        await creator.waitForFunction(()=>A.u.length>0);
        assert.ok(await creator.evaluate(()=>A.u.every(u=>u.hp===({w:40,a:20,h:30}[u.type])*4)));
        await friend.waitForFunction(()=>[...replicas.values()].some(r=>r.kind==='enemy'&&r.nodes.length>1));
      }
      if(mode===3){
        assert.equal(await creator.evaluate(()=>R.max),28800);
        assert.ok(await friend.evaluate(()=>[...replicas.values()].some(r=>r.kind==='enemy'&&r.nodes.length>1)));
        const scaledTime=await creator.evaluate(()=>{const start=R.t;advanceBoss(updRobot,.01,rg.position);return R.t-start});
        assert.ok(Math.abs(scaledTime-.16)<.000001);
        const barrage=await creator.evaluate(()=>{
          R.state='idle';R.st=0;R.stun=0;R.hp=R.max*.21;EP.forEach(p=>scene.remove(p.m));EP.length=0;P=localPlayer;
          updRobot(.01);const before=!!R.desperate;R.hp=R.max*.2;updRobot(.01);
          const first=EP.length,targets=[...new Set(EP.map(p=>p.targetId))];
          for(let i=0;i<20;i++)updRobot(.05);
          return {before,first,targets,expected:[...players.keys()],continued:EP.length>first,state:R.state};
        });
        assert.equal(barrage.before,false);assert.equal(barrage.first,8);assert.deepEqual(barrage.targets.sort(),barrage.expected.sort());assert.ok(barrage.continued);assert.equal(barrage.state,'desperate');
        await friend.waitForFunction(()=>[...replicas.values()].filter(r=>r.kind==='bullet').length>=8);
        const safety=await creator.evaluate(()=>{
          const victim=[...players.values()][1];victim.hp=0;const oldCount=EP.length;R.barrage=0;updRobot(.01);
          const liveOnly=EP.slice(oldCount).every(p=>p.targetId!==victim.id);
          for(let i=0;i<400;i++)updRobot(.05);const bounded=EP.filter(p=>p.k==='m'&&p.o==='e').length<=192;
          robotHurt(R.hp,true);updRobot(.01);return {liveOnly,bounded,cleared:EP.length===0};
        });
        assert.ok(safety.liveOnly&&safety.bounded&&safety.cleared);
      }
      if(mode===0){
        // Verify both campaign transitions use the scaled enemy stats.
        await creator.evaluate(()=>{B.dead=true;B.hp=0;B.dt=100;localPlayer.inv=100});
        await creator.waitForFunction(()=>A.on&&A.u.length>0);
        await creator.evaluate(()=>{A.wave=2;A.u.forEach(u=>scene.remove(u.g));A.u.length=0});
        await creator.waitForFunction(()=>R.on);assert.equal(await creator.evaluate(()=>R.max),7200);
      }
      await creator.close();await friend.locator('#msg').waitFor({state:'visible'});
      assert.match(await friend.locator('#msg').innerText(),/criador saiu/);
      await friend.close();extra.forEach(peer=>peer.close());
    }
    const customHost=await context.newPage(),customGuest=await context.newPage();
    for(const page of [customHost,customGuest])page.on('pageerror',e=>errors.push(e.message));
    await customHost.goto(url);await customGuest.goto(url);await customHost.locator('#group-mode').click();await customHost.locator('#create-room-flow').click();await customHost.locator('#room-mode').selectOption('1');
    await customHost.locator('#difficulty-health').fill('0');await customHost.locator('#create-room').click();
    assert.equal(await customHost.evaluate(()=>netRoom),null);
    await customHost.locator('#difficulty-health').fill('3');await customHost.locator('#difficulty-speed').fill('0.5');await customHost.locator('#difficulty-attacks').fill('1.25');await customHost.locator('#difficulty-per-player').uncheck();
    await customHost.screenshot({path:'test-results/difficulty-settings.png'});
    await customHost.locator('#create-room').click();await customHost.locator('#room-info').waitFor({state:'visible'});
    await customGuest.locator('#group-mode').click();await customGuest.locator('#join-room-flow').click();await customGuest.getByRole('button',{name:'Entrar',exact:true}).click();
    await customHost.waitForFunction(()=>netRoom?.players.length===2);
    await customGuest.locator('#room-info').waitFor({state:'visible'});
    assert.match(await customGuest.locator('#difficulty').innerText(),/vida 3× · velocidade 0,5× · ataques 1,25×/);
    await customHost.locator('#start-room').click();await customGuest.waitForFunction(()=>lastState?.players.length===2);
    assert.deepEqual(await customHost.evaluate(()=>bossDifficulty),{health:3,speed:.5,attacks:1.25});
    assert.equal(await customHost.evaluate(()=>B.max),7200);
    const rates=await customHost.evaluate(()=>{
      B.state='chase';B.next=100;B.vs=8;B.h=0;B.hp=B.max;
      B.chain[0].set(0,0,0);const before=B.t;advanceBoss(updBoss,.01,B.chain[0]);
      const slow=B.chain[0].length(),attackTime=B.t-before;
      B.chain[0].set(0,0,0);B.vs=8;const original=bossDifficulty.speed;bossDifficulty.speed=2;
      const next=B.t;advanceBoss(updBoss,.01,B.chain[0]);bossDifficulty.speed=original;
      return {slow,fast:B.chain[0].length(),attackTime,nextAttackTime:B.t-next};
    });
    assert.ok(Math.abs(rates.slow-.04)<.000001);assert.ok(Math.abs(rates.fast-.16)<.000001);
    assert.ok(Math.abs(rates.attackTime-.0125)<.000001);assert.ok(Math.abs(rates.nextAttackTime-.0125)<.000001);
    await customHost.close();await customGuest.close();
    const solo=await context.newPage();solo.on('pageerror',e=>errors.push(e.message));await solo.goto(url);await solo.locator('#solo-mode').click();await solo.locator('#robot-name').fill('Solo');await solo.locator('.card[data-m="3"]').click();
    await solo.waitForFunction(()=>started&&R.on);assert.equal(await solo.evaluate(()=>R.max),1800);assert.equal(await solo.evaluate(()=>players.size),1);
    await solo.locator('#aim-cursor').waitFor({state:'visible'});
    const cameraShift=await solo.evaluate(()=>{
      guestOnly=true;guestFrame=()=>{};localPlayer.pos.set(0,0,0);localPlayer.vx=localPlayer.vz=0;resetThirdPersonCamera(Math.PI);camT.set(0,5,11);
      for(let i=0;i<20;i++)updateCamera(.05,0,0);const near=cam.position.distanceTo(localPlayer.pos);
      zoomThirdPersonCamera(500);for(let i=0;i<20;i++)updateCamera(.05,0,0);const far=cam.position.distanceTo(localPlayer.pos);
      const yaw=thirdPersonCamera.yaw;rotateThirdPersonCamera(120,-20);updateCamera(.016,0,0);
      return {near,far,yawChanged:thirdPersonCamera.yaw!==yaw,blur:PU.b.value,fov:cam.fov};
    });
    assert.ok(cameraShift.near>10&&cameraShift.near<13);assert.ok(cameraShift.far>cameraShift.near+4);assert.ok(cameraShift.yawChanged&&cameraShift.blur>0);assert.ok(cameraShift.fov>=58);
    const parryCone=await solo.evaluate(()=>{
      P=localPlayer;P.hp=100;P.inv=P.parry=P.pcd=P.pHit=0;over=false;aim.set(P.pos.x,1,P.pos.z+10);startParry();
      hurt(10,new T.Vector3(P.pos.x,0,P.pos.z+2),'test');const front={hp:P.hp,hit:P.pHit,face:P.parryFace,cooldown:P.pcd};
      P.inv=P.parry=P.pcd=P.pHit=0;aim.set(P.pos.x,1,P.pos.z+10);startParry();hurt(10,new T.Vector3(P.pos.x,0,P.pos.z-2),'test');updParry(0);
      return {front,backHp:P.hp,backHit:P.pHit,visual:P.ring.visible&&P.ring.geometry.type==='SphereGeometry'&&P.ring.children.length===2};
    });
    assert.equal(parryCone.front.hp,100);assert.equal(parryCone.front.hit,1);assert.equal(parryCone.front.cooldown,0);assert.equal(parryCone.backHp,100);assert.equal(parryCone.backHit,1);assert.ok(parryCone.visual);
    await solo.evaluate(()=>{P.parry=P.pcd=0;B.dead=true;EP.forEach(p=>scene.remove(p.m));EP.length=0});await solo.keyboard.press('e');await solo.waitForFunction(()=>pendingParry||localPlayer.parry>0);await solo.keyboard.press('m');await solo.locator('#menu').waitFor({state:'visible'});
    await solo.locator('#aim-cursor').waitFor({state:'hidden'});
    const fighters=await browser.newContext({viewport:{width:1200,height:900}});
    const fighterHost=await fighters.newPage(),fighterGuest=await fighters.newPage();
    for(const page of [fighterHost,fighterGuest])page.on('pageerror',e=>errors.push(e.message));
    await fighterHost.goto(url);await fighterGuest.goto(url);
    await fighterHost.locator('#group-mode').click();await fighterHost.locator('#create-room-flow').click();await fighterHost.getByRole('radio',{name:/Arachondroid/}).check();await fighterHost.locator('#room-mode').selectOption('2');
    await fighterHost.locator('#difficulty-health').fill('1');await fighterHost.locator('#difficulty-speed').fill('0.25');await fighterHost.locator('#difficulty-attacks').fill('0.25');await fighterHost.locator('#difficulty-per-player').uncheck();
    await fighterHost.locator('#create-room').click();await fighterHost.locator('#room-info').waitFor({state:'visible'});
    await fighterGuest.locator('#group-mode').click();await fighterGuest.locator('#join-room-flow').click();await fighterGuest.getByRole('radio',{name:/Fieldfighter/}).check();await fighterGuest.getByRole('button',{name:'Entrar',exact:true}).click();
    await fighterHost.waitForFunction(()=>netRoom?.players.length===2);
    assert.match(await fighterHost.locator('#room-players').innerText(),/Fieldfighter/);
    await fighterHost.locator('#start-room').click();await fighterGuest.waitForFunction(()=>lastState?.players.length===2);
    const targeting=await fighterHost.evaluate(()=>{
      const enemy={},point=new T.Vector3(),team=[...players.values()],positions=team.map(p=>p.pos.clone());team[0].pos.set(0,0,5);team[1].pos.set(0,0,7);
      const first=selectTarget(point,enemy,0).id,held=selectTarget(point,enemy,.1).id,changed=selectTarget(point,enemy,5).id;
      team.find(p=>p.id===changed).hp=0;const fallback=selectTarget(point,enemy,.01).id;team.forEach(p=>p.hp=100);
      team[1].pos.set(0,0,100);const farEnemy={};const near=selectTarget(point,farEnemy,0).id,after=selectTarget(point,farEnemy,5).id;
      team.forEach((p,i)=>p.pos.copy(positions[i]));P=localPlayer;return {first,held,changed,fallback,near,after};
    });
    assert.equal(targeting.held,targeting.first);assert.notEqual(targeting.changed,targeting.first);assert.equal(targeting.fallback,targeting.first);assert.equal(targeting.near,targeting.after);
    const fighterId=await fighterGuest.evaluate(()=>myId);
    assert.equal(await fighterHost.evaluate(id=>players.get(id).character,fighterId),'fieldfighter');
    const mappedModel=await fighterHost.evaluate(id=>{
      const p=players.get(id),counts={};p.g.traverse(o=>{if(o.geometry?.userData.part)counts[o.geometry.userData.part]=o.geometry.attributes.position.count/3});
      return {source:p.g.userData.source,sha:p.g.userData.objSha256,counts,reference:FIELD_FIGHTER_MODEL.triangles};
    },fighterId);
    assert.equal(mappedModel.source,'personagem/FieldFighter.zip');assert.match(mappedModel.sha,/^[a-f0-9]{64}$/);
    assert.deepEqual(mappedModel.counts,mappedModel.reference);
    await fighterGuest.waitForFunction(id=>[...replicas.values()].some(r=>r.kind==='player'&&r.id===id&&r.object.userData.source==='personagem/FieldFighter.zip'),fighterId);
    assert.match(await fighterGuest.locator('#help').innerText(),/golpe massivo/);
    await fighterHost.evaluate(id=>{
      const fighter=players.get(id);fighter.inv=100;localPlayer.inv=100;
      A.u.forEach(u=>scene.remove(u.g));A.u.length=0;A.wave=2;
      for(const [x,z] of [[-1,2],[1,2],[0,12],[0,-2]]){const u=mkSkel('w');u.rise=1;u.hp=1000;u.cd=100;u.g.position.copy(fighter.pos);u.g.position.x+=x;u.g.position.z+=z;scene.add(u.g);A.u.push(u)}
    },fighterId);
    await fighterGuest.evaluate(()=>{const original=localInput;localInput=()=>{const i=original();i.aim=[localPlayer.pos.x,1,localPlayer.pos.z+10];return i}});
    await fighterGuest.keyboard.down('j');
    await fighterHost.waitForFunction(()=>A.u[0].hp<1000&&A.u[1].hp<1000);
    assert.equal(await fighterHost.evaluate(()=>A.u[2].hp),1000);
    assert.equal(await fighterHost.evaluate(()=>A.u[3].hp),1000);
    assert.equal(await fighterHost.evaluate(()=>bullets.length),0);
    await fighterGuest.waitForFunction(id=>[...replicas.values()].some(r=>r.kind==='effect'&&r.id===id&&r.object.visible),fighterId);
    await fighterGuest.screenshot({path:'test-results/fieldfighter-impact.png'});
    await fighterGuest.keyboard.up('j');
    await fighterGuest.keyboard.press('Shift');
    await fighterHost.waitForFunction(id=>players.get(id).dashFuel<100,fighterId);
    await fighterGuest.waitForFunction(()=>localPlayer.dashFuel<100);
    await fighterGuest.waitForFunction(()=>$('dash-status').textContent.includes('%'));
    assert.match(await fighterGuest.locator('#dash-status').innerText(),/(BOOST|Combustível)/);
    const laser=await fighterHost.evaluate(()=>{
      P=localPlayer;localPlayer.pos.set(0,0,10);localPlayer.g.position.copy(localPlayer.pos);B.dead=true;R.on=false;
      A.u.forEach(u=>scene.remove(u.g));A.u.length=0;
      const target=mkSkel('w');target.rise=1;target.hp=1000;target.g.position.set(0,0,14);scene.add(target.g);A.u.push(target);
      aim.set(0,1.4,14);aimY=1.4;performAttack();
      const counts={};P.g.traverse(o=>{if(o.geometry?.userData.part)counts[o.geometry.userData.part]=o.geometry.attributes.position.count/3});
      return {hp:target.hp,visible:P.laserBeam.visible,source:P.g.userData.source,counts,expected:ARACHNODROID_MODEL.triangles};
    });
    assert.equal(laser.hp,968);assert.equal(laser.visible,true);assert.equal(laser.source,'personagem/Arachnodroid.zip');assert.deepEqual(laser.counts,laser.expected);
    await fighterGuest.waitForFunction(()=>[...replicas.values()].some(r=>r.kind==='player'&&r.object.userData.source==='personagem/Arachnodroid.zip'));
    await fighterHost.evaluate(()=>{const original=localInput;localInput=()=>{const input=original();input.aim=[0,1.4,14];return input}});
    await fighterHost.keyboard.down('j');
    await fighterGuest.waitForFunction(()=>[...replicas.values()].some(r=>r.kind==='effect'&&r.object.geometry?.type==='CylinderGeometry'&&r.object.visible));
    await fighterHost.keyboard.up('j');
    await fighterHost.close();await fighterGuest.close();
    const soloFighter=await fighters.newPage();soloFighter.on('pageerror',e=>errors.push(e.message));await soloFighter.goto(url);
    await soloFighter.locator('#solo-mode').click();await soloFighter.getByRole('radio',{name:/Fieldfighter/}).check();await soloFighter.locator('.card[data-m="1"]').click();
    assert.equal(await soloFighter.evaluate(()=>localPlayer.character),'fieldfighter');
    const bounds=await soloFighter.evaluate(()=>{const p=localPlayer,model=new T.Box3().setFromObject(p.g);return model.getSize(new T.Vector3()).toArray()});
    assert.ok(Math.abs(bounds[0]-1.71)<.01);assert.ok(bounds[1]>2.6&&bounds[1]<2.8);
    const areaDamage=await soloFighter.evaluate(()=>{
      P=localPlayer;P.inv=100;B.segs.forEach((s,i)=>{B.disp[i].copy(P.pos);B.Y[i]=1});
      const before=B.hp;performAttack();const first=before-B.hp;animateCharacter(P,.29);const damage=before-B.hp;animateCharacter(P,.3);
      B.segs.forEach((s,i)=>B.disp[i].set(0,0,-100));R.on=true;R.dead=false;R.hp=1800;R.stun=2;rg.position.copy(P.pos);const robotBefore=R.hp;performAttack();
      return {first,damage,robotDamage:robotBefore-R.hp};
    });
    assert.equal(areaDamage.first,260);assert.equal(areaDamage.damage,520);assert.equal(areaDamage.robotDamage,384);
    const dashChecks=await soloFighter.evaluate(()=>{
      const results=[];P=localPlayer;
      for(const character of ['ranger','fieldfighter','arachnodroid']){
        configureCharacter(P,character);P.pos.set(0,0,0);P.vx=P.vz=P.kx=P.kz=P.vy=0;P.hp=100;P.ground=true;P.dashFuel=100;P.dashFuelDelay=P.dashCooldown=P.dashTime=0;P.dashActive=false;
        const input={keys:{KeyD:true},dash:true,dashHeld:true,shoot:false,parry:false};updatePlayer(.05,input);
        const first=P.pos.x,initialFuel=P.dashFuel;for(let i=0;i<10;i++)updatePlayer(.05,{...input,dash:false});const heldDistance=P.pos.x,heldFuel=P.dashFuel;
        for(let i=0;i<100;i++)updatePlayer(.05,{...input,keys:{},dash:false,dashHeld:false});
        const recovered=P.dashFuel===100;updatePlayer(.05,input);
        results.push({character,first,initialFuel,heldDistance,heldFuel,recovered,restarted:P.dashFuel===75});
        P.hp=0;P.dashCooldown=0;const before=P.pos.clone();updatePlayer(.05,input);results.at(-1).deadStill=before.equals(P.pos)&&P.dashCooldown===0;
      }return results;
    });
    for(const dash of dashChecks){assert.ok(dash.first>=1.5);assert.equal(dash.initialFuel,75);assert.ok(dash.heldDistance>dash.first+5&&dash.heldFuel<dash.initialFuel);assert.ok(dash.recovered&&dash.restarted&&dash.deadStill)}
    await soloFighter.close();await fighters.close();
    await require('./arachnodroid.cjs')(browser,url,errors);
    await require('./specials.cjs')(browser,url,errors);
    await require('./final-arena.cjs')(browser,url,errors);
    await require('./death-physics.cjs')(browser,url,errors);
    await require('./ettin.cjs')(browser,url,errors);
    await require('./grass.cjs')(browser,url,errors);
    await require('./pause-options.cjs')(browser,url,errors);
    await require('./skeleton-count.cjs')(browser,url,errors);
    await require('./centipede-burrow.cjs')(browser,url,errors);
    await require('./third-person-camera.cjs')(browser,url,errors);
    await require('./boost-parry.cjs')(browser,url,errors);
    await require('./menu-design.cjs')(browser,url,errors);
    assert.deepEqual(errors,[]);console.log('Browser OK: LAN, all bosses, campaign, difficulty, mapped characters, two-hit cone combo, laser, fuel boost, omnidirectional parry, camera modes and continuous missiles against eight players.');
  }finally{await browser?.close();await arena.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
