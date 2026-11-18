// Boot and the one loop for Solmar Bay: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there. The
// game moves between five screens: title, play, paused, busted and wrecked.
// ?seed=N fixes the city and the traffic. ?shot=start|drive|city|cover (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { SAVE_KEY, STEP, VIEW } from './config.js';
import { seededRng } from './random.js';
import { EVENT_BUSTED, EVENT_WRECKED, createWorld } from './world.js';
import { ACT_CONFIRM, ACT_ENTER, ACT_FIRE, ACT_MUTE, ACT_PAUSE, createInput } from './input.js';
import { SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WRECKED, createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let save = readSave();

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.snapshot()));
    save = readSave();
  } catch {
    // Storage can be off (private windows): progress then lasts this visit.
  }
}

const world = createWorld(seededRng(seed), { audio, saveGame });
world.restoreSave(save);
// A read-only handle for automated checks (playtests, screenshots).
window.__solmarWorld = world;
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw({ state: world.state, director: world.director, screen: scene.screen, save });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  // The mouse aims in screen pixels; the world needs world units. This is the
  // inverse of the renderer's camera transform, recomputed from the same
  // numbers (logical 1280 x 800 view, device pixel ratio, camera zoom).
  function screenToWorld(mx, my) {
    const ratio = window.devicePixelRatio || 1;
    const cw = window.innerWidth * ratio;
    const ch = window.innerHeight * ratio;
    const vs = Math.min(cw / VIEW.width, ch / VIEW.height);
    const ox = (cw - VIEW.width * vs) / 2;
    const oy = (ch - VIEW.height * vs) / 2;
    const scale = vs * world.state.camera.zoom;
    const cx = ox + (VIEW.width * vs) / 2;
    const cy = oy + (VIEW.height * vs) / 2;
    return {
      x: world.state.camera.x + (mx * ratio - cx) / scale,
      y: world.state.camera.y + (my * ratio - cy) / scale,
    };
  }

  function startGame() {
    world.reset();
    world.restoreSave(save);
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.resume();
    announce('Playing. Drive to the gold marker - Marisol is waiting.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACT_MUTE) {
      audio.setMuted(!audio.isMuted());
      announce(audio.isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACT_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_BUSTED || screen === SCREEN_WRECKED)) {
      startGame();
    } else if (actions & ACT_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACT_PAUSE | ACT_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return actions;
  }

  function stepGame(dt, actions) {
    const move = input.move();
    const aim = screenToWorld(input.mouse.x, input.mouse.y);
    const cmd = {
      move,
      enter: Boolean(actions & ACT_ENTER),
      fire: Boolean(actions & ACT_FIRE),
      firing: input.isMouseDown(),
      aimX: aim.x,
      aimY: aim.y,
    };
    const events = world.step(dt, cmd, false);
    if (events & EVENT_BUSTED) {
      screen = SCREEN_BUSTED;
      announce('Busted by the police.');
    } else if (events & EVENT_WRECKED) {
      screen = SCREEN_WRECKED;
      announce('Rae is down. The city keeps moving.');
    }
    return cmd;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        world.step(STEP, { move: { x: 0, y: 0 }, enter: false, fire: false, firing: false, aimX: 0, aimY: 0 }, true);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        // One-shot presses belong to the first step only; later steps in the
        // same frame get a clean command.
        stepGame(STEP, first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw({ state: world.state, director: world.director, screen, save });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      saveGame();
    }
  });

  announce('Solmar Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
