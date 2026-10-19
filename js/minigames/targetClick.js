import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
export default {
  name: 'Target Practice', desc: 'Click the targets as fast as you can! 15 seconds, most hits wins. Missed targets move on.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 25, lower: false }), pos = Array.from({ length: 300 }, () => [ctx.rng() * 86, ctx.rng() * 78]);
    let i = 0, hits = 0, time = 0, life = 1.2, done = false;
    const el = document.createElement('div'); el.className = 'mg';
    el.innerHTML = '<h3 id="s"></h3><div style="position:relative;width:460px;height:260px;background:#fff2;border-radius:8px"><div id="t" style="position:absolute;width:50px;height:50px;border-radius:50%;cursor:crosshair;background:radial-gradient(#fff 18%,#e74c3c 20%,#fff 42%,#e74c3c 44%)"></div></div>';
    ctx.hud.append(el); const tg = el.querySelector('#t'), s = el.querySelector('#s');
    const place = () => { tg.style.left = pos[i][0] + '%'; tg.style.top = pos[i][1] + '%'; }; place();
    tg.onpointerdown = e => { e.stopPropagation(); if (done) return; hits++; sfx('click'); i++; life = 1.2; place(); };
    return {
      update(dt) {
        sb.tick(dt); time += dt;
        if (!done) {
          if ((life -= dt) <= 0) { i++; life = 1.2; place(); }
          if (time >= 15) { done = true; tg.style.display = 'none'; sb.report(hits); }
        }
        s.textContent = done ? `Hits: ${hits} - waiting for others...` : `${Math.ceil(15 - time)}s   Hits: ${hits}`;
      },
      onMessage: sb.onMessage,
      cleanup() { el.remove(); },
    };
  },
};
