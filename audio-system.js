const gameAudio={
  inferno:Object.assign(new Audio('/audio/the-outsider-apocalypse-mix.mp3'),{loop:true,preload:'auto',volume:.32}),
  golemSpawn:Object.assign(new Audio('/audio/spawn-gollen.mp3'),{preload:'auto',volume:.72}),
  golemGun:Object.assign(new Audio('/audio/fire-minigun.mp3'),{loop:false,preload:'auto',volume:1}),
  playerGun:Object.assign(new Audio('/audio/fire-minigun.mp3'),{loop:false,preload:'auto',volume:1})
};
const GUN_LOOP_SECONDS=2;
const GameAudioContext=window.AudioContext||window.webkitAudioContext;
let audioContext=null;
function makeSpatialGun(audio,volume,refDistance,maxDistance){
  if(!GameAudioContext)return{audio,panner:null,gain:null,volume};
  audioContext=audioContext||new GameAudioContext();const source=audioContext.createMediaElementSource(audio),panner=audioContext.createPanner(),gain=audioContext.createGain();
  panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=refDistance;panner.maxDistance=maxDistance;panner.rolloffFactor=1.25;gain.gain.value=volume;source.connect(panner).connect(gain).connect(audioContext.destination);return{audio,panner,gain,volume};
}
const spatialGuns={golem:makeSpatialGun(gameAudio.golemGun,.62,8,150),player:makeSpatialGun(gameAudio.playerGun,.48,5,100)};
let heardGolemSpawn=0;
function resumeAudioContext(){if(audioContext?.state==='suspended')audioContext.resume().catch(()=>{})}
function safeAudioPlay(audio){resumeAudioContext();if(audio.paused)audio.play().catch(()=>{})}
function setAudioLoop(audio,active){if(active)safeAudioPlay(audio);else if(!audio.paused){audio.pause();audio.currentTime=0}}
function setPannerPosition(panner,position){if(!panner||!position)return;const now=audioContext.currentTime,x=position.x??position[0]??0,y=position.y??position[1]??0,z=position.z??position[2]??0;if(panner.positionX){panner.positionX.setValueAtTime(x,now);panner.positionY.setValueAtTime(y,now);panner.positionZ.setValueAtTime(z,now)}else panner.setPosition(x,y,z)}
function updateAudioListener(){
  if(!audioContext)return;const listener=audioContext.listener,direction=new T.Vector3();cam.getWorldDirection(direction);const now=audioContext.currentTime;
  if(listener.positionX){listener.positionX.setValueAtTime(cam.position.x,now);listener.positionY.setValueAtTime(cam.position.y,now);listener.positionZ.setValueAtTime(cam.position.z,now);listener.forwardX.setValueAtTime(direction.x,now);listener.forwardY.setValueAtTime(direction.y,now);listener.forwardZ.setValueAtTime(direction.z,now);listener.upX.setValueAtTime(cam.up.x,now);listener.upY.setValueAtTime(cam.up.y,now);listener.upZ.setValueAtTime(cam.up.z,now)}
  else{listener.setPosition(cam.position.x,cam.position.y,cam.position.z);listener.setOrientation(direction.x,direction.y,direction.z,cam.up.x,cam.up.y,cam.up.z)}
}
function setSpatialGun(channel,active,position){
  const audio=channel.audio;setPannerPosition(channel.panner,position);
  if(active){if(audio.currentTime>=GUN_LOOP_SECONDS||audio.ended)audio.currentTime=0;safeAudioPlay(audio)}
  else if(!audio.paused||audio.currentTime){audio.pause();audio.currentTime=0}
}
function playGolemSpawnSound(){gameAudio.golemSpawn.currentTime=0;safeAudioPlay(gameAudio.golemSpawn)}
function syncGolemSpawnSound(serial){if(!serial||serial<=heardGolemSpawn)return;heardGolemSpawn=serial;playGolemSpawnSound()}
function startInfernoMusic(){if(gameAudio.inferno.ended)gameAudio.inferno.currentTime=0;safeAudioPlay(gameAudio.inferno)}
function updateCombatAudio(){
  const active=started&&!paused&&!over;setAudioLoop(gameAudio.inferno,active&&infernoMode);updateAudioListener();
  const remoteGuest=guestOnly&&lastState,golemFiring=remoteGuest?!!lastState.golemMinigun:R.on&&!R.dead&&R.state==='mg'&&R.st>.8&&R.st<3.6;
  const firingPlayers=remoteGuest?lastState.players.filter(player=>player.minigunFiring):[...players.values()].filter(player=>player.minigunFiring&&player.hp>0),playerSource=firingPlayers.sort((a,b)=>{const ap=a.pos?.x===undefined?a.pos:a.pos.toArray(),bp=b.pos?.x===undefined?b.pos:b.pos.toArray();return Math.hypot((ap[0]||0)-cam.position.x,(ap[2]||0)-cam.position.z)-Math.hypot((bp[0]||0)-cam.position.x,(bp[2]||0)-cam.position.z)})[0],playerPosition=playerSource&&(playerSource.pos?.x===undefined?playerSource.pos:playerSource.pos.toArray());
  setSpatialGun(spatialGuns.golem,active&&golemFiring,rg.position);setSpatialGun(spatialGuns.player,active&&!!playerSource,playerPosition);
}
