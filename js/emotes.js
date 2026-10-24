import { sfx } from './sfx.js';
// Emote catalog. Index = what goes over the network, so only ever APPEND (never reorder).
// pose: a World.emote() kind. burst: optional particle colour. Everything here is cosmetic.
export const EMOTES = [
  { n: 'Hello', ch: '👋', pose: 'wiggle' },
  { n: 'Haha', ch: '😂', pose: 'giggle' },
  { n: 'Party', ch: '🎉', pose: 'cheer', burst: '#ffd93d' },
  { n: 'Sad', ch: '😢', pose: 'sad' },
  { n: 'Grr', ch: '😡', pose: 'shake' },
  { n: 'Hmm', ch: '🤔', pose: 'tilt' },
  { n: 'Love', ch: '❤️', pose: 'love', burst: '#ff6b9d' },
  { n: 'Cool', ch: '😎', pose: 'cool' },
];
export function playEmote(world, id, i, mine) {
  const e = EMOTES[i], g = world.m.get(id)?.g; if (!e || !g) return;
  world.emote(id, e.pose); world.popIcon(id, e.ch);
  if (e.burst) world.burst(g.position.x, g.position.y + 1.6, g.position.z, e.burst, 14);
  if (mine) sfx('click');
}
