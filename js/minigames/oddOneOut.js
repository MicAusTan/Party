import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
const SETS = [['😀', '😃'], ['🍎', '🍅'], ['🐶', '🐺'], ['🌕', '🌝'], ['⭐', '🌟'], ['🔵', '🟦'], ['🐱', '🐯'], ['🍊', '🥭']];
export default {
  name: 'Odd One Out', desc: 'Find the one emoji that\'s different! 8 grids, fastest wins. A wrong click costs 1 second.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 70 }), rounds = Array.from({ length: 8 }, () => ({ s: SETS[ctx.rng() * SETS.length | 0], odd: ctx.rng() * 25 | 0 }));
    let i = 0, pen = 0, time = 0, done = false, dirty = true, lastT = '';
    const el = document.createElement('div'); el.className = 'mg'; el.innerHTML = '<h3 id="t"></h3><div id="g"></div>'; ctx.hud.append(el);
    const g = el.querySelector('#g'), tl = el.querySelector('#t'); g.style.cssText = 'display:grid;grid-template-columns:repeat(5,52px);gap:4px;justify-content:center';
    el.onpointerdown = e => {
      const b = e.target.closest('[data-i]'); if (!b || done) return; e.stopPropagation();
      if (+b.dataset.i === rounds[i].odd) { i++; dirty = true; sfx('click'); if (i >= rounds.length) { done = true; sb.report(Math.round(time * 1000 + pen * 1000)); } } else { pen++; sfx('lose'); }
    };
    return {
      update(dt) {
        sb.tick(dt); if (!done) time += dt;
        if (dirty && !done) { dirty = false; const r = rounds[i]; g.innerHTML = Array.from({ length: 25 }, (_, k) => `<button data-i="${k}" style="height:48px;font-size:26px;background:#fff">${r.s[k === r.odd ? 1 : 0]}</button>`).join(''); }
        if (done) g.innerHTML = '';
        const t = done ? `Done! ${(time + pen).toFixed(1)}s - waiting for others...` : `Grid ${i + 1}/8   ${time.toFixed(1)}s   Penalty: ${pen}s`; if (t !== lastT) { tl.textContent = t; lastT = t; }
      },
      onMessage: sb.onMessage,
      cleanup() { el.remove(); },
    };
  },
};
