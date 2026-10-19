import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { arena } from './arena.js';
const G = 6, S = 3.6, H = G * S / 2;
export default {
  name: 'Color Floor', desc: 'Tiles flash red, then vanish! Keep moving and stay on solid ground. Last one standing wins. WASD to move.',
  create(ctx) {
    const A = arena(ctx, { disc: false, radius: 10.5 }), { ids, st } = A, host = ctx.isHost, W = ctx.world, fall = {}, was = {}, tiles = [];
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    for (let i = 0; i < G * G; i++) {
      const base = (i + (i / G | 0)) % 2 ? 0x4aa3ff : 0x74b9ff;
      const m = new THREE.Mesh(new THREE.BoxGeometry(S - .15, .4, S - .15), new THREE.MeshStandardMaterial({ color: base, flatShading: true }));
      m.position.set(-H + S * (i % G + .5), -.2, -H + S * ((i / G | 0) + .5)); m.userData.base = base; W.scene.add(m); tiles.push(m);
    }
    const ts = Array(G * G).fill(1), warn = Array(G * G).fill(0); let time = 0, spawnT = 2, out = [], acc = 0, over = false, lt = 0;
    const tileAt = (x, z) => { const cx = Math.floor((x + H) / S), cz = Math.floor((z + H) / S); return cx < 0 || cx >= G || cz < 0 || cz >= G ? -1 : cz * G + cx; };
    const pack = () => ({ p: A.pack(), t: ts.join('') });
    let snap = pack();
    function step(dt) {
      time += dt; A.move(dt);
      if ((spawnT -= dt) <= 0) {
        spawnT = Math.max(.8, 2.2 - time * .04); const free = ts.map((v, i) => v === 1 ? i : -1).filter(i => i >= 0);
        for (let n = 0; n < 2 + (time / 12 | 0) && free.length; n++) { const k = free.splice(Math.random() * free.length | 0, 1)[0]; ts[k] = 2; warn[k] = 1.6; }
      }
      for (let i = 0; i < ts.length; i++) if (ts[i] === 2 && (warn[i] -= dt) <= 0) ts[i] = 0;
      for (const id of ids) { const s = st[id]; if (!s.alive) continue; const i = tileAt(s.x, s.z); if (i < 0 || ts[i] === 0) { s.alive = false; out.push(id); } }
      const al = ids.filter(id => st[id].alive);
      if (al.length <= (ids.length > 1 ? 1 : 0) || time > 90) { over = true; ctx.send(pack()); ctx.finish([...al, ...out.reverse()]); }
    }
    return {
      update(dt) {
        A.input(); lt += dt;
        if (host) { if (!over) step(dt); snap = pack(); if ((acc += dt) >= .05) { acc = 0; ctx.send(snap); } }
        A.show(snap.p); let n = 0;
        for (const id of ids) {
          const q = snap.p[id], g = W.m.get(id)?.g; if (q[2]) n++;
          if (!q[2] && g) { g.visible = true; fall[id] = (fall[id] || 0) + 30 * dt; g.position.y = Math.max(-40, g.position.y - fall[id] * dt); }
          if (was[id] && !q[2]) sfx('fall'); was[id] = q[2];
        }
        tiles.forEach((m, i) => { const c = snap.t[i]; m.visible = c !== '0'; m.material.color.set(c === '2' ? (Math.sin(lt * 20) > 0 ? 0xff3b30 : 0xffffff) : m.userData.base); });
        el.innerHTML = `<h3>Alive: ${n}/${ids.length}</h3>`;
      },
      onMessage(m, from) { if (A.onInput(m, from)) return; if (!host && m.p) snap = m; },
      cleanup() { tiles.forEach(m => W.scene.remove(m)); ids.forEach(id => { const g = W.m.get(id)?.g; if (g) g.position.y = 0; }); A.cleanup(); el.remove(); },
    };
  },
};
