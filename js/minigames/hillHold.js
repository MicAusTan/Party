import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { arena } from './arena.js';
// King of the hill: the zone moves every 7s. Only a player ALONE in the zone scores (2/s). Shove rivals out!
export default {
  name: 'Hill Hold', desc: 'Stand alone in the glowing zone to score. If two players share it, nobody scores! The zone moves. WASD to move.',
  create(ctx) {
    const A = arena(ctx), { ids, st } = A, host = ctx.isHost, W = ctx.world;
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, .06, 24), new THREE.MeshBasicMaterial({ color: 0xffd93d, transparent: true, opacity: .55 })); ring.position.y = .06; W.scene.add(ring);
    const score = {}; ids.forEach(id => score[id] = 0);
    let zone = { x: 0, z: 0, t: 7 }, time = 0, acc = 0, over = false, prev = 0, state = 0;
    const pack = () => ({ p: A.pack(), z: [+zone.x.toFixed(2), +zone.z.toFixed(2)], s: score, t: +time.toFixed(1), c: state });
    let snap = pack();
    function step(dt) {
      time += dt; A.move(dt); zone.t -= dt;
      const al = ids.filter(id => st[id].alive);
      for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {            // soft bumping so zone fights matter
        const a = st[al[i]], b = st[al[j]], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < 1.1 && d > .001) { const o = (1.1 - d) / 2 + .05; a.x -= dx / d * o; a.z -= dz / d * o; b.x += dx / d * o; b.z += dz / d * o; }
      }
      if (zone.t <= 0) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 8; zone = { x: Math.sin(a) * r, z: Math.cos(a) * r, t: 7 }; }
      const inside = ids.filter(id => Math.hypot(st[id].x - zone.x, st[id].z - zone.z) < 3);
      state = inside.length === 1 ? 1 : inside.length > 1 ? 2 : 0;
      if (inside.length === 1) score[inside[0]] += 2 * dt;
      if (time >= 40 || ids.some(id => score[id] >= 40)) { over = true; snap = pack(); ctx.send(snap); ctx.finish([...ids].sort((a, b) => score[b] - score[a])); }
    }
    return {
      update(dt) {
        A.input();
        if (host) { if (!over) step(dt); snap = pack(); if ((acc += dt) >= .05) { acc = 0; ctx.send(snap); } }
        A.show(snap.p); ring.position.x = snap.z[0]; ring.position.z = snap.z[1];
        ring.material.color.set(snap.c === 1 ? 0x2ecc71 : snap.c === 2 ? 0xff3b30 : 0xffd93d);
        const mine = Math.floor(snap.s[ctx.me]); if (mine > prev) sfx('click'); prev = mine;
        el.innerHTML = `<h2>${Math.max(0, Math.ceil(40 - snap.t))}</h2>` + ids.map(id => `<div class="bar"><span style="width:${Math.min(100, snap.s[id] / 40 * 100)}%;background:${ctx.players[id].color}"></span><b>${ctx.esc(ctx.players[id].name)} ${Math.floor(snap.s[id])}</b></div>`).join('');
      },
      onMessage(m, from) { if (A.onInput(m, from)) return; if (!host && m.p) snap = m; },
      cleanup() { A.cleanup(); W.scene.remove(ring); el.remove(); },
    };
  },
};
