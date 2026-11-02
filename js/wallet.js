import { OPTS, DEFAULT_LOOK } from './look.js';
import { EMOTES } from './emotes.js';
// Persistent Gems + unlocked cosmetics, stored per device in localStorage. Swap this file's storage to go online later.
const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let bal = rd('pg-gems', 250); const owned = new Set(rd('pg-owned', [])), subs = [];
const BASE = { hat: 40, body: 60, face: 30, back: 70, pattern: 35, aura: 90, trail: 120, ped: 80, fx: 100, title: 50, pet: 80, tagframe: 50, dice: 90, pshape: 70, banner: 60, coat: 80, vpose: 40, crest: 40, spot: 50, stage: 90 };
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
Object.assign(OVR.trail, { bubbles: 90, hearts: 110, stars: 130, smoke: 70, toxic: 120, ice: 140, void: 200 });
Object.assign(OVR.ped, { wood: 40, steel: 60, copper: 90, pearl: 110, obsidian: 150, bubblegum: 90, sandstone: 50 });
Object.assign(OVR.fx, { petals: 70, leaves: 70, sparks: 100, diamonds: 160 });
Object.assign(OVR.vpose, { sad: 30, tilt: 30 });
Object.assign(OVR.crest, { dino: 60, octopus: 60, donut: 40, fire: 60, rainbow: 70, swords: 80, guitar: 70, invader: 90 });
Object.assign(OVR.spot, { orange: 40, teal: 50, white: 60, magenta: 70 });
Object.assign(OVR.stage, { storm: 100, desert: 80, arctic: 90, lava: 140, cosmos: 150, meadow: 70 });
Object.assign(OVR.title, { brain: 60, fire: 60, owl: 50, sniper: 70, turtle: 40, spender: 80, sneaky: 60, legend: 200 });
Object.assign(OVR.coat, { gradient: 60, checker: 70, polka: 70, zebra: 90, tiger: 100, camo: 90, scales: 110, galaxy: 200 });
Object.assign(OVR.vpose, { spin: 40, flip: 80, bounce: 50, float: 120, tornado: 100, sway: 40, bow: 50 });
Object.assign(OVR.hat, { pumpkin: 50, mushroom: 70, traffic: 40, unicorn: 110, astronaut: 130, frog: 60, shark: 80, laurel: 90, hardhat: 40, cake: 100 });
Object.assign(OVR.body, { egg: 70, can: 60 });
Object.assign(OVR.coat, { rainbow: 120, leopard: 90, plaid: 80, hearts: 100, waves: 90, circuit: 130, giraffe: 90, lava: 170 });
Object.assign(OVR.face, { stareyes: 50, hearteyes: 50, dizzy: 30, vampire: 60, clown: 50, tears: 30, pixelshades: 80 });
Object.assign(OVR.back, { sword: 80, guitar: 90, umbrella: 70, quiver: 60 });
Object.assign(OVR.pattern, { buttons: 25, tie: 40, overalls: 60, emblem: 50 });
Object.assign(OVR.trail, { confetti: 90, leaves: 60, coins: 120, lightning: 160, ink: 80, petals: 70 });
Object.assign(OVR.ped, { brick: 50, hologram: 140, ruby: 150, emerald: 150, moonrock: 70 });
Object.assign(OVR.fx, { hearts: 80, butterflies: 120, ash: 60, prism: 170 });
Object.assign(OVR.vpose, { shimmy: 60, drop: 70 });
Object.assign(OVR.crest, { fox: 50, wolf: 60, shark: 60, frog: 40, gamepad: 70, gem: 90, bolt: 70, star: 60 });
Object.assign(OVR.spot, { amber: 40, sky: 40, crimson: 60, mint: 50 });
Object.assign(OVR.stage, { city: 130, haunted: 120, castle: 140 });
Object.assign(OVR.title, { tank: 50, ace: 70, gremlin: 50, wizard: 70, goat: 160, noob: 30, chaos: 90, zen: 80 });
Object.assign(OVR.ped, { gift: 90, arcade: 120, cloud: 100, checker: 70 });
Object.assign(OVR.vpose, { rocket: 130, roar: 90, breakdance: 110 });
Object.assign(OVR.spot, { pin: 50, wide: 60, twin: 90, fan: 100, sweep: 110, rig: 150, disco: 180 });
Object.assign(OVR.pshape, { tall: 60, short: 40, tiered: 90, round: 70, hex: 70, pillar: 100, float: 130, funnel: 90 });
Object.assign(OVR.banner, { ribbon: 50, scroll: 60, neon: 100, wood: 60, flag: 70, marquee: 110, stone: 70 });
Object.assign(OVR.pattern, { tux: 100, hoodie: 90, armor: 120, jersey: 70, labcoat: 90, hero: 110 });
Object.assign(OVR.body, { human: 150 });
Object.assign(OVR.pattern, { apron: 60, poncho: 70, hawaiian: 70, astronaut: 130, kimono: 100, ninja: 90, raincoat: 80, lifevest: 70 });
Object.assign(OVR.pet, { blob: 60, cat: 90, dog: 90, duck: 70, bunny: 90, robot: 110, ghost: 100, dragon: 160, bee: 100, orb: 130 });
Object.assign(OVR.tagframe, { plate: 40, ribbon: 60, neon: 90, wood: 60, pixel: 70, scroll: 70, gold: 110 });
Object.assign(OVR.dice, { gold: 100, glass: 90, neon: 120, flame: 140, ice: 110, candy: 90 });
Object.assign(OVR.dice, { wood: 60, pixel: 80, lava: 130, galaxy: 150, bone: 90, bouncy: 70 });
Object.assign(OVR.tagframe, { chain: 70, ice: 80, candy: 60, circuit: 90, speech: 50 });
Object.assign(OVR.banner, { chalk: 60, blueprint: 70, graffiti: 80, royal: 110 });
Object.assign(OVR.spot, { lasers: 130, police: 100, rays: 120, theatre: 150 });
Object.assign(OVR.pet, { turtle: 90, fox: 100, penguin: 100, frog: 80, jelly: 120 });
Object.assign(OVR.pshape, { stack: 80, obelisk: 90 });
Object.assign(OVR.back, { fairy: 110, surf: 90, skate: 80 });
Object.assign(OVR.body, { cactus: 90, cloud: 100 });
Object.assign(OVR.vpose, { stomp: 70, inflate: 60, abduct: 120, cannon: 100, zap: 80 });
Object.assign(OVR.stage, { synthwave: 140, carnival: 130, beach: 90, volcano: 150 });
Object.assign(OVR.hat, { sailor: 40, safari: 60, magician: 100 });
Object.assign(OVR.face, { kawaii: 40, laser: 90, domino: 50 });
Object.assign(OVR.trail, { notes: 100, flake: 90, paw: 70 });
Object.assign(OVR.fx, { balloons: 90, comets: 130, notes: 110 });
Object.assign(OVR.vpose, { hero: 110, dab: 50 });
Object.assign(OVR.pet, { owl: 100, snail: 70, mushroom: 90 });
Object.assign(OVR.pattern, { tracksuit: 60, pirate: 110 });
Object.assign(OVR.coat, { argyle: 80, tiedye: 90 });
export const price = (c, v) => c === 'emote' ? (EMOTES[v]?.price || 0) : (OVR[c]?.[v] ?? BASE[c] ?? 50);
// Starter items everyone owns from the start (plus each category's default and 'none').
const STARTER = { hat: ['cone', 'cap', 'beanie', 'flower'], body: ['round', 'tall', 'bean'], face: ['glasses', 'happy', 'sleepy'], back: ['cape', 'tail', 'backpack'], pattern: ['stripes', 'belt', 'dots'] };   // only the basic dress-up categories start with extras
export const isFree = (c, v) => c === 'emote' ? !price(c, v) : (v === DEFAULT_LOOK[c] || v === 'none' || !!STARTER[c]?.includes(v));
// head / hand shapes cost nothing: you can use the shape of any body you own
export const owns = (c, v) => (c === 'head' || c === 'hands') ? (v === 'same' || owns('body', v)) : isFree(c, v) || owned.has(c + ':' + v);
const emit = () => subs.forEach(f => f());
export const gems = () => bal;
// First game of the local day pays a bonus (once per calendar day, per device).
export function claimDaily() { const d = new Date().toISOString().slice(0, 10); if (rd('pg-day', '') === d) return 0; wr('pg-day', d); return 10; }
export const onGems = f => subs.push(f);
export function addGems(n) { bal = Math.max(0, bal + (n | 0)); wr('pg-gems', bal); emit(); }
export function buy(c, v) {
  if (owns(c, v)) return true;
  if (c === 'head' || c === 'hands') return false;
  const p = price(c, v); if (bal < p) return false;
  bal -= p; owned.add(c + ':' + v); wr('pg-gems', bal); wr('pg-owned', [...owned]); emit(); return true;
}
// Saved outfits ("sets"): [{ n: name, look: { color, accent, ...owned items } }], up to 12, per device.
export const getSets = () => { const s = rd('pg-sets', []); return Array.isArray(s) ? s.filter(x => x && x.look).slice(0, 12) : []; };
export const setSets = a => { wr('pg-sets', a.slice(0, 12)); emit(); };
export const getSet = () => { const s = rd('pg-emoset', [0, 1, 2, 3, 4, 5, 6, 7]); return (Array.isArray(s) ? s : []).filter(i => EMOTES[i] && owns('emote', i)).slice(0, 16); };
export const setSet = a => { wr('pg-emoset', a.slice(0, 16)); emit(); };
// Base gems by placement (1st 12 ... last 3). Bonuses are added by the caller.
export const gemsFor = (rank, n) => n > 1 ? Math.round(12 - 9 * Math.min(rank, n - 1) / (n - 1)) : 8;
// Anything not owned falls back to the default (guards a hand-edited look in localStorage).
export function sanitizeLook(l) { const o = { ...l }; for (const k in OPTS) if (!owns(k, o[k])) o[k] = DEFAULT_LOOK[k]; return o; }
