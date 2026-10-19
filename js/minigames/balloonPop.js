import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
const W = 460, H = 280;
export default {
  name: 'Balloon Pop', desc: 'Pop balloons for +1 - but DON\'T click the black bombs (-3)! 15 seconds.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 25, lower: false });
    const bs = Array.from({ length: 80 }, (_, i) => ({ ts: i * .19, x: 25 + ctx.rng() * (W - 50), sp: 70 + ctx.rng() * 70, bomb: ctx.rng() < .2, c: `hsl(${ctx.rng() * 360 | 0} 80% 55%)`, dead: false }));
    let time = 0, score = 0, done = false;
    const el = document.createElement('div'); el.className = 'mg'; el.innerHTML = `<h3 id="s"></h3><canvas width="${W}" height="${H}" style="background:#fff2;border-radius:8px;cursor:crosshair"></canvas>`; ctx.hud.append(el);
    const cv = el.querySelector('canvas'), c = cv.getContext('2d'), s = el.querySelector('#s'), yOf = b => H + 30 - (time - b.ts) * b.sp;
    cv.onpointerdown = e => {
      e.stopPropagation(); if (done) return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = bs.filter(b => !b.dead && time >= b.ts && Math.hypot(b.x - x, yOf(b) - y) < 24).sort((a, b) => yOf(a) - yOf(b))[0];
      if (hit) { hit.dead = true; score += hit.bomb ? -3 : 1; sfx(hit.bomb ? 'hit' : 'click'); }
    };
    return {
      update(dt) {
        sb.tick(dt); time += dt; if (!done && time >= 15) { done = true; sb.report(score); }
        c.clearRect(0, 0, W, H); c.font = '24px sans-serif'; c.textAlign = 'center';
        for (const b of bs) {
          if (b.dead || time < b.ts) continue; const y = yOf(b); if (y < -40) continue;
          c.fillStyle = b.bomb ? '#222' : b.c; c.beginPath(); c.ellipse(b.x, y, 19, 24, 0, 0, 6.3); c.fill(); if (b.bomb) { c.fillStyle = '#fff'; c.fillText('💣', b.x, y + 8); }
        }
        s.textContent = done ? `Final: ${score} - waiting for others...` : `${Math.ceil(15 - time)}s   Score: ${score}`;
      },
      onMessage: sb.onMessage,
      cleanup() { el.remove(); },
    };
  },
};
