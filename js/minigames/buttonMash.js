import { sfx } from '../sfx.js';
export default {
  name: 'Button Mash', desc: 'Mash SPACE (or click) as fast as you can!',
  create(ctx) {
    const counts = {}; for (const id in ctx.players) counts[id] = 0;
    let t = 8, acc = 0, over = false;
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);
    const press = () => {
      if (over) return;
      sfx('click');
      if (ctx.isHost) counts[ctx.me]++; else ctx.send({ press: 1 });
    };
    const key = e => { if (e.code === 'Space' && !e.repeat) press(); };
    addEventListener('keydown', key); addEventListener('pointerdown', press);
    const render = () => {
      el.innerHTML = `<h2>${Math.max(0, Math.ceil(t))}</h2><div>MASH SPACE / TAP!</div>` +
        Object.values(ctx.players).map(p => `<div class="bar"><span style="width:${Math.min(100, (counts[p.id] || 0) * 2)}%;background:${p.color}"></span><b>${ctx.esc(p.name)}</b></div>`).join('');
    };
    return {
      update(dt) {
        t -= dt; render();
        if (!ctx.isHost || over) return;
        acc += dt; if (acc > .1) { acc = 0; ctx.send({ c: counts }); }
        if (t <= 0) { over = true; ctx.send({ c: counts }); ctx.finish(Object.keys(counts).sort((a, b) => counts[b] - counts[a])); }
      },
      onMessage(m, from) {
        if (ctx.isHost) { if (m.press && !over && from in counts) counts[from]++; }
        else if (m.c) Object.assign(counts, m.c);
      },
      cleanup() { removeEventListener('keydown', key); removeEventListener('pointerdown', press); el.remove(); },
    };
  },
};
