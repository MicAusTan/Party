import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { arena } from './arena.js';
import { topDown } from './kit.js';
const N = 12, T = 1.7, TIME = 30, RAD = 10.4;
export default {
  name: 'Paint Rush', desc: 'Run over floor tiles to paint them your colour! Rivals can paint over yours. After 30 seconds the most tiles wins. WASD to move, F / Shift / click shoves rivals so you can steal their spots.',
  create(ctx) {
    const W = ctx.world, ids = Object.keys(ctx.players), host = ctx.isHost, me = ctx.me;
    const A = arena(ctx, { shove: true, disc: false, radius: 11.2, set: { ...topDown(W, 13.5, 21), sky: 0x20184a, fog: { color: 0x20184a, near: 55, far: 130 }, light: 1.1, sun: { intensity: 1, pos: [6, 16, 8] } } }), S = A.S, st = A.st;
    S.cyl(90, 90, .5, 0x120c2e, 0, -1.4, 0, { seg: 40 }); S.cyl(13.6, 13.9, .6, 0x3a2f7a, 0, -.7, 0, { seg: 40 });
    const tiles = [], inside = [], base = new THREE.Color(0x4a3f96), alt = new THREE.Color(0x544aa6);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const x = (c - (N - 1) / 2) * T, z = (r - (N - 1) / 2) * T, ok = Math.hypot(x, z) <= RAD;
      inside.push(ok);
      const m = S.box(T - .1, .25, T - .1, ((r + c) % 2 ? alt : base).getHex(), x, -.3, z);
      m.visible = ok; tiles.push(m);
    }
    const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
    const own = Array(N * N).fill(-1);
    let time = TIME, acc = 0, over = false, snap = { p: {}, o: own.map(() => '-').join(''), t: TIME }, shown = '', prevMine = 0, sndT = 0;
    const cell = v => Math.max(0, Math.min(N - 1, Math.round(v / T + (N - 1) / 2)));
    const pack = () => ({ p: A.pack(), o: own.map(v => v < 0 ? '-' : v.toString(36)).join(''), t: +time.toFixed(1) });
    const counts = o => { const c = ids.map(() => 0); for (const ch of o) if (ch !== '-') c[parseInt(ch, 36)]++; return c; };
    function step(dt) {
      A.bots(dt, (id, s, sk) => {
        if (!s.goal || Math.hypot(s.goal.x - s.x, s.goal.z - s.z) < .6 || (s.gt -= dt) <= 0) {
          let best = null, bd = 1e9;
          for (let i = 0; i < N * N; i++) {
            if (!inside[i] || own[i] === idx[id]) continue;
            const x = (i % N - (N - 1) / 2) * T, z = (Math.floor(i / N) - (N - 1) / 2) * T, d = Math.hypot(x - s.x, z - s.z) + Math.random() * (7 - 5 * sk);
            if (d < bd) { bd = d; best = { x, z }; }
          }
          s.goal = best || { x: 0, z: 0 }; s.gt = 1.2;
        }
        return [s.goal.x - s.x, s.goal.z - s.z];
      });
      A.move(dt);
      for (const id of ids) { const s = st[id]; if (!s || s.out) continue; const i = cell(s.z) * N + cell(s.x); if (inside[i]) own[i] = idx[id]; }
      if ((time -= dt) <= 0) {
        over = true; snap = pack(); ctx.send(snap);
        const c = counts(snap.o); ctx.finish([...ids].sort((a, b) => c[idx[b]] - c[idx[a]]));
      }
    }
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const tmp = new THREE.Color();
    return {
      update(dt) {
        A.input(); if (host) { if (!over) step(dt); snap = pack(); if ((acc += dt) >= .06) { acc = 0; ctx.send(snap); } }
        A.show(snap.p);
        if (snap.o !== shown) {
          for (let i = 0; i < N * N; i++) {
            if (shown && snap.o[i] === shown[i]) continue;
            const ch = snap.o[i], m = tiles[i];
            if (ch === '-') m.material.color.set(((Math.floor(i / N) + i % N) % 2 ? alt : base).getHex());
            else { tmp.set(ctx.players[ids[parseInt(ch, 36)]].color); m.material.color.copy(tmp); m.position.y = .02; }
          }
          shown = snap.o;
        }
        for (let i = 0; i < N * N; i++) if (tiles[i].position.y > -.175) tiles[i].position.y = Math.max(-.175, tiles[i].position.y - dt * .5);
        const c = counts(snap.o), mine = c[idx[me]] ?? 0;
        if (mine > prevMine && (sndT -= dt) <= 0) { sfx('step'); sndT = .1; } else sndT -= dt; prevMine = mine;
        const tot = c.reduce((a, b) => a + b, 0) || 1;
        el.innerHTML = `<h2>${Math.max(0, Math.ceil(snap.t))}</h2>` + ids.map(id => `<div class="bar"><span style="width:${Math.round(c[idx[id]] / tot * 100)}%;background:${ctx.players[id].color}"></span><b>${ctx.esc(ctx.players[id].name)} ${c[idx[id]]}</b></div>`).join('');
      },
      onMessage(m, from) { if (A.onInput(m, from)) return; if (!host && m.p) snap = m; },
      cleanup() { A.cleanup(); el.remove(); },
    };
  },
};
