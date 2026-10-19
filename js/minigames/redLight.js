import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { arena } from './arena.js';
// Cross the field to the finish line. GREEN = run, RED = freeze (moving on red sends you back to the start).
export default {
  name: 'Red Light, Green Light', desc: 'Run to the white line! On RED you must stand still - moving sends you back to the start. First across wins. WASD to move.',
  create(ctx) {
    const A = arena(ctx, { radius: 11 }), { ids, st } = A, host = ctx.isHost, W = ctx.world, bg = W.scene.background.clone();
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const line = new THREE.Mesh(new THREE.BoxGeometry(14, .05, .4), new THREE.MeshBasicMaterial({ color: 0xffffff })); line.position.set(0, .05, -8); W.scene.add(line);
    ids.forEach((id, k) => { st[id].x = -5 + 10 * (k + .5) / ids.length; st[id].z = 8.5; });
    const home = {}; ids.forEach(id => home[id] = st[id].x);
    let red = false, phaseT = 2.5, grace = 0, fin = [], time = 0, acc = 0, over = false, back = 0, prevBack = 0, prevRed = false;
    const pack = () => ({ p: A.pack(), r: red ? 1 : 0, f: fin, b: back });
    let snap = pack();
    function step(dt) {
      time += dt; A.move(dt); phaseT -= dt;
      if (phaseT <= 0) { red = !red; if (red) { phaseT = 1.4 + Math.random() * 1.6; grace = .4; } else phaseT = 1.8 + Math.random() * 2.5; }
      if (red) grace -= dt;
      for (const id of ids) {
        const s = st[id]; if (fin.includes(id)) { s.ix = s.iz = 0; s.sp = 0; continue; }
        if (red && grace <= 0 && Math.abs(s.ix) + Math.abs(s.iz) > .1) { s.x = home[id]; s.z = 8.5; back++; }
        else if (s.z < -8) fin.push(id);
      }
      if (fin.length >= ids.length || time > 50) { over = true; snap = pack(); ctx.send(snap); ctx.finish([...fin, ...ids.filter(id => !fin.includes(id)).sort((a, b) => st[a].z - st[b].z)]); }
    }
    return {
      update(dt) {
        A.input();
        if (host) { if (!over) step(dt); snap = pack(); if ((acc += dt) >= .05) { acc = 0; ctx.send(snap); } }
        A.show(snap.p);
        if (snap.b > prevBack) sfx('lose'); prevBack = snap.b; if (!!snap.r !== prevRed) { prevRed = !!snap.r; sfx(snap.r ? 'hit' : 'go'); }
        W.scene.background.set(snap.r ? 0xd96b6b : 0x87ceeb);
        el.innerHTML = `<h2 style="background:${snap.r ? '#e74c3c' : '#2ecc71'};border-radius:10px;padding:6px 20px">${snap.r ? '🛑 RED - FREEZE' : '🟢 GREEN - RUN'}</h2><div>Finished: ${snap.f.length}/${ids.length}</div>`;
      },
      onMessage(m, from) { if (A.onInput(m, from)) return; if (!host && m.p) snap = m; },
      cleanup() { A.cleanup(); W.scene.remove(line); W.scene.background.copy(bg); el.remove(); },
    };
  },
};
