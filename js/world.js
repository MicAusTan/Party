import * as THREE from 'three';
// Low-poly arena + player meshes (boxes/icospheres, flat shaded, no assets).
const TR = { sparkle: ['#ffffff', '#ffd93d', '#a5f3fc'], flame: ['#ff9f1a', '#ff3b30', '#ffd93d'], bubbles: ['#bfefff', '#e6fbff', '#8fdcff'], hearts: ['#ff6b9d', '#ff9ecb', '#ff4d6d'], stars: ['#fff176', '#ffd93d', '#ffffff'], smoke: ['#555555', '#777777', '#999999'], toxic: ['#7cf08a', '#b5ff3d', '#2ecc71'], ice: ['#a5f3fc', '#e0faff', '#7fd3ff'], void: ['#b28dff', '#7e57c2', '#2a1a4a'] };
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
    const rs = () => { const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); };
    this.resize = rs; addEventListener('resize', rs); rs();
  }
  mat(c) { return new THREE.MeshStandardMaterial({ color: c, flatShading: true }); }
  add(p) {
    const g = new THREE.Group(), mat = this.mat(p.color), ac = p.accent || '#ffd93d', am = () => this.mat(ac), dark = () => this.mat(0x222222);
    const body = p.body || 'box'; let b, dy = 0;
    if (body === 'round') { b = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 1), mat); b.scale.set(1, .95, .85); b.position.y = .55; dy = -.1; }
    else if (body === 'tall') { b = new THREE.Mesh(new THREE.CylinderGeometry(.35, .42, 1.35, 8), mat); b.position.y = .68; dy = .3; }
    else if (body === 'pyramid') { b = new THREE.Mesh(new THREE.ConeGeometry(.65, 1.1, 4), mat); b.position.y = .55; b.rotation.y = Math.PI / 4; }
    else if (body === 'bean') { b = new THREE.Mesh(new THREE.CapsuleGeometry(.4, .55, 3, 8), mat); b.position.y = .66; dy = .08; }
    else if (body === 'diamond') { b = new THREE.Mesh(new THREE.OctahedronGeometry(.75), mat); b.scale.y = 1.15; b.position.y = .75; dy = .25; }
    else if (body === 'barrel') { b = new THREE.Group(); b.add(new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .95, 10), mat)); for (const yy of [-.3, .3]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.5, .04, 4, 12), this.mat(ac)); r.rotation.x = Math.PI / 2; r.position.y = yy; b.add(r); } b.position.y = .5; }
    else if (body === 'chunky') { b = new THREE.Mesh(new THREE.BoxGeometry(1.25, .9, .7), mat); b.position.y = .45; dy = -.05; }
    else if (body === 'ico') { b = new THREE.Mesh(new THREE.IcosahedronGeometry(.62, 0), mat); b.position.y = .6; dy = -.05; }
    else if (body === 'hexa') { b = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 1, 6), mat); b.position.y = .5; }
    else if (body === 'top') { b = new THREE.Mesh(new THREE.ConeGeometry(.6, 1, 8), mat); b.rotation.x = Math.PI; b.position.y = .55; }
    else if (body === 'snowman') { b = new THREE.Group(); const s1 = new THREE.Mesh(new THREE.IcosahedronGeometry(.5, 1), mat), s2 = new THREE.Mesh(new THREE.IcosahedronGeometry(.36, 1), mat); s1.position.y = .5; s2.position.y = 1.1; b.add(s1, s2); dy = .2; }
    else { b = new THREE.Mesh(new THREE.BoxGeometry(.9, 1, .6), mat); b.position.y = .5; }
    const up = new THREE.Group(); up.position.y = dy;           // head, face and hat ride on top of the body
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.4, 0), mat); head.position.y = 1.4; up.add(head);
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
    const white = () => new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const face = p.face || 'eyes';
    if (['eyes', 'mustache', 'happy', 'angry', 'cat', 'blush', 'surprised', 'monocle'].includes(face)) for (const k of [-1, 1]) up.add(box(.12, .14, .06, white(), k * .15, 1.46, .37), box(.06, .08, .06, dark(), k * .15, 1.45, .4));
    if (face === 'mustache') up.add(box(.32, .07, .06, this.mat(0x5a3a1a), 0, 1.3, .37));
    if (face === 'cyclops') { const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(.15, 0), white()); eye.position.set(0, 1.45, .35); up.add(eye, box(.07, .07, .05, dark(), 0, 1.45, .49)); }
    if (face === 'glasses') { for (const k of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.1, .025, 4, 8), dark()); r.position.set(k * .16, 1.46, .38); up.add(r); } up.add(box(.1, .03, .03, dark(), 0, 1.47, .38)); }
    if (face === 'shades') up.add(box(.2, .12, .06, dark(), -.16, 1.46, .38), box(.2, .12, .06, dark(), .16, 1.46, .38), box(.1, .03, .05, dark(), 0, 1.48, .38));
    if (face === 'happy') up.add(box(.1, .05, .05, dark(), -.12, 1.27, .38), box(.14, .05, .05, dark(), 0, 1.24, .38), box(.1, .05, .05, dark(), .12, 1.27, .38));
    if (face === 'angry') for (const k of [-1, 1]) { const br = box(.2, .05, .05, dark(), k * .15, 1.58, .38); br.rotation.z = k * .45; up.add(br); }
    if (face === 'sleepy') for (const k of [-1, 1]) up.add(box(.16, .04, .05, dark(), k * .15, 1.45, .38));
    if (face === 'cat') { up.add(box(.07, .05, .05, this.mat(0xff8fa3), 0, 1.36, .4)); for (const k of [-1, 1]) for (const j of [-1, 0, 1]) { const w = box(.22, .015, .02, dark(), k * .3, 1.34 + j * .04, .36); w.rotation.z = k * j * .15; up.add(w); } }
    if (face === 'eyepatch') up.add(box(.12, .14, .06, white(), .15, 1.46, .37), box(.06, .08, .06, dark(), .15, 1.45, .4), box(.2, .18, .05, dark(), -.15, 1.46, .38));
    if (face === 'visor') up.add(box(.5, .14, .07, new THREE.MeshBasicMaterial({ color: 0x4dd0ff }), 0, 1.46, .38));
    if (face === 'blush') for (const k of [-1, 1]) up.add(box(.11, .06, .04, this.mat(0xff8fa3), k * .24, 1.34, .38));
    if (face === 'surprised') up.add(box(.1, .12, .05, dark(), 0, 1.25, .38));
    if (face === 'wink') up.add(box(.12, .14, .06, white(), -.15, 1.46, .37), box(.06, .08, .06, dark(), -.15, 1.45, .4), box(.16, .04, .05, dark(), .15, 1.46, .38), box(.14, .04, .05, dark(), 0, 1.27, .38));
    if (face === 'monocle') { const r = new THREE.Mesh(new THREE.TorusGeometry(.12, .025, 4, 10), this.mat(0xffd93d)); r.position.set(.15, 1.46, .4); up.add(r); }
    if (face === 'bigeyes') for (const k of [-1, 1]) up.add(box(.2, .22, .06, white(), k * .16, 1.46, .37), box(.1, .12, .06, dark(), k * .16, 1.45, .4));
    if (face === 'robot') { const rm = new THREE.MeshBasicMaterial({ color: 0xff3b30 }); for (const k of [-1, 1]) up.add(box(.13, .13, .06, rm, k * .16, 1.46, .38)); for (let i = -1; i <= 1; i++) up.add(box(.28, .03, .05, dark(), 0, 1.27 + i * .05, .38)); }
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
    else if (hat === 'pirate') { h = new THREE.Group(); h.add(box(.95, .1, .5, dark(), 0, 0, 0), new THREE.Mesh(new THREE.ConeGeometry(.3, .3, 4), dark()), box(.5, .05, .52, am(), 0, .06, 0)); h.children[1].position.y = .2; h.children[1].rotation.y = Math.PI / 4; h.position.y = 1.72; }
    else if (hat === 'chef') { h = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(.28, .26, .25, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true })); c.position.y = .12; const p2 = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true })); p2.position.y = .4; h.add(c, p2); h.position.y = 1.72; }
    else if (hat === 'beanie') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.SphereGeometry(.43, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), am()), new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .08, 8), this.mat(0xffffff))); const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 0), this.mat(0xffffff)); pom.position.y = .45; h.add(pom); h.children[1].position.y = .02; h.position.y = 1.55; }
    else if (hat === 'sombrero') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.CylinderGeometry(.85, .85, .05, 10), am()), new THREE.Mesh(new THREE.CylinderGeometry(.2, .3, .35, 8), am())); h.children[1].position.y = .18; h.position.y = 1.72; }
    else if (hat === 'viking') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.SphereGeometry(.43, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), this.mat(0x8d949e))); for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.09, .4, 5), this.mat(0xffffff)); c.position.set(k * .42, .15, 0); c.rotation.z = -k * .9; h.add(c); } h.position.y = 1.58; }
    else if (hat === 'flower') { h = new THREE.Group(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, pe = new THREE.Mesh(new THREE.IcosahedronGeometry(.09, 0), am()); pe.position.set(Math.cos(a) * .13, 0, Math.sin(a) * .13); h.add(pe); } h.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.08, 0), this.mat(0xffd93d))); h.position.set(.2, 1.83, .05); }
    else if (hat === 'catears') { h = new THREE.Group(); for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(.15, .3, 3), mat); e.position.set(k * .24, .12, 0); e.rotation.z = -k * .2; h.add(e); } h.position.y = 1.72; }
    else if (hat === 'mohawk') { h = new THREE.Group(); for (let i = 0; i < 5; i++) h.add(box(.08, .3 - Math.abs(i - 2) * .05, .12, am(), 0, .1, (i - 2) * .17)); h.position.y = 1.72; }
    else if (hat === 'tiara') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.TorusGeometry(.36, .03, 4, 12, Math.PI), am())); for (let i = -1; i <= 1; i++) { const a = Math.PI / 2 + i * .55, gm = new THREE.Mesh(new THREE.IcosahedronGeometry(.06, 0), new THREE.MeshBasicMaterial({ color: 0x7fffd4 })); gm.position.set(Math.cos(a) * .36, Math.sin(a) * .36, 0); h.add(gm); } h.position.y = 1.72; }
    else if (hat === 'bow') { h = new THREE.Group(); for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.13, .28, 4), am()); c.rotation.z = k * Math.PI / 2; c.position.x = k * .15; h.add(c); } h.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), am())); h.position.set(.22, 1.82, .05); }
    else if (hat === 'headphones') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.TorusGeometry(.44, .035, 4, 12, Math.PI), dark())); for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .12, 8), am()); c.rotation.z = Math.PI / 2; c.position.x = k * .44; h.add(c); } h.position.y = 1.4; }
    else if (hat === 'santa') { h = new THREE.Group(); const wh = this.mat(0xffffff), c = new THREE.Mesh(new THREE.ConeGeometry(.38, .75, 7), this.mat(0xd32f2f)), pom = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 0), wh); c.position.set(.08, .4, 0); c.rotation.z = -.2; pom.position.set(.2, .78, 0); h.add(c, new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, .12, 8), wh), pom); h.position.y = 1.65; }
    else if (hat === 'cowboy') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, .05, 10), am()), box(.5, .3, .5, am(), 0, .17, 0), box(.52, .06, .52, dark(), 0, .08, 0)); h.position.y = 1.72; }
    else if (hat === 'jester') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .1, 8), dark())); for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.14, .6, 4), k < 0 ? am() : this.mat(0xe74c3c)), bell = new THREE.Mesh(new THREE.IcosahedronGeometry(.08, 0), this.mat(0xffd93d)); c.position.set(k * .3, .3, 0); c.rotation.z = -k * .8; bell.position.set(k * .52, .52, 0); h.add(c, bell); } h.position.y = 1.7; }
    else if (hat === 'helmet') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.SphereGeometry(.46, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), this.mat(0x8d949e)), box(.4, .07, .06, dark(), 0, .02, .44), box(.08, .25, .32, am(), 0, .5, 0)); h.position.y = 1.38; }
    else if (hat === 'ufo') { h = new THREE.Group(); const dome = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7fffd4 })); dome.position.y = .05; h.add(new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .1, 10), this.mat(0x8d949e)), dome); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, l = new THREE.Mesh(new THREE.IcosahedronGeometry(.05, 0), new THREE.MeshBasicMaterial({ color: ac })); l.position.set(Math.cos(a) * .5, 0, Math.sin(a) * .5); h.add(l); } h.position.y = 1.85; }
    else if (hat === 'bucket') { h = new THREE.Group(); const cr = new THREE.Mesh(new THREE.CylinderGeometry(.34, .42, .35, 8), am()); cr.position.y = .17; h.add(cr, new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .04, 8), am())); h.position.y = 1.6; }
    else if (hat === 'duck') { h = new THREE.Group(); const yl = this.mat(0xffd93d), hd = new THREE.Mesh(new THREE.IcosahedronGeometry(.13, 0), yl); hd.position.set(0, .2, .1); h.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.22, 0), yl), hd, box(.1, .04, .1, this.mat(0xff9f1a), 0, .18, .25), box(.04, .04, .04, dark(), .06, .24, .2), box(.04, .04, .04, dark(), -.06, .24, .2)); h.position.y = 1.82; }
    if (h) up.add(h);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const x = cv.getContext('2d'); x.font = 'bold 36px sans-serif'; x.textAlign = 'center';
    x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 6;
    x.strokeText(p.name, 128, 44); x.fillText(p.name, 128, 44);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv) }));
    tag.scale.set(3, .75, 1); tag.position.y = 2.8 + dy;
    g.add(b, up, tag);
    // body pattern, back item and ground aura (all sit on the body, so they need its size: br = radius, by = middle height)
    const BR = { box: .55, round: .62, tall: .39, pyramid: .5, bean: .42, diamond: .8, barrel: .52, chunky: .72, ico: .6, hexa: .5, top: .55, snowman: .5 }, BYM = { box: .5, round: .55, tall: .68, pyramid: .3, bean: .66, diamond: .75, barrel: .5, chunky: .45, ico: .6, hexa: .5, top: .62, snowman: .55 };
    const br = BR[body] ?? .55, by = BYM[body] ?? .5, rr = y => body === 'pyramid' ? Math.max(.1, .65 * (1 - y / 1.1)) + .03 : br;
    const ringAt = (y, r, t, m) => { const o = new THREE.Mesh(new THREE.TorusGeometry(r, t, 4, 14), m || am()); o.rotation.x = Math.PI / 2; o.position.y = y; return o; };
    const pat = p.pattern || 'none';
    if (pat === 'stripes') g.add(ringAt(by - .22, rr(by - .22), .05), ringAt(by, rr(by), .05), ringAt(by + .22, rr(by + .22), .05));
    else if (pat === 'belt') { g.add(ringAt(by - .1, rr(by - .1), .09, dark())); g.add(box(.18, .18, .06, am(), 0, by - .1, rr(by - .1) + .02)); }
    else if (pat === 'dots') for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, d = new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), am()); d.position.set(Math.sin(a) * rr(by), by + (i % 2 ? .15 : -.1), Math.cos(a) * rr(by)); g.add(d); }
    else if (pat === 'sash') { const s = box(.16, 1.05, .05, am(), 0, by + .05, rr(by) + .03); s.rotation.z = .75; g.add(s); }
    else if (pat === 'bowtie') { const z = Math.max(.3, br * .75), y = 1.0 + dy; for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.1, .2, 4), am()); c.rotation.z = k * Math.PI / 2; c.position.set(k * .1, y, z); g.add(c); } g.add(box(.07, .07, .06, dark(), 0, y, z)); }
    else if (pat === 'badge') { const z = rr(by + .2) + .03, d1 = box(.2, .2, .04, am(), -.2, by + .22, z); d1.rotation.z = Math.PI / 4; g.add(d1, box(.07, .07, .05, dark(), -.2, by + .22, z + .02)); }
    else if (pat === 'checker') { for (let i = 0; i < 6; i++) g.add(box(.15, .15, .04, i % 2 ? dark() : this.mat(0xffffff), ((i % 3) - 1) * .15, by + .15 - (i / 3 | 0) * .15, rr(by) + .02)); }
    else if (pat === 'scarf') { g.add(ringAt(1.05 + dy, Math.max(.3, br * .75), .1)); g.add(box(.14, .4, .05, am(), .24, .85 + dy, Math.max(.3, br * .75))); }
    const bz = -Math.max(.3, br * .7) - .05, back = p.back || 'none';
    if (back === 'cape') { const c = box(.85, 1.1, .06, am(), 0, by + .25, bz); c.rotation.x = .12; g.add(c); }
    else if (back === 'wings') for (const k of [-1, 1]) { const w1 = box(.7, .4, .05, this.mat(0xffffff), k * .55, by + .35, bz), w2 = box(.5, .3, .05, this.mat(0xeeeeee), k * .5, by + .02, bz); w1.rotation.z = k * .45; w2.rotation.z = k * .3; g.add(w1, w2); }
    else if (back === 'backpack') g.add(box(.6, .7, .3, am(), 0, by + .1, bz - .12), box(.5, .15, .32, dark(), 0, by + .3, bz - .12));
    else if (back === 'tail') for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(.14 - i * .015, 0), mat); t.position.set(0, .3 + i * .22 - (i === 3 ? .04 : 0), bz - .08 - Math.sin(i * .9) * .25); g.add(t); }
    else if (back === 'jetpack') { for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .65, 8), this.mat(0x8d949e)); c.position.set(k * .2, by + .2, bz - .1); const f = new THREE.Mesh(new THREE.ConeGeometry(.1, .3, 6), new THREE.MeshBasicMaterial({ color: 0xff9f1a })); f.rotation.x = Math.PI; f.position.set(k * .2, by - .28, bz - .1); g.add(c, f); } }
    else if (back === 'shell') { const sh = new THREE.Mesh(new THREE.SphereGeometry(.55, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), am()); sh.rotation.x = -Math.PI / 2; sh.position.set(0, by + .1, bz + .05); g.add(sh); }
    else if (back === 'bat') for (const k of [-1, 1]) { const m = this.mat(0x2b2540), w1 = box(.8, .35, .04, m, k * .6, by + .35, bz), w2 = box(.5, .3, .04, m, k * .5, by, bz); w1.rotation.z = k * .5; w2.rotation.z = k * .2; g.add(w1, w2); }
    else if (back === 'angel') for (const k of [-1, 1]) { const w1 = box(.35, .6, .04, this.mat(0xffffff), k * .4, by + .45, bz), w2 = box(.3, .4, .04, this.mat(0xf5f5ff), k * .5, by + .15, bz); w1.rotation.z = k * .35; w2.rotation.z = k * .2; g.add(w1, w2); }
    else if (back === 'balloon') { const st = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.6, 4), dark()), bl = new THREE.Mesh(new THREE.IcosahedronGeometry(.34, 1), am()); st.position.set(0, by + .8, bz - .12); bl.position.set(0, by + 1.85, bz - .12); g.add(st, bl); }
    else if (back === 'flag') { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.7, 5), dark()); pole.position.set(.3, by + .85, bz - .1); g.add(pole, box(.55, .34, .03, am(), .58, by + 1.5, bz - .1)); }
    const aura = p.aura || 'none';
    if (aura === 'ring' || aura === 'twin') { const r1 = new THREE.Mesh(new THREE.TorusGeometry(.85, .04, 4, 20), new THREE.MeshBasicMaterial({ color: ac })); r1.rotation.x = Math.PI / 2; r1.position.y = .06; g.add(r1); if (aura === 'twin') { const r2 = r1.clone(); r2.scale.set(1.35, 1.35, 1); r2.position.y = .04; g.add(r2); } }
    else if (aura === 'disc') { const d = new THREE.Mesh(new THREE.CircleGeometry(.9, 20), new THREE.MeshBasicMaterial({ color: ac, transparent: true, opacity: .4, depthWrite: false })); d.rotation.x = -Math.PI / 2; d.position.y = .04; g.add(d); }
    else if (aura === 'dotring') for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, d = new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshBasicMaterial({ color: ac })); d.position.set(Math.cos(a) * .95, .1, Math.sin(a) * .95); g.add(d); }
    else if (aura === 'hex') { const r1 = new THREE.Mesh(new THREE.TorusGeometry(.9, .04, 4, 6), new THREE.MeshBasicMaterial({ color: ac })); r1.rotation.x = Math.PI / 2; r1.position.y = .06; g.add(r1); }
    else if (aura === 'beam') { const bm = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 3.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: ac, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide })); bm.position.y = 1.6; g.add(bm); }
    g.rotation.order = 'YXZ'; this.scene.add(g);   // YXZ: yaw first, so lean tilts along the facing direction
    this.m.set(p.id, { g, tx: 0, tz: 0, trail: p.trail || 'none', spinner, lean: 0, leanT: 0, face: null, hop: false, hv: 0, hy: 0, emo: null });
  }
  sync(players) {
    for (const id of [...this.m.keys()]) if (!players[id]) { this.scene.remove(this.m.get(id).g); this.m.delete(id); }
    for (const id in players) {
      const p = players[id], sig = [p.color, p.accent, p.hat, p.body, p.face, p.back, p.pattern, p.aura, p.name].join('|'), e = this.m.get(id);
      if (e && e.sig === sig) { e.trail = p.trail || 'none'; continue; }      // (trail isn't part of the look signature: update it in place)
      if (e) this.scene.remove(e.g);
      this.add(p); const n = this.m.get(id); n.sig = sig;
      n.trail = p.trail || 'none'; if (e) { n.g.position.copy(e.g.position); n.tx = e.tx; n.tz = e.tz; }
    }
  }
  rag(id, o) { const e = this.m.get(id); if (!e) return; if (o) { e.rag = o; if (!e.ragOn) { e.ragOn = true; e.hop = false; } } else if (e.rag) { e.rag = null; e.ragOn = false; this.resetPose(id); e.g.scale.setScalar(1); e.g.position.y = e.by || 0; } }   // ragdoll: o = { y, rx, rz } (tumble); null = stand up
  burst(x, y, z, color, n = 14) {
    this.pg ??= new THREE.BoxGeometry(.18, .18, .18);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.pg, new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.set(x, y, z); this.scene.add(m);
      this.parts.push({ m, vx: (Math.random() - .5) * 8, vy: Math.random() * 7 + 2, vz: (Math.random() - .5) * 8, life: .8 });
    }
  }
  trailBit(p, kind) {
    this.pg ??= new THREE.BoxGeometry(.18, .18, .18);
    const T = TR[kind] || TR.sparkle, col = kind === 'rainbow' ? new THREE.Color().setHSL((this.t * .8) % 1, 1, .6) : new THREE.Color(T[Math.random() * T.length | 0]);
    const m = new THREE.Mesh(this.pg, new THREE.MeshBasicMaterial({ color: col, transparent: true })); m.position.set(p.x, .25, p.z); m.scale.setScalar(kind === 'flame' ? 1.2 : kind === 'smoke' ? 1.6 : .8); this.scene.add(m);
    this.parts.push({ m, vx: (Math.random() - .5) * 1.5, vy: kind === 'flame' ? 5 : kind === 'bubbles' || kind === 'smoke' ? 1.8 : 3, vz: (Math.random() - .5) * 1.5, life: .6 });
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
    if (e.rag) { e.rag = null; e.ragOn = false; } e.hop = false; e.hv = 0; e.leanT = 0; e.g.visible = true; e.g.scale.setScalar(1); e.g.rotation.x = 0; e.g.rotation.z = 0;
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
      if (e.rag) { const kk = Math.min(1, dt * 20); e.g.position.x += (e.tx - e.g.position.x) * kk; e.g.position.z += (e.tz - e.g.position.z) * kk; e.g.position.y += (e.rag.y - e.g.position.y) * kk; e.g.rotation.x += (e.rag.rx - e.g.rotation.x) * kk; e.g.rotation.z += (e.rag.rz - e.g.rotation.z) * kk; const sc = e.rag.sc ?? 1; e.g.scale.x += (sc - e.g.scale.x) * kk; e.g.scale.y = e.g.scale.z = e.g.scale.x; continue; }
      const dx = e.tx - e.g.position.x, dz = e.tz - e.g.position.z, k = Math.min(1, dt * 15);
      const mv = Math.hypot(dx, dz) > .02; if (mv) { let da = Math.atan2(dx, dz) - e.g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); e.g.rotation.y += da * Math.min(1, dt * 14); } e.g.rotation.z = mv ? Math.sin(this.t * 16) * .12 : e.g.rotation.z * .8;
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
