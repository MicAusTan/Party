import * as THREE from 'three';
import { sfx } from '../sfx.js';
// Real-time: host simulates movement + coins; clients send input, render snapshots.
const TAU = Math.PI * 2;
export default {
  name: 'Coin Grab', desc: 'Grab as many coins as you can in 25 seconds! WASD to move. Gold coins are worth 3.',
  create(ctx) {
    const W = ctx.world, ids = Object.keys(ctx.players), host = ctx.isHost, held = {}, cm = [];
    W.showDeco(false);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, .4, 16), new THREE.MeshStandardMaterial({ color: 0x6fcf97, flatShading: true }));
    disc.position.y = -.2; W.scene.add(disc);
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const st = {}, score = {}; ids.forEach((id, k) => { const a = k / ids.length * TAU; st[id] = { x: Math.sin(a) * 4, z: Math.cos(a) * 4, ix: 0, iz: 0 }; score[id] = 0; });
    let coins = [], time = 25, spawnT = 0, acc = 0, lastIn = '', prevMine = 0, over = false, snap = { p: {}, c: [], s: score, t: 25 };
    const kd = e => { held[e.code] = true; }, ku = e => { held[e.code] = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    const vec = () => {
      const x = (held.KeyD || held.ArrowRight ? 1 : 0) - (held.KeyA || held.ArrowLeft ? 1 : 0), z = (held.KeyS || held.ArrowDown ? 1 : 0) - (held.KeyW || held.ArrowUp ? 1 : 0), l = Math.hypot(x, z) || 1;
      return { x: x / l, z: z / l };
    };
    const pack = () => { const p = {}; ids.forEach(id => p[id] = [+st[id].x.toFixed(2), +st[id].z.toFixed(2)]); return { p, c: coins.map(c => [+c.x.toFixed(2), +c.z.toFixed(2), c.v]), s: score, t: +time.toFixed(1) }; };
    function step(dt) {
      for (const id of ids) {
        const s = st[id]; s.x += s.ix * 8 * dt; s.z += s.iz * 8 * dt; const r = Math.hypot(s.x, s.z); if (r > 11.5) { s.x *= 11.5 / r; s.z *= 11.5 / r; }
      }
      if ((spawnT -= dt) <= 0 && coins.length < 8) { spawnT = .35; const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 10.5; coins.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, v: Math.random() < .15 ? 3 : 1 }); }
      coins = coins.filter(c => { for (const id of ids) if (Math.hypot(st[id].x - c.x, st[id].z - c.z) < 1.2) { score[id] += c.v; return false; } return true; });
      if ((time -= dt) <= 0) { over = true; snap = pack(); ctx.send(snap); ctx.finish([...ids].sort((a, b) => score[b] - score[a])); }
    }
    return {
      update(dt) {
        const v = vec();
        if (host) { st[ctx.me] && (st[ctx.me].ix = v.x, st[ctx.me].iz = v.z); if (!over) step(dt); snap = pack(); if ((acc += dt) >= .05) { acc = 0; ctx.send(snap); } }
        else { const k = v.x + ',' + v.z; if (k !== lastIn) { lastIn = k; ctx.send(v); } }
        for (const id of ids) { const q = snap.p[id]; if (q) W.set(id, q[0], q[1]); }
        while (cm.length < snap.c.length) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .15, 8), new THREE.MeshStandardMaterial({ flatShading: true })); m.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(m); W.scene.add(g); cm.push(g); }
        cm.forEach((g, i) => {
          const c = snap.c[i]; g.visible = !!c; if (!c) return;
          g.position.set(c[0], .8, c[1]); g.rotation.y += dt * 4; g.scale.setScalar(c[2] > 1 ? 1.5 : 1); g.children[0].material.color.set(c[2] > 1 ? 0xff9f1a : 0xffd93d);
        });
        if (snap.s[ctx.me] > prevMine) sfx('coin'); prevMine = snap.s[ctx.me];
        el.innerHTML = `<h2>${Math.max(0, Math.ceil(snap.t))}</h2>` + ids.map(id => `<div class="bar"><span style="width:${Math.min(100, snap.s[id] * 3)}%;background:${ctx.players[id].color}"></span><b>${ctx.esc(ctx.players[id].name)} 🪙${snap.s[id]}</b></div>`).join('');
      },
      onMessage(m, from) {
        if (host) { const s = st[from]; if (s && m.x != null) { const x = +m.x || 0, z = +m.z || 0, l = Math.max(1, Math.hypot(x, z)); s.ix = x / l; s.iz = z / l; } }
        else if (m.p) snap = m;
      },
      cleanup() {
        removeEventListener('keydown', kd); removeEventListener('keyup', ku);
        cm.forEach(g => W.scene.remove(g)); W.scene.remove(disc); W.showDeco(true); el.remove();
      },
    };
  },
};
