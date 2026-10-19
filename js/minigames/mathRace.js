import { sfx } from '../sfx.js';
// Same seeded questions for everyone. First to GOAL correct answers wins. Wrong answer = short lockout.
const GOAL = 8;
export default {
  name: 'Math Race', desc: `Solve ${GOAL} sums before anyone else! Type the answer and press Enter.`,
  create(ctx) {
    const ids = Object.keys(ctx.players), host = ctx.isHost, r = ctx.rng;
    const qs = Array.from({ length: 30 }, () => {
      const op = ['+', '-', '×'][r() * 3 | 0], big = op === '×' ? 11 : 49; let a = 2 + r() * big | 0, b = 2 + r() * big | 0;
      if (op === '-' && b > a) [a, b] = [b, a];
      return { t: `${a} ${op} ${b}`, a: op === '+' ? a + b : op === '-' ? a - b : a * b };
    });
    const prog = {}, reach = {}; ids.forEach(id => prog[id] = 0);
    let n = 0, lock = 0, time = 0, acc = 0, over = false;
    const el = document.createElement('div'); el.className = 'mg';
    el.innerHTML = '<h2 id="q"></h2><input id="a" inputmode="numeric" autocomplete="off" style="width:120px;text-align:center;font-size:22px"><div id="bars"></div>';
    ctx.hud.append(el); const q = el.querySelector('#q'), inp = el.querySelector('#a'), bars = el.querySelector('#bars');
    setTimeout(() => inp.focus(), 50);
    const setP = (id, v) => { prog[id] = v; if (v >= GOAL && !(id in reach)) reach[id] = time; };
    inp.onkeydown = e => {
      e.stopPropagation(); if (e.key !== 'Enter' || lock > 0 || over || n >= GOAL) return;
      if (+inp.value.trim() === qs[n].a && inp.value.trim() !== '') { n++; sfx('click'); host ? setP(ctx.me, n) : ctx.send({ p: n }); }
      else { lock = .8; sfx('lose'); }
      inp.value = '';
    };
    const finish = () => {
      over = true; ctx.send({ pr: prog });
      ctx.finish([...ids].sort((a, b) => prog[b] - prog[a] || (reach[a] ?? 1e9) - (reach[b] ?? 1e9)));
    };
    return {
      update(dt) {
        time += dt; lock -= dt; prog[ctx.me] = Math.max(prog[ctx.me], n);
        q.textContent = n >= GOAL ? 'Done!' : lock > 0 ? '✗ wait...' : qs[n].t + ' = ?';
        inp.disabled = n >= GOAL; if (!inp.disabled && lock <= 0 && document.activeElement !== inp) inp.focus();
        bars.innerHTML = ids.map(id => `<div class="bar"><span style="width:${prog[id] / GOAL * 100}%;background:${ctx.players[id].color}"></span><b>${ctx.esc(ctx.players[id].name)} ${prog[id]}/${GOAL}</b></div>`).join('');
        if (!host || over) return;
        if ((acc += dt) > .2) { acc = 0; ctx.send({ pr: prog }); }
        if (ids.some(id => prog[id] >= GOAL) || time > 75) finish();
      },
      onMessage(m, from) {
        if (host) { if (m.p != null && from in prog) setP(from, Math.min(GOAL, m.p | 0)); }
        else if (m.pr) for (const id in m.pr) if (id !== ctx.me) prog[id] = m.pr[id];
      },
      cleanup() { el.remove(); },
    };
  },
};
