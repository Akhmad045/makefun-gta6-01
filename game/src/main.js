// main.js — boots Solmar Bay.
// Sizes the canvas, reads ?shot= and ?seed=, runs the fixed-step loop, and feeds
// the sound bank from the world each frame.

import { createWorld, updateWorld, loadSave, SCREENS } from './world.js';
import { renderWorld } from './render.js';
import { stageShot } from './shots.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '20261117') >>> 0;
const shotName = params.get('shot') || '';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

const world = createWorld(seed);
world.sound = new SoundBank();
try {
  world.hasSave = !!localStorage.getItem('solmar-bay-save-v1');
} catch {
  world.hasSave = false;
}
const input = new Input();
input.attach();

function mouseWorld() {
  return {
    x: world.camera.x - canvas.width / 2 + input.mouse.x,
    y: world.camera.y - canvas.height / 2 + input.mouse.y,
  };
}

if (shotName) {
  // Screenshot mode: stage the scene deterministically, draw once, stop.
  // No sound, no save, no input — the frame is the game, frozen mid-play.
  world.hasSave = false;
  stageShot(shotName, world, updateWorld);
  renderWorld(ctx, world, canvas.width, canvas.height);
  document.title = `Solmar Bay — shot ${shotName}`;
  window.__shotReady = true;
} else {
  const status = document.getElementById('status');
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateWorld(world, dt, input, mouseWorld());
    input.endFrame();
    renderWorld(ctx, world, canvas.width, canvas.height);
    if (world.sound) {
      const car = world.player.inCar;
      world.sound.setEngine(car ? Math.abs(car.speed) / car.maxSpeed : 0);
      world.sound.setSiren(world.wanted > 0 && world.screen === SCREENS.PLAY, world.time);
    }
    if (status) {
      const mission = world.mission;
      status.textContent = world.screen === SCREENS.TITLE
        ? 'Solmar Bay. Press Enter to start.'
        : `Cash $${world.cash}. Wanted level ${world.wanted}. ${mission.index < 3 ? 'Mission ' + (mission.index + 1) + ' of 3.' : 'All missions complete.'}`;
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('keydown', () => world.sound.unlock(), { once: true });
  window.addEventListener('mousedown', () => world.sound.unlock(), { once: true });
  requestAnimationFrame(frame);
}
