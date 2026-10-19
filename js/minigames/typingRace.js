import { sfx } from '../sfx.js';
import { scoreboard } from './util.js';
const WORDS = 'party coin star dice board arena jump shoot cards lucky rocket pixel castle dragon candy turbo planet banana hammer magnet bounce wizard puzzle gadget zombie island volcano rabbit thunder cookie shadow'.split(' ');
export default {
  name: 'Typing Race', desc: 'Type each word exactly - it advances automatically. 10 words, fastest wins. Press Enter on a typo for a 2s penalty.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 70 }), list = Array.from({ length: 10 }, () => WORDS[ctx.rng() * WORDS.length | 0]);
    let i = 0, errs = 0, time = 0, done = false;
    const el = document.createElement('div'); el.className = 'mg';
    el.innerHTML = '<h3 id="s"></h3><h2 id="w"></h2><input id="a" autocomplete="off" style="font-size:22px;text-align:center;width:200px">'; ctx.hud.append(el);
    const s = el.querySelector('#s'), w = el.querySelector('#w'), inp = el.querySelector('#a'); setTimeout(() => inp.focus(), 50);
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && inp.value && inp.value !== list[i]) { errs++; sfx('lose'); inp.value = ''; } };
    inp.oninput = () => {
      if (done || inp.value.trim().toLowerCase() !== list[i]) return;
      inp.value = ''; i++; sfx('click');
      if (i >= list.length) { done = true; inp.disabled = true; sb.report(Math.round(time * 1000 + errs * 2000)); }
    };
    return {
      update(dt) {
        sb.tick(dt); if (!done) time += dt;
        w.textContent = done ? 'Done!' : list[i]; s.textContent = done ? `${(time + errs * 2).toFixed(1)}s - waiting for others...` : `${i}/${list.length}   ${time.toFixed(1)}s   Typos: ${errs}`;
        if (!done && document.activeElement !== inp) inp.focus();
      },
      onMessage: sb.onMessage,
      cleanup() { el.remove(); },
    };
  },
};
