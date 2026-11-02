import * as THREE from 'three';
import { OPTS } from './look.js';
import { shapeGeo } from './shapes.js';
import { PROPS, GAITS, SLOTS } from './props.js';
import { PETS, PET_REACT } from './pets.js';
// Low-poly arena + player meshes (boxes/icospheres, flat shaded, no assets).
const TR = { sparkle: ['#ffffff', '#ffd93d', '#a5f3fc'], flame: ['#ff9f1a', '#ff3b30', '#ffd93d'], bubbles: ['#bfefff', '#e6fbff', '#8fdcff'], hearts: ['#ff6b9d', '#ff9ecb', '#ff4d6d'], stars: ['#fff176', '#ffd93d', '#ffffff'], smoke: ['#555555', '#777777', '#999999'], toxic: ['#7cf08a', '#b5ff3d', '#2ecc71'], ice: ['#a5f3fc', '#e0faff', '#7fd3ff'], void: ['#b28dff', '#7e57c2', '#2a1a4a'], confetti: ['#ff4d6d', '#ffd93d', '#4dd0e1', '#7cf08a', '#b28dff'], leaves: ['#7cb342', '#ffa726', '#c0392b'], coins: ['#ffd700', '#ffe97a', '#ffb300'], lightning: ['#ffffff', '#7fdcff', '#fff6b0'], ink: ['#111111', '#2b2b3a', '#4a3a6a'], petals: ['#ffb3c6', '#ff8fab', '#ffd6e0'], notes: ['#ff6b9d', '#4dd0e1', '#ffd93d', '#b28dff'], snow: ['#ffffff', '#e3f4ff', '#bfe4ff'], paw: ['#6d4c2f', '#8d6e63', '#a1887f'] };
const COATS = new Map();
// Patterned body colours (canvas textures, cached). Base colour comes from the player's colour, details from accent.
function coatTex(kind, color, accent) {
  const key = kind + color + accent; if (COATS.has(key)) return COATS.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), base = new THREE.Color(color);
  const shade = k => '#' + base.clone().multiplyScalar(k).getHexString(), lite = '#' + base.clone().lerp(new THREE.Color(0xffffff), .45).getHexString();
  let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  c.fillStyle = color; c.fillRect(0, 0, 64, 64);
  if (kind === 'tiger') { c.fillStyle = shade(.35); for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(i * 11, 0); c.lineTo(i * 11 + 6, 0); c.lineTo(i * 11 + 2 + (i % 2) * 5, 64); c.lineTo(i * 11 - 3, 64); c.fill(); } }
  else if (kind === 'zebra') { c.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) c.fillRect(i * 8 + 2, 0, 3, 64); }
  else if (kind === 'checker') { c.fillStyle = shade(.6); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) c.fillRect(x * 16, y * 16, 16, 16); }
  else if (kind === 'polka') { c.fillStyle = accent; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc((i % 3) * 24 + 10 + ((i / 3 | 0) % 2) * 8, (i / 3 | 0) * 22 + 8, 5, 0, 7); c.fill(); } }
  else if (kind === 'gradient') { const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, lite); g.addColorStop(1, shade(.45)); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
  else if (kind === 'camo') for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? shade(.55) : lite; c.beginPath(); c.ellipse(r() * 64, r() * 64, 6 + r() * 8, 4 + r() * 6, r() * 3, 0, 7); c.fill(); }
  else if (kind === 'galaxy') { c.fillStyle = '#120a2e'; c.fillRect(0, 0, 64, 64); c.fillStyle = color; c.globalAlpha = .45; c.beginPath(); c.ellipse(32, 30, 26, 12, .6, 0, 7); c.fill(); c.globalAlpha = 1; c.fillStyle = '#ffffff'; for (let i = 0; i < 22; i++) c.fillRect(r() * 62, r() * 62, 2, 2); }
  else if (kind === 'rainbow') ['#ff4d6d', '#ff9f1a', '#ffd93d', '#7cf08a', '#4dd0e1', '#b28dff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * 10.7, 64, 11); })
  else if (kind === 'leopard') { for (let i = 0; i < 9; i++) { const x = (i % 3) * 22 + 8 + (i / 3 | 0) * 4, y = (i / 3 | 0) * 22 + 8; c.strokeStyle = shade(.3); c.lineWidth = 3; c.beginPath(); c.arc(x, y, 5, .4, 5.6); c.stroke(); c.fillStyle = lite; c.fillRect(x - 1, y - 1, 3, 3); } }
  else if (kind === 'plaid') { c.fillStyle = shade(.5); c.globalAlpha = .55; for (let i = 0; i < 4; i++) { c.fillRect(i * 16 + 4, 0, 6, 64); c.fillRect(0, i * 16 + 4, 64, 6); } c.globalAlpha = 1; c.fillStyle = accent; for (let i = 0; i < 4; i++) { c.fillRect(i * 16 + 12, 0, 1, 64); c.fillRect(0, i * 16 + 12, 64, 1); } }
  else if (kind === 'hearts') { c.fillStyle = accent; c.font = '20px sans-serif'; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) c.fillText('\u2665', x * 22 + (y % 2) * 10, y * 22 + 18); }
  else if (kind === 'waves') { c.strokeStyle = lite; c.lineWidth = 3; for (let y = 0; y < 5; y++) { c.beginPath(); for (let x = 0; x <= 64; x += 4) c.lineTo(x, y * 14 + 6 + Math.sin(x / 6 + y) * 4); c.stroke(); } }
  else if (kind === 'circuit') { c.fillStyle = shade(.25); c.fillRect(0, 0, 64, 64); c.strokeStyle = accent; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 16); c.lineTo(24, 16); c.lineTo(24, 40); c.lineTo(48, 40); c.lineTo(48, 8); c.lineTo(64, 8); c.moveTo(8, 64); c.lineTo(8, 52); c.lineTo(36, 52); c.stroke(); c.fillStyle = accent; for (const [x, y] of [[24, 16], [24, 40], [48, 40], [48, 8], [36, 52]]) c.fillRect(x - 2, y - 2, 5, 5); }
  else if (kind === 'giraffe') { c.fillStyle = shade(.45); let s2 = 11; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 9; i++) { c.save(); c.translate((i % 3) * 22 + 10, (i / 3 | 0) * 22 + 10); c.rotate(r2() * 1.5); c.fillRect(-7, -6, 14, 12); c.restore(); } }
  else if (kind === 'lava') { c.fillStyle = '#2a0d0d'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#ff6a00'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(r() * 64, 0); c.lineTo(r() * 64, 22); c.lineTo(r() * 64, 44); c.lineTo(r() * 64, 64); c.stroke(); } }
  else if (kind === 'argyle') { c.fillStyle = shade(.55); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2 === 0) { c.beginPath(); c.moveTo(x * 16 + 8, y * 16); c.lineTo(x * 16 + 16, y * 16 + 8); c.lineTo(x * 16 + 8, y * 16 + 16); c.lineTo(x * 16, y * 16 + 8); c.fill(); } c.strokeStyle = accent; c.lineWidth = 1; for (let i = -4; i < 8; i++) { c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16 + 64, 64); c.stroke(); } }
  else if (kind === 'tiedye') { for (let i = 0; i < 9; i++) { c.fillStyle = `hsla(${i * 40}, 85%, 60%, .5)`; c.beginPath(); c.arc(32, 32, 34 - i * 3.8, 0, 7); c.fill(); } c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; for (let a = 0; a < 6; a++) { c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + Math.cos(a * 1.05) * 40, 32 + Math.sin(a * 1.05) * 40); c.stroke(); } }
  else if (kind === 'scales') { c.strokeStyle = shade(.5); c.lineWidth = 2; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) { c.beginPath(); c.arc(x * 16 + (y % 2) * 8, y * 14, 8, 0, Math.PI); c.stroke(); } }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; COATS.set(key, t); return t;
}
// Particle auras (spawned around a player each frame-ish): c = colours, vy = rise speed, r = radius, y0/h = height band
const AU = {
  flames: { c: TR.flame, vy: 2.4, life: .8, r: .6, y0: 0, h: 1.2, rate: .05 }, sparkles: { c: TR.sparkle, vy: .5, life: 1.1, r: .8, y0: .1, h: 1.7, rate: .08 },
  electric: { c: ['#ffffff', '#7fdcff', '#c9f1ff'], vy: 0, life: .22, r: .7, y0: .1, h: 1.7, rate: .03, jit: 5 }, mist: { c: TR.smoke, vy: .8, life: 1.2, r: .7, y0: 0, h: .6, rate: .09, sc: 1.8 },
  bubbles: { c: TR.bubbles, vy: 1.3, life: 1.3, r: .75, y0: 0, h: 1.2, rate: .1, sc: 1 }, hearts: { c: TR.hearts, vy: 1, life: 1.2, r: .6, y0: .3, h: 1.4, rate: .1 },
  snow: { c: ['#ffffff', '#dff3ff'], vy: -.7, life: 1.5, r: .9, y0: 1.8, h: .6, rate: .06 }, embers: { c: ['#ff6a00', '#ffa500', '#ff3d00'], vy: 2.8, life: 1, r: .5, y0: 0, h: .6, rate: .06, sc: .6 },
  petals: { c: TR.petals, vy: -.6, life: 1.6, r: .9, y0: 1.8, h: .6, rate: .07 }, leaves: { c: TR.leaves, vy: -.7, life: 1.6, r: .9, y0: 1.8, h: .6, rate: .07 },
  confetti: { c: TR.confetti, vy: 1.2, life: 1, r: .8, y0: 0, h: 1.6, rate: .05 }, fireflies: { c: ['#fff176', '#e6ee9c'], vy: .15, life: 1.6, r: 1, y0: .2, h: 1.6, rate: .12, sc: .5 },
  stardust: { c: ['#ffd93d', '#fff3b0', '#ffffff'], vy: 1.5, life: 1, r: .5, y0: 0, h: .8, rate: .05, sc: .6 }, rain: { c: ['#6fa8ff', '#a8c8ff'], vy: -4, life: .5, r: .8, y0: 2.2, h: .4, rate: .03, sc: .5 },
  matrix: { c: ['#00ff66', '#7dffb0', '#00b34a'], vy: -2.5, life: .7, r: .7, y0: 2, h: .6, rate: .04, sc: .6 }, toxic: { c: TR.toxic, vy: .9, life: 1.1, r: .6, y0: 0, h: 1, rate: .07, sc: 1 },
  notes: { c: ['#ff6b9d', '#4dd0e1', '#ffd93d'], vy: 1.6, life: 1, r: .7, y0: .8, h: .8, rate: .12, sc: .9 },
  void: { c: TR.void, vy: .4, life: 1.1, r: .8, y0: .2, h: 1.6, rate: .07, sc: 1.2 },
};
const SPINK = ['cool', 'spin', 'tornado', 'float', 'breakdance', 'abduct', 'dab'];
const HEADS = {
  box: { geo: () => new THREE.BoxGeometry(.7, .7, .7), hw: .35, hh: .35, hz: .35 }, round: { geo: () => new THREE.IcosahedronGeometry(.4, 1), hw: .4, hh: .4, hz: .4 },
  tall: { geo: () => new THREE.BoxGeometry(.58, .9, .58), hw: .29, hh: .45, hz: .29 }, pyramid: { geo: () => new THREE.ConeGeometry(.5, .72, 4), ry: Math.PI / 4, hw: .3, hh: .36, hz: .2 },
  bean: { geo: () => new THREE.CapsuleGeometry(.3, .3, 3, 8), hw: .3, hh: .45, hz: .3 }, diamond: { geo: () => new THREE.OctahedronGeometry(.5, 0), hw: .4, hh: .5, hz: .27 },
  barrel: { geo: () => new THREE.CylinderGeometry(.4, .4, .7, 10), hw: .4, hh: .35, hz: .38 }, chunky: { geo: () => new THREE.BoxGeometry(.95, .6, .6), hw: .47, hh: .3, hz: .3 },
  ico: { geo: () => new THREE.IcosahedronGeometry(.44, 0), hw: .44, hh: .44, hz: .4 }, hexa: { geo: () => new THREE.CylinderGeometry(.4, .4, .7, 6), hw: .4, hh: .35, hz: .34 },
  top: { geo: () => new THREE.ConeGeometry(.46, .7, 8), rx: Math.PI, hw: .42, hh: .35, hz: .26 }, snowman: { geo: () => new THREE.IcosahedronGeometry(.38, 1), hw: .38, hh: .38, hz: .38 },
  egg: { geo: () => { const g = new THREE.IcosahedronGeometry(.4, 1); g.scale(.85, 1.2, .85); return g; }, hw: .34, hh: .48, hz: .34 },
  cactus: { geo: () => new THREE.CylinderGeometry(.33, .36, .8, 10), hw: .34, hh: .4, hz: .33 }, cloud: { geo: () => new THREE.IcosahedronGeometry(.42, 1), hw: .42, hh: .4, hz: .4 },
  human: { geo: () => { const g = new THREE.IcosahedronGeometry(.4, 2); g.scale(.7, .88, .75); return g; }, hw: .28, hh: .35, hz: .3 }, can: { geo: () => new THREE.CylinderGeometry(.45, .45, .6, 12), hw: .45, hh: .3, hz: .43 },
};
const HANDG = {
  cactus: () => new THREE.CylinderGeometry(.07, .07, .2, 6), cloud: () => new THREE.IcosahedronGeometry(.12, 1), human: () => new THREE.BoxGeometry(.13, .17, .09), box: () => new THREE.BoxGeometry(.2, .2, .2), round: () => new THREE.IcosahedronGeometry(.12, 1), tall: () => new THREE.BoxGeometry(.14, .26, .14), pyramid: () => new THREE.ConeGeometry(.14, .24, 4),
  bean: () => new THREE.CapsuleGeometry(.08, .1, 3, 6), diamond: () => new THREE.OctahedronGeometry(.15, 0), barrel: () => new THREE.CylinderGeometry(.12, .12, .2, 8), chunky: () => new THREE.BoxGeometry(.26, .18, .18),
  ico: () => new THREE.IcosahedronGeometry(.13, 0), hexa: () => new THREE.CylinderGeometry(.12, .12, .2, 6), top: () => { const g = new THREE.ConeGeometry(.14, .22, 6); g.rotateX(Math.PI); return g; }, snowman: () => new THREE.IcosahedronGeometry(.12, 1),
  egg: () => { const g = new THREE.IcosahedronGeometry(.12, 1); g.scale(.85, 1.2, .85); return g; }, can: () => new THREE.CylinderGeometry(.14, .14, .16, 10),
};
const TRAILS = {
  sparkle: { g: () => new THREE.OctahedronGeometry(.1, 0), cols: 'sparkle', vy: 1.3, grav: 3, life: .8, sc: 1.2, sp: 6, sh: 1 }, flame: { g: () => new THREE.ConeGeometry(.12, .4, 5), cols: 'flame', vy: 2.2, grav: -1, life: .55, sc: 1.2, sh: 1, wb: .6 },
  rainbow: { g: () => shapeGeo('quad'), flat: 1, vy: 0, grav: 0, life: 1.5, sc: 1.2 }, bubbles: { g: () => new THREE.IcosahedronGeometry(.12, 1), cols: 'bubbles', vy: 1.4, grav: -.5, life: 1.5, sc: 1, wb: .7, gr: .25, op: .65 },
  hearts: { g: () => shapeGeo('heart'), cols: 'hearts', vy: 1.5, grav: 0, life: 1.3, sc: 1, sp: 1.5, wb: .4 }, stars: { g: () => shapeGeo('star'), cols: 'stars', vy: 3, grav: 7, life: 1, sc: 1, sp: 8 },
  smoke: { g: () => new THREE.IcosahedronGeometry(.18, 1), cols: 'smoke', vy: 1, grav: -.4, life: 1.3, sc: 1, gr: 1.1, op: .55 }, toxic: { g: () => shapeGeo('disc'), cols: 'toxic', flat: 1, vy: 0, life: 1.7, sc: .5, gr: .5 },
  ice: { g: () => new THREE.ConeGeometry(.1, .5, 5), cols: 'ice', vy: 0, life: 1.5, sc: 1.3, sh: 1, stand: 1 }, void: { g: () => shapeGeo('ring'), cols: 'void', flat: 1, vy: 0, life: .9, sc: .4, gr: 2.4 },
  confetti: { g: () => new THREE.BoxGeometry(.14, .02, .08), cols: 'confetti', vy: 3.5, grav: 14, life: 1.2, sc: 1, sp: 14 }, leaves: { g: () => shapeGeo('leaf'), cols: 'leaves', vy: .8, grav: 1.8, life: 1.9, sc: 1, sp: 2.5, wb: 1.4 },
  coins: { g: () => new THREE.CylinderGeometry(.1, .1, .025, 10), cols: 'coins', vy: 4.5, grav: 18, life: 1.5, sc: 1, sp: 9, bn: .5 }, lightning: { g: () => shapeGeo('bolt'), cols: 'lightning', vy: 0, grav: 0, life: .2, sc: 1.4, up: 1 },
  ink: { g: () => shapeGeo('disc'), cols: 'ink', flat: 1, vy: 0, life: 2.5, sc: .45, gr: .05 }, petals: { g: () => shapeGeo('petal'), cols: 'petals', vy: .9, grav: 1.2, life: 1.9, sc: 1, sp: 2, wb: 1.5 },
  notes: { g: () => shapeGeo('note'), cols: 'notes', vy: 1.3, grav: 0, life: 1.5, sc: .9, wb: .9 }, flake: { g: () => shapeGeo('flake'), cols: 'snow', vy: .4, grav: .9, life: 1.9, sc: .7, sp: 2.5, wb: 1.2 }, paw: { g: () => shapeGeo('paw'), cols: 'paw', flat: 1, vy: 0, life: 2.6, sc: .5 },
};
// ---- name tag frames: draw a frame behind the name; returns [text fill, text outline]
function tagFrame(x, W, H, st, name, ac) {
  const w = Math.min(246, 60 + name.length * 22), x0 = (W - w) / 2, y0 = H - 64, h = 54, col = '#' + new THREE.Color(ac).getHexString(), dk = new THREE.Color(ac).multiplyScalar(.6).getStyle();
  const rr = r => { x.beginPath(); x.moveTo(x0 + r, y0); x.lineTo(x0 + w - r, y0); x.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); x.lineTo(x0 + w, y0 + h - r); x.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); x.lineTo(x0 + r, y0 + h); x.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); x.lineTo(x0, y0 + r); x.quadraticCurveTo(x0, y0, x0 + r, y0); x.closePath(); };
  if (st === 'plate') { x.fillStyle = 'rgba(10,10,26,.8)'; rr(14); x.fill(); x.strokeStyle = col; x.lineWidth = 3; rr(14); x.stroke(); return ['#ffffff', '#000000']; }
  if (st === 'ribbon') { x.fillStyle = dk; for (const bx of [x0 - 24, x0 + w - 6]) { x.beginPath(); x.moveTo(bx, y0 + 10); x.lineTo(bx + 30, y0 + 10); x.lineTo(bx + 30, y0 + h); x.lineTo(bx, y0 + h); x.lineTo(bx + 12, y0 + h / 2 + 5); x.closePath(); x.fill(); } x.fillStyle = col; x.fillRect(x0, y0, w, h - 6); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(x0, y0, w, 4); return ['#ffffff', dk]; }
  if (st === 'neon') { x.fillStyle = 'rgba(7,6,15,.85)'; rr(14); x.fill(); x.shadowBlur = 14; x.shadowColor = col; x.strokeStyle = col; x.lineWidth = 4; rr(14); x.stroke(); x.shadowBlur = 0; return ['#ffffff', col]; }
  if (st === 'wood') { x.fillStyle = '#8a5a2b'; rr(6); x.fill(); x.fillStyle = '#6e4720'; for (let y = y0 + 10; y < y0 + h; y += 13) x.fillRect(x0 + 4, y, w - 8, 2); x.fillStyle = '#2a1608'; for (const [a, b] of [[x0 + 8, y0 + 8], [x0 + w - 8, y0 + 8], [x0 + 8, y0 + h - 8], [x0 + w - 8, y0 + h - 8]]) x.fillRect(a - 3, b - 3, 6, 6); return ['#f6d9a0', '#2a1608']; }
  if (st === 'pixel') { x.fillStyle = '#12102a'; x.fillRect(x0, y0 + 6, w, h - 12); x.fillRect(x0 + 6, y0, w - 12, h); x.fillStyle = col; x.fillRect(x0 + 6, y0 + 6, w - 12, 4); x.fillRect(x0 + 6, y0 + h - 10, w - 12, 4); return ['#ffffff', '#12102a']; }
  if (st === 'scroll') { x.fillStyle = '#f1dfb0'; rr(8); x.fill(); x.fillStyle = '#d9c48d'; for (const cx of [x0 - 4, x0 + w + 4]) { x.beginPath(); x.arc(cx, y0 + h / 2, 18, 0, 7); x.fill(); } return ['#4a2e12', '#f1dfb0']; }
  if (st === 'gold') { const gr = x.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, '#ffe9a0'); gr.addColorStop(.5, '#d9a82a'); gr.addColorStop(1, '#9a6f10'); x.fillStyle = gr; rr(10); x.fill(); x.fillStyle = '#fff3c4'; for (const cx of [x0 + 10, x0 + w - 10]) { x.beginPath(); x.arc(cx, y0 + h / 2, 4, 0, 7); x.fill(); } return ['#3a2a00', '#ffe9a0']; }
  if (st === 'chain') { x.fillStyle = '#37474f'; rr(8); x.fill(); x.strokeStyle = '#90a4ae'; x.lineWidth = 3; rr(8); x.stroke(); x.strokeStyle = '#b0bec5'; x.lineWidth = 4; for (const cx of [x0 + 16, x0 + w - 16]) { x.beginPath(); x.moveTo(cx, y0); x.lineTo(cx, 2); x.stroke(); for (let y = 6; y < y0; y += 9) x.fillRect(cx - 4, y, 8, 3); } return ['#ffffff', '#000000']; }
  if (st === 'ice') { const gr = x.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, '#e9fbff'); gr.addColorStop(1, '#9fd8ff'); x.fillStyle = gr; rr(10); x.fill(); x.fillStyle = '#c9efff'; for (let i = 0; i < Math.floor(w / 26); i++) { const ix = x0 + 14 + i * 26; x.beginPath(); x.moveTo(ix, y0 + h - 2); x.lineTo(ix + 7, y0 + h + 6 + (i % 3) * 3); x.lineTo(ix + 14, y0 + h - 2); x.closePath(); x.fill(); } return ['#0b3a5c', '#e9fbff']; }
  if (st === 'candy') { x.fillStyle = '#ffffff'; rr(12); x.fill(); x.save(); rr(12); x.clip(); x.fillStyle = '#e53935'; for (let i = -h; i < w; i += 22) { x.beginPath(); x.moveTo(x0 + i, y0 + h); x.lineTo(x0 + i + 11, y0 + h); x.lineTo(x0 + i + 11 + h, y0); x.lineTo(x0 + i + h, y0); x.fill(); } x.restore(); x.strokeStyle = '#e53935'; x.lineWidth = 4; rr(12); x.stroke(); return ['#ffffff', '#b71c1c']; }
  if (st === 'circuit') { x.fillStyle = '#06140c'; rr(8); x.fill(); x.strokeStyle = '#39ff88'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 6; i++) { const ix = x0 + 14 + i * (w - 28) / 5, up = i % 2; x.moveTo(ix, y0 + (up ? 0 : h)); x.lineTo(ix, y0 + (up ? 10 : h - 10)); x.lineTo(ix + 10, y0 + (up ? 10 : h - 10)); } x.stroke(); x.fillStyle = '#39ff88'; for (let i = 0; i < 6; i++) x.fillRect(x0 + 24 + i * (w - 28) / 5, y0 + (i % 2 ? 8 : h - 12), 4, 4); x.shadowBlur = 10; x.shadowColor = '#39ff88'; x.lineWidth = 3; rr(8); x.stroke(); x.shadowBlur = 0; return ['#b8ffd6', '#06140c']; }
  if (st === 'speech') { x.fillStyle = '#ffffff'; rr(16); x.fill(); x.beginPath(); x.moveTo(W / 2 - 10, y0 + h - 1); x.lineTo(W / 2, y0 + h + 10); x.lineTo(W / 2 + 10, y0 + h - 1); x.closePath(); x.fill(); x.strokeStyle = col; x.lineWidth = 3; rr(16); x.stroke(); return ['#1b1b2a', '#ffffff']; }
  return ['#ffffff', '#000000'];
}
// ---- 3D dice: each style = die colours + a trail while it tumbles + a burst when it lands
const DICE = {
  classic: { bg: '#f5f5f5', pip: '#1b1b1b' }, gold: { bg: '#e0b030', pip: '#5a3c00', metal: .7, land: '#ffe27a' }, glass: { bg: '#cfe9ff', pip: '#1a4d80', op: .6, land: '#bfe9ff' },
  neon: { bg: '#0b0820', pip: '#4dffee', glow: '#4dffee', land: '#4dffee', trail: 'electric' }, flame: { bg: '#8a1c0a', pip: '#ffd93d', trail: 'flames', land: '#ff6a00' }, ice: { bg: '#b9ecff', pip: '#124a6b', trail: 'snow', land: '#e0faff' }, candy: { bg: '#ff8fc7', pip: '#ffffff', trail: 'confetti', land: '#ffd93d' },
  wood: { bg: '#b9793a', pip: '#3a2210', land: '#e0a869', shake: .12, D: 1.4, bounce: .7, draw: c => { c.fillStyle = 'rgba(60,30,10,.35)'; for (let y = 6; y < 64; y += 9) c.fillRect(0, y, 64, 1.5); c.fillStyle = 'rgba(255,220,160,.14)'; for (let y = 10; y < 64; y += 14) c.fillRect(0, y, 64, 2); } },
  pixel: { bg: '#2b2b6b', pip: '#ffe85c', px: true, trail: 'stardust', land: '#ffe85c', draw: c => { c.fillStyle = '#5b6ee1'; c.fillRect(0, 0, 64, 6); c.fillRect(0, 58, 64, 6); c.fillRect(0, 0, 6, 64); c.fillRect(58, 0, 6, 64); } },
  lava: { bg: '#2a1410', pip: '#ff9a3a', glow: '#ff7a1a', trail: 'embers', land: '#ff6a00', shake: .16, D: 1.35, bounce: .55, draw: c => { c.strokeStyle = '#ff5a14'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 12); c.lineTo(14, 20); c.lineTo(10, 34); c.lineTo(26, 44); c.lineTo(22, 64); c.moveTo(64, 8); c.lineTo(50, 18); c.lineTo(56, 30); c.lineTo(42, 42); c.stroke(); } },
  galaxy: { bg: '#0b0630', pip: '#ffffff', glow: '#a78bff', trail: 'stardust', land: '#c9b8ff', shake: .04, D: 1.9, bounce: 1.5, draw: c => { const g = c.createRadialGradient(32, 32, 4, 32, 32, 46); g.addColorStop(0, '#4a2a9a'); g.addColorStop(1, '#0b0630'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); c.fillStyle = '#ffffff'; for (let i = 0; i < 26; i++) c.fillRect((i * 37) % 62, (i * 53) % 62, i % 3 ? 1 : 2, i % 3 ? 1 : 2); } },
  bone: { bg: '#efe6cf', pip: '#3a3126', trail: 'mist', land: '#fffbe8', shake: .08, draw: c => { c.fillStyle = 'rgba(120,100,70,.18)'; for (let i = 0; i < 14; i++) c.fillRect((i * 41) % 60, (i * 29) % 60, 3, 2); c.strokeStyle = 'rgba(90,70,40,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(6, 4); c.lineTo(14, 20); c.lineTo(10, 30); c.stroke(); } },
  bouncy: { bg: '#6ee27a', pip: '#ffffff', trail: 'bubbles', land: '#b9ffb9', shake: .05, D: 1.9, bounce: 1.9, draw: c => { c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(6, 6, 16, 4); c.fillRect(6, 12, 6, 4); } },
};
export const DICE_IDS = Object.keys(DICE);
const DIE_TX = new Map(), FACE_N = { 2: [1, 0, 0], 5: [-1, 0, 0], 1: [0, 1, 0], 6: [0, -1, 0], 3: [0, 0, 1], 4: [0, 0, -1] };      // BoxGeometry material order: +x -x +y -y +z -z
function dieTex(style, v) {
  const k = style + v; if (DIE_TX.has(k)) return DIE_TX.get(k);
  const S = DICE[style] || DICE.classic, cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = S.bg; c.fillRect(0, 0, 64, 64); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 4; c.strokeRect(2, 2, 60, 60); if (S.draw) S.draw(c); c.fillStyle = S.pip;
  ({ 1: [[32, 32]], 2: [[18, 18], [46, 46]], 3: [[18, 18], [32, 32], [46, 46]], 4: [[18, 18], [46, 18], [18, 46], [46, 46]], 5: [[18, 18], [46, 18], [32, 32], [18, 46], [46, 46]], 6: [[18, 16], [46, 16], [18, 32], [46, 32], [18, 48], [46, 48]] })[v].forEach(([x, y]) => { if (S.px) c.fillRect(x - 6, y - 6, 12, 12); else { c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); } });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; if (S.px) t.magFilter = THREE.NearestFilter; DIE_TX.set(k, t); return t;
}
function makeDie(style) {
  const S = DICE[style] || DICE.classic;
  return new THREE.Mesh(new THREE.BoxGeometry(.7, .7, .7), [2, 5, 1, 6, 3, 4].map(v => new THREE.MeshStandardMaterial({ map: dieTex(style, v), roughness: .4, metalness: S.metal ?? 0, transparent: !!S.op, opacity: S.op ?? 1, emissive: S.glow ? new THREE.Color(S.glow) : new THREE.Color(0), emissiveIntensity: S.glow ? .6 : 0, emissiveMap: S.glow ? dieTex(style, v) : null })));
}
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
    const anim = [];          // per-frame animators for cosmetics (tails, capes, wings, halo...): (t, dt, moving) => void
    const G = (...a) => { const q = new THREE.Group(); a.forEach(o => q.add(o)); return q; };
    const cyM = (rt, rb, h, mt, x = 0, y = 0, z = 0, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mt); m.position.set(x, y, z); return m; };
    const spM = (r, mt, x = 0, y = 0, z = 0, d = 1) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, d), mt); m.position.set(x, y, z); return m; };
    const coM = (r, h, mt, x = 0, y = 0, z = 0, seg = 8) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mt); m.position.set(x, y, z); return m; };
    const BM = c => new THREE.MeshBasicMaterial({ color: c });
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
    else if (body === 'human') {       // a normal-proportioned person among the blobs and boxes: torso, neck, arms and legs that swing when walking
      b = new THREE.Group(); const cy = (rt, rb, h, x, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 8), mat); m.position.set(x, y, 0); return m; }, bxm = (w2, h2, d2, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), mat); m.position.y = y; return m; };
      b.add(bxm(.54, .56, .28, 1.18), bxm(.46, .22, .26, .86), cy(.075, .085, .18, 0, 1.52));
      const lim = (x, y, parts) => { const pv = new THREE.Group(); pv.position.set(x, y, 0); parts.forEach(o => pv.add(o)); b.add(pv); return pv; };
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(.15, .08, .28), new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true })); shoe.position.set(0, -.8, .06);
      const legs = [-1, 1].map(k => lim(k * .12, .84, [cy(.095, .082, .4, 0, -.2), cy(.078, .066, .38, 0, -.59), shoe.clone()]));
      const arms = [-1, 1].map(k => lim(k * .35, 1.42, [cy(.062, .056, .3, 0, -.15), cy(.052, .046, .28, 0, -.44), (() => { const hd = new THREE.Mesh(new THREE.IcosahedronGeometry(.066, 1), mat); hd.position.y = -.62; return hd; })()]));
      anim.push((t, dt, mv) => { const sw = mv ? Math.sin(t * 10) : Math.sin(t * 1.2) * .04; legs[0].rotation.x = sw * .6; legs[1].rotation.x = -sw * .6; arms[0].rotation.x = -sw * .5; arms[1].rotation.x = sw * .5; });
      dy = .4;
    }
    else if (body === 'cactus') { b = new THREE.Group(); const cy2 = (rt, rb, h, x, y, rz = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), mat); m.position.set(x, y, 0); m.rotation.z = rz; return m; }; b.add(cy2(.34, .36, 1.05, 0, .52), cy2(.1, .1, .35, .45, .55, Math.PI / 2), cy2(.1, .1, .35, .6, .72), cy2(.1, .1, .3, -.43, .72, Math.PI / 2), cy2(.1, .1, .35, -.58, .88)); const spm = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }); for (let i2 = 0; i2 < 12; i2++) { const a2 = i2 * 2.4, sp2 = new THREE.Mesh(new THREE.BoxGeometry(.03, .08, .03), spm); sp2.position.set(Math.sin(a2) * .34, .2 + (i2 % 6) * .15, Math.cos(a2) * .34); b.add(sp2); } }
    else if (body === 'cloud') { b = new THREE.Group(); for (const [x, y, z, r] of [[0, .55, 0, .45], [.38, .45, .05, .32], [-.38, .45, .05, .32], [0, .38, .3, .3], [0, .4, -.3, .3], [.2, .8, 0, .28], [-.2, .78, .05, .26]]) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat); m.position.set(x, y, z); b.add(m); } }
    else if (body === 'egg') { b = new THREE.Mesh(new THREE.IcosahedronGeometry(.55, 1), mat); b.scale.set(1, 1.25, .9); b.position.y = .65; dy = .15; }
    else if (body === 'can') { b = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .9, 12), mat); b.position.y = .45; dy = -.05; }
    else { b = new THREE.Mesh(new THREE.BoxGeometry(.9, 1, .6), mat); b.position.y = .5; }
    if (p.coat && p.coat !== 'none') { mat.map = coatTex(p.coat, p.color, ac); mat.color.set(0xffffff); }
    const up = new THREE.Group(); up.position.y = dy;           // head, face and hat ride on top of the body
    const hk = HEADS[p.head && p.head !== 'same' ? p.head : body] || HEADS.round, hs = hk.hw / .4, head = new THREE.Mesh(hk.geo(), mat); if (hk.ry) head.rotation.y = hk.ry; if (hk.rx) head.rotation.x = hk.rx; head.position.y = 1.4; up.add(head);
    if ((p.head && p.head !== 'same' ? p.head : body) === 'human') { const hx = (w2, h2, d2, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), mat); m.position.set(x, y, z); return m; }; up.add(hx(.05, .1, .08, 0, 1.36, .3), hx(.05, .11, .07, -.28, 1.42, 0), hx(.05, .11, .07, .28, 1.42, 0), hx(.12, .05, .08, 0, 1.07, .22)); }
    const fg = new THREE.Group(); fg.scale.setScalar(hs); fg.position.set(0, 1.4 * (1 - hs), hk.hz - .38 * hs); up.add(fg);
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
    const white = () => new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const face = p.face || 'eyes';
    if (['eyes', 'mustache', 'happy', 'angry', 'cat', 'blush', 'surprised', 'monocle', 'vampire', 'clown', 'tears'].includes(face)) for (const k of [-1, 1]) fg.add(box(.12, .14, .06, white(), k * .15, 1.46, .37), box(.06, .08, .06, dark(), k * .15, 1.45, .4));
    if (face === 'mustache') { const mu = this.mat(0x4a2e14); fg.add(box(.26, .06, .05, mu, 0, 1.31, .38)); for (const k of [-1, 1]) { const cu = new THREE.Mesh(new THREE.TorusGeometry(.05, .02, 4, 8, Math.PI * 1.5), mu); cu.position.set(k * .19, 1.33, .38); cu.rotation.z = k > 0 ? -Math.PI / 2 : Math.PI; fg.add(cu); } }
    if (face === 'cyclops') { fg.add(spM(.17, white(), 0, 1.45, .35), spM(.085, BM(0x2a6df4), 0, 1.45, .5, 0), spM(.04, BM(0x111111), 0, 1.45, .56, 0), box(.32, .04, .05, dark(), 0, 1.65, .36)); }
    if (face === 'glasses') { const lens = new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: .3, depthWrite: false }); for (const k of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.1, .022, 4, 12), dark()), l = new THREE.Mesh(new THREE.CircleGeometry(.1, 12), lens); r.position.set(k * .16, 1.46, .38); l.position.set(k * .16, 1.46, .385); fg.add(r, l, box(.03, .03, .3, dark(), k * .31, 1.47, .22)); } fg.add(box(.1, .03, .03, dark(), 0, 1.47, .38)); }
    if (face === 'shades') { for (const k of [-1, 1]) { fg.add(box(.2, .12, .06, dark(), k * .16, 1.46, .38), box(.03, .03, .3, dark(), k * .27, 1.47, .22)); const gl = box(.025, .1, .02, BM(0x9fb4c8), k * .12, 1.47, .415); gl.rotation.z = .5; fg.add(gl); } fg.add(box(.1, .03, .05, dark(), 0, 1.48, .38)); }
    if (face === 'angry') { for (const k of [-1, 1]) { const br = box(.22, .06, .05, dark(), k * .15, 1.58, .38); br.rotation.z = k * .5; fg.add(br, box(.05, .05, .04, BM(0xff3b30), k * .15, 1.45, .4)); } fg.add(box(.18, .035, .04, dark(), 0, 1.27, .38), box(.04, .1, .03, BM(0xff3b30), .27, 1.62, .36), box(.1, .04, .03, BM(0xff3b30), .27, 1.62, .36)); }
    if (face === 'sleepy') for (const k of [-1, 1]) { fg.add(box(.16, .04, .05, dark(), k * .15, 1.45, .38), box(.14, .035, .04, this.mat(0x9a8fc2), k * .15, 1.4, .37)); for (const j of [-1, 0, 1]) { const ls = box(.015, .06, .02, dark(), k * .15 + j * .05, 1.42, .39); ls.rotation.z = j * .4; fg.add(ls); } }
    if (face === 'cat') { fg.add(box(.07, .05, .05, this.mat(0xff8fa3), 0, 1.36, .4)); for (const k of [-1, 1]) for (const j of [-1, 0, 1]) { const w = box(.22, .015, .02, dark(), k * .3, 1.34 + j * .04, .36); w.rotation.z = k * j * .15; fg.add(w); } }
    if (face === 'eyepatch') { fg.add(box(.12, .14, .06, white(), .15, 1.46, .37), box(.06, .08, .06, dark(), .15, 1.45, .4), box(.2, .18, .05, dark(), -.15, 1.46, .38)); const st = box(.95, .03, .03, dark(), 0, 1.55, .34); st.rotation.z = .3; fg.add(st); }
    if (face === 'visor') { fg.add(box(.5, .14, .07, BM(0x4dd0ff), 0, 1.46, .38), box(.48, .02, .075, BM(0xffffff), 0, 1.5, .385), box(.05, .12, .3, dark(), .27, 1.46, .22), box(.05, .12, .3, dark(), -.27, 1.46, .22)); }
    if (face === 'blush') for (const k of [-1, 1]) fg.add(box(.11, .06, .04, this.mat(0xff8fa3), k * .24, 1.34, .38));
    if (face === 'surprised') fg.add(box(.1, .12, .05, dark(), 0, 1.25, .38));
    if (face === 'wink') fg.add(box(.12, .14, .06, white(), -.15, 1.46, .37), box(.06, .08, .06, dark(), -.15, 1.45, .4), box(.16, .04, .05, dark(), .15, 1.46, .38), box(.14, .04, .05, dark(), 0, 1.27, .38));
    if (face === 'monocle') { const r = new THREE.Mesh(new THREE.TorusGeometry(.12, .025, 4, 10), this.mat(0xffd93d)); r.position.set(.15, 1.46, .4); fg.add(r); }
    if (face === 'bigeyes') for (const k of [-1, 1]) fg.add(box(.2, .22, .06, white(), k * .16, 1.46, .37), box(.1, .12, .06, dark(), k * .16, 1.45, .4));
    if (face === 'robot') { const rm = new THREE.MeshBasicMaterial({ color: 0xff3b30 }); for (const k of [-1, 1]) fg.add(box(.13, .13, .06, rm, k * .16, 1.46, .38)); for (let i = -1; i <= 1; i++) fg.add(box(.28, .03, .05, dark(), 0, 1.27 + i * .05, .38)); }
    if (face === 'stareyes') for (const k of [-1, 1]) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(.1, 0), new THREE.MeshBasicMaterial({ color: 0xffd93d })); s.position.set(k * .15, 1.46, .4); s.scale.z = .4; fg.add(s); }
    if (face === 'hearteyes') for (const k of [-1, 1]) { const rm = new THREE.MeshBasicMaterial({ color: 0xff4d6d }), a = box(.1, .1, .05, rm, k * .15, 1.45, .39); a.rotation.z = Math.PI / 4; fg.add(a, box(.06, .06, .05, rm, k * .15 - .04, 1.5, .39), box(.06, .06, .05, rm, k * .15 + .04, 1.5, .39)); }
    if (face === 'dizzy') for (const k of [-1, 1]) for (const r of [-.78, .78]) { const x = box(.17, .035, .04, dark(), k * .15, 1.46, .39); x.rotation.z = r; fg.add(x); }
    if (face === 'vampire') for (const k of [-1, 1]) fg.add(box(.04, .1, .04, white(), k * .08, 1.25, .39), box(.1, .04, .05, dark(), k * .12, 1.3, .38));
    if (face === 'clown') { const nose = new THREE.Mesh(new THREE.IcosahedronGeometry(.08, 0), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); nose.position.set(0, 1.37, .42); fg.add(nose, box(.24, .04, .05, new THREE.MeshBasicMaterial({ color: 0xff3b30 }), 0, 1.24, .38)); }
    if (face === 'tears') for (const k of [-1, 1]) fg.add(box(.05, .16, .04, new THREE.MeshBasicMaterial({ color: 0x4dc3ff }), k * .17, 1.33, .39));
    if (face === 'pixelshades') fg.add(box(.5, .12, .06, dark(), 0, 1.47, .38), box(.12, .07, .06, dark(), -.19, 1.4, .38), box(.12, .07, .06, dark(), .19, 1.4, .38), box(.05, .05, .07, white(), -.15, 1.5, .4));
    if (face === 'kawaii') { for (const k of [-1, 1]) { for (const r of [.7, -.7]) { const a2 = box(.1, .035, .04, dark(), k * .15 + (r > 0 ? -.03 : .03), 1.47, .39); a2.rotation.z = r; fg.add(a2); } fg.add(box(.1, .06, .03, this.mat(0xff8fa3), k * .25, 1.35, .38)); } fg.add(box(.04, .03, .03, dark(), -.03, 1.28, .39), box(.04, .03, .03, dark(), .03, 1.28, .39)); }
    if (face === 'laser') { const lm = []; for (const k of [-1, 1]) { const m2 = box(.18, .07, .06, BM(0xff2222), k * .16, 1.46, .38); fg.add(box(.2, .1, .04, dark(), k * .16, 1.46, .36), m2); lm.push(m2); } anim.push(t => lm.forEach(m2 => { m2.scale.x = 1 + Math.sin(t * 12) * .15; m2.material.color.setHex(Math.sin(t * 9) > 0 ? 0xff2222 : 0xff7a7a); })); }
    if (face === 'domino') fg.add(box(.66, .14, .05, dark(), 0, 1.46, .37), box(.07, .08, .05, white(), -.15, 1.46, .4), box(.07, .08, .05, white(), .15, 1.46, .4), box(.03, .04, .05, dark(), -.15, 1.46, .43), box(.03, .04, .05, dark(), .15, 1.46, .43), box(.06, .1, .3, dark(), .33, 1.46, .2), box(.06, .1, .3, dark(), -.33, 1.46, .2));
    const hat = p.hat; let h;
    if (hat === 'cone') { h = new THREE.Group(); h.add(coM(.3, .6, am(), 0, .3, 0, 8)); for (const y of [.12, .27, .42]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.3 * (1 - y / .6) + .004, .018, 4, 12), white()); r.rotation.x = Math.PI / 2; r.position.y = y; h.add(r); } h.add(spM(.07, BM(0xffd93d), 0, .62, 0, 1)); h.position.y = 1.78; }
    else if (hat === 'top') { h = new THREE.Group(); h.add(cyM(.27, .25, .55, dark(), 0, .28, 0, 10), cyM(.275, .275, .1, am(), 0, .1, 0, 10), cyM(.44, .44, .05, dark(), 0, 0, 0, 12), box(.09, .09, .03, white(), 0, .1, .27)); h.position.y = 1.76; }
    else if (hat === 'ears') { h = new THREE.Group(); for (const k of [-1, 1]) { const e = G(box(.14, .5, .1, mat, 0, .27, 0), box(.08, .42, .04, this.mat(0xff9ecb), 0, .27, .05), spM(.07, mat, 0, .52, 0, 0)); e.position.set(k * .2, 0, 0); e.rotation.z = -k * .14; h.add(e); } h.position.y = 1.7; }
    else if (hat === 'halo') { h = new THREE.Group(); const hv = new THREE.Group(), r1 = new THREE.Mesh(new THREE.TorusGeometry(.3, .05, 6, 16), BM(0xffe27a)), r2 = new THREE.Mesh(new THREE.TorusGeometry(.3, .02, 4, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 })); r1.rotation.x = r2.rotation.x = Math.PI / 2; hv.add(r1, r2); h.add(hv); h.position.y = 2.0; anim.push(t => { hv.position.y = Math.sin(t * 2) * .04; hv.rotation.y = t * .6; }); }
    else if (hat === 'crown') { h = new THREE.Group(); h.add(cyM(.32, .3, .24, am(), 0, .12, 0, 6), cyM(.335, .335, .05, this.mat(0xb71c1c), 0, .02, 0, 6)); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; h.add(coM(.075, .26, am(), Math.cos(a) * .27, .37, Math.sin(a) * .27, 4), spM(.035, BM(0xffffff), Math.cos(a) * .27, .52, Math.sin(a) * .27, 0), spM(.045, BM(i % 2 ? 0xe53935 : 0x4da3ff), Math.cos(a) * .31, .12, Math.sin(a) * .31, 0)); } h.position.y = 1.78; }
    else if (hat === 'wizard') { h = new THREE.Group(); const tip = coM(.2, .45, am(), .13, .78, 0, 8); tip.rotation.z = -.5; h.add(coM(.34, .62, am(), 0, .31, 0, 8), tip, cyM(.58, .58, .05, am(), 0, 0, 0, 12), cyM(.35, .36, .08, dark(), 0, .08, 0, 10)); for (const [x, y, z] of [[.1, .3, .3], [-.14, .2, .3], [.02, .45, .24]]) h.add(spM(.05, BM(0xffd93d), x, y, z, 0)); h.position.y = 1.75; }
    else if (hat === 'cap') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.SphereGeometry(.43, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), am()), box(.42, .04, .3, am(), 0, .02, .4)); h.position.y = 1.55; }
    else if (hat === 'horns') { h = new THREE.Group(); for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.09, .4, 4), am()); c.position.set(k * .3, .2, 0); c.rotation.z = -k * .5; h.add(c); } h.position.y = 1.7; }
    else if (hat === 'propeller') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .15, 4), dark()));
      const sp = new THREE.Group(); sp.position.y = .1; sp.add(box(.8, .03, .12, am(), 0, 0, 0), box(.12, .03, .8, am(), 0, 0, 0)); h.add(sp); h.position.y = 1.85; var spinner = sp; }
    else if (hat === 'antenna') { h = new THREE.Group(); const r = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 4), dark()); r.position.y = .25;
      const t = new THREE.Mesh(new THREE.IcosahedronGeometry(.09, 0), new THREE.MeshBasicMaterial({ color: ac })); t.position.y = .55; h.add(r, t); h.position.y = 1.78; }
    else if (hat === 'pirate') { h = new THREE.Group(); h.add(box(.95, .08, .5, dark(), 0, 0, 0), coM(.3, .3, dark(), 0, .2, 0, 4), box(.5, .05, .52, am(), 0, .06, 0)); h.children[1].rotation.y = Math.PI / 4; for (const k of [-1, 1]) { const fl = box(.26, .16, .5, dark(), k * .42, .1, 0); fl.rotation.z = k * .5; h.add(fl); } h.add(box(.14, .11, .03, white(), 0, .2, .27), box(.03, .03, .04, dark(), -.035, .21, .29), box(.03, .03, .04, dark(), .035, .21, .29)); for (const r of [-.6, .6]) { const cb = box(.22, .025, .02, white(), 0, .12, .27); cb.rotation.z = r; h.add(cb); } h.position.y = 1.72; }
    else if (hat === 'chef') { h = new THREE.Group(); const wt = white(); h.add(cyM(.27, .26, .14, wt, 0, .07, 0, 12)); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; h.add(spM(.17, wt, Math.cos(a) * .15, .3, Math.sin(a) * .15, 1)); } h.add(spM(.21, wt, 0, .44, 0, 1)); h.position.y = 1.72; }
    else if (hat === 'beanie') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.SphereGeometry(.43, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), am()), new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .08, 8), this.mat(0xffffff))); const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 0), this.mat(0xffffff)); pom.position.y = .45; h.add(pom); h.children[1].position.y = .02; h.position.y = 1.55; }
    else if (hat === 'sombrero') { h = new THREE.Group(); const br = cyM(.85, .9, .05, am(), 0, 0, 0, 16), ed = new THREE.Mesh(new THREE.TorusGeometry(.88, .03, 4, 24), dark()); ed.rotation.x = Math.PI / 2; ed.position.y = .03; h.add(br, ed, cyM(.2, .3, .38, am(), 0, .2, 0, 10), cyM(.31, .31, .07, this.mat(0xc0392b), 0, .06, 0, 10)); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; h.add(spM(.04, BM(i % 2 ? 0xffd93d : 0xff6b9d), Math.cos(a) * .88, -.04, Math.sin(a) * .88, 0)); } h.position.y = 1.72; }
    else if (hat === 'viking') { h = new THREE.Group(); const gy = this.mat(0x8d949e); h.add(new THREE.Mesh(new THREE.SphereGeometry(.43, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), gy), box(.06, .26, .04, gy, 0, -.08, .42), cyM(.44, .44, .06, this.mat(0x6d4c2f), 0, 0, 0, 12)); for (const k of [-1, 1]) { const lo = coM(.1, .26, this.mat(0xf5f5f5), k * .44, .1, 0, 6), up = coM(.07, .3, this.mat(0xf5f5f5), k * .62, .3, 0, 6); lo.rotation.z = -k * 1.2; up.rotation.z = -k * .5; h.add(lo, up); } h.position.y = 1.58; }
    else if (hat === 'flower') { h = new THREE.Group(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, pe = spM(.085, am(), Math.cos(a) * .15, 0, Math.sin(a) * .15, 0); pe.scale.set(1.2, .6, 1.2); h.add(pe); } for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + .3; h.add(spM(.07, this.mat(0xffffff), Math.cos(a) * .09, .03, Math.sin(a) * .09, 0)); } h.add(spM(.075, this.mat(0xffd93d), 0, .06, 0, 1), box(.16, .02, .07, this.mat(0x4caf50), .22, -.02, 0)); h.position.set(.2, 1.83, .05); }
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
    else if (hat === 'pumpkin') { h = new THREE.Group(); const o = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 1), this.mat(0xff8c1a)); o.scale.y = .8; h.add(o, box(.07, .14, .07, this.mat(0x2e7d32), 0, .27, 0)); h.position.y = 1.85; }
    else if (hat === 'mushroom') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), this.mat(0xe53935))); for (let i = 0; i < 5; i++) { const a = i * 1.26, d = new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), white()); d.position.set(Math.cos(a) * .3, .3 + (i % 2) * .08, Math.sin(a) * .3); h.add(d); } h.position.y = 1.7; }
    else if (hat === 'traffic') { h = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(.28, .7, 8), this.mat(0xff6d00)), bd = new THREE.Mesh(new THREE.CylinderGeometry(.19, .2, .08, 8), white()); c.position.y = .35; bd.position.y = .3; h.add(c, bd, box(.5, .05, .5, this.mat(0xff6d00), 0, 0, 0)); h.position.y = 1.78; }
    else if (hat === 'unicorn') { h = new THREE.Group(); const horn = new THREE.Mesh(new THREE.ConeGeometry(.1, .6, 6), this.mat(0xffd1f0)); horn.position.y = .3; h.add(horn); for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(.09, .22, 4), this.mat(0xffffff)); e.position.set(k * .25, .02, 0); e.rotation.z = -k * .3; h.add(e); } h.position.y = 1.82; }
    else if (hat === 'astronaut') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.SphereGeometry(.56, 10, 8), new THREE.MeshStandardMaterial({ color: 0xbfe9ff, transparent: true, opacity: .3, depthWrite: false })), new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .12, 10), white())); h.children[1].position.y = -.42; h.position.y = 1.4; }
    else if (hat === 'frog') { h = new THREE.Group(); const gr = this.mat(0x5cb85c); for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.IcosahedronGeometry(.15, 0), gr), p1 = new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), dark()); e.position.set(k * .2, 0, 0); p1.position.set(k * .2, .02, .12); h.add(e, p1); } h.position.y = 1.82; }
    else if (hat === 'shark') { h = new THREE.Mesh(new THREE.ConeGeometry(.25, .65, 3), this.mat(0x78909c)); h.scale.z = .3; h.position.y = 2.05; }
    else if (hat === 'laurel') { h = new THREE.Group(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, l = box(.12, .06, .22, this.mat(0x4caf50), Math.cos(a) * .42, 0, Math.sin(a) * .42); l.rotation.y = -a; h.add(l); } h.position.y = 1.65; }
    else if (hat === 'hardhat') { h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.SphereGeometry(.44, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), this.mat(0xffc107)), box(.1, .06, .9, this.mat(0xffb300), 0, .4, 0), new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .04, 8), this.mat(0xffc107))); h.position.y = 1.58; }
    else if (hat === 'cake') { h = new THREE.Group(); const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(.06, 0), new THREE.MeshBasicMaterial({ color: 0xff9f1a })); fl.position.y = .46; h.add(new THREE.Mesh(new THREE.CylinderGeometry(.32, .34, .25, 10), this.mat(0xff9ecb)), box(.64, .06, .64, white(), 0, .12, 0), box(.05, .2, .05, this.mat(0xffd93d), 0, .3, 0), fl); h.position.y = 1.75; }
    else if (hat === 'sailor') { h = new THREE.Group(); h.add(cyM(.34, .3, .2, white(), 0, .1, 0, 14), cyM(.35, .35, .06, this.mat(0x1565c0), 0, .04, 0, 14), cyM(.4, .4, .03, white(), 0, 0, 0, 14), box(.18, .06, .04, dark(), .2, .06, .28)); for (const k of [-1, 1]) { const tl = box(.04, .22, .02, dark(), .3 + k * .03, -.08, .1); tl.rotation.z = k * .2; h.add(tl); } h.position.y = 1.72; }
    else if (hat === 'safari') { h = new THREE.Group(); const kh = this.mat(0xd2b48c); h.add(new THREE.Mesh(new THREE.SphereGeometry(.44, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), kh), cyM(.56, .56, .04, kh, 0, 0, 0, 14), cyM(.45, .45, .07, this.mat(0x6d4c2f), 0, .06, 0, 12), box(.12, .1, .03, am(), 0, .08, .45)); h.position.y = 1.62; }
    else if (hat === 'magician') { h = new THREE.Group(); const ears = [-1, 1].map(k => { const e2 = G(box(.08, .32, .05, white(), 0, .16, 0), box(.04, .24, .03, this.mat(0xff9ecb), 0, .16, .02)); e2.position.set(k * .09, .52, 0); e2.rotation.z = -k * .2; return e2; }); h.add(cyM(.28, .26, .55, dark(), 0, .28, 0, 10), cyM(.285, .285, .1, this.mat(0xc0392b), 0, .1, 0, 10), cyM(.44, .44, .05, dark(), 0, 0, 0, 12), ...ears); let st = 0; anim.push((t, dt) => { ears.forEach((e2, i) => { e2.rotation.z = (i ? 1 : -1) * (-.2 + Math.sin(t * 4 + i * 2) * .18); }); if ((st -= dt) <= 0) { st = 1.4; this.auraBit({ aura: 'sparkles', g }); } }); h.position.y = 1.76; }
    if (h) { h.scale.multiplyScalar(hs); h.position.set(h.position.x * hs, 1.4 + (h.position.y - 1.4) * hs + (hk.hh - .4 * hs), h.position.z * hs); }
    if (h) up.add(h);
    const fr = p.tagframe && p.tagframe !== 'none' ? p.tagframe : '', ttl = p.title && p.title !== 'none' ? OPTS.title.vals[p.title] : '', cv = document.createElement('canvas'); cv.width = 256; cv.height = ttl || fr ? 96 : 64;
    const x = cv.getContext('2d'); x.font = 'bold 36px sans-serif'; x.textAlign = 'center';
    const [nf, ns] = fr ? tagFrame(x, 256, cv.height, fr, p.name, ac) : ['#ffffff', '#000000']; x.fillStyle = nf; x.strokeStyle = ns; x.lineWidth = 6;
    x.strokeText(p.name, 128, cv.height - 20); x.fillText(p.name, 128, cv.height - 20);
    if (ttl) { x.font = 'bold 26px sans-serif'; x.lineWidth = 5; { const TC = { champ: '#ffd93d', royal: '#c792ff', menace: '#ff6b6b', fire: '#ff9f43', brain: '#7fd8ff', lucky: '#7cf08a', speedy: '#fff176', chill: '#80deea', hoarder: '#ffd93d', sniper: '#ff8a80', turtle: '#a5d6a7', spender: '#80cbc4', sneaky: '#b0bec5', owl: '#9fa8da', rookie: '#c5e1a5', tank: '#bcaaa4', ace: '#ff80ab', gremlin: '#aed581', wizard: '#b388ff', goat: '#ffe082', noob: '#90caf9', chaos: '#ff5252', zen: '#a7ffeb' }; if (p.title === 'legend') { const gr = x.createLinearGradient(30, 0, 226, 0); ['#ff4d6d', '#ffd93d', '#7cf08a', '#4dd0e1', '#b28dff'].forEach((c, i) => gr.addColorStop(i / 4, c)); x.fillStyle = gr; } else x.fillStyle = TC[p.title] || '#ffd93d'; } x.strokeText(ttl, 128, 30); x.fillText(ttl, 128, 30); }
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv) }));
    tag.scale.set(3, ttl || fr ? 1.125 : .75, 1); tag.position.y = 2.8 + dy + (ttl || fr ? .18 : 0);
    g.add(b, up, tag);
    // body pattern, back item and ground aura (all sit on the body, so they need its size: br = radius, by = middle height)
    const BR = { box: .55, round: .62, tall: .39, pyramid: .5, bean: .42, diamond: .8, barrel: .52, chunky: .72, ico: .6, hexa: .5, top: .55, snowman: .5, egg: .55, can: .55, human: .3, cactus: .42, cloud: .6 }, BYM = { box: .5, round: .55, tall: .68, pyramid: .3, bean: .66, diamond: .75, barrel: .5, chunky: .45, ico: .6, hexa: .5, top: .62, snowman: .55, egg: .65, can: .45, human: 1.1, cactus: .6, cloud: .55 };
    const ZH = { box: .3, chunky: .35, round: .51, ico: .55, hexa: .43, tall: .4, barrel: .5, bean: .4, egg: .5, can: .55, human: .16, cactus: .36, cloud: .45 }, WH = { box: .45, chunky: .625, round: .6, ico: .58, hexa: .5, tall: .4, barrel: .5, bean: .4, egg: .55, can: .55, human: .3, cactus: .5, cloud: .7 };
    const zf = y => body === 'pyramid' ? Math.max(.06, .46 * (1 - y / 1.1)) : body === 'diamond' ? Math.max(.08, .75 * (1 - Math.abs(y - .75) / .86)) : body === 'top' ? Math.max(.05, .55 * (y - .05)) : body === 'snowman' ? Math.sqrt(Math.max(.01, y < .95 ? .25 - (y - .5) ** 2 : .13 - (y - 1.1) ** 2)) : (ZH[body] ?? .35);
    const wf = y => WH[body] ?? zf(y);
    const br = BR[body] ?? .55, by = BYM[body] ?? .5, rr = y => body === 'pyramid' ? Math.max(.1, .65 * (1 - y / 1.1)) + .03 : body === 'diamond' || body === 'top' || body === 'snowman' ? wf(y) + .04 : br, fz = y => zf(y) + .03;   // zf/wf = half depth/width of the body at height y; fz = front surface for flat decals
    const ringAt = (y, r, t, m, fit = true) => { const o = new THREE.Mesh(new THREE.TorusGeometry(r, t, 4, 14), m || am()); o.rotation.x = Math.PI / 2; o.position.y = y; if (fit && body !== 'pyramid') o.scale.set(Math.max(.2, (wf(y) + .04) / r), Math.max(.2, (zf(y) + .04) / r), 1); return o; };
    const pat = p.pattern || 'none';
    if (pat !== 'none') {       // outfits fit themselves to the REAL body surface with rays, so they work on every body shape
      g.updateMatrixWorld(true);
      const rc = new THREE.Raycaster(), V = (x, y, z) => new THREE.Vector3(x, y, z), M = c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, side: THREE.DoubleSide });
      const hit = (o, d) => { rc.set(o, d); return rc.intersectObject(b, true)[0] || null; };
      const sf = (x, y) => { const r = hit(V(x, y, 3), V(0, 0, -1)); return r ? r.point.z : zf(y); };
      const sx = y => { const r = hit(V(3, y, 0), V(-1, 0, 0)); return r ? r.point.x : wf(y); };
      const radial = (a, y, off) => { const dx = Math.sin(a), dz = Math.cos(a), r = hit(V(dx * 3, y, dz * 3), V(-dx, 0, -dz)), d = r ? 3 - r.distance : .4; return [dx * (d + off), dz * (d + off)]; };
      const T = (() => { const r = hit(V(0, 3, 0), V(0, -1, 0)); return r ? r.point.y : 1; })(), accN = new THREE.Color(ac).getHex(), dk = n => new THREE.Color(n).multiplyScalar(.7).getHex(), hw = y => Math.max(.12, sx(y) - .03);
      const mesh = (pos, idx, mt) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); const o = new THREE.Mesh(geo, mt); g.add(o); return o; };
      const band = (y0, y1, c, off = .025, n = 22) => { const pos = [], idx = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; for (const y of [y0, y1]) { const [x, z] = radial(a, y, off); pos.push(x, y, z); } } for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1); } return mesh(pos, idx, M(c)); };
      const patch = (x0, x1, y0, y1, c, off = .03, nx = 4, ny = 4) => { const pos = [], idx = []; for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const y = y0 + (y1 - y0) * j / ny, lim = hw(y), x = Math.max(-lim, Math.min(lim, x0 + (x1 - x0) * i / nx)); pos.push(x, y, sf(x, y) + off); } for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = j * (nx + 1) + i; idx.push(q, q + 1, q + nx + 1, q + 1, q + nx + 2, q + nx + 1); } return mesh(pos, idx, M(c)); };
      const strip = (x0, y0, x1, y1, w, c, off = .035, n = 8) => { const pos = [], idx = [], dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, px = -dy / l * w / 2, py = dx / l * w / 2; for (let i = 0; i <= n; i++) { const x = x0 + dx * i / n, y = y0 + dy * i / n; for (const sg of [-1, 1]) { const xx = x + px * sg, yy = y + py * sg; pos.push(xx, yy, sf(xx, yy) + off); } } for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); return mesh(pos, idx, M(c)); };
      const dot = (x, y, r, c, off = .05) => { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M(c)); o.position.set(x, y, sf(x, y) + off); g.add(o); return o; };
      const bx = (w, h, d, c, x, y, off = .06) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); o.position.set(x, y, sf(x, y) + off); g.add(o); return o; };
      const bow = (y, c) => { const z = sf(0, y) + .07; for (const k of [-1, 1]) { const cn = new THREE.Mesh(new THREE.ConeGeometry(.09, .19, 4), M(c)); cn.rotation.z = k * Math.PI / 2; cn.position.set(k * .09, y, z); g.add(cn); } bx(.07, .07, .06, dk(c), 0, y, .07); };
      if (pat === 'stripes') for (const d of [.25, .5, .75]) band(T - d - .06, T - d + .06, accN);
      else if (pat === 'belt') { const y = T - .6; band(y - .07, y + .07, 0x2b2b2b, .03); bx(.2, .17, .05, 0xffd93d, 0, y, .05); }
      else if (pat === 'dots') for (let i = 0; i < 16; i++) { const y = T - .2 - (i % 4) * .17, [x, z] = radial(i * 2.4, y, .03), o = new THREE.Mesh(new THREE.IcosahedronGeometry(.055, 0), M(accN)); o.position.set(x, y, z); g.add(o); }
      else if (pat === 'scarf') { band(T - .16, T, accN, .06); bx(.17, .55, .05, accN, .16, T - .35, .06); bx(.17, .12, .05, dk(accN), .16, T - .66, .06); }
      else if (pat === 'sash') strip(-hw(T - .1) * .8, T - .08, hw(T - .6) * .8, T - .72, .15, accN);
      else if (pat === 'bowtie') bow(T - .06, accN);
      else if (pat === 'tie') { strip(0, T - .1, 0, T - .55, .12, accN); bx(.1, .1, .06, dk(accN), 0, T - .08, .06); const tip = new THREE.Mesh(new THREE.ConeGeometry(.09, .16, 4), M(accN)); tip.rotation.x = Math.PI; tip.position.set(0, T - .62, sf(0, T - .62) + .05); g.add(tip); }
      else if (pat === 'overalls') { patch(-hw(T - .5) * .85, hw(T - .5) * .85, T - .75, T - .38, accN); patch(-.13, .13, T - .68, T - .56, dk(accN), .045, 2, 2); for (const k of [-1, 1]) { strip(k * hw(T - .38) * .55, T - .38, k * hw(T - .05) * .5, T - .04, .1, accN); dot(k * .17, T - .4, .035, 0xffd93d, .06); } }
      else if (pat === 'tux') { const w = hw(T - .45); patch(-w, w, T - .85, T - .04, 0x15151c, .03, 6, 6); patch(-.11, .11, T - .72, T - .06, 0xffffff, .045, 2, 5); for (const k of [-1, 1]) strip(k * .13, T - .05, k * .3, T - .45, .09, 0x0b0b10, .05); for (const y of [T - .3, T - .45, T - .6]) dot(0, y, .03, 0x222222, .06); band(T - .88, T - .74, 0xb71c1c, .035); bow(T - .06, 0x111111); }
      else if (pat === 'hoodie') { band(T - .9, T - .03, accN, .045); const hd = new THREE.Mesh(new THREE.SphereGeometry(.34, 10, 8), M(accN)); hd.scale.set(1.15, .7, .8); hd.position.set(0, T + .02, -zf(T - .05) * .9); g.add(hd); band(T - .12, T + .02, dk(accN), .09); patch(-.2, .2, T - .62, T - .36, dk(accN), .07); for (const k of [-1, 1]) bx(.025, .22, .025, 0xffffff, k * .08, T - .22, .08); }
      else if (pat === 'armor') { const w = hw(T - .3); patch(-w, w, T - .62, T - .06, 0xb0b7c3, .04, 5, 5); strip(0, T - .06, 0, T - .62, .05, 0xffd93d, .06); band(T - .66, T - .56, 0xffd93d, .05); band(T - .82, T - .66, 0x7b838f, .04); for (const k of [-1, 1]) { const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(.2, 1), M(0xb0b7c3)); sp.scale.set(1, .6, 1); sp.position.set(k * (sx(T - .1) + .02), T - .04, 0); g.add(sp); } }
      else if (pat === 'jersey') { band(T - .9, T - .03, accN, .04); band(T - .5, T - .4, 0xffffff, .05); const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x2 = cv.getContext('2d'); x2.fillStyle = '#ffffff'; x2.font = 'bold 44px sans-serif'; x2.textAlign = 'center'; x2.fillText('7', 32, 48); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const dc = new THREE.Mesh(new THREE.PlaneGeometry(.3, .3), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); dc.position.set(0, T - .26, sf(0, T - .26) + .07); g.add(dc); }
      else if (pat === 'labcoat') { band(T - .92, T - .04, 0xf4f6fa, .05); strip(0, T - .06, 0, T - .92, .025, 0x2b2f3a, .07); for (const k of [-1, 1]) { const c = bx(.14, .05, .05, 0xf4f6fa, k * .1, T - .05, .08); c.rotation.z = -k * .6; patch(k * .12, k * .3, T - .8, T - .66, 0xe1e5ec, .08, 2, 2); } bx(.025, .14, .03, 0xe53935, .2, T - .62, .1); }
      else if (pat === 'hero') { band(T - .8, T - .04, accN, .04); band(T - .66, T - .58, 0xffd93d, .06); const e1 = bx(.28, .28, .04, 0xffd93d, 0, T - .3, .07); e1.rotation.z = Math.PI / 4; const e2 = bx(.17, .17, .04, 0xd32f2f, 0, T - .3, .09); e2.rotation.z = Math.PI / 4; }
      else if (pat === 'apron') { const w = hw(T - .5) * .85; patch(-w, w, T - .9, T - .12, 0xf7f7f2, .04, 4, 5); for (const k of [-1, 1]) strip(k * .13, T - .04, k * w * .8, T - .2, .05, 0xf7f7f2); band(T - .62, T - .55, accN, .05); patch(-.14, .14, T - .8, T - .64, 0xe8e8e0, .06, 2, 2); }
      else if (pat === 'poncho') { band(T - .6, T - .05, accN, .11); band(T - .34, T - .24, 0xffd93d, .12); for (let i2 = 0; i2 < 20; i2++) { const [px, pz] = radial(i2 / 20 * Math.PI * 2, T - .6, .11), fr2 = new THREE.Mesh(new THREE.BoxGeometry(.03, .14, .03), M(dk(accN))); fr2.position.set(px, T - .66, pz); g.add(fr2); } }
      else if (pat === 'hawaiian') { band(T - .85, T - .04, 0x1fa8a0, .04); for (let i2 = 0; i2 < 14; i2++) { const y = T - .2 - (i2 % 4) * .16, [px, pz] = radial(i2 * 2.1, y, .05), f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(.06, 0), M(i2 % 2 ? 0xff6b9d : 0xffffff)); f2.position.set(px, y, pz); g.add(f2); } for (const k of [-1, 1]) { const c2 = bx(.14, .05, .05, 0x15857f, k * .1, T - .05, .08); c2.rotation.z = -k * .6; } }
      else if (pat === 'astronaut') { band(T - .9, T - .03, 0xf4f4f4, .05); band(T - .05, T + .04, 0xb0bec5, .09); patch(-.17, .17, T - .55, T - .3, 0x607d8b, .08, 2, 2); for (let i2 = 0; i2 < 3; i2++) dot((i2 - 1) * .09, T - .42, .025, [0xff5252, 0x69f0ae, 0xffd740][i2], .1); patch(-.28, -.14, T - .22, T - .1, 0xe53935, .07, 1, 1); band(T - .66, T - .6, 0xff9800, .06); }
      else if (pat === 'kimono') { band(T - .9, T - .03, accN, .045); strip(-.26, T - .05, .04, T - .5, .1, 0xffffff, .06); strip(.26, T - .05, -.04, T - .5, .1, 0xffffff, .06); band(T - .6, T - .38, 0xffd93d, .08); const [kx, kz] = radial(Math.PI, T - .5, .1), kb = new THREE.Mesh(new THREE.BoxGeometry(.4, .22, .1), M(0xffd93d)); kb.position.set(kx, T - .5, kz); g.add(kb); }
      else if (pat === 'ninja') { band(T - .9, T - .03, 0x20232a, .04); strip(-.3, T - .06, .3, T - .7, .09, 0x4a4f5a, .06); strip(.3, T - .06, -.3, T - .7, .09, 0x4a4f5a, .06); band(T - .66, T - .54, 0xd32f2f, .06); }
      else if (pat === 'raincoat') { band(T - .95, T - .03, 0xffd93d, .05); for (const y of [T - .25, T - .45, T - .65]) dot(0, y, .035, 0x6d4c2f, .07); const rh = new THREE.Mesh(new THREE.SphereGeometry(.34, 10, 8), M(0xffd93d)); rh.scale.set(1.15, .7, .8); rh.position.set(0, T + .02, -zf(T - .05) * .9); g.add(rh); band(T - .12, T, 0xe0b800, .09); }
      else if (pat === 'tracksuit') { band(T - .9, T - .03, accN, .045); for (const k of [-1, 1]) strip(k * hw(T - .45) * .55, T - .06, k * hw(T - .8) * .55, T - .86, .07, 0xffffff, .06); strip(0, T - .04, 0, T - .88, .03, 0xdddddd, .07); band(T - .9, T - .82, 0xffffff, .06); band(T - .1, T - .03, dk(accN), .08); bx(.05, .08, .04, 0xdddddd, 0, T - .08, .1); }
      else if (pat === 'pirate') { band(T - .9, T - .03, 0x6d1b1b, .05); patch(-.12, .12, T - .62, T - .06, 0xf1ead2, .06, 2, 4); for (const k of [-1, 1]) for (const y of [T - .25, T - .42, T - .59]) dot(k * .22, y, .03, 0xffd93d, .08); band(T - .72, T - .6, 0x1a1a1a, .06); bx(.14, .12, .05, 0xffd93d, 0, T - .66, .1); strip(-.3, T - .1, .3, T - .55, .09, 0xc9a227, .08); }
      else if (pat === 'lifevest') { const w = hw(T - .4); patch(-w, -.05, T - .8, T - .06, 0xff7043, .05, 3, 5); patch(.05, w, T - .8, T - .06, 0xff7043, .05, 3, 5); band(T - .55, T - .47, 0xffffff, .06); band(T - .3, T - .22, 0xffffff, .06); bx(.08, .1, .04, 0x37474f, 0, T - .5, .09); }
    }
    const bz = -(zf(by) + .05), back = p.back || 'none';
    if (back === 'cape') { const w = Math.min(1.3, Math.max(.7, wf(by) * 2 - .05)); let par = new THREE.Group(); par.position.set(0, by + .45, bz); g.add(par); const segs = []; for (let i = 0; i < 5; i++) { const sg = new THREE.Group(); if (i) sg.position.y = -.22; sg.add(box(w * (1 + i * .05), .24, .035, i % 2 ? am() : this.mat(0xb71c1c), 0, -.12, 0)); par.add(sg); segs.push(sg); par = sg; } segs[4].add(box(w * 1.3, .05, .045, dark(), 0, -.25, 0)); for (const k of [-1, 1]) g.add(spM(.05, BM(0xffd93d), k * w * .4, by + .43, bz + .02, 0)); anim.push((t, dt, mv) => segs.forEach((q, i) => { q.rotation.x = (i ? .06 : .14) + Math.sin(t * (mv ? 9 : 2.2) - i * .7) * (mv ? .2 : .05) + (mv ? .1 : 0); })); }
    else if (back === 'wings') { const sh = new THREE.Shape(); sh.moveTo(0, .1); sh.lineTo(.5, .28); sh.lineTo(1.15, .22); sh.lineTo(1.05, .08); sh.lineTo(1.2, -.02); sh.lineTo(.95, -.06); sh.lineTo(1.05, -.2); sh.lineTo(.7, -.16); sh.lineTo(.6, -.3); sh.lineTo(.3, -.14); sh.lineTo(0, -.1); sh.closePath(); const wm = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide }), wm2 = new THREE.MeshStandardMaterial({ color: 0xdfe8f5, flatShading: true, side: THREE.DoubleSide }); const ws = []; for (const k of [-1, 1]) { const pv = new THREE.Group(), a = new THREE.Mesh(new THREE.ShapeGeometry(sh), wm), b2 = new THREE.Mesh(new THREE.ShapeGeometry(sh), wm2); b2.scale.set(.7, .7, 1); b2.position.set(.02, -.05, .01); pv.add(a, b2); pv.scale.x = k; pv.position.set(k * (wf(by) * .3 + .08), by + .35, bz); pv.rotation.y = k * .4; g.add(pv); ws.push([pv, k]); } anim.push((t, dt, mv) => ws.forEach(([pv, k]) => { pv.rotation.z = k * (.2 + Math.sin(t * (mv ? 10 : 2.5)) * (mv ? .5 : .14)); })); }
    else if (back === 'backpack') { g.add(box(.6, .7, .3, am(), 0, by + .1, bz - .12), box(.5, .18, .32, dark(), 0, by + .33, bz - .12), box(.1, .08, .04, BM(0xffd93d), 0, by + .27, bz + .06), box(.14, .3, .12, dark(), -.37, by + .02, bz - .1), box(.14, .3, .12, dark(), .37, by + .02, bz - .1), box(.18, .06, .1, dark(), 0, by + .5, bz - .12)); for (const k of [-1, 1]) g.add(box(.07, .5, .04, dark(), k * .18, by + .15, bz + .06)); }
    else if (back === 'tail') { let par = new THREE.Group(); par.position.set(0, .3, bz - .02); g.add(par); const segs = []; for (let i = 0; i < 6; i++) { const sg = new THREE.Group(); if (i) { sg.position.set(0, 0, -.16); sg.rotation.x = -.22; } sg.add(spM(.14 - i * .014, i === 5 ? am() : mat, 0, 0, -.06, 0)); par.add(sg); segs.push(sg); par = sg; } anim.push((t, dt, mv) => segs.forEach((q, i) => { q.rotation.y = Math.sin(t * (mv ? 9 : 2.5) - i * .5) * (mv ? .45 : .2); })); }
    else if (back === 'jetpack') { const fl = []; for (const k of [-1, 1]) { g.add(cyM(.12, .12, .65, this.mat(0x8d949e), k * .2, by + .2, bz - .1, 8), cyM(.13, .13, .06, this.mat(0xe53935), k * .2, by + .5, bz - .1, 8), cyM(.09, .13, .1, dark(), k * .2, by - .17, bz - .1, 8)); const f = coM(.1, .34, BM(0xff9f1a), k * .2, by - .38, bz - .1, 6); f.rotation.x = Math.PI; g.add(f); fl.push(f); } let st = 0; anim.push((t, dt, mv) => { fl.forEach((f, i) => { f.scale.set(1, .7 + Math.sin(t * 28 + i) * .25 + (mv ? .6 : 0), 1); }); if (mv && (st -= dt) <= 0) { st = .06; const pp = g.position; this.burst(pp.x, pp.y + by - .3, pp.z, '#ff9f1a', 2); } }); }
    else if (back === 'shell') { const sh = new THREE.Mesh(new THREE.SphereGeometry(.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), am()); sh.rotation.x = -Math.PI / 2; sh.position.set(0, by + .1, bz + .05); g.add(sh); const dk = dark(); for (const [x, y, z] of [[0, 0, -.55], [.3, .1, -.45], [-.3, .1, -.45], [.28, -.25, -.42], [-.28, -.25, -.42]]) { const pt = cyM(.15, .15, .03, dk, 0, 0, 0, 6); pt.position.set(x, by + .1 + y, bz + .05 + z); g.add(pt); pt.lookAt(new THREE.Vector3(x * 2, by + .1 + y * 2, bz + .05 + z * 3)); pt.rotateX(Math.PI / 2); } const rim = new THREE.Mesh(new THREE.TorusGeometry(.55, .04, 4, 12), dk); rim.position.set(0, by + .1, bz + .05); g.add(rim); }
    else if (back === 'bat') { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.35, .5); sh.lineTo(.95, .62); sh.lineTo(.8, .35); sh.lineTo(.9, .12); sh.lineTo(.62, .18); sh.lineTo(.5, -.12); sh.lineTo(.3, .06); sh.lineTo(.12, -.3); sh.closePath(); const bm = new THREE.MeshStandardMaterial({ color: 0x3a2a52, flatShading: true, side: THREE.DoubleSide }); for (const k of [-1, 1]) { const w1 = new THREE.Mesh(new THREE.ShapeGeometry(sh), bm); w1.scale.x = k; w1.position.set(k * (wf(by) * .3 + .08), by + .15, bz); w1.rotation.y = k * .35; const bone = box(.9, .03, .03, dark(), k * (wf(by) * .3 + .5), by + .45, bz - .01); bone.rotation.z = k * .35; g.add(w1, bone); } }
    else if (back === 'angel') { const fs = []; for (const k of [-1, 1]) for (let i = 0; i < 6; i++) { const fh = .55 + (i < 3 ? i : 5 - i) * .12, f = box(.14, fh, .035, this.mat(i % 2 ? 0xffffff : 0xfff3d6), 0, 0, 0); f.geometry.translate(0, fh / 2, 0); f.position.set(k * (wf(by) * .35 + .1), by + .2, bz); f.rotation.x = -.12; g.add(f); fs.push([f, k, i]); } anim.push((t, dt, mv) => fs.forEach(([f, k, i]) => { f.rotation.z = -k * (.25 + i * .22 + Math.sin(t * (mv ? 10 : 2.4) - i * .25) * (mv ? .16 : .05)); })); }
    else if (back === 'balloon') { const pv = new THREE.Group(); pv.position.set(0, by + .3, bz - .12); const bl = spM(.34, am(), 0, 1.55, 0, 1); bl.scale.y = 1.2; pv.add(cyM(.012, .012, 1.4, dark(), 0, .7, 0, 4), bl, coM(.05, .08, am(), 0, 1.15, 0, 5)); g.add(pv); anim.push((t, dt, mv) => { pv.rotation.z = Math.sin(t * 1.6) * .08 + (mv ? .15 : 0); pv.rotation.x = Math.sin(t * 1.3) * .05 - (mv ? .1 : 0); }); }
    else if (back === 'flag') { g.add(cyM(.025, .025, 1.7, dark(), .3, by + .85, bz - .1, 5), spM(.045, BM(0xffd93d), .3, by + 1.72, bz - .1, 0)); const cl = []; for (let i = 0; i < 4; i++) { const sg = box(.14, .34, .03, i % 2 ? am() : this.mat(0xffffff), 0, 0, 0); sg.position.set(.37 + i * .14, by + 1.5, bz - .1); g.add(sg); cl.push(sg); } anim.push((t, dt, mv) => cl.forEach((sg, i) => { sg.position.z = bz - .1 + Math.sin(t * (mv ? 9 : 4) - i * .9) * .05 * (i + 1) * .5; sg.rotation.y = Math.sin(t * (mv ? 9 : 4) - i * .9) * .25; })); }
    else if (back === 'sword') { const grp = new THREE.Group(); grp.add(box(.12, 1.3, .05, this.mat(0xcfd8dc), 0, 0, 0), box(.34, .07, .08, am(), 0, -.5, 0), box(.07, .22, .07, dark(), 0, -.65, 0)); grp.position.set(0, by + .2, bz - .04); grp.rotation.z = .8; g.add(grp); }
    else if (back === 'guitar') { const grp = new THREE.Group(), bd = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .08, 10), am()); bd.rotation.x = Math.PI / 2; bd.position.y = -.35; grp.add(bd, box(.06, .8, .05, dark(), 0, .2, 0), box(.1, .18, .05, dark(), 0, .65, 0)); grp.position.set(0, by + .1, bz - .06); grp.rotation.z = -.5; g.add(grp); }
    else if (back === 'umbrella') { const grp = new THREE.Group(), cp = new THREE.Mesh(new THREE.ConeGeometry(.75, .35, 8), am()); cp.position.y = .95; grp.add(cp, box(.04, 1.3, .04, dark(), 0, .45, 0)); grp.position.set(.2, by - .1, bz - .06); grp.rotation.z = -.35; g.add(grp); }
    else if (back === 'quiver') { const grp = new THREE.Group(); grp.add(new THREE.Mesh(new THREE.CylinderGeometry(.12, .1, .7, 6), this.mat(0x6d4c2f))); for (let i = 0; i < 3; i++) grp.add(box(.03, .3, .03, this.mat(0xffffff), (i - 1) * .06, .45, 0)); grp.position.set(.18, by + .15, bz - .05); grp.rotation.z = -.3; g.add(grp); }
    else if (back === 'fairy') { const sh = new THREE.Shape(); sh.absellipse(0, 0, .22, .5, 0, Math.PI * 2, false, 0); const ws = []; for (const [k, up, s2, col] of [[-1, 1, 1, 0xbfe9ff], [1, 1, 1, 0xffc2f0], [-1, 0, .65, 0xd9c2ff], [1, 0, .65, 0xbfffe0]]) { const wm = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .6, side: THREE.DoubleSide })); wm.scale.set(s2, s2, 1); const pv = new THREE.Group(); pv.position.set(k * (wf(by) * .25 + .06), by + .3 - (up ? 0 : .28), bz); wm.position.set(k * .22 * s2, up ? .28 * s2 : -.2 * s2, 0); wm.rotation.z = -k * (up ? .4 : -.4); pv.add(wm); pv.rotation.y = k * .35; g.add(pv); ws.push([pv, k]); } let st = 0; anim.push((t, dt, mv) => { ws.forEach(([pv, k]) => { pv.rotation.y = k * (.3 + Math.sin(t * (mv ? 28 : 9)) * (mv ? .4 : .2)); }); if (mv && (st -= dt) <= 0) { st = .12; this.auraBit({ aura: 'stardust', g }); } }); }
    else if (back === 'surf') { const sh = new THREE.Shape(); sh.moveTo(0, -.75); sh.quadraticCurveTo(.26, -.4, .24, .1); sh.quadraticCurveTo(.2, .55, 0, .78); sh.quadraticCurveTo(-.2, .55, -.24, .1); sh.quadraticCurveTo(-.26, -.4, 0, -.75); const board = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .04, bevelEnabled: false }), am()), gg = G(board, box(.06, 1.4, .06, white(), 0, 0, .02), box(.03, .16, .16, dark(), 0, -.62, -.1)); gg.position.set(0, by + .35, bz - .1); gg.rotation.z = .25; g.add(gg); }
    else if (back === 'skate') { const gg = G(box(.22, .85, .03, dark(), 0, 0, 0), box(.2, .8, .01, am(), 0, 0, -.02)); for (const y of [-.28, .28]) for (const k of [-1, 1]) { const wh = cyM(.05, .05, .04, white(), k * .1, y, -.04, 8); wh.rotation.z = Math.PI / 2; gg.add(wh); } gg.position.set(.1, by + .3, bz - .06); gg.rotation.z = -.35; g.add(gg); }
    g.rotation.order = 'YXZ'; this.scene.add(g);   // YXZ: yaw first, so lean tilts along the facing direction
    let pet = null; if (p.pet && p.pet !== 'none' && PETS[p.pet]) { pet = PETS[p.pet](new THREE.Color(ac).getHex()); pet.fresh = true; pet.k = p.pet; pet.g.visible = this.petsOn !== false; this.scene.add(pet.g); }
    this.m.set(p.id, { id: p.id, g, mat, anim, pet, handK: p.hands && p.hands !== 'same' ? p.hands : body, tx: 0, tz: 0, trail: p.trail || 'none', aura: p.aura || 'none', spinner, lean: 0, leanT: 0, face: null, hop: false, hv: 0, hy: 0, emo: null });
  }
  sync(players) {
    for (const id of [...this.m.keys()]) if (!players[id]) { this.scene.remove(this.m.get(id).g); this.dropPet(this.m.get(id)); this.m.delete(id); }
    for (const id in players) {
      const p = players[id], sig = [p.color, p.accent, p.hat, p.body, p.face, p.back, p.pattern, p.head, p.hands, p.coat, p.title, p.tagframe, p.pet, p.name].join('|'), e = this.m.get(id);
      if (e && e.sig === sig) { e.trail = p.trail || 'none'; continue; }      // (trail isn't part of the look signature: update it in place)
      if (e) { this.scene.remove(e.g); this.dropPet(e); }
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
  handMesh(id, sc = 2.6) {       // the hand a game shows during shove / grab, in the player's chosen hand shape and body colour
    const e = this.m.get(id); if (!e) return null; const m = new THREE.Mesh((HANDG[e.handK] || HANDG.round)(), e.mat); m.scale.setScalar(sc); this.scene.add(m); return m;
  }
  addFrame(f) { (this.fns ||= []).push(f); return () => { this.fns = this.fns.filter(x => x !== f); }; }
  dropPet(e) { if (e?.pet) { if (e.pet.hand) this.scene.remove(e.pet.hand); this.scene.remove(e.pet.g); e.pet.g.traverse(o => { o.geometry?.dispose?.(); }); e.pet = null; } }
  petPet(id) {        // P: the pet runs up to its owner and reacts in its own way
    const e = this.m.get(id); if (!e?.pet) return; e.pet.petT = 2.4; e.leanT = .45; this.popIcon?.(id, '💗');
  }
  skipDice() { for (const d of this.dice || []) d.t = Math.max(d.t, d.D + .9); }
  setPets(v) { this.petsOn = v; for (const e of this.m.values()) if (e.pet) e.pet.g.visible = v && e.g.visible; }
  petStep(e, dt) {         // the pet trails behind its owner, hops/bobs by itself, and turns toward where it is going (or toward you when idle)
    const pt = e.pet, pg = pt.g, gp = e.g.position, ry = e.g.rotation.y, pting = pt.petT > 0; if (pting) { pt.petT -= dt; pt.wasP = true; if (pt.petT <= 0) e.leanT = 0; }
    const tx = pting ? gp.x + Math.sin(ry) * .85 : gp.x - Math.sin(ry) * 1.1 + Math.cos(ry) * .55, tz = pting ? gp.z + Math.cos(ry) * .85 : gp.z - Math.cos(ry) * 1.1 - Math.sin(ry) * .55;
    if (pt.fresh || Math.hypot(pg.position.x - tx, pg.position.z - tz) > 5) { pg.position.set(tx, 0, tz); pt.fresh = false; }
    const k = Math.min(1, dt * (pting ? 9 : 4)), ox = pg.position.x, oz = pg.position.z; pg.position.x += (tx - ox) * k; pg.position.z += (tz - oz) * k;
    const mvp = Math.hypot(pg.position.x - ox, pg.position.z - oz) > .004;
    const ang = mvp ? Math.atan2(pg.position.x - ox, pg.position.z - oz) : Math.atan2(gp.x - pg.position.x, gp.z - pg.position.z); let da = ang - pg.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); pg.rotation.y += da * Math.min(1, dt * 8);
    pg.visible = e.g.visible && this.petsOn !== false; pt.tick(this.t, dt, mvp); pg.position.y += (e.by || 0) + (pt.hover || 0);
    if (pting) { const hm = pt.hand ??= this.handMesh(e.id, 2.1); if (hm) { hm.visible = true; hm.position.set(pg.position.x + Math.sin(this.t * 6) * .2, pg.position.y + .5 + Math.abs(Math.cos(this.t * 6)) * .07, pg.position.z); hm.rotation.z = Math.sin(this.t * 6) * .35; hm.rotation.y = ry; } }
    else if (pt.hand) { this.scene.remove(pt.hand); pt.hand = null; }
    if (pting) { const R = PET_REACT[pt.k] || { fx: 'hearts', rate: .15 }; R.anim?.(pg, this.t); if ((pt.fxT = (pt.fxT || 0) - dt) <= 0) { pt.fxT = R.rate; this.trailBit({ x: pg.position.x, y: pg.position.y + .2, z: pg.position.z }, R.fx); } }
    else if (pt.wasP) { pt.wasP = false; pg.scale.setScalar(1); pg.rotation.x = 0; pg.rotation.z = 0; }
  }
  rollDice(id, vals, style = 'classic') {      // 3D dice drop, tumble, bounce and land with the rolled number facing up
    const e = this.m.get(id); if (!e) return; const p = e.g.position, n = vals.length, S = DICE[style] || DICE.classic, gy = e.by || 0, up = new THREE.Vector3(0, 1, 0);
    vals.forEach((v, i) => {
      const m = makeDie(style), nv = new THREE.Vector3(...(FACE_N[v] || FACE_N[1])), qf = new THREE.Quaternion().setFromAxisAngle(up, Math.random() * 6.28).multiply(new THREE.Quaternion().setFromUnitVectors(nv, up));
      const ex = p.x + (i - (n - 1) / 2) * 1 + (Math.random() - .5) * .3, ez = p.z + .6 + (Math.random() - .5) * .3, sx = ex + (Math.random() - .5) * 1.6, sz = ez - 1.8 + (Math.random() - .5);
      m.position.set(sx, gy + 6, sz); this.scene.add(m);
      (this.dice ||= []).push({ m, t: -i * .12, D: S.D ?? 1.5, sx, sz, ex, ez, gy, qf, ax: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(), sp: 14 + Math.random() * 8, S, tr: 0 });
    });
  }
  diceStep(dt) {
    if (!this.dice?.length) return;
    for (let i = this.dice.length - 1; i >= 0; i--) {
      const d = this.dice[i]; d.t += dt; if (d.t < 0) continue; const u = Math.min(1, d.t / d.D), BN = d.S.bounce ?? 1, arc = (a, b, h) => { const s2 = (u - a) / (b - a); return 4 * h * BN * s2 * (1 - s2); };
      const y = u < .5 ? 5.4 * (1 - (u / .5) ** 2) : u < .78 ? arc(.5, .78, .9) : u < .92 ? arc(.78, .92, .3) : 0, eu = Math.min(1, u / .92), e2 = 1 - (1 - eu) ** 2;
      d.m.position.set(d.sx + (d.ex - d.sx) * e2, d.gy + .35 + y, d.sz + (d.ez - d.sz) * e2);
      d.m.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(d.ax, (1 - u) ** 2 * d.sp).multiply(d.qf));
      if (d.S.trail && u < .9 && (d.tr -= dt) <= 0) { d.tr = .05; this.auraBit({ aura: d.S.trail, g: { position: d.m.position } }); }
      for (const [k, at, sz] of [['b1', .5, 10], ['b2', .78, 6], ['b3', .92, 4]]) if (u >= at && !d[k]) { d[k] = 1; this.burst(d.m.position.x, d.gy + .1, d.m.position.z, d.S.land || '#ffffff', sz); if (k === 'b1') this.shake(d.S.shake ?? .07, .12); }
      if (d.t > d.D + .9) { const sc = Math.max(0, 1 - (d.t - d.D - .9) / .3); d.m.scale.setScalar(sc); if (sc <= 0) { this.scene.remove(d.m); d.m.geometry.dispose(); d.m.material.forEach(mm => mm.dispose()); this.dice.splice(i, 1); } }
    }
  }
  fxMany(id, kind, n = 10) { const e = this.m.get(id); if (e) for (let i = 0; i < n; i++) this.fxBit(e, kind); }
  clearProp(e) { if (e.prop) { e.g.remove(e.prop.g); e.prop.g.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); e.prop = null; } }
  setProp(id, kind) { const e = this.m.get(id); if (!e) return; this.clearProp(e); const P = PROPS[kind]; if (!P) return; const pr = P.build(); pr.g.position.set(...(SLOTS[P.slot] || [0, 0, 0])); e.g.add(pr.g); e.prop = pr; }
  hold(id, kind) {       // hold an item until the player moves (or uses the emote again)
    const e = this.m.get(id); if (!e) return; if (e.hold?.k === kind) return this.release(e);
    this.stopGait(e); this.setProp(id, kind); e.hold = { k: kind, t: 0 };
  }
  release(e) { e.hold = null; this.clearProp(e); }
  setGait(id, kind, prop) {     // a walk style that replaces the normal walk until you pick it again
    const e = this.m.get(id); if (!e) return; if (e.gait === kind) return this.stopGait(e);
    this.release(e); e.gait = kind; e.gt = 0; if (prop) this.setProp(id, prop); else this.clearProp(e);
  }
  stopGait(e) { if (!e.gait) return; e.gait = null; this.clearProp(e); e.g.rotation.x = 0; e.g.rotation.z = 0; e.g.scale.setScalar(1); if (!e.hop) e.g.position.y = e.by || 0; }
  gaitStep(e, dt, mv) {
    const G = GAITS[e.gait]; if (!G) return; if (mv) e.gt = (e.gt || 0) + dt;
    const s = { y: 0, rx: 0, rz: 0, sx: 1, sy: 1, sz: 1, dry: 0 }; G(s, e.gt || 0, mv, dt, this, e);
    if (!e.hop) e.g.position.y = (e.by || 0) + s.y; e.g.rotation.x = s.rx; e.g.rotation.z = s.rz; e.g.scale.set(s.sx, s.sy, s.sz); if (s.dry) e.g.rotation.y += s.dry;
  }
  fxBit(e, kind) { const ka = e.aura; e.aura = kind; this.auraBit(e); e.aura = ka; }
  dust(e, col = '#ffffff', n = 8) { const p = e.g.position; this.burst(p.x, (e.by || 0) + .1, p.z, col, n); }
  auraBit(e) {
    const a = AU[e.aura]; if (!a) return; this.pg ??= new THREE.BoxGeometry(.18, .18, .18);
    const ang = Math.random() * 6.283, rad = a.r * (.5 + Math.random() * .5), p = e.g.position, j = a.jit || .4;
    const m = new THREE.Mesh(this.pg, new THREE.MeshBasicMaterial({ color: new THREE.Color(a.c[Math.random() * a.c.length | 0]), transparent: true }));
    m.scale.setScalar((a.sc ?? .8) * (.6 + Math.random() * .6)); m.position.set(p.x + Math.cos(ang) * rad, p.y + a.y0 + Math.random() * a.h, p.z + Math.sin(ang) * rad); this.scene.add(m);
    this.parts.push({ m, vx: (Math.random() - .5) * j - Math.sin(ang) * .3, vy: a.vy, vz: (Math.random() - .5) * j + Math.cos(ang) * .3, life: a.life, l0: a.life, g: 0 });
  }
  trailBit(p, kind) {      // every trail is its own shape + motion (see TRAILS): ribbons on the ground, rising hearts, bouncing coins, flickering bolts...
    const T = TRAILS[kind] || TRAILS.sparkle, cs = TR[T.cols];
    const col = kind === 'rainbow' ? new THREE.Color().setHSL((this.t * .8) % 1, 1, .6) : cs ? new THREE.Color(cs[Math.random() * cs.length | 0]) : new THREE.Color(0xffffff);
    const m = new THREE.Mesh(T.g(), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: T.op ?? 1, side: THREE.DoubleSide, depthWrite: false }));
    const sc = T.sc * (kind === 'ink' ? .6 + Math.random() * .9 : 1); m.scale.setScalar(sc); m.position.set(p.x + (Math.random() - .5) * .3, p.y + (T.flat ? .04 : T.stand ? .25 : T.up ? .6 : .25), p.z + (Math.random() - .5) * .3);
    if (T.flat) m.rotation.x = -Math.PI / 2; if (T.stand) m.rotation.z = (Math.random() - .5) * .5; if (T.up) m.rotation.y = Math.random() * 6; if (T.sp) m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.scene.add(m); const j = T.flat || T.stand || T.up ? 0 : 1.2;
    this.parts.push({ m, vx: (Math.random() - .5) * j, vy: T.vy, vz: (Math.random() - .5) * j, life: T.life, l0: T.life, g: T.grav ?? 0, op: T.op, sp: T.sp, gr: T.gr, wb: T.wb, bn: T.bn, y0: p.y + .05, b: sc, sh: T.sh, ph: Math.random() * 6 });
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
    this.clearProp(e); e.gait = null; e.hold = null; if (e.pet) e.pet.fresh = true; if (e.rag) { e.rag = null; e.ragOn = false; } e.hop = false; e.hv = 0; e.leanT = 0; e.g.visible = true; e.g.scale.setScalar(1); e.g.rotation.x = 0; e.g.rotation.z = 0;
    e.tx = x; e.tz = z; e.by = y; e.ty = undefined; e.g.position.set(x, y, z); if (ry != null) { e.g.rotation.y = ry; e.face = ry; }
  }
  lift(id, y) { const e = this.m.get(id); if (e) { e.by = y; if (!e.hop) e.g.position.y = y; } }   // set standing height (hops/emotes stack on top of it)
  warp(id, x, z) { const e = this.m.get(id); if (e) { e.tx = x; e.tz = z; e.g.position.x = x; e.g.position.z = z; } }   // move instantly without touching pose/facing
  hop(id, h = 1) { const e = this.m.get(id); if (e) { e.hop = true; e.hv = Math.sqrt(2 * 26 * h); } }
  lean(id, a = .4) { const e = this.m.get(id); if (e) e.leanT = a; }          // radians, + = forward (toward its facing)
  face(id, ry) { const e = this.m.get(id); if (e) e.face = ry; }                // turn in place while standing still (null = free)
  emote(id, kind) {   // 'cheer' | 'sad' | 'wiggle' | 'giggle' | 'shake' | 'tilt' | 'love' | 'cool'
    const e = this.m.get(id); if (!e) return;
    const D = { hero: 2.1, dab: 1.4, stomp: 1.8, inflate: 1.6, abduct: 2.6, cannon: 1.7, zap: 1.6, drop: 1.7, flip: 1.3, rocket: 1.5, roar: 1, breakdance: 2.2, shimmy: 1.8, drop: 1.2, spin: 1.5, flip: 1.1, bounce: 2.4, float: 2.6, tornado: 1.7, sway: 2.2, bow: 1.4, cheer: 2.2, sad: 1.4, wiggle: 1.3, giggle: 1.1, shake: 1, tilt: 1.5, love: 1.2, cool: 1.5 };
    e.emo = { k: kind, t: 0, n: 0, g: 0, d: D[kind] || 1 };
    e.leanT = kind === 'sad' ? .6 : kind === 'shake' ? .3 : kind === 'cool' ? -.25 : 0;
  }
  emoStep(e, dt) {
    const m = e.emo, k = m.k, t = m.t += dt, g = e.g, fade = Math.max(0, 1 - t / m.d), every = (st, f) => { if ((m.x = (m.x || 0) - dt) <= 0) { m.x = st; f(); } }, p0 = g.position;
    if (k === 'cheer') { m.g -= dt; if (!e.hop && m.n < 3 && m.g <= 0) { e.hop = true; e.hv = 7.5; m.n++; m.g = .08; } }
    else if (k === 'giggle') { if (t >= m.n * .22 && m.n < 4 && !e.hop) { e.hop = true; e.hv = Math.sqrt(2 * 26 * .3); m.n++; } g.rotation.z = Math.sin(t * 30) * .08 * fade; }
    else if (k === 'love') { if (!m.n) { m.n = 1; e.hop = true; e.hv = Math.sqrt(2 * 26 * .9); } }
    else if (k === 'wiggle') g.rotation.z = Math.sin(t * 14) * .3 * fade;
    else if (k === 'shake') g.rotation.z = Math.sin(t * 45) * .22 * fade;
    else if (k === 'tilt') g.rotation.z = .35 * Math.min(1, t * 6) * Math.min(1, fade * 4);
    else if (k === 'cool' && t < .7) g.rotation.y += dt * Math.PI * 2 / .7;
    else if (k === 'spin') { g.rotation.y += dt * Math.PI * 4; every(.07, () => this.fxBit(e, 'sparkles')); if (!m.l) { m.l = 1; this.dust(e, '#4dd0e1', 10); } }
    else if (k === 'flip') { if (!m.n) { m.n = 1; e.hop = true; e.hv = Math.sqrt(2 * 26 * 2.6); this.dust(e, '#ffd93d', 10); } g.rotation.x = -Math.min(1, t / .9) * Math.PI * 2; if (t < .9) every(.05, () => this.fxBit(e, 'stardust')); else if (!m.l) { m.l = 1; this.dust(e, '#e0e0e0', 16); this.shake(.12, .2); } }
    else if (k === 'bounce') { if (!e.hop && m.n < 7) { e.hop = true; e.hv = Math.sqrt(2 * 26 * .45); m.n++; this.dust(e, '#ffffff', 6); if (m.n % 3 === 0) this.burst(p0.x, p0.y + 1.2, p0.z, '#ffd93d', 8); } }
    else if (k === 'float') { g.position.y = (e.by || 0) + (t < m.d - .3 ? .7 * Math.min(1, t * 3) : 0) + Math.sin(t * 3) * .12; g.rotation.y += dt * 1.6; every(.05, () => this.fxBit(e, m.n++ % 2 ? 'stardust' : 'sparkles')); }
    else if (k === 'tornado') { const s = Math.min(1, t * 4); g.rotation.y += dt * Math.PI * 9; g.scale.set(1 - .25 * s, 1 + .35 * s, 1 - .25 * s); every(.03, () => this.fxBit(e, m.n++ % 3 ? 'mist' : 'leaves')); }
    else if (k === 'sway') { g.rotation.z = Math.sin(t * 5) * .4 * Math.min(1, fade * 3); if (!m.l && t > .2) { m.l = 1; e.hop = true; e.hv = 5; } every(.12, () => this.fxBit(e, 'hearts')); }
    else if (k === 'shimmy') { g.rotation.z = Math.sin(t * 22) * .18; g.rotation.y = Math.sin(t * 9) * .5; if (!m.l && t > .1) { m.l = 1; e.hop = true; e.hv = 6; } every(.04, () => this.fxBit(e, 'confetti')); }
    else if (k === 'drop') { if (!m.n) { m.n = 1; e.hop = true; e.hy = 9; g.position.y = (e.by || 0) + 9; e.hv = 0; g.scale.set(.8, 1.35, .8); } else if (!m.l && !e.hop) { m.l = 1; m.sq = 0; this.dust(e, '#ffffff', 18); this.shake(.25, .3); } if (m.l) { m.sq += dt; const q = Math.max(0, 1 - m.sq / .4); g.scale.set(1 + .35 * q, 1 - .45 * q, 1 + .35 * q); } else every(.05, () => this.fxBit(e, 'embers')); }
    else if (k === 'bow') { g.rotation.x = Math.sin(Math.min(1, t / 1.2) * Math.PI) * .75; if (t > .55 && !m.l) { m.l = 1; this.burst(p0.x, p0.y + 1.8, p0.z, '#ff6b9d', 18); } if (t > .55 && t < 1) every(.06, () => this.fxBit(e, 'petals')); }
    else if (k === 'rocket') { g.position.y = (e.by || 0) + 5 * Math.sin(Math.min(1, t / 1.4) * Math.PI); every(.02, () => { this.fxBit(e, 'embers'); this.fxBit(e, 'embers'); }); if (!m.l) { m.l = 1; this.dust(e, '#ff9f1a', 16); this.shake(.2, .3); } }
    else if (k === 'roar') { g.scale.setScalar(1 + .35 * Math.sin(Math.min(1, t / .5) * Math.PI)); if (!m.l && t > .2) { m.l = 1; this.shake(.3, .4); for (let n = 0; n < 3; n++) this.burst(p0.x, p0.y + .6 + n * .5, p0.z, '#ff9f1a', 22); } }
    else if (k === 'breakdance') { g.rotation.x = -1.35; g.rotation.y += dt * 10; g.position.y = (e.by || 0) + .35; every(.05, () => this.fxBit(e, 'sparkles')); }
    else if (k === 'stomp') { if (!e.hop && m.n < 3 && t > m.n * .55) { e.hop = true; e.hv = Math.sqrt(2 * 26 * .9); m.n++; } if (m.hp && !e.hop) { this.dust(e, '#e0e0e0', 22); this.shake(.2, .22); m.sq = .18; } m.hp = e.hop; if (m.sq > 0) { m.sq -= dt; const q = Math.max(0, m.sq / .18); g.scale.set(1 + .25 * q, 1 - .25 * q, 1 + .25 * q); } }
    else if (k === 'inflate') { if (t < 1.2) { const q = Math.sin(t / 1.2 * Math.PI / 2); g.scale.setScalar(1 + .7 * q + Math.sin(t * 22) * .04 * q); every(.06, () => this.fxBit(e, 'bubbles')); } else if (!m.l) { m.l = 1; g.scale.setScalar(1); this.shake(.25, .3); this.fxMany(e.id, 'confetti', 26); this.burst(p0.x, p0.y + .9, p0.z, '#ffd93d', 26); } }
    else if (k === 'abduct') { const q = Math.sin(Math.min(1, t / 2.4) * Math.PI); g.position.y = (e.by || 0) + 3.2 * q; g.rotation.y += dt * 3 * (.4 + q); g.scale.setScalar(1 - .35 * q); every(.05, () => { this.fxBit(e, 'sparkles'); this.fxBit(e, 'stardust'); }); if (!m.l) { m.l = 1; this.burst(p0.x, p0.y + .8, p0.z, '#9be8ff', 24); } }
    else if (k === 'cannon') { if (t < .3) { g.scale.set(1.25, .6, 1.25); every(.05, () => this.fxBit(e, 'embers')); } else { if (!m.n) { m.n = 1; e.hop = true; e.hv = Math.sqrt(2 * 26 * 3.2); this.dust(e, '#ff9f1a', 18); this.shake(.2, .25); g.scale.setScalar(1); } g.rotation.x = -Math.min(1, (t - .3) / .8) * Math.PI * 4; if (t < 1.1) every(.04, () => this.fxBit(e, 'embers')); else if (!m.l && !e.hop) { m.l = 1; this.dust(e, '#e0e0e0', 22); this.shake(.25, .3); } } }
    else if (k === 'zap') { g.rotation.z = Math.sin(t * 60) * .18 * (1 - t / m.d * .4); every(.04, () => this.fxBit(e, 'electric')); m.y = (m.y || 0) - dt; if (m.y <= 0) { m.y = .2; this.burst(p0.x, p0.y + 1, p0.z, '#ffffff', 6); this.shake(.08, .1); } }
    else if (k === 'hero') { if (!m.n) { m.n = 1; e.hop = true; e.hy = 9; g.position.y = (e.by || 0) + 9; e.hv = -6; g.scale.set(.85, 1.25, .85); every(.05, () => this.fxBit(e, 'stardust')); } else if (!m.l && !e.hop) { m.l = 1; m.sq = 0; for (let n = 0; n < 3; n++) this.dust(e, n ? '#ffd93d' : '#ffffff', 26); this.shake(.35, .4); } if (m.l) { m.sq += dt; const q = m.sq < .8 ? 1 : Math.max(0, 1 - (m.sq - .8) / .4); g.scale.set(1 + .15 * q, 1 - .3 * q, 1 + .15 * q); g.rotation.x = .35 * q; every(.1, () => this.fxBit(e, 'sparkles')); } else every(.05, () => this.fxBit(e, 'stardust')); }
    else if (k === 'dab') { const q = t < .15 ? t / .15 : t < 1.1 ? 1 : Math.max(0, 1 - (t - 1.1) / .3); g.rotation.y = .9 * q; g.rotation.z = .5 * q; g.rotation.x = .25 * q; if (t > .15 && !m.l) { m.l = 1; this.burst(p0.x, p0.y + 1.2, p0.z, '#ffffff', 14); this.shake(.12, .15); } if (q === 1) every(.08, () => this.fxBit(e, 'electric')); }
    if (t >= m.d) { e.leanT = 0; if (k === 'flip' || k === 'bow' || k === 'breakdance' || k === 'cannon') g.rotation.x = 0; if (k === 'shimmy' || k === 'zap') g.rotation.z = 0; if (['tornado', 'drop', 'roar', 'stomp', 'inflate', 'abduct', 'cannon', 'hero'].includes(k)) g.scale.setScalar(1); if (k === 'hero' || k === 'dab') g.rotation.x = 0; if (k === 'dab') g.rotation.z = 0; if (k === 'float' || k === 'rocket' || k === 'breakdance' || k === 'abduct') g.position.y = e.by || 0; e.emo = null; }
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
    if (this.fns) for (const f of this.fns) f(dt);
    this.diceStep(dt);
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
      const q = this.parts[i]; q.vy -= (q.g ?? 20) * dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt; q.m.position.z += q.vz * dt;
      q.life -= dt; const kk = Math.max(0, q.life / (q.l0 || .8)); q.m.material.opacity = (q.op ?? 1) * kk;
      if (q.sp) { q.m.rotation.x += q.sp * dt; q.m.rotation.z += q.sp * .6 * dt; } if (q.gr) q.m.scale.multiplyScalar(1 + q.gr * dt); if (q.sh) q.m.scale.setScalar(q.b * Math.max(.05, kk)); if (q.wb) q.m.position.x += Math.sin(this.t * 7 + q.ph) * q.wb * dt;
      if (q.bn && q.vy < 0 && q.m.position.y < q.y0) { q.m.position.y = q.y0; q.vy *= -q.bn; }
      if (q.life <= 0) { this.scene.remove(q.m); q.m.material.dispose(); this.parts.splice(i, 1); }
    }
    for (const e of this.m.values()) {
      if (e.rag) { const kk = Math.min(1, dt * 20); e.g.position.x += (e.tx - e.g.position.x) * kk; e.g.position.z += (e.tz - e.g.position.z) * kk; e.g.position.y += (e.rag.y - e.g.position.y) * kk; e.g.rotation.x += (e.rag.rx - e.g.rotation.x) * kk; e.g.rotation.z += (e.rag.rz - e.g.rotation.z) * kk; const sc = e.rag.sc ?? 1; e.g.scale.x += (sc - e.g.scale.x) * kk; e.g.scale.y = e.g.scale.z = e.g.scale.x; continue; }
      const dx = e.tx - e.g.position.x, dz = e.tz - e.g.position.z, k = Math.min(1, dt * 15);
      const mv = Math.hypot(dx, dz) > .02; if (mv) { let da = Math.atan2(dx, dz) - e.g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); e.g.rotation.y += da * Math.min(1, dt * 14); } e.g.rotation.z = mv ? Math.sin(this.t * 16) * .12 : e.g.rotation.z * .8;
      e.g.position.x += dx * k; e.g.position.z += dz * k;
      if (!mv && e.face != null && !SPINK.includes(e.emo?.k)) { let d = e.face - e.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); e.g.rotation.y += d * Math.min(1, dt * 12); }
      if (e.emo) this.emoStep(e, dt);
      if (e.lean !== e.leanT) { e.lean += (e.leanT - e.lean) * Math.min(1, dt * 14); if (Math.abs(e.leanT - e.lean) < .002) e.lean = e.leanT; e.g.rotation.x = e.lean; }
      if (e.ty !== undefined) { e.by = (e.by || 0) + (e.ty - (e.by || 0)) * k; if (!e.hop) e.g.position.y = e.by; }
      if (e.hop) { e.hv -= 26 * dt; e.hy += e.hv * dt; if (e.hy <= 0) { e.hy = 0; e.hv = 0; e.hop = false; } e.g.position.y = (e.by || 0) + e.hy; }
      if (e.spinner) e.spinner.rotation.y += dt * 14;
      if (mv && e.trail !== 'none' && ((e.tt = (e.tt || 0) - dt) <= 0)) { e.tt = .06; this.trailBit(e.g.position, e.trail); }
      if (e.anim.length) for (const f of e.anim) f(this.t, dt, mv);
      if (e.pet) this.petStep(e, dt);
      if (e.hold && (mv || (e.hold.t += dt) > 40)) this.release(e);
      if (e.prop?.tick) e.prop.tick(dt, this.t, this, e, mv);
      if (e.gait) this.gaitStep(e, dt, mv);
    }
    this.r.render(this.scene, this.cam);
  }
}
