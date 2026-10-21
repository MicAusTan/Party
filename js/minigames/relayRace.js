import { teams } from './util.js';
import { sfx } from '../sfx.js';
// TEAM game. Teams alternate by join order (red/blue). Only your team's current runner's presses count.
const LAP = 30;
export default {
  name: 'Relay Race', desc: `TEAM GAME! Only your team's current runner mashes SPACE (or click). ${LAP} presses per lap, then your teammate runs. First team done wins.`,
  create(ctx) {
    const ids = Object.keys(ctx.players), host = ctx.isHost, team = teams(ctx), teams = [0, 1].map(t => ids.filter(id => team(id) === t));
    let cur = [0, 0], prog = [0, 0], winner = null, time = 0, acc = 0, over = false;
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const frac = t => teams[t].length ? (cur[t] + prog[t] / LAP) / teams[t].length : 0;
    const pull = id => { if (over) return; const t = team(id); if (teams[t][cur[t]] !== id) return; if (++prog[t] >= LAP) { prog[t] = 0; cur[t]++; if (cur[t] >= teams[t].length) winner = t; } };
    const press = () => { sfx('click'); host ? pull(ctx.me) : ctx.send({ press: 1 }); };
    const key = e => { if (e.code === 'Space' && !e.repeat) press(); };
    addEventListener('keydown', key); addEventListener('pointerdown', press);
    return {
      update(dt) {
        time += dt;
        if (host && !over) { const ba = ctx._ba ??= {}; for (const id of ids) if (ctx.players[id].bot) { ba[id] = (ba[id] || 0) + dt * 4; while (ba[id] >= 1) { ba[id]--; pull(id); } } }
        if (host && !over) {
          if ((acc += dt) > .1) { acc = 0; ctx.send({ c: cur, p: prog }); }
          if (winner !== null || time > 70) {
            if (winner === null) winner = frac(0) >= frac(1) ? 0 : 1;
            over = true; ctx.send({ c: cur, p: prog });
            const pl = [...ids].sort((a, b) => (team(b) === winner) - (team(a) === winner)); ctx.finish(pl, pl.map(id => team(id) === winner ? 0 : 2));
          }
        }
        const mineRun = teams[team(ctx.me)][cur[team(ctx.me)]] === ctx.me;
        el.innerHTML = `<h3>${mineRun ? '🏃 YOU\'RE RUNNING - MASH!' : 'Cheer on your team!'}</h3>` + [0, 1].map(t => {
          const run = teams[t][cur[t]]; return `<div class="bar"><span style="width:${Math.min(100, frac(t) * 100)}%;background:${t ? '#3498db' : '#e74c3c'}"></span><b>${t ? '🔵' : '🔴'} ${run ? '▶ ' + ctx.esc(ctx.players[run].name) : teams[t].length ? 'Finished!' : '-'}</b></div>`; }).join('') +
          `<div style="font-size:13px">You are ${team(ctx.me) ? '🔵 Blue' : '🔴 Red'}</div>`;
      },
      onMessage(m, from) { if (host) { if (m.press) pull(from); } else if (m.c) { cur = m.c; prog = m.p; } },
      cleanup() { removeEventListener('keydown', key); removeEventListener('pointerdown', press); el.remove(); },
    };
  },
};
