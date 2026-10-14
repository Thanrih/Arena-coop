const CHARACTERS = {
  ranger: { name: 'Artilheiro', description: 'Tiros rápidos à distância', interval: .13 },
  fieldfighter: { name: 'Fieldfighter', description: 'Combo de 3 golpes massivos em cone', interval: 1.45, radius: 4.8 },
  arachnodroid: { name: 'Arachondroid', description: 'Laser contínuo · mais lento ao disparar', interval: .22 }
};
const GLIDE_DURATION = 1.2, GLIDE_GRAVITY = 6, GLIDE_FALL_CAP = 2.2, GLIDE_SPEED = 11;
// ---- Combo de 3 hits do Fieldfighter (referência: antecipação → contato → finalização)
// at: instante do impacto · aim: quando a direção é reavaliada · damage: multiplicador do dano base
// fx: duração do rastro · y/tilt/roll/sweep: posição e giro do rastro luminoso
const FIELD_COMBO = [
  { at: .16, aim: 0, damage: .75, radius: 3.8, half: Math.PI * .25, shake: .45, lunge: .5, push: .5, inv: .15, fx: .2, y: 1.3, tilt: [0, 0], roll: 0, sweep: [-.9, .9], color: 0xffb83e },
  { at: .5, aim: .3, damage: 1, radius: 4.8, half: Math.PI * .4, shake: .8, lunge: .7, push: .8, inv: .15, fx: .24, y: 1.4, tilt: [0, 0], roll: .55, sweep: [.9, -.9], color: 0xffd27a },
  { at: 1, aim: .64, damage: 1.5, radius: 5.6, half: Math.PI * .33, shake: 1.5, lunge: 1.1, push: 2, inv: .3, fx: .4, y: 1.6, tilt: [-1, .35], roll: Math.PI / 2, sweep: [0, 0], color: 0xfff0c0 }
];
const FIELD_COMBO_END = 1.4;
// Poses: [braçoL x, braçoL z, braçoR x, braçoR z, giro Y, inclinação X, inclinação Z, altura, perna L, perna R]
const FC_N = [-.25, -.15, -.25, .15, 0, 0, 0, 0, 0, 0];
const FC_A1 = [.6, -1.1, -.9, .35, -.6, .06, 0, 0, .35, -.3], FC_C1 = [-1.55, -.25, -.7, .3, .6, .18, -.05, 0, -.3, .3], FC_F1 = [-1.1, -.3, -.6, .3, .35, .1, 0, 0, -.15, .15];
const FC_A2 = [-.7, -.3, .55, 1.15, .65, .08, 0, 0, -.3, .35], FC_C2 = [-.6, -.3, -1.55, .25, -.65, .2, .05, 0, .3, -.3], FC_F2 = [-.5, -.3, -1.1, .3, -.4, .1, 0, 0, .15, -.15];
const FC_A3 = [-3, -.35, -3, .35, 0, -.3, 0, .3, -.35, .3], FC_C3 = [-.35, -.25, -.35, .25, 0, .6, 0, -.1, -.55, .5], FC_C3B = [-.2, -.2, -.2, .2, 0, .5, 0, -.1, -.5, .5];
// [tempo, pose, easeIn]: easeIn acelera até o contato; as demais transições são suaves.
const FIELD_COMBO_KEYS = [[0, FC_A1], [.16, FC_C1, 1], [.28, FC_F1], [.34, FC_A2], [.5, FC_C2, 1], [.64, FC_F2], [.9, FC_A3], [1, FC_C3, 1], [1.14, FC_C3B], [FIELD_COMBO_END, FC_N]];
function comboPose(t) {
  const k = FIELD_COMBO_KEYS; if (t >= k[k.length - 1][0]) return k[k.length - 1][1];
  let i = 1; while (t > k[i][0]) i++;
  const a = k[i - 1], b = k[i], u = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))), e = b[2] ? u * u : u * u * (3 - 2 * u);
  return a[1].map((v, j) => v + (b[1][j] - v) * e);
}
const originalPlayerModel = P.g.clone(true);
const boostParticleGeometry = new T.BoxGeometry(.12, .12, .28);
const boostParticleMaterials = [
  new T.MeshBasicMaterial({ color: 0xbffcff, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false }),
  new T.MeshBasicMaterial({ color: 0x42cfff, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false }),
  new T.MeshBasicMaterial({ color: 0xffb340, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false })
];
function createBoostEffect(character) {
  const effect = new T.Group(); effect.name = 'Partículas dos propulsores'; effect.visible = false; effect.userData.time = 0;
  const emitters = character === 'arachnodroid'
    ? [[-1.15, .3, -.65], [1.15, .3, -.65], [-1.15, .3, .65], [1.15, .3, .65]]
    : [[-.38, .18, 0], [.38, .18, 0], [-.78, 2.35, -.12], [.78, 2.35, -.12]];
  for (let i = 0; i < 20; i++) {
    const particle = new T.Mesh(boostParticleGeometry, boostParticleMaterials[i % boostParticleMaterials.length]);
    particle.userData = { emitter: i % emitters.length, seed: (i * .61803398875) % 1, shoulder: character !== 'arachnodroid' && i % emitters.length > 1 }; effect.add(particle);
  }
  effect.userData.emitters = emitters; return effect;
}
function updateBoostEffect(player, dt) {
  const effect = player.boostEffect; if (!effect) return; effect.visible = !!player.boosting && player.hp > 0 && !over; if (!effect.visible) return;
  effect.userData.time += dt; const emitters = effect.userData.emitters;
  const side = (player.dashX || 0) * Math.cos(player.face) - (player.dashZ || 0) * Math.sin(player.face);
  const forward = (player.dashX || 0) * Math.sin(player.face) + (player.dashZ || 0) * Math.cos(player.face);
  effect.children.forEach((particle, i) => {
    const data = particle.userData, phase = (effect.userData.time * (data.shoulder ? 5.8 : 7.2) + data.seed) % 1, source = emitters[data.emitter];
    const spread = .05 + phase * .18, trail = (data.shoulder ? 1.35 : .75) * phase;
    particle.position.set(source[0] - side * trail + Math.sin((i + 1) * 12.3) * spread, source[1] - (data.shoulder ? .25 : .55) * phase, source[2] - forward * trail);
    particle.rotation.set(phase * 5, i * 1.7, phase * 3); particle.scale.setScalar(.35 + (1 - phase) * 1.15);
  });
}
function updateBoostPose(player, dt) {
  const target = player.boosting && player.hp > 0 && !over ? 1 : 0;
  player.boostPose = (player.boostPose || 0) + (target - (player.boostPose || 0)) * (1 - Math.exp(-dt * (target ? 14 : 9)));
  const blend = player.boostPose, { rig, lL, lR, aL, aR, legs } = player.rigRefs;
  if (blend < .001) { player.boostPose = 0; if (aL) aL.rotation.z = 0; if (aR) aR.rotation.z = 0; return }
  const side = (player.dashX || 0) * Math.cos(player.face) - (player.dashZ || 0) * Math.sin(player.face);
  const forward = (player.dashX || 0) * Math.sin(player.face) + (player.dashZ || 0) * Math.cos(player.face);
  rig.rotation.x = T.MathUtils.lerp(rig.rotation.x, .2 + forward * .34, blend);
  rig.rotation.z = T.MathUtils.lerp(rig.rotation.z, -side * .62, blend);
  rig.position.y = T.MathUtils.lerp(rig.position.y, player.character === 'arachnodroid' ? -.16 : -.28, blend);
  if (player.character === 'arachnodroid') {
    legs.forEach((leg, i) => {
      const front = i === 1 || i === 3, left = i < 2 ? -1 : 1;
      leg.rotation.x = T.MathUtils.lerp(leg.rotation.x, (front ? -.58 : .68) - forward * (front ? .18 : -.12) + side * .24, blend);
      leg.rotation.z = T.MathUtils.lerp(leg.rotation.z, left * (.32 + Math.abs(side) * .18) - side * .2, blend);
      leg.position.y = T.MathUtils.lerp(leg.position.y, 1.96 + (front ? .08 : 0), blend);
    });
    return;
  }
  lL.rotation.x = T.MathUtils.lerp(lL.rotation.x, .72 - forward * .14 - side * .28, blend);
  lR.rotation.x = T.MathUtils.lerp(lR.rotation.x, -.48 - forward * .14 - side * .28, blend);
  lL.rotation.z = T.MathUtils.lerp(lL.rotation.z, side * .34 - .12, blend);
  lR.rotation.z = T.MathUtils.lerp(lR.rotation.z, side * .34 + .12, blend);
  aL.rotation.x = T.MathUtils.lerp(aL.rotation.x, .92 + side * .18, blend);
  aR.rotation.x = T.MathUtils.lerp(aR.rotation.x, .72 + side * .18, blend);
  aL.rotation.z = (-.18 + side * .3) * blend;
  aR.rotation.z = (.18 + side * .3) * blend;
}
const fieldFighterGeometries = {};
function fieldFighterGeometry(name) {
  if (fieldFighterGeometries[name]) return fieldFighterGeometries[name];
  const data = FIELD_FIGHTER_MODEL.parts[name], pivot = FIELD_FIGHTER_MODEL.pivots[name];
  const count = data.length / 14, positions = new Float32Array(count * 9), colors = new Float32Array(count * 9), solid = [], lights = [];
  const palette = FIELD_FIGHTER_MODEL.palette.map(hex => [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255));
  for (let i = 0; i < count; i++) {
    const offset = i * 14, index = parseInt(data.slice(offset + 12, offset + 14), 36), color = palette[index];
    const indices = ['78fef9', 'f93a1d', 'fed578'].includes(FIELD_FIGHTER_MODEL.palette[index]) ? lights : solid;
    indices.push(i * 3, i * 3 + 1, i * 3 + 2);
    for (let k = 0; k < 3; k++) {
      const v = parseInt(data.slice(offset + k * 4, offset + k * 4 + 4), 36), j = i * 9 + k * 3;
      positions[j] = (v >> 13) / 20 - 1.9 - pivot[0];
      positions[j + 1] = ((v >> 6) & 127) / 20 - pivot[1];
      positions[j + 2] = (v & 63) / 20 - .8 - pivot[2];
      colors.set(color, j);
    }
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3)); geometry.setIndex(solid.concat(lights));
  if (solid.length) geometry.addGroup(0, solid.length, 0); if (lights.length) geometry.addGroup(solid.length, lights.length, 1);
  geometry.computeVertexNormals();
  geometry.userData = { source: FIELD_FIGHTER_MODEL.source, part: name };
  fieldFighterGeometries[name] = geometry; return geometry;
}
function characterInfo(id) { return CHARACTERS[id] || CHARACTERS.ranger }
function selectedCharacter() { return document.querySelector('input[name="character"]:checked')?.value || 'ranger' }
function buildFieldfighter() {
  const g = new T.Group(), rig = new T.Group(), mech = new T.Group(); g.add(rig); rig.add(mech); mech.scale.setScalar(.45);
  g.name = 'Fieldfighter · original ZIP model'; rig.name = 'Fieldfighter rig';
  g.userData = { character: 'fieldfighter', source: FIELD_FIGHTER_MODEL.source, objSha256: FIELD_FIGHTER_MODEL.objSha256 };
  const material = [new T.MeshLambertMaterial({ vertexColors: true, emissive: 0x100a07 }), new T.MeshBasicMaterial({ vertexColors: true })];
  function part(name) {
    const group = new T.Group(); group.name = 'Fieldfighter ' + name;
    group.position.fromArray(FIELD_FIGHTER_MODEL.pivots[name]);
    const mesh = new T.Mesh(fieldFighterGeometry(name), material); mesh.name = name + ' · source triangles'; group.add(mesh); mech.add(group); return group;
  }
  part('body'); const legs = [part('leftLeg'), part('rightLeg')], arms = [part('leftArm'), part('rightArm')];
  g.traverse(o => o.castShadow = true);
  return { g, rigRefs: { rig, lL: legs[0], lR: legs[1], aL: arms[0], aR: arms[1] } };
}
function configureCharacter(player, id, index = 0) {
  const character = Object.hasOwn(CHARACTERS, id) ? id : 'ranger';
  let model;
  if (character === 'fieldfighter') model = buildFieldfighter();
  else if (character === 'arachnodroid') model = buildArachnodroid();
  else {
    const g = originalPlayerModel.clone(true), rig = g.children[0], mech = rig.children[0];
    const colors = [0xffffff, 0x88cfff, 0xffb988, 0xbbff99, 0xe9a8ff, 0xffef88, 0xff91c2, 0x91ffe8];
    g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.color.setHex(colors[index % colors.length]) } });
    model = { g, rigRefs: { rig, lL: mech.children[1], lR: mech.children[2], aL: mech.children[3], aR: mech.children[4] } };
  }
  scene.remove(player.g); if (player.meleeRing) scene.remove(player.meleeRing); if (player.meleeShock) scene.remove(player.meleeShock); if (player.laserBeam) scene.remove(player.laserBeam);
  player.g = model.g; player.rigRefs = model.rigRefs; player.character = character; player.strike = 0; player.strikeHit = 0; player.fire = 0;
  player.combo = null; player.dashCooldown = 0; player.dashTime = 0; player.glideTime = 0; player.dashFuel = 50; player.dashFuelDelay = 0; player.dashActive = false; player.boosting = false; player.boostPose = 0; player.laserTime = 0;
  player.deathExploded = false;
  setupSpecial(player);
  player.boostEffect = createBoostEffect(character); player.g.add(player.boostEffect);
  player.g.position.copy(player.pos); scene.add(player.g);
  player.laserBeam = null;
  if (character === 'arachnodroid') {
    player.laserBeam = new T.Mesh(new T.CylinderGeometry(.045, .045, 1, 6), new T.MeshBasicMaterial({ color: 0x37ccff, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false }));
    player.laserBeam.visible = false; scene.add(player.laserBeam);
  }
  if (typeof $ === 'function' && player === localPlayer) updateControls();
  player.meleeRing = null; player.meleeShock = null;
  if (character === 'fieldfighter') {
    // Crescente de golpe: setor achatado centrado à frente; giro/inclinação/roll mudam a cada hit.
    player.meleeRing = new T.Mesh(new T.RingGeometry(.55, 1, 32, 1, Math.PI / 2 - 1.2, 2.4).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: 0xffc34a, transparent: true, opacity: .9, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
    player.meleeRing.rotation.order = 'YXZ'; player.meleeRing.name = 'Fieldfighter slash trail'; player.meleeRing.visible = false; scene.add(player.meleeRing);
    // Onda de choque do golpe final.
    player.meleeShock = new T.Mesh(new T.RingGeometry(.86, 1, 48).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: .85, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
    player.meleeShock.name = 'Fieldfighter shockwave'; player.meleeShock.visible = false; scene.add(player.meleeShock);
    player.shockCenter = new T.Vector3();
  }
}
function performAttack() {
  if (P.character === 'arachnodroid') { fireLaser(); return }
  if (P.character !== 'fieldfighter') { shoot(); return }
  if (P.combo) return;
  const dx = aim.x - P.pos.x, dz = aim.z - P.pos.z;
  if (Math.hypot(dx, dz) > .01) P.face = Math.atan2(dx, dz);
  // O impacto de cada hit ocorre em animateCharacter, no instante FIELD_COMBO[i].at.
  P.combo = { elapsed: 0, hit: 0, aimed: 0, face: P.face };
}
function meleeImpact(index = 1) {
  const hit = FIELD_COMBO[index], radius = hit.radius, face = P.combo.face, cosHalf = Math.cos(hit.half), m = hit.damage;
  const inRange = (position, padding = 0, height = position.y) => {
    const dx = position.x - P.pos.x, dz = position.z - P.pos.z, d = Math.hypot(dx, dz);
    return d <= radius + padding && Math.abs(height - P.pos.y) < 3.6 && (d < .05 || (dx * Math.sin(face) + dz * Math.cos(face)) / d >= cosHalf);
  };
  P.strike = hit.fx; P.strikeHit = index; P.inv = Math.max(P.inv, hit.inv); shake = Math.max(shake, hit.shake);
  const reach = index === 2 ? 3.2 : 2, cx = P.pos.x + Math.sin(face) * reach, cz = P.pos.z + Math.cos(face) * reach;
  burst(cx, P.pos.y + .4, cz, 0xffb83e, index === 2 ? 26 : index ? 18 : 12, index === 2 ? 10 : 8);
  if(typeof destroyInfernoProps==='function')destroyInfernoProps(new T.Vector3(cx,P.pos.y,cz),radius*.72);
  if (index === 1) burst(cx, P.pos.y + .6, cz, 0xffffff, 8, 7);
  if (index === 2) {
    // Esmagamento: onda de choque, poeira e destroços no ponto de impacto.
    P.shockCenter.set(cx, 0, cz); burst(cx, .3, cz, 0xc9b79c, 28, 9); burst(cx, .4, cz, 0x6b7280, 14, 8);
    grassSystem.addImpact(P.shockCenter, radius + 2, 1.5);
  } else grassSystem.addImpact(new T.Vector3(cx, 0, cz), radius, 1.1);
  if (!B.dead && B.disp.some((position, i) => inRange(position, B.segs[i].s * .4, B.Y[i]))) {
    // One shared-health hit per strike, even when several body segments are in range.
    B.hp = Math.max(0, B.hp - 260 * m); B.segs.forEach((s, i) => { if (inRange(B.disp[i], s.s * .4, B.Y[i])) s.f = .8 });
    if (B.hp === 0) { B.dead = true; B.state = 'dead'; flyers.forEach(f => scene.remove(f.g)); flyers.length = 0 }
  }
  for (let i = flyers.length - 1; i >= 0; i--) { const f = flyers[i]; if (!inRange(f.g.position, .3)) continue; f.hp -= 160 * m; f.f = .15; if (f.hp <= 0) { shatterModel(f.g, 32); burst(f.g.position.x, f.g.position.y, f.g.position.z, 0x44ff99, 12); scene.remove(f.g); flyers.splice(i, 1) } }
  for (const u of A.u) if (!u.dead && u.rise >= 1 && inRange(u.g.position, .4)) { skelHurt(u, 160 * m); if (!u.dead) { const dx = u.g.position.x - P.pos.x, dz = u.g.position.z - P.pos.z, d = Math.hypot(dx, dz) || 1; u.g.position.x += dx / d * hit.push; u.g.position.z += dz / d * hit.push } }
  if (R.on && !R.dead && inRange(rg.position, 2, rg.position.y)) robotHurt(240 * m);
  if (E.on && !E.dead && inRange(eg.position, 2.7, eg.position.y)) ettinHurt(240 * m);
}
// Avança o combo: reavalia a mira, dá o avanço curto, dispara os impactos e anima o rastro/onda de choque.
function stepFieldCombo(player, dt) {
  let c = player.combo;
  if (c && (player.hp <= 0 || over)) player.combo = c = null;
  if (c) {
    const before = c.elapsed; c.elapsed += dt;
    while (c.aimed < 3 && c.elapsed >= FIELD_COMBO[c.aimed].aim) {
      if (c.aimed > 0) { const dx = aim.x - player.pos.x, dz = aim.z - player.pos.z; if (Math.hypot(dx, dz) > .01) c.face = Math.atan2(dx, dz) }
      c.aimed++;
    }
    // Avanço na direção do golpe nos 0,12 s que antecedem cada impacto.
    let advance = 0;
    for (const h of FIELD_COMBO) advance += h.lunge * Math.max(0, Math.min(c.elapsed, h.at) - Math.max(before, h.at - .12)) / .12;
    if (advance > 0) {
      player.pos.x += Math.sin(c.face) * advance; player.pos.z += Math.cos(c.face) * advance;
      Collision.resolve(player.pos,.65,arenaRadius,{ground:player.ground});
      player.g.position.copy(player.pos);
    }
    while (c.hit < 3 && c.elapsed >= FIELD_COMBO[c.hit].at) { meleeImpact(c.hit); c.hit++ }
    if (c.elapsed >= FIELD_COMBO_END) player.combo = null;
  }
  player.strike = Math.max(0, player.strike - dt);
  const active = player.strike > 0 && player.hp > 0, h = FIELD_COMBO[player.strikeHit];
  player.meleeRing.visible = active; player.meleeShock.visible = active && player.strikeHit === 2;
  if (!active) return;
  const progress = 1 - player.strike / h.fx, ring = player.meleeRing;
  ring.position.set(player.pos.x, player.pos.y + h.y, player.pos.z);
  ring.rotation.set(h.tilt[0] + (h.tilt[1] - h.tilt[0]) * progress, (player.combo?.face ?? player.face) + h.sweep[0] + (h.sweep[1] - h.sweep[0]) * progress, h.roll);
  ring.scale.setScalar(h.radius * (.6 + .4 * Math.min(1, progress * 2.2)));
  ring.material.color.setHex(h.color); ring.material.opacity = (1 - progress) * .95;
  if (player.meleeShock.visible) {
    const shock = player.meleeShock; shock.position.set(player.shockCenter.x, .1, player.shockCenter.z);
    shock.scale.setScalar(1 + progress * h.radius * .7); shock.material.opacity = (1 - progress) * .85;
  }
}
// Aplica a pose do combo por cima da pose de andar/boost.
function applyFieldComboPose(player) {
  const { rig, lL, lR, aL, aR } = player.rigRefs, c = player.combo;
  if (!c) { rig.rotation.y = 0; return }
  const p = comboPose(c.elapsed);
  aL.rotation.x = p[0]; aL.rotation.z = p[1]; aR.rotation.x = p[2]; aR.rotation.z = p[3];
  rig.rotation.set(p[5], p[4], p[6]); rig.position.y = p[7]; lL.rotation.x = p[8]; lR.rotation.x = p[9];
}
function animateCharacter(player, dt) {
  if (player.hp <= 0 || over) { player.specialState = null; if (player.specialEffect) player.specialEffect.visible = false }
  if (player.hp <= 0) player.boosting = false; updateBoostEffect(player, dt);
  if (player.laserBeam) { player.laserTime = Math.max(0, player.laserTime - dt); player.laserBeam.visible = player.laserTime > 0 && player.hp > 0 }
  if (player.character === 'arachnodroid') {
    const moving = Math.min(1, Math.hypot(player.vx, player.vz) / 9);
    player.rigRefs.legs.forEach((leg, i) => { const phase = player.ph + (i === 0 || i === 3 ? 0 : Math.PI); leg.rotation.set(Math.sin(phase) * .24 * moving, 0, 0); leg.position.y = 2.2 + Math.max(0, Math.cos(phase)) * .15 * moving }); updateBoostPose(player, dt); return;
  }
  if (player.character === 'fieldfighter') stepFieldCombo(player, dt);
  updateBoostPose(player, dt);
  if (player.character === 'fieldfighter') applyFieldComboPose(player);
}
function buildArachnodroid() {
  const g = new T.Group(), rig = new T.Group(), mech = new T.Group(); g.add(rig); rig.add(mech); mech.scale.setScalar(.65);
  g.name = 'Arachondroid · original ZIP model'; g.userData = { character: 'arachnodroid', source: ARACHNODROID_MODEL.source, objSha256: ARACHNODROID_MODEL.objSha256 };
  const materials = [new T.MeshLambertMaterial({ vertexColors: true }), new T.MeshBasicMaterial({ vertexColors: true })];
  const parts = {};
  for (const [name, data] of Object.entries(ARACHNODROID_MODEL.parts)) {
    const pivot = ARACHNODROID_MODEL.pivots[name], count = data.length / 17, positions = [], colors = [], solid = [], lights = [];
    for (let i = 0; i < count; i++) {
      const hex = ARACHNODROID_MODEL.palette[parseInt(data.slice(i * 17 + 15, i * 17 + 17), 36)], color = [0, 2, 4].map(k => parseInt(hex.slice(k, k + 2), 16) / 255);
      (['37aaf8', 'f98c5a', 'fe78e7'].includes(hex) ? lights : solid).push(i * 3, i * 3 + 1, i * 3 + 2);
      for (let k = 0; k < 3; k++) { const v = parseInt(data.slice(i * 17 + k * 5, i * 17 + k * 5 + 5), 36); positions.push((v >> 14) / 20 - 1.4 - pivot[0], ((v >> 7) & 127) / 20 - pivot[1], (v & 127) / 20 - 1.8 - pivot[2]); colors.push(...color) }
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.setIndex(solid.concat(lights)); geometry.addGroup(0, solid.length, 0); geometry.addGroup(solid.length, lights.length, 1); geometry.computeVertexNormals(); geometry.userData = { source: ARACHNODROID_MODEL.source, part: name };
    const part = new T.Group(); part.position.fromArray(pivot); part.add(new T.Mesh(geometry, materials)); mech.add(part); parts[name] = part;
  }
  g.traverse(o => o.castShadow = true);
  return { g, rigRefs: { rig, legs: [parts.leftBack, parts.leftFront, parts.rightBack, parts.rightFront], lL: new T.Group(), lR: new T.Group(), aL: new T.Group(), aR: new T.Group() } };
}
function fireLaser(dt) {
  const factor = dt === undefined ? 1 : dt / CHARACTERS.arachnodroid.interval;
  P.laserFx = Math.max(0, (P.laserFx || 0) - (dt || 0)); const spark = dt === undefined || P.laserFx <= 0; if (spark) P.laserFx = .08;
  const origin = new T.Vector3(P.pos.x, P.pos.y + 1.7, P.pos.z), direction = new T.Vector3(aim.x, aimY, aim.z).sub(origin);
  if (direction.lengthSq() < .01) direction.set(Math.sin(P.face), 0, Math.cos(P.face)); direction.normalize();
  scene.updateMatrixWorld(true);
  const hit = new T.Raycaster(origin, direction, .1, 42).intersectObjects(picks(), true).find(h => h.object.material !== lineM);
  const length = hit ? hit.distance : 42;
  P.laserBeam.position.copy(origin).addScaledVector(direction, length / 2); P.laserBeam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction); P.laserBeam.scale.set(1, length, 1); P.laserTime = .14; P.laserBeam.visible = true;
  if (!hit) return;
  const worldProp=typeof infernoPropFromIntersection==='function'?infernoPropFromIntersection(hit):null;if(worldProp){destroyInfernoProp(worldProp);infernoWorldRevision++;if(spark)burst(hit.point.x,hit.point.y,hit.point.z,0x37ccff,5,4);return}
  const belongs = root => { for (let o = hit.object; o; o = o.parent)if (o === root) return true; return false };
  if (!B.dead && B.segs.some(s => belongs(s.root))) { B.hp = Math.max(0, B.hp - 28 * factor); B.segs.forEach(s => { if (belongs(s.root)) s.f = .15 }); if (!B.hp) { B.dead = true; B.state = 'dead'; flyers.forEach(f => scene.remove(f.g)); flyers.length = 0 } }
  else if (R.on && !R.dead && belongs(rg)) robotHurt(32 * factor);
  else if (E.on && !E.dead && belongs(eg)) ettinHurt(32 * factor);
  else { const u = A.u.find(u => !u.dead && belongs(u.g)); if (u) skelHurt(u, 32 * factor, !spark); else { const index = flyers.findIndex(f => belongs(f.g)); if (index >= 0) { const f = flyers[index]; f.hp -= 32 * factor; f.f = .15; if (f.hp <= 0) { shatterModel(f.g, 32); scene.remove(f.g); flyers.splice(index, 1) } } } }
  if (spark) burst(hit.point.x, hit.point.y, hit.point.z, 0x37ccff, 5, 4);
}
function updateDash(dt, input, ix, iz) {
  const initialCost = 10, sustainCost = 3, regen = 20, held = !!(input.dashHeld || input.keys?.ShiftLeft || input.keys?.ShiftRight || input.keys?.KeyQ);
  P.dashFuel = Math.max(0, Math.min(100, P.dashFuel ?? 100)); P.dashCooldown = Math.max(0, (P.dashCooldown || 0) - dt); P.dashFuelDelay = Math.max(0, (P.dashFuelDelay || 0) - dt);
  if (input.dash && P.dashCooldown <= 0 && P.dashFuel >= initialCost && !P.specialState) {
    const length = Math.hypot(ix, iz); P.dashX = length ? ix / length : Math.sin(P.face); P.dashZ = length ? iz / length : Math.cos(P.face);
    P.dashFuel -= initialCost; P.dashFuelDelay = .7; P.dashTime = .18; P.dashActive = true; P.dashCooldown = .28; P.inv = Math.max(P.inv, .2); burst(P.pos.x, P.pos.y + .3, P.pos.z, 0x88ddff, 8, 4);
    if (!P.ground) P.glideTime = GLIDE_DURATION;
  }
  let boosting = false;
  if (P.dashActive && P.dashFuel > 0 && (P.dashTime > 0 || held) && !P.specialState) {
    const length = Math.hypot(ix, iz); if (length) { const tx = ix / length, tz = iz / length, k = 1 - Math.exp(-dt * 12), nx = P.dashX + (tx - P.dashX) * k, nz = P.dashZ + (tz - P.dashZ) * k, n = Math.hypot(nx, nz) || 1; P.dashX = nx / n; P.dashZ = nz / n }
    const burst = P.dashTime > 0, speed = burst ? 30 : 17; if (!burst) { P.dashFuel = Math.max(0, P.dashFuel - sustainCost * dt); P.dashFuelDelay = .7 }
    P.pos.x += P.dashX * speed * dt; P.pos.z += P.dashZ * speed * dt; boosting = true;
  }
  P.dashTime = Math.max(0, P.dashTime - dt); if (!boosting) P.dashActive = false;
  if (!boosting && P.dashFuelDelay <= 0) P.dashFuel = Math.min(100, P.dashFuel + regen * dt);
  P.boosting = boosting; return boosting;
}
function drawCharacterPreviews() {
  const palette = { o: '#451500', y: '#fed578', b: '#363636', v: '#78fef9', w: '#e4e5e1', g: '#7096ba', r: '#f93a1d', k: '#070707' };
  const sprites = {
    ranger: ['.....wwwwww.....', '....wwwwwwww....', '....wbvvvvbw....', '....wwwwwwww....', '.....wwwwww.....', '..ggwwwwwwwwgg..', '.gggwwwwwwwwggg.', '.gggbbwwwwbbggg.', '..ggbbwwwwbbgg..', '..ggbbwwwwbbgg..', '...gbbbbbbbbgggg', '.....bbbbbb.....', '.....ww..ww.....', '.....ww..ww.....', '....www..www....', '....bbb..bbb....'],
    fieldfighter: ['..v..........v..', '..kb........bk..', '..kkbbrrrrbbkk..', '...bbbbbbbbbb...', '...ovbkkkbvo....', '...obbkkkbbo....', '..obkkbbkkkbo...', '..bbkkbbkkkbb...', '..obkkbbkkkbo...', '..obkkbbkkkbo...', '..obkkkkkkkbo...', '..vb.bb..bb.bv..', '.....bb..bb.....', '.....bb..bb.....', '.....bk..kb.....', '.....vk..kv.....']
  };
  sprites.arachnodroid = ['....oooooooo....', '...oooooooooo...', '...ovoooooovoo..', '....bbbbbbbb....', '.....bbbbbb.....', '..o..bbvvbb..o..', '.oooobbbbbboooo.', '.o.o.bbbbbbo.o..', '.o.o..brrb.o.o..', '.o.o..bbbb.o.o..', '.v.o.......o.v..', '.b.v.......v.b..', '.b.b.......b.b..', '.b.b.......b.b..', '.w.w.......w.w..', '.www.......www..'];
  document.querySelectorAll('.character-preview').forEach(canvas => { const context = canvas.getContext('2d'); sprites[canvas.dataset.character].forEach((row, y) => [...row].forEach((pixel, x) => { if (palette[pixel]) { context.fillStyle = palette[pixel]; context.fillRect(x, y, 1, 1) } })) });
}
