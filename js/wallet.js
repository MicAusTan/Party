import { OPTS, DEFAULT_LOOK } from './look.js';
import { EMOTES } from './emotes.js';
// Persistent Gems + unlocked cosmetics, stored per device in localStorage. Swap this file's storage to go online later.
const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let bal = rd('pg-gems', 150); const owned = new Set(rd('pg-owned', [])), subs = [];
const BASE = { hat: 40, body: 60, face: 30, back: 70, pattern: 35, aura: 90, trail: 120, ped: 80, fx: 100, title: 50, vpose: 40, crest: 40, spot: 50, stage: 90 };
const OVR = {
  hat: { cone: 20, flower: 25, cap: 25, beanie: 25, propeller: 50, wizard: 70, halo: 90, crown: 120 },
  body: { round: 40, pyramid: 70, chunky: 80, diamond: 110 },
  back: { tail: 40, cape: 60, backpack: 60, wings: 130, jetpack: 150 },
  aura: { ring: 60, disc: 100, twin: 140 },
  trail: { sparkle: 80, flame: 140, rainbow: 180 },
  vpose: { love: 30, cool: 30, giggle: 30, wiggle: 30, shake: 50 },
  crest: { crown: 60, cat: 40, pizza: 50, rocket: 60, unicorn: 80, dragon: 100, skull: 70 },
  spot: { rose: 40, ice: 40, lime: 50, violet: 60, blood: 70 },
  stage: { sunset: 80, ocean: 90, forest: 100, candy: 110, void: 140 },
  ped: { rainbow: 180, void: 170, matrix: 150, marble: 60, candy: 80, ice: 100, neon: 140, lava: 160, gold: 200 },
  title: { rookie: 20, lucky: 40, speedy: 40, chill: 50, menace: 60, hoarder: 90, champ: 120, royal: 150 },
  fx: { lanterns: 110, rain: 70, embers: 130, snow: 60, bubbles: 70, stars: 90, gold: 150, fireworks: 220 },
};
for (const k in OPTS) OVR[k] ??= {};
Object.assign(OVR.hat, { tiara: 80, bow: 30, headphones: 60, santa: 50, cowboy: 60, jester: 70, helmet: 90, ufo: 130, bucket: 40, duck: 70 });
Object.assign(OVR.body, { ico: 90, hexa: 60, top: 100, snowman: 120 });
Object.assign(OVR.face, { blush: 20, wink: 30, surprised: 25, monocle: 50, robot: 70, bigeyes: 40 });
Object.assign(OVR.back, { bat: 90, angel: 110, balloon: 80, flag: 70 });
Object.assign(OVR.pattern, { sash: 40, bowtie: 40, badge: 30, checker: 50 });
Object.assign(OVR.aura, { dotring: 80, hex: 90, beam: 160 });
Object.assign(OVR.trail, { bubbles: 90, hearts: 110, stars: 130, smoke: 70, toxic: 120, ice: 140, void: 200 });
Object.assign(OVR.ped, { wood: 40, steel: 60, copper: 90, pearl: 110, obsidian: 150, bubblegum: 90, sandstone: 50 });
Object.assign(OVR.fx, { petals: 70, leaves: 70, sparks: 100, diamonds: 160 });
Object.assign(OVR.vpose, { sad: 30, tilt: 30 });
Object.assign(OVR.crest, { dino: 60, octopus: 60, donut: 40, fire: 60, rainbow: 70, swords: 80, guitar: 70, invader: 90 });
Object.assign(OVR.spot, { orange: 40, teal: 50, white: 60, magenta: 70 });
Object.assign(OVR.stage, { storm: 100, desert: 80, arctic: 90, lava: 140, cosmos: 150, meadow: 70 });
Object.assign(OVR.title, { brain: 60, fire: 60, owl: 50, sniper: 70, turtle: 40, spender: 80, sneaky: 60, legend: 200 });
export const price = (c, v) => c === 'emote' ? (EMOTES[v]?.price || 0) : (OVR[c]?.[v] ?? BASE[c] ?? 50);
export const isFree = (c, v) => c === 'emote' ? !price(c, v) : (v === DEFAULT_LOOK[c] || v === 'none');
export const owns = (c, v) => isFree(c, v) || owned.has(c + ':' + v);
const emit = () => subs.forEach(f => f());
export const gems = () => bal;
// First game of the local day pays a bonus (once per calendar day, per device).
export function claimDaily() { const d = new Date().toISOString().slice(0, 10); if (rd('pg-day', '') === d) return 0; wr('pg-day', d); return 10; }
export const onGems = f => subs.push(f);
export function addGems(n) { bal = Math.max(0, bal + (n | 0)); wr('pg-gems', bal); emit(); }
export function buy(c, v) {
  if (owns(c, v)) return true;
  const p = price(c, v); if (bal < p) return false;
  bal -= p; owned.add(c + ':' + v); wr('pg-gems', bal); wr('pg-owned', [...owned]); emit(); return true;
}
export const getSet = () => { const s = rd('pg-emoset', [0, 1, 2, 3, 4, 5, 6, 7]); return (Array.isArray(s) ? s : []).filter(i => EMOTES[i] && owns('emote', i)).slice(0, 16); };
export const setSet = a => { wr('pg-emoset', a.slice(0, 16)); emit(); };
// Base gems by placement (1st 12 ... last 3). Bonuses are added by the caller.
export const gemsFor = (rank, n) => n > 1 ? Math.round(12 - 9 * Math.min(rank, n - 1) / (n - 1)) : 8;
// Anything not owned falls back to the default (guards a hand-edited look in localStorage).
export function sanitizeLook(l) { const o = { ...l }; for (const k in OPTS) if (!owns(k, o[k])) o[k] = DEFAULT_LOOK[k]; return o; }
