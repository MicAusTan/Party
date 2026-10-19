import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
const COLS = [['RED', '#e74c3c'], ['BLUE', '#3498db'], ['GREEN', '#2ecc71'], ['YELLOW', '#f1c40f']];
export default {
  name: 'Color Clash', desc: 'Click (or press 1-4) the INK COLOR of the word, not what it says! +1 correct, -1 wrong. 20 seconds.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 30, lower: false }), rounds = Array.from({ length: 80 }, () => { const w = ctx.rng() * 4 | 0; return { w, c: ctx.rng() < .8 ? (w + 1 + (ctx.rng() * 3 | 0)) % 4 : w }; });
    let i = 0, score = 0, time = 0, done = false;
    const el = document.createElement('div'); el.className = 'mg';
    el.innerHTML = '<h3 id="s"></h3><h2 id="w"></h2><div>' + COLS.map((c, k) => `<button data-k="${k}" style="background:${c[1]};width:60px;height:44px;margin:3px">${k + 1}</button>`).join('') + '</div>'; ctx.hud.append(el);
    const s = el.querySelector('#s'), w = el.querySelector('#w');
    const answer = k => { if (done) return; if (k === rounds[i].c) { score++; sfx('click'); } else { score--; sfx('lose'); } i++; };
    el.onpointerdown = e => { const b = e.target.closest('[data-k]'); if (b) { e.stopPropagation(); answer(+b.dataset.k); } };
    const key = e => { const k = '1234'.indexOf(e.key); if (k >= 0) answer(k); };
    addEventListener('keydown', key);
    return {
      update(dt) {
        sb.tick(dt); time += dt; if (!done && time >= 20) { done = true; sb.report(score); }
        const r = rounds[i]; s.textContent = done ? `Final: ${score} - waiting for others...` : `${Math.ceil(20 - time)}s   Score: ${score}`;
        w.textContent = done ? '' : COLS[r.w][0]; w.style.color = done ? '' : COLS[r.c][1];
      },
      onMessage: sb.onMessage,
      cleanup() { removeEventListener('keydown', key); el.remove(); },
    };
  },
};
