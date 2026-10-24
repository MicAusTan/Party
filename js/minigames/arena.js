import * as THREE from 'three';
import { stage } from './stage.js';
const TAU = Math.PI * 2;
// Host-side bot steering shared by every arena-style game. fn(id, s, skill) returns a direction [dx, dz] (or null to stand still);
// bots only "think" every ~0.12-0.5s (faster when skilled) and steer a little off-line when unskilled. Math.random only.
const thinkers = new WeakMap();
export function driveBots(ctx, st, dt, fn) {
  if (!ctx.isHost) return; let th = thinkers.get(st); if (!th) thinkers.set(st, th = {});
  for (const id in st) {
    if (!ctx.players[id]?.bot) continue; const s = st[id];
    if (s.alive === false) { s.ix = s.iz = 0; continue; }
    const b = th[id] ??= { t: Math.random() * .3, ix: 0, iz: 0 };
    if ((b.t -= dt) <= 0) {
      const sk = ctx.skill?.(id) ?? .5; b.t = (.5 - .38 * sk) * (.7 + Math.random() * .6);
      const v = fn(id, s, sk), l = v ? Math.hypot(v[0], v[1]) : 0;
      if (l < .3) { b.ix = b.iz = 0; } else { const a = Math.atan2(v[0], v[1]) + (Math.random() - .5) * (1 - sk) * .9; b.ix = Math.sin(a); b.iz = Math.cos(a); }
    }
    s.ix = b.ix; s.iz = b.iz;
  }
}
// Shared top-down arena for host-simulated minigames: disc floor, WASD, input sync, positions.
//   const A = arena(ctx);  A.input() each frame; host: A.move(dt); A.pack() -> snapshot positions;
//   A.show(packed) renders; A.onInput(m, from) in onMessage (returns true if it was movement input).
//   A.st[id] = { x, z, alive, sp (speed multiplier) }
//   Pass { set: <stage() options> } to build a themed 3D set instead of the plain green disc: A.S is then the stage (add scenery with
//   A.S.box/cyl/..., A.S.root.add(mesh), A.S.anim(fn)), and A.cleanup() restores everything.
export function arena(ctx, { radius = 11.5, disc: withDisc = true, set } = {}) {
  const W = ctx.world, ids = Object.keys(ctx.players), host = ctx.isHost, held = {}, st = {}; let last = '';
  const S = set ? stage(ctx, set) : null; if (!S) W.showDeco(false);
  let first = true;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, .4, 16), new THREE.MeshStandardMaterial({ color: 0x6fcf97, flatShading: true }));
  disc.position.y = -.2; if (withDisc && !S) W.scene.add(disc);
  ids.forEach((id, k) => { const a = k / ids.length * TAU; st[id] = { x: Math.sin(a) * 5, z: Math.cos(a) * 5, ix: 0, iz: 0, alive: true, sp: 1 }; });
  const kd = e => { held[e.code] = true; }, ku = e => { held[e.code] = false; };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  return {
    ids, st, S,
    input() {
      const x = (held.KeyD || held.ArrowRight ? 1 : 0) - (held.KeyA || held.ArrowLeft ? 1 : 0), z = (held.KeyS || held.ArrowDown ? 1 : 0) - (held.KeyW || held.ArrowUp ? 1 : 0), l = Math.hypot(x, z) || 1, v = { x: x / l, z: z / l };
      if (host) { const s = st[ctx.me]; if (s) { s.ix = v.x; s.iz = v.z; } }
      else { const k = v.x + ',' + v.z; if (k !== last) { last = k; ctx.send(v); } }
    },
    bots(dt, fn) { driveBots(ctx, st, dt, fn); },
    move(dt) {
      for (const id of ids) {
        const s = st[id]; if (!s.alive) continue;
        s.x += s.ix * 8 * s.sp * dt; s.z += s.iz * 8 * s.sp * dt; const r = Math.hypot(s.x, s.z); if (r > radius) { s.x *= radius / r; s.z *= radius / r; }
      }
    },
    onInput(m, from) {
      if (!host || m.x == null) return false;
      const s = st[from]; if (s) { const x = +m.x || 0, z = +m.z || 0, l = Math.max(1, Math.hypot(x, z)); s.ix = x / l; s.iz = z / l; }
      return true;
    },
    pack() { const p = {}; ids.forEach(id => p[id] = [+st[id].x.toFixed(2), +st[id].z.toFixed(2), st[id].alive ? 1 : 0]); return p; },
    show(p) { for (const id of ids) { const q = p[id], e = W.m.get(id); if (!q || !e) continue; if (first) W.warp(id, q[0], q[1]); else W.set(id, q[0], q[1]); e.g.visible = q[2] !== 0; } first = false; },
    cleanup() {
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); if (S) S.cleanup(); else { W.scene.remove(disc); W.showDeco(true); }
      ids.forEach(id => { const g = W.m.get(id)?.g; if (g) g.visible = true; });
    },
  };
}
