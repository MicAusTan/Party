import * as THREE from 'three';
// Low-poly arena + player meshes (boxes/icospheres, flat shaded, no assets).
export class World {
  constructor(canvas) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x87ceeb);
    this.cam = new THREE.PerspectiveCamera(50, 1, .1,200);
    this.cam.position.set(0, 18, 14); this.cam.lookAt(0, 0, 0);
    // logical camera: setCam() tweens camPos/camLook; frame() applies them (plus shake) every frame
    this.camPos = new THREE.Vector3(0, 18, 14); this.camLook = new THREE.Vector3(); this.camTw = null; this.shk = 0; this.shkD = 1; this.shkA = 0;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x556677, 1.2); this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(5, 12, 6); this.scene.add(sun); this.sun = sun;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 1, 12),
      new THREE.MeshStandardMaterial({ color: 0x7ac36a, flatShading: true }));
    floor.position.y = -.5; this.scene.add(floor); this.deco = [floor]; this.floor = floor; this.islandOn = true; this.stageUp = 0;   // stageUp > 0 while a minigame stage/podium owns the camera
    this.m = new Map(); this.parts = []; this.t = 0; this.anim = []; this.dark = 0; this.skyT = null; this.hemiT = 1.2; this.decoOn = true;
    const rs = () => { this.r.setSize(innerWidth, innerHeight, false); this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); };
    addEventListener('resize', rs); rs();
  }
  mat(c) { return new THREE.MeshStandardMaterial({ color: c, flatShading: true }); }
  add(p) {
    const g = new THREE.Group(), mat = this.mat(p.color), ac = p.accent || '#ffd93d', am = () => this.mat(ac), dark = () => this.mat(0x222222);
    const body = p.body || 'box'; let b, dy = 0;
    if (body === 'round') { b = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 1), mat); b.scale.set(1, .95, .85); b.position.y = .55; dy = -.1; }
    else if (body === 'tall') { b = new THREE.Mesh(new THREE.CylinderGeometry(.35, .42, 1.35, 8), mat); b.position.y = .68; dy = .3; }
    else if (body === 'pyramid') { b = new THREE.Mesh(new THREE.ConeGeometry(.65, 1.1, 4), mat); b.position.y = .55; b.rotation.y = Math.PI / 4; }
    else { b = new THREE.Mesh(new THREE.BoxGeometry(.9, 1, .6), mat); b.position.y = .5; }
    const up = new THREE.Group(); up.position.y = dy;           // head, face and hat ride on top of the body
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.4, 0), mat); head.position.y = 1.4; up.add(head);
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
    const white = () => new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const face = p.face || 'eyes';
    if (face === 'eyes' || face === 'mustache') for (const k of [-1, 1]) up.add(box(.12, .14, .06, white(), k * .15, 1.46, .37), box(.06, .08, .06, dark(), k * .15, 1.45, .4));
    if (face === 'mustache') up.add(box(.32, .07, .06, this.mat(0x5a3a1a), 0, 1.3, .37));
    if (face === 'cyclops') { const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(.15, 0), white()); eye.position.set(0, 1.45, .35); up.add(eye, box(.07, .07, .05, dark(), 0, 1.45, .49)); }
    if (face === 'glasses') { for (const k of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.1, .025, 4, 8), dark()); r.position.set(k * .16, 1.46, .38); up.add(r); } up.add(box(.1, .03, .03, dark(), 0, 1.47, .38)); }
    if (face === 'shades') up.add(box(.2, .12, .06, dark(), -.16, 1.46, .38), box(.2, .12, .06, dark(), .16, 1.46, .38), box(.1, .03, .05, dark(), 0, 1.48, .38));
    const hat = p.hat; let h;
    if (hat === 'cone') { h = new THREE.Mesh(new THREE.ConeGeometry(.3, .6, 5), am()); h.position.y = 2; }
    else if (hat === 'top') { h = new THREE.Group(); const a = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .5, 6), dark()); a.position.y = .25;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .1, 6), am()); band.position.y = .1;
      h.add(a, band, new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .06, 6), dark())); h.position.y = 1.75; }
    else if (hat === 'ears') { h = new THREE.Group(); for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(.14, .6, .14), mat); e.position.set(k * .2, .3, 0); h.add(e); } h.position.y = 1.7; }
    else if (hat === 'halo') { h = new THREE.Mesh(new THREE.TorusGeometry(.3, .05, 4, 8), new THREE.MeshBasicMaterial({ color: ac })); h.rotation.x = Math.PI / 2; h.position.y = 2.05; }
    else if (hat === 'crown') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.CylinderGeometry(.32, .3, .22, 5), am()));
      for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 4), am()); const a = i / 5 * Math.PI * 2; t.position.set(Math.cos(a) * .27, .2, Math.sin(a) * .27); h.add(t); } h.position.y = 1.85; }
    else if (hat === 'wizard') { h = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(.34, .95, 8), am()); c.position.y = .45; c.rotation.z = .12;
      h.add(c, new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .05, 8), am())); h.position.y = 1.75; }
    else if (hat === 'cap') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.SphereGeometry(.43, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), am()), box(.42, .04, .3, am(), 0, .02, .4)); h.position.y = 1.55; }
    else if (hat === 'horns') { h = new THREE.Group(); for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.09, .4, 4), am()); c.position.set(k * .3, .2, 0); c.rotation.z = -k * .5; h.add(c); } h.position.y = 1.7; }
    else if (hat === 'propeller') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .15, 4), dark()));
      const sp = new THREE.Group(); sp.position.y = .1; sp.add(box(.8, .03, .12, am(), 0, 0, 0), box(.12, .03, .8, am(), 0, 0, 0)); h.add(sp); h.position.y = 1.85; var spinner = sp; }
    else if (hat === 'antenna') { h = new THREE.Group(); const r = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 4), dark()); r.position.y = .25;
      const t = new THREE.Mesh(new THREE.IcosahedronGeometry(.09, 0), new THREE.MeshBasicMaterial({ color: ac })); t.position.y = .55; h.add(r, t); h.position.y = 1.78; }
    if (h) up.add(h);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const x = cv.getContext('2d'); x.font = 'bold 36px sans-serif'; x.textAlign = 'center';
    x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 6;
    x.strokeText(p.name, 128, 44); x.fillText(p.name, 128, 44);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv) }));
    tag.scale.set(3, .75, 1); tag.position.y = 2.8 + dy;
    g.add(b, up, tag); g.rotation.order = 'YXZ'; this.scene.add(g);   // YXZ: yaw first, so lean tilts along the facing direction
    this.m.set(p.id, { g, tx: 0, tz: 0, trail: p.trail || 'none', spinner, lean: 0, leanT: 0, face: null, hop: false, hv: 0, hy: 0, emo: null });
  }
  sync(players) {
    for (const id of [...this.m.keys()]) if (!players[id]) { this.scene.remove(this.m.get(id).g); this.m.delete(id); }
    for (const id in players) {
      const p = players[id], sig = [p.color, p.accent, p.hat, p.body, p.face, p.name].join('|'), e = this.m.get(id);
      if (e && e.sig === sig) { e.trail = p.trail || 'none'; continue; }      // (trail isn't part of the look signature: update it in place)
      if (e) this.scene.remove(e.g);
      this.add(p); const n = this.m.get(id); n.sig = sig;
      n.trail = p.trail || 'none'; if (e) { n.g.position.copy(e.g.position); n.tx = e.tx; n.tz = e.tz; }
    }
  }
  rag(id, o) { const e = this.m.get(id); if (!e) return; if (o) { e.rag = o; if (!e.ragOn) { e.ragOn = true; e.hop = false; } } else if (e.rag) { e.rag = null; e.ragOn = false; this.resetPose(id); e.g.position.y = e.by || 0; } }   // ragdoll: o = { y, rx, rz } (tumble); null = stand up
  burst(x, y, z, color, n = 14) {
    this.pg ??= new THREE.BoxGeometry(.18, .18, .18);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.pg, new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.set(x, y, z); this.scene.add(m);
      this.parts.push({ m, vx: (Math.random() - .5) * 8, vy: Math.random() * 7 + 2, vz: (Math.random() - .5) * 8, life: .8 });
    }
  }
  trailBit(p, kind) {
    this.pg ??= new THREE.BoxGeometry(.18, .18, .18);
    const col = kind === 'rainbow' ? new THREE.Color().setHSL((this.t * .8) % 1, 1, .6)
      : new THREE.Color(kind === 'flame' ? ['#ff9f1a', '#ff3b30', '#ffd93d'][Math.random() * 3 | 0] : ['#ffffff', '#ffd93d', '#a5f3fc'][Math.random() * 3 | 0]);
    const m = new THREE.Mesh(this.pg, new THREE.MeshBasicMaterial({ color: col, transparent: true })); m.position.set(p.x, .25, p.z); m.scale.setScalar(kind === 'flame' ? 1.2 : .8); this.scene.add(m);
    this.parts.push({ m, vx: (Math.random() - .5) * 1.5, vy: kind === 'flame' ? 5 : 3, vz: (Math.random() - .5) * 1.5, life: .6 });
  }
  showDeco(v) { this.decoOn = v; this.deco.forEach(o => o.visible = v); if (this.floor) this.floor.visible = v && this.islandOn; }
  setIsland(v) { this.islandOn = v; if (this.floor) this.floor.visible = this.decoOn && v; }   // the green lobby island; boards with their own ground turn it off
  setSky(p) {   // p in [0,1] = progress through the game (dawn -> day -> dusk -> night); null = plain day
    if (p == null) { this.skyT = null; this.dark = 0; this.hemiT = 1.2; this.scene.background.set(0x87ceeb); return; }
    const st = [0xffc58a, 0x87ceeb, 0x87ceeb, 0xe58a6e, 0x1b2440], f = Math.min(.999, Math.max(0, p)) * (st.length - 1), i = f | 0;
    this.skyT = new THREE.Color(st[i]).lerp(new THREE.Color(st[i + 1]), f - i); this.dark = p; this.hemiT = 1.2 - .75 * Math.max(0, (p - .6) / .4);
  }
  // ---- camera: setCam([x,y,z], [lx,ly,lz], seconds) tweens; resetCam() returns to the default board view; shake(amount, seconds)
  setCam(pos, look, dur = 0) {
    const p1 = new THREE.Vector3(...pos), l1 = new THREE.Vector3(...look);
    if (dur <= 0) { this.camPos.copy(p1); this.camLook.copy(l1); this.camTw = null; return; }
    this.camTw = { p0: this.camPos.clone(), l0: this.camLook.clone(), p1, l1, t: 0, d: dur };
  }
  resetCam(dur = 0) { this.setCam([0, 18, 14], [0, 0, 0], dur); }
  shake(a = .4, d = .35) { this.shkA = a; this.shk = this.shkD = d; }
  // ---- player poses (all cosmetic; safe to call on every client)
  put(id, x, z, ry, y = 0) {                // teleport (no sliding); ry = facing (0 = toward the default camera / +z); y = standing height
    const e = this.m.get(id); if (!e) return; this.resetPose(id);
    e.tx = x; e.tz = z; e.by = y; e.ty = undefined; e.g.position.set(x, y, z); if (ry != null) { e.g.rotation.y = ry; e.face = ry; }
  }
  lift(id, y) { const e = this.m.get(id); if (e) { e.by = y; if (!e.hop) e.g.position.y = y; } }   // set standing height (hops/emotes stack on top of it)
  warp(id, x, z) { const e = this.m.get(id); if (e) { e.tx = x; e.tz = z; e.g.position.x = x; e.g.position.z = z; } }   // move instantly without touching pose/facing
  hop(id, h = 1) { const e = this.m.get(id); if (e) { e.hop = true; e.hv = Math.sqrt(2 * 26 * h); } }
  lean(id, a = .4) { const e = this.m.get(id); if (e) e.leanT = a; }          // radians, + = forward (toward its facing)
  face(id, ry) { const e = this.m.get(id); if (e) e.face = ry; }                // turn in place while standing still (null = free)
  emote(id, kind) {   // 'cheer' | 'sad' | 'wiggle' | 'giggle' | 'shake' | 'tilt' | 'love' | 'cool'
    const e = this.m.get(id); if (!e) return;
    const D = { cheer: 2.2, sad: 1.4, wiggle: 1.3, giggle: 1.1, shake: 1, tilt: 1.5, love: 1.2, cool: 1.5 };
    e.emo = { k: kind, t: 0, n: 0, g: 0, d: D[kind] || 1 };
    e.leanT = kind === 'sad' ? .6 : kind === 'shake' ? .3 : kind === 'cool' ? -.25 : 0;
  }
  emoStep(e, dt) {
    const m = e.emo, k = m.k, t = m.t += dt, g = e.g, fade = Math.max(0, 1 - t / m.d);
    if (k === 'cheer') { m.g -= dt; if (!e.hop && m.n < 3 && m.g <= 0) { e.hop = true; e.hv = 7.5; m.n++; m.g = .08; } }
    else if (k === 'giggle') { if (t >= m.n * .22 && m.n < 4 && !e.hop) { e.hop = true; e.hv = Math.sqrt(2 * 26 * .3); m.n++; } g.rotation.z = Math.sin(t * 30) * .08 * fade; }
    else if (k === 'love') { if (!m.n) { m.n = 1; e.hop = true; e.hv = Math.sqrt(2 * 26 * .9); } }
    else if (k === 'wiggle') g.rotation.z = Math.sin(t * 14) * .3 * fade;
    else if (k === 'shake') g.rotation.z = Math.sin(t * 45) * .22 * fade;
    else if (k === 'tilt') g.rotation.z = .35 * Math.min(1, t * 6) * Math.min(1, fade * 4);
    else if (k === 'cool' && t < .7) g.rotation.y += dt * Math.PI * 2 / .7;
    if (t >= m.d) { e.leanT = 0; e.emo = null; }
  }
  // floating emoji above a player's head (cached glyph textures); rises and fades
  icon(ch) {
    this.ic ??= new Map(); let t = this.ic.get(ch);
    if (!t) { const cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d'); c.font = '68px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 48, 52); t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; this.ic.set(ch, t); }
    return t;
  }
  popIcon(id, ch) {
    const e = this.m.get(id); if (!e) return;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.icon(ch), transparent: true, depthTest: false })); sp.renderOrder = 5; sp.scale.set(.01, .01, 1); this.scene.add(sp);
    (this.pops ??= []).push({ sp, e, t: 0 });
  }
  resetPose(id) {
    const e = this.m.get(id); if (!e) return;
    e.face = null; e.lean = e.leanT = 0; e.emo = null; e.hop = false; e.hv = e.hy = 0;
    e.g.rotation.x = 0; e.g.rotation.z = 0; e.by = 0; e.g.position.y = 0; e.g.visible = true;
  }
  set(id, x, z, y) { const e = this.m.get(id); if (e) { e.tx = x; e.tz = z; if (y !== undefined) e.ty = y; } }   // y (optional) = standing height, eased toward; games that never pass y keep full control of it
  frame(dt) {
    this.t += dt;
    if (this.camTw) {
      const w = this.camTw; w.t += dt; const k = Math.min(1, w.t / w.d), s = k * k * (3 - 2 * k);
      this.camPos.lerpVectors(w.p0, w.p1, s); this.camLook.lerpVectors(w.l0, w.l1, s); if (k >= 1) this.camTw = null;
    }
    this.cam.position.copy(this.camPos);
    if (this.shk > 0) { this.shk = Math.max(0, this.shk - dt); const a = this.shkA * this.shk / this.shkD; this.cam.position.x += (Math.random() - .5) * a; this.cam.position.y += (Math.random() - .5) * a; }
    this.cam.lookAt(this.camLook);
    if (this.pops?.length) for (let i = this.pops.length - 1; i >= 0; i--) {
      const q = this.pops[i]; q.t += dt; const u = Math.min(1, q.t * 6), sc = 1.3 * (u < 1 ? 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2) : 1);
      q.sp.position.set(q.e.g.position.x, q.e.g.position.y + 3 + q.t * .7, q.e.g.position.z); q.sp.scale.set(sc, sc, 1);
      q.sp.material.opacity = Math.min(1, (1.7 - q.t) * 3);
      if (q.t >= 1.7) { this.scene.remove(q.sp); q.sp.material.dispose(); this.pops.splice(i, 1); }
    }
    for (const f of this.anim) f(dt, this.t);
    if (this.skyT) this.scene.background.lerp(this.skyT, Math.min(1, dt * .8));
    this.hemi.intensity += (this.hemiT - this.hemi.intensity) * Math.min(1, dt * .8);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i]; q.vy -= 20 * dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt; q.m.position.z += q.vz * dt;
      q.life -= dt; q.m.material.opacity = Math.max(0, q.life / .8);
      if (q.life <= 0) { this.scene.remove(q.m); q.m.material.dispose(); this.parts.splice(i, 1); }
    }
    for (const e of this.m.values()) {
      if (e.rag) { const kk = Math.min(1, dt * 20); e.g.position.x += (e.tx - e.g.position.x) * kk; e.g.position.z += (e.tz - e.g.position.z) * kk; e.g.position.y += (e.rag.y - e.g.position.y) * kk; e.g.rotation.x += (e.rag.rx - e.g.rotation.x) * kk; e.g.rotation.z += (e.rag.rz - e.g.rotation.z) * kk; continue; }
      const dx = e.tx - e.g.position.x, dz = e.tz - e.g.position.z, k = Math.min(1, dt * 15);
      const mv = Math.hypot(dx, dz) > .02; if (mv) e.g.rotation.y = Math.atan2(dx, dz); e.g.rotation.z = mv ? Math.sin(this.t * 16) * .12 : e.g.rotation.z * .8;
      e.g.position.x += dx * k; e.g.position.z += dz * k;
      if (!mv && e.face != null && e.emo?.k !== 'cool') { let d = e.face - e.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); e.g.rotation.y += d * Math.min(1, dt * 12); }
      if (e.emo) this.emoStep(e, dt);
      if (e.lean !== e.leanT) { e.lean += (e.leanT - e.lean) * Math.min(1, dt * 14); if (Math.abs(e.leanT - e.lean) < .002) e.lean = e.leanT; e.g.rotation.x = e.lean; }
      if (e.ty !== undefined) { e.by = (e.by || 0) + (e.ty - (e.by || 0)) * k; if (!e.hop) e.g.position.y = e.by; }
      if (e.hop) { e.hv -= 26 * dt; e.hy += e.hv * dt; if (e.hy <= 0) { e.hy = 0; e.hv = 0; e.hop = false; } e.g.position.y = (e.by || 0) + e.hy; }
      if (e.spinner) e.spinner.rotation.y += dt * 14;
      if (mv && e.trail !== 'none' && ((e.tt = (e.tt || 0) - dt) <= 0)) { e.tt = .06; this.trailBit(e.g.position, e.trail); }
    }
    this.r.render(this.scene, this.cam);
  }
}
