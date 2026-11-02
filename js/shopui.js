import { OPTS, DEFAULT_LOOK, COLORS, ACCENTS } from './look.js';
import { EMOTES, emoteTag } from './emotes.js';
import { owns, price, buy, gems, onGems, getSet, setSet, getSets, setSets } from './wallet.js';
import { createPreview } from './preview.js';
// Customize + shop. Left: items. Right: live preview. Clicking an item only changes the PREVIEW (try on anything, owned or not);
// Equip / Buy (selected item) or the bottom buttons change what you really wear. Add a category: OPTS (look.js) + prices (wallet.js) + GROUPS below.
const PODIUM = ['ped', 'pshape', 'fx', 'vpose', 'crest', 'banner', 'spot', 'stage'];
const GROUPS = [['Character', ['hat', 'body', 'head', 'hands', 'coat', 'face', 'back', 'pattern', 'trail', 'pet']], ['Podium & profile', ['ped', 'pshape', 'fx', 'vpose', 'crest', 'banner', 'spot', 'stage', 'title', 'tagframe', 'dice']], ['Other', ['color', 'sets', 'emote']]];
const I = {
  gem: '<svg class="ic" viewBox="0 0 12 12"><path d="M2.2 4 4 1.2h4L9.8 4 6 10.8z"/></svg>',
  lock: '<svg class="ic" viewBox="0 0 12 12"><path d="M3 5.2V4a3 3 0 0 1 6 0v1.2h.8v5.6H2.2V5.2zm1.4 0h3.2V4a1.6 1.6 0 0 0-3.2 0z"/></svg>',
  check: '<svg class="ic" viewBox="0 0 12 12"><path d="M2 6.4 4.8 9 10 3.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tier = p => p <= 0 ? 0 : p < 50 ? 1 : p < 100 ? 2 : p < 150 ? 3 : 4;
export function initShop({ cur, apply, toast, name }) {
  const el = document.createElement('div'); el.id = 'shop'; el.className = 'box'; el.hidden = true;
  el.innerHTML = '<div class="sL"><div class="top"><h2>Customize</h2><span class="gembal" id="sg"></span><button class="ghost" data-x="1">Close</button></div><div class="tabs" id="stabs"></div><div class="filt" id="sfilt"></div><div class="grid" id="sgrid"></div></div>' +
    '<div class="sR"><div class="pvwrap"><canvas id="pvc"></canvas><div class="pvbtns" id="pvbtns"></div></div><div class="sel" id="sel"></div><div class="worn" id="worn"></div><div class="acts" id="acts"></div></div>';
  document.body.append(el);
  const $ = id => el.querySelector('#' + id);
  let pre = null, cat = 'hat', filt = 'all', pv = {}, view = 'auto', auto = true, walk = false, sel = null;
  const KEYS = () => [...Object.keys(OPTS), 'color', 'accent'];
  const isPod = () => view === 'podium' || (view === 'auto' && PODIUM.includes(cat));
  const diffs = () => KEYS().filter(c => pv[c] !== cur()[c]);
  const miss = () => Object.keys(OPTS).filter(c => c !== 'head' && c !== 'hands' && !owns(c, pv[c]));
  const lbl = (c, v) => c === 'emote' ? (EMOTES[v]?.ch + ' ' + EMOTES[v]?.n) : (OPTS[c].vals[v] ?? v);
  const tl = k => k === 'color' ? 'Colours' : k === 'sets' ? 'Saved sets' : k === 'emote' ? 'Emotes' : OPTS[k].label;
  const gem = n => `${I.gem}${n}`;
  const cnt = k => k === 'color' ? '' : k === 'sets' ? getSets().length + '/12' : k === 'emote' ? EMOTES.filter((_, i) => owns('emote', i)).length + '/' + EMOTES.length : Object.keys(OPTS[k].vals).filter(v => owns(k, v)).length + '/' + Object.keys(OPTS[k].vals).length;

  function pushPreview() { if (!pre) return; pre.setAuto(auto); pre.update(pv, name(), isPod(), cat === 'hands', cat === 'dice'); pre.walk(walk); }
  function renderTabs() {
    const grouped = new Set(GROUPS.flatMap(g => g[1])), extra = Object.keys(OPTS).filter(k => !grouped.has(k));
    $('stabs').innerHTML = GROUPS.map(([g, ks], gi) => `<div class="tg"><span class="tl">${g}</span>${(gi ? ks : [...ks, ...extra]).filter(k => k === 'color' || k === 'sets' || k === 'emote' || OPTS[k]).map(k => `<button class="tab${k === cat ? ' on' : ''}" data-c="${k}">${tl(k)}${cnt(k) ? ` <small>${cnt(k)}</small>` : ''}</button>`).join('')}</div>`).join('');
    $('sfilt').hidden = cat === 'color' || cat === 'sets';
    $('sfilt').innerHTML = [['all', 'All'], ['owned', 'Owned'], ['locked', 'Locked']].map(([k, n]) => `<button class="fb f-${k}${k === filt ? ' on' : ''}" data-f="${k}">${n}</button>`).join('') +
      `<small>${cat === 'emote' ? `On your wheel: ${getSet().length}/16 (hold G in game)` : cat === 'hands' ? 'The hand shape shown when you shove or grab in minigames' : cat === 'dice' ? 'The dice you roll on the board (the preview rolls them for you)' : cat === 'pet' ? 'Press P in game to pet your pet. Every pet reacts differently' : 'Click an item to try it on in the preview'}</small>`;
  }
  function renderGrid() {
    const real = cur();
    if (cat === 'color') {
      const sw = (k, list) => list.map(c => `<i class="sw${pv[k] === c ? ' me' : ''}" data-sw="${k}" data-val="${c}" style="background:${c}"></i>`).join('');
      $('sgrid').innerHTML = `<div class="colwrap"><div class="lbl">Body colour <small>(several players can share a colour)</small></div><div class="swatches">${sw('color', COLORS)}</div><div class="lbl">Accent colour <small>(hat and details)</small></div><div class="swatches">${sw('accent', ACCENTS)}</div></div>`;
      return;
    }
    if (cat === 'sets') {
      const sets = getSets();
      $('sgrid').innerHTML = `<div class="colwrap"><div class="setbar"><input id="setname" placeholder="Set name (optional)" maxlength="16"><button class="pri" data-sa="save">Save preview as new set</button></div><small>Saves the colours and every item you own in the preview (locked items are skipped). ${sets.length}/12 saved.</small>` +
        sets.map((s, i) => { const n = Object.keys(OPTS).filter(c => s.look[c] && s.look[c] !== DEFAULT_LOOK[c]).length; return `<div class="setrow"><div><b>${esc(s.n)}</b><small>${n} items</small></div><span><button data-sa="load" data-i="${i}">Preview</button><button class="pri2" data-sa="equip" data-i="${i}">Equip</button><button data-sa="ren" data-i="${i}">Rename</button><button data-sa="del" data-i="${i}">Delete</button></span></div>`; }).join('') + `</div>`;
      return;
    }
    const emo = cat === 'emote', set = getSet();
    let list = emo ? EMOTES.map((e, i) => [i, e.ch + ' ' + e.n + (emoteTag(e) ? ' · ' + emoteTag(e) : '')]) : Object.entries(OPTS[cat].vals);
    list = list.filter(([v]) => filt === 'all' || (filt === 'owned') === owns(cat, v));
    if (filt === 'locked') list.sort((a, b) => price(cat, a[0]) - price(cat, b[0]));
    $('sgrid').innerHTML = list.map(([v, nm]) => {
      const own = owns(cat, v), p = price(cat, v), s = sel && sel.c === cat && sel.v == v, inPv = !emo && pv[cat] === v, worn = !emo && real[cat] === v, onW = emo && set.includes(v);
      const needs = (cat === 'head' || cat === 'hands') && !own; const tag = needs ? `Needs ${OPTS.body.vals[v]} body` : emo ? (onW ? `${I.check} On wheel` : own ? 'Owned' : gem(p)) : worn ? `${I.check} Worn` : own ? 'Owned' : `${I.lock} ${gem(p)}`;
      return `<div class="it t${tier(own && !p ? 0 : p)}${s ? ' sel' : ''}${inPv ? ' inpv' : ''}${own ? '' : ' lock'}" data-v="${v}"><b>${esc(nm)}</b><span class="pill${own ? ' own' : ''}">${tag}</span></div>`;
    }).join('') || '<small>Nothing here.</small>';
  }
  function renderSel() {
    if (!sel) { $('sel').innerHTML = '<small>Select an item to see its details here.</small>'; return; }
    const { c, v } = sel, emo = c === 'emote', own = owns(c, v), p = price(c, v), set = getSet(), worn = !emo && cur()[c] === v, onW = emo && set.includes(+v);
    const btn = (!own && (c === 'head' || c === 'hands')) ? `<button class="pri" disabled>Own the ${OPTS.body.vals[v]} body first</button>` : own ? (emo ? `<button class="pri" data-k="primary">${onW ? 'Remove from wheel' : 'Add to wheel'}</button>` : `<button class="pri" data-k="primary" ${worn ? 'disabled' : ''}>${worn ? 'Currently worn' : 'Equip'}</button>`)
      : `<button class="pri" data-k="primary" ${gems() < p ? 'disabled' : ''}>Buy ${emo ? '' : '& equip '}for ${gem(p)}</button>`;
    $('sel').innerHTML = `<div><b>${esc(lbl(c, v))}</b><small>${tl(c)} · ${own ? 'owned' : gems() < p ? `${I.lock} need ${p - gems()} more` : 'locked'}</small></div>${btn}`;
  }
  function renderWorn() {
    const real = cur(), chip = (c, label, val, swatch, def, own, chg) => `<div class="chip${def ? ' dim' : ''}${own ? '' : ' lock'}${c === cat ? ' cur' : ''}" data-j="${c}"><i>${label}</i> ${swatch ? `<b class="dot" style="background:${val}"></b>` : esc(val)}${own ? '' : ' ' + I.lock}${chg ? '<em></em>' : ''}${def || swatch ? '' : `<u data-r="${c}">×</u>`}</div>`;
    $('worn').innerHTML = '<div class="lbl">Wearing in preview <small>(click to jump · × removes · dot = differs from what you really wear)</small></div><div class="chips">' +
      chip('color', 'Colour', pv.color, true, false, true, pv.color !== real.color) + chip('accent', 'Accent', pv.accent, true, false, true, pv.accent !== real.accent) +
      Object.entries(OPTS).map(([c, o]) => { const v = pv[c] ?? DEFAULT_LOOK[c]; return chip(c, o.label, lbl(c, v), false, v === DEFAULT_LOOK[c], owns(c, v), v !== real[c]); }).join('') + '</div>';
  }
  function renderActs() {
    const m = miss(), cost = m.reduce((s, c) => s + price(c, pv[c]), 0), eqn = diffs().filter(c => c === 'color' || c === 'accent' || owns(c, pv[c])).length;
    $('acts').innerHTML = `<button class="ghost" data-k="undo" title="Step back to your previous preview change (Ctrl+Z)" ${hi > 0 ? '' : 'disabled'}>Undo</button><button class="ghost" data-k="redo" title="Re-apply the change you just undid (Ctrl+Y)" ${hi < hist.length - 1 ? '' : 'disabled'}>Redo</button>` + '<button class="ghost" data-k="reset" title="Put the preview back to exactly what you are wearing right now">Reset</button><button class="ghost" data-k="blank" title="Clear the preview to the plain default look (your colours stay). Nothing you wear changes until you press Equip">Blank</button><button class="ghost" data-k="unall" title="Take off everything you are really wearing, right now">Unequip all</button><button class="ghost" data-k="rand" title="Fill the preview with a random mix of items you own">Random owned</button>' +
      `<button class="pri2" data-k="equip" title="Really wear every item in the preview that you own" ${eqn ? '' : 'disabled'}>Equip owned (${eqn})</button>` + (m.length ? `<button class="ghost" data-k="locked" title="Take the items you do not own out of the preview (does not touch what you wear)">Remove locked</button><button class="pri2" data-k="buyall" title="Buy every locked item in the preview and wear it all" ${gems() < cost ? 'disabled' : ''}>Buy all ${m.length} in preview ${gem(cost)}</button>` : '');
  }
  function renderPv() {
    const pod = isPod();
    $('pvbtns').innerHTML = `<button class="${auto ? 'on' : ''}" data-p="spin">Spin</button><button class="${walk && !pod ? 'on' : ''}" data-p="walk" ${pod ? 'disabled' : ''}>Walk</button><button data-p="view">View: ${view === 'auto' ? 'Auto' : view === 'char' ? 'Character' : 'Podium'}</button>`;
    $('sg').innerHTML = `${I.gem} <b>${gems()}</b>`;
  }
  const renderAll = () => { if (el.hidden) return; renderTabs(); renderGrid(); renderSel(); renderWorn(); renderActs(); renderPv(); };
  let hist = [], hi = -1;      // undo / redo of the preview
  const commit = () => { const j = JSON.stringify(pv); if (hist[hi] !== j) { hist = hist.slice(0, hi + 1); hist.push(j); hi = hist.length - 1; if (hist.length > 80) { hist.shift(); hi--; } } };
  const go = d => { const n = hi + d; if (n < 0 || n >= hist.length) return; hi = n; pv = JSON.parse(hist[hi]); pushPreview(); renderAll(); };
  const refresh = () => { commit(); pushPreview(); renderAll(); };

  function primary() {
    if (!sel) return; const { c, v } = sel, emo = c === 'emote', own = owns(c, v);
    if (!own) { if (!buy(c, v)) return toast('Not enough gems'); toast('Unlocked!'); }
    if (emo) { const s = getSet(), i = +v; if (s.includes(i)) setSet(s.filter(x => x !== i)); else if (s.length >= 16) return toast('Wheel is full (16)'); else setSet([...s, i]); }
    else { pv[c] = v; apply({ [c]: v }); }
    refresh();
  }
  function setAct(a, i) {
    const sets = getSets();
    if (a === 'save') {
      if (sets.length >= 12) return toast('Set list is full (12)');
      const l = { color: pv.color, accent: pv.accent }; for (const c in OPTS) l[c] = owns(c, pv[c]) ? pv[c] : DEFAULT_LOOK[c];
      setSets([...sets, { n: ($('setname')?.value || '').trim() || 'Set ' + (sets.length + 1), look: l }]); toast('Set saved'); return renderAll();
    }
    const s = sets[i]; if (!s) return;
    if (a === 'load') { pv = { ...pv, ...s.look }; refresh(); }
    else if (a === 'equip') { const p = {}; for (const k in s.look) if (k === 'color' || k === 'accent' || owns(k, s.look[k])) p[k] = s.look[k]; apply(p); pv = { ...pv, ...p }; toast('Set equipped'); refresh(); }
    else if (a === 'del') { setSets(sets.filter((_, j) => j !== i)); renderAll(); }
    else if (a === 'ren') { const n = typeof prompt === 'function' ? prompt('Set name', s.n) : null; if (n && n.trim()) { s.n = n.trim().slice(0, 16); setSets(sets); } }
  }
  function act(k) {
    if (k === 'primary') return primary();
    if (k === 'undo') return go(-1);
    if (k === 'redo') return go(1);
    if (k === 'locked') { for (const c in OPTS) if (!owns(c, pv[c])) pv[c] = DEFAULT_LOOK[c]; return refresh(); }
    if (k === 'reset') pv = { ...cur() };
    else if (k === 'blank') { pv = { ...cur() }; for (const c in OPTS) pv[c] = DEFAULT_LOOK[c]; }
    else if (k === 'rand') { for (const c in OPTS) { const o = Object.keys(OPTS[c].vals).filter(v => owns(c, v)); pv[c] = o[Math.random() * o.length | 0]; } }
    else if (k === 'unall') { const d = {}; for (const c in OPTS) d[c] = DEFAULT_LOOK[c]; apply(d); pv = { ...cur(), ...d }; toast('Everything unequipped'); }
    else if (k === 'equip') { const p = {}; for (const c of diffs()) if (c === 'color' || c === 'accent' || owns(c, pv[c])) p[c] = pv[c]; apply(p); toast('Equipped!'); }
    else if (k === 'buyall') {
      const m = miss(), cost = m.reduce((s, c) => s + price(c, pv[c]), 0); if (gems() < cost) return toast('Not enough gems');
      for (const c of m) buy(c, pv[c]); const p = {}; for (const c of diffs()) if (!(c === 'head' || c === 'hands') || owns(c, pv[c])) p[c] = pv[c]; apply(p); toast('Bought and equipped!');
    }
    refresh();
  }
  el.addEventListener('click', e => {
    const t = e.target, q = s => t.closest?.(s);
    if (q('[data-x]')) return close();
    const sa = q('[data-sa]'); if (sa) return setAct(sa.dataset.sa, +sa.dataset.i);
    const sw = q('[data-sw]'); if (sw) { const k = sw.dataset.sw, v = sw.dataset.val; pv[k] = v; return refresh(); }
    const r = q('[data-r]'); if (r) { pv[r.dataset.r] = DEFAULT_LOOK[r.dataset.r]; return refresh(); }
    const j = q('[data-j]'); if (j) { cat = j.dataset.j; return refresh(); }
    const tab = q('[data-c]'); if (tab) { cat = tab.dataset.c; return refresh(); }
    const f = q('[data-f]'); if (f) { filt = f.dataset.f; return renderAll(); }
    const k = q('[data-k]'); if (k && !k.disabled) return act(k.dataset.k);
    const p = q('[data-p]'); if (p && !p.disabled) {
      if (p.dataset.p === 'spin') auto = !auto; else if (p.dataset.p === 'walk') walk = !walk; else view = view === 'auto' ? 'char' : view === 'char' ? 'podium' : 'auto';
      return refresh();
    }
    const it = q('.it'); if (it) { sel = { c: cat, v: it.dataset.v }; if (cat === 'emote') { pre?.emote(+it.dataset.v); if (EMOTES[+it.dataset.v]?.gait) { walk = true; pre?.walk(true); } renderAll(); } else { pv[cat] = it.dataset.v; refresh(); } }
  });
  const onKey = e => { if (e.code === 'Escape') close(); else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { go(e.shiftKey ? 1 : -1); e.preventDefault(); } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { go(1); e.preventDefault(); } };
  function close() { el.hidden = true; pre?.stop(); removeEventListener('keydown', onKey); }
  onGems(() => renderAll());
  return {
    open() { pv = { ...cur() }; sel = null; hist = []; hi = -1; commit(); el.hidden = false; if (!pre) pre = createPreview($('pvc')); pushPreview(); renderAll(); pre.start(); addEventListener('keydown', onKey); },
  };
}
