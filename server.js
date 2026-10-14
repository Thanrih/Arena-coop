const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');

function createArenaServer() {
  const rooms = new Map();
  const files = {
    '/': ['Centipede Arena (1).html', 'text/html; charset=utf-8'],
    '/Centipede Arena (1).html': ['Centipede Arena (1).html', 'text/html; charset=utf-8'],
    '/multiplayer.js': ['multiplayer.js', 'text/javascript; charset=utf-8'],
    '/characters.js': ['characters.js', 'text/javascript; charset=utf-8'],
    '/specials.js': ['specials.js', 'text/javascript; charset=utf-8'],
    '/ettin.js': ['ettin.js', 'text/javascript; charset=utf-8'],
    '/grass-system.js': ['grass-system.js', 'text/javascript; charset=utf-8'],
    '/inferno-world.js': ['inferno-world.js', 'text/javascript; charset=utf-8'],
    '/audio-system.js': ['audio-system.js', 'text/javascript; charset=utf-8'],
    '/audio/fire-minigun.mp3': ['audio/fire-minigun.mp3', 'audio/mpeg'],
    '/audio/spawn-gollen.mp3': ['audio/spawn-gollen.mp3', 'audio/mpeg'],
    '/audio/the-outsider-apocalypse-mix.mp3': ['audio/the-outsider-apocalypse-mix.mp3', 'audio/mpeg'],
    '/personagem/ettin-model.js': ['personagem/ettin-model.js', 'text/javascript; charset=utf-8'],
    '/final-arena.js': ['final-arena.js', 'text/javascript; charset=utf-8'],
    '/death-physics.js': ['death-physics.js', 'text/javascript; charset=utf-8'],
    '/personagem/arachnodroid-model.js': ['personagem/arachnodroid-model.js', 'text/javascript; charset=utf-8'],
    '/personagem/fieldfighter-model.js': ['personagem/fieldfighter-model.js', 'text/javascript; charset=utf-8'],
    '/network.css': ['network.css', 'text/css; charset=utf-8'],
    '/assets/menu-forest.png': ['assets/menu-forest.png', 'image/png'],
    '/vendor/three.min.js': ['node_modules/three/build/three.min.js', 'text/javascript; charset=utf-8']
  };
  const server = http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    let file = files[pathname];
    // Root gameplay modules are safe to add without requiring a server restart
    // merely to register another script in this table.
    if(!file&&/^\/[a-z0-9-]+\.js$/i.test(pathname)&&!['/server.js'].includes(pathname))file=[pathname.slice(1),'text/javascript; charset=utf-8'];
    if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404).end(); return; }
    fs.readFile(path.join(__dirname, file[0]), (err, data) => {
      if (err) { res.writeHead(500).end('Arquivo indisponível. Execute npm install.'); return; }
      res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    // Browsers must connect through the same LAN server that served the game.
    let originAllowed = true;
    try { if (req.headers.origin) originAllowed = new URL(req.headers.origin).host === req.headers.host; }
    catch { originAllowed = false; }
    if (req.url !== '/ws' || !originAllowed) {
      socket.destroy(); return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  const send = (ws, message) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };
  const broadcast = (room, message, except) => {
    for (const ws of room.players.values()) if (ws !== except) send(ws, message);
  };
  const roster = room => ({ id: room.id, name: room.name, host: room.host, mode: room.mode,
    status: room.status, difficulty: room.difficulty, multipliers: room.multipliers,
    players: [...room.players.values()].map(ws => ({ id: ws.id, name: ws.name, character: ws.character })) });
  const list = () => [...rooms.values()].map(room => ({ ...roster(room), capacity: 8 }));
  const publish = () => { for (const ws of wss.clients) send(ws, { type: 'rooms', rooms: list() }); };
  function leave(ws) {
    const room = rooms.get(ws.roomId);
    ws.roomId = null;
    if (!room) return;
    room.players.delete(ws.id);
    if (room.host === ws.id) {
      broadcast(room, { type: 'closed', reason: 'O criador saiu. A sala foi encerrada.' });
      for (const peer of room.players.values()) peer.roomId = null;
      rooms.delete(room.id);
    } else {
      broadcast(room, { type: 'room', room: roster(room) });
      send(room.players.get(room.host), { type: 'departed', id: ws.id });
    }
    publish();
  }
  const clean = (value, fallback) => typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || fallback : fallback;
  wss.on('connection', ws => {
    ws.id = randomUUID(); ws.roomId = null; ws.alive = true;
    ws.on('pong', () => ws.alive = true);
    ws.on('error', () => {});
    send(ws, { type: 'welcome', id: ws.id });
    send(ws, { type: 'rooms', rooms: list() });
    ws.on('message', raw => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return send(ws, { type: 'error', message: 'Mensagem inválida.' }); }
      if (!msg || typeof msg !== 'object') return;
      const room = rooms.get(ws.roomId);
      const error = message => send(ws, { type: 'error', message });
      if (msg.type === 'list') return send(ws, { type: 'rooms', rooms: list() });
      if (msg.type === 'leave') { leave(ws); return send(ws, { type: 'left' }); }
      if (msg.type === 'create') {
        if (room) return error('Saia da sala atual primeiro.');
        if (rooms.size >= 32) return error('Limite de salas atingido.');
        const difficulty = msg.difficulty === undefined
          ? { health: 2, speed: 2, attacks: 2, perPlayer: true } : msg.difficulty;
        if (!difficulty || typeof difficulty !== 'object' || Array.isArray(difficulty) ||
          typeof difficulty.perPlayer !== 'boolean' ||
          !['health', 'speed', 'attacks'].every(key => typeof difficulty[key] === 'number' &&
            Number.isFinite(difficulty[key]) && difficulty[key] >= .25 && difficulty[key] <= 10)) {
          return error('Os multiplicadores de dificuldade devem ser números entre 0,25 e 10.');
        }
        ws.name = clean(msg.name, 'Robô');
        ws.character = ['ranger','fieldfighter','arachnodroid'].includes(msg.character) ? msg.character : 'ranger';
        const mode = [0, 1, 2, 3, 4, 5, 6].includes(msg.mode) ? msg.mode : 0;
        const next = { id: randomUUID(), name: clean(msg.roomName, 'Arena dos amigos'), host: ws.id,
          difficulty: { health: difficulty.health, speed: difficulty.speed,
            attacks: difficulty.attacks, perPlayer: difficulty.perPlayer },
          mode, status: 'waiting', players: new Map([[ws.id, ws]]) };
        rooms.set(next.id, next); ws.roomId = next.id;
        send(ws, { type: 'room', room: roster(next) }); publish(); return;
      }
      if (msg.type === 'join') {
        if (room) return error('Saia da sala atual primeiro.');
        const next = rooms.get(msg.roomId);
        if (!next) return error('Esta sala já foi encerrada.');
        if (next.status !== 'waiting') return error('Esta partida já começou.');
        if (next.players.size >= 8) return error('A sala está cheia.');
        ws.name = clean(msg.name, 'Robô'); ws.character = ['ranger','fieldfighter','arachnodroid'].includes(msg.character) ? msg.character : 'ranger';
        ws.roomId = next.id; next.players.set(ws.id, ws);
        broadcast(next, { type: 'room', room: roster(next) }); publish(); return;
      }
      if (!room) return error('Entre em uma sala primeiro.');
      if (msg.type === 'character') {
        if (room.status !== 'waiting') return error('O personagem só pode ser alterado antes da partida.');
        if (!['ranger', 'fieldfighter', 'arachnodroid'].includes(msg.character)) return error('Personagem inválido.');
        ws.character = msg.character;
        broadcast(room, { type: 'room', room: roster(room) }); publish(); return;
      }
      if (msg.type === 'start') {
        if (room.host !== ws.id || room.status !== 'waiting') return error('Apenas o criador pode iniciar.');
        if (![0, 1, 2, 3, 4, 5, 6].includes(msg.mode)) return error('Boss inválido.');
        room.mode = msg.mode; room.status = 'playing';
        // Difficulty is frozen for this match, even if someone disconnects.
        const factor = room.difficulty.perPlayer ? room.players.size : 1;
        room.multipliers = Object.fromEntries(['health', 'speed', 'attacks'].map(key =>
          [key, room.difficulty[key] * factor]));
        broadcast(room, { type: 'start', room: roster(room), multipliers: room.multipliers }); publish(); return;
      }
      if (room.status !== 'playing') return;
      if (msg.type === 'input' && ws.id !== room.host) {
        const input = msg.input;
        if (!input || !Array.isArray(input.aim) || input.aim.length !== 3 ||
          !input.aim.every(n => Number.isFinite(n) && Math.abs(n) < 200)) return;
        const allowed = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyJ'];
        const keys = Object.fromEntries(allowed.map(k => [k, !!input.keys?.[k]]));
        const cameraYaw = Number.isFinite(input.cameraYaw) && Math.abs(input.cameraYaw) < 1000 ? input.cameraYaw : 0;
        send(room.players.get(room.host), { type: 'input', id: ws.id,
          input: { keys, aim: input.aim, cameraYaw, shoot: !!input.shoot, parry: !!input.parry, dash: !!input.dash, dashHeld: !!input.dashHeld, special: !!input.special } });
      }
      if (msg.type === 'snapshot' && ws.id === room.host) {
        // Ordered reliable messages preserve object creation/removal before transform updates.
        for (const peer of room.players.values()) if (peer !== ws) {
          if (peer.bufferedAmount > 8 * 1024 * 1024) peer.close(1013, 'Conexão lenta');
          else send(peer, msg);
        }
      }
    });
    ws.on('close', () => leave(ws));
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, 10000);
  heartbeat.unref();
  return { server, rooms, close: () => new Promise(resolve => {
    clearInterval(heartbeat);
    for (const ws of wss.clients) ws.terminate();
    wss.close(() => server.close(resolve));
  }) };
}
if (require.main === module) {
  const arena = createArenaServer();
  const port = Number(process.env.PORT || 3000);
  arena.server.on('error', err => {
    console.error(err.code === 'EADDRINUSE' ? `Porta ${port} ocupada. Feche o outro servidor ou defina PORT.` : err.message);
    process.exitCode = 1;
  });
  arena.server.listen(port, '0.0.0.0', () => {
    console.log(`\nCentipede Arena: http://localhost:${port}`);
    for (const entries of Object.values(os.networkInterfaces())) for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) console.log(`Amigos na mesma rede: http://${entry.address}:${port}`);
    }
    console.log('Mantenha este terminal aberto. Ctrl+C encerra o servidor.\n');
  });
}
module.exports = { createArenaServer };
