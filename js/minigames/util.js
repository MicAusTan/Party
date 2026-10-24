// Helper for minigames where each client scores itself locally and reports one number.
// const sb = scoreboard(ctx, { timeout: 30, lower: true });
//   sb.report(value)  -> call once when this player is done
//   sb.tick(dt)       -> call from update(); host ends the game after `timeout`s
//   sb.onMessage(m, from) -> call from your onMessage; host collects reports, then ctx.finish()s
export function scoreboard(ctx, { timeout = 30, lower = true, bot } = {}) {
  const ids = Object.keys(ctx.players), res = {}, spec = {}; let t = timeout, done = false, el = 0;
  const val = id => id in res ? res[id] : (lower ? 1e9 : -1e9);
  const finish = () => {
    if (done) return; done = true;
    ctx.finish([...ids].sort((a, b) => lower ? val(a) - val(b) : val(b) - val(a)));
  };
  const check = () => { if (ids.every(id => id in res || (ctx.players[id]?.bot && !bot))) finish(); };
  // Bots (host only): `bot(skill 0..1) -> { v, t }` = the value they score and the second they finish. Uses Math.random, never ctx.rng.
  const botTick = dt => {
    if (!bot) return; el += dt;
    for (const id of ids) {
      if (!ctx.players[id]?.bot || id in res) continue;
      const sp = spec[id] ??= (() => { const o = bot(ctx.skill?.(id) ?? .5); return { v: o.v, t: Math.min(o.t, timeout - 1.5) }; })();
      if (el >= sp.t) res[id] = sp.v;
    }
    check();
  };
  return {
    report(v) { if (ctx.isHost) { res[ctx.me] = v; check(); } else ctx.send({ r: v }); },
    onMessage(m, from) { if (ctx.isHost && m.r != null && ids.includes(from) && !(from in res)) { res[from] = +m.r || 0; check(); } },
    tick(dt) { if (!ctx.isHost) return; botTick(dt); if ((t -= dt) <= 0) finish(); },
  };
}

// Random but identical on every client (uses the shared seeded ctx.rng; call it before other rng use).
// const team = teams(ctx);  team(id) -> 0 or 1
export function teams(ctx) {
  const sh = Object.keys(ctx.players), t = {};
  for (let i = sh.length - 1; i > 0; i--) { const j = ctx.rng() * (i + 1) | 0; [sh[i], sh[j]] = [sh[j], sh[i]]; }
  sh.forEach((id, k) => t[id] = k % 2);
  return id => t[id];
}

// Bot helpers: rnd(a, b) uniform, jit(x, frac) x +- frac, lerp by skill. Math.random only.
export const rnd = (a, b) => a + Math.random() * (b - a);
export const jit = (x, f = .15) => x * (1 + (Math.random() * 2 - 1) * f);
export const mix = (worst, best, s) => worst + (best - worst) * s;
