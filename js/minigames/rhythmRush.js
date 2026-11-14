import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { scoreboard, mix } from './util.js';
import { stage, fitDist } from './stage.js';
import { buildChart, CFG } from './rhythmChart.js';
// Same seeded notes for everyone (chart built by rhythmChart.js). Lanes: D F J K (or 1 2 3 4). Perfect = 10, good = 5, stray press = -2.
// Set: a neon concert highway. Your notes slide down the lanes in 3D; everyone else is the crowd on the sides, hopping when
// they hit notes, with a live score under each avatar (hits are shared a few times a second -- scoring is still per-client).
const K4 = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }, C4 = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db'];
const HZ = 3;     // note speed (units/s), hit-line z, lane width
export default {
  tiers: [{ n: 'Normal', m: 1, pen: 0, d: 'Slow and steady taps with a few long notes.', def: true }, { n: 'Hard', m: 1.25, pen: 1, d: 'Denser, off-beat notes, more long notes and short streams.' }, { n: 'Expert', m: 1.5, pen: 3, d: 'Irregular bursts, chords, stair runs, trills and hold-plus-tap patterns.' }, { n: 'Insane', m: 2, pen: 4, d: 'Long streams, jacks, chords, triplets and double holds.' }, { n: 'Nightmare', m: 3, pen: 5, d: 'Far beyond Insane: huge bursts, handstreams, fast jacks, triplets and double holds. Same timing, way more notes.' }],
  name: 'Rhythm Rush', desc: 'Hit the notes as they cross the line! Keys D F J K (or 1 2 3 4). LONG notes: press on the head and keep holding until the tail passes for a +5 bonus. Highest score wins. Every 10 notes in a row gives a +5 combo bonus. SLIPSTREAM: every 20 combo (up to x3) the notes scroll faster, change colour (violet, pink, then rainbow) and every tapped note scores +2 more per level - until you miss or drop a hold.',
  create(ctx) {
    const D = Math.max(0, Math.min(CFG.length - 1, ctx.diff ?? 0)), L = 4, CH = buildChart(() => ctx.rng(), D), V = CH.C.V, WIN = CH.C.win, PERF = CH.C.perf, notes = CH.notes, endT = CH.endT, LANE = 1.5, laneX = l => (l - (L - 1) / 2) * LANE;
    const KEYS = K4, COLS = C4, HEX = COLS.map(c => parseInt(c.slice(1), 16)), LBL = 'DFJK';
    const sb = scoreboard(ctx, { timeout: 60, lower: false, bot: s => { const n = notes.length, hit = mix(.45, .95, s), perf = mix(.2, .75, s); return { v: Math.round(n * hit * (5 + 5 * perf) - n * (1 - hit) * 1.5), t: endT }; } });
    const held = Array(L).fill(null); let time = 0, score = 0, done = false, fb = '', fl = Array(L).fill(0), pendQ = null, sendT = 0, tt = 0, combo = 0, best = 0, hits = 0, flow = 0, flowOn = false, vv = V;
    const lv = () => Math.min(3, Math.floor(combo / 20));
    const W = ctx.world, ids = Object.keys(ctx.players), n = ids.length, me = ctx.me, sc = {}, dirty = {}; ids.forEach(id => { sc[id] = 0; dirty[id] = true; });

    // ---------- the set ----------
    const dist = fitDist(W, 8.2, 10);
    const S = stage(ctx, { sky: 0x07050f, fog: { color: 0x07050f, near: 28, far: 62 }, light: .75, sun: { intensity: .5, pos: [0, 10, 5] }, cam: { pos: [0, dist * .58, dist], look: [0, .4, -6], fov: 58 }, camFrom: [0, 12, 18], camT: 1.4 });
    S.box(70, .5, 100, 0x120c24, 0, -.5, -28);
    S.box(LANE * L + .4, .1, 72, 0x1a1530, 0, 0, -30);
    for (let l = 0; l < L; l++) S.box(LANE - .12, .02, 72, 0x241d45, laneX(l), .1, -30);
    for (let l = 0; l <= L; l++) S.box(.06, .05, 72, 0x6b5cff, (l - L / 2) * LANE, .1, -30, { em: 0x3a2f99 });
    const hitLine = S.box(LANE * L + .4, .08, .18, 0xffffff, 0, .12, HZ, { basic: true }); let lineGlow = 0;
    const flash = Array.from({ length: L }, (_, l) => { S.cyl(.55, .55, .05, HEX[l], laneX(l), .12, HZ, { basic: true, op: .55 }); return S.box(LANE - .12, .03, 7, HEX[l], laneX(l), .13, HZ - 3.2, { basic: true, op: 0 }); });
    const keys = S.screen(LANE * L, .8, 512, 100); keys.mesh.rotation.x = -Math.PI / 2; keys.mesh.position.set(0, .05, HZ + 1.3);
    keys.draw((c, w, h) => { c.font = `bold ${L === 6 ? 50 : 60}px sans-serif`; c.textAlign = 'center'; for (let l = 0; l < L; l++) { c.fillStyle = COLS[l]; c.fillText(LBL[l], w / (2 * L) + l * w / L, 70); } });
    const meshes = notes.map(nt => S.box(LANE - (nt.len ? .6 : .35), .28, nt.len ? nt.len * V : .7, HEX[nt.l], laneX(nt.l), .15, -99, { em: (HEX[nt.l] >> 1) & 0x7f7f7f }));
    for (let z = -2; z > -50; z -= 8) for (const sd of [-1, 1]) { S.cyl(.18, .22, 3.2, 0x2a2250, sd * 3.7, 0, z, { seg: 8 }); S.sph(.32, HEX[(z / -8 | 0) % 4], sd * 3.7, 3.4, z, { basic: true }); }   // light pylons
    const eq = []; for (let i = 0; i < 15; i++) eq.push(S.box(1, 1, 1, HEX[i % 4], (i - 7) * 1.5, 0, -50, { em: (HEX[i % 4] >> 1) & 0x7f7f7f }));   // equalizer on the horizon
    const lab = {}, side = i => i % 2 ? 1 : -1;
    ids.forEach((id, i) => {                                         // the crowd: two columns beside the highway, facing it
      const sd = side(i), z = 1 - (i >> 1) * 3.2; W.put(id, sd * 6.6, z, sd < 0 ? Math.PI / 2 : -Math.PI / 2);
      S.cone(1.3, 8, HEX[i % 4], sd * 6.6, 0, z, { basic: true, op: .09, seg: 16 });
      const l = S.screen(2.2, .8, 256, 96); l.mesh.rotation.x = -Math.PI / 2; l.mesh.position.set(sd * 4.8, .05, z); lab[id] = l;
    });
    const drawLab = id => lab[id].draw((c, w, h) => { c.fillStyle = '#000a'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.fillStyle = ctx.players[id].color; c.font = 'bold 30px sans-serif'; c.fillText(String(ctx.players[id].name).slice(0, 12), w / 2, 34); c.fillStyle = '#fff'; c.font = 'bold 44px sans-serif'; c.fillText(String(sc[id]), w / 2, 82); });
    const LVC = [null, new THREE.Color(0xb066ff), new THREE.Color(0xff4fd8), new THREE.Color(0xffffff)], curC = new THREE.Color(0xb066ff), tc = new THREE.Color(); const tmp = new THREE.Color(); let tintA = 0;   // slipstream tint: notes / streaks / hit line shift to violet -> pink -> rainbow
    const streaks = Array.from({ length: 26 }, (_, i) => S.box(.05, .03, 5 + i % 4 * 2, 0xbfe9ff, ((i * 37) % 100 / 100 - .5) * 8, .2 + i % 3 * .6, -20, { basic: true, op: 0 }));
    S.anim((dt, tn) => {
      tt += dt; lineGlow = Math.max(0, lineGlow - dt); hitLine.scale.set(1, 1 + lineGlow * 14, 1 + lineGlow * 8); if (jT > 0 && (jT -= dt) <= 0) jEl.style.opacity = 0; vv += (V * (1 + .12 * lv()) - vv) * Math.min(1, dt * 1.5); flowOn = lv() > 0; tintA += ((lv() ? 1 : 0) - tintA) * Math.min(1, dt * 5); if (lv() === 1 || lv() === 2) curC.lerp(LVC[lv()], Math.min(1, dt * 6)); hitLine.material.color.setHex(0xffffff).lerp(lv() === 3 ? tc.setHSL(tt * .5 % 1, .9, .65) : curC, tintA * .85); streaks.forEach((m, i) => { m.material.color.copy(lv() === 3 ? tc.setHSL((tt * .5 + i * .07) % 1, .9, .7) : lv() ? curC : tc.setHex(0xbfe9ff)); m.material.opacity = lv() ? .2 + lv() * .13 : 0; m.position.z += dt * (30 + i % 5 * 8); if (m.position.z > 6) m.position.z = -50 - (i % 6) * 4; });
      notes.forEach((nt, i) => { const m = meshes[i], head = HZ - (nt.t - time) * vv; if (tintA > .01 || m.userData.tn) { if (tintA > .01) { tc.setHex(HEX[nt.l]).lerp(lv() === 3 ? tmp.setHSL((tt * .5 + i * .05) % 1, .9, .6) : curC, Math.min(.9, tintA)); m.material.color.copy(tc); m.material.emissive.copy(tc).multiplyScalar(.45); m.userData.tn = 1; } else { m.material.color.setHex(HEX[nt.l]); m.material.emissive.setHex((HEX[nt.l] >> 1) & 0x7f7f7f); m.userData.tn = 0; } } if (!nt.len) { m.visible = !nt.hit && head > -48 && head < HZ + 2.5; m.position.z = head; return; } const tail = HZ - (nt.t + nt.len - time) * vv, h = nt.hit ? Math.min(head, HZ) : head; m.visible = !nt.done && !nt.fail && tail < HZ + 1 && h > -48 && tail > -90; m.scale.z = Math.max(.02, (h - tail) / (nt.len * V)); m.position.z = (h + tail) / 2; m.material.opacity = 1; m.material.transparent = !!nt.hit; if (nt.hit) m.material.opacity = .7; });
      flash.forEach((f, l) => { f.material.opacity = Math.max(0, fl[l]) / .12 * .45; });
      eq.forEach((b, i) => { const h = .6 + Math.abs(Math.sin(tn * 3 + i * 1.3)) * 3.2; b.scale.y = h; b.position.y = h / 2; });
      ids.forEach((id, i) => { if (dirty[id]) { dirty[id] = false; drawLab(id); } const e = W.m.get(id); if (e && !e.emo) W.lean(id, Math.sin(tn * 5 + i) * .07); });
    });

    // ---------- play ----------
    const el = document.createElement('div'); el.className = 'mg'; el.innerHTML = '<h3 id="s"></h3>'; ctx.hud.append(el);
    const jEl = document.createElement('div'); jEl.style.cssText = 'position:fixed;left:50%;top:58%;transform:translateX(-50%);z-index:5;pointer-events:none;font:900 34px system-ui;text-shadow:0 0 8px #000,0 2px 2px #000;opacity:0;transition:transform .12s'; (document.body ?? ctx.hud).append(jEl); let jT = 0;
    const JC = { 'PERFECT!': '#ffe066', Good: '#8be28b', Miss: '#ff6b6b', 'Dropped!': '#ff6b6b', 'HOLD +5': '#7ad7ff' };
    const judge = t => { fb = t; jEl.textContent = t; jEl.style.color = t.startsWith('SLIP') ? '#c9a0ff' : JC[t] || '#fff'; jEl.style.opacity = 1; jEl.style.transform = 'translateX(-50%) scale(1.25)'; jT = .75; setTimeout(() => { jEl.style.transform = 'translateX(-50%) scale(1)'; }, 60); }; const s = el.querySelector('#s');
    const react = (id, q) => { if (q === 2) W.hop(id, .6); else if (q === 1) W.hop(id, .3); };
    const key = e => {
      const l = KEYS[e.code]; if (l == null || e.repeat || done) return; fl[l] = .12; let q = 0;
      const nt = notes.find(k => !k.hit && !k.miss && k.l === l && Math.abs(k.t - time) < WIN);
      if (nt) { nt.hit = 1; const d = Math.abs(nt.t - time); q = d < PERF ? 2 : 1; score += (q === 2 ? 10 : 5) + lv() * 2; judge(q === 2 ? 'PERFECT!' : 'Good'); hits++; best = Math.max(best, ++combo); sfx('n' + (l % 8)); if (combo % 20 === 0 && combo <= 60) { judge('SLIPSTREAM x' + lv() + '!'); sfx('correct'); W.popIcon(me, '🌀'); } if (combo % 10 === 0) { score += 5; sfx('correct'); W.popIcon(me, '🔥'); } if (q === 2) { W.burst(laneX(l), .7, HZ, COLS[l], 8); lineGlow = .25; } if (nt.len) held[l] = nt; }
      else { score -= 2; judge('Miss'); combo = 0; flowOn = false; sfx('lose'); }
      sc[me] = score; dirty[me] = true; react(me, q); pendQ = q;
    };
    const keyUp = e => {
      const l = KEYS[e.code]; if (l == null) return; const nt = held[l]; if (!nt) return; held[l] = null;
      if (time >= nt.t + nt.len - .12) { nt.done = 1; return; }
      nt.fail = 1; combo = 0; flowOn = false; judge('Dropped!'); sfx('lose'); sc[me] = score; dirty[me] = true;
    };
    addEventListener('keydown', key); addEventListener('keyup', keyUp);
    const apply = ev => { if (ev.id in sc) { sc[ev.id] = ev.sc; dirty[ev.id] = true; react(ev.id, ev.q); } };
    return {
      update(dt) {
        sb.prog(score), sb.tick(dt); time += dt;
        if (!done) for (const k of notes) if (!k.hit && !k.miss && time > k.t + WIN) { k.fail = k.len ? 1 : 0; k.miss = 1; if (combo) { combo = 0; flowOn = false; judge('Miss'); } } fl = fl.map(v => Math.max(0, v - dt));
        held.forEach((nt, l) => { if (!nt) return; fl[l] = .12; if (time >= nt.t + nt.len) { nt.done = 1; held[l] = null; score += 5; hits += 0; best = Math.max(best, ++combo); judge('HOLD +5'); sfx('correct'); W.burst(laneX(l), .7, HZ, COLS[l], 10); sc[me] = score; dirty[me] = true; pendQ = 2; } });
        if (!done && time >= endT) { done = true; sb.report(score); sc[me] = score; dirty[me] = true; ctx.send({ k: 'h', id: me, q: -1, sc: score }); W.emote(me, 'cheer'); }
        if (pendQ !== null && (sendT -= dt) <= 0) { sendT = .12; ctx.send({ k: 'h', id: me, q: pendQ, sc: score }); pendQ = null; }     // at most ~8 messages/s per player
        const acc = Math.round(hits / notes.length * 100), grade = acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : acc >= 50 ? 'C' : 'D'; s.textContent = done ? `Final: ${score}  Grade ${grade} (${acc}%)  Best combo ${best} - waiting for others...` : `Score: ${score}   ${fb}   Combo ${combo}${flowOn ? '  🌀 SLIPSTREAM x' + lv() + ' (+' + lv() * 2 + '/note, faster)' : ''}`;
      },
      endNow() { sb.endNow(); },
      onMessage(m, from) {
        if (m.k === 'h') {
          if (ctx.isHost) { if (!(from in sc)) return; const ev = { k: 'h', id: from, q: Math.max(-1, Math.min(2, m.q | 0)), sc: Math.max(-99999, Math.min(99999, m.sc | 0)) }; apply(ev); ctx.send(ev); }
          else if (m.id !== me) apply(m);
          return;
        }
        sb.onMessage(m, from);
      },
      cleanup() { jEl.remove(); removeEventListener('keydown', key); removeEventListener('keyup', keyUp); el.remove(); S.cleanup(); },
    };
  },
};
