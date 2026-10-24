import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { stage } from './stage.js';
import { driveBots } from './arena.js';
import { topDown, ringPts } from './kit.js';
// Set: a pirate cove. A sandy island in a bright lagoon with palm trees, treasure chests on the rim, rocks and a bobbing ship in the distance.
// Real-time: host simulates movement + coins; clients send input, render snapshots.
const TAU = Math.PI * 2;
export default {
  name: 'Coin Grab', desc: 'Grab as many coins as you can in 25 seconds! WASD to move. Gold coins are worth 3.',
  create(ctx) {
    const W = ctx.world, ids = Object.keys(ctx.players), host = ctx.isHost, held = {}, cm = [];
    const S = stage(ctx, { ...topDown(W, 13.5, 21), sky: 0x6ec6e8, fog: { color: 0x6ec6e8, near: 55, far: 130 }, light: 1.2, sun: { intensity: 1.2, pos: [6, 16, 8] } }); let first = true;
    S.cyl(70, 70, .5, 0x1fa6d6, 0, -1.2, 0, { seg: 40 }); S.cyl(14.2, 14.5, .5, 0xd7c58a, 0, -.8, 0, { seg: 36 }); S.cyl(12.4, 12.9, .5, 0xf0dca0, 0, -.5, 0, { seg: 36 });
    const surf = S.cyl(15.6, 15.6, .05, 0xffffff, 0, -.55, 0, { seg: 36, op: .3 }); S.anim((dt, tn) => { const u = (Math.sin(tn * 1.6) + 1) / 2; surf.scale.setScalar(.94 + u * .1); surf.material.opacity = .15 + u * .25; });
    ringPts(6, 12.7, .3).forEach(([x, z], k) => { S.cyl(.22, .32, 3.4, 0x8a6a3a, x, 0, z, { seg: 6 }); for (let j = 0; j < 6; j++) { const a = j / 6 * 6.283; S.cone(.32, 2.6, 0x2f9a3c, x + Math.sin(a) * .9, 3.2, z + Math.cos(a) * .9, { seg: 4 }).rotation.set(Math.cos(a) * 1.1, 0, -Math.sin(a) * 1.1); } });         // palm trees
    ringPts(4, 13.2, .9).forEach(([x, z, a]) => { S.box(1.3, .7, .9, 0x8a5a2b, x, 0, z, { ry: a }); S.box(1.3, .35, .9, 0xa0692e, x, .7, z, { ry: a }); S.box(1.34, .12, .2, 0xffd93d, x, .45, z, { ry: a, em: 0x665500 }); S.sph(.3, 0xffd93d, x, 1.3, z, { basic: true, seg: 6 }); });       // chests
    ringPts(10, 24, .2).forEach(([x, z], k) => S.sph(1.4 + k % 3 * .9, 0x7a7f88, x, -.3, z, { seg: 6 }));
    const ship = new THREE.Group(); ship.position.set(-27, -.6, -17); ship.rotation.y = .6; S.root.add(ship);
    S.box(8, 1.6, 3.4, 0x6b4a2b, 0, 0, 0, { p: ship }); S.cone(1.7, 2.6, 0x6b4a2b, 4.9, 0, 0, { p: ship, seg: 4 }).rotation.z = -Math.PI / 2; S.cyl(.2, .25, 9, 0x4a2f1a, 0, 1.6, 0, { p: ship, seg: 6 }); S.box(.12, 5, 4, 0xffffff, .4, 3.6, 0, { p: ship }); S.box(.1, .9, 1.4, 0x111111, 0, 10.4, 0, { p: ship });
    S.anim((dt, tn) => { ship.position.y = -.6 + Math.sin(tn * 1.1) * .25; ship.rotation.z = Math.sin(tn * .9) * .05; });
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const st = {}, score = {}; ids.forEach((id, k) => { const a = k / ids.length * TAU; st[id] = { x: Math.sin(a) * 4, z: Math.cos(a) * 4, ix: 0, iz: 0 }; score[id] = 0; });
    let coins = [], time = 25, spawnT = 0, acc = 0, lastIn = '', prevMine = 0, over = false, snap = { p: {}, c: [], s: score, t: 25 };
    const kd = e => { held[e.code] = true; }, ku = e => { held[e.code] = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    const vec = () => {
      const x = (held.KeyD || held.ArrowRight ? 1 : 0) - (held.KeyA || held.ArrowLeft ? 1 : 0), z = (held.KeyS || held.ArrowDown ? 1 : 0) - (held.KeyW || held.ArrowUp ? 1 : 0), l = Math.hypot(x, z) || 1;
      return { x: x / l, z: z / l };
    };
    const pack = () => { const p = {}; ids.forEach(id => p[id] = [+st[id].x.toFixed(2), +st[id].z.toFixed(2)]); return { p, c: coins.map(c => [+c.x.toFixed(2), +c.z.toFixed(2), c.v]), s: score, t: +time.toFixed(1) }; };
    function step(dt) {
      driveBots(ctx, st, dt, (id, s, sk) => { let best = null, bd = 1e9; for (const c of coins) { const d = Math.hypot(c.x - s.x, c.z - s.z) - (c.v > 1 ? 2 + 4 * sk : 0); if (d < bd) { bd = d; best = c; } } return best ? [best.x - s.x, best.z - s.z] : [-s.x * .3, -s.z * .3]; });
      for (const id of ids) {
        const s = st[id]; s.x += s.ix * 8 * dt; s.z += s.iz * 8 * dt; const r = Math.hypot(s.x, s.z); if (r > 11.5) { s.x *= 11.5 / r; s.z *= 11.5 / r; }
      }
      if ((spawnT -= dt) <= 0 && coins.length < 8) { spawnT = .35; const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 10.5; coins.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, v: Math.random() < .15 ? 3 : 1 }); }
      coins = coins.filter(c => { for (const id of ids) if (Math.hypot(st[id].x - c.x, st[id].z - c.z) < 1.2) { score[id] += c.v; return false; } return true; });
      if ((time -= dt) <= 0) { over = true; snap = pack(); ctx.send(snap); ctx.finish([...ids].sort((a, b) => score[b] - score[a])); }
    }
    return {
      update(dt) {
        const v = vec();
        if (host) { st[ctx.me] && (st[ctx.me].ix = v.x, st[ctx.me].iz = v.z); if (!over) step(dt); snap = pack(); if ((acc += dt) >= .05) { acc = 0; ctx.send(snap); } }
        else { const k = v.x + ',' + v.z; if (k !== lastIn) { lastIn = k; ctx.send(v); } }
        for (const id of ids) { const q = snap.p[id]; if (q) (first ? W.warp : W.set).call(W, id, q[0], q[1]); } if (first && ids.some(id => snap.p[id])) first = false;
        while (cm.length < snap.c.length) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .15, 8), new THREE.MeshStandardMaterial({ flatShading: true })); m.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(m); S.root.add(g); cm.push(g); }
        cm.forEach((g, i) => {
          const c = snap.c[i]; g.visible = !!c; if (!c) return;
          g.position.set(c[0], .8, c[1]); g.rotation.y += dt * 4; g.scale.setScalar(c[2] > 1 ? 1.5 : 1); g.children[0].material.color.set(c[2] > 1 ? 0xff9f1a : 0xffd93d);
        });
        if (snap.s[ctx.me] > prevMine) sfx('coin'); prevMine = snap.s[ctx.me];
        el.innerHTML = `<h2>${Math.max(0, Math.ceil(snap.t))}</h2>` + ids.map(id => `<div class="bar"><span style="width:${Math.min(100, snap.s[id] * 3)}%;background:${ctx.players[id].color}"></span><b>${ctx.esc(ctx.players[id].name)} 🪙${snap.s[id]}</b></div>`).join('');
      },
      onMessage(m, from) {
        if (host) { const s = st[from]; if (s && m.x != null) { const x = +m.x || 0, z = +m.z || 0, l = Math.max(1, Math.hypot(x, z)); s.ix = x / l; s.iz = z / l; } }
        else if (m.p) snap = m;
      },
      cleanup() {
        removeEventListener('keydown', kd); removeEventListener('keyup', ku);
        S.cleanup(); el.remove();
      },
    };
  },
};
