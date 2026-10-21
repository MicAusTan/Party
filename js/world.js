import * as THREE from 'three';
// Low-poly arena + player meshes (boxes/icospheres, flat shaded, no assets).
export class World {
  constructor(canvas) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x87ceeb);
    this.cam = new THREE.PerspectiveCamera(50, 1, .1,200);
    this.cam.position.set(0, 18, 14); this.cam.lookAt(0, 0, 0);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x556677, 1.2); this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(5, 12, 6); this.scene.add(sun);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 1, 12),
      new THREE.MeshStandardMaterial({ color: 0x7ac36a, flatShading: true }));
    floor.position.y = -.5; this.scene.add(floor); this.deco = [floor];
    this.m = new Map(); this.parts = []; this.t = 0; this.anim = []; this.dark = 0; this.skyT = null; this.hemiT = 1.2; this.decoOn = true;
    const rs = () => { this.r.setSize(innerWidth, innerHeight, false); this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); };
    addEventListener('resize', rs); rs();
  }
  mat(c) { return new THREE.MeshStandardMaterial({ color: c, flatShading: true }); }
  add(p) {
    const g = new THREE.Group(), mat = this.mat(p.color);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.9, 1, .6), mat); body.position.y = .5;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.4, 0), mat); head.position.y = 1.4;
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const x = cv.getContext('2d'); x.font = 'bold 36px sans-serif'; x.textAlign = 'center';
    x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 6;
    x.strokeText(p.name, 128, 44); x.fillText(p.name, 128, 44);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv) }));
    tag.scale.set(3, .75, 1); tag.position.y = 2.8;
    const hat = p.hat; let h;
    if (hat === 'cone') { h = new THREE.Mesh(new THREE.ConeGeometry(.3, .6, 5), this.mat(0xffd93d)); h.position.y = 2; }
    else if (hat === 'top') { h = new THREE.Group(); const a = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .5, 6), this.mat(0x222222)); a.position.y = .25;
      h.add(a, new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .06, 6), this.mat(0x222222))); h.position.y = 1.75; }
    else if (hat === 'ears') { h = new THREE.Group(); for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(.14, .6, .14), mat); e.position.set(k * .2, .3, 0); h.add(e); } h.position.y = 1.7; }
    else if (hat === 'halo') { h = new THREE.Mesh(new THREE.TorusGeometry(.3, .05, 4, 8), this.mat(0xffe066)); h.rotation.x = Math.PI / 2; h.position.y = 2; }
    if (h) g.add(h);
    g.add(body, head, tag); this.scene.add(g);
    this.m.set(p.id, { g, tx: 0, tz: 0 });
  }
  sync(players) {
    for (const id of [...this.m.keys()]) if (!players[id]) { this.scene.remove(this.m.get(id).g); this.m.delete(id); }
    for (const id in players) {
      const p = players[id], sig = p.color + '|' + p.hat + '|' + p.name, e = this.m.get(id);
      if (e && e.sig === sig) continue;
      if (e) this.scene.remove(e.g);
      this.add(p); const n = this.m.get(id); n.sig = sig;
      if (e) { n.g.position.copy(e.g.position); n.tx = e.tx; n.tz = e.tz; }
    }
  }
  burst(x, y, z, color, n = 14) {
    this.pg ??= new THREE.BoxGeometry(.18, .18, .18);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.pg, new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.set(x, y, z); this.scene.add(m);
      this.parts.push({ m, vx: (Math.random() - .5) * 8, vy: Math.random() * 7 + 2, vz: (Math.random() - .5) * 8, life: .8 });
    }
  }
  showDeco(v) { this.decoOn = v; this.deco.forEach(o => o.visible = v); }
  setSky(p) {   // p in [0,1] = progress through the game (dawn -> day -> dusk -> night); null = plain day
    if (p == null) { this.skyT = null; this.dark = 0; this.hemiT = 1.2; this.scene.background.set(0x87ceeb); return; }
    const st = [0xffc58a, 0x87ceeb, 0x87ceeb, 0xe58a6e, 0x1b2440], f = Math.min(.999, Math.max(0, p)) * (st.length - 1), i = f | 0;
    this.skyT = new THREE.Color(st[i]).lerp(new THREE.Color(st[i + 1]), f - i); this.dark = p; this.hemiT = 1.2 - .75 * Math.max(0, (p - .6) / .4);
  }
  set(id, x, z) { const e = this.m.get(id); if (e) { e.tx = x; e.tz = z; } }
  frame(dt) {
    this.t += dt;
    for (const f of this.anim) f(dt, this.t);
    if (this.skyT) this.scene.background.lerp(this.skyT, Math.min(1, dt * .8));
    this.hemi.intensity += (this.hemiT - this.hemi.intensity) * Math.min(1, dt * .8);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i]; q.vy -= 20 * dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt; q.m.position.z += q.vz * dt;
      q.life -= dt; q.m.material.opacity = Math.max(0, q.life / .8);
      if (q.life <= 0) { this.scene.remove(q.m); q.m.material.dispose(); this.parts.splice(i, 1); }
    }
    for (const e of this.m.values()) {
      const dx = e.tx - e.g.position.x, dz = e.tz - e.g.position.z, k = Math.min(1, dt * 15);
      const mv = Math.hypot(dx, dz) > .02; if (mv) e.g.rotation.y = Math.atan2(dx, dz); e.g.rotation.z = mv ? Math.sin(this.t * 16) * .12 : e.g.rotation.z * .8;
      e.g.position.x += dx * k; e.g.position.z += dz * k;
    }
    this.r.render(this.scene, this.cam);
  }
}
