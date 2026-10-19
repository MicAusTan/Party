import { Net } from './net.js';
import { World } from './world.js';
import { Board } from './board.js';
import { sfx, toggleMute, isMuted } from './sfx.js';
import { MINIGAMES } from './minigames/registry.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8'];
const HATS = ['none', 'cone', 'top', 'ears', 'halo'];
const net = new Net(), world = new World($('c'));
const board = new Board({ net, world, esc, players: () => players, playMg: startRandomMg, onChange: () => lock(), fx: (t, a) => fx(t, a) });
let players = {}, me = null, mg = null, look = { color: COLORS[0], hat: 'none' };
const sim = {}, keys = {}; let cfg = { rounds: 8, off: [] };   // sim: host-only free-roam positions

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
function lock() {
  document.querySelectorAll('#games button').forEach(b => b.disabled = b.dataset.k === 'quit' ? !board.active || !!mg : !!mg || board.active);
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
const pickHat = h => HATS.includes(h) ? h : 'none';
let prevN = 0;
function setPlayers(p) {
  const n = Object.keys(p).length; if (prevN && n > prevN) sfx('join'); prevN = n;
  players = p; world.sync(players);
  $('players').innerHTML = Object.values(players).map(q => `<div style="color:${q.color}">${q.id === 'host' ? '👑' : '●'} ${esc(q.name)} <b>${q.score || 0}</b></div>`).join('');
  $('swatches').innerHTML = COLORS.map(c => `<i class="sw${players[me]?.color === c ? ' me' : taken(c, me) ? ' taken' : ''}" data-c="${c}" style="background:${c}"></i>`).join('');
  $('hat').value = players[me]?.hat ?? 'none';
}
const pushLobby = () => { setPlayers(players); net.broadcast('lobby', players); };
function setLook(patch) {
  look = { ...look, ...patch }; try { localStorage.setItem('pg-look', JSON.stringify(look)); } catch {}
  if (net.isHost) { players.host.color = pickColor(look.color, 'host'); players.host.hat = pickHat(look.hat); pushLobby(); }
  else net.send('cust', look);
}
$('swatches').onclick = e => { const c = e.target.dataset.c; if (c && !taken(c, me)) setLook({ color: c }); };
$('hat').innerHTML = HATS.map(h => `<option value="${h}">${h === 'none' ? 'No hat' : 'Hat: ' + h}</option>`).join('');
$('hat').onchange = e => setLook({ hat: e.target.value });

function enter(code) {
  $('menu').hidden = true; $('panel').hidden = false; $('room').textContent = code;
  if (net.isHost) {
    $('games').innerHTML = '<button data-k="board">🎲 Board game</button>' +
      Object.entries(MINIGAMES).map(([k, g]) => `<button data-k="${k}">${esc(g.name)}</button>`).join('') +
      '<button data-k="random">🎲 Random minigame</button><button data-k="quit">Quit board</button>';
    $('games').onclick = e => {
      const k = e.target.dataset.k; if (!k || e.target.disabled) return;
      if (k === 'board') board.start(cfg.rounds);
      else if (k === 'quit') board.quit();
      else if (!mg) startRandomMg(k === 'random' ? null : k);
    };
    $('cfg').innerHTML = `<details><summary>⚙ Settings</summary>Board rounds <select id="rounds">${[4, 8, 12].map(n => `<option${n === cfg.rounds ? ' selected' : ''}>${n}</option>`).join('')}</select><div>Random pool:<br>${Object.entries(MINIGAMES).map(([k, g]) => `<label><input type="checkbox" data-mg="${k}"${cfg.off.includes(k) ? '' : ' checked'}> ${esc(g.name)}</label>`).join('<br>')}</div></details>`;
    $('cfg').onchange = e => {
      if (e.target.id === 'rounds') cfg.rounds = +e.target.value;
      else if (e.target.dataset.mg) { const k = e.target.dataset.mg; cfg.off = cfg.off.filter(x => x !== k); if (!e.target.checked) cfg.off.push(k); }
      try { localStorage.setItem('pg-cfg', JSON.stringify(cfg)); } catch {}
    };
    lock();
  }
  setPlayers(players);
}

$('host').onclick = async () => {
  try {
    const code = await net.host(); me = 'host'; sim.host = { x: 0, z: 0, ix: 0, iz: 0 };
    players = {}; players.host = { id: 'host', name: myName(), color: pickColor(look.color, 'host'), hat: pickHat(look.hat) };
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
  const n = Object.keys(players).length;
  players[from] = { id: from, name: String(d.name).slice(0, 12), color: pickColor(d.color, from), hat: pickHat(d.hat) };
  sim[from] = { x: (n % 5) * 2 - 4, z: 2, ix: 0, iz: 0 }; pushLobby();
});
net.on('cust', (d, from) => { const p = players[from]; if (p) { p.color = pickColor(d.color, from); p.hat = pickHat(d.hat); pushLobby(); } });
net.on('leave', (_, from) => { delete players[from]; delete sim[from]; board.onLeave(from); pushLobby(); });
net.on('input', (d, from) => { if (sim[from]) { sim[from].ix = +d.x || 0; sim[from].iz = +d.z || 0; } });
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
    },
  };
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
  $('hud').innerHTML = `<div class="mg"><h2>Results</h2>${pl.map((id, i) => `<div>${rk[i] + 1}. ${esc(players[id]?.name ?? '?')} <b>${pts(i)}</b></div>`).join('')}</div>`;
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
