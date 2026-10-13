const {chromium}=require('playwright');
const {createArenaServer}=require('../server');
const fs=require('node:fs');
(async()=>{
  const arena=createArenaServer();await new Promise(r=>arena.server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({headless:true,...(fs.existsSync(chromium.executablePath())?{}:{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),args:['--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:800,height:800}});
    await page.goto(process.argv.includes('--live')?'http://10.9.1.80:3000':`http://127.0.0.1:${arena.server.address().port}`);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.locator('#solo-mode').click();await page.getByRole('radio',{name:/Arachondroid/}).check();await page.locator(`.card[data-m="${process.argv.includes('--final')?4:1}"]`).click();
    await page.waitForFunction(()=>started&&localPlayer.character==='arachnodroid'&&localPlayer.g.userData.source==='personagem/Arachnodroid.zip');
    if(process.argv.includes('--final'))await page.waitForFunction(()=>finalEncounter&&arenaRadius===56&&!B.dead&&A.on&&R.on);
    await page.evaluate(()=>{
      started=true;guestOnly=true;guestFrame=()=>{};
      for(const node of [...scene.children])if(!node.isLight)scene.remove(node);
      for(const id of ['menu','hud','help','bn','team','player-labels'])document.getElementById(id).style.display='none';
      scene.background=new T.Color(0x6b727c);scene.fog=null;
      window.previewModel=buildFieldfighter();scene.add(previewModel.g);
      const base=new T.Mesh(new T.PlaneGeometry(20,20).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color:0x7c838b}));base.receiveShadow=true;scene.add(base);
      cam.fov=35;cam.aspect=1;cam.updateProjectionMatrix();cam.position.set(4,3.6,6);cam.lookAt(0,1.4,0);
      ren.setRenderTarget(null);ren.render(scene,cam);
    });
    fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/fieldfighter-mapped.png'});
    await page.evaluate(()=>{previewModel.rigRefs.aL.rotation.x=-1.1;previewModel.rigRefs.aR.rotation.x=.8;previewModel.rigRefs.lL.rotation.x=.4;previewModel.rigRefs.lR.rotation.x=-.4;ren.render(scene,cam)});
    await page.screenshot({path:'test-results/fieldfighter-articulated.png'});
    await page.evaluate(()=>{scene.remove(previewModel.g);previewModel=buildArachnodroid();scene.add(previewModel.g);ren.render(scene,cam)});
    await page.screenshot({path:'test-results/arachnodroid-mapped.png'});
    if(errors.length)throw Error(errors.join('\n'));
    console.log('Mapped original model and articulated preview rendered.');
  }finally{await browser?.close();await arena.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
