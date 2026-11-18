// The screenshot scenes behind ?shot=start|drive|city|cover. Each one plays the
// real rules forward from a fresh seeded world for a fixed number of steps,
// steered by a simple autopilot that walks to the cab, gets in, and drives the
// road grid toward the mission marker, so the frame is what a short game really
// looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const DRIVE_SECONDS = 22;
const CITY_SECONDS = 26;
const COVER_SECONDS = 16;

function idleCmd() {
  return { move: { x: 0, y: 0 }, enter: false, fire: false, firing: false, aimX: 0, aimY: 0 };
}

function nearestIn(list, value) {
  let best = list[0];
  let bestD = Infinity;
  for (const v of list) {
    const d = Math.abs(v - value);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Drive toward the mission marker along the road grid: first to the crossing
// street nearest the marker, then along it, then up the avenue to the marker.
// Drive toward the mission marker along the road grid: first to the crossing
// street nearest the marker, then along it, then up the avenue to the marker.
// The route is re-planned whenever the goal changes, and whenever the car
// ends up off the roads it first drives back to the nearest intersection.
function roadPilot(state, city, memory) {
  const car = state.player.car;
  const goal = state.marker || state.fareMarker;
  const cmd = idleCmd();
  cmd.aimX = car.x + Math.cos(car.angle) * 100;
  cmd.aimY = car.y + Math.sin(car.angle) * 100;

  const rx = nearestIn(city.roadsV, car.x);
  const ry = nearestIn(city.roadsH, car.y);
  const onV = Math.abs(car.x - rx) < 60;
  const onH = Math.abs(car.y - ry) < 60;

  let waypoint;
  if (!goal) {
    waypoint = { x: rx, y: ry };
  } else if (!onV && !onH) {
    // Off the grid (a bad turn, a shove): get back to the nearest corner.
    memory.leg = 0;
    waypoint = { x: rx, y: ry };
  } else {
    if (memory.lastGoal !== goal) {
      memory.lastGoal = goal;
      memory.leg = 0;
    }
    const gx = nearestIn(city.roadsV, goal.x);
    const gy = nearestIn(city.roadsH, goal.y);
    if (memory.leg === 0) {
      waypoint = onV ? { x: rx, y: gy } : { x: gx, y: ry };
      if (Math.hypot(car.x - waypoint.x, car.y - waypoint.y) < 70) memory.leg = 1;
    }
    if (memory.leg === 1) {
      waypoint = { x: gx, y: gy };
      if (Math.hypot(car.x - waypoint.x, car.y - waypoint.y) < 70) memory.leg = 2;
    }
    if (memory.leg === 2) waypoint = goal;
  }

  const dx = waypoint.x - car.x;
  const dy = waypoint.y - car.y;
  const distance = Math.hypot(dx, dy);
  const desired = Math.atan2(dy, dx);
  const diff = normAngle(desired - car.angle);
  const speed = Math.abs(car.speed);

  // Facing mostly away from the waypoint (a U-turn after a pickup, for
  // example): do a three-point turn - reverse while steering the other way -
  // instead of swinging a wide arc through the block.
  if (Math.abs(diff) > 2.4 && speed < 120) {
    cmd.move = { x: diff > 0 ? -1 : 1, y: 1 };
    return cmd;
  }

  // Turn like a driver, not a missile: brake down to a crawl before a sharp
  // turn, crawl through it, and only open the throttle once the nose is
  // pointing down the road. A fast car cannot make a 90-degree turn inside a
  // 72-unit road, and a standing car cannot steer at all, so both extremes
  // get throttle and the middle gets the brake.
  let throttle;
  if (distance < 90 && goal) throttle = 0;
  else if (Math.abs(diff) < 0.5) throttle = -1;
  else if (speed > 130) throttle = 1;
  else if (speed < 60) throttle = -1;
  else throttle = 0;
  cmd.move = { x: Math.max(-1, Math.min(1, diff * 1.6)), y: throttle };

  // Stuck against something: back up for a moment, steering the other way,
  // then re-plan the route from the start instead of pushing at the same wall.
  if (speed < 25 && throttle === -1) {
    memory.stuck += 1 / 60;
  } else {
    memory.stuck = 0;
  }
  if (memory.stuck > 1.0) {
    cmd.move = { x: -cmd.move.x, y: 1 };
    if (memory.stuck > 2.6) {
      memory.stuck = 0;
      memory.leg = 0;
    }
  }
  return cmd;
}

function autopilot(state, memory) {
  const cmd = idleCmd();
  const p = state.player;
  if (p.onFoot) {
    const cab = state.cars.find((car) => car.kind === 'cab' && !car.wrecked);
    if (!cab) return cmd;
    const dx = cab.x - p.x;
    const dy = cab.y - p.y;
    const d = Math.hypot(dx, dy);
    cmd.aimX = cab.x;
    cmd.aimY = cab.y;
    if (d < 85) {
      cmd.enter = true;
      return cmd;
    }
    cmd.move = { x: dx / d, y: dy / d };
    return cmd;
  }
  return roadPilot(state, state.city, memory);
}

// Set `world` to the named scene (start, drive, city or cover; any other name
// is start) and return the screen to draw over it.
export function stageShot(name, world) {
  const state = world.state;
  const city = world.city;
  world.reset();
  if (name !== 'drive' && name !== 'city' && name !== 'cover') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, idleCmd(), true);
    }
    return { screen: SCREEN_TITLE };
  }
  // One star for the cover: police cars chase and ram, which is dramatic on
  // camera, but no foot officers - at two stars the pilot would be busted
  // before the frame is taken.
  if (name === 'cover') state.wanted = 1;
  const seconds = name === 'city' ? CITY_SECONDS : name === 'cover' ? COVER_SECONDS : DRIVE_SECONDS;
  const memory = { leg: 0, stuck: 0, lastGoal: null };
  for (let i = 0; i < seconds / STEP; i += 1) {
    world.step(STEP, autopilot(state, memory), false);
  }
  if (name === 'city') {
    state.camera.x = city.width / 2;
    state.camera.y = city.height / 2;
    state.camera.zoom = 0.3;
  } else if (name === 'cover') {
    state.camera.zoom = 0.9;
  } else {
    state.camera.zoom = 1;
  }
  return { screen: SCREEN_PLAY };
}
