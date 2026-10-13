const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { WebSocket } = require('ws');
const { createArenaServer } = require('../server');
let arena,url;
before(async()=>{arena=createArenaServer();await new Promise(r=>arena.server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${arena.server.address().port}`});
after(async()=>arena.close());
async function client(){
  const ws=new WebSocket(url.replace('http','ws')+'/ws');const queue=[],waiters=[];
  ws.on('message',data=>{const msg=JSON.parse(data);const i=waiters.findIndex(w=>w.type===msg.type);if(i>=0){const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(msg)}else queue.push(msg)});
  ws.next=type=>new Promise((resolve,reject)=>{const i=queue.findIndex(m=>m.type===type);if(i>=0)return resolve(queue.splice(i,1)[0]);const w={type,resolve,timer:setTimeout(()=>reject(Error('Timeout: '+type)),3000)};waiters.push(w)});
  ws.sendMessage=msg=>ws.send(JSON.stringify(msg));
  ws.id=(await ws.next('welcome')).id;return ws;
}
test('HTTP serves the game and local assets without exposing workspace files',async()=>{
  assert.equal((await fetch(url)).status,200);
  assert.equal((await fetch(url+'/vendor/three.min.js')).status,200);
  assert.equal((await fetch(url+'/personagem/arachnodroid-model.js')).status,200);
  assert.equal((await fetch(url+'/specials.js')).status,200);
  assert.equal((await fetch(url+'/final-arena.js')).status,200);
  assert.equal((await fetch(url+'/death-physics.js')).status,200);
  assert.equal((await fetch(url+'/server.js')).status,404);
  assert.equal((await fetch(url+'/package.json')).status,404);
});
test('rooms, authority, shared state, departure and frozen difficulty',async()=>{
  const host=await client(),guest=await client(),observer=await client();
  host.sendMessage({type:'create',name:'Titã',roomName:'Amigos'});
  const room=(await host.next('room')).room;assert.equal(room.players.length,1);
  observer.sendMessage({type:'list'});
  let listings=await observer.next('rooms');
  while(!listings.rooms.some(r=>r.id===room.id))listings=await observer.next('rooms');
  guest.sendMessage({type:'join',name:'Atlas',roomId:room.id});
  assert.equal((await guest.next('room')).room.players.length,2);
  guest.sendMessage({type:'start',mode:1});assert.match((await guest.next('error')).message,/criador/);
  host.sendMessage({type:'start',mode:1});
  const start=await guest.next('start');assert.deepEqual(start.multipliers,{health:4,speed:4,attacks:4});
  host.sendMessage({type:'snapshot',added:[],transforms:[],players:[{id:guest.id,hp:77}]});
  assert.equal((await guest.next('snapshot')).players[0].hp,77);
  guest.sendMessage({type:'input',input:{keys:{KeyW:true,unexpected:true},shoot:true,parry:true,dash:true,special:true,aim:[1,2,3]}});
  const input=await host.next('input');assert.equal(input.id,guest.id);assert.equal(input.input.keys.KeyW,true);assert.equal(input.input.keys.unexpected,undefined);
  assert.equal(input.input.dash,true);
  assert.equal(input.input.special,true);
  observer.sendMessage({type:'join',roomId:room.id,name:'Tarde'});assert.match((await observer.next('error')).message,/começou/);
  guest.close();assert.equal((await host.next('departed')).id,guest.id);assert.deepEqual(arena.rooms.get(room.id).multipliers,{health:4,speed:4,attacks:4});
  host.close();observer.close();
});
test('closing the creator removes the room and informs remaining players',async()=>{
  const host=await client(),guest=await client();
  host.sendMessage({type:'create',name:'Host'});const room=(await host.next('room')).room;
  guest.sendMessage({type:'join',roomId:room.id,name:'Guest'});await guest.next('room');
  host.close();assert.match((await guest.next('closed')).reason,/criador/);
  assert.equal(arena.rooms.has(room.id),false);guest.close();
});
test('custom difficulty is validated, shared and fixed or scaled by player count',async()=>{
  for(const perPlayer of [false,true]){
    const host=await client(),guest=await client();
    const difficulty={health:3,speed:.5,attacks:1.25,perPlayer};
    for(const invalid of [{...difficulty,speed:0},{...difficulty,attacks:11},{...difficulty,health:'3'},{...difficulty,perPlayer:'yes'}]){
      host.sendMessage({type:'create',difficulty:invalid});assert.match((await host.next('error')).message,/multiplicadores/);
    }
    host.sendMessage({type:'create',difficulty});const room=(await host.next('room')).room;
    assert.deepEqual(room.difficulty,difficulty);
    guest.sendMessage({type:'join',roomId:room.id});assert.deepEqual((await guest.next('room')).room.difficulty,difficulty);
    host.sendMessage({type:'start',mode:3});const start=await guest.next('start');
    const factor=perPlayer?2:1;assert.deepEqual(start.multipliers,{health:3*factor,speed:.5*factor,attacks:1.25*factor});
    guest.close();await host.next('departed');assert.deepEqual(arena.rooms.get(room.id).multipliers,start.multipliers);
    host.close();
  }
});
test('character choices are shared, changeable in the lobby and frozen for the match',async()=>{
  const host=await client(),guest=await client();
  host.sendMessage({type:'create',character:'unknown'});const room=(await host.next('room')).room;
  assert.equal(room.players[0].character,'ranger');
  guest.sendMessage({type:'join',roomId:room.id,character:'fieldfighter'});
  assert.equal((await guest.next('room')).room.players.find(p=>p.id===guest.id).character,'fieldfighter');
  guest.sendMessage({type:'character',character:'ranger'});
  assert.equal((await guest.next('room')).room.players.find(p=>p.id===guest.id).character,'ranger');
  guest.sendMessage({type:'character',character:'invalid'});assert.match((await guest.next('error')).message,/inválido/);
  guest.sendMessage({type:'character',character:'arachnodroid'});
  assert.equal((await guest.next('room')).room.players.find(p=>p.id===guest.id).character,'arachnodroid');
  guest.sendMessage({type:'character',character:'fieldfighter'});await guest.next('room');
  host.sendMessage({type:'start',mode:2});const start=await guest.next('start');
  assert.equal(start.room.players.find(p=>p.id===guest.id).character,'fieldfighter');
  guest.sendMessage({type:'character',character:'ranger'});assert.match((await guest.next('error')).message,/antes da partida/);
  host.close();guest.close();
});
