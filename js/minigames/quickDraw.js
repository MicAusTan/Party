import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
// 3 rounds; wait for GO then react. Jumping the gun costs 1000ms. Lowest total wins.
export default {
  name: 'Quick Draw', desc: 'Press SPACE (or click) the instant it says GO! 3 rounds, lowest total time wins. Don\'t jump the gun!',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 40 }), delays = [0, 1, 2].map(() => 1.5 + ctx.rng() * 3);
    let r = 0, t = delays[0], state = 'wait', ms = 0, total = 0, done = false; const times = [];
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const rest = () => { r++; if (r >= 3) { done = true; state = 'done'; sb.report(Math.round(total)); } else { state = 'rest'; t = .9; } };
    const press = () => {
      if (done || state === 'rest') return;
      if (state === 'wait') { total += 1000; times.push('✗ +1000'); sfx('lose'); } else { total += ms; times.push(Math.round(ms) + 'ms'); sfx('click'); }
      rest();
    };
    const key = e => { if (e.code === 'Space' && !e.repeat) press(); };
    addEventListener('keydown', key); addEventListener('pointerdown', press);
    return {
      update(dt) {
        sb.tick(dt);
        if (state === 'rest' && (t -= dt) <= 0) { state = 'wait'; t = delays[r]; }
        else if (state === 'wait' && (t -= dt) <= 0) { state = 'go'; ms = 0; sfx('go'); }
        else if (state === 'go') ms += dt * 1000;
        const big = state === 'go' ? ['GO!', '#2ecc71'] : state === 'done' ? [`${Math.round(total)}ms`, '#3498db'] : state === 'rest' ? ['...', '#7f8c8d'] : ['WAIT', '#e74c3c'];
        el.innerHTML = `<h2 style="background:${big[1]};border-radius:10px;padding:14px">${big[0]}</h2><div>${times.join(' | ')}</div>${state === 'done' ? '<div>Waiting for others...</div>' : ''}`;
      },
      onMessage: sb.onMessage,
      cleanup() { removeEventListener('keydown', key); removeEventListener('pointerdown', press); el.remove(); },
    };
  },
};
