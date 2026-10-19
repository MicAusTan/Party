// To add a minigame: create a file exporting { name, desc, create(ctx) } and add it here.
// create(ctx) returns { update(dt), onMessage(msg, from), cleanup() }.
// ctx: { players, me, isHost, hud, esc, rng (seeded, identical on all clients),
//        world (Three.js scene access, showDeco(false) hides the floor),
//        finish(ids, ranks?): ranks[i] = place of ids[i]; equal ranks tie (use for teams / co-op).
//        send(msg): client -> host, or host -> everyone; finish(idsBestFirst): host only }
import buttonMash from './buttonMash.js';
import memoryRun from './memoryRun.js';
import shoveOff from './shoveOff.js';
import rounds from './rounds.js';
import quickDraw from './quickDraw.js';
import stopClock from './stopClock.js';
import mathRace from './mathRace.js';
import coinGrab from './coinGrab.js';
import dodgeRain from './dodgeRain.js';
import hotPotato from './hotPotato.js';
import targetClick from './targetClick.js';
import colorFloor from './colorFloor.js';
import mazeRace from './mazeRace.js';
import memoryMatch from './memoryMatch.js';
import tugOfWar from './tugOfWar.js';
import higherLower from './higherLower.js';
import typingRace from './typingRace.js';
import rhythmRush from './rhythmRush.js';
import hillHold from './hillHold.js';
import relayRace from './relayRace.js';
import towerStack from './towerStack.js';
import syncPulse from './syncPulse.js';
import snowballFight from './snowballFight.js';
import simonSays from './simonSays.js';
import numberSort from './numberSort.js';
import colorClash from './colorClash.js';
import balloonPop from './balloonPop.js';
import oddOneOut from './oddOneOut.js';
import redLight from './redLight.js';
import flagRush from './flagRush.js';
export const MINIGAMES = { buttonMash, memoryRun, shoveOff, rounds, quickDraw, stopClock, mathRace, coinGrab, dodgeRain, hotPotato, targetClick, colorFloor, mazeRace, memoryMatch, tugOfWar, higherLower, typingRace, rhythmRush, hillHold, relayRace, towerStack, syncPulse, snowballFight, simonSays, numberSort, colorClash, balloonPop, oddOneOut, redLight, flagRush };
