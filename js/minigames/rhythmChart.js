// Rhythm Rush chart generator. Pure (no DOM / three), so dev-tests can run it in node: buildChart(R, D) -> { notes, endT, C }.
// TIMING IS THE SAME FOR EVERY TIER (hit windows .18 / .07; Nightmare plays at Insane's BPM and note speed) - tiers only change WHAT notes appear.
// R is a seeded 0..1 generator (ctx.rng), D the tier (0 Normal .. 4 Nightmare). Same seed = same chart on every client.
// The song is built from PATTERNS (taps, off-beat taps, streams, bursts, jumpstreams, handstreams, jacks, holds with notes
// inside them, triplet runs) picked at random in SECTIONS of different intensity, so notes arrive in bursts and gaps instead of a
// fixed beat grid. Time is counted in g = a sixteenth note. All the numbers per tier live in CFG.
//   pool  = rhythm cell (spacing between notes, in g) for ordinary phrases   bpool = the same for bursts
//   tapn  = notes per tap phrase
//   gap   = pause after a pattern (g), scaled by dens (lower = busier)       w = pattern weights       press = max keys held/pressed at once
//   lg    = min spacing between two notes on the SAME lane (g)         jg = jack spacing (g)
export const CFG = [
  { n: 'Normal', tapn: [3, 6], dens: .7, bpm: 96, V: 14, song: 28, win: .18, perf: .07, press: 2, lg: 2, jg: 2, pool: [2, 2, 3, 4], bpool: [2, 2, 1], gap: [2, 3, 4, 6], fine: 0, hs: 0, strm: [3, 5], burst: [4, 6], jack: [2, 3], hold: [2, 4], ht: 0, dbl: 0, sync: [2], trip: [1, 1], w: { tap: 7, sync: 3, stream: 2, hold: 1.5, rest: 1 } },
  { n: 'Hard', tapn: [3, 6], dens: .6, bpm: 112, V: 16, song: 32, win: .18, perf: .07, press: 2, lg: 2, jg: 2, pool: [2, 2, 1, 3, 4], bpool: [1, 2, 1], gap: [2, 2, 3, 4], fine: .3, hs: 0, strm: [4, 7], burst: [5, 8], jack: [2, 3], hold: [2, 5], ht: .25, dbl: 0, sync: [1, 2], trip: [1, 1], w: { tap: 4, sync: 4, stream: 4, burst: 2, jump: 2, hold: 2, holdtap: 1, rest: .6 } },
  { n: 'Expert', tapn: [3, 7], dens: .6, bpm: 128, V: 18, song: 36, win: .18, perf: .07, press: 2, lg: 2, jg: 2, pool: [1, 2, 1, 3, 4], bpool: [1, 1, 2], gap: [1, 2, 2, 3], fine: .8, hs: 0, strm: [6, 10], burst: [6, 10], jack: [2, 4], hold: [2, 6], ht: .6, dbl: 0, sync: [1, 3], trip: [1, 2], w: { tap: 2, sync: 3, stream: 5, burst: 4, jump: 4, jack: 2, hold: 2, holdtap: 3, trip: 2, rest: .5 } },
  { n: 'Insane', tapn: [3, 7], dens: .45, bpm: 144, V: 20, song: 40, win: .18, perf: .07, press: 3, lg: 2, jg: 2, pool: [1, 1, 2, 3, 1.333], bpool: [1, 1, 1, 2], gap: [1, 1, 2, 3], fine: 1, hs: .08, strm: [8, 14], burst: [8, 12], jack: [3, 5], hold: [2, 6], ht: .85, dbl: .35, sync: [1, 3], trip: [2, 3], w: { tap: 1, sync: 2, stream: 5, burst: 5, jump: 4, hand: 1, jack: 3, hold: 2, holdtap: 4, trip: 3, rest: .4 } },
  { n: 'Nightmare', tapn: [4, 8], dens: .22, bpm: 144, V: 20, song: 46, win: .18, perf: .07, press: 3, lg: 1.5, jg: 1.5, pool: [1, 1, 1, 1, 2, 1.333], bpool: [1, 1, 1, 1, 1, 2], gap: [1, 1, 1, 1, 2], fine: 1, hs: .3, strm: [14, 26], burst: [12, 20], jack: [4, 7], hold: [2, 6], ht: 1, dbl: .6, sync: [1, 3], trip: [3, 5], w: { stream: 6, burst: 6, jump: 5, hand: 5, jack: 4, hold: 1, holdtap: 4, trip: 5, rest: .1 } },
];
const DENSE = new Set(['stream', 'burst', 'jump', 'hand', 'jack', 'holdtap', 'trip']);
const PERMS = [[0, 2, 1, 3], [1, 3, 0, 2], [0, 3, 1, 2], [3, 0, 2, 1], [2, 0, 3, 1]];

export function buildChart(R, D) {
  const C = CFG[Math.max(0, Math.min(CFG.length - 1, D | 0))], beat = 60 / C.bpm, g = beat / 4, notes = [], busy = [0, 0, 0, 0], holds = [], EPS = 1e-6;
  let t = 2.2, last = -1, last2 = -1;
  const ri = (a, b) => a + (R() * (b - a + 1) | 0), chance = p => R() < p, choose = a => a[R() * a.length | 0], iv = () => choose(C.pool) * g;
  const pressing = tt => holds.reduce((n, h) => n + (h.s <= tt + EPS && h.e > tt + EPS ? 1 : 0), 0), room = tt => C.press - pressing(tt);
  const free = (tt, ex = []) => [0, 1, 2, 3].filter(l => busy[l] <= tt + EPS && !ex.includes(l));
  const add = (tt, l, len = 0, lg = C.lg * g) => { notes.push({ t: tt, l, len, hit: 0 }); busy[l] = tt + len + (len ? 2 * g : lg); if (len) holds.push({ s: tt, e: tt + len }); };
  const pickLane = (tt, ex = []) => { const fr = free(tt, ex); if (!fr.length) return -1; const f2 = fr.filter(l => l !== last && l !== last2), f1 = fr.filter(l => l !== last); return choose(f2.length ? f2 : f1.length ? f1 : fr); };
  const note = (tt, ex) => { if (room(tt) < 1) return -1; const l = pickLane(tt, ex); if (l < 0) return -1; add(tt, l); last2 = last; last = l; return l; };
  const chord = (tt, k, ex = []) => {
    k = Math.min(k, room(tt)); const fr = free(tt, ex); k = Math.min(k, fr.length); if (k < 2) return note(tt, ex);
    const ls = []; while (ls.length < k) { const l = choose(fr.filter(x => !ls.includes(x))); ls.push(l); }
    ls.forEach(l => add(tt, l)); last2 = last; last = ls[ls.length - 1]; return ls.length;
  };
  const lanes = (type, n) => {
    const a = ri(0, 3), dir = chance(.5) ? 1 : -1, b = (a + ri(1, 3)) % 4, c = (b + ri(1, 3)) % 4, p = choose(PERMS), out = [];
    for (let k = 0; k < n; k++) out.push(type === 'stair' ? ((a + dir * k) % 4 + 4) % 4 : type === 'trill' ? (k % 2 ? b : a) : type === 'zig' ? [a, b, c, b][k % 4] : type === 'split' ? p[k % 4] : -1);
    return out;
  };
  const P = {
    tap() { const n = ri(C.tapn[0], C.tapn[1]); for (let i = 0; i < n; i++) { note(t); t += iv(); } },
    sync() { t += choose(C.sync) * g; P.tap(); },
    stream() {
      const n = ri(C.strm[0], C.strm[1]), st = chance(C.fine) ? g : 2 * g, ls = lanes(choose(['stair', 'trill', 'zig', 'split', 'roll']), n);
      for (let k = 0; k < n; k++) {
        if (k > 2 && chance(C.hs)) chord(t, ri(2, 3)); else if (ls[k] >= 0 && busy[ls[k]] <= t + EPS && room(t) > 0) { add(t, ls[k]); last2 = last; last = ls[k]; } else note(t);
        t += st;
      }
    },
    burst() {
      t += choose([1, 2, 3]) * g; const n = ri(C.burst[0], C.burst[1]);
      for (let k = 0; k < n; k++) { if (k === n - 1) chord(t, 2); else note(t); t += choose(C.bpool) * g; }
      t += 2 * g;
    },
    jump() { const k = ri(3, 6), alt = chance(.6); for (let i = 0; i < k; i++) { if (alt ? i % 2 === 0 : chance(.7)) chord(t, 2); else note(t); t += iv(); } },
    hand() { const k = ri(2, 4); for (let i = 0; i < k; i++) { chord(t, 3); t += choose([2, 3, 4]) * g; if (chance(.4)) { note(t); t += 2 * g; } } },
    jack() {
      const l = pickLane(t); if (l < 0) { t += 2 * g; return; } const n = ri(C.jack[0], C.jack[1]), jg = C.jg * g;
      for (let i = 0; i < n; i++) { if (busy[l] <= t + EPS && room(t) > 0) { add(t, l, 0, jg); last2 = last; last = l; } t += jg; }
    },
    hold() {
      if (room(t) < 1) { t += 2 * g; return; } const l = pickLane(t); if (l < 0) { t += 2 * g; return; } const len = ri(C.hold[0], C.hold[1]) * 2 * g, e = t + len, t0 = t;
      add(t0, l, len); last2 = last; last = l;
      if (chance(C.dbl) && room(t0 + EPS) > 0) { const l2 = pickLane(t0, [l]); if (l2 >= 0) { const len2 = chance(.5) ? len : Math.max(4 * g, len - 2 * g * ri(0, 1)); add(t0, l2, len2, 0); last = l2; } }
      if (chance(C.ht)) { let tt = t0 + iv() + g; while (tt < e - 2 * g) { if (chance(C.hs * 2) && room(tt) > 1) chord(tt, 2); else note(tt); tt += iv(); } }
      t = e + 2 * g;
    },
    holdtap() { const keep = C.ht; C.ht = 1; P.hold(); C.ht = keep; },
    trip() {
      const bs = ri(C.trip[0], C.trip[1]); for (let b = 0; b < bs; b++) { for (let i = 0; i < 3; i++) { if (i === 0 && C.hs && chance(.3)) chord(t, 2); else note(t + i * beat / 3); } t += beat; }
    },
    rest() { t += beat * choose([.5, 1, 1, 2]); },
  };
  let secEnd = 0, inten = .8;
  while (t < C.song) {
    if (t >= secEnd) { secEnd = t + ri(5, 9); inten = t > C.song - 9 ? 1.5 : choose([.6, .9, 1, 1.2, 1.5]); }
    const ks = Object.keys(C.w).map(k => [k, C.w[k] * (DENSE.has(k) ? inten * inten : k === 'rest' ? 1 / inten : 1)]), tot = ks.reduce((a, k) => a + k[1], 0);
    let r = R() * tot, pick = ks[0][0]; for (const [k, w] of ks) { if ((r -= w) < 0) { pick = k; break; } }
    P[pick](); t += choose(C.gap) * g * C.dens * Math.max(.55, Math.min(1.6, 1.6 - .6 * inten));
  }
  notes.sort((x, y) => x.t - y.t || x.l - y.l);
  return { notes, endT: Math.max(...notes.map(k => k.t + k.len)) + 1, C };
}
