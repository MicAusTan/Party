import { sfx } from '../sfx.js';
// CO-OP: a beat only counts if EVERY player hits it. Reward tier by number of full-team beats.
const T0 = 1.5, P = 1.1, N = 24;
export default {
  name: 'Sync Pulse', desc: 'CO-OP! Everyone press SPACE (or click) as the ring shrinks onto the circle. A beat only counts if ALL players hit it!',
  create(ctx) {
    const ids = Object.keys(ctx.players), host = ctx.isHost, hits = Array.from({ length: N }, () => new Set()), mine = new Set();
    let time = 0, fb = '', over = false, acc = 0, ok = '', lastB = -1;
    const el = document.createElement('div'); el.className = 'mg'; el.innerHTML = '<h3 id="s"></h3><canvas width="300" height="170"></canvas><div id="r"></div>'; ctx.hud.append(el);
    const cv = el.querySelector('canvas'), c = cv.getContext('2d'), s = el.querySelector('#s'), r = el.querySelector('#r');
    const press = () => {
      const k = Math.round((time - T0) / P);
      if (k >= 0 && k < N && !mine.has(k) && Math.abs(time - (T0 + k * P)) < .28) { mine.add(k); host ? hits[k].add(ctx.me) : ctx.send({ b: k }); fb = 'Hit!'; sfx('click'); }
      else { fb = 'Miss'; sfx('lose'); }
    };
    const key = e => { if (e.code === 'Space' && !e.repeat) press(); };
    addEventListener('keydown', key); addEventListener('pointerdown', press);
    const evalOk = () => { let o = ''; for (let k = 0; k < N && T0 + k * P + .5 < time; k++) o += hits[k].size === ids.length ? '1' : '0'; return o; };
    return {
      update(dt) {
        time += dt;
        if (host && !over) {
          ok = evalOk(); if ((acc += dt) > .3) { acc = 0; ctx.send({ ok }); }
          if (time > T0 + N * P + .8) { over = true; const n = [...ok].filter(x => x === '1').length; const rk = n >= 20 ? 0 : n >= 14 ? 1 : n >= 8 ? 2 : 3; ctx.send({ ok }); ctx.finish([...ids], ids.map(() => rk)); }
        }
        const u = (time - T0) / P, x = ((u % 1) + 1) % 1, bk = Math.floor(u); if (bk !== lastB && bk >= 0 && bk < N) { lastB = bk; sfx('tick'); }
        c.clearRect(0, 0, 300, 170); c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(150, 85, 36, 0, 6.3); c.stroke();
        c.strokeStyle = '#ffd93d'; c.beginPath(); c.arc(150, 85, 36 + (1 - x) * 50, 0, 6.3); c.stroke();
        s.textContent = `Beats where everyone hit: ${[...ok].filter(v => v === '1').length}   ${fb}`;
        r.innerHTML = Array.from({ length: N }, (_, k) => `<span style="display:inline-block;width:10px;height:10px;margin:1px;border-radius:2px;background:${ok[k] === '1' ? '#2ecc71' : ok[k] === '0' ? '#e74c3c' : '#fff4'}"></span>`).join('');
      },
      onMessage(m, from) { if (host) { if (m.b >= 0 && m.b < N && ids.includes(from)) hits[m.b | 0].add(from); } else if (m.ok != null) ok = m.ok; },
      cleanup() { removeEventListener('keydown', key); removeEventListener('pointerdown', press); el.remove(); },
    };
  },
};
