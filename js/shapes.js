import * as THREE from 'three';
// Small shared flat/extruded shapes (hearts, stars, leaves...) for particles, win effects and trails. Cached per kind.
const memo = {};
const ex = (sh, depth, s) => { const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.center(); g.scale(s, s, 1); return g; };
export function shapeGeo(k) { return memo[k] ??= build(k); }
function build(k) {
  const sh = new THREE.Shape();
  if (k === 'heart') { sh.moveTo(0, -.6); sh.bezierCurveTo(-.9, 0, -.6, .8, 0, .4); sh.bezierCurveTo(.6, .8, .9, 0, 0, -.6); return ex(sh, .3, .3); }
  if (k === 'star') { for (let i = 0; i < 10; i++) { const r = i % 2 ? .42 : 1, a = Math.PI / 2 + i * Math.PI / 5; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } sh.closePath(); return ex(sh, .25, .2); }
  if (k === 'leaf') { sh.moveTo(0, -.5); sh.quadraticCurveTo(.6, 0, 0, .6); sh.quadraticCurveTo(-.6, 0, 0, -.5); return ex(sh, .05, .35); }
  if (k === 'petal') { sh.moveTo(0, -.5); sh.quadraticCurveTo(.5, 0, 0, .5); sh.quadraticCurveTo(-.5, .1, 0, -.5); return ex(sh, .04, .3); }
  if (k === 'bolt') { [[0, 1], [.25, .4], [-.05, .35], [.3, -.3], [-.1, -.25], [.15, -1], [-.3, -.15], [0, -.2], [-.25, .5], [.05, .5]].forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath(); return ex(sh, .05, .6); }
  if (k === 'note') { [[-.2, -.02], [-.12, -.13], [.02, -.16], [.14, -.1], [.2, 0], [.2, .8], [.14, .8], [.14, .1], [.04, .13], [-.1, .09]].forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath(); return ex(sh, .05, .45); }
  if (k === 'flake') { for (let i = 0; i < 12; i++) { const r = i % 2 ? .16 : 1, a = i * Math.PI / 6; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } sh.closePath(); return ex(sh, .04, .3); }
  if (k === 'paw') { const pos = [], idx = []; let off = 0; for (const [x, y, rx, ry] of [[0, -.08, .24, .2], [-.2, .2, .1, .1], [-.07, .3, .09, .09], [.07, .3, .09, .09], [.2, .2, .1, .1]]) { const cg = new THREE.CircleGeometry(1, 12), a = cg.attributes.position; for (let i = 0; i < a.count; i++) pos.push(x + a.getX(i) * rx, y + a.getY(i) * ry, 0); for (const j of cg.index.array) idx.push(j + off); off += a.count; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.scale(1.2, 1.2, 1); return g; }
  if (k === 'ring') return new THREE.RingGeometry(.35, .5, 20);
  if (k === 'quad') return new THREE.PlaneGeometry(.5, .5);
  return new THREE.CircleGeometry(.5, 14);      // 'disc'
}
