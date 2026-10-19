import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
export default {
  name: 'Higher or Lower', desc: 'Is the next card higher or lower? W/Up = higher, S/Down = lower. +1 correct, -1 wrong. 20 seconds!',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 30, lower: false }), cards = Array.from({ length: 80 }, () => 1 + ctx.rng() * 13 | 0);
    let i = 0, score = 0, time = 0, done = false, note = '';
    const el = document.createElement('div'); el.className = 'mg';
    el.innerHTML = '<h3 id="s"></h3><h2 id="c"></h2><div><button data-d="1">▲ Higher</button> <button data-d="0">▼ Lower</button></div><div id="n"></div>';
    ctx.hud.append(el); const s = el.querySelector('#s'), c = el.querySelector('#c'), n = el.querySelector('#n');
    const guess = up => {
      if (done) return; const a = cards[i], b = cards[i + 1]; i++;
      if (a === b) note = 'Tie - no change'; else if ((b > a) === up) { score++; note = '✓ Correct'; sfx('click'); } else { score--; note = '✗ Wrong'; sfx('lose'); }
    };
    el.onpointerdown = e => { const b = e.target.closest('[data-d]'); if (b) { e.stopPropagation(); guess(b.dataset.d === '1'); } };
    const key = e => { if (e.code === 'KeyW' || e.code === 'ArrowUp') guess(true); else if (e.code === 'KeyS' || e.code === 'ArrowDown') guess(false); };
    addEventListener('keydown', key);
    return {
      update(dt) {
        sb.tick(dt); time += dt; if (!done && time >= 20) { done = true; sb.report(score); }
        s.textContent = done ? `Final score: ${score} - waiting for others...` : `${Math.ceil(20 - time)}s   Score: ${score}`;
        c.textContent = done ? '' : cards[i]; n.textContent = note;
      },
      onMessage: sb.onMessage,
      cleanup() { removeEventListener('keydown', key); el.remove(); },
    };
  },
};
