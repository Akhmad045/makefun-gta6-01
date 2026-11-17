// shots.js — the four screenshot scenes behind ?shot=cover|drive|city|start.
// Each one plays the real rules forward from a fresh seeded world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a short
// game really looks like and the same seed always gives the same frame.

import { SCREENS } from './world.js';
import { MISSIONS } from './missions.js';

const STEP = 1 / 60;

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** A fake input object the autopilot fills in fresh every step. */
function makeAutoInput() {
  const held = new Set();
  return {
    held: (group) => {
      if (group === 'up') return held.has('up');
      if (group === 'down') return held.has('down');
      if (group === 'left') return held.has('left');
      if (group === 'right') return held.has('right');
      if (group === 'brake') return held.has('brake');
      return false;
    },
    wasPressed: () => false,
    mouse: { x: 640, y: 400, down: false, clicked: false },
    set: (group, value) => {
      if (value) held.add(group);
      else held.delete(group);
    },
    clear: () => held.clear(),
  };
}

/** Steer a car toward a list of waypoints, in order. Returns true when done. */
function driveToward(world, input, waypoints, state) {
  const car = world.player.inCar;
  if (!car) return true;
  const target = waypoints[Math.min(state.wp, waypoints.length - 1)];
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  if (Math.hypot(dx, dy) < 70) {
    state.wp += 1;
    if (state.wp >= waypoints.length) return true;
  }
  const want = Math.atan2(dy, dx);
  const diff = angleDiff(car.angle, want);
  input.set('left', diff < -0.08);
  input.set('right', diff > 0.08);
  // Brake for a sharp turn instead of swinging wide into the buildings.
  const sharpTurn = Math.abs(diff) > 0.6;
  input.set('up', !sharpTurn && Math.abs(car.speed) < car.maxSpeed * 0.85);
  input.set('down', sharpTurn);
  return false;
}

/** Walk toward a point. */
function walkToward(world, input, tx, ty) {
  const p = world.player;
  const dx = tx - p.x;
  const dy = ty - p.y;
  input.set('right', dx > 12);
  input.set('left', dx < -12);
  input.set('down', dy > 12);
  input.set('up', dy < -12);
  return Math.hypot(dx, dy) < 30;
}

function mouseWorldOf(world) {
  return { x: world.player.x + 120, y: world.player.y - 40 };
}

/**
 * Set `world` to the named scene and return the screen to draw. The world is
 * always reset first, so every scene starts from the same seed.
 */
export function stageShot(name, world, stepWorld) {
  const input = makeAutoInput();
  const state = { wp: 0 };

  if (name === 'start') {
    world.screen = SCREENS.TITLE;
    world.hasSave = false;
    world.titleChoice = 0;
    return;
  }

  if (name === 'cover') {
    // Mission 3, mid-escape: Rae in the red Veloce GT, three stars, three police
    // cars closing in, racing for the Old Port garage.
    world.screen = SCREENS.PLAY;
    world.mission.index = 2;
    world.mission.stage = 1;
    world.mission.active = true;
    const heist = world.mission.heistCar;
    heist.x = 1430;
    heist.y = 910;
    heist.angle = 0;
    world.player.x = heist.x;
    world.player.y = heist.y;
    world.player.inCar = heist;
    world.wanted = 3;
    world.cash = 1240;
    const waypoints = [
      { x: 2210, y: 910 },
      { x: 2210, y: 1690 },
      { x: 650, y: 1690 },
      { x: 650, y: 2210 },
    ];
    for (let i = 0; i < 10 / STEP; i += 1) {
      input.clear();
      driveToward(world, input, waypoints, state);
      stepWorld(world, STEP, input, mouseWorldOf(world));
      if (world.screen !== SCREENS.PLAY) break;
    }
    return;
  }

  if (name === 'drive') {
    // Mission 1, the client aboard: driving the yellow cab to the Marina Bay docks.
    world.screen = SCREENS.PLAY;
    world.mission.index = 0;
    world.mission.stage = 1;
    world.mission.active = true;
    const cab = world.cars[0];
    cab.x = 1170;
    cab.y = 2210;
    cab.angle = 0;
    world.player.x = cab.x;
    world.player.y = cab.y;
    world.player.inCar = cab;
    world.cash = 370;
    const waypoints = [
      { x: 2210, y: 2210 },
      { x: 2470, y: 2210 },
    ];
    for (let i = 0; i < 3.2 / STEP; i += 1) {
      input.clear();
      driveToward(world, input, waypoints, state);
      stepWorld(world, STEP, input, mouseWorldOf(world));
      if (world.screen !== SCREENS.PLAY) break;
    }
    return;
  }

  // city: on foot in Downtown by Solmar Plaza, among pedestrians and traffic.
  world.screen = SCREENS.PLAY;
  world.mission.index = 0;
  world.mission.stage = 0;
  world.mission.active = true;
  world.player.x = 1300;
  world.player.y = 1420;
  world.player.inCar = null;
  world.cash = 120;
  for (let i = 0; i < 3.5 / STEP; i += 1) {
    input.clear();
    walkToward(world, input, 1300, 1280);
    stepWorld(world, STEP, input, mouseWorldOf(world));
    if (world.screen !== SCREENS.PLAY) break;
  }
}
