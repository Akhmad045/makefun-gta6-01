// entities.js — the living city: traffic cars that drive the road grid, pedestrians
// on the sidewalks, and police cars and officers who chase the player. Also the
// shared car physics (steering, acceleration, building and car collisions).

import { WORLD, CAR, POLICE, PALETTE } from './config.js';
import { mulberry32, range, pick, intRange } from './random.js';
import { roadCenters, collideBuildings, pointInBuilding } from './city.js';

export function makeCar(x, y, angle, opts) {
  const o = opts || {};
  return {
    x, y, angle,
    speed: o.speed || 0,
    maxSpeed: o.maxSpeed || CAR.maxSpeed,
    color: o.color || '#d94f3d',
    police: !!o.police,
    sport: !!o.sport,
    taxi: !!o.taxi,
    npc: o.npc !== false,
    driver: o.driver || null, // 'traffic' | 'police' | 'player'
    route: o.route || null,
    target: null,
    brakeLight: false,
    damage: 0,
    sirenPhase: Math.random() * 6,
  };
}

export function stepCarPhysics(car, throttle, steer, dt, city) {
  // throttle: -1 reverse/brake .. 1 full throttle. steer: -1 .. 1.
  const maxFwd = car.maxSpeed;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt;
    else car.speed += CAR.accel * 0.5 * throttle * dt; // reverse
  }
  car.speed -= car.speed * CAR.drag * dt;
  if (car.speed > maxFwd) car.speed = maxFwd;
  if (car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
  // Steering authority falls off at speed, so a fast car stays stable instead of
  // fishtailing: full lock at a crawl, about a third of it at top speed.
  const speedRatio = Math.min(1, Math.abs(car.speed) / Math.max(1, car.maxSpeed));
  const steerAuthority = CAR.grip * (1.15 - 0.8 * speedRatio);
  car.angle += steer * steerAuthority * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hitWall = pointInBuilding(city, nx, ny);
  if (hitWall) {
    car.speed *= 0.45;
    car.damage += Math.abs(car.speed) * 0.02 + 2;
    const corrected = collideBuildings(city, nx, ny, CAR.length / 2);
    car.x = corrected.x;
    car.y = corrected.y;
    return true;
  }
  car.x = nx;
  car.y = ny;
  return false;
}

export function carsOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const d = Math.hypot(dx, dy);
  return d < CAR.length * 0.85;
}

export function separateCars(cars) {
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = CAR.length * 0.8;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        a.speed *= 0.8;
        b.speed *= 0.8;
      }
    }
  }
}

// --- Traffic ---

export function spawnTraffic(city, count, rng) {
  const centers = roadCenters();
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const horizontal = rng() < 0.5;
    const road = pick(rng, centers);
    const along = range(rng, 100, WORLD.size - 100);
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = 15;
    const x = horizontal ? along : road + (dir > 0 ? lane : -lane);
    const y = horizontal ? road + (dir > 0 ? lane : -lane) : along;
    const angle = horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    cars.push(makeCar(x, y, angle, {
      speed: range(rng, 90, 150),
      maxSpeed: range(rng, 120, 170),
      color: pick(rng, PALETTE.carColors),
      driver: 'traffic',
    }));
  }
  return cars;
}

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function stepTraffic(car, dt, city, rng) {
  // Drive straight along the current road; at an intersection sometimes turn.
  const centers = roadCenters();
  const half = WORLD.roadWidth / 2;
  const nearX = centers.some((c) => Math.abs(car.x - c) < half + 4);
  const nearY = centers.some((c) => Math.abs(car.y - c) < half + 4);
  const atIntersection = nearX && nearY;
  if (atIntersection && rng() < dt * 0.9) {
    // Pick a new heading: straight, left or right.
    const turn = pick(rng, [0, 0, Math.PI / 2, -Math.PI / 2]);
    car.angle += turn;
    // Snap onto the road centre line so turns stay on the grid.
    let bestX = car.x;
    let bestD = Infinity;
    for (const c of centers) {
      if (Math.abs(car.x - c) < bestD) { bestD = Math.abs(car.x - c); bestX = c; }
    }
    let bestY = car.y;
    bestD = Infinity;
    for (const c of centers) {
      if (Math.abs(car.y - c) < bestD) { bestD = Math.abs(car.y - c); bestY = c; }
    }
    if (Math.abs(Math.cos(car.angle)) > 0.7) car.y = bestY;
    else car.x = bestX;
  }
  // Gentle speed wobble so traffic does not look like a conveyor belt.
  const cruise = car.maxSpeed * (0.75 + 0.25 * Math.sin(car.x * 0.01 + car.y * 0.013));
  const throttle = car.speed < cruise ? 0.5 : 0;
  stepCarPhysics(car, throttle, 0, dt, city);
}

// --- Pedestrians ---

export function spawnPedestrians(city, count, rng) {
  const peds = [];
  const centers = roadCenters();
  for (let i = 0; i < count; i += 1) {
    const road = pick(rng, centers);
    const along = range(rng, 80, WORLD.size - 80);
    const horizontal = rng() < 0.5;
    const side = pick(rng, [-1, 1]) * (WORLD.roadWidth / 2 + 12);
    peds.push({
      x: horizontal ? along : road + side,
      y: horizontal ? road + side : along,
      angle: rng() * Math.PI * 2,
      speed: range(rng, 28, 52),
      color: pick(rng, ['#e86a92', '#5a8fd9', '#f2a541', '#7ac74f', '#c9c9c9', '#8a6fd0']),
      walking: true,
      pause: 0,
      panic: 0,
      fare: rng() < 0.22, // some pedestrians want a taxi ride
    });
  }
  return peds;
}

export function stepPedestrian(ped, dt, city, rng, danger) {
  if (ped.panic > 0) {
    ped.panic -= dt;
    ped.speed = 150;
  } else if (ped.pause > 0) {
    ped.pause -= dt;
    return;
  } else {
    ped.speed = 40;
    if (rng() < dt * 0.15) ped.pause = range(rng, 0.5, 2.5);
    if (rng() < dt * 0.2) ped.angle += pick(rng, [-Math.PI / 2, Math.PI / 2, Math.PI]);
  }
  if (danger && Math.hypot(danger.x - ped.x, danger.y - ped.y) < 130) {
    ped.panic = 1.2;
    ped.angle = Math.atan2(ped.y - danger.y, ped.x - danger.x);
  }
  const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
  if (!pointInBuilding(city, nx, ny) && nx > 30 && nx < WORLD.size - 30 && ny > 30 && ny < WORLD.beachY + 40) {
    ped.x = nx;
    ped.y = ny;
  } else {
    ped.angle += Math.PI / 2;
  }
}

// --- Police ---

export function spawnPoliceCar(city, player, rng) {
  // Appear on a road near the player, just out of sight.
  const centers = roadCenters();
  const road = pick(rng, centers);
  const horizontal = rng() < 0.5;
  const offset = pick(rng, [-1, 1]) * range(rng, 500, 750);
  const x = horizontal ? player.x + offset : road;
  const y = horizontal ? road : player.y + offset;
  const cx = Math.max(80, Math.min(WORLD.size - 80, x));
  const cy = Math.max(80, Math.min(WORLD.size - 80, y));
  return makeCar(cx, cy, Math.atan2(player.y - cy, player.x - cx), {
    speed: 120,
    maxSpeed: POLICE.maxSpeed,
    color: PALETTE.policeBody,
    police: true,
    driver: 'police',
  });
}

export function stepPoliceCar(car, player, playerInCar, dt, city) {
  const targetAngle = Math.atan2(player.y - car.y, player.x - car.x);
  const diff = angleDiff(car.angle, targetAngle);
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  const dist = Math.hypot(player.x - car.x, player.y - car.y);
  const throttle = dist > 60 ? 1 : 0.4;
  stepCarPhysics(car, throttle, steer, dt, city);
  car.sirenPhase += dt;
  // Ramming the player's car damages it; ramming the player on foot busts them.
  if (dist < CAR.length * 0.9) {
    if (playerInCar) {
      car.speed *= 0.6;
      return { rammed: true };
    }
    return { touching: true };
  }
  return {};
}
