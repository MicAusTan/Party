import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { scoreboard, jit, mix } from './util.js';
import { stage, fitDist } from './stage.js';
import { pick, share, nameplate } from './kit.js';
// Click the targets as fast as you can! 15 seconds, most hits wins. A target you miss moves on after 1.2s.
// Set: a sci-fi shooting range. A holographic target pops up on the far wall (3D picking). Every hit anyone scores fires a laser
// from their avatar to that target, so you can watch the whole squad shooting; live hit counts float over their heads.
const LIFE = 1.2, tpos = p => [(p[0] / 86 - .5) * 15, 1.8 + p[1] / 78 * 7.2, -5.6];       // seeded [x%, y%] -> a point on the back wall
export default {
  name: 'Target Practice', desc: 'Click the targets as fast as you can! 15 seconds, most hits wins. Missed targets move on.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 25, lower: false, bot: s => ({ v: Math.round(jit(mix(7, 26, s), .15)), t: 15 }) }), pos = Array.from({ length: 300 }, () => [ctx.rng() * 86, ctx.rng() * 78]);
    let i = 0, hits = 0, time = 0, life = LIFE, done = false, born = 0;
    const W = ctx.world, ids = Object.keys(ctx.players), n = ids.length, me = ctx.me, st = {}, np = {}; ids.forEach(id => st[id] = 0);
    const el = document.createElement('div'); el.className = 'mg'; el.innerHTML = '<h3 id="s"></h3>'; ctx.hud.append(el); const s = el.querySelector('#s');

    // ---------- the set ----------
    const dist = fitDist(W, 10, 15);
    const S = stage(ctx, { sky: 0x050914, fog: { color: 0x050914, near: 26, far: 60 }, light: .8, sun: { intensity: .7, color: 0xb0d0ff, pos: [0, 14, 8] }, cam: { pos: [0, 3.4, dist], look: [0, 5, 0] }, camFrom: [0, 8, dist + 9], camT: 1.4 });
    S.box(80, .5, 60, 0x10131f, 0, -.5, -8); S.box(40, 16, .4, 0x0e1226, 0, 0, -6.4);
    for (let k = -9; k <= 9; k++) S.box(.05, 16, .05, 0x1f6fff, k * 2, 0, -6.15, { basic: true });
    for (let k = 0; k < 8; k++) S.box(40, .05, .05, 0x1f6fff, 0, 1 + k * 2, -6.15, { basic: true });
    for (let k = 0; k < 6; k++) { S.box(.5, .1, 30, 0x8fe3ff, (k % 2 ? 1 : -1) * (4 + (k >> 1) * 4), 10.5, -4, { basic: true }); }                                  // ceiling light strips
    S.box(.3, 1.3, 38, 0x2a3350, -9.5, 0, -4); S.box(.3, 1.3, 38, 0x2a3350, 9.5, 0, -4);
    const tg = new THREE.Group(); S.root.add(tg); tg.visible = false;
    const ring = (r, c, z) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .95 })); m.position.z = z; tg.add(m); return m; };
    const hit = ring(.95, 0xe74c3c, 0); ring(.66, 0xffffff, .01); ring(.36, 0xe74c3c, .02); ring(.12, 0xffffff, .03); const halo = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.12, 32), new THREE.MeshBasicMaterial({ color: 0x8fe3ff, transparent: true, opacity: .8, side: THREE.DoubleSide })); tg.add(halo);
    const gap = Math.min(2.4, 14 / n); ids.forEach((id, k) => { const x = (k - (n - 1) / 2) * gap; W.put(id, x, 4, Math.PI); np[id] = nameplate(S, ctx, id); np[id].mesh.position.set(x, 3.4, 4); np[id].set('0'); });
    const beam = (id, ti) => {          // a short laser from a player's chest to the target position
      const g = W.m.get(id)?.g; if (!g) return; const a = new THREE.Vector3(g.position.x, 1.3, g.position.z), b = new THREE.Vector3(...tpos(pos[ti])), len = a.distanceTo(b);
      const m = S.box(.07, .07, 1, ctx.players[id].color, 0, 0, 0, { basic: true, op: .9 }); m.geometry.translate(0, 0, .5); m.position.copy(a); m.lookAt(b); m.scale.z = len;
      S.after(.12, () => { S.root.remove(m); m.geometry.dispose(); m.material.dispose(); });
    };
    S.anim((dt, tn) => {
      tg.visible = !done; const p = tpos(pos[i]); tg.position.set(p[0], p[1], p[2]); const age = time - born, k = Math.min(1, age * 8), out = Math.min(1, life / .3);
      tg.scale.setScalar(Math.max(.01, k * out)); halo.scale.setScalar(1 + Math.sin(tn * 10) * .08);
      ids.forEach(id => np[id].set(String(id === me ? hits : st[id])));
    });
    const net = share(ctx, 't', ev => { if (!(ev.id in st)) return; st[ev.id] = ev.h | 0; beam(ev.id, Math.max(0, Math.min(299, ev.i | 0))); W.hop(ev.id, .25); });

    // ---------- play ----------
    const onDown = e => {
      if (done) return; const b = pick(W, S.root, e, [hit]); if (!b) return;
      hits++; sfx('click'); const hi = i; beam(me, hi); W.hop(me, .25); const p = tpos(pos[hi]); W.burst(p[0], p[1], p[2] + .3, '#ffd93d', 10); net.emit({ h: hits, i: hi }); i++; life = LIFE; born = time;
    };
    addEventListener('pointerdown', onDown);
    return {
      update(dt) {
        sb.prog(hits), sb.tick(dt); time += dt;
        if (!done) {
          if ((life -= dt) <= 0) { i++; life = LIFE; born = time; }
          if (time >= 15) { done = true; sb.report(hits); W.emote(me, 'cheer'); }
        }
        s.textContent = done ? `Hits: ${hits} - waiting for others...` : `${Math.ceil(15 - time)}s   Hits: ${hits}`;
      },
      endNow() { sb.endNow(); },
      onMessage(m, from) { if (net.handle(m, from)) return; sb.onMessage(m, from); },
      cleanup() { removeEventListener('pointerdown', onDown); el.remove(); S.cleanup(); },
    };
  },
};
