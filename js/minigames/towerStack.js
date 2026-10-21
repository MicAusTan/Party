import { sfx } from '../sfx.js';
// CO-OP: everyone shares one tower and takes turns dropping the swinging block. Reward tier by height.
const R = 140, BW = 120, LH = 22;
export default {
  name: 'Tower Stack', desc: 'CO-OP! Take turns dropping the swinging block (SPACE / click) onto the tower. Build high together - everyone shares the reward!',
  create(ctx) {
    const ids = Object.keys(ctx.players), host = ctx.isHost;
    let layers = [{ x: 0, w: BW }], ph = 0, turn = 0, pos = 0, time = 0, acc = 0, over = false, msg = '';
    const el = document.createElement('div'); el.className = 'mg'; el.innerHTML = '<h3 id="s"></h3><canvas width="360" height="320" style="background:#0005;border-radius:6px"></canvas>'; ctx.hud.append(el);
    const cv = el.querySelector('canvas'), c = cv.getContext('2d'), s = el.querySelector('#s'), whose = () => ids[turn % ids.length];
    const end = () => {
      over = true; const h = layers.length - 1, rk = h >= 12 ? 0 : h >= 7 ? 1 : h >= 3 ? 2 : 3; ctx.send({ L: layers, t: turn, x: pos, end: 1 });
      ctx.finish([...ids], ids.map(() => rk));
    };
    const drop = () => {
      const top = layers[layers.length - 1], dx = pos - top.x, ov = top.w - Math.abs(dx);
      if (Math.abs(dx) < 6) { layers.push({ x: top.x, w: top.w }); msg = 'PERFECT!'; sfx('star'); }
      else if (ov < 8) { msg = 'Missed!'; sfx('lose'); return end(); }
      else { layers.push({ x: top.x + dx / 2, w: ov }); msg = 'Nice'; sfx('click'); }
      turn++; if (layers.length > 20) end();
      ctx.send({ L: layers, t: turn, x: pos });
    };
    const press = () => { if (over || whose() !== ctx.me) return; host ? drop() : ctx.send({ d: 1 }); };
    const key = e => { if (e.code === 'Space' && !e.repeat) press(); };
    addEventListener('keydown', key); addEventListener('pointerdown', press);
    return {
      update(dt) {
        time += dt;
        if (host && !over && ctx.players[whose()]?.bot && (ctx._bt = (ctx._bt || 0) + dt) > 1.3) { ctx._bt = 0; drop(); }
        if (host && !over) { ph += dt * (1.5 + .1 * (layers.length - 1)); pos = Math.sin(ph) * R; if ((acc += dt) > .05) { acc = 0; ctx.send({ L: layers, t: turn, x: +pos.toFixed(1) }); } if (time > 80) end(); }
        const sc = Math.max(0, layers.length - 10) * LH; c.clearRect(0, 0, 360, 320);
        layers.forEach((l, i) => { c.fillStyle = `hsl(${i * 28 % 360} 70% 55%)`; c.fillRect(180 + l.x - l.w / 2, 300 - (i + 1) * LH + sc, l.w, LH - 2); });
        const top = layers[layers.length - 1]; c.fillStyle = '#fff'; c.fillRect(180 + pos - top.w / 2, 300 - (layers.length + 1) * LH + sc - 14, top.w, LH - 2);
        const w = whose(); s.textContent = `Height ${layers.length - 1}  |  ${w === ctx.me ? 'YOUR TURN - press!' : ctx.players[w]?.name + "'s turn"}  ${msg}`;
      },
      onMessage(m, from) { if (host) { if (m.d && from === whose() && !over) drop(); } else if (m.L) { layers = m.L; turn = m.t; pos = m.x; } },
      cleanup() { removeEventListener('keydown', key); removeEventListener('pointerdown', press); el.remove(); },
    };
  },
};
