// Helper for minigames where each client scores itself locally and reports one number.
// const sb = scoreboard(ctx, { timeout: 30, lower: true });
//   sb.report(value)  -> call once when this player is done
//   sb.tick(dt)       -> call from update(); host ends the game after `timeout`s
//   sb.onMessage(m, from) -> call from your onMessage; host collects reports, then ctx.finish()s
export function scoreboard(ctx, { timeout = 30, lower = true, bot, unit = lower ? 'pct' : 'score' } = {}) {
  // unit 'score': the status bar shows live scores. unit 'pct': it shows % progress. Games feed their own progress through sb.prog(value).
  const ids = Object.keys(ctx.players), res = {}, spec = {}, prog = {}; let t = timeout, done = false, el = 0, mine = 0, mineSent = -1, ps = 0, bt = 0, left = timeout;
  const bar = typeof document !== 'undefined' && ctx.hud?.append ? document.createElement('div') : null; let flags = {}, vals = {}; const seen = {}, cheered = {};
  if (bar) { bar.className = 'sbar'; ctx.hud.append(bar); }
  const show = id => flags[id] ? (unit === 'score' ? `${Math.round(vals[id] || 0)} ✔` : '✔') : unit === 'score' ? String(Math.round(vals[id] || 0)) : Math.round((vals[id] || 0) * 100) + '%';
  const draw = () => { if (!bar) return; bar.innerHTML = `<span>⏱ ${Math.max(0, Math.ceil(left))}s</span>` + ids.map(id => { const p = ctx.players[id]; return `<span style="color:${p.color}">${p.bot ? '🤖' : '●'} ${ctx.esc ? ctx.esc(p.name) : p.name} ${show(id)}</span>`; }).join(''); };
  // Bots visibly play: a little hop whenever their progress ticks up, a cheer when they finish (every client does this from the shared bar data)
  const react = () => { for (const id of ids) { if (!ctx.players[id]?.bot) continue; const v = vals[id] || 0, step = unit === 'score' ? Math.floor(v) : Math.floor(v * 8); if (step > (seen[id] ?? 0)) { seen[id] = step; ctx.world?.hop?.(id, .25); } if (flags[id] && !cheered[id]) { cheered[id] = 1; ctx.world?.emote?.(id, 'cheer'); } } };
  draw();
  const finish = () => {
    if (done) return; done = true;
    ctx.finish([...ids].sort((a, b) => lower ? val(a) - val(b) : val(b) - val(a)));
  };
  const val = id => id in res ? res[id] : (lower ? 1e9 : -1e9);
  const check = () => { if (ids.every(id => id in res || (ctx.players[id]?.bot && !bot))) finish(); };
  // Bots (host only): `bot(skill 0..1) -> { v, t }` = the value they score and the second they finish. Uses Math.random, never ctx.rng.
  // As soon as every human is done the bots finish too (nobody waits for the timer).
  const botTick = dt => {
    if (!bot) return; el += dt;
    const humans = ids.filter(id => !ctx.players[id]?.bot), humansDone = humans.length > 0 && humans.every(id => id in res);
    for (const id of ids) {
      if (!ctx.players[id]?.bot) continue;
      const sp = spec[id] ??= (() => { const o = bot(ctx.skill?.(id) ?? .5); return { v: o.v, t: Math.min(o.t, timeout - 1.5) }; })();
      if (!(id in res) && (humansDone || el >= sp.t)) res[id] = sp.v;
    }
    check();
  };
  const snapshot = () => {
    for (const id of ids) {
      flags[id] = id in res; const sp = spec[id];
      vals[id] = flags[id] ? (unit === 'score' ? res[id] : 1) : sp ? (unit === 'score' ? sp.v * Math.min(1, el / sp.t) : Math.min(.99, el / sp.t)) : (prog[id] ?? 0);
    }
  };
  return {
    prog(v) { mine = +v || 0; if (ctx.isHost) prog[ctx.me] = mine; },
    endNow() { if (ctx.isHost) finish(); },                                  // host "End minigame": rank by what has been reported so far
    report(v) { if (ctx.isHost) { res[ctx.me] = v; check(); } else ctx.send({ r: v }); },
    onMessage(m, from) {
      if (!ctx.isHost && m.sbs) { ids.forEach((id, i) => { flags[id] = !!m.sbs[i][0]; vals[id] = m.sbs[i][1]; }); left = m.tl; draw(); react(); return; }
      if (ctx.isHost && m.pg != null && ids.includes(from)) prog[from] = +m.pg || 0;
      if (ctx.isHost && m.r != null && ids.includes(from) && !(from in res)) { res[from] = +m.r || 0; check(); }
    },
    tick(dt) {
      if (!ctx.isHost) { left -= dt; ps -= dt; if (mine !== mineSent && ps <= 0) { ps = .35; mineSent = mine; ctx.send({ pg: mine }); } if ((bt += dt) >= .5) { bt = 0; draw(); } return; }
      botTick(dt); if ((t -= dt) <= 0) finish();
      left = t; if ((bt += dt) >= .5) { bt = 0; snapshot(); draw(); react(); ctx.send({ sbs: ids.map(id => [flags[id] ? 1 : 0, +(vals[id] || 0).toFixed(unit === 'score' ? 0 : 2)]), tl: +Math.max(0, t).toFixed(1) }); }
    },
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
