import * as THREE from 'three';
// Board layer. Host owns state `s` and broadcasts it in full on every change (it's tiny);
// clients just render it and send 'roll'. Minigames run between rounds via opts.playMg().
const N = 24, R = 10, TYPES = ['blue', 'blue', 'red', 'blue', 'green', 'blue'];
const COL = { blue: 0x4aa3ff, red: 0xff5a5a, green: 0x58d68d, shop: 0xb06bff, duel: 0xff9f43 }, REWARD = [10, 6, 3, 0];
const MAXI = 3, typeAt = i => i % 12 === 9 ? 'shop' : i % 12 === 3 ? 'duel' : TYPES[i % 6];
const ITEMS = {
  big: { n: 'Big Die', e: '🎯', c: 8, d: 'Next roll is 4-8' },
  dbl: { n: 'Double Dice', e: '🎲', c: 6, d: 'Next roll is two dice' },
  shield: { n: 'Shield', e: '🛡️', c: 5, d: 'Passive: blocks the next theft, swap or pickpocket', p: true },
  magnet: { n: 'Star Magnet', e: '🧲', c: 10, d: 'The ⭐ jumps 5-8 spaces ahead of you' },
  swap: { n: 'Swap', e: '🔄', c: 9, d: 'Trade places with a random rival' },
  steal: { n: 'Coin Thief', e: '💰', c: 7, d: 'Steal 5 🪙 from the richest rival' },
};
const rand = n => Math.random() * n | 0, spot = i => [Math.sin(i / N * Math.PI * 2) * R, Math.cos(i / N * Math.PI * 2) * R];

export class Board {
  constructor(o) {
    this.o = o; this.active = false; this.s = null; this.objs = [];
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
    const pv = this.prev; this.s = d;
    if (!this.active) { this.active = true; this.build(); }
    for (const id of d.order) this.o.world.set(id, ...this.place(id));
    { const [sx, sz] = spot(d.star); this.star.position.set(sx, 1.8, sz); }
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
    if (b.phase === 'minigame' && a.phase !== 'minigame' && b.mega) f('mega');
  }
  place(id) {
    const s = this.s, i = s.pos[id], [x, z] = spot(i), at = s.order.filter(k => s.pos[k] === i), k = at.indexOf(id);
    const a = k / at.length * Math.PI * 2, off = at.length > 1 ? .7 : 0;
    return [x + Math.cos(a) * off, z + Math.sin(a) * off];
  }
  build() {
    const sc = this.o.world.scene;
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .3, 6), new THREE.MeshStandardMaterial({ color: COL[typeAt(i)], flatShading: true }));
      m.position.set(spot(i)[0], .15, spot(i)[1]); sc.add(m); this.objs.push(m); this.o.world.deco.push(m);
    }
    this.star = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 0), new THREE.MeshStandardMaterial({ color: 0xffd93d, flatShading: true, emissive: 0x665500 }));
    sc.add(this.star); this.objs.push(this.star); this.o.world.deco.push(this.star);
  }
  teardown() {
    this.prev = null;
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
    el.innerHTML = `<b>Round ${Math.min(s.round, s.rounds)} / ${s.rounds}</b>` +
      s.order.map(id => `<div style="color:${ps[id]?.color}">${id === cur && (s.phase === 'roll' || s.phase === 'shop') ? '▶ ' : ''}${nm(id)} 🪙${s.coins[id]} ⭐${s.stars[id]} ${(s.items[id] || []).map(k => ITEMS[k].e).join('')}</div>`).join('') +
      `<div>${s.log}</div>` + (s.phase === 'end' ? `<h3>🏆 ${nm(s.winner)} wins!</h3>` : '') + act;
  }
  // ---- host only
  push() { this.apply(this.s); this.o.net.broadcast('board', this.s); }
  start(rounds) {
    const ps = this.o.players(), order = Object.keys(ps), s = { rounds, round: 1, turn: 0, order, pos: {}, coins: {}, stars: {}, items: {}, next: {}, phase: 'roll', star: 6 + rand(N - 8), log: 'Game start!' };
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
    const step = () => {
      if (!this.active) return;
      s.pos[id] = (s.pos[id] + 1) % N;
      if (s.pos[id] === s.star && s.coins[id] >= 20) {
        s.coins[id] -= 20; s.stars[id]++; s.star = (s.star + 3 + rand(N - 6)) % N; s.log = `${this.name(id)} bought a ⭐!`;
      }
      this.push(); --left > 0 ? setTimeout(step, 350) : setTimeout(() => this.land(id), 450);
    };
    setTimeout(step, 500);
  }
  land(id) {
    const s = this.s; if (!this.active) return;
    const t = typeAt(s.pos[id]), me = this.name(id);
    if (t === 'green') s.log = this.event(id);
    else if (t === 'duel') s.log = this.duel(id);
    else if (t === 'shop') s.log = `${me} entered the shop`;
    else { const d = Math.max(t === 'blue' ? 3 : -3, -s.coins[id]); s.coins[id] += d; s.log = `${me} landed on ${t}: ${d >= 0 ? '+' : ''}${d} 🪙`; }
    if (t === 'shop') { s.stock = Object.keys(ITEMS).sort(() => Math.random() - .5).slice(0, 3); s.phase = 'shop'; return this.push(); }
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
      () => { s.pos[id] = rand(N); return `${me} was teleported!`; },
      () => { s.star = (s.star + 3 + rand(N - 6)) % N; return 'The ⭐ was shuffled to a new space!'; },
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
    if (d.a === 'leave' && s.phase === 'shop') return this.nextTurn();
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
      } else if (d.k === 'magnet') { s.star = (s.pos[id] + 5 + rand(4)) % N; s.log = `${me} pulled the ⭐ closer!`; }
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
    const s = this.s; s.turn = 0; s.phase = 'minigame'; s.mega = s.round % 4 === 0 || s.round === s.rounds; s.log = s.mega ? '⭐ MEGA MINIGAME! The winner earns a star!' : 'Minigame time!'; this.push();
    setTimeout(() => { if (this.active) this.o.playMg(); }, 2000);
  }
  reward(i) { return this.s?.mega ? [20, 12, 6, 2][i] ?? 0 : REWARD[i] ?? 0; }
  onLeave(id) {
    if (!this.active || !this.o.net.isHost) return;
    const s = this.s, i = s.order.indexOf(id); if (i < 0) return;
    const wasCur = i === s.turn; s.order.splice(i, 1); if (i < s.turn) s.turn--;
    if (!s.order.length) return this.quit();
    if (s.phase === 'roll' || s.phase === 'shop') { if (s.turn >= s.order.length) return this.endRound(); if (wasCur) s.phase = 'roll'; }
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
