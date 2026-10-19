import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
// Same seeded notes for everyone. Lanes: D F J K (or 1 2 3 4). Perfect = 10, good = 5, stray press = -2.
const KEYS = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }, SPEED = 260, HY = 250, LW = 60, COLS = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db'];
export default {
  name: 'Rhythm Rush', desc: 'Hit the notes as they cross the line! Keys D F J K (or 1 2 3 4). Highest score wins.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 40, lower: false }), notes = []; let t = 2;
    while (t < 17) { notes.push({ t, l: ctx.rng() * 4 | 0, hit: 0 }); t += .35 + ctx.rng() * .4; }
    const endT = notes[notes.length - 1].t + 1; let time = 0, score = 0, done = false, fb = '', fl = [0, 0, 0, 0];
    const el = document.createElement('div'); el.className = 'mg';
    el.innerHTML = `<h3 id="s"></h3><canvas width="${LW * 4}" height="300" style="background:#0006;border-radius:6px"></canvas>`; ctx.hud.append(el);
    const cv = el.querySelector('canvas'), c = cv.getContext('2d'), s = el.querySelector('#s');
    const key = e => {
      const l = KEYS[e.code]; if (l == null || e.repeat || done) return; fl[l] = .12;
      const n = notes.find(k => !k.hit && k.l === l && Math.abs(k.t - time) < .18);
      if (n) { n.hit = 1; const d = Math.abs(n.t - time); score += d < .07 ? 10 : 5; fb = d < .07 ? 'PERFECT!' : 'Good'; sfx('click'); }
      else { score -= 2; fb = 'Miss'; sfx('lose'); }
    };
    addEventListener('keydown', key);
    return {
      update(dt) {
        sb.tick(dt); time += dt; fl = fl.map(v => Math.max(0, v - dt));
        if (!done && time >= endT) { done = true; sb.report(score); }
        c.clearRect(0, 0, cv.width, cv.height);
        for (let l = 0; l < 4; l++) { c.fillStyle = fl[l] > 0 ? '#fff4' : '#fff1'; c.fillRect(l * LW + 2, 0, LW - 4, 300); c.fillStyle = '#fff'; c.font = '14px sans-serif'; c.fillText('DFJK'[l], l * LW + 24, 290); }
        c.fillStyle = '#fff'; c.fillRect(0, HY, cv.width, 3);
        for (const n of notes) { const y = HY - (n.t - time) * SPEED; if (n.hit || y < -20 || y > 300) continue; c.fillStyle = COLS[n.l]; c.fillRect(n.l * LW + 6, y - 9, LW - 12, 18); }
        s.textContent = done ? `Final: ${score} - waiting for others...` : `Score: ${score}   ${fb}`;
      },
      onMessage: sb.onMessage,
      cleanup() { removeEventListener('keydown', key); el.remove(); },
    };
  },
};
