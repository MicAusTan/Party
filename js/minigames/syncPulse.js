import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { stage } from './stage.js';
// CO-OP: a beat only counts if EVERY player hits it. Reward tier by number of full-team beats.
// Set: a neon dance floor seen from above. A ring shrinks onto the centre circle every beat; players stand around the edge and
// hop when they hit (hits are relayed to everyone). A circle of 24 lights around the floor shows each beat: green = whole team
// nailed it, red = someone missed, grey = still to come.
const T0 = 1.5, P = 1.1, N = 24, R0 = 2.2, TAU = Math.PI * 2;
export default {
  coop: true,
  name: 'Sync Pulse', desc: 'CO-OP! Everyone press SPACE (or click) as the ring shrinks onto the circle. A beat only counts if ALL players hit it!',
  create(ctx) {
    const ids = Object.keys(ctx.players), host = ctx.isHost, hits = Array.from({ length: N }, () => new Set()), mine = new Set(), n = ids.length, me = ctx.me, W = ctx.world;
    let time = 0, fb = '', over = false, acc = 0, ok = '', lastB = -1, fin = false, pulse = 0;
    const el = document.createElement('div'); el.className = 'mg'; el.innerHTML = '<h3 id="s"></h3>'; ctx.hud.append(el); const s = el.querySelector('#s');

    // ---------- the set ----------
    const S = stage(ctx, { sky: 0x0b0820, fog: { color: 0x0b0820, near: 30, far: 70 }, light: .85, sun: { intensity: .7, pos: [0, 14, 6] }, cam: { pos: [0, 14.5, 10.5], look: [0, 0, .6] }, camFrom: [0, 26, 18], camT: 1.4 });
    S.cyl(13, 13, .4, 0x161033, 0, -.4, 0, { seg: 48 }); S.cyl(10.4, 10.4, .05, 0x241a55, 0, 0, 0, { seg: 48 });
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; S.box(1.9, .06, 1.9, k % 2 ? 0x2b2070 : 0x1d1650, Math.sin(a) * 5.6, .05, -Math.cos(a) * 5.6, { ry: -a, em: k % 2 ? 0x0c0830 : 0 }); }     // floor tiles
    S.cyl(1.4, 1.4, .3, 0x2a2a5a, 0, 0, 0, { seg: 32 }); const orb = S.sph(.8, 0xffd93d, 0, 1.1, 0, { em: 0x886600 });
    const target = new THREE.Mesh(new THREE.RingGeometry(R0 - .12, R0, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); target.rotation.x = -Math.PI / 2; target.position.y = .38; S.root.add(target);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffd93d, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .4; S.root.add(ring);
    const lights = Array.from({ length: N }, (_, k) => { const a = k / N * TAU; return S.sph(.3, 0x555566, Math.sin(a) * 9.1, .35, -Math.cos(a) * 9.1, { basic: true, seg: 10 }); });
    ids.forEach((id, k) => { const a = k / n * TAU + Math.PI, x = Math.sin(a) * 7, z = -Math.cos(a) * 7; W.put(id, x, z, Math.atan2(-x, -z)); });
    const show = id => { W.hop(id, .5); const g = W.m.get(id)?.g; if (g) W.burst(g.position.x, 1, g.position.z, ctx.players[id].color, 6); };
    const end = () => { if (fin) return; fin = true; const c = [...ok].filter(v => v === '1').length, rk = c >= 20 ? 0 : c >= 14 ? 1 : c >= 8 ? 2 : 3; ids.forEach(id => W.emote(id, rk <= 1 ? 'cheer' : rk === 2 ? 'wiggle' : 'sad')); };
    S.anim(dt => {
      const u = (time - T0) / P, x = ((u % 1) + 1) % 1, r = R0 + (1 - x) * 3.1; ring.scale.setScalar(time < T0 - P ? .001 : r); pulse = Math.max(0, pulse - dt * 4);
      orb.scale.setScalar(1 + pulse * .5); orb.material.emissive.setHex(pulse > .1 ? 0xcc9900 : 0x886600);
      lights.forEach((l, k) => l.material.color.setHex(ok[k] === '1' ? 0x2ecc71 : ok[k] === '0' ? 0xe74c3c : 0x555566));
    });

    // ---------- play ----------
    const press = () => {
      const k = Math.round((time - T0) / P);
      if (k >= 0 && k < N && !mine.has(k) && Math.abs(time - (T0 + k * P)) < .28) { mine.add(k); host ? (hits[k].add(me), ctx.send({ k: 'h', id: me })) : ctx.send({ b: k }); fb = 'Hit!'; sfx('click'); show(me); }
      else { fb = 'Miss'; sfx('lose'); }
    };
    const key = e => { if (e.code === 'Space' && !e.repeat) press(); };
    addEventListener('keydown', key); addEventListener('pointerdown', press);
    const evalOk = () => { let o = ''; for (let k = 0; k < N && T0 + k * P + .5 < time; k++) o += hits[k].size === ids.length ? '1' : '0'; return o; };
    return {
      update(dt) {
        time += dt;
        if (host && !over) for (let k = 0; k < N; k++) if (T0 + k * P < time) ids.forEach(id => ctx.players[id].bot && hits[k].add(id));
        if (host && !over) {
          ok = evalOk(); if ((acc += dt) > .3) { acc = 0; ctx.send({ ok }); }
          if (time > T0 + N * P + .8) { over = true; const c = [...ok].filter(x => x === '1').length; const rk = c >= 20 ? 0 : c >= 14 ? 1 : c >= 8 ? 2 : 3; ctx.send({ ok, end: 1 }); end(); S.after(2.4, () => ctx.finish([...ids], ids.map(() => rk))); }
        }
        const bk = Math.floor((time - T0) / P); if (bk !== lastB && bk >= 0 && bk < N) { lastB = bk; sfx('tick'); pulse = 1; }
        s.textContent = `Beats where everyone hit: ${[...ok].filter(v => v === '1').length}   ${fb}`;
      },
      onMessage(m, from) {
        if (host) { if (m.b >= 0 && m.b < N && ids.includes(from)) { hits[m.b | 0].add(from); const ev = { k: 'h', id: from }; show(from); ctx.send(ev); } }
        else if (m.k === 'h') { if (m.id !== me && m.id in ctx.players) show(m.id); }
        else if (m.ok != null) { ok = m.ok; if (m.end) end(); }
      },
      cleanup() { removeEventListener('keydown', key); removeEventListener('pointerdown', press); el.remove(); S.cleanup(); },
    };
  },
};
