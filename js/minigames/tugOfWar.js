import { teams } from './util.js';
import { sfx } from '../sfx.js';
// Teams alternate by join order (red / blue). Mash to pull the rope to your side. Host owns the rope.
export default {
  name: 'Tug of War', desc: 'Two teams! Mash SPACE (or click) to pull the rope to your side.',
  create(ctx) {
    const ids = Object.keys(ctx.players), host = ctx.isHost, team = teams(ctx), size = [0, 1].map(t => ids.filter(id => team(id) === t).length);
    const presses = {}; ids.forEach(id => presses[id] = 0);
    let r = 0, time = 0, acc = 0, over = false;
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const pull = id => { if (over || !(id in presses)) return; presses[id]++; r = Math.max(-1, Math.min(1, r + (team(id) ? -1 : 1) * .04 / Math.max(1, size[team(id)]))); };
    const press = () => { if (over) return; sfx('click'); host ? pull(ctx.me) : ctx.send({ press: 1 }); };
    const key = e => { if (e.code === 'Space' && !e.repeat) press(); };
    addEventListener('keydown', key); addEventListener('pointerdown', press);
    const names = t => ids.filter(id => team(id) === t).map(id => ctx.esc(ctx.players[id].name)).join(', ') || '-';
    return {
      update(dt) {
        time += dt;
        if (host && !over) {
          if ((acc += dt) > .1) { acc = 0; ctx.send({ r }); }
          if (Math.abs(r) >= 1 || time > 25) {
            over = true; ctx.send({ r });
            const sum = t => ids.filter(id => team(id) === t).reduce((a, id) => a + presses[id], 0);
            const win = r > 0 ? 0 : r < 0 ? 1 : (sum(0) >= sum(1) ? 0 : 1);
            ctx.finish([...ids].sort((a, b) => (team(b) === win) - (team(a) === win) || presses[b] - presses[a]));
          }
        }
        el.innerHTML = `<h3>You: Team ${team(ctx.me) ? '🔵 Blue' : '🔴 Red'}</h3>` +
          `<div style="position:relative;height:26px;border-radius:13px;background:linear-gradient(90deg,#3498db,#e74c3c)"><i style="position:absolute;top:-4px;left:calc(${(r + 1) * 50}% - 6px);width:12px;height:34px;background:#fff;border-radius:4px"></i></div>` +
          `<div style="display:flex;justify-content:space-between;font-size:13px"><span>🔵 ${names(1)}</span><span>🔴 ${names(0)}</span></div><div>MASH!</div>`;
      },
      onMessage(m, from) { if (host) { if (m.press) pull(from); } else if (m.r != null) r = m.r; },
      cleanup() { removeEventListener('keydown', key); removeEventListener('pointerdown', press); el.remove(); },
    };
  },
};
