// The creator simulates one shared world. Guests send input and render its snapshots.
const localPlayer=P,players=new Map(),remoteInputs=new Map(),replicas=new Map(),sentRoots=new Set();
const sentGeometries=new Set(),sentMaterials=new Set(),guestGeometries={},guestMaterials={};
const sentTransforms=new Map();
const objectLoader=new T.ObjectLoader();
const thirdPersonAimPoint=new T.Vector2(0,0);
const thirdPersonCamera={yaw:Math.PI,pitch:-.08,distance:11,targetDistance:11,minDistance:5,maxDistance:20,turnImpulse:0,blurDirection:new T.Vector2(),look:new T.Vector3(),roll:0,fov:58};
let cameraMode='third';
let pointerInside=true;
let netSocket=null,netRoom=null,myId=null,isHost=false,matchWon=false;
let bossDifficulty={health:1,speed:1,attacks:1};
let pendingDash=false,pendingSpecial=false;
let pendingParry=false,lastInput=0,lastSnapshot=0,networkMode='solo',lastState=null,guestOnly=false,menuScreen='main';
localPlayer.rigRefs={rig,lL,lR,aL,aR};localPlayer.ring=ring;
const $=id=>document.getElementById(id);
function netSend(msg){if(netSocket?.readyState===WebSocket.OPEN)netSocket.send(JSON.stringify(msg))}
function status(text){$('net-status').textContent=text}
function robotName(){const name=$('robot-name').value.trim().slice(0,24)||'Robô';localStorage.setItem('arena-robot-name',name);return name}
function requestDash(){if(started&&!over)pendingDash=true}
function requestSpecial(){if(started&&!over)pendingSpecial=true}
function updateControls(){ $('help').textContent='WASD mover · Mouse mirar · P câmera '+(cameraMode==='third'?'isométrica':'3ª pessoa')+' · ESPAÇO pular · Mouse/J '+(localPlayer.character==='fieldfighter'?'golpe massivo: combo de 2 hits em cone':localPlayer.character==='arachnodroid'?'laser contínuo (movimento 50%)':'atirar')+' · F '+SPECIALS[localPlayer.character].name+' · Segure Shift/Q para boost · Botão direito/E parry · ESC pausar'}
function requestParry(){if(started)pendingParry=true}
function updateAimCursor(){
  const cursor=$('aim-cursor');
  const active=started&&!over&&!paused;
  document.body.classList.toggle('playing',active);
  cursor.hidden=!active;
  cursor.style.left=(cameraMode==='third'?.5:mouse.x*.5+.5)*innerWidth+'px';
  cursor.style.top=(cameraMode==='third'?.5:-mouse.y*.5+.5)*innerHeight+'px';
}
function cameraAimPoint(){return cameraMode==='third'?thirdPersonAimPoint:mouse}
function toggleCameraMode(){
  if(!started||paused||over)return;cameraMode=cameraMode==='third'?'isometric':'third';camT.copy(cam.position);thirdPersonCamera.turnImpulse=0;PU.b.value=0;
  if(cameraMode==='isometric'&&document.pointerLockElement)document.exitPointerLock();
  const indicator=$('camera-status');if(indicator)indicator.textContent=cameraMode==='third'?'Câmera: 3ª pessoa':'Câmera: isométrica';updateAimCursor();updateControls();
}
function resetThirdPersonCamera(face=Math.PI){thirdPersonCamera.yaw=face;thirdPersonCamera.pitch=-.08;thirdPersonCamera.distance=thirdPersonCamera.targetDistance=11;thirdPersonCamera.turnImpulse=0;thirdPersonCamera.blurDirection.set(0,0);thirdPersonCamera.roll=0;PU.b.value=0}
function rotateThirdPersonCamera(dx,dy){if(!started||paused||over||cameraMode!=='third')return;const length=Math.hypot(dx,dy);if(!length)return;thirdPersonCamera.yaw-=dx*.0026;thirdPersonCamera.pitch=Math.max(-1.15,Math.min(1.15,thirdPersonCamera.pitch-dy*.002));thirdPersonCamera.turnImpulse=Math.min(120,thirdPersonCamera.turnImpulse+length);thirdPersonCamera.blurDirection.set(-dx/length*.0065,dy/length*.0065)}
function zoomThirdPersonCamera(delta){thirdPersonCamera.targetDistance=Math.max(thirdPersonCamera.minDistance,Math.min(thirdPersonCamera.maxDistance,thirdPersonCamera.targetDistance+delta*.012))}
function cameraRelativeInput(x,z,yaw=thirdPersonCamera.yaw){const forward=-z,s=Math.sin(Number.isFinite(yaw)?yaw:thirdPersonCamera.yaw),c=Math.cos(Number.isFinite(yaw)?yaw:thirdPersonCamera.yaw);return {x:-c*x+s*forward,z:s*x+c*forward}}
function updateCamera(dt,x,z,shakeAmount=0){
  const state=thirdPersonCamera,player=localPlayer,s=Math.sin(state.yaw),c=Math.cos(state.yaw),rightX=-c,rightZ=s;
  if(cameraMode==='isometric'){
    tmp.set(player.pos.x,player.pos.y+30,player.pos.z+36);camT.lerp(tmp,1-Math.exp(-dt*8));state.look.lerp(tmp.set(player.pos.x,player.pos.y+1.1,player.pos.z),1-Math.exp(-dt*10));
    cam.position.set(camT.x+rnd(-1,1)*shakeAmount,camT.y+rnd(-1,1)*shakeAmount,camT.z+rnd(-1,1)*shakeAmount);cam.lookAt(state.look);state.roll+=(0-state.roll)*(1-Math.exp(-dt*8));
    state.fov+=(50-state.fov)*(1-Math.exp(-dt*6));cam.fov=state.fov;cam.updateProjectionMatrix();PU.b.value*=Math.exp(-dt*12);updateAimCursor();return;
  }
  state.distance+=(state.targetDistance-state.distance)*(1-Math.exp(-dt*9));
  const speed=Math.hypot(player.vx||0,player.vz||0),motion=Math.min(1,speed/9);
  const bob=Math.sin((player.ph||0)*2)*.1*motion,sideBob=Math.cos((player.ph||0))* .07*motion,lateral=(player.vx*rightX+player.vz*rightZ)/9;
  tmp.set(player.pos.x-s*state.distance+rightX*(.65+sideBob),player.pos.y+3.65+state.distance*.12+bob,player.pos.z-c*state.distance+rightZ*(.65+sideBob));
  camT.lerp(tmp,1-Math.exp(-dt*10));
  const cp=Math.cos(state.pitch),lookDistance=60;
  state.look.set(camT.x+s*cp*lookDistance,camT.y+Math.sin(state.pitch)*lookDistance,camT.z+c*cp*lookDistance);
  cam.position.set(camT.x+rnd(-1,1)*shakeAmount,camT.y+rnd(-1,1)*shakeAmount,camT.z+rnd(-1,1)*shakeAmount);cam.lookAt(state.look);
  state.roll+=(-lateral*.035-Math.sign(state.blurDirection.x)*Math.min(.025,state.turnImpulse*.00018)-state.roll)*(1-Math.exp(-dt*8));cam.rotation.z+=state.roll;
  state.fov+=(58+motion*4-state.fov)*(1-Math.exp(-dt*5));if(Math.abs(cam.fov-state.fov)>.01){cam.fov=state.fov;cam.updateProjectionMatrix()}
  PU.b.value+=(Math.min(1,state.turnImpulse/55)-PU.b.value)*(1-Math.exp(-dt*18));PU.d.value.lerp(state.blurDirection,1-Math.exp(-dt*20));state.turnImpulse*=Math.exp(-dt*8);
  updateAimCursor();
}
function localInput(){const input={keys:{...keys},shoot:mdown,parry:pendingParry,dash:pendingDash,dashHeld:!!(keys.ShiftLeft||keys.ShiftRight||keys.KeyQ),special:pendingSpecial,aim:[aim.x,aimY,aim.z],cameraYaw:cameraMode==='third'?thirdPersonCamera.yaw:Math.PI};pendingParry=false;pendingDash=false;pendingSpecial=false;return input}
function clearInput(){Object.keys(keys).forEach(k=>delete keys[k]);mdown=false;pendingParry=false;pendingDash=false;pendingSpecial=false;netSend({type:'input',input:{keys:{},shoot:false,parry:false,dash:false,dashHeld:false,special:false,aim:[aim.x,aimY,aim.z],cameraYaw:cameraMode==='third'?thirdPersonCamera.yaw:Math.PI}})}
addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput()});
function forEachPlayer(fn){const saved=P;for(const player of players.values())if(player.hp>0){P=player;fn()}P=saved}
const enemyTargets=new WeakMap();
function selectTarget(point,enemy,dt=0){
  const alive=[...players.values()].filter(p=>p.hp>0).sort((a,b)=>a.pos.distanceToSquared(point)-b.pos.distanceToSquared(point));
  if(!alive.length){P=localPlayer;return P}
  if(!enemy){P=alive[0];return P}
  let state=enemyTargets.get(enemy);const current=state&&alive.find(p=>p.id===state.id);
  if(!current){state={id:alive[0].id,time:2+Math.random()*2};enemyTargets.set(enemy,state)}
  else{
    state.time-=dt;
    if(state.time<=0){
      const limit=alive[0].pos.distanceTo(point)*1.8+6;
      const candidates=alive.filter(p=>p.id!==state.id&&p.pos.distanceTo(point)<=limit);
      // Nearby players are more likely targets; give another nearby player a turn.
      if(candidates.length){let total=candidates.reduce((sum,p)=>sum+1/(2+p.pos.distanceTo(point)),0),pick=Math.random()*total;for(const p of candidates){pick-=1/(2+p.pos.distanceTo(point));if(pick<=0){state.id=p.id;break}}}
      else state.id=alive[0].id;
      state.time=2+Math.random()*2;
    }
  }
  P=alive.find(p=>p.id===state.id)||alive[0];return P;
}
function playerDied(){P.hp=0;shatterPlayer(P);if([...players.values()].every(p=>p.hp<=0))finish(false)}
function healTeam(){forEachPlayer(()=>P.hp=Math.min(100,P.hp+50))}
function bossMovementTime(dt){return dt*bossDifficulty.speed/bossDifficulty.attacks}
function advanceBoss(update,dt,point){
  // Separate movement and attack rates; substeps preserve collision/attack windows.
  const total=dt*bossDifficulty.attacks,steps=Math.max(1,Math.ceil(dt*Math.max(bossDifficulty.speed,bossDifficulty.attacks)/.05));
  for(let i=0;i<steps;i++){if(point)selectTarget(point,update===updBoss?B:R,dt/steps);update(total/steps)}
}
function simulatePlayers(dt){
  const savedAim=aim.clone(),savedY=aimY;
  for(const p of players.values()){
    P=p;
    const input=p===localPlayer?localInput():remoteInputs.get(p.id);
    const fresh=input&&(!input.received||performance.now()-input.received<350);
    const active=fresh?input:{keys:{},shoot:false,parry:false,dash:false,dashHeld:false,aim:p.lastAim||[0,1,0]};
    p.lastAim=active.aim;aim.set(active.aim[0],active.aim[1],active.aim[2]);aimY=active.aim[1];
    updatePlayer(dt,active);active.parry=false;active.dash=false;active.special=false;
    if(p.hp<=0)shatterPlayer(p);
  }
  P=localPlayer;aim.copy(savedAim);aimY=savedY;
}
function createPlayer(info,index){
  if(info.id===myId){localPlayer.id=info.id;localPlayer.name=info.name;localPlayer.pos.set((index%4-1.5)*4,0,20+Math.floor(index/4)*4);configureCharacter(localPlayer,info.character,index);players.set(info.id,localPlayer);return}
  const p={...localPlayer,g:new T.Group(),pos:new T.Vector3((index%4-1.5)*4,0,20+Math.floor(index/4)*4),hp:100,
    id:info.id,name:info.name,lastAim:[0,1,0],ring:ring.clone(),meleeRing:null,laserBeam:null,specialEffect:null,combo:null};
  p.ring.traverse(o=>{if(o.material)o.material=o.material.clone()});
  configureCharacter(p,info.character,index);scene.add(p.ring);players.set(info.id,p);
}
function chooseBoss(mode){
  if(started)return;
  if(networkMode==='solo'){
    const scale=Number($('single-difficulty')?.value||1);bossDifficulty={health:scale,speed:scale,attacks:scale};
    localPlayer.name=robotName();localPlayer.id='solo';configureCharacter(localPlayer,selectedCharacter());players.set('solo',localPlayer);begin(mode);return;
  }
  if(!netRoom){status('Crie uma sala ou entre em uma das salas da lista.');return}
  if(!isHost){status('Aguarde o criador escolher o boss e iniciar a partida.');return}
  netSend({type:'start',mode});
}
const MODE_NAMES={0:'Campanha',1:'Centopeia',2:'Esqueletos',3:'Golem Mecânico',4:'Batalha Final',5:'Ettin'};
function showMenuScreen(screen){
  menuScreen=screen;
  $('menu').dataset.screen=screen;
  const screens={main:'main-actions',single:'single-panel',multiplayer:'multiplayer-panel','create-room':'create-room-panel','join-room':'join-room-panel',room:'room-info',instructions:'instructions-panel'};
  for(const id of Object.values(screens))$(id).hidden=id!==screens[screen];
  $('player-setup').hidden=!['single','create-room','join-room','room'].includes(screen);
  $('cards').hidden=screen!=='single';
  $('menu').querySelector(':scope > p').textContent=({main:'ESCOLHA COMO JOGAR',single:'SINGLEPLAYER',multiplayer:'MULTIPLAYER','create-room':'CONFIGURAR SALA','join-room':'ENTRAR EM SALA',room:'SALA DE ESPERA',instructions:'INSTRUÇÕES'})[screen]||'';
}
function setupNetwork(){
  $('menu').querySelector('p').textContent='ESCOLHA SEU ROBÔ E COMO JOGAR';
  const panel=document.createElement('div');panel.id='network-panel';
  panel.innerHTML=`<div class="lan-row"><label for="robot-name">Nome do robô</label><input id="robot-name" maxlength="24" placeholder="Ex.: Titã" autocomplete="off"></div>
    <fieldset id="character-selector"><legend>Escolha seu personagem</legend><div class="character-options">
      <label class="character-choice"><input type="radio" name="character" value="ranger" checked><canvas class="character-preview" data-character="ranger" width="16" height="16" aria-hidden="true"></canvas><strong>Artilheiro</strong><small>Tiros rápidos à distância</small></label>
      <label class="character-choice"><input type="radio" name="character" value="fieldfighter"><canvas class="character-preview" data-character="fieldfighter" width="16" height="16" aria-hidden="true"></canvas><strong>Fieldfighter</strong><small>Combo de 2 golpes massivos em cone</small></label>
    <label class="character-choice"><input type="radio" name="character" value="arachnodroid"><canvas class="character-preview" data-character="arachnodroid" width="16" height="16" aria-hidden="true"></canvas><strong>Arachondroid</strong><small>Laser contínuo · mais lento ao disparar</small></label>
    </div><small>Segure Shift ou Q para usar o boost enquanto houver combustível. Mouse esquerdo ou J para atacar. Você pode trocar de personagem na sala de espera.</small></fieldset>
    <div class="lan-row" style="margin:14px 0"><button class="lan-btn" id="solo-mode">Jogar solo</button><button class="lan-btn" id="group-mode">Jogar em grupo</button></div>
    <div id="group-panel" hidden>
      <div id="room-browser"><div class="lan-row"><input id="room-name" maxlength="24" placeholder="Nome da sala" value="Arena dos amigos"></div>
        <fieldset id="difficulty-settings"><legend>Configuração de dificuldade do boss</legend>
          <div class="difficulty-fields">
            <label>Vida (×)<input id="difficulty-health" type="number" min="0.25" max="10" step="any" value="2" required></label>
            <label>Velocidade (×)<input id="difficulty-speed" type="number" min="0.25" max="10" step="any" value="2" required></label>
            <label>Frequência de ataques (×)<input id="difficulty-attacks" type="number" min="0.25" max="10" step="any" value="2" required></label>
          </div>
          <label class="difficulty-check"><input id="difficulty-per-player" type="checkbox" checked>Multiplicar também pelo número de jogadores</label>
          <small>1× equivale ao boss original. Valores entre 0,25 e 10. Com a opção marcada, 2× e dois jogadores resultam em 4×.</small>
        </fieldset>
        <div class="lan-row"><button class="lan-btn" id="create-room">Criar sala</button><button class="lan-btn" id="refresh-rooms">Atualizar salas</button></div><div id="rooms"></div><p>Todos devem abrir o endereço do mesmo servidor na rede local.</p></div>
      <div id="room-info" hidden><strong id="room-title"></strong><ul id="room-players"></ul><div id="difficulty"></div><div id="waiting-tip"></div><button class="lan-btn" id="leave-room">Sair da sala</button></div>
    </div><div id="net-status" role="status" aria-live="polite"></div>`;
  $('menu').insertBefore(panel,$('cards'));
  const nameRow=$('robot-name').closest('.lan-row'),characterSelector=$('character-selector'),modeRow=$('solo-mode').parentElement;
  modeRow.id='main-actions';modeRow.className='menu-actions';modeRow.removeAttribute('style');
  const decorate=(button,title,detail)=>{button.className='menu-choice';button.replaceChildren(title,Object.assign(document.createElement('small'),{textContent:detail}))};
  decorate($('solo-mode'),'SINGLEPLAYER','Jogue sozinho contra os bosses');decorate($('group-mode'),'MULTIPLAYER','Crie ou entre em uma sala LAN');
  const instructionsButton=document.createElement('button');instructionsButton.id='instructions-mode';decorate(instructionsButton,'INSTRUÇÕES','Controles e objetivo do jogo');modeRow.append(instructionsButton);
  const playerSetup=document.createElement('div');playerSetup.id='player-setup';playerSetup.hidden=true;panel.insertBefore(playerSetup,modeRow);playerSetup.append(nameRow,characterSelector);
  const singlePanel=document.createElement('div');singlePanel.id='single-panel';singlePanel.hidden=true;singlePanel.innerHTML='<label class="difficulty-preset">Dificuldade <select id="single-difficulty"><option value=".75">Fácil</option><option value="1" selected>Normal</option><option value="1.4">Difícil</option><option value="2">Brutal</option></select></label><div id="single-mode-picker"><strong>Escolha o modo</strong></div><button class="lan-btn back-main">Voltar</button>';panel.insertBefore(singlePanel,$('group-panel'));$('single-mode-picker').append($('cards'));
  const multiplayerPanel=document.createElement('div');multiplayerPanel.id='multiplayer-panel';multiplayerPanel.hidden=true;multiplayerPanel.innerHTML='<div class="menu-actions compact"><button class="menu-choice" id="join-room-flow">ENTRAR EM SALA<small>Veja as salas disponíveis</small></button><button class="menu-choice" id="create-room-flow">CRIAR SALA<small>Configure uma nova partida</small></button></div><button class="lan-btn back-main">Voltar</button>';panel.insertBefore(multiplayerPanel,$('group-panel'));
  const roomBrowser=$('room-browser'),roomName=$('room-name').closest('.lan-row'),difficulty=$('difficulty-settings'),rooms=$('rooms'),browserNote=roomBrowser.querySelector(':scope > p');
  const createPanel=document.createElement('div');createPanel.id='create-room-panel';createPanel.hidden=true;createPanel.innerHTML='<label class="room-mode-label">Modo <select id="room-mode">'+Object.entries(MODE_NAMES).map(([value,name])=>'<option value="'+value+'">'+name+'</option>').join('')+'</select></label>';createPanel.prepend(roomName);createPanel.append(difficulty);const createActions=document.createElement('div');createActions.className='lan-row';createActions.append($('create-room'));createActions.insertAdjacentHTML('beforeend','<button class="lan-btn back-multiplayer">Voltar</button>');createPanel.append(createActions);panel.insertBefore(createPanel,$('group-panel'));
  const joinPanel=document.createElement('div');joinPanel.id='join-room-panel';joinPanel.hidden=true;const joinActions=document.createElement('div');joinActions.className='lan-row';joinActions.append($('refresh-rooms'));joinActions.insertAdjacentHTML('beforeend','<button class="lan-btn back-multiplayer">Voltar</button>');joinPanel.append(joinActions,rooms,browserNote);panel.insertBefore(joinPanel,$('group-panel'));
  const roomInfo=$('room-info');roomInfo.insertAdjacentHTML('afterbegin','<div id="room-mode-summary"></div>');$('leave-room').insertAdjacentHTML('beforebegin','<button class="lan-btn" id="start-room">Iniciar partida</button>');panel.insertBefore(roomInfo,$('group-panel'));
  const instructions=document.createElement('div');instructions.id='instructions-panel';instructions.hidden=true;instructions.innerHTML='<div class="instructions-copy"><strong>COMO JOGAR</strong><p>Derrote o boss sem deixar toda a equipe ser abatida.</p><p><b>WASD</b> move · <b>Espaço</b> pula · <b>Mouse/J</b> ataca · <b>F</b> usa o especial · segure <b>Shift/Q</b> para continuar o boost enquanto houver combustível.</p><p><b>P</b> alterna entre câmera isométrica e terceira pessoa.</p><p><b>Botão direito/E</b> ativa o campo de força do parry, protegendo todas as direções durante uma janela curta.</p><p><b>M</b> volta ao menu.</p></div><button class="lan-btn back-main">Voltar</button>';panel.insertBefore(instructions,$('group-panel'));
  $('group-panel').remove();
  $('robot-name').value=localStorage.getItem('arena-robot-name')||'Robô';
  const savedCharacter=localStorage.getItem('arena-character');const preferred=Object.hasOwn(CHARACTERS,savedCharacter)?savedCharacter:'ranger';
  document.querySelector(`input[name="character"][value="${preferred}"]`).checked=true;drawCharacterPreviews();
  document.querySelectorAll('input[name="character"]').forEach(input=>input.onchange=()=>{
    localStorage.setItem('arena-character',selectedCharacter());
    if(netRoom&&!started)netSend({type:'character',character:selectedCharacter()});
  });
  const dash=document.createElement('div');dash.id='dash-status';dash.innerHTML='<span id="boost-label">Combustível</span><span class="boost-track"><i id="boost-fill"></i></span>';document.body.append(dash);
  const special=document.createElement('div');special.id='special-status';document.body.append(special);
  const cameraStatus=document.createElement('div');cameraStatus.id='camera-status';cameraStatus.textContent='Câmera: 3ª pessoa';cameraStatus.hidden=true;document.body.append(cameraStatus);
  const team=document.createElement('div');team.id='team';document.body.append(team);
  const labels=document.createElement('div');labels.id='player-labels';document.body.append(labels);
  const cursor=document.createElement('div');cursor.id='aim-cursor';cursor.hidden=true;cursor.setAttribute('aria-hidden','true');
  cursor.innerHTML='<div class="aim-pulse"><canvas width="24" height="24"></canvas></div>';
  const pixels=cursor.querySelector('canvas').getContext('2d');
  for(const [x,y,w,h]of [[10,2,4,5],[10,17,4,5],[2,10,5,4],[17,10,5,4]]){
    pixels.fillStyle='#07111c';pixels.fillRect(x-1,y-1,w+2,h+2);
    pixels.fillStyle='#fff1bd';pixels.fillRect(x,y,w,h);
    pixels.fillStyle='#ffd84a';pixels.fillRect(x+1,y+1,Math.max(1,w-2),Math.max(1,h-2));
  }
  pixels.fillStyle='#07111c';pixels.fillRect(10,10,4,4);pixels.fillStyle='#ffd84a';pixels.fillRect(11,11,2,2);
  document.body.append(cursor);
  addEventListener('mousemove',()=>{pointerInside=true});
  document.addEventListener('mouseout',e=>{if(!e.relatedTarget){pointerInside=false;cursor.hidden=true}});
  $('solo-mode').onclick=()=>{if(netRoom)netSend({type:'leave'});networkMode='solo';showMenuScreen('single');status('Escolha o modo e a dificuldade.');};
  $('group-mode').onclick=()=>{networkMode='group';showMenuScreen('multiplayer');status('Escolha se deseja entrar em uma sala ou criar uma nova.');connectNetwork()};
  $('instructions-mode').onclick=()=>showMenuScreen('instructions');
  document.querySelectorAll('.back-main').forEach(button=>button.onclick=()=>showMenuScreen('main'));
  document.querySelectorAll('.back-multiplayer').forEach(button=>button.onclick=()=>showMenuScreen('multiplayer'));
  $('create-room-flow').onclick=()=>{showMenuScreen('create-room');connectNetwork()};
  $('join-room-flow').onclick=()=>{showMenuScreen('join-room');connectNetwork();netSend({type:'list'})};
  $('create-room').onclick=()=>{
    const fields=['health','speed','attacks'];
    for(const key of fields)if(!$('difficulty-'+key).reportValidity())return;
    const difficulty=Object.fromEntries(fields.map(key=>[key,$('difficulty-'+key).valueAsNumber]));
    difficulty.perPlayer=$('difficulty-per-player').checked;
    netSend({type:'create',name:robotName(),character:selectedCharacter(),roomName:$('room-name').value,mode:Number($('room-mode').value),difficulty});
  };
  $('refresh-rooms').onclick=()=>{connectNetwork();netSend({type:'list'})};
  $('leave-room').onclick=()=>netSend({type:'leave'});
  $('start-room').onclick=()=>{if(netRoom&&isHost)netSend({type:'start',mode:netRoom.mode})};
  showMenuScreen('main');status('Selecione uma opção.');
}
function connectNetwork(){
  if(netSocket&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(netSocket.readyState))return;
  if(!/^https?:$/.test(location.protocol)){status('Para jogar em rede, execute iniciar-rede.cmd e abra o endereço mostrado no terminal.');return}
  status('Conectando ao servidor da rede…');$('create-room').disabled=true;
  netSocket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);
  netSocket.onopen=()=>{status('Conectado. Crie uma sala ou escolha uma abaixo.');$('create-room').disabled=false};
  netSocket.onerror=()=>status('Não foi possível conectar. Verifique se o servidor está aberto.');
  netSocket.onclose=()=>{if(started&&netRoom){over=true;showNetworkEnd('A conexão com o servidor foi encerrada.')}netRoom=null;isHost=false;$('create-room').disabled=true;status('Conexão encerrada. Clique em Atualizar salas para reconectar.');if(!started)renderRoom()};
  netSocket.onmessage=e=>{
    const msg=JSON.parse(e.data);
    if(msg.type==='welcome')myId=msg.id;
    if(msg.type==='rooms')renderRooms(msg.rooms);
    if(msg.type==='error')status(msg.message);
    if(msg.type==='room'){netRoom=msg.room;isHost=netRoom.host===myId;if(!started)renderRoom()}
    if(msg.type==='left'){netRoom=null;isHost=false;renderRoom();status('Você saiu da sala.')}
    if(msg.type==='closed'){netRoom=null;isHost=false;if(started){over=true;showNetworkEnd(msg.reason)}else renderRoom();status(msg.reason)}
    if(msg.type==='start')startNetworkMatch(msg);
    if(msg.type==='input'&&isHost){const old=remoteInputs.get(msg.id);msg.input.parry=msg.input.parry||old?.parry;msg.input.dash=msg.input.dash||old?.dash;msg.input.special=msg.input.special||old?.special;msg.input.received=performance.now();remoteInputs.set(msg.id,msg.input)}
    if(msg.type==='departed'&&isHost){const p=players.get(msg.id);if(p){scene.remove(p.g,p.ring,p.specialEffect);if(p.meleeRing)scene.remove(p.meleeRing);if(p.laserBeam)scene.remove(p.laserBeam);players.delete(msg.id);remoteInputs.delete(msg.id);if([...players.values()].every(p=>p.hp<=0))finish(false)}}
    if(msg.type==='snapshot'&&!isHost)receiveSnapshot(msg);
  };
}
function renderRooms(rooms){
  const list=$('rooms');list.replaceChildren();
  if(!rooms.length){list.textContent='Nenhuma sala criada. Crie a primeira!';return}
  for(const room of rooms){
    const row=document.createElement('div');row.className='room-row';
    const text=document.createElement('span');text.textContent=`${room.name} · ${room.players.length}/${room.capacity} · ${room.status==='waiting'?'Aguardando':'Em partida'}`;
    const button=document.createElement('button');button.className='lan-btn';button.textContent='Entrar';button.disabled=room.status!=='waiting'||room.players.length>=room.capacity;
    button.onclick=()=>netSend({type:'join',roomId:room.id,name:robotName(),character:selectedCharacter()});row.append(text,button);list.append(row);
  }
}
function renderRoom(){
  if(!netRoom){if(menuScreen==='room')showMenuScreen('multiplayer');return}
  showMenuScreen('room');
  $('room-title').textContent=netRoom.name;$('room-players').replaceChildren();
  $('room-mode-summary').textContent='Modo: '+(MODE_NAMES[netRoom.mode]||'Campanha');
  for(const p of netRoom.players){const li=document.createElement('li');li.textContent=p.name+' · '+characterInfo(p.character).name+(p.id===netRoom.host?' · Criador':'');$('room-players').append(li)}
  const factor=netRoom.difficulty.perPlayer?netRoom.players.length:1;
  const number=value=>value.toLocaleString('pt-BR',{maximumFractionDigits:2});
  const d=netRoom.difficulty;
  $('difficulty').textContent=`Boss: vida ${number(d.health*factor)}× · velocidade ${number(d.speed*factor)}× · ataques ${number(d.attacks*factor)}×. ${d.perPlayer?'Valores multiplicados por '+netRoom.players.length+' jogador(es).':'Valores fixos, independentemente do número de jogadores.'}`;
  $('waiting-tip').textContent=isHost?'Quando todos entrarem, clique em Iniciar partida.':'Aguarde o criador iniciar a partida.';
  $('start-room').hidden=!isHost;
  status('Sala pronta. Compartilhe o endereço do jogo com seus amigos.');
}
function startNetworkMatch(msg){
  netRoom=msg.room;isHost=netRoom.host===myId;bossDifficulty={...msg.multipliers};players.clear();
  clearInput();
  if(isHost){
    B.hp=B.max=2400*bossDifficulty.health;R.hp=R.max=R.max*bossDifficulty.health;
    netRoom.players.forEach(createPlayer);P=localPlayer;begin(netRoom.mode);
  }else{
    // Guest simulations are disabled. The host sends the real animated models.
    B.segs.forEach(s=>scene.remove(s.root));scene.remove(localPlayer.g,ring,beam,rg);
    const mine=netRoom.players.find(p=>p.id===myId);localPlayer.id=myId;localPlayer.name=mine.name;localPlayer.character=mine.character;
    guestOnly=true;started=true;MODE=netRoom.mode;$('menu').style.display='none';resetThirdPersonCamera(localPlayer.face);
  }
  updateControls();
  document.title=`${netRoom.name} · Centipede Arena`;
}
function showNetworkEnd(message){$('msg').replaceChildren();const text=document.createElement('div');text.textContent=message;const help=document.createElement('small');help.textContent='Pressione M para voltar ao menu e criar ou entrar em outra sala.';$('msg').append(text,help);$('msg').style.display='flex'}
function dynamicRoots(){return [
  ...[...players.values()].flatMap(p=>[{object:p.g,kind:'player',id:p.id},{object:p.ring,kind:'effect'},{object:p.specialEffect,kind:'effect',id:p.id},...(p.meleeRing?[{object:p.meleeRing,kind:'effect',id:p.id}]:[]),...(p.laserBeam?[{object:p.laserBeam,kind:'effect',id:p.id}]:[])]),
  ...B.segs.map(s=>({object:s.root,kind:'enemy'})),{object:beam,kind:'effect'},{object:burrowDust,kind:'effect'},
  ...(R.on?[{object:rg,kind:'enemy'}]:[]),
  ...(E.on?[{object:eg,kind:'enemy'},{object:ettinWarning,kind:'effect'},{object:ettinCone,kind:'effect'},{object:ettinEffects,kind:'effect'}]:[]),
  ...A.u.map(u=>({object:u.g,kind:'enemy'})),...flyers.map(f=>({object:f.g,kind:'enemy'})),
  ...bullets.map(b=>({object:b.m,kind:'bullet'})),...EP.map(p=>({object:p.m,kind:'bullet'})),...specialMissiles.map(p=>({object:p.m,kind:'bullet',id:p.m.userData.owner})),...deathFragments.map(p=>({object:p.m,kind:'debris',id:p.m.userData.owner}))
].filter(root=>root.object.parent===scene)}
function publishSnapshot(){
  if(!netRoom||!isHost||netSocket?.readyState!==WebSocket.OPEN||performance.now()-lastSnapshot<50)return;
  if(netSocket.bufferedAmount>2*1024*1024)return;
  lastSnapshot=performance.now();
  const roots=dynamicRoots(),added=[],transforms=[];
  const ids=new Set(roots.map(r=>r.object.uuid));
  const removed=[...sentRoots].filter(id=>!ids.has(id));removed.forEach(id=>{sentRoots.delete(id);sentTransforms.delete(id)});
  for(const root of roots){
    if(!sentRoots.has(root.object.uuid)){
      const json=root.object.toJSON();
      // Robot clones and bullets share geometry: transmit each resource only once.
      json.geometries=(json.geometries||[]).filter(g=>{if(sentGeometries.has(g.uuid))return false;sentGeometries.add(g.uuid);return true});
      json.materials=(json.materials||[]).filter(m=>{if(sentMaterials.has(m.uuid))return false;sentMaterials.add(m.uuid);return true});
      added.push({key:root.object.uuid,kind:root.kind,id:root.id,json});sentRoots.add(root.object.uuid);
    }
    const nodes=[],previous=sentTransforms.get(root.object.uuid)||[];let nodeIndex=0;
    root.object.traverse(o=>{
      const material=o.material&&!Array.isArray(o.material)?o.material:null;
      const values=[...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].map(v=>Math.round(v*10000)/10000);
      values.push(o.visible?1:0,material?.color?.getHex()??null,material?.emissive?.getHex()??null,material?.opacity??null);
      const signature=JSON.stringify(values);
      if(previous[nodeIndex]!==signature){nodes.push([nodeIndex,values]);previous[nodeIndex]=signature}
      nodeIndex++;
    });sentTransforms.set(root.object.uuid,previous);if(nodes.length)transforms.push([root.object.uuid,nodes]);
  }
  netSend({type:'snapshot',added,removed,transforms,players:[...players.values()].map(p=>({id:p.id,name:p.name,character:p.character,hp:Math.max(0,p.hp),dashCooldown:p.dashCooldown||0,dashFuel:p.dashFuel??100,boosting:!!p.boosting,specialCooldown:p.specialCooldown||0,pos:p.pos.toArray()})),
    ettin:{active:E.on&&!E.dead,rage:E.rage,enraged:E.enraged},arenaRadius,finalEncounter,boss:{title:$('bt').textContent,color:$('bb').style.background,percent:finalEncounter?updateFinalHUD():E.on?E.hp/E.max*100:R.on?R.hp/R.max*100:A.on?(1-A.killed/A.total)*100:B.hp/B.max*100},over,won:matchWon});
}
// Resources stay cached for the match: future bullets can reuse them after removal.
function disposeReplica(root){scene.remove(root.object)}
function receiveSnapshot(msg){
  renderEttinRage(!!msg.ettin?.active,msg.ettin?.rage||0,!!msg.ettin?.enraged);
  if(msg.arenaRadius&&msg.arenaRadius!==arenaRadius)configureArena(msg.arenaRadius);finalEncounter=!!msg.finalEncounter;
  for(const id of msg.removed){const root=replicas.get(id);if(root){disposeReplica(root);replicas.delete(id)}}
  for(const entry of msg.added){
    Object.assign(guestGeometries,objectLoader.parseGeometries(entry.json.geometries));
    Object.assign(guestMaterials,objectLoader.parseMaterials(entry.json.materials,{}));
    const object=objectLoader.parseObject(entry.json.object,guestGeometries,guestMaterials),nodes=[];
    object.traverse(o=>nodes.push(o));scene.add(object);replicas.set(entry.key,{object,nodes,kind:entry.kind,id:entry.id});
  }
  for(const [id,changes]of msg.transforms){const root=replicas.get(id);if(!root)continue;
    root.target=root.target||[];
    for(const [i,v]of changes){const o=root.nodes[i];if(!o)continue;root.target[i]=v;o.visible=!!v[10];if(o.material&&!Array.isArray(o.material)){if(v[11]!==null)o.material.color?.setHex(v[11]);if(v[12]!==null)o.material.emissive?.setHex(v[12]);if(v[13]!==null)o.material.opacity=v[13]}}
  }
  lastState=msg;const mine=msg.players.find(p=>p.id===myId);if(mine){localPlayer.hp=mine.hp;localPlayer.dashCooldown=mine.dashCooldown;localPlayer.dashFuel=mine.dashFuel;localPlayer.boosting=mine.boosting;localPlayer.specialCooldown=mine.specialCooldown;localPlayer.pos.fromArray(mine.pos)}
  $('bt').textContent=msg.boss.title;$('bb').style.background=msg.boss.color;$('bb').style.width=msg.boss.percent+'%';$('hb').style.width=Math.max(0,localPlayer.hp)+'%';
  if(msg.over&&!over){over=true;showNetworkEnd(msg.won?'🏆 A equipe venceu!':'💀 Equipe derrotada')}
}
const netQuaternion=new T.Quaternion(),netVector=new T.Vector3();
function guestFrame(dt){
  const blend=Math.min(1,dt*25);
  for(const root of replicas.values())if(root.target)root.nodes.forEach((o,i)=>{const v=root.target[i];if(!v)return;o.position.lerp(netVector.fromArray(v),blend);o.quaternion.slerp(netQuaternion.fromArray(v,3),blend);o.scale.lerp(netVector.fromArray(v,7),blend)});
  ray.setFromCamera(cameraAimPoint(),cam);const targets=[...replicas.values()].filter(r=>r.kind==='enemy').map(r=>r.object).filter(o=>o.visible);
  const hit=ray.intersectObjects(targets,true).find(h=>h.object.material?.opacity!==.5);
  if(hit)aim.copy(hit.point);else if(cameraMode==='isometric'&&ray.ray.intersectPlane(plane,tmp))aim.copy(tmp);else aim.copy(ray.ray.direction).multiplyScalar(70).add(ray.ray.origin);aimY=aim.y;
  if(netRoom&&!over&&performance.now()-lastInput>=33){lastInput=performance.now();netSend({type:'input',input:localInput()})}
  updateCamera(dt,localPlayer.pos.x,localPlayer.pos.z);
  updateTeamUI();WT.value=performance.now()/1000;grassSystem.update(dt,lastState?.players||[]);ren.setRenderTarget(rt);ren.render(scene,cam);ren.setRenderTarget(null);ren.render(pS,pC);
}
let lastTeamUI=0;
function updateTeamUI(){
  $('camera-status').hidden=!started||over;
  $('special-status').hidden=!started||over;const info=SPECIALS[localPlayer.character];$('special-status').textContent=localPlayer.hp<=0?'Especial indisponível':info.name+' · '+(localPlayer.specialCooldown>0?localPlayer.specialCooldown.toFixed(1)+'s':'Pronto · F');
  $('dash-status').hidden=!started||over;const fuel=Math.max(0,localPlayer.dashFuel??100);$('boost-label').textContent=localPlayer.hp<=0?'Boost indisponível':(localPlayer.boosting?'BOOST · '+Math.ceil(fuel)+'%':'Combustível · '+Math.ceil(fuel)+'%');$('boost-fill').style.width=fuel+'%';$('boost-fill').classList.toggle('active',!!localPlayer.boosting);
  const team=isHost||!netRoom?[...players.values()]:lastState?.players||[];
  if(performance.now()-lastTeamUI>150){lastTeamUI=performance.now();$('team').replaceChildren();for(const p of team){const row=document.createElement('div');row.textContent=`${p.name}${p.id===localPlayer.id?' (você)':''} · ${characterInfo(p.character).name} · ${Math.max(0,Math.ceil(p.hp))}/100${p.hp<=0?' · abatido':''}`;$('team').append(row)}}
  const labelContainer=$('player-labels');
  const liveIds=new Set();
  for(const p of team){
    liveIds.add(p.id);let label=[...labelContainer.children].find(e=>e.dataset.id===p.id);
    if(!label){label=document.createElement('div');label.className='player-label';label.dataset.id=p.id;labelContainer.append(label)}
    label.textContent=p.name;
    const pos=p.pos instanceof T.Vector3?p.pos.clone():new T.Vector3().fromArray(p.pos);pos.y+=3.4;pos.project(cam);
    label.hidden=pos.z>1||pos.z< -1;label.style.left=(pos.x*.5+.5)*innerWidth+'px';label.style.top=(-pos.y*.5+.5)*innerHeight+'px';
  }
  for(const label of [...labelContainer.children])if(!liveIds.has(label.dataset.id))label.remove();
}
