import { OPTS, DEFAULT_LOOK } from './look.js';
import { EMOTES } from './emotes.js';
import { owns, price, buy, gems, onGems, getSet, setSet } from './wallet.js';
import { createPreview } from './preview.js';
// Shop: items on the left, live preview on the right. Clicking an item only changes the PREVIEW (try anything on, even unowned);
// Equip / Buy change what you really wear. Adding a category: add it to OPTS (look.js) + prices (wallet.js); emotes have their own tab.
const PODIUM = ['ped', 'fx', 'vpose', 'crest', 'spot', 'stage'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function initShop({ cur, apply, toast, name }) {
  const el = document.createElement('div'); el.id = 'shop'; el.className = 'box'; el.hidden = true;
  el.innerHTML = '<div class="sL"><div class="top"><b>🛍 Shop</b><b class="gemchip" id="sg"></b><button class="ghost" data-x="1">✕ Close</button></div><div class="tabs" id="stabs"></div><div class="filt" id="sfilt"></div><div class="grid" id="sgrid"></div></div>' +
    '<div class="sR"><div class="pvwrap"><canvas id="pvc"></canvas><div id="pvban"></div><div class="pvbtns" id="pvbtns"></div></div><div class="worn" id="worn"></div><div class="acts" id="acts"></div></div>';
  document.body.append(el);
  const $ = id => el.querySelector('#' + id);
  let pre = null, cat = 'hat', filt = 'all', pv = {}, view = 'auto', auto = true, walk = false;
  const isPod = () => view === 'podium' || (view === 'auto' && PODIUM.includes(cat));
  const diffs = () => Object.keys(OPTS).filter(c => pv[c] !== cur()[c]);
  const miss = () => Object.keys(OPTS).filter(c => !owns(c, pv[c]));
  const lbl = (c, v) => c === 'emote' ? (EMOTES[v]?.ch + ' ' + EMOTES[v]?.n) : (OPTS[c].vals[v] ?? v);

  function pushPreview() { if (!pre) return; pre.setAuto(auto); pre.update(pv, name(), isPod()); pre.walk(walk); }
  function renderTabs() {
    const t = Object.entries(OPTS).map(([k, o]) => [k, o.label, Object.keys(o.vals).filter(v => owns(k, v)).length + '/' + Object.keys(o.vals).length]);
    t.push(['emote', '😀 Emotes', EMOTES.filter((_, i) => owns('emote', i)).length + '/' + EMOTES.length]);
    $('stabs').innerHTML = t.map(([k, n, c]) => `<button class="ghost${k === cat ? ' on' : ''}" data-c="${k}">${n} <small>${c}</small></button>`).join('');
    $('sfilt').innerHTML = [['all', 'All'], ['owned', 'Owned'], ['locked', 'Locked']].map(([k, n]) => `<button class="ghost${k === filt ? ' on' : ''}" data-f="${k}">${n}</button>`).join('') +
      (cat === 'emote' ? `<small>On your wheel: ${getSet().length}/16 (hold G in game)</small>` : '<small>Click = try on in the preview</small>');
  }
  function renderGrid() {
    const emo = cat === 'emote', set = getSet(), real = cur();
    let list = emo ? EMOTES.map((e, i) => [i, e.ch + ' ' + e.n]) : Object.entries(OPTS[cat].vals);
    list = list.filter(([v]) => filt === 'all' || (filt === 'owned') === owns(cat, v));
    if (filt === 'locked') list.sort((a, b) => price(cat, a[0]) - price(cat, b[0]));
    $('sgrid').innerHTML = list.map(([v, nm]) => {
      const own = owns(cat, v), p = price(cat, v), sel = !emo && pv[cat] === v, worn = !emo && real[cat] === v, onW = emo && set.includes(v);
      const tag = emo ? (onW ? '✓ On wheel' : own ? 'Owned' : '🔒 💎' + p) : worn ? '✓ Worn' : own ? 'Owned' : '🔒 💎' + p;
      const buyB = `<button data-a="buy" data-v="${v}" ${gems() < p ? 'disabled' : ''}>Buy 💎${p}</button>`;
      const acts = emo ? (own ? `<button data-a="${onW ? 'rem' : 'add'}" data-v="${v}">${onW ? 'Remove' : 'Add'}</button>` : buyB) : own ? (worn ? '' : `<button data-a="eq" data-v="${v}">Equip</button>`) : buyB;
      return `<div class="it${sel ? ' sel' : ''}${own ? '' : ' lock'}" data-v="${v}"><b>${esc(nm)}</b><small>${tag}</small><span>${acts}</span></div>`;
    }).join('') || '<small>Nothing here.</small>';
  }
  function renderWorn() {
    const real = cur();
    $('worn').innerHTML = '<div class="lbl">Wearing in preview (click to jump to it, ✕ to remove, • = differs from what you really wear)</div><div class="chips">' +
      Object.entries(OPTS).map(([c, o]) => {
        const v = pv[c] ?? DEFAULT_LOOK[c], def = v === DEFAULT_LOOK[c], own = owns(c, v), chg = v !== real[c];
        return `<div class="chip${def ? ' dim' : ''}${own ? '' : ' lock'}${c === cat ? ' cur' : ''}" data-j="${c}"><i>${o.label}</i> ${esc(lbl(c, v))}${own ? '' : ' 🔒'}${chg ? ' •' : ''}${def ? '' : `<u data-r="${c}">✕</u>`}</div>`;
      }).join('') + '</div>';
  }
  function renderActs() {
    const m = miss(), cost = m.reduce((s, c) => s + price(c, pv[c]), 0), eqn = diffs().filter(c => owns(c, pv[c])).length;
    $('acts').innerHTML = '<button class="ghost" data-k="reset">↺ Reset</button><button class="ghost" data-k="blank">⬜ Blank</button><button class="ghost" data-k="unall">🧹 Unequip all</button>' +
      `<button data-k="equip" ${eqn ? '' : 'disabled'}>✔ Equip owned (${eqn})</button>` + (m.length ? `<button data-k="buyall" ${gems() < cost ? 'disabled' : ''}>🛒 Buy ${m.length} & equip 💎${cost}</button>` : '');
  }
  function renderPv() {
    const pod = isPod();
    $('pvbtns').innerHTML = `<button class="ghost${auto ? ' on' : ''}" data-p="spin">🔄 Spin</button><button class="ghost${walk && !pod ? ' on' : ''}" data-p="walk" ${pod ? 'disabled' : ''}>🚶 Walk</button><button class="ghost" data-p="view">View: ${view === 'auto' ? 'Auto' : view === 'char' ? 'Character' : 'Podium'}</button>`;
    const cr = (OPTS.crest.vals[pv.crest] || OPTS.crest.vals.trophy).split(' ')[0], ti = pv.title && pv.title !== 'none' ? OPTS.title.vals[pv.title] : '';
    $('pvban').innerHTML = pod ? `<b>${cr} ${esc(name())}</b>${ti ? `<small>${esc(ti)}</small>` : ''}` : '';
    $('sg').textContent = '💎 ' + gems();
  }
  const renderAll = () => { if (el.hidden) return; renderTabs(); renderGrid(); renderWorn(); renderActs(); renderPv(); };
  const refresh = () => { pushPreview(); renderAll(); };

  function itemAct(a, v) {
    const emo = cat === 'emote'; if (emo) v = +v;
    if (a === 'buy') {
      if (!buy(cat, v)) return toast('Not enough gems');
      toast('Unlocked!');
      if (emo) { const s = getSet(); if (s.length < 16) setSet([...s, v]); } else { pv[cat] = v; apply({ [cat]: v }); }
    } else if (a === 'eq') { pv[cat] = v; apply({ [cat]: v }); }
    else if (a === 'add') { const s = getSet(); if (s.length >= 16) return toast('Wheel is full (16)'); setSet([...s, v]); }
    else if (a === 'rem') setSet(getSet().filter(x => x !== v));
    refresh();
  }
  function act(k) {
    if (k === 'reset') pv = { ...cur() };
    else if (k === 'blank') { pv = { ...cur() }; for (const c in OPTS) pv[c] = DEFAULT_LOOK[c]; }
    else if (k === 'unall') { const d = {}; for (const c in OPTS) d[c] = DEFAULT_LOOK[c]; apply(d); pv = { ...cur(), ...d }; toast('Everything unequipped'); }
    else if (k === 'equip') { const p = {}; for (const c of diffs()) if (owns(c, pv[c])) p[c] = pv[c]; apply(p); toast('Equipped!'); }
    else if (k === 'buyall') {
      const m = miss(), cost = m.reduce((s, c) => s + price(c, pv[c]), 0); if (gems() < cost) return toast('Not enough gems');
      for (const c of m) buy(c, pv[c]); const p = {}; for (const c of diffs()) p[c] = pv[c]; apply(p); toast('Bought & equipped!');
    }
    refresh();
  }
  el.addEventListener('click', e => {
    const t = e.target, q = s => t.closest?.(s);
    if (q('[data-x]')) return close();
    const r = q('[data-r]'); if (r) { pv[r.dataset.r] = DEFAULT_LOOK[r.dataset.r]; return refresh(); }
    const j = q('[data-j]'); if (j) { cat = j.dataset.j; return refresh(); }
    const tab = q('[data-c]'); if (tab) { cat = tab.dataset.c; return refresh(); }
    const f = q('[data-f]'); if (f) { filt = f.dataset.f; return renderAll(); }
    const k = q('[data-k]'); if (k) return act(k.dataset.k);
    const p = q('[data-p]'); if (p && !p.disabled) {
      if (p.dataset.p === 'spin') auto = !auto; else if (p.dataset.p === 'walk') walk = !walk; else view = view === 'auto' ? 'char' : view === 'char' ? 'podium' : 'auto';
      return refresh();
    }
    const ab = q('[data-a]'); if (ab) return itemAct(ab.dataset.a, ab.dataset.v);
    const it = q('.it'); if (it) { if (cat === 'emote') pre?.emote(+it.dataset.v); else { pv[cat] = it.dataset.v; refresh(); } }
  });
  const onKey = e => { if (e.code === 'Escape') close(); };
  function close() { el.hidden = true; pre?.stop(); removeEventListener('keydown', onKey); }
  onGems(() => renderAll());
  return {
    open() {
      pv = { ...cur() }; el.hidden = false; if (!pre) pre = createPreview($('pvc'));
      pushPreview(); renderAll(); pre.start(); addEventListener('keydown', onKey);
    },
  };
}
