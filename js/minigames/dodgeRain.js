import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { arena } from './arena.js';
export default {
  name: 'Dodge Rain', desc: 'Red circles mark where boulders land. Stay out of them! Last one standing wins. WASD to move.',
  create(ctx) {
    const A = arena(ctx), { ids, st } = A, host = ctx.isHost, W = ctx.world, rings = [], was = {};
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    let hz = [], out = [], time = 0, spawnT = 1, acc = 0, over = false;
    const pack = () => ({ p: A.pack(), h: hz.map(h => [+h.x.toFixed(2), +h.z.toFixed(2), +h.t.toFixed(2), h.r]) });
    let snap = pack();
    function step(dt) {
      time += dt; A.move(dt);
      if ((spawnT -= dt) <= 0) {
        spawnT = Math.max(.25, .9 - time * .015);
        const al = ids.filter(id => st[id].alive), tg = al.length && Math.random() < .5 ? st[al[Math.random() * al.length | 0]] : null, a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 10.5;
        hz.push({ x: tg ? tg.x + (Math.random() - .5) * 3 : Math.sin(a) * r, z: tg ? tg.z + (Math.random() - .5) * 3 : Math.cos(a) * r, t: 1.2, r: 1.8 });
      }
      hz = hz.filter(h => {
        if ((h.t -= dt) > 0) return true;
        for (const id of ids) { const s = st[id]; if (s.alive && Math.hypot(s.x - h.x, s.z - h.z) < h.r + .4) { s.alive = false; out.push(id); } }
        return false;
      });
      const al = ids.filter(id => st[id].alive);
      if (al.length <= (ids.length > 1 ? 1 : 0) || time > 60) { over = true; ctx.send(pack()); ctx.finish([...al, ...out.reverse()]); }
    }
    return {
      update(dt) {
        A.input();
        if (host) { if (!over) step(dt); snap = pack(); if ((acc += dt) >= .05) { acc = 0; ctx.send(snap); } }
        A.show(snap.p); let n = 0;
        for (const id of ids) {
          const q = snap.p[id]; if (q[2]) n++;
          if (was[id] && !q[2]) { sfx('fall'); W.burst(q[0], 1, q[1], '#ff3b30', 20); } was[id] = q[2];
        }
        while (rings.length < snap.h.length) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .05, 20), new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true })); W.scene.add(m); rings.push(m); }
        rings.forEach((m, i) => { const h = snap.h[i]; m.visible = !!h; if (h) { m.position.set(h[0], .05, h[1]); m.scale.set(h[3], 1, h[3]); m.material.opacity = .2 + .55 * (1 - h[2] / 1.2); } });
        el.innerHTML = `<h3>Alive: ${n}/${ids.length}</h3>`;
      },
      onMessage(m, from) { if (A.onInput(m, from)) return; if (!host && m.p) snap = m; },
      cleanup() { A.cleanup(); rings.forEach(m => W.scene.remove(m)); el.remove(); },
    };
  },
};
