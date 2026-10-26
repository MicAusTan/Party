// Player appearance options (shared by menu, lobby, host validation and world.js).
// To add an option: add it to OPTS here, then handle the value in World.add() (world.js).
export const COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8',
  '#34495e', '#ecf0f1', '#a0522d', '#8bc34a', '#00bcd4', '#ff5252', '#7e57c2', '#ffb74d', '#4db6ac', '#f06292', '#90a4ae', '#795548'];
export const ACCENTS = ['#ffd93d', '#ffffff', '#222222', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#fd79a8', '#ff9f1a', '#1abc9c', '#8bc34a', '#00e5ff', '#ff4081', '#b388ff', '#795548', '#ffcc80'];
export const OPTS = {
  hat: { label: 'Hat', vals: { none: 'No hat', cone: 'Party cone', top: 'Top hat', ears: 'Bunny ears', halo: 'Halo', crown: 'Crown', wizard: 'Wizard hat', cap: 'Cap', horns: 'Horns', propeller: 'Propeller', antenna: 'Antenna', pirate: 'Pirate', chef: 'Chef', beanie: 'Beanie', sombrero: 'Sombrero', viking: 'Viking', flower: 'Flower', catears: 'Cat ears', mohawk: 'Mohawk', tiara: 'Tiara', bow: 'Hair bow', headphones: 'Headphones', santa: 'Santa hat', cowboy: 'Cowboy', jester: 'Jester', helmet: 'Knight helm', ufo: 'UFO', bucket: 'Bucket hat', duck: 'Rubber duck' } },
  body: { label: 'Body', vals: { box: 'Box', round: 'Round', tall: 'Tall', pyramid: 'Pyramid', bean: 'Bean', diamond: 'Diamond', barrel: 'Barrel', chunky: 'Chunky', ico: 'Gem ball', hexa: 'Hex block', top: 'Spinning top', snowman: 'Snowman' } },
  face: { label: 'Face', vals: { eyes: 'Eyes', glasses: 'Glasses', shades: 'Sunglasses', mustache: 'Mustache', cyclops: 'Cyclops', none: 'Blank', happy: 'Happy', angry: 'Angry', sleepy: 'Sleepy', cat: 'Cat', eyepatch: 'Eyepatch', visor: 'Visor', blush: 'Blushing', wink: 'Wink', surprised: 'Surprised', monocle: 'Monocle', robot: 'Robot', bigeyes: 'Big eyes' } },
  back: { label: 'Back', vals: { none: 'Nothing', cape: 'Cape', wings: 'Wings', backpack: 'Backpack', tail: 'Tail', jetpack: 'Jetpack', shell: 'Shell', bat: 'Bat wings', angel: 'Angel wings', balloon: 'Balloon', flag: 'Flag' } },
  pattern: { label: 'Outfit', vals: { none: 'Plain', stripes: 'Stripes', belt: 'Belt', dots: 'Polka dots', scarf: 'Scarf', sash: 'Sash', bowtie: 'Bow tie', badge: 'Badge', checker: 'Checkers' } },
  aura: { label: 'Aura', vals: { none: 'None', ring: 'Glow ring', twin: 'Twin rings', disc: 'Glow disc', dotring: 'Orb ring', hex: 'Hex ring', beam: 'Light beam' } },
  ped: { label: 'Pedestal', vals: { classic: 'Classic', marble: 'Marble', candy: 'Candy', ice: 'Ice', neon: 'Neon', lava: 'Lava', gold: 'Solid gold', rainbow: 'Rainbow', void: 'Void', matrix: 'Matrix', wood: 'Wood', steel: 'Steel', copper: 'Copper', pearl: 'Pearl', obsidian: 'Obsidian', bubblegum: 'Bubblegum', sandstone: 'Sandstone' } },
  fx: { label: 'Win effect', vals: { confetti: 'Confetti', snow: 'Snowfall', bubbles: 'Bubbles', stars: 'Stars', gold: 'Gold coins', fireworks: 'Fireworks', lanterns: 'Lanterns', rain: 'Rain', embers: 'Embers', petals: 'Petals', leaves: 'Leaves', sparks: 'Sparks', diamonds: 'Diamonds' } },
  vpose: { label: 'Victory pose', vals: { cheer: 'Cheer', love: 'Heart eyes', cool: 'Too cool', giggle: 'Giggle', wiggle: 'Wiggle', shake: 'Rage-win', sad: 'Dramatic', tilt: 'Confused' } },
  crest: { label: 'Banner crest', vals: { trophy: '🏆 Trophy', crown: '👑 Crown', dragon: '🐉 Dragon', unicorn: '🦄 Unicorn', pizza: '🍕 Pizza', rocket: '🚀 Rocket', cat: '🐱 Cat', skull: '💀 Skull', dino: '🦖 Dino', octopus: '🐙 Octopus', donut: '🍩 Donut', fire: '🔥 Fire', rainbow: '🌈 Rainbow', swords: '⚔️ Swords', guitar: '🎸 Guitar', invader: '👾 Invader' } },
  spot: { label: 'Spotlight', vals: { gold: 'Gold', rose: 'Rose', ice: 'Ice', lime: 'Lime', violet: 'Violet', blood: 'Blood red', orange: 'Orange', teal: 'Teal', white: 'Pure white', magenta: 'Magenta' } },
  stage: { label: 'Podium stage', vals: { night: 'Night', sunset: 'Sunset', ocean: 'Deep ocean', forest: 'Forest', candy: 'Candy', void: 'The void', storm: 'Storm', desert: 'Desert', arctic: 'Arctic', lava: 'Lava cave', cosmos: 'Cosmos', meadow: 'Meadow' } },
  title: { label: 'Title', vals: { none: 'No title', rookie: '🌱 Rookie', lucky: '🍀 Lucky', speedy: '⚡ Speedy', chill: '😎 Chill', menace: '😈 Menace', hoarder: '⭐ Star Hoarder', champ: '🏆 Champ', royal: '👑 Royalty', brain: '🧠 Big Brain', fire: '🔥 On Fire', owl: '🌙 Night Owl', sniper: '🎯 Sharpshooter', turtle: '🐢 Slow & Steady', spender: '💸 Big Spender', sneaky: '👻 Sneaky', legend: '🌈 Legend' } },
  trail: { label: 'Trail', vals: { none: 'No trail', sparkle: 'Sparkles', flame: 'Flames', rainbow: 'Rainbow', bubbles: 'Bubbles', hearts: 'Hearts', stars: 'Stars', smoke: 'Smoke', toxic: 'Toxic', ice: 'Frost', void: 'Void' } },
};
export const DEFAULT_LOOK = { color: COLORS[0], accent: ACCENTS[0], hat: 'none', body: 'box', face: 'eyes', back: 'none', pattern: 'none', aura: 'none', trail: 'none', ped: 'classic', fx: 'confetti', title: 'none', vpose: 'cheer', crest: 'trophy', spot: 'gold', stage: 'night' };
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
