import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
// Same seeded deck for everyone. Score = time + 1.5s per miss (lower wins).
export default {
  name: 'Memory Match', desc: 'Find all 8 pairs as fast as you can! Every wrong guess costs 1.5 seconds.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 80 }), syms = ['🍎', '🍌', '🍇', '🍒', '🍋', '🥝', '🍉', '🍓'], deck = [...syms, ...syms];
    for (let i = deck.length - 1; i > 0; i--) { const j = ctx.rng() * (i + 1) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
    let open = [], matched = new Set(), busy = 0, miss = 0, time = 0, done = false, dirty = true, lastT = '';
    const el = document.createElement('div'); el.className = 'mg'; el.innerHTML = '<h3 id="t"></h3><div id="grid"></div>'; ctx.hud.append(el);
    const grid = el.querySelector('#grid'), tl = el.querySelector('#t');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,64px);gap:6px;justify-content:center';
    el.onpointerdown = e => {
      const b = e.target.closest('[data-i]'); if (!b) return; e.stopPropagation();
      const i = +b.dataset.i; if (done || busy > 0 || open.includes(i) || matched.has(i)) return;
      open.push(i); sfx('click'); dirty = true;
      if (open.length === 2) {
        if (deck[open[0]] === deck[open[1]]) { open.forEach(k => matched.add(k)); open = []; sfx('coin'); if (matched.size === 16) { done = true; sb.report(Math.round(time * 1000 + miss * 1500)); } }
        else { miss++; busy = .7; sfx('lose'); }
      }
    };
    return {
      update(dt) {
        sb.tick(dt); if (!done) time += dt;
        if (busy > 0 && (busy -= dt) <= 0) { open = []; dirty = true; }
        if (dirty) { dirty = false; grid.innerHTML = deck.map((s, i) => { const up = open.includes(i) || matched.has(i);
          return `<button data-i="${i}" style="height:64px;font-size:30px;background:${matched.has(i) ? '#2ecc71' : up ? '#fff' : '#3498db'}">${up ? s : ''}</button>`; }).join(''); }
        const t = done ? `Done! ${(time + miss * 1.5).toFixed(1)}s - waiting for others...` : `${time.toFixed(1)}s  Misses: ${miss}`;
        if (t !== lastT) { tl.textContent = t; lastT = t; }
      },
      onMessage: sb.onMessage,
      cleanup() { el.remove(); },
    };
  },
};
