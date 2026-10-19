import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
export default {
  name: 'Number Sort', desc: 'Click the numbers 1 to 16 in order, as fast as you can! A wrong click costs 1 second.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 70 }), nums = Array.from({ length: 16 }, (_, i) => i + 1);
    for (let i = 15; i > 0; i--) { const j = ctx.rng() * (i + 1) | 0; [nums[i], nums[j]] = [nums[j], nums[i]]; }
    let next = 1, pen = 0, time = 0, done = false, dirty = true, lastT = '';
    const el = document.createElement('div'); el.className = 'mg'; el.innerHTML = '<h3 id="t"></h3><div id="g"></div>'; ctx.hud.append(el);
    const g = el.querySelector('#g'), tl = el.querySelector('#t'); g.style.cssText = 'display:grid;grid-template-columns:repeat(4,60px);gap:6px;justify-content:center';
    el.onpointerdown = e => {
      const b = e.target.closest('[data-n]'); if (!b || done) return; e.stopPropagation(); const n = +b.dataset.n;
      if (n === next) { next++; sfx('click'); dirty = true; if (next > 16) { done = true; sb.report(Math.round(time * 1000 + pen * 1000)); } } else { pen++; sfx('lose'); }
    };
    return {
      update(dt) {
        sb.tick(dt); if (!done) time += dt;
        if (dirty) { dirty = false; g.innerHTML = nums.map(n => `<button data-n="${n}" style="height:56px;font-size:22px;${n < next ? 'opacity:.2' : ''}">${n}</button>`).join(''); }
        const t = done ? `Done! ${(time + pen).toFixed(1)}s - waiting for others...` : `${time.toFixed(1)}s   Next: ${next}   Penalty: ${pen}s`; if (t !== lastT) { tl.textContent = t; lastT = t; }
      },
      onMessage: sb.onMessage,
      cleanup() { el.remove(); },
    };
  },
};
