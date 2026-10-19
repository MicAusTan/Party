import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { arena } from './arena.js';
import { teams } from './util.js';
// TEAM capture the flag: grab the center flag and carry it to your base (red = left, blue = right).
// Touching an enemy carrier sends the flag back to the center and stuns them. First to 3 captures.
const BASE = [{ x: -9, z: 0 }, { x: 9, z: 0 }];
export default {
  name: 'Flag Rush', desc: 'TEAM GAME! Grab the center flag and carry it to your base (🔴 left / 🔵 right). Touch an enemy carrier to knock the flag loose. First to 3! WASD to move.',
  create(ctx) {
    const team = teams(ctx), A = arena(ctx), { ids, st } = A, host = ctx.isHost, W = ctx.world;
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const mk = (col, x, z, r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .06, 20), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5 })); m.position.set(x, .06, z); W.scene.add(m); return m; };
    const objs = [mk(0xe74c3c, BASE[0].x, 0, 2.5), mk(0x3498db, BASE[1].x, 0, 2.5)];
    const flagM = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.2, 4), new THREE.MeshBasicMaterial({ color: 0xffd93d })); W.scene.add(flagM); objs.push(flagM);
    const cnt = [0, 0]; ids.forEach(id => { const t = team(id), n = ids.filter(k => team(k) === t).length, k = cnt[t]++; st[id].x = t ? 6 : -6; st[id].z = (k - (n - 1) / 2) * 2.5; });
    const stun = {}; ids.forEach(id => stun[id] = 0);
    let flag = { x: 0, z: 0, by: null }, score = [0, 0], time = 0, acc = 0, over = false, ev = [0, 0], prevEv = [0, 0], lt = 0;
    const pack = () => ({ p: A.pack(), f: [+flag.x.toFixed(2), +flag.z.toFixed(2), flag.by], s: score, e: ev });
    let snap = pack();
    function step(dt) {
      time += dt;
      for (const id of ids) { stun[id] -= dt; st[id].sp = stun[id] > 0 ? 0 : id === flag.by ? .85 : 1; }
      A.move(dt);
      if (flag.by) {
        const c = st[flag.by], t = team(flag.by); flag.x = c.x; flag.z = c.z;
        const tagger = ids.find(id => team(id) !== t && stun[id] <= 0 && Math.hypot(st[id].x - c.x, st[id].z - c.z) < 1.1);
        if (tagger) { stun[flag.by] = 1.2; flag = { x: 0, z: 0, by: null }; ev[0]++; }
        else if (Math.hypot(c.x - BASE[t].x, c.z - BASE[t].z) < 2.5) { score[t]++; flag = { x: 0, z: 0, by: null }; ev[1]++; }
      } else { const g = ids.find(id => stun[id] <= 0 && Math.hypot(st[id].x - flag.x, st[id].z - flag.z) < 1.2); if (g) flag.by = g; }
      if (score[0] >= 3 || score[1] >= 3 || time > 50) {
        over = true; snap = pack(); ctx.send(snap); const w = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
        const pl = [...ids].sort((a, b) => (team(b) === w) - (team(a) === w)); ctx.finish(pl, pl.map(id => w < 0 ? 1 : team(id) === w ? 0 : 2));
      }
    }
    return {
      update(dt) {
        A.input(); lt += dt;
        if (host) { if (!over) step(dt); snap = pack(); if ((acc += dt) >= .05) { acc = 0; ctx.send(snap); } }
        A.show(snap.p);
        if (snap.e[0] > prevEv[0]) sfx('hit'); if (snap.e[1] > prevEv[1]) sfx('star'); prevEv = [...snap.e];
        const g = snap.f[2] && W.m.get(snap.f[2])?.g; flagM.position.set(g ? g.position.x : snap.f[0], g ? 2.6 + Math.sin(lt * 6) * .1 : 1 + Math.sin(lt * 3) * .15, g ? g.position.z : snap.f[1]); flagM.rotation.y += dt * 3;
        const mine = team(ctx.me), names = t => ids.filter(id => team(id) === t).map(id => ctx.esc(ctx.players[id].name)).join(', ');
        el.innerHTML = `<h3>🔴 ${snap.s[0]} - ${snap.s[1]} 🔵</h3><div style="font-size:13px">🔴 ${names(0)}<br>🔵 ${names(1)}</div><div>You: ${mine ? '🔵 Blue (base right)' : '🔴 Red (base left)'}</div>`;
      },
      onMessage(m, from) { if (A.onInput(m, from)) return; if (!host && m.p) snap = m; },
      cleanup() { A.cleanup(); objs.forEach(m => W.scene.remove(m)); el.remove(); },
    };
  },
};
