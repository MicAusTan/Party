import * as THREE from 'three';
import { stage } from './minigames/stage.js';
import { OPTS } from './look.js';
// Victory podium: a short celebration set shown after each minigame (secs ~4) and at the end of a game (secs ~7).
//   const pod = showPodium(world, players, orderBestFirst, ranks, { secs, title, onEnd }); pod.end();
// Tied ranks share a tier. Tiers 1-3 stand on the podium, everyone else stands to the sides and sulks.
const SKINS = { marble: { c: 0xe8eaf0, strip: 0xb0b8c8 }, candy: { c: 0xff8fc7, strip: 0xffffff }, ice: { c: 0x9fdcff, glow: 0xe6f9ff }, neon: { c: 0x16102e, glow: 0x00e5ff }, lava: { c: 0x3a0d0d, glow: 0xff6a00 }, gold: { c: 0xffc400, glow: 0xfff3a0 },
  rainbow: { c: 0xffffff, bands: [0xff4d6d, 0xff9f1a, 0xffd93d, 0x7cf08a, 0x4dd0e1, 0xb28dff] }, void: { c: 0x050505, glow: 0xff00ff }, matrix: { c: 0x04140a, glow: 0x00ff66, strip: 0x0a3a1a },
  wood: { c: 0x8b5a2b, strip: 0x5a3a1a }, steel: { c: 0x8d949e, strip: 0xcfd8dc }, copper: { c: 0xb87333, strip: 0xe0a070 }, pearl: { c: 0xf5f0ff, strip: 0xffc8e8 },
  obsidian: { c: 0x1a1224, glow: 0x9b59b6 }, bubblegum: { c: 0xff77c8, glow: 0x77eaff }, sandstone: { c: 0xdcc59a, strip: 0xc2a878 } };
export const SPOTS = { orange: 0xffb066, teal: 0x7fffe0, white: 0xffffff, magenta: 0xff66e0, gold: 0xffe9a0, rose: 0xff9ecb, ice: 0x9fe8ff, lime: 0xb6ff8a, violet: 0xc9a8ff, blood: 0xff5a5a };
export const STAGES = { storm: { sky: 0x1a2030, d1: 0x2a3040, d2: 0x3d4a66 }, desert: { sky: 0xd98f4e, d1: 0xc9a06a, d2: 0xe0c080 }, arctic: { sky: 0x9fc5e8, d1: 0xdfeaf2, d2: 0xffffff }, lava: { sky: 0x2a0a05, d1: 0x4a1208, d2: 0x8a2a10 }, cosmos: { sky: 0x08051a, d1: 0x1a1050, d2: 0x3a2a90 }, meadow: { sky: 0x87ceeb, d1: 0x4f9a3f, d2: 0x7ac36a }, night: { sky: 0x1b1340, d1: 0x2a2060, d2: 0x3b2f8a }, sunset: { sky: 0x4a1d3d, d1: 0x6b2a3a, d2: 0x8a3b3b }, ocean: { sky: 0x0b2a4a, d1: 0x0e3d66, d2: 0x14598f }, forest: { sky: 0x0f2a1a, d1: 0x174d2b, d2: 0x1f6b3a }, candy: { sky: 0x5a2a5a, d1: 0x7a3a7a, d2: 0xa04ea0 }, void: { sky: 0x050505, d1: 0x111111, d2: 0x2a0a3a } };
// Win effects (the 1st-place player's choice plays for everyone): falling or rising instanced bits, or timed firework bursts.
const FXS = {
  confetti: { cols: [0xff4d6d, 0xffd93d, 0x4dd0e1, 0x7cf08a, 0xb28dff, 0xff9f1a], geo: () => new THREE.BoxGeometry(.18, .02, .11), dir: 1, sp: 1 },
  snow: { cols: [0xffffff, 0xdff3ff], geo: () => new THREE.SphereGeometry(.07, 6, 5), dir: 1, sp: .5 },
  bubbles: { cols: [0x9be7ff, 0xffffff, 0x7fd8ff], geo: () => new THREE.SphereGeometry(.13, 8, 6), dir: -1, sp: .6 },
  stars: { cols: [0xfff176, 0xffd93d, 0xffffff], geo: () => new THREE.OctahedronGeometry(.14), dir: 1, sp: .8 },
  gold: { cols: [0xffd700, 0xffe97a, 0xffb300], geo: () => new THREE.CylinderGeometry(.11, .11, .03, 10), dir: 1, sp: 1.3 },
  lanterns: { cols: [0xffb347, 0xffd27f, 0xff8c42], geo: () => new THREE.BoxGeometry(.16, .2, .16), dir: -1, sp: .5 },
  rain: { cols: [0x6fa8ff, 0xa8c8ff], geo: () => new THREE.BoxGeometry(.02, .35, .02), dir: 1, sp: 3 },
  embers: { cols: [0xff6a00, 0xffa500, 0xff3d00], geo: () => new THREE.SphereGeometry(.06, 5, 4), dir: -1, sp: 1.2 },
  petals: { cols: [0xffb3c6, 0xff8fab, 0xffd6e0], geo: () => new THREE.BoxGeometry(.14, .02, .1), dir: 1, sp: .5 },
  leaves: { cols: [0x7cb342, 0xffa726, 0xc0392b], geo: () => new THREE.BoxGeometry(.16, .02, .1), dir: 1, sp: .6 },
  sparks: { cols: [0xffffff, 0xfff176, 0xffa726], geo: () => new THREE.BoxGeometry(.05, .05, .05), dir: -1, sp: 2 },
  diamonds: { cols: [0x7fe9ff, 0xffffff, 0xb2f5ff], geo: () => new THREE.OctahedronGeometry(.12), dir: 1, sp: 1 },
  fireworks: { cols: [0xffffff], geo: () => new THREE.BoxGeometry(.1, .1, .1), dir: 1, sp: 1, fw: true },
};
export const SKIN_IDS = Object.keys(SKINS), FX_IDS = Object.keys(FXS), SPOT_IDS = Object.keys(SPOTS), STAGE_IDS = Object.keys(STAGES);
const TIER = [{ h: 1.8, c: 0xf1c40f, t: '1ST' }, { h: 1.2, c: 0xc0c8d0, t: '2ND' }, { h: .7, c: 0xcd7f32, t: '3RD' }];
// Pedestal for one player: box(w,h,d,color,x,y,z,opts) is S.box (stage) or any compatible shim (shop preview).
export function pedestal(box, skinId, T, px, pw) {
  const sk = SKINS[skinId];
  if (sk?.bands) sk.bands.forEach((bc, bi) => box(pw, T.h / sk.bands.length, 2.4, bc, px, bi * T.h / sk.bands.length, 0));
  else box(pw, T.h, 2.4, sk ? sk.c : T.c, px, 0, 0);
  if (sk?.glow) { box(pw + .04, .08, 2.44, sk.glow, px, T.h - .08, 0, { basic: true }); box(pw + .04, .08, 2.44, sk.glow, px, 0, 0, { basic: true }); }
  if (sk?.strip) box(pw + .02, .14, 2.42, sk.strip, px, T.h * .5 - .07, 0);
}
// Win-effect particles (instanced). show(true) starts them, update(dt, tt, active) each frame. Works in any scene root.
export function createFx(id, root, mid, total, W) {
  const FX = FXS[id] || FXS.confetti, FW = ['#ff4d6d', '#ffd93d', '#4dd0e1', '#7cf08a', '#b28dff', '#ff9f1a'], N = 150, cols = FX.cols, P = [], dm = new THREE.Object3D();
  const im = new THREE.InstancedMesh(FX.geo(), new THREE.MeshBasicMaterial({ color: 0xffffff }), N); root.add(im);
  let fwT = 0, on = false;
  for (let i = 0; i < N; i++) { P.push({ x: mid + (Math.random() - .5) * (total + 8), y: 3 + Math.random() * 9, z: (Math.random() - .5) * 8, v: 1 + Math.random() * 1.5, r: Math.random() * 6, rs: 2 + Math.random() * 5, sw: Math.random() * 6 }); im.setColorAt(i, new THREE.Color(cols[i % cols.length])); }
  im.visible = false; im.frustumCulled = false;
  return {
    show(v) { on = v; im.visible = v && !FX.fw; },
    update(dt, tt, active = true) {
      if (FX.fw && on && active && (fwT -= dt) <= 0) { fwT = .3 + Math.random() * .4; W.burst(mid + (Math.random() - .5) * total, 3 + Math.random() * 5, (Math.random() - .5) * 4, FW[Math.random() * FW.length | 0], 26); }
      for (let i = 0; i < N; i++) {
        const p = P[i]; p.y -= p.v * dt * FX.dir * FX.sp; p.r += p.rs * dt;
        if (FX.dir > 0 ? p.y < 0 : p.y > 12) { p.y = FX.dir > 0 ? 9 + Math.random() * 3 : 0; p.x = mid + (Math.random() - .5) * (total + 8); }
        dm.position.set(p.x + Math.sin(tt * 1.5 + p.sw) * .6, p.y, p.z); dm.rotation.set(p.r, p.r * .7, 0); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    },
  };
}
export function showPodium(world, players, order, ranks, o = {}) {
  const ctx = { world, players }, ids = order.filter(id => players[id]);
  for (const id of Object.keys(players)) if (!ids.includes(id)) ids.push(id);
  const rk = id => { const i = order.indexOf(id); return i < 0 ? 99 : (ranks?.[i] ?? i); };
  // group by rank value -> tiers
  const vals = [...new Set(ids.map(rk))].sort((a, b) => a - b), tiers = vals.map(v => ids.filter(id => rk(id) === v));
  const top = tiers.slice(0, 3), rest = tiers.slice(3).flat(), SP = 1.7;
  const wOf = g => Math.max(2.4, g.length * SP);
  const wid = top.map(wOf), left = top[1] ? wid[1] : 0, right = top[2] ? wid[2] : 0;
  const sideN = Math.ceil(rest.length / 2), sideW = sideN ? 1.2 + (sideN - 1) * 1.5 + .8 : 0;
  const L = wid[0] / 2 + left + sideW, R = wid[0] / 2 + right + sideW, total = L + R, mid = (R - L) / 2;
  const dist = Math.max(10.5, (total + 4) / 1.5);
  const P1 = players[(top[0] || [])[0]] || {}, ST = STAGES[P1.stage] || STAGES.night, SPOT = SPOTS[P1.spot] ?? SPOTS.gold;
  const CR = (OPTS.crest.vals[P1.crest] || OPTS.crest.vals.trophy).split(' ')[0], vp = id => (players[id]?.vpose in OPTS.vpose.vals) ? players[id].vpose : 'cheer';
  const S = stage(ctx, {
    sky: ST.sky, fog: { color: ST.sky, near: 30, far: 70 }, light: .95, sun: { intensity: 1, pos: [3, 14, 10] },
    cam: { pos: [mid, 4.2, dist], look: [mid, 1.9, 0] }, camFrom: [mid, 8, dist + 9], camT: 1.2,
  });
  const W = world, win = top[0] || [];
  S.cyl(total / 2 + 8, total / 2 + 8, .6, ST.d1, mid, -.6, 0, { seg: 40 }); S.cyl(total / 2 + 3, total / 2 + 3, .04, ST.d2, mid, 0, 0, { seg: 40 });
  // tier x-centres: [2nd][1st][3rd]
  const cx = [0, -(wid[0] / 2 + left / 2), wid[0] / 2 + right / 2];
  top.forEach((g, ti) => {
    const T = TIER[ti], w = wOf(g), x = cx[ti];
    g.forEach((id, k) => pedestal(S.box, players[id]?.ped, T, x + (k - (g.length - 1) / 2) * SP, g.length === 1 ? 2.4 : SP));
    const pl = S.screen(Math.min(w, 2.2), .6, 256, 70); pl.mesh.position.set(x, T.h / 2, 1.22);
    pl.draw((c, pw, ph) => { c.fillStyle = '#0006'; c.fillRect(0, 0, pw, ph); c.fillStyle = '#fff'; c.font = 'bold 48px sans-serif'; c.textAlign = 'center'; c.fillText(T.t, pw / 2, 52); });
    g.forEach((id, k) => W.put(id, x + (k - (g.length - 1) / 2) * SP, 0, 0, T.h));
    if (ti === 0) S.cone(w * .8 + .6, 11, SPOT, x, 0, 0, { basic: true, op: .12, seg: 24 });   // spotlight on the winner(s)
  });
  rest.forEach((id, k) => { const n = k >> 1; W.put(id, k % 2 ? wid[0] / 2 + right + 1.2 + n * 1.5 : -(wid[0] / 2 + left + 1.2 + n * 1.5), .3, 0); });
  // banner over the podium
  const nm = win.map(id => String(players[id]?.name ?? '?'));
  const label = (o.title ?? '') || (nm.length === 1 ? nm[0] : nm.length <= 3 ? nm.join(' & ') : nm.length + ' WINNERS');
  const ban = S.screen(Math.min(9, 3 + label.length * .45), 1.2, 512, 100); ban.mesh.position.set(0, TIER[0].h + 3.1, -1);
  ban.draw((c, w, h) => { c.fillStyle = '#000b'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd93d'; c.font = 'bold 58px sans-serif'; c.textAlign = 'center'; c.fillText((CR + ' ' + label).slice(0, 26), w / 2, 70); });
  // confetti
  const fxs = createFx(P1.fx, S.root, mid, total, W);
  let t = 0, ended = false, cheerT = 0;
  const reveal = () => { fxs.show(true); win.forEach(id => W.emote(id, vp(id))); top.slice(1).flat().forEach(id => W.emote(id, 'wiggle')); rest.forEach(id => W.emote(id, 'sad')); W.shake(.15, .3); };
  S.after(1.3, reveal);
  S.anim((dt, tt) => {
    t += dt;
    if (t > 1.3 && (cheerT -= dt) <= 0) { cheerT = 2.6; if (t > 1.5) win.forEach(id => W.emote(id, vp(id))); }
    if (t > 1.4) W.setCam([mid + Math.sin(tt * .5) * 1.4, 4.2, dist], [mid, 1.9, 0]);
    fxs.update(dt, tt, t > 1.4);
  });
  const end = () => { if (ended) return; ended = true; S.cleanup(); o.onEnd?.(); };
  S.after(o.secs ?? 4, end);
  return { end };
}
