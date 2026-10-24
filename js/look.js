// Player appearance options (shared by menu, lobby, host validation and world.js).
// To add an option: add it to OPTS here, then handle the value in World.add() (world.js).
export const COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8',
  '#34495e', '#ecf0f1', '#a0522d', '#8bc34a'];
export const ACCENTS = ['#ffd93d', '#ffffff', '#222222', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#fd79a8'];
export const OPTS = {
  hat: { label: 'Hat', vals: { none: 'No hat', cone: 'Party cone', top: 'Top hat', ears: 'Bunny ears', halo: 'Halo', crown: 'Crown', wizard: 'Wizard hat', cap: 'Cap', horns: 'Horns', propeller: 'Propeller', antenna: 'Antenna' } },
  body: { label: 'Body', vals: { box: 'Box', round: 'Round', tall: 'Tall', pyramid: 'Pyramid' } },
  face: { label: 'Face', vals: { eyes: 'Eyes', glasses: 'Glasses', shades: 'Sunglasses', mustache: 'Mustache', cyclops: 'Cyclops', none: 'Blank' } },
  trail: { label: 'Trail', vals: { none: 'No trail', sparkle: 'Sparkles', flame: 'Flames', rainbow: 'Rainbow' } },
};
export const DEFAULT_LOOK = { color: COLORS[0], accent: ACCENTS[0], hat: 'none', body: 'box', face: 'eyes', trail: 'none' };
// Everything except `color` (which the host dedupes per player).
export function cleanLook(l = {}) {
  const o = { accent: ACCENTS.includes(l.accent) ? l.accent : DEFAULT_LOOK.accent };
  for (const k in OPTS) o[k] = l[k] in OPTS[k].vals ? l[k] : DEFAULT_LOOK[k];
  return o;
}

// A random look (everything but the trail, which stays off) -- used for bots.
export function randomLook() {
  const pick = a => a[Math.random() * a.length | 0], o = { accent: pick(ACCENTS) };
  for (const k in OPTS) o[k] = k === 'trail' ? 'none' : pick(Object.keys(OPTS[k].vals));
  return o;
}
