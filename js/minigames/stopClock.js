import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
export default {
  name: 'Stop the Clock', desc: 'A timer starts, then vanishes after 3 seconds. Press SPACE (or click) when you think it hits exactly 10.00!',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 20 }); let t = 0, stopped = false, stopT = 0;
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const press = () => { if (stopped) return; stopped = true; stopT = t; sfx('click'); sb.report(Math.round(Math.abs(t - 10) * 1000)); };
    const key = e => { if (e.code === 'Space' && !e.repeat) press(); };
    addEventListener('keydown', key); addEventListener('pointerdown', press);
    return {
      update(dt) {
        t += dt; sb.tick(dt);
        if (!stopped && t >= 15) { stopped = true; stopT = t; sb.report(5000); }
        const shown = stopped ? stopT.toFixed(2) : t < 3 ? t.toFixed(2) : '?.??';
        el.innerHTML = `<h2>${shown}</h2>` + (stopped ? `<div>Off by ${Math.round(Math.abs(stopT - 10) * 1000)}ms. Waiting for others...</div>` : '<div>Target: 10.00</div>');
      },
      onMessage: sb.onMessage,
      cleanup() { removeEventListener('keydown', key); removeEventListener('pointerdown', press); el.remove(); },
    };
  },
};
