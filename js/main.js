import { Net } from './net.js';
import { World } from './world.js';
import { Board } from './board.js';
import { BOARDS } from './boards.js';
import { sfx, toggleMute, isMuted } from './sfx.js';
import { MINIGAMES } from './minigames/registry.js';
import { COLORS, ACCENTS, OPTS, DEFAULT_LOOK, cleanLook } from './look.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const net = new Net(), world = new World($('c'));
const board = new Board({ net, world, esc, players: () => players, playMg: startRandomMg, onChange: () => lock(), fx: (t, a) => fx(t, a) });
let players = {}, me = null, mg = null, look = { ...DEFAULT_LOOK };
const sim = {}, keys = {}; let cfg = { mode: 'board', rounds: 8, off: [], board: 'grove', partyN: 10, repeats: false };   // sim: host-only free-roam positions

try { cfg = { ...cfg, ...JSON.parse(localStorage.getItem('pg-cfg') || '{}') }; } catch {}
try { look = { ...look, ...JSON.parse(localStorage.getItem('pg-look') || '{}') }; $('name').value = localStorage.getItem('pg-name') || ''; } catch {}
addEventListener('keydown', e => keys[e.code] = true);
addEventListener('keyup', e => keys[e.code] = false);
const myName = () => {
  const n = $('name').value.trim() || 'Player' + (Math.random() * 90 + 10 | 0);
  try { localStorage.setItem('pg-name', n); } catch {}
  return n;
};
const toast = (msg, ms = 1200) => { $('banner').innerHTML = `<div>${esc(msg)}</div>`; setTimeout(() => { if (!mg) $('banner').innerHTML = ''; }, ms); };
$('code').onkeydown = e => { if (e.key === 'Enter') $('join').click(); };
$('room').onclick = () => navigator.clipboard?.writeText($('room').textContent).then(() => toast('Room code copied!'));
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let lookOpen = false, folded = false, party = null, partyState = null; const queued = [];   // party: host-only engine; partyState: what everyone renders
function lock() {
  const inMg = !!mg, inGame = board.active || !!partyState, lobby = !inMg && !inGame, host = net.isHost;
  const n = Object.keys(players).length, need = practice ? 1 : 2;
  $('panel').classList.toggle('compact', !lobby); $('panel').classList.toggle('folded', folded);
  $('fold').textContent = folded ? '+' : '–';
  $('players').hidden = !lobby; $('lookBtn').hidden = lobby; $('look').hidden = !lobby && !lookOpen;
  $('waitMsg').hidden = host || !lobby; $('hostCtl').hidden = !host;
  $('start').hidden = $('settingsBtn').hidden = !lobby;
  $('start').textContent = cfg.mode === 'party' ? '▶ Start minigame party' : '▶ Start board game'; $('start').disabled = n < need; $('startHint').hidden = !lobby || n >= need;
  $('startHint').textContent = `Waiting for players (${n}/${need} needed). Share the room code!`;
  $('stopMg').hidden = !inMg; $('endGame').hidden = !(inGame && (!inMg || !!partyState)); renderParty();
  $('practice').hidden = !practice; $('testRow').hidden = !lobby;
}

function readInput() {
  if (mg || board.active) return { x: 0, z: 0 };
  const x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const z = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l };
}

// ---- players & customization
const taken = (c, id) => Object.values(players).some(p => p.id !== id && p.color === c);
const pickColor = (want, id) => COLORS.includes(want) && !taken(want, id) ? want : COLORS.find(c => !taken(c, id)) ?? COLORS[0];
const mkLook = (want, id) => ({ color: pickColor(want?.color, id), ...cleanLook(want) });
let prevN = 0;
function setPlayers(p) {
  const n = Object.keys(p).length; if (prevN && n > prevN) sfx('join'); prevN = n;
  players = p; world.sync(players);
  $('players').innerHTML = Object.values(players).map(q => `<div style="color:${q.color}">${q.id === 'host' ? '👑' : '●'} ${esc(q.name)} <b>${q.score || 0}</b></div>`).join('');
  renderLook(); lock();
}
function renderLook() {
  const cur = players[me] ?? look, who = me ?? 'host';
  document.querySelectorAll('[data-sw]').forEach(el => { const k = el.dataset.sw, list = k === 'color' ? COLORS : ACCENTS;
    el.innerHTML = list.map(c => `<i class="sw${cur[k] === c ? ' me' : k === 'color' && taken(c, who) ? ' taken' : ''}" data-c="${c}" style="background:${c}"></i>`).join(''); });
  document.querySelectorAll('[data-opt]').forEach(el => el.value = cur[el.dataset.opt] ?? look[el.dataset.opt]);
}
const pushLobby = () => { setPlayers(players); net.broadcast('lobby', players); };
function setLook(patch) {
  look = { ...look, ...patch }; try { localStorage.setItem('pg-look', JSON.stringify(look)); } catch {}
  if (!me) return renderLook();                       // customizing from the menu, before joining
  if (net.isHost) { Object.assign(players.host, mkLook(look, 'host')); pushLobby(); }
  else net.send('cust', look);
}
document.querySelectorAll('[data-look]').forEach(el => {
  el.innerHTML = '<div class="lbl">Color</div><div class="swatches" data-sw="color"></div><div class="lbl">Accent (hat, details)</div><div class="swatches" data-sw="accent"></div>' +
    Object.entries(OPTS).map(([k, o]) => `<label class="opt">${o.label}<select data-opt="${k}">${Object.entries(o.vals).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>`).join('') +
    '<button class="ghost" data-rand>🎲 Randomize</button>';
});
document.addEventListener('click', e => {
  const sw = e.target.closest?.('[data-sw]'), c = e.target.dataset?.c;
  if (sw && c) { if (sw.dataset.sw === 'color' ? !taken(c, me ?? 'host') : true) setLook({ [sw.dataset.sw]: c }); }
  if (e.target.dataset?.rand !== undefined) {
    const r = a => a[Math.random() * a.length | 0], p = { accent: r(ACCENTS), color: r(COLORS.filter(c => !taken(c, me ?? 'host'))) };
    for (const k in OPTS) p[k] = r(Object.keys(OPTS[k].vals)); setLook(p);
  }
});
document.addEventListener('change', e => { const k = e.target.dataset?.opt; if (k) setLook({ [k]: e.target.value }); });
renderLook();
$('lookBtn').onclick = () => { lookOpen = !lookOpen; lock(); };
$('fold').onclick = () => { folded = !folded; lock(); };

function startGame() {
  if (!net.isHost || mg || board.active || partyState || Object.keys(players).length < (practice ? 1 : 2)) return;
  if (cfg.mode === 'party') return startParty();
  board.start(cfg.rounds, cfg.board === 'random' ? Object.keys(BOARDS)[Math.random() * Object.keys(BOARDS).length | 0] : cfg.board);
}
const saveCfg = () => { try { localStorage.setItem('pg-cfg', JSON.stringify(cfg)); } catch {} };
function syncModeUI() {
  $('boardOpts').hidden = cfg.mode !== 'board'; $('partyOpts').hidden = cfg.mode !== 'party';
  $('repeats').disabled = cfg.partyN === 'all'; $('repeatRow').style.opacity = cfg.partyN === 'all' ? .4 : 1;
}
// ---- minigame party: random minigames back to back, scores add up (host runs it, everyone renders partyState)
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function buildQueue() {
  const all = Object.keys(MINIGAMES), on = all.filter(k => !cfg.off.includes(k)), pool = on.length ? on : all;
  if (cfg.partyN === 'all') return shuffle(pool);
  const n = +cfg.partyN || 10; if (!cfg.repeats) return shuffle(pool).slice(0, n);
  const q = []; while (q.length < n) { const k = pool[Math.random() * pool.length | 0]; if (pool.length > 1 && k === q[q.length - 1]) continue; q.push(k); } return q;
}
function setParty(s) { partyState = s; net.broadcast('party', s || { off: true }); lock(); }
function startParty() {
  const queue = buildQueue(); party = { queue, i: 0 };
  for (const id in players) players[id].score = 0; pushLobby();
  setParty({ n: 0, total: queue.length, over: false }); nextParty();
}
function nextParty() {
  if (!party || mg) return;
  if (party.i >= party.queue.length) {
    const mine = party; setParty({ n: party.i, total: party.queue.length, over: true }); sfx('win');
    setTimeout(() => { if (party === mine) stopParty(); }, 12000); return;
  }
  const key = party.queue[party.i++]; setParty({ n: party.i, total: party.queue.length, over: false }); startRandomMg(key);
}
function stopParty() { party = null; setParty(null); if (mg) mg.finish?.([]); }
function renderParty() {
  const el = $('party'); el.hidden = !partyState; if (!partyState) return;
  const ps = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0)), top = ps[0]?.score || 0;
  const wins = ps.filter(p => (p.score || 0) === top).map(p => esc(p.name)).join(' & ');
  el.innerHTML = `<b>🎉 Minigame party · ${Math.max(1, partyState.n)} / ${partyState.total}</b>` +
    ps.map(p => `<div style="color:${p.color}">${esc(p.name)} <b>${p.score || 0}</b></div>`).join('') +
    (partyState.over ? `<h3>🏆 ${wins} ${ps.filter(p => (p.score || 0) === top).length > 1 ? 'win' : 'wins'}!</h3>` : '');
}
net.on('party', d => { if (net.isHost) return; partyState = d.off ? null : d; lock(); });

function enter(code) {
  $('menu').hidden = true; $('panel').hidden = false; $('room').textContent = code; lookOpen = false; folded = false;
  if (net.isHost) {
    $('start').onclick = startGame;
    $('stopMg').onclick = () => mg?.finish?.([]);
    $('endGame').onclick = () => { if (confirm('End the game for everyone and go back to the lobby?')) { if (partyState) stopParty(); else board.quit(); } };
    $('settingsBtn').onclick = () => $('settings').hidden = false;
    $('settingsClose').onclick = () => $('settings').hidden = true;
    $('boardSel').innerHTML = Object.entries(BOARDS).map(([k, b]) => `<option value="${k}">${b.name}</option>`).join('') + '<option value="random">🎲 Random board</option>';
    $('boardSel').value = cfg.board; $('modeSel').value = cfg.mode; $('partyN').value = cfg.partyN; $('repeats').checked = !!cfg.repeats; syncModeUI();
    $('rounds').innerHTML = [4, 8, 12].map(n => `<option>${n}</option>`).join(''); $('rounds').value = cfg.rounds;
    $('pool').innerHTML = Object.entries(MINIGAMES).map(([k, g]) => `<label><input type="checkbox" data-mg="${k}"${cfg.off.includes(k) ? '' : ' checked'}> ${esc(g.name)}</label>`).join('');
    $('settings').onchange = e => {
      if (e.target.id === 'modeSel') cfg.mode = e.target.value;
      else if (e.target.id === 'partyN') cfg.partyN = e.target.value === 'all' ? 'all' : +e.target.value;
      else if (e.target.id === 'repeats') cfg.repeats = e.target.checked;
      else if (e.target.id === 'boardSel') cfg.board = e.target.value;
      else if (e.target.id === 'rounds') cfg.rounds = +e.target.value;
      else if (e.target.dataset.mg) { const k = e.target.dataset.mg; cfg.off = cfg.off.filter(x => x !== k); if (!e.target.checked) cfg.off.push(k); }
      saveCfg(); syncModeUI(); lock();
    };
    const setPool = on => { cfg.off = on ? [] : Object.keys(MINIGAMES); document.querySelectorAll('#pool input').forEach(i => i.checked = on); saveCfg(); };
    $('poolAll').onclick = () => setPool(true); $('poolNone').onclick = () => setPool(false);
    $('testSel').innerHTML = Object.entries(MINIGAMES).map(([k, g]) => `<option value="${k}">${esc(g.name)}</option>`).join('');
    $('testGo').onclick = () => { if (practice && !mg && !board.active) startRandomMg($('testSel').value); };
  }
  setPlayers(players);
}

let practice = false, botN = 0;
$('solo').onclick = () => {
  practice = true; net.isHost = true; net.id = 'host'; me = 'host'; sim.host = { x: 0, z: 0, ix: 0, iz: 0 };
  players = {}; players.host = { id: 'host', name: myName(), ...mkLook(look, 'host') };
  enter('PRACTICE');
};
function addDummy() {
  const n = Object.keys(players).length; if (n >= 8) return; const id = 'bot' + (++botN);
  players[id] = { id, name: 'Dummy ' + botN, ...mkLook({ color: COLORS[n % COLORS.length] }, id), bot: true };
  sim[id] = { x: (n % 5) * 2 - 4, z: 2, ix: 0, iz: 0 }; if (partyState) players[id].score = 0; pushLobby(); if (board.active) board.addPlayer(id);
}
function removeDummy() {
  const id = Object.keys(players).reverse().find(k => players[k].bot); if (!id) return;
  delete players[id]; delete sim[id]; board.onLeave(id); pushLobby();
}
$('practice').onclick = e => { const p = e.target.dataset.p; if (p === 'add') addDummy(); else if (p === 'rem') removeDummy(); else if (p === 'exit') location.reload(); };

$('host').onclick = async () => {
  try {
    const code = await net.host(); me = 'host'; sim.host = { x: 0, z: 0, ix: 0, iz: 0 };
    players = {}; players.host = { id: 'host', name: myName(), ...mkLook(look, 'host') };
    enter(code);
  } catch (e) { alert('Could not host: ' + (e.type || e)); }
};
$('join').onclick = async () => {
  try {
    await net.join($('code').value.trim()); me = net.id;
    net.send('hello', { name: myName(), ...look }); enter($('code').value.toUpperCase());
  } catch (e) { alert('Could not join: ' + (e.type || e)); }
};

// ---- host-side lobby handling
net.on('hello', (d, from) => {
  if (!net.isHost) return;
  if (mg) { queued.push([from, d]); net.sendTo(from, 'queued'); return; }   // joins as soon as this minigame ends
  admit(from, d);
});
function admit(from, d) {
  const n = Object.keys(players).length;
  players[from] = { id: from, name: String(d.name).slice(0, 12), ...mkLook(d, from) };
  sim[from] = { x: (n % 5) * 2 - 4, z: 2, ix: 0, iz: 0 }; if (partyState) players[from].score = 0; pushLobby();
  if (partyState) net.sendTo(from, 'party', partyState);
  if (board.active) board.addPlayer(from);
}
const admitQueued = () => queued.splice(0).forEach(([f, d]) => net.conns.has(f) && admit(f, d));
net.on('cust', (d, from) => { const p = players[from]; if (p) { Object.assign(p, mkLook(d, from)); pushLobby(); } });
net.on('leave', (_, from) => { const qi = queued.findIndex(q => q[0] === from); if (qi >= 0) queued.splice(qi, 1); delete players[from]; delete sim[from]; board.onLeave(from); pushLobby(); });
net.on('input', (d, from) => { if (sim[from]) { sim[from].ix = +d.x || 0; sim[from].iz = +d.z || 0; } });
net.on('queued', () => toast('A minigame is in progress — you\'ll join when it ends!', 4000));
net.on('closed', () => alert('Host disconnected'));
// ---- client-side
net.on('lobby', d => setPlayers(d));
net.on('snap', d => { if (!net.isHost && !board.active && !mg) for (const id in d) world.set(id, d[id][0], d[id][1]); });

// ---- minigames
function startRandomMg(key) {
  if (mg || !net.isHost) return;
  const all = Object.keys(MINIGAMES), on = all.filter(k => !cfg.off.includes(k)), ks = on.length ? on : all; key ||= ks[Math.random() * ks.length | 0];
  const seed = Math.random() * 2 ** 31 | 0;
  net.broadcast('mg:start', { key, seed }); startMg(key, seed);
}
function startMg(key, seed) {
  const def = MINIGAMES[key]; $('hud').innerHTML = ''; mg = { key, inst: null }; lock();
  const ctx = {
    players, me, world, isHost: net.isHost, hud: $('hud'), esc, rng: mulberry(seed),
    send: m => net.isHost ? net.broadcast('mg:msg', m) : net.send('mg:msg', m),
    finish: (pl, rk) => {
      rk ||= pl.map((_, i) => i);
      if (board.active) board.onMgEnd(pl, rk);
      else pl.forEach((id, i) => { if (players[id]) players[id].score = (players[id].score || 0) + pl.length - rk[i]; });
      net.broadcast('mg:end', { placements: pl, ranks: rk }); net.broadcast('lobby', players); endMg(pl, rk); setPlayers(players);
      if (net.isHost) { admitQueued(); if (party) { const mine = party; setTimeout(() => { if (party === mine) nextParty(); }, 6000); } }
    },
  };
  mg.finish = ctx.finish;
  let n = 3;
  const tick = () => {
    if (!mg || mg.key !== key || mg.inst) return;
    if (n === 0) { sfx('go'); $('banner').innerHTML = ''; mg.inst = def.create(ctx); return; }
    $('banner').innerHTML = `<small>${esc(def.name)}</small><div>${esc(def.desc)}</div><h2>${n--}</h2>`;
    sfx('tick'); setTimeout(tick, 1000);
  };
  tick();
}
function endMg(pl, rk = pl.map((_, i) => i)) {
  sfx(rk[pl.indexOf(me)] === 0 ? 'win' : 'click');
  mg?.inst?.cleanup(); mg = null; lock();
  const pts = i => board.active ? `🪙${board.reward(rk[i])}${board.s?.mega && rk[i] === 0 ? ' +⭐' : ''}` : `+${pl.length - rk[i]}`;
  $('hud').innerHTML = `<div class="mg"><h2>${pl.length ? 'Results' : 'Stopped'}</h2>${pl.map((id, i) => `<div>${rk[i] + 1}. ${esc(players[id]?.name ?? '?')} <b>${pts(i)}</b></div>`).join('')}</div>`;
  setTimeout(() => { if (!mg) $('hud').innerHTML = ''; }, 4000);
}
net.on('mg:start', d => { if (!net.isHost && MINIGAMES[d.key]) startMg(d.key, d.seed); });
net.on('mg:msg', (d, from) => mg?.inst?.onMessage(d, from));
net.on('mg:end', d => { if (!net.isHost && mg) endMg(d.placements, d.ranks); });

// ---- main loop: host simulates free-roam at 60fps, broadcasts snapshots at 20Hz
let last = performance.now(), acc = 0, lastIn = '';
function loop(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  if (me) {
    const i = readInput();
    if (net.isHost) {
      if (!board.active && !mg) {
        sim.host.ix = i.x; sim.host.iz = i.z;
        for (const id in sim) {
          const s = sim[id]; s.x += s.ix * 7 * dt; s.z += s.iz * 7 * dt;
          const r = Math.hypot(s.x, s.z); if (r > 12) { s.x *= 12 / r; s.z *= 12 / r; }
          world.set(id, s.x, s.z);
        }
        if ((acc += dt) >= .05) {
          acc = 0; const snap = {};
          for (const id in sim) snap[id] = [+sim[id].x.toFixed(2), +sim[id].z.toFixed(2)];
          net.broadcast('snap', snap);
        }
      }
    } else {
      const k = i.x + ',' + i.z;
      if (k !== lastIn) { lastIn = k; net.send('input', i); }
    }
    mg?.inst?.update(dt);
  }
  world.frame(dt); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- effects & sound
function burstAt(id, c, n) { const g = world.m.get(id)?.g; if (g) world.burst(g.position.x, g.position.y + 1, g.position.z, c, n); }
function popup(t) { $('banner').innerHTML = `<h2>${t}</h2>`; setTimeout(() => { if (!mg) $('banner').innerHTML = ''; }, 900); }
function fx(t, a) {
  if (t === 'roll') { sfx('roll'); popup('🎲 ' + a); return; }
  if (t === 'mega') { sfx('star'); popup('⭐ MEGA MINIGAME ⭐'); return; }
  sfx(t);
  if (t === 'coin') burstAt(a, '#ffd93d'); else if (t === 'lose') burstAt(a, '#e74c3c', 10);
  else if (t === 'star') burstAt(a, '#fff176', 30); else if (t === 'win') burstAt(a, '#ffd93d', 40);
}
const setMute = () => $('mute').textContent = isMuted() ? '🔇 Sound off (M)' : '🔊 Sound on (M)';
$('mute').onclick = () => { toggleMute(); setMute(); }; setMute();
addEventListener('keydown', e => { if (e.code === 'KeyM' && !/INPUT|SELECT/.test(e.target.tagName)) { toggleMute(); setMute(); } });
