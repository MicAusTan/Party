import * as THREE from 'three';
import { stage } from './minigames/stage.js';
// Victory podium: a short celebration set shown after each minigame (secs ~4) and at the end of a game (secs ~7).
//   const pod = showPodium(world, players, orderBestFirst, ranks, { secs, title, onEnd }); pod.end();
// Tied ranks share a tier. Tiers 1-3 stand on the podium, everyone else stands to the sides and sulks.
const TIER = [{ h: 1.8, c: 0xf1c40f, t: '1ST' }, { h: 1.2, c: 0xc0c8d0, t: '2ND' }, { h: .7, c: 0xcd7f32, t: '3RD' }];
export function showPodium(world, players, order, ranks, o = {}) {
  const ctx = { world, players }, ids = order.filter(id => players[id]);
  for (const id of Object.keys(players)) if (!ids.includes(id)) ids.push(id);
  const rk = id => { const i = order.indexOf(id); return i < 0 ? 99 : (ranks?.[i] ?? i); };
  // group by rank value -> tiers
  const vals = [...new Set(ids.map(rk))].sort((a, b) => a - b), tiers = vals.map(v => ids.filter(id => rk(id) === v));
  const top = tiers.slice(0, 3), rest = tiers.slice(3).flat(), SP = 1.7;
  const wOf = g => Math.max(2.4, g.length * SP);
  const wid = top.map(wOf), left = top[1] ? wid[1] : 0, right = top[2] ? wid[2] : 0;
  const sideN = Math.ceil(rest.length / 2), sideW = sideN ? 1.2 + (sideN - 1) * 1.5 + .8 : 0;
  const L = wid[0] / 2 + left + sideW, R = wid[0] / 2 + right + sideW, total = L + R, mid = (R - L) / 2;
  const dist = Math.max(10.5, (total + 4) / 1.5);
  const S = stage(ctx, {
    sky: 0x1b1340, fog: { color: 0x1b1340, near: 30, far: 70 }, light: .95, sun: { intensity: 1, pos: [3, 14, 10] },
    cam: { pos: [mid, 4.2, dist], look: [mid, 1.9, 0] }, camFrom: [mid, 8, dist + 9], camT: 1.2,
  });
  const W = world, win = top[0] || [];
  S.cyl(total / 2 + 8, total / 2 + 8, .6, 0x2a2060, mid, -.6, 0, { seg: 40 }); S.cyl(total / 2 + 3, total / 2 + 3, .04, 0x3b2f8a, mid, 0, 0, { seg: 40 });
  // tier x-centres: [2nd][1st][3rd]
  const cx = [0, -(wid[0] / 2 + left / 2), wid[0] / 2 + right / 2];
  top.forEach((g, ti) => {
    const T = TIER[ti], w = wOf(g), x = cx[ti];
    S.box(w, T.h, 2.4, T.c, x, 0, 0);
    const pl = S.screen(Math.min(w, 2.2), .6, 256, 70); pl.mesh.position.set(x, T.h / 2, 1.22);
    pl.draw((c, pw, ph) => { c.fillStyle = '#0006'; c.fillRect(0, 0, pw, ph); c.fillStyle = '#fff'; c.font = 'bold 48px sans-serif'; c.textAlign = 'center'; c.fillText(T.t, pw / 2, 52); });
    g.forEach((id, k) => W.put(id, x + (k - (g.length - 1) / 2) * SP, 0, 0, T.h));
    if (ti === 0) S.cone(w * .8 + .6, 11, 0xffe9a0, x, 0, 0, { basic: true, op: .12, seg: 24 });   // spotlight on the winner(s)
  });
  rest.forEach((id, k) => { const n = k >> 1; W.put(id, k % 2 ? wid[0] / 2 + right + 1.2 + n * 1.5 : -(wid[0] / 2 + left + 1.2 + n * 1.5), .3, 0); });
  // banner over the podium
  const nm = win.map(id => String(players[id]?.name ?? '?'));
  const label = (o.title ?? '') || (nm.length === 1 ? nm[0] : nm.length <= 3 ? nm.join(' & ') : nm.length + ' WINNERS');
  const ban = S.screen(Math.min(9, 3 + label.length * .45), 1.2, 512, 100); ban.mesh.position.set(0, TIER[0].h + 3.1, -1);
  ban.draw((c, w, h) => { c.fillStyle = '#000b'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd93d'; c.font = 'bold 58px sans-serif'; c.textAlign = 'center'; c.fillText(('🏆 ' + label).slice(0, 26), w / 2, 70); });
  // confetti
  const N = 150, im = new THREE.InstancedMesh(new THREE.BoxGeometry(.18, .02, .11), new THREE.MeshBasicMaterial({ color: 0xffffff }), N); S.root.add(im);
  const cols = [0xff4d6d, 0xffd93d, 0x4dd0e1, 0x7cf08a, 0xb28dff, 0xff9f1a], P = [], dm = new THREE.Object3D();
  for (let i = 0; i < N; i++) { P.push({ x: mid + (Math.random() - .5) * (total + 8), y: 3 + Math.random() * 9, z: (Math.random() - .5) * 8, v: 1 + Math.random() * 1.5, r: Math.random() * 6, rs: 2 + Math.random() * 5, sw: Math.random() * 6 }); im.setColorAt(i, new THREE.Color(cols[i % cols.length])); }
  im.visible = false; im.frustumCulled = false; let t = 0, ended = false, cheerT = 0;
  const reveal = () => { im.visible = true; win.forEach(id => W.emote(id, 'cheer')); top.slice(1).flat().forEach(id => W.emote(id, 'wiggle')); rest.forEach(id => W.emote(id, 'sad')); W.shake(.15, .3); };
  S.after(1.3, reveal);
  S.anim((dt, tt) => {
    t += dt;
    if (t > 1.3 && (cheerT -= dt) <= 0) { cheerT = 2.6; if (t > 1.5) win.forEach(id => W.emote(id, 'cheer')); }
    if (t > 1.4) W.setCam([mid + Math.sin(tt * .5) * 1.4, 4.2, dist], [mid, 1.9, 0]);
    for (let i = 0; i < N; i++) {
      const p = P[i]; p.y -= p.v * dt; p.r += p.rs * dt; if (p.y < 0) { p.y = 9 + Math.random() * 3; p.x = mid + (Math.random() - .5) * (total + 8); }
      dm.position.set(p.x + Math.sin(tt * 1.5 + p.sw) * .6, p.y, p.z); dm.rotation.set(p.r, p.r * .7, 0); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  const end = () => { if (ended) return; ended = true; S.cleanup(); o.onEnd?.(); };
  S.after(o.secs ?? 4, end);
  return { end };
}
