import * as THREE from 'three';
import { BOARDS } from './boards.js';
// Board layer. Host owns state `s` and broadcasts it in full on every change (it's tiny);
// clients just render it and send 'roll'. Minigames run between rounds via opts.playMg().
let B = BOARDS.classic; const setBoard = id => { B = BOARDS[id] || BOARDS.classic; };
const COL = { blue: 0x4aa3ff, red: 0xff5a5a, green: 0x58d68d, shop: 0xb06bff, duel: 0xff9f43, warp: 0x00cec9, toll: 0xc8a14a, slot: 0xff2d95 }, REWARD = [10, 6, 3, 0];
const MAXI = 3;
const ITEMS = {
  big: { n: 'Big Die', e: '🎯', c: 8, d: 'Next roll is 4-8' },
  dbl: { n: 'Double Dice', e: '🎲', c: 6, d: 'Next roll is two dice' },
  shield: { n: 'Shield', e: '🛡️', c: 5, d: 'Passive: blocks the next theft, swap or pickpocket', p: true },
  magnet: { n: 'Star Magnet', e: '🧲', c: 10, d: 'The ⭐ jumps 5-8 spaces ahead of you' },
  swap: { n: 'Swap', e: '🔄', c: 9, d: 'Trade places with a random rival' },
  steal: { n: 'Coin Thief', e: '💰', c: 7, d: 'Steal 5 🪙 from the richest rival' },
};
const rand = n => Math.random() * n | 0;

export class Board {
  constructor(o) {
    this.o = o; this.active = false; this.s = null; this.objs = []; this.anims = []; this.monT = null; this.mon = null; this.hot = [];
    o.net.on('board', d => this.apply(d));
    o.net.on('roll', (_, from) => this.roll(from));
    o.net.on('act', (d, from) => this.act(from, d));
    addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && !/INPUT|SELECT/.test(e.target.tagName)) this.tryRoll(); });
    document.getElementById('board').onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.id === 'roll') this.tryRoll();
      else if (b.dataset.a) o.net.isHost ? this.act('host', { a: b.dataset.a, k: b.dataset.k }) : o.net.send('act', { a: b.dataset.a, k: b.dataset.k });
    };
  }
  // ---- both sides
  tryRoll() {
    const { net } = this.o, s = this.s;
    if (!this.active || s.phase !== 'roll' || s.order[s.turn] !== net.id) return;
    net.isHost ? this.roll('host') : net.send('roll');
  }
  apply(d) {
    if (d.off) return this.teardown();
    if (d.board) setBoard(d.board);
    const pv = this.prev; this.s = d;
    if (!this.active) { this.active = true; this.build(); }
    for (const id of d.order) this.o.world.set(id, ...this.place(id));
    { const [sx, sz] = B.spot(d.star); this.star.position.x = sx; this.star.position.z = sz; }
    if (d.mon >= 0 && this.mon) this.monT = B.spot(d.mon);
    this.hot = d.hot || [];
    this.o.world.setSky(B.sky ? (B.skyFixed ?? (Math.min(d.round, d.rounds) - 1) / Math.max(1, d.rounds - 1)) : null);
    if (pv) this.diff(pv, d); this.prev = JSON.parse(JSON.stringify(d));
    this.render(); this.o.onChange();
  }
  diff(a, b) {
    const f = this.o.fx; if (!f) return;
    if (b.phase === 'moving' && a.phase !== 'moving') f('roll', b.roll);
    for (const id of b.order) {
      if (a.pos[id] !== undefined && a.pos[id] !== b.pos[id] && b.phase === 'moving') f('step', id);
      if (a.coins[id] === undefined) continue;
      if (b.stars[id] > a.stars[id]) f('star', id);
      else if (b.coins[id] > a.coins[id]) f('coin', id);
      else if (b.coins[id] < a.coins[id]) f(b.phase === 'shop' ? 'click' : 'lose', id);
    }
    if (b.phase === 'end' && a.phase !== 'end') f('win', b.winner);
    if (b.hot?.length && JSON.stringify(a.hot) !== JSON.stringify(b.hot)) f('erupt');
    if (b.phase === 'minigame' && a.phase !== 'minigame' && b.mega) f('mega');
  }
  place(id) {
    const s = this.s, i = s.pos[id], [x, z] = B.spot(i), at = s.order.filter(k => s.pos[k] === i), k = at.indexOf(id);
    const a = k / at.length * Math.PI * 2, off = at.length > 1 ? .7 : 0;
    return [x + Math.cos(a) * off, z + Math.sin(a) * off];
  }
  build() {
    const W = this.o.world, sc = W.scene, add = m => { sc.add(m); this.objs.push(m); W.deco.push(m); return m; }, anim = f => { W.anim.push(f); this.anims.push(f); };
    const std = (c, o) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, ...o });
    B.sp.forEach(p => p.next.forEach(j => {   // paths (wooden bridge boards where flagged)
      const q = B.sp[j], dx = q.x - p.x, dz = q.z - p.z, br = p.bridge || q.bridge;
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(br ? .9 : .5, .06, Math.hypot(dx, dz)), std(br ? 0x9a6b3a : 0xd9c9a3)));
      m.position.set((p.x + q.x) / 2, .05, (p.z + q.z) / 2); m.rotation.y = Math.atan2(dx, dz);
    }));
    const tiles = B.sp.map(p => {
      const g = new THREE.Group(), hex = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .3, 6), std(COL[p.type])); hex.position.y = .15; g.add(hex); g.userData.hex = hex;
      const ic = this.icon(p.type, std); if (ic) { g.add(ic); g.userData.ic = ic; }
      g.position.set(p.x, 0, p.z); return add(g);
    });
    anim((dt, t) => tiles.forEach((g, i) => {
      g.position.y = Math.sin(t * 2 + i * .7) * .04 + .02; const ic = g.userData.ic; if (ic?.userData.spin) ic.rotation.y += dt * 2;
      const hot = this.hot.includes(i), m = g.userData.hex.material; m.emissive.setHex(hot ? 0xff3300 : 0); m.emissiveIntensity = hot ? .6 + .4 * Math.sin(t * 7) : 0;
    }));
    this.star = add(new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 0), std(0xffd93d, { emissive: 0x665500 })));
    anim((dt, t) => { this.star.position.y = 1.8 + Math.sin(t * 3) * .2; this.star.rotation.y += dt * 2; });
    B.decor?.(W, add, anim);
    if (B.monster) {
      const g = new THREE.Group(), body = new THREE.Mesh(new THREE.IcosahedronGeometry(.9, 0), std(0x6c3483)); body.position.y = 1; g.add(body);
      for (const k of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.IcosahedronGeometry(.18, 0), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(k * .3, 1.2, .7); g.add(e);
        const h = new THREE.Mesh(new THREE.ConeGeometry(.15, .5, 4), std(0xf1c40f)); h.position.set(k * .5, 1.9, 0); g.add(h);
      }
      this.mon = add(g); const [mx, mz] = B.spot(B.monster.start); g.position.set(mx, 0, mz); this.monT = [mx, mz];
      anim((dt, t) => { const k = Math.min(1, dt * 2), m = this.mon; if (!m || !this.monT) return; m.position.x += (this.monT[0] - m.position.x) * k; m.position.z += (this.monT[1] - m.position.z) * k; m.position.y = Math.abs(Math.sin(t * 5)) * .25; m.rotation.y = Math.sin(t) * .4; });
    }
  }
  icon(t, std) {
    const g = new THREE.Group(); g.position.y = .3;
    if (t === 'shop') { const b = new THREE.Mesh(new THREE.BoxGeometry(.7, .5, .7), std(0xffe0b2)); b.position.y = .25; const r = new THREE.Mesh(new THREE.ConeGeometry(.65, .45, 4), std(0xc0392b)); r.position.y = .72; r.rotation.y = Math.PI / 4; g.add(b, r); }
    else if (t === 'green') { const o = new THREE.Mesh(new THREE.OctahedronGeometry(.35), std(0xffffff, { emissive: 0x2ecc71 })); o.position.y = .7; g.add(o); g.userData.spin = 1; }
    else if (t === 'warp') { const o = new THREE.Mesh(new THREE.TorusGeometry(.45, .1, 6, 12), std(0xffffff, { emissive: 0x00cec9 })); o.position.y = .7; o.rotation.x = Math.PI / 2.4; g.add(o); g.userData.spin = 1; }
    else if (t === 'toll') { for (const k of [-.5, .5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.15, .8, .15), std(0x6d4c1d)); p.position.set(k, .4, 0); g.add(p); } const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, .12, .12), std(0xffffff)); bar.position.y = .8; g.add(bar); }
    else if (t === 'slot') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(.7, .9, .5), std(0xff2d95, { emissive: 0x660033 })); b.position.y = .45;
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .5, 5), std(0xdddddd)); l.position.set(.45, .55, 0); l.rotation.z = -.4;
      const sc = new THREE.Mesh(new THREE.BoxGeometry(.5, .25, .05), std(0xffffff, { emissive: 0x888888 })); sc.position.set(0, .6, .27); g.add(b, l, sc);
    }
    else if (t === 'duel') { for (const k of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(.12, .9, .12), std(0xdfe6e9)); w.position.y = .5; w.rotation.z = k * .6; g.add(w); } }
    else return null;
    return g;
  }
  teardown() {
    this.prev = null; this.o.world.anim = this.o.world.anim.filter(f => !this.anims.includes(f)); this.anims = []; this.mon = null; this.o.world.setSky(null);
    this.objs.forEach(m => this.o.world.scene.remove(m)); this.o.world.deco = this.o.world.deco.filter(o => !this.objs.includes(o)); this.objs = []; this.active = false; this.s = null;
    this.render(); this.o.onChange();
  }
  render() {
    const el = document.getElementById('board'), s = this.s; el.hidden = !this.active; if (!this.active) return;
    const ps = this.o.players(), cur = s.order[s.turn], me = this.o.net.id, esc = this.o.esc, mine = cur === me;
    const nm = id => esc(ps[id]?.name ?? '?'), inv = s.items[me] || [], coins = s.coins[me];
    let act = '';
    if (mine && s.phase === 'roll') act = '<button id="roll">🎲 Roll (Space)</button>' + inv.filter(k => !ITEMS[k].p).map(k => `<button data-a="use" data-k="${k}">${ITEMS[k].e} Use ${ITEMS[k].n}</button>`).join('');
    if (mine && s.phase === 'shop') act = '<b>🛒 Shop</b>' + (s.stock || []).map(k => { const t = ITEMS[k]; return `<button data-a="buy" data-k="${k}"${coins < t.c || inv.length >= MAXI ? ' disabled' : ''}>${t.e} ${t.n} (${t.c}🪙)<br><small>${t.d}</small></button>`; }).join('') + '<button data-a="leave">Leave shop</button>';
    if (mine && s.phase === 'slot') act = '<b>🎰 Slot machine</b>' + [3, 6, 10].map(b => `<button data-a="bet" data-k="${b}"${coins < b ? ' disabled' : ''}>Bet ${b} 🪙</button>`).join('') + '<button data-a="leave">Walk away</button>';
    if (mine && s.phase === 'choose') act = '<b>🔀 Choose your path</b>' + s.opts.map(k => `<button data-a="go" data-k="${k}">${B.sp[k].label || 'Go this way'}</button>`).join('');
    el.innerHTML = `<b>${B.name} · Round ${Math.min(s.round, s.rounds)} / ${s.rounds}</b>` +
      s.order.map(id => `<div style="color:${ps[id]?.color}">${id === cur && (s.phase === 'roll' || s.phase === 'shop' || s.phase === 'choose' || s.phase === 'slot') ? '▶ ' : ''}${nm(id)} 🪙${s.coins[id]} ⭐${s.stars[id]} ${(s.items[id] || []).map(k => ITEMS[k].e).join('')}</div>`).join('') +
      `<div>${s.log}</div>` + (s.phase === 'end' ? `<h3>🏆 ${nm(s.winner)} wins!</h3>` : '') + act;
  }
  // ---- host only
  push() { this.apply(this.s); this.o.net.broadcast('board', this.s); this.botTurn(); }
  botTurn() {
    const s = this.s, id = s?.order[s.turn]; if (!this.active || !this.o.players()[id]?.bot) return;
    if (s.phase === 'roll') setTimeout(() => this.roll(id), 900); else if (s.phase === 'shop') setTimeout(() => this.act(id, { a: 'leave' }), 700);
    else if (s.phase === 'slot') setTimeout(() => this.act(id, s.coins[id] >= 15 ? { a: 'bet', k: 3 } : { a: 'leave' }), 800);
    else if (s.phase === 'choose') { const o = s.opts; setTimeout(() => this.act(id, { a: 'go', k: o[rand(o.length)] }), 700); }
  }
  start(rounds, board = 'grove') {
    setBoard(board); const ps = this.o.players(), order = Object.keys(ps), s = { board, rounds, round: 1, turn: 0, order, pos: {}, coins: {}, stars: {}, items: {}, next: {}, phase: 'roll', star: B.starSpots[rand(B.starSpots.length)], mon: B.monster ? B.monster.start : -1, hot: [], log: 'Game start!' };
    order.forEach(id => { s.pos[id] = 0; s.coins[id] = 10; s.stars[id] = 0; s.items[id] = []; s.next[id] = null; });
    this.s = s; this.push();
  }
  quit() { this.o.net.broadcast('board', { off: true }); this.apply({ off: true }); }
  name(id) { return this.o.esc(this.o.players()[id]?.name ?? '?'); }
  roll(id) {
    const s = this.s; if (!this.active || !this.o.net.isHost || s.phase !== 'roll' || s.order[s.turn] !== id) return;
    const m = s.next[id]; s.next[id] = null;
    let left = m === 'big' ? 4 + rand(5) : m === 'dbl' ? 2 + rand(6) + rand(6) : 1 + rand(6);
    s.roll = left; s.phase = 'moving'; s.log = `${this.name(id)} rolled ${left}!`; this.push();
    setTimeout(() => this.walk(id, left), 500);
  }
  walk(id, left) {       // advance one space at a time; forks pause for a choice
    const s = this.s; if (!this.active) return;
    if (left <= 0) return void setTimeout(() => this.land(id), 450);
    const nx = B.sp[s.pos[id]].next;
    if (nx.length > 1) { s.phase = 'choose'; s.opts = nx; s.left = left; s.log = `${this.name(id)} reached a fork!`; return this.push(); }
    this.stepTo(id, nx[0], left);
  }
  stepTo(id, to, left) {
    const s = this.s, me = this.name(id); s.pos[id] = to;
    if (B.type(to) === 'toll') { const n = Math.min(3, s.coins[id]); s.coins[id] -= n; s.log = `${me} paid the bridge toll: -${n} 🪙`; }
    if (to === s.star && s.coins[id] >= 20) { s.coins[id] -= 20; s.stars[id]++; s.star = this.newStar(to); s.log = `${me} bought a ⭐!`; }
    this.push(); setTimeout(() => this.walk(id, left - 1), 350);
  }
  newStar(cur) { const l = B.starSpots.filter(i => i !== cur); return l[rand(l.length)]; }
  ahead(p, n) { while (n-- > 0) p = B.sp[p].next[0]; return p; }
  heat() {             // volcano boards: each round a few tiles become scorching hot (landing costs coins)
    const s = this.s; if (!B.hazard) return '';
    const ok = B.sp.map((p, i) => ['blue', 'red', 'green'].includes(p.type) ? i : -1).filter(i => i >= 0); s.hot = [];
    while (s.hot.length < B.hazard.count) { const i = ok[rand(ok.length)]; if (!s.hot.includes(i)) s.hot.push(i); }
    return `🌋 The volcano erupts! ${B.hazard.count} tiles are scorching hot. `;
  }
  wander() {             // the Wanderer (grove only) stomps whoever it lands on at the end of each round
    const s = this.s; if (s.mon < 0) return '';
    for (let i = 0; i < 5; i++) s.mon = B.sp[s.mon].next[0];
    const hit = s.order.filter(id => s.pos[id] === s.mon); if (!hit.length) return '👹 The Wanderer lurks... ';
    return `👹 The Wanderer stomped ${hit.map(id => this.guard(id) ? `${this.name(id)} (🛡️ blocked)` : `${this.name(id)} (${this.addCoins(id, -5)} 🪙)`).join(', ')}! `;
  }
  land(id) {
    const s = this.s; if (!this.active) return;
    const t = B.type(s.pos[id]), me = this.name(id);
    if (s.hot?.includes(s.pos[id])) { const n = this.addCoins(id, -(B.hazard?.dmg || 6)); s.log = `🔥 ${me} landed on scorching lava! ${n} 🪙`; return this.nextTurn(); }
    if (t === 'green') s.log = this.event(id);
    else if (t === 'duel') s.log = this.duel(id);
    else if (t === 'shop') s.log = `${me} entered the shop`;
    else if (t === 'slot') s.log = `${me} sits down at the slot machine`;
    else if (t === 'toll') s.log = `${me} is crossing the bridge`;
    else if (t === 'warp') { const o = B.warps.find(k => k !== s.pos[id]); s.pos[id] = o; s.log = `${me} was warped across the island!`; }
    else { const d = Math.max(t === 'blue' ? 3 : -3, -s.coins[id]); s.coins[id] += d; s.log = `${me} landed on ${t}: ${d >= 0 ? '+' : ''}${d} 🪙`; }
    if (t === 'shop') { s.stock = Object.keys(ITEMS).sort(() => Math.random() - .5).slice(0, 3); s.phase = 'shop'; return this.push(); }
    if (t === 'slot') { s.phase = 'slot'; return this.push(); }
    this.nextTurn();
  }
  addCoins(id, n) { const s = this.s; n = Math.max(n, -s.coins[id]); s.coins[id] += n; return n; }
  guard(v) { const i = this.s.items[v].indexOf('shield'); if (i < 0) return false; this.s.items[v].splice(i, 1); return true; }
  event(id) {
    const s = this.s, me = this.name(id), C = n => `${n >= 0 ? '+' : ''}${n} 🪙`, keys = Object.keys(ITEMS);
    const evs = [
      () => `${me} found treasure! ${C(this.addCoins(id, 8))}`,
      () => `${me} paid taxes. ${C(this.addCoins(id, -4))}`,
      () => `${me} got a bonus! ${C(this.addCoins(id, 5))}`,
      () => { const inv = s.items[id]; if (inv.length >= MAXI) return `${me} found a gift but had no room!`; const k = keys[rand(keys.length)]; inv.push(k); return `${me} found a gift: ${ITEMS[k].e} ${ITEMS[k].n}!`; },
      () => { s.order.forEach(k => this.addCoins(k, 3)); return 'Festival! Everyone gets +3 🪙'; },
      () => { s.pos[id] = rand(B.n); return `${me} was teleported!`; },
      () => { s.star = this.newStar(s.star); return 'The ⭐ was shuffled to a new space!'; },
      () => this.guard(id) ? `${me}'s 🛡️ stopped a pickpocket!` : `${me} was pickpocketed! ${C(this.addCoins(id, -5))}`,
    ];
    return evs[rand(evs.length)]();
  }
  duel(id) {
    const s = this.s, me = this.name(id), rivals = s.order.filter(k => k !== id), v = rivals[rand(rivals.length)];
    if (v === undefined) return `${me} found no one to duel.`;
    let a, b, tries = 0; do { a = 1 + rand(6); b = 1 + rand(6); } while (a === b && ++tries < 5);
    if (a === b) return `${me} and ${this.name(v)} tied a duel!`;
    const [w, l] = a > b ? [id, v] : [v, id], n = Math.min(5, s.coins[l]); s.coins[l] -= n; s.coins[w] += n;
    return `⚔️ ${me} (${a}) vs ${this.name(v)} (${b}): ${this.name(w)} wins ${n} 🪙`;
  }
  nextTurn() {
    const s = this.s; if (++s.turn >= s.order.length) return this.endRound();
    s.phase = 'roll'; this.push();
  }
  act(id, d) {
    const s = this.s; if (!this.active || !this.o.net.isHost || s.order[s.turn] !== id) return;
    const inv = s.items[id], t = ITEMS[d.k];
    if (d.a === 'leave' && (s.phase === 'shop' || s.phase === 'slot')) return this.nextTurn();
    if (d.a === 'bet' && s.phase === 'slot' && [3, 6, 10].includes(+d.k) && s.coins[id] >= +d.k) {
      const b = +d.k, r = Math.random(), mult = r < .55 ? -1 : r < .85 ? 1 : r < .97 ? 2 : 5, p = ['🍒', '🍋', '🔔', '⭐', '7️⃣'].sort(() => Math.random() - .5);
      const reel = mult === 5 ? '7️⃣7️⃣7️⃣' : mult === 2 ? p[0].repeat(3) : mult === 1 ? p[0] + p[0] + p[1] : p[0] + p[1] + p[2];
      s.coins[id] += b * mult; s.log = `🎰 ${this.name(id)} bet ${b} 🪙 ${reel} → ${mult > 0 ? '+' : ''}${b * mult} 🪙${mult === 5 ? ' JACKPOT!' : ''}`; return this.nextTurn();
    }
    if (d.a === 'go' && s.phase === 'choose' && s.opts.includes(+d.k)) { const left = s.left; s.phase = 'moving'; s.opts = null; return this.stepTo(id, +d.k, left); }
    if (d.a === 'buy' && s.phase === 'shop' && t && s.stock?.includes(d.k) && s.coins[id] >= t.c && inv.length < MAXI) {
      s.coins[id] -= t.c; inv.push(d.k); s.log = `${this.name(id)} bought ${t.n}`; return this.push();
    }
    if (d.a === 'use' && s.phase === 'roll' && inv.includes(d.k) && !t.p) {
      inv.splice(inv.indexOf(d.k), 1); const me = this.name(id), rivals = s.order.filter(k => k !== id);
      if (d.k === 'steal') {
        const v = rivals.filter(k => s.coins[k] > 0).sort((a, b) => s.coins[b] - s.coins[a])[0];
        if (!v) s.log = 'Nobody had coins to steal!';
        else if (this.guard(v)) s.log = `${me}'s theft was blocked by ${this.name(v)}'s 🛡️!`;
        else { const n = Math.min(5, s.coins[v]); s.coins[v] -= n; s.coins[id] += n; s.log = `${me} stole ${n} 🪙 from ${this.name(v)}!`; }
      } else if (d.k === 'magnet') { s.star = this.ahead(s.pos[id], 5 + rand(4)); s.log = `${me} pulled the ⭐ closer!`; }
      else if (d.k === 'swap') {
        const v = rivals[rand(rivals.length)];
        if (v === undefined) s.log = 'Nobody to swap with!';
        else if (this.guard(v)) s.log = `${me}'s swap was blocked by ${this.name(v)}'s 🛡️!`;
        else { [s.pos[id], s.pos[v]] = [s.pos[v], s.pos[id]]; s.log = `${me} swapped places with ${this.name(v)}!`; }
      } else { s.next[id] = d.k; s.log = `${me} used ${t.n}`; }
      this.push();
    }
  }
  endRound() {
    const s = this.s; s.turn = 0; s.phase = 'minigame'; s.mega = s.round % 4 === 0 || s.round === s.rounds; const w = this.wander() + this.heat(); s.log = w + (s.mega ? '⭐ MEGA MINIGAME! The winner earns a star!' : 'Minigame time!'); this.push();
    setTimeout(() => { if (this.active) this.o.playMg(); }, 2000);
  }
  reward(i) { return this.s?.mega ? [20, 12, 6, 2][i] ?? 0 : REWARD[i] ?? 0; }
  onLeave(id) {
    if (!this.active || !this.o.net.isHost) return;
    const s = this.s, i = s.order.indexOf(id); if (i < 0) return;
    const wasCur = i === s.turn; s.order.splice(i, 1); if (i < s.turn) s.turn--;
    if (!s.order.length) return this.quit();
    if (s.phase === 'roll' || s.phase === 'shop' || s.phase === 'choose' || s.phase === 'slot') { if (s.turn >= s.order.length) return this.endRound(); if (wasCur) s.phase = 'roll'; }
    this.push();
  }
  onMgEnd(pl, rk = pl.map((_, i) => i)) {
    if (!this.active || !this.o.net.isHost) return; const s = this.s;
    pl.forEach((id, i) => { if (id in s.coins) { s.coins[id] += this.reward(rk[i]); if (s.mega && rk[i] === 0) s.stars[id]++; } });
    setTimeout(() => {
      if (!this.active) return;
      s.round++; s.mega = false; s.log = 'Minigame rewards paid!';
      if (s.round > s.rounds) {
        s.phase = 'end'; s.winner = [...s.order].sort((a, b) => s.stars[b] - s.stars[a] || s.coins[b] - s.coins[a])[0]; s.round = s.rounds;
      } else s.phase = 'roll';
      this.push();
    }, 4500);
  }
}
