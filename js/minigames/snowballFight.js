import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { arena } from './arena.js';
export default {
  name: 'Snowball Fight', desc: 'Throw snowballs with SPACE in the direction you\'re facing (move to aim). 3 hits and you\'re out. Last one standing wins. WASD to move.',
  create(ctx) {
    const A = arena(ctx), { ids, st } = A, host = ctx.isHost, W = ctx.world, bm = [], was = {}, hpPrev = {};
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const hp = {}, cd = {}; ids.forEach(id => { hp[id] = 3; cd[id] = 0; st[id].fx = 0; st[id].fz = -1; st[id].fire = false; });
    let balls = [], out = [], time = 0, acc = 0, over = false;
    const kd = e => { if (e.code === 'Space' && !e.repeat) host ? st[ctx.me] && (st[ctx.me].fire = true) : ctx.send({ f: 1 }); };
    addEventListener('keydown', kd);
    const pack = () => ({ p: A.pack(), b: balls.map(b => [+b.x.toFixed(2), +b.z.toFixed(2)]), h: hp });
    let snap = pack();
    function step(dt) {
      time += dt; A.move(dt);
      for (const id of ids) {
        const s = st[id]; if (!s.alive) continue; cd[id] -= dt;
        if (Math.hypot(s.ix, s.iz) > .1) { s.fx = s.ix; s.fz = s.iz; }
        if (s.fire && cd[id] <= 0) { cd[id] = .5; balls.push({ o: id, x: s.x + s.fx, z: s.z + s.fz, vx: s.fx * 16, vz: s.fz * 16, t: 1.3 }); }
        s.fire = false;
      }
      balls = balls.filter(b => {
        b.x += b.vx * dt; b.z += b.vz * dt; if ((b.t -= dt) <= 0 || Math.hypot(b.x, b.z) > 12.5) return false;
        for (const id of ids) { const s = st[id]; if (s.alive && id !== b.o && Math.hypot(s.x - b.x, s.z - b.z) < .8) { if (--hp[id] <= 0) { s.alive = false; out.push(id); } return false; } }
        return true;
      });
      const al = ids.filter(id => st[id].alive);
      if (al.length <= (ids.length > 1 ? 1 : 0) || time > 60) { over = true; ctx.send(pack()); ctx.finish([...al, ...out.reverse()]); }
    }
    return {
      update(dt) {
        A.input();
        if (host) { if (!over) step(dt); snap = pack(); if ((acc += dt) >= .05) { acc = 0; ctx.send(snap); } }
        A.show(snap.p);
        for (const id of ids) {
          const q = snap.p[id]; if (hpPrev[id] > snap.h[id]) { sfx('hit'); W.burst(q[0], 1, q[1], '#ffffff', 12); } hpPrev[id] = snap.h[id];
          if (was[id] && !q[2]) sfx('fall'); was[id] = q[2];
        }
        while (bm.length < snap.b.length) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 0), new THREE.MeshBasicMaterial({ color: 0xffffff })); W.scene.add(m); bm.push(m); }
        bm.forEach((m, i) => { const b = snap.b[i]; m.visible = !!b; if (b) m.position.set(b[0], 1, b[1]); });
        el.innerHTML = ids.map(id => `<div style="color:${ctx.players[id].color}">${ctx.esc(ctx.players[id].name)} ${'❤'.repeat(Math.max(0, snap.h[id]))}</div>`).join('');
      },
      onMessage(m, from) { if (A.onInput(m, from)) return; if (host) { if (m.f && st[from]) st[from].fire = true; } else if (m.p) snap = m; },
      cleanup() { removeEventListener('keydown', kd); A.cleanup(); bm.forEach(m => W.scene.remove(m)); el.remove(); },
    };
  },
};
