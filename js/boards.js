import * as THREE from 'three';
// Boards are data: spaces {x, z, type, next:[indices], label?, bridge?} plus extras.
//   warps: [a, b] paired warp spaces | monster: {start} roaming Wanderer | sky: day/night cycle by round
//   starSpots: where the star may appear | decor(world, add, anim): animated scenery
const TAU = Math.PI * 2, T = { b: 'blue', r: 'red', g: 'green', s: 'shop', d: 'duel', w: 'warp', t: 'toll', x: 'slot' };
const finish = def => { def.n = def.sp.length; def.type = i => def.sp[i].type; def.spot = i => [def.sp[i].x, def.sp[i].z]; return def; };

// ---- Classic Ring: the original barebones board
const CT = ['blue', 'blue', 'red', 'blue', 'green', 'blue'];
const classic = finish({
  name: 'Classic Ring', warps: [], monster: null, sky: false, starSpots: Array.from({ length: 21 }, (_, i) => i + 2),
  sp: Array.from({ length: 24 }, (_, i) => ({ x: Math.sin(i / 24 * TAU) * 10, z: Math.cos(i / 24 * TAU) * 10, type: i % 12 === 9 ? 'shop' : i % 12 === 3 ? 'duel' : CT[i % 6], next: [(i + 1) % 24] })),
});

// ---- Twilight Grove: ring road + toll bridge shortcut over a lake, warp stones, a roaming monster, day -> night
const RING = 'bbgbrbsbgbwbrbgbdbrbwbgbsb', RX = 12, RZ = 8.2;
const gsp = [...RING].map((c, i) => ({ x: Math.sin(i / 26 * TAU) * RX, z: Math.cos(i / 26 * TAU) * RZ, type: T[c], next: [(i + 1) % 26] }));
[['toll', 4.8], ['red', 1.6], ['green', -1.6], ['blue', -4.8]].forEach(([type, z], k) => gsp.push({ x: 0, z, type, bridge: true, next: [k < 3 ? 27 + k : 13] }));
gsp[0].next = [1, 26]; gsp[1].label = '🌲 Ring road (safe, long)'; gsp[26].label = '🌉 Bridge shortcut (toll 3🪙)';

function groveDecor(world, add, anim) {
  let sd = 7; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  const std = (c, o) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, ...o });
  const shore = add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .05, 28), std(0xe8d9a8))); shore.scale.set(7, 1, 5.2); shore.position.y = .03;
  const lake = add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .08, 28), std(0x3aa0d8, { transparent: true, opacity: .88 }))); lake.scale.set(6.3, 1, 4.5); lake.position.y = .06;
  anim((dt, t) => lake.material.color.setHSL(.56, .7, .5 + .05 * Math.sin(t * 1.6)));
  const trees = [];
  for (let i = 0; i < 34; i++) {
    const a = r() * TAU, f = 1.2 + r() * .3, g = new THREE.Group(), col = i % 3 ? 0x2e8b57 : 0x3fa34d;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, .9, 5), std(0x7b5230)); trunk.position.y = .45;
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(.85, 1.6, 6), std(col)); c1.position.y = 1.6;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(.6, 1.2, 6), std(col)); c2.position.y = 2.4;
    g.add(trunk, c1, c2); g.position.set(Math.sin(a) * RX * f, 0, Math.cos(a) * RZ * f); g.scale.setScalar(.8 + r() * .6); add(g); trees.push([g, r() * 6]);
  }
  anim((dt, t) => trees.forEach(([g, ph]) => { g.rotation.z = Math.sin(t * 1.4 + ph) * .06; }));
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85 })); b.scale.set(1.6, .7, 1); b.position.set(k * 1.4 - 1.4, k === 1 ? .4 : 0, 0); g.add(b); }
    g.position.set(-24 + r() * 48, 3 + r() * 3, -16 + r() * 2); add(g); clouds.push([g, .4 + r() * .5]);
  }
  anim(dt => clouds.forEach(([g, sp]) => { g.position.x += dt * sp; if (g.position.x > 26) g.position.x = -26; }));
  const ff = [];
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 0), new THREE.MeshBasicMaterial({ color: 0xfff176 })), a = r() * TAU, f = .6 + r() * .8;
    m.userData = { x: Math.sin(a) * RX * f, z: Math.cos(a) * RZ * f, ph: r() * 6 }; add(m); ff.push(m);
  }
  anim((dt, t) => ff.forEach(m => { const u = m.userData; m.visible = world.decoOn && world.dark > .45; m.position.set(u.x + Math.sin(t * .8 + u.ph) * .8, 1 + Math.sin(t * 1.7 + u.ph) * .4, u.z + Math.cos(t * .7 + u.ph) * .8); }));
}

const grove = finish({
  name: 'Twilight Grove', sp: gsp, warps: [10, 20], monster: { start: 13 }, sky: true, decor: groveDecor,
  starSpots: [3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25, 28],
});


// ---- Ember Isle: outer lava road + inner crater ring (two forks). Each round the volcano erupts: a few tiles turn
//      scorching hot and cost coins to land on. The star favours the crater ring (risk = reward).
const OUT = 'bbgbrbsbgbrbdbbgbrbsbgbr', INN = 'gbgbsbgbdbgb';
const vsp = [...OUT].map((c, i) => ({ x: Math.sin(i / 24 * TAU) * 12, z: Math.cos(i / 24 * TAU) * 8.2, type: T[c], next: [(i + 1) % 24] }));
[...INN].forEach((c, k) => vsp.push({ x: Math.sin(k / 12 * TAU) * 6.2, z: Math.cos(k / 12 * TAU) * 4.4, type: T[c], next: [24 + (k + 1) % 12] }));
vsp[0].next = [1, 24]; vsp[1].label = '🛤 Lava road (outer ring)'; vsp[24].label = '🌋 Climb to the crater';
vsp[30].next = [31, 12]; vsp[31].label = '🔁 Keep circling the crater'; vsp[12].label = '🚪 Leave via the back road';

function volcanoDecor(world, add, anim) {
  let sd = 11; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  const std = (c, o) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, ...o });
  const ground = add(new THREE.Mesh(new THREE.CylinderGeometry(12.9, 12.9, .05, 24), std(0x3b3434))); ground.position.y = .02;
  const glow = add(new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, .06, 20), std(0xff5a1f, { emissive: 0xff3300 }))); glow.position.y = .05;
  anim((dt, t) => { glow.material.emissiveIntensity = .7 + .3 * Math.sin(t * 2.5); });
  const cone = add(new THREE.Mesh(new THREE.CylinderGeometry(.9, 2.8, 5.5, 8), std(0x4a3f3f))); cone.position.y = 2.75;
  const lava = add(new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .1, 8), std(0xff7a1f, { emissive: 0xff4400 }))); lava.position.y = 5.5;
  const em = [];
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.12, 0), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff7a1f : 0xffd93d }));
    m.userData = { ph: r() * 8, sp: 1 + r() * 1.4, dx: r() - .5, dz: r() - .5 }; add(m); em.push(m);
  }
  anim((dt, t) => em.forEach(m => { const u = m.userData, k = (t * u.sp * .4 + u.ph) % 1; m.position.set(u.dx * k * 7, 5.6 + k * 5, u.dz * k * 7); m.scale.setScalar(1 - k * .8); m.visible = world.decoOn; }));
  for (let i = 0; i < 16; i++) {
    const a = r() * TAU, f = 1.22 + r() * .2, h = 1.5 + r() * 1.6, m = add(new THREE.Mesh(new THREE.ConeGeometry(.5 + r() * .4, h, 5), std(0x5d5252)));
    m.position.set(Math.sin(a) * 12 * f, h / 2, Math.cos(a) * 8.2 * f);
  }
}
const volcano = finish({
  name: 'Ember Isle', sp: vsp, warps: [], monster: null, sky: true, skyFixed: .78, hazard: { count: 4, dmg: 6 }, decor: volcanoDecor,
  starSpots: [26, 27, 28, 29, 31, 32, 33, 34, 35, 3, 7, 9, 15, 19, 21],
});

// ---- Neon Casino: boardwalk loop + a high-roller lane through the middle with slot machines (bet 3/6/10 coins)
const rect = (i, n) => { let d = i / n * 76; if (d < 12) return [d, 7]; d -= 12; if (d < 14) return [12, 7 - d]; d -= 14; if (d < 24) return [12 - d, -7]; d -= 24; if (d < 14) return [-12, -7 + d]; d -= 14; return [-12 + d, 7]; };
const CR = 'bgbrbxbgbsbdbrbgbxbrbgbsbdbrbx';
const csp = [...CR].map((c, i) => { const [x, z] = rect(i, 30); return { x, z, type: T[c], next: [(i + 1) % 30] }; });
[['slot', 3.5], ['green', 0], ['slot', -3.5]].forEach(([type, z], k) => csp.push({ x: 0, z, type, next: [k < 2 ? 31 + k : 15] }));
csp[0].next = [1, 30]; csp[1].label = '🎲 Boardwalk (safe loop)'; csp[30].label = '🎰 High-roller lane (slot machines)';

function casinoDecor(world, add, anim) {
  const std = (c, o) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, ...o });
  const carpet = add(new THREE.Mesh(new THREE.BoxGeometry(26.5, .04, 17.5), std(0x4a1230))); carpet.position.y = .02;
  const lights = [];
  for (let i = 0; i < 48; i++) { const [x, z] = rect(i, 48), m = add(new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshBasicMaterial({ color: 0xff00aa }))); m.position.set(x * 1.1, .2, z * 1.22); lights.push(m); }
  anim((dt, t) => lights.forEach((m, i) => m.material.color.setHSL((i / 48 + t * .25) % 1, 1, .55)));
  const wheels = [];
  for (const sx of [-5, 5]) {
    const g = new THREE.Group();
    for (let k = 0; k < 8; k++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, .25, 12, 1, false, k * TAU / 8, TAU / 8), std(k % 2 ? 0x111111 : 0xcc1122)); g.add(w); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .4, 8), std(0xffd93d, { emissive: 0x665500 })); g.add(hub);
    g.position.set(sx, .2, 0); add(g); wheels.push([g, sx < 0 ? 1 : -1]);
  }
  anim(dt => wheels.forEach(([g, d]) => { g.rotation.y += dt * .8 * d; }));
}
const casino = finish({
  name: 'Neon Casino', sp: csp, warps: [], monster: null, sky: true, skyFixed: .93, decor: casinoDecor,
  starSpots: [3, 5, 7, 9, 11, 13, 17, 19, 21, 23, 25, 27, 29, 31],
});

export const BOARDS = { grove, volcano, casino, classic };
