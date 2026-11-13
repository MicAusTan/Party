// Tiny WebAudio synth: no audio files. Usage: sfx('coin'). Mute is remembered.
let ctx = null, muted = false;
try { muted = localStorage.getItem('pg-mute') === '1'; } catch {}
function tone(f, d, type = 'square', v = .07, t0 = 0, slide = 0) {
  if (muted) return;
  try {
    const c = ctx ??= new (window.AudioContext || window.webkitAudioContext)(); if (c.state === 'suspended') c.resume();
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d);
  } catch {}
}
const N = [262, 330, 392, 440, 523, 659, 784, 880];
const S = {
  shove: () => tone(220, .14, 'sawtooth', .07, 0, 2.2),
  ...Object.fromEntries(N.map((f, i) => ['n' + i, () => tone(f, .22, 'triangle', .12)])),       // n0..n7: a rising scale, for memory / pattern games
  click: () => tone(600, .05),
  tick: () => tone(440, .12),
  go: () => tone(880, .3),
  join: () => tone(660, .1, 'triangle', .08),
  roll: () => { for (let i = 0; i < 6; i++) tone(300 + Math.random() * 300, .05, 'square', .05, i * .05); },
  step: () => tone(260, .06, 'triangle', .1),
  coin: () => { tone(988, .08); tone(1319, .15, 'square', .07, .08); },
  lose: () => tone(300, .25, 'sawtooth', .07, 0, .5),
  star: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .15, 'square', .07, i * .09)),
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'square', .07, i * .12)),
  shoot: () => tone(700, .08, 'sawtooth', .035, 0, .4),
  hit: () => tone(160, .12, 'sawtooth', .08, 0, .5),
  fall: () => tone(500, .5, 'sine', .07, 0, .15),
  dash: () => tone(200, .15, 'sawtooth', .06, 0, 3),
  pop: () => { tone(900, .07, 'triangle', .1, 0, .3); tone(1400, .04, 'square', .03, 0, .5); },
  ding: () => { tone(1047, .35, 'sine', .1); tone(1568, .5, 'sine', .07, .08); },
  correct: () => { tone(784, .08, 'triangle', .1); tone(1175, .14, 'triangle', .1, .07); },
  jump: () => tone(320, .16, 'square', .05, 0, 2.2),
  whoosh: () => tone(500, .22, 'sawtooth', .03, 0, .2),
  tickhi: () => tone(880, .1, 'square', .08),
  erupt: () => { tone(90, .7, 'sawtooth', .1, 0, .5); tone(140, .5, 'square', .05, .1, .4); },
};
export const sfx = n => S[n]?.();
export const isMuted = () => muted;
export const toggleMute = () => { muted = !muted; try { localStorage.setItem('pg-mute', muted ? '1' : '0'); } catch {} return muted; };
