import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { arena } from './arena.js';
export default {
  name: 'Hot Potato', desc: 'Don\'t be holding the potato when it blows! Touch someone to pass it on. WASD to move.',
  create(ctx) {
    const A = arena(ctx), { ids, st } = A, host = ctx.isHost, W = ctx.world, was = {};
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const potato = new THREE.Mesh(new THREE.IcosahedronGeometry(.45, 0), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); W.scene.add(potato);
    let holder = host ? ids[Math.random() * ids.length | 0] : null, fuse = 4 + Math.random() * 4, cool = 1, out = [], time = 0, acc = 0, over = false, lt = 0, prevH = null;
    const pack = () => ({ p: A.pack(), h: holder, f: +fuse.toFixed(1) });
    let snap = pack();
    function step(dt) {
      time += dt; cool -= dt; fuse -= dt;
      for (const id of ids) st[id].sp = id === holder ? 1.1 : .95;
      A.move(dt);
      if (cool <= 0) { const h = st[holder]; for (const id of ids) if (id !== holder && st[id].alive && Math.hypot(h.x - st[id].x, h.z - st[id].z) < 1.3) { holder = id; cool = .9; break; } }
      if (fuse <= 0) {
        st[holder].alive = false; out.push(holder);
        const al = ids.filter(id => st[id].alive);
        if (al.length <= (ids.length > 1 ? 1 : 0)) { over = true; snap = pack(); ctx.send(snap); return ctx.finish([...al, ...out.reverse()]); }
        holder = al[Math.random() * al.length | 0]; fuse = 4 + Math.random() * 4; cool = 1.2;
      }
      if (time > 90) { over = true; const al = ids.filter(id => st[id].alive); ctx.finish([...al, ...out.reverse()]); }
    }
    return {
      update(dt) {
        A.input(); lt += dt;
        if (host) { if (!over) step(dt); snap = pack(); if ((acc += dt) >= .05) { acc = 0; ctx.send(snap); } }
        A.show(snap.p);
        for (const id of ids) { const q = snap.p[id]; if (was[id] && !q[2]) { sfx('fall'); W.burst(q[0], 1, q[1], '#ff9f1a', 30); } was[id] = q[2]; }
        if (snap.h !== prevH) { if (prevH) sfx('click'); prevH = snap.h; }
        const g = W.m.get(snap.h)?.g; potato.visible = !!g && !!snap.p[snap.h]?.[2];
        if (g) { potato.position.set(g.position.x, 2.7 + Math.sin(lt * 8) * .1, g.position.z); potato.material.color.set(Math.sin(lt * 25 / (snap.f + 1)) > 0 ? 0xff3b30 : 0xffd93d); }
        el.innerHTML = `<h3>🥔 ${ctx.esc(ctx.players[snap.h]?.name ?? '')} has it!</h3><div>Alive: ${ids.filter(id => snap.p[id][2]).length}/${ids.length}</div>`;
      },
      onMessage(m, from) { if (A.onInput(m, from)) return; if (!host && m.p) snap = m; },
      cleanup() { A.cleanup(); W.scene.remove(potato); el.remove(); },
    };
  },
};
