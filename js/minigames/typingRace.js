import { sfx } from '../sfx.js';
import { scoreboard, jit, mix } from './util.js';
import * as THREE from 'three';
import { stage, fitDist } from './stage.js';
import { share, nameplate } from './kit.js';
// Word pool, bucketed by length. Each game picks WITHOUT repeats: 3 short, 4 medium, 3 long (difficulty ramps up).
const WORDS = `
adventure anchor angry apple arena arrow backpack bacon badge baker balloon banana bandage basement
beach beetle berry bingo blade blanket blast blaze blizzard bloom board bonfire bonus boost
bounce brave bread brick bridge brownie brush bubble buffalo butterfly cabin cabinet calendar camel
camping candle candy canyon capture caramel cards carnival carousel carpet cartoon castle chair chalk
champion charm cheese cherry chess chief chimney chipmunk chocolate cinnamon circus cliff clock cloud
clown cobweb coin comet comics compass cookie copper coral cottage couch cowboy cracker crane
crash crayon cricket crown crush crystal cupcake curtain cymbal dance dancing desert diary dice
dinner dinosaur dizzy dolphin donut doorbell dragon dragonfly dream drift drums dumpling eagle earth
elephant ember engine fabric fairy falcon fantasy feast fiber firework flame flamingo flash fleet
flute focus football freckle friend frost frosting fruit gadget galaxy garden gentle ghost giant
ginger gingerbread giraffe glacier glass glider globe glove goblin goose gorilla grape grass grill
guard guitar hammer hamster happy harbor harvest heart hedgehog helicopter honey horse hotel humor
hurricane iceberg igloo island jacket jackpot jelly jellyfish jewel joker juggler jump jungle kangaroo
kayak keyboard kingdom ladder lantern laser lemon leopard level light lizard lobster lollipop lucky
lullaby magic magnet mammoth maple marble meadow melon mermaid midnight mirror monkey mouse muffin
mushroom music mystery noble notebook nugget nutcracker ocean octopus olive onion orange orchestra otter
paint pancake panda paper parade parrot party peach peacock pearl penguin pepper piano pickle
pillow pinball pineapple pirate pixel pizza planet plaza pocket pony potion pretzel prince prize
pudding pumpkin puppet puzzle pyramid quartz quest quick quiet rabbit raccoon radar rainbow raven
ribbon robot rocket rooster saddle sailor salad sandal sandwich scarf school scooter seahorse shadow
shark sheep shield shiny shoot silver siren skate skater skeleton sleep slide smile snack
snowman spark sparkle spice spider spoon sport spring squid squirrel stadium stamp star starfish
statue steak storm straw strawberry stripe submarine sugar summer sunny sunset sunshine supper surprise
swamp sweater sweet swing sword table tambourine thunder tiger toast tomato tonic torch tornado
tower tractor train trampoline treasure treat tunnel turbo turtle twist umbrella valley vampire velvet
victory violin volcano voyage waffle wagon walnut walrus weasel whale wheel whistle wildcat willow
windmill window winter wizard wonder yacht yellow zebra zigzag zombie
`.split(/\s+/).filter(Boolean);
const EASY = WORDS.filter(w => w.length <= 5), MID = WORDS.filter(w => w.length >= 6 && w.length <= 7), HARD = WORDS.filter(w => w.length >= 8);
const pick = (rng, pool, n) => { const a = [...pool]; for (let i = a.length - 1; i > 0; i--) { const j = rng() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
const norm = s => s.trim().toLowerCase();   // forgiving: ignores caps and spaces at the start/end (mobile keyboards capitalise the first letter)
// Set: a river boat race. Every finished word surges your boat toward the finish gate; typos rock it. Everyone's progress is shared live.
const X0 = -13, X1 = 12.5;
export default {
  emotes: false, name: 'Typing Race', desc: 'Type each word exactly - it advances automatically. 10 words, fastest wins. Press Enter on a typo for a 2s penalty.',
  create(ctx) {
    const sb = scoreboard(ctx, { timeout: 70, bot: s => { const T = jit(mix(52, 24, s), .15); return { v: Math.round(T * 1000 + (Math.random() < mix(.5, .1, s) ? 2000 : 0)), t: T }; } }), list = [...pick(ctx.rng, EASY, 3), ...pick(ctx.rng, MID, 4), ...pick(ctx.rng, HARD, 3)];
    let i = 0, errs = 0, time = 0, done = false, tt = 0;
    const W = ctx.world, ids = Object.keys(ctx.players), n = ids.length, me = ctx.me, st = {}, disp = {}, np = {}, boat = {};
    ids.forEach(id => { st[id] = { i: 0, e: 0 }; disp[id] = 0; });
    const el = document.createElement('div'); el.className = 'mg';
    el.innerHTML = '<h3 id="s"></h3><h2 id="w"></h2><input id="a" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" style="font-size:22px;text-align:center;width:200px">'; ctx.hud.append(el);
    const s = el.querySelector('#s'), w = el.querySelector('#w'), inp = el.querySelector('#a'); setTimeout(() => inp.focus(), 50);

    // ---------- the set ----------
    const dist = fitDist(W, 16.5, 20), lz = k => (k - (n - 1) / 2) * 2.6, half = n * 1.3 + 2.4;
    const S = stage(ctx, { sky: 0x9fd8ff, fog: { color: 0x9fd8ff, near: 50, far: 120 }, light: 1.15, sun: { intensity: 1.2, pos: [6, 16, 10] }, cam: { pos: [0, 10.5, dist], look: [0, 0, 0] }, camFrom: [0, 16, dist + 10], camT: 1.4 });
    S.box(110, .5, half * 2, 0x2a8fd6, 0, -.5, 0); S.box(110, .8, 30, 0x5fae4c, 0, -.8, -(half + 15)); S.box(110, .8, 30, 0x5fae4c, 0, -.8, half + 15);   // river + banks
    for (let k = 0; k < 16; k++) { const x = -40 + k * 5.4, z = (k % 2 ? 1 : -1) * (half + 2 + k % 3 * 2); S.cyl(.25, .3, 1.5, 0x6b4a2b, x, 0, z, { seg: 5 }); S.cone(1.6, 3.6, 0x2f7d3a, x, 1.3, z, { seg: 6 }); }
    const buoys = new THREE.InstancedMesh(new THREE.SphereGeometry(.14, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }), (n + 1) * 14), dm = new THREE.Object3D(); let bi = 0;
    for (let k = 0; k <= n; k++) for (let j = 0; j < 14; j++) { dm.position.set(X0 - 1 + j * 2.1, .1, (k - n / 2) * 2.6); dm.updateMatrix(); buoys.setMatrixAt(bi++, dm.matrix); }
    S.root.add(buoys);
    [-1, 1].forEach(sd => S.box(.4, 5, .4, 0xe74c3c, X1 + 2.4, 0, sd * (half - .3))); S.box(.3, .3, half * 2, 0xffffff, X1 + 2.4, 5, 0);
    const ban = S.screen(7, 1.1, 512, 80); ban.mesh.rotation.y = Math.PI / 2; ban.mesh.position.set(X1 + 2.4, 5.7, 0); ban.draw((c, W_, H_) => { c.fillStyle = '#111'; c.fillRect(0, 0, W_, H_); c.fillStyle = '#ffd93d'; c.font = 'bold 60px sans-serif'; c.textAlign = 'center'; c.fillText('FINISH', W_ / 2, 62); });
    ids.forEach((id, k) => {
      const col = ctx.players[id].color, g = new THREE.Group(); S.root.add(g); boat[id] = g;
      S.box(2.8, .55, 1.3, col, 0, 0, 0, { p: g }); S.cone(.7, 1.3, col, 1.7, 0, 0, { p: g, seg: 4 }).rotation.z = -Math.PI / 2; S.box(.12, 2.6, .12, 0x6b4a2b, -.9, .55, 0, { p: g }); S.box(.05, 1.6, 1, 0xffffff, -.9, 1.1, 0, { p: g, op: .9 });
      W.put(id, X0, lz(k), Math.PI / 2, .5); np[id] = nameplate(S, ctx, id); np[id].mesh.position.set(X0, 3.4, lz(k)); np[id].set('0/10');
    });
    S.anim((dt, tn) => {
      tt += dt;
      ids.forEach((id, k) => {
        const cur = id === me ? i : st[id].i, d = disp[id] += (cur - disp[id]) * Math.min(1, dt * 5), x = X0 + (X1 - X0) * d / list.length, bob = Math.sin(tn * 2 + k) * .07;
        boat[id].position.set(x, bob, lz(k)); W.warp(id, x, lz(k)); W.lift(id, .55 + bob); np[id].mesh.position.set(x, 3.5, lz(k));
        if (!W.m.get(id)?.emo) W.lean(id, Math.abs(cur - d) > .05 ? .22 : 0);
        np[id].set(cur >= list.length ? 'DONE!' : `${cur}/${list.length}${(id === me ? errs : st[id].e) ? '  x' + (id === me ? errs : st[id].e) : ''}`, false);
      });
    });
    const net = share(ctx, 't', ev => { const q = st[ev.id]; if (!q) return; if ((ev.i | 0) > q.i) W.hop(ev.id, .35); st[ev.id] = { i: ev.i | 0, e: ev.e | 0 }; if (ev.i >= list.length) W.emote(ev.id, 'cheer'); });

    // ---------- play ----------
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && norm(inp.value) && norm(inp.value) !== list[i]) { errs++; sfx('lose'); inp.value = ''; W.emote(me, 'shake'); W.popIcon(me, '❌'); net.emit({ i, e: errs }); } };
    inp.oninput = () => {
      if (done || norm(inp.value) !== list[i]) return;
      inp.value = ''; i++; sfx('click'); W.hop(me, .35); net.emit({ i, e: errs });
      if (i >= list.length) { done = true; inp.disabled = true; sb.report(Math.round(time * 1000 + errs * 2000)); W.emote(me, 'cheer'); }
    };
    return {
      update(dt) {
        sb.prog(i / list.length), sb.tick(dt); if (!done) time += dt;
        w.textContent = done ? 'Done!' : list[i]; s.textContent = done ? `${(time + errs * 2).toFixed(1)}s - waiting for others...` : `${i}/${list.length}   ${time.toFixed(1)}s   Typos: ${errs}`;
        if (!done && document.activeElement !== inp) inp.focus();
      },
      endNow() { sb.endNow(); },
      onMessage(m, from) { if (net.handle(m, from)) return; sb.onMessage(m, from); },
      cleanup() { el.remove(); S.cleanup(); },
    };
  },
};
