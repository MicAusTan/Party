import { teams } from './util.js';
// Turns any minigame into a TEAM version without touching the game: players are split into two random teams (🔴 / 🔵, same on every client),
// the game plays exactly as normal, and the final placements are averaged per team (average of squared placement points, so 3v2 stays fair and top finishers count more). The better
// team wins and its members tie for 1st; the other team ties for 2nd. Fallback for one-sided lobbies: everybody shares 1st.
export function teamGame(base, { name, desc }) {
  return {
    ...base, team: true, name, desc: `TEAM VERSION! ${desc} You're on a random team (🔴 / 🔵) - the team with the better average placement wins.`,
    create(ctx) {
      const team = teams(ctx), ids = Object.keys(ctx.players), n = ids.length, c2 = Object.create(ctx);
      c2.team = team;
      c2.finish = (order, ranks) => {                                    // `order` = best first (ranks may tie); individual results become team results
        const pts = {}; order.forEach((id, i) => pts[id] = (n - (ranks ? ranks[i] : i)) ** 2);       // squared, so 2v2 splits like 4+1 vs 3+2 don't tie
        const avg = k => { const m = ids.filter(id => team(id) === k); return m.length ? m.reduce((a, id) => a + (pts[id] ?? 0), 0) / m.length : null; };
        const a = [avg(0), avg(1)], win = a[0] == null || a[1] == null || a[0] === a[1] ? -1 : a[0] > a[1] ? 0 : 1;
        const sorted = [...ids].sort((x, y) => (win < 0 ? 0 : (team(x) === win ? 0 : 1) - (team(y) === win ? 0 : 1)) || (pts[y] ?? 0) - (pts[x] ?? 0));
        ctx.finish(sorted, sorted.map(id => win < 0 || team(id) === win ? 0 : 1));
      };
      const inst = base.create(c2), el = document.createElement('div'); el.className = 'tbar';
      const nm = k => ids.filter(id => team(id) === k).map(id => ctx.esc(ctx.players[id].name)).join(', ');
      el.innerHTML = `<b>🔴 ${nm(0)}</b><br><b>🔵 ${nm(1)}</b><br><small>You: ${team(ctx.me) ? '🔵 Blue' : '🔴 Red'}</small>`; ctx.hud.append(el);
      let shown = false;
      return {
        ...inst,
        update(dt) { inst.update(dt); if (!shown && (shown = true)) ids.forEach(id => ctx.world.popIcon?.(id, team(id) ? '🔵' : '🔴')); },
        cleanup() { el.remove(); inst.cleanup(); },
      };
    },
  };
}
