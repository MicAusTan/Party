import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { arena } from './arena.js';
import { topDown } from './kit.js';
// Set: a sunny field with a giant guard robot at the finish line. On GREEN it faces away; on RED it spins round with glowing eyes and the
// sky flushes red. Traffic lights on both sides repeat the signal.
// Cross the field to the finish line. GREEN = run, RED = freeze (moving on red sends you back to the start).
export default {
  name: 'Red Light, Green Light', desc: 'Run to the white line! On RED you must stand still - moving sends you back to the start. First across wins. WASD to move.',
  create(ctx) {
    const W = ctx.world, A = arena(ctx, { radius: 11, set: { ...topDown(W, 13.5, 22, [0, 0, -1]), sky: 0x87ceeb, light: 1.15, sun: { intensity: 1.2, pos: [6, 16, 8] } } }), { ids, st, S } = A, host = ctx.isHost;
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const line = new THREE.Mesh(new THREE.BoxGeometry(14, .05, .4), new THREE.MeshBasicMaterial({ color: 0xffffff })); line.position.set(0, .05, -8); S.root.add(line);
    S.box(70, .5, 60, 0x6fbf4a, 0, -.5, -4); S.box(24, .04, 22, 0x86d05a, 0, 0, 0); S.box(24, .05, .3, 0xffffff, 0, .02, 9.8);
    for (let k = -2; k <= 2; k++) for (let j = 0; j < 7; j++) S.box(.1, .03, 1.4, 0xffffff, k * 4.4, .03, -6.5 + j * 2.4);                                                                  // lane dashes
    for (let k = 0; k < 9; k++) { const x = -14 + k * 3.5; S.box(.2, 1.4, .2, 0x8a6a3a, x, 0, 11.5); S.box(.2, 1.4, .2, 0x8a6a3a, x, 0, -13.5); } S.box(31, .15, .15, 0x8a6a3a, 0, .9, 11.5); S.box(31, .15, .15, 0x8a6a3a, 0, .9, -13.5);
    S.box(3.6, 3.2, 2.4, 0x9aa3b2, 0, 0, -12.3); S.box(.9, 1.2, .9, 0x6b7280, -1, 0, -12.3); S.box(.9, 1.2, .9, 0x6b7280, 1, 0, -12.3); S.box(4.4, .5, 2.8, 0x6b7280, 0, 3.2, -12.3);
    const headG = new THREE.Group(); headG.position.set(0, 5.2, -12.3); S.root.add(headG); S.sph(1.35, 0xcfd6e0, 0, 0, 0, { p: headG }); S.box(1.9, .5, .3, 0x222831, 0, .1, 1.15, { p: headG });
    const eyes = [-.5, .5].map(x => S.sph(.2, 0x330000, x, .2, 1.25, { p: headG, basic: true, seg: 8 })); S.cyl(.06, .06, .8, 0x6b7280, 0, 1.3, 0, { p: headG }); const bulb = S.sph(.2, 0xff3b30, 0, 2.2, 0, { p: headG, basic: true, seg: 8 });
    const lamps = [-1, 1].map(sd => { S.cyl(.12, .14, 5, 0x333333, sd * 9.5, 0, -8.5, { seg: 6 }); S.box(1, 2.2, .8, 0x1a1a1a, sd * 9.5, 5, -8.5); return [S.sph(.32, 0xff3b30, sd * 9.5, 6, -8.1, { basic: true, seg: 8 }), S.sph(.32, 0x2ecc71, sd * 9.5, 5.2, -8.1, { basic: true, seg: 8 })]; });
    ids.forEach((id, k) => { st[id].x = -5 + 10 * (k + .5) / ids.length; st[id].z = 8.5; });
    const home = {}; ids.forEach(id => home[id] = st[id].x);
    let red = false, phaseT = 2.5, grace = 0, fin = [], time = 0, acc = 0, over = false, back = 0, prevBack = 0, prevRed = false;
    const pack = () => ({ p: A.pack(), r: red ? 1 : 0, f: fin, b: back });
    let snap = pack();
    function step(dt) {
      time += dt; phaseT -= dt;
      A.bots(dt, (id, s, sk) => red || fin.includes(id) ? null : [(home[id] - s.x) * .2, -1]);
      A.move(dt);
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
        headG.rotation.y += ((snap.r ? 0 : Math.PI) - headG.rotation.y) * Math.min(1, dt * 9); eyes.forEach(e => e.material.color.setHex(snap.r ? 0xff2020 : 0x330000)); bulb.material.color.setHex(snap.r ? 0xff3b30 : 0x2ecc71);
        lamps.forEach(([r, g]) => { r.material.color.setHex(snap.r ? 0xff3b30 : 0x3a0f0f); g.material.color.setHex(snap.r ? 0x0f3a1a : 0x2ecc71); });
        el.innerHTML = `<h2 style="background:${snap.r ? '#e74c3c' : '#2ecc71'};border-radius:10px;padding:6px 20px">${snap.r ? '🛑 RED - FREEZE' : '🟢 GREEN - RUN'}</h2><div>Finished: ${snap.f.length}/${ids.length}</div>`;
      },
      onMessage(m, from) { if (A.onInput(m, from)) return; if (!host && m.p) snap = m; },
      cleanup() { A.cleanup(); el.remove(); },
    };
  },
};
