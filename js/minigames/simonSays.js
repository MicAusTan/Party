import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
const AR = ['⬅', '⬆', '➡', '⬇'], KEYS = { ArrowLeft: 0, KeyA: 0, ArrowUp: 1, KeyW: 1, ArrowRight: 2, KeyD: 2, ArrowDown: 3, KeyS: 3 }, LEN = 1.6;
export default {
  name: 'Simon Says', desc: 'Press the arrow ONLY when Simon says! If the command has no "Simon says", don\'t touch anything. 14 commands.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 35, lower: false }), cmds = Array.from({ length: 14 }, () => ({ says: ctx.rng() < .65, k: ctx.rng() * 4 | 0 }));
    let i = 0, t = 0, resolved = false, score = 0, fb = '', done = false;
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const key = e => {
      const k = KEYS[e.code]; if (k == null || done || resolved) return; e.preventDefault(); resolved = true; const c = cmds[i];
      if (c.says && k === c.k) { score++; fb = '✓'; sfx('click'); } else { score -= c.says ? 1 : 2; fb = c.says ? '✗ wrong arrow' : '✗ Simon didn\'t say!'; sfx('lose'); }
    };
    addEventListener('keydown', key);
    return {
      update(dt) {
        sb.tick(dt); if (!done && (t += dt) >= LEN) {
          if (!resolved) { const c = cmds[i]; if (!c.says) { score++; fb = '✓ good restraint'; } else { score--; fb = '✗ too slow'; } }
          i++; t = 0; resolved = false; if (i >= cmds.length) { done = true; sb.report(score); }
        }
        const c = cmds[Math.min(i, cmds.length - 1)];
        el.innerHTML = done ? `<h3>Final: ${score} - waiting for others...</h3>` : `<h2>${c.says ? 'Simon says:' : 'Press:'} ${AR[c.k]}</h2><div>Score ${score}   ${fb}</div>`;
      },
      onMessage: sb.onMessage,
      cleanup() { removeEventListener('keydown', key); el.remove(); },
    };
  },
};
