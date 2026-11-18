// The things that move around Solmar Bay: cars, pedestrians, officers, rivals
// and bullets. This module only builds them and moves them; the rules about
// what they mean (wanted level, fares, missions) live in world.js.

import { CAR } from './config.js';
import { randPick, randRange } from './random.js';

export const KIND_CAB = 'cab';
export const KIND_TRAFFIC = 'traffic';
export const KIND_POLICE = 'police';
export const KIND_TARGET = 'target';
export const KIND_SPORT = 'sport';

export const TRAFFIC_COLORS = ['#c94f4f', '#4f7ac9', '#5aa85a', '#c9c9c9', '#8a6fb0', '#d98a3d', '#3d9a9a', '#b0b0b0'];

export function makeCar(kind, x, y, angle, color, rng) {
  const roll = rng || Math.random;
  return {
    kind,
    x, y,
    angle,
    speed: 0,
    color: color || pickCarColor(kind, roll),
    hp: kind === KIND_POLICE ? 120 : 80,
    maxHp: kind === KIND_POLICE ? 120 : 80,
    driver: 'none',
    // Traffic AI: which road the car is on and which way it travels.
    axis: 'v',
    dir: 1,
    roadIndex: 0,
    cruise: 150 + roll() * 80,
    turnAt: 0,
    wrecked: false,
    smoke: 0,
    sirenPhase: 0,
  };
}

function pickCarColor(kind, roll) {
  if (kind === KIND_CAB) return '#f2c230';
  if (kind === KIND_POLICE) return '#2b5fd9';
  if (kind === KIND_TARGET) return '#d92638';
  return TRAFFIC_COLORS[Math.floor(roll() * TRAFFIC_COLORS.length)];
}

export function makePed(x, y, rng) {
  return {
    x, y,
    angle: randRange(rng, 0, Math.PI * 2),
    speed: randRange(rng, 34, 62),
    walkPhase: randRange(rng, 0, Math.PI * 2),
    hailing: false,
    fare: null,
    down: false,
    downTimer: 0,
    shirt: randPick(rng, ['#e8e8e8', '#7ab5e8', '#e8a87a', '#a8e87a', '#e87ab5', '#c9a8e8']),
    skin: randPick(rng, ['#e8b88a', '#c98d5f', '#8a5a3a', '#f0c8a0']),
  };
}

export function makeOfficer(x, y) {
  return { x, y, angle: 0, speed: 185, walkPhase: 0 };
}

export function makeRival(x, y, rng) {
  const roll = rng || Math.random;
  return { x, y, angle: 0, hp: 70, shootTimer: 0.4 + roll() * 0.8, walkPhase: 0 };
}

export function makeBullet(x, y, angle, fromPlayer) {
  return {
    x, y,
    vx: Math.cos(angle) * 900,
    vy: Math.sin(angle) * 900,
    life: 0.9,
    fromPlayer,
  };
}

export function makeParticle(x, y, kind, rng) {
  const roll = rng || Math.random;
  return {
    x, y,
    vx: -60 + roll() * 120,
    vy: -60 + roll() * 120,
    life: kind === 'smoke' ? 1.1 : 0.5,
    maxLife: kind === 'smoke' ? 1.1 : 0.5,
    kind,
    size: kind === 'smoke' ? 9 : 4,
  };
}

// Steer a heading toward a target heading, turning at most `rate` radians.
export function turnToward(angle, target, rate) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > rate) return angle + rate;
  if (diff < -rate) return angle - rate;
  return target;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

// Drive a car forward along its heading with simple arcade physics: W
// accelerates, S brakes or reverses, A/D steer harder the slower it goes.
export function driveCar(car, move, dt, topSpeed) {
  const forward = move.y < 0 ? 1 : move.y > 0 ? -1 : 0;
  if (forward > 0) {
    car.speed += CAR.accel * dt;
  } else if (forward < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.55 * dt;
  }
  // Rolling drag, then clamp.
  car.speed -= car.speed * CAR.drag * dt;
  if (car.speed > topSpeed) car.speed = topSpeed;
  if (car.speed < -CAR.reverseTop) car.speed = -CAR.reverseTop;
  if (Math.abs(car.speed) < 2 && forward === 0) car.speed = 0;

  const steer = move.x;
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 120) * (car.speed < 0 ? -1 : 1);
  car.angle += steer * CAR.grip * steerAuthority * dt;

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

// Traffic AI: cruise along the current road; at an intersection, sometimes
// turn onto the crossing road; at the edge of the map, turn around.
export function driveTraffic(car, city, rng, dt) {
  if (car.wrecked) return;
  if (car.axis === 'v') {
    car.y += car.dir * car.speed * dt;
    car.x += (city.roadsV[car.roadIndex] - car.x) * Math.min(1, 3 * dt);
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    // Near a crossing street: maybe turn.
    for (let hi = 0; hi < city.roadsH.length; hi += 1) {
      const ry = city.roadsH[hi];
      if (Math.abs(car.y - ry) < 10 && rng() < 0.02) {
        car.axis = 'h';
        car.roadIndex = hi;
        car.dir = rng() < 0.5 ? -1 : 1;
        break;
      }
    }
    if (car.y < 60) { car.y = 60; car.dir = 1; }
    if (car.y > city.height - 60) { car.y = city.height - 60; car.dir = -1; }
  } else {
    car.x += car.dir * car.speed * dt;
    car.y += (city.roadsH[car.roadIndex] - car.y) * Math.min(1, 3 * dt);
    car.angle = car.dir > 0 ? 0 : Math.PI;
    for (let vi = 0; vi < city.roadsV.length; vi += 1) {
      const rx = city.roadsV[vi];
      if (Math.abs(car.x - rx) < 10 && rng() < 0.02) {
        car.axis = 'v';
        car.roadIndex = vi;
        car.dir = rng() < 0.5 ? -1 : 1;
        break;
      }
    }
    if (car.x < 60) { car.x = 60; car.dir = 1; }
    if (car.x > city.width - 400) { car.x = city.width - 400; car.dir = -1; }
  }
  car.speed += (car.cruise - car.speed) * Math.min(1, 1.5 * dt);
}

// A police car chases a point: steer toward it, go fast, and ram.
export function chasePoint(car, tx, ty, dt, topSpeed) {
  const wanted = angleTo(car.x, car.y, tx, ty);
  car.angle = turnToward(car.angle, wanted, 3.4 * dt);
  car.speed += CAR.accel * 1.15 * dt;
  if (car.speed > topSpeed) car.speed = topSpeed;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.sirenPhase += dt * 6;
}
