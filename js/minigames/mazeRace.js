import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
// Same seeded maze for everyone; WASD/arrows to reach the bottom-right. Fastest time wins.
const N = 12, C = 32, DIRS = { KeyW: ['n', -N], ArrowUp: ['n', -N], KeyS: ['s', N], ArrowDown: ['s', N], KeyD: ['e', 1], ArrowRight: ['e', 1], KeyA: ['w', -1], ArrowLeft: ['w', -1] };
export default {
  name: 'Maze Race', desc: 'Reach the green square first! WASD / arrows to move through the maze. Everyone has the same maze.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 75 }), g = Array.from({ length: N * N }, () => ({ n: 1, e: 1, s: 1, w: 1, v: 0 }));
    const stack = [0]; g[0].v = 1;
    while (stack.length) {
      const c = stack[stack.length - 1], x = c % N, y = c / N | 0, nb = [];
      if (y > 0 && !g[c - N].v) nb.push([c - N, 'n', 's']); if (y < N - 1 && !g[c + N].v) nb.push([c + N, 's', 'n']);
      if (x < N - 1 && !g[c + 1].v) nb.push([c + 1, 'e', 'w']); if (x > 0 && !g[c - 1].v) nb.push([c - 1, 'w', 'e']);
      if (!nb.length) { stack.pop(); continue; }
      const [d, a, b] = nb[ctx.rng() * nb.length | 0]; g[c][a] = 0; g[d][b] = 0; g[d].v = 1; stack.push(d);
    }
    let pos = 0, time = 0, done = false;
    const el = document.createElement('div'); el.className = 'mg';
    el.innerHTML = `<h3 id="t"></h3><canvas width="${N * C + 4}" height="${N * C + 4}" style="background:#fff3;border-radius:6px"></canvas>`;
    ctx.hud.append(el); const cv = el.querySelector('canvas'), c2 = cv.getContext('2d'), tl = el.querySelector('#t');
    const key = e => {
      const d = DIRS[e.code]; if (!d || done) return; e.preventDefault();
      if (!g[pos][d[0]]) { pos += d[1]; sfx('click'); if (pos === N * N - 1) { done = true; sb.report(Math.round(time * 1000)); } }
    };
    addEventListener('keydown', key);
    return {
      update(dt) {
        if (!done) time += dt; sb.tick(dt);
        c2.clearRect(0, 0, cv.width, cv.height); c2.fillStyle = '#2ecc71'; c2.fillRect(2 + (N - 1) * C + 4, 2 + (N - 1) * C + 4, C - 8, C - 8);
        c2.strokeStyle = '#fff'; c2.lineWidth = 2; c2.beginPath();
        g.forEach((k, i) => { const x = 2 + i % N * C, y = 2 + (i / N | 0) * C;
          if (k.n) { c2.moveTo(x, y); c2.lineTo(x + C, y); } if (k.w) { c2.moveTo(x, y); c2.lineTo(x, y + C); }
          if (i % N === N - 1 && k.e) { c2.moveTo(x + C, y); c2.lineTo(x + C, y + C); } if ((i / N | 0) === N - 1 && k.s) { c2.moveTo(x, y + C); c2.lineTo(x + C, y + C); } });
        c2.stroke(); c2.fillStyle = ctx.players[ctx.me]?.color || '#f1c40f';
        c2.beginPath(); c2.arc(2 + pos % N * C + C / 2, 2 + (pos / N | 0) * C + C / 2, C / 3, 0, 6.3); c2.fill();
        tl.textContent = done ? `Done in ${time.toFixed(1)}s - waiting for others...` : time.toFixed(1) + 's';
      },
      onMessage: sb.onMessage,
      cleanup() { removeEventListener('keydown', key); el.remove(); },
    };
  },
};
