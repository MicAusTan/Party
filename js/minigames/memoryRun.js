import { sfx } from '../sfx.js';
// Simon-style: everyone gets the same seeded sequence and plays at their own pace.
// A wrong press knocks you out. Most rounds wins; ties go to whoever survived longer.
const COLS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'];
export default {
  name: 'Memory Run', desc: 'Watch the pattern, repeat it with keys 1-4 or clicks. One mistake and you\'re out.',
  create(ctx) {
    const rng = ctx.rng, seq = Array.from({ length: 40 }, () => rng() * 4 | 0);
    let prog = {}; for (const id in ctx.players) prog[id] = { r: 0, out: false, t: 0 };
    let round = 1, step = 0, phase = 'show', t = .8, lit = -1, pr = -1, prT = 0, time = 0, acc = 0, over = false;
    const el = document.createElement('div'); el.className = 'mg'; ctx.hud.append(el);

    const apply = (id, r, out) => { const p = prog[id]; if (!p || p.out) return; p.r = Math.max(p.r, r | 0); if (out) { p.out = true; p.t = time; } };
    const report = (r, out) => ctx.isHost ? apply(ctx.me, r, out) : ctx.send({ r, out });
    const press = i => {
      if (phase !== 'input' || over) return;
      pr = i; prT = .15; sfx(i === seq[step] ? 'click' : 'lose');
      if (i !== seq[step]) { phase = 'out'; report(round - 1, true); return; }
      if (++step === round) { report(round, false); round++; phase = 'show'; step = 0; lit = -1; t = .8; }
    };
    const key = e => { const i = '1234'.indexOf(e.key); if (i >= 0 && !e.repeat) press(i); };
    el.onpointerdown = e => { const i = e.target.dataset.i; if (i != null) press(+i); };
    addEventListener('keydown', key);

    const status = () => phase === 'show' ? 'Watch...' : phase === 'input' ? `Your turn (${step}/${round})` : 'Out! Waiting for others...';
    const render = () => {
      el.innerHTML = `<h3>${status()}</h3><div class="tiles">${COLS.map((c, i) =>
        `<div class="tile${lit === i || pr === i ? ' on' : ''}" data-i="${i}" style="background:${c}">${i + 1}</div>`).join('')}</div>` +
        Object.values(ctx.players).map(p => { const q = prog[p.id] || { r: 0 };
          return `<div class="bar"><span style="width:${Math.min(100, q.r * 2.5)}%;background:${p.color}"></span><b>${ctx.esc(p.name)} - ${q.r}${q.out ? ' (out)' : ''}</b></div>`; }).join('');
    };
    return {
      update(dt) {
        time += dt; if (prT > 0 && (prT -= dt) <= 0) pr = -1;
        if (phase === 'show' && (t -= dt) <= 0) {
          if (lit >= 0) { lit = -1; t = .25; }
          else if (step < round) { lit = seq[step++]; sfx('tick'); t = .55; }
          else { phase = 'input'; step = 0; }
        }
        render();
        if (!ctx.isHost || over) return;
        if ((acc += dt) > .2) { acc = 0; ctx.send({ p: prog }); }
        const ids = Object.keys(prog);
        if (time > 90 || ids.every(id => prog[id].out) || ids.some(id => prog[id].r >= 40)) {
          over = true; ctx.send({ p: prog });
          const surv = id => prog[id].out ? prog[id].t : Infinity;
          ctx.finish(ids.sort((a, b) => prog[b].r - prog[a].r || surv(b) - surv(a)));
        }
      },
      onMessage(m, from) {
        if (ctx.isHost) { if (m.r != null) apply(from, m.r, !!m.out); }
        else if (m.p) prog = m.p;
      },
      cleanup() { removeEventListener('keydown', key); el.remove(); },
    };
  },
};
