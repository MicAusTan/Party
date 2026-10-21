// Helper for minigames where each client scores itself locally and reports one number.
// const sb = scoreboard(ctx, { timeout: 30, lower: true });
//   sb.report(value)  -> call once when this player is done
//   sb.tick(dt)       -> call from update(); host ends the game after `timeout`s
//   sb.onMessage(m, from) -> call from your onMessage; host collects reports, then ctx.finish()s
export function scoreboard(ctx, { timeout = 30, lower = true } = {}) {
  const ids = Object.keys(ctx.players), res = {}; let t = timeout, done = false;
  const val = id => id in res ? res[id] : (lower ? 1e9 : -1e9);
  const finish = () => {
    if (done) return; done = true;
    ctx.finish([...ids].sort((a, b) => lower ? val(a) - val(b) : val(b) - val(a)));
  };
  const check = () => { if (ids.every(id => id in res || ctx.players[id]?.bot)) finish(); };
  return {
    report(v) { if (ctx.isHost) { res[ctx.me] = v; check(); } else ctx.send({ r: v }); },
    onMessage(m, from) { if (ctx.isHost && m.r != null && ids.includes(from) && !(from in res)) { res[from] = +m.r || 0; check(); } },
    tick(dt) { if (ctx.isHost && (t -= dt) <= 0) finish(); },
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
