// world.js — the game state and its update: the player on foot and in a car, the
// wanted level and the police response, combat, missions, taxi fares, particles,
// the clock, and saving to localStorage.

import { WORLD, PLAYER, CAR, POLICE, WANTED, TRAFFIC } from './config.js';
import { mulberry32, range, pick } from './random.js';
import { buildCity, collideBuildings, pointInBuilding, nearestRoadPoint } from './city.js';
import {
  makeCar, stepCarPhysics, stepTraffic, spawnTraffic, spawnPedestrians, stepPedestrian,
  spawnPoliceCar, stepPoliceCar, separateCars, carsOverlap,
} from './entities.js';
import { MISSIONS, currentMission, currentStage, makeMissionState } from './missions.js';

export const SAVE_KEY = 'solmar-bay-save-v1';
export const SCREENS = { TITLE: 'title', PLAY: 'play', PAUSE: 'pause', BUSTED: 'busted', WASTED: 'wasted' };

export function createWorld(seed) {
  const city = buildCity(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const world = {
    seed,
    city,
    rng,
    screen: SCREENS.TITLE,
    time: 0,
    clock: 9.4, // 9:24 in the morning, sun high over the bay
    player: {
      x: city.places.start.x,
      y: city.places.start.y,
      angle: -Math.PI / 2,
      aimAngle: 0,
      health: PLAYER.maxHealth,
      inCar: null,
      walking: false,
    },
    cars: [],
    traffic: spawnTraffic(city, TRAFFIC.cars, rng),
    peds: spawnPedestrians(city, TRAFFIC.peds, rng),
    police: [],
    policeFoot: [],
    bullets: [],
    rivalBullets: [],
    rivals: [],
    particles: [],
    skids: [],
    cash: 120,
    ammo: 24,
    wanted: 0,
    wantedTimer: 0,
    unseenTimer: 0,
    bustTimer: 0,
    mission: makeMissionState(),
    messages: [],
    stats: { carsStolen: 0, fares: 0, distance: 0, shotsFired: 0 },
    camera: { x: city.places.start.x, y: city.places.start.y },
    endTimer: 0,
    titleChoice: 0, // 0 continue/new, 1 new game
    hasSave: false,
    muted: false,
  };
  // Rae's own car, parked outside her apartment.
  const own = makeCar(city.places.start.x + 40, city.places.start.y + 30, Math.PI / 2, {
    color: '#e8c84a', driver: 'player', npc: false,
  });
  world.cars.push(own);
  // The red Veloce GT for mission 3, parked outside the bank.
  const heist = makeCar(city.places.bank.x + 70, city.places.bank.y + 40, 0, {
    color: '#d21f2b', sport: true, maxSpeed: CAR.sportMaxSpeed, driver: null, npc: false,
  });
  world.cars.push(heist);
  world.mission.heistCar = heist;
  return world;
}

export function addMessage(world, text, dur) {
  world.messages.push({ text, until: world.time + (dur || 4) });
  if (world.messages.length > 3) world.messages.shift();
}

export function saveGame(world) {
  try {
    const data = {
      cash: world.cash,
      missionsDone: world.mission.done,
      missionIndex: world.mission.index,
      x: Math.round(world.player.x),
      y: Math.round(world.player.y),
      stats: world.stats,
      clock: world.clock,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    world.hasSave = true;
  } catch {
    // Storage unavailable (private mode, file://) — the game still plays.
  }
}

export function loadSave(world) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    world.cash = data.cash ?? 120;
    world.mission.done = data.missionsDone || [];
    world.mission.index = data.missionIndex ?? 0;
    world.player.x = data.x ?? world.city.places.start.x;
    world.player.y = data.y ?? world.city.places.start.y;
    world.stats = { ...world.stats, ...(data.stats || {}) };
    world.clock = data.clock ?? 9.4;
    world.hasSave = true;
    return true;
  } catch {
    return false;
  }
}

export function raiseWanted(world, stars) {
  const before = world.wanted;
  world.wanted = Math.min(WANTED.maxStars, world.wanted + stars);
  world.unseenTimer = 0;
  if (world.wanted > before) addMessage(world, `Wanted level ${world.wanted} — the Solmar Bay police are coming`, 4);
}

function nearestCar(world, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of world.cars) {
    if (car.driver === 'player' && world.player.inCar === car) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  for (const car of world.traffic) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function addParticles(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng() * Math.PI * 2;
    world.particles.push({
      x, y,
      vx: Math.cos(a) * range(world.rng, speed * 0.3, speed),
      vy: Math.sin(a) * range(world.rng, speed * 0.3, speed),
      life: range(world.rng, 0.3, 0.8),
      maxLife: 0.8,
      color,
      size: range(world.rng, 2, 5),
    });
  }
}

function stepParticles(world, dt) {
  for (const p of world.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  if (world.skids.length > 400) world.skids.splice(0, world.skids.length - 400);
}

function updateWanted(world, dt) {
  const target = Math.min(WANTED.maxCops, world.wanted * WANTED.copsPerStar);
  // Police cars arrive while wanted; they give up when the heat dies down.
  while (world.police.length < target) {
    world.police.push(spawnPoliceCar(world.city, world.player, world.rng));
  }
  while (world.police.length > target) world.police.pop();
  // Foot officers join the chase at 2+ stars when the player is on foot.
  const wantFoot = world.wanted >= 2 && !world.player.inCar ? Math.min(3, world.wanted - 1) : 0;
  while (world.policeFoot.length < wantFoot) {
    const a = world.rng() * Math.PI * 2;
    world.policeFoot.push({
      x: world.player.x + Math.cos(a) * 320,
      y: world.player.y + Math.sin(a) * 320,
      speed: 165, angle: 0, color: '#1d3557',
    });
  }
  while (world.policeFoot.length > wantFoot) world.policeFoot.pop();

  const nearestCop = world.police.reduce((m, c) => Math.min(m, Math.hypot(c.x - world.player.x, c.y - world.player.y)), Infinity);
  const copNear = nearestCop < 560 || world.policeFoot.length > 0;
  if (world.wanted > 0) {
    if (copNear) world.unseenTimer = 0;
    else {
      world.unseenTimer += dt;
      if (world.unseenTimer > WANTED.decayDelay) {
        world.wantedTimer += dt;
        if (world.wantedTimer > WANTED.decayEvery) {
          world.wantedTimer = 0;
          world.wanted -= 1;
          addMessage(world, 'You lost them — wanted level down', 3);
        }
      }
    }
  }
}

function stepPlayerOnFoot(world, dt, input, mouseWorld) {
  const p = world.player;
  let mx = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
  let my = (input.held('down') ? 1 : 0) - (input.held('up') ? 1 : 0);
  p.walking = mx !== 0 || my !== 0;
  if (p.walking) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    p.angle = Math.atan2(my, mx);
    const nx = p.x + mx * PLAYER.walkSpeed * dt;
    const ny = p.y + my * PLAYER.walkSpeed * dt;
    const fixed = collideBuildings(world.city, nx, ny, PLAYER.radius);
    p.x = fixed.x;
    p.y = fixed.y;
  }
  p.aimAngle = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x);

  // Enter a car.
  if (input.wasPressed('enter')) {
    const car = nearestCar(world, p.x, p.y, PLAYER.enterCarRange);
    if (car) {
      p.inCar = car;
      if (car.driver === 'traffic') {
        car.driver = 'player';
        world.traffic = world.traffic.filter((c) => c !== car);
        world.cars.push(car);
        world.stats.carsStolen += 1;
        raiseWanted(world, 1);
        addMessage(world, 'Car stolen — that one had an owner', 3);
      } else if (car === world.mission.heistCar && world.mission.index === 2 && world.mission.stage === 0) {
        advanceMission(world);
        raiseWanted(world, 3);
      } else {
        addMessage(world, 'Behind the wheel', 2);
      }
    } else {
      // Start a taxi fare with a nearby pedestrian who wants one.
      const ped = world.peds.find((q) => q.fare && Math.hypot(q.x - p.x, q.y - p.y) < 60);
      if (ped && !world.mission.fare && p.inCar) {
        // (handled in the driving branch; on foot we only hail)
      }
    }
  }

  // Shooting on foot.
  if ((input.mouse.clicked || input.held('shoot')) && world.ammo > 0 && world.time - (world.lastShot || 0) > 0.22) {
    world.lastShot = world.time;
    world.ammo -= 1;
    world.stats.shotsFired += 1;
    world.bullets.push({
      x: p.x + Math.cos(p.aimAngle) * 18,
      y: p.y + Math.sin(p.aimAngle) * 18,
      vx: Math.cos(p.aimAngle) * 720,
      vy: Math.sin(p.aimAngle) * 720,
      life: 0.9,
    });
    addParticles(world, p.x + Math.cos(p.aimAngle) * 22, p.y + Math.sin(p.aimAngle) * 22, '#ffd94a', 4, 160);
    if (world.sound) world.sound.gunshot();
    raiseWanted(world, 0); // firing a gun is noticed only when it hits something
  }
}

function stepPlayerDriving(world, dt, input) {
  const p = world.player;
  const car = p.inCar;
  const throttle = (input.held('up') ? 1 : 0) - (input.held('down') ? 0.55 : 0);
  const steer = (input.held('left') ? -1 : 0) + (input.held('right') ? 1 : 0);
  const handbrake = input.held('brake');
  if (handbrake) car.speed *= Math.max(0, 1 - 3 * dt);
  const hit = stepCarPhysics(car, throttle, steer, dt, world.city);
  if (hit && Math.abs(car.speed) > 60 && world.sound) world.sound.crash();
  // Skid marks only when the handbrake is actually pulled: a car holding a line
  // through a corner leaves no trail.
  if (handbrake && Math.abs(car.speed) > 120) {
    world.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 3 });
  }
  world.stats.distance += Math.abs(car.speed) * dt;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  // Running over a pedestrian is a crime the whole city sees.
  for (const ped of world.peds) {
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < CAR.length * 0.55 && Math.abs(car.speed) > 40) {
      ped.walking = false;
      ped.panic = 99;
      raiseWanted(world, 1);
      addMessage(world, 'You hit a pedestrian!', 3);
      addParticles(world, ped.x, ped.y, '#e86a92', 10, 220);
      ped.x += 99999; // the ambulance takes them away
    }
  }
  if (input.wasPressed('enter')) {
    p.inCar = null;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
    const fixed = collideBuildings(world.city, p.x, p.y, PLAYER.radius);
    p.x = fixed.x;
    p.y = fixed.y;
  }
}

function stepBullets(world, dt) {
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (pointInBuilding(world.city, b.x, b.y)) b.life = 0;
    // Hit a rival.
    for (const r of world.rivals) {
      if (r.health > 0 && Math.hypot(r.x - b.x, r.y - b.y) < 14) {
        r.health -= 34;
        b.life = 0;
        addParticles(world, r.x, r.y, '#ff5a4a', 8, 200);
        if (r.health <= 0) {
          world.cash += 40;
          addMessage(world, 'Rival down — $40 lifted from his pocket', 3);
        }
      }
    }
    // Hit a police car.
    for (const c of world.police) {
      if (Math.hypot(c.x - b.x, c.y - b.y) < 26) {
        c.damage += 34;
        b.life = 0;
        addParticles(world, c.x, c.y, '#ffd94a', 8, 200);
        if (c.damage > 120) {
          addParticles(world, c.x, c.y, '#ff8a3d', 24, 320);
          world.police = world.police.filter((q) => q !== c);
          raiseWanted(world, 1);
        }
      }
    }
    // Hit a pedestrian (a crime).
    for (const ped of world.peds) {
      if (ped.walking && Math.hypot(ped.x - b.x, ped.y - b.y) < 12) {
        ped.walking = false;
        ped.x += 99999;
        b.life = 0;
        raiseWanted(world, 1);
        addMessage(world, 'You shot a civilian!', 3);
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
  // Rivals shoot back, slowly and badly.
  for (const r of world.rivals) {
    if (r.health <= 0) continue;
    r.cool = (r.cool || 0) - dt;
    const d = Math.hypot(world.player.x - r.x, world.player.y - r.y);
    if (d < 420 && r.cool <= 0) {
      r.cool = 1.6;
      const a = Math.atan2(world.player.y - r.y, world.player.x - r.x) + range(world.rng, -0.15, 0.15);
      world.rivalBullets.push({ x: r.x, y: r.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, life: 1.2 });
    }
  }
  for (const b of world.rivalBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (Math.hypot(b.x - world.player.x, b.y - world.player.y) < 13) {
      world.player.health -= 9;
      b.life = 0;
      addParticles(world, world.player.x, world.player.y, '#ff5a4a', 6, 180);
    }
  }
  world.rivalBullets = world.rivalBullets.filter((b) => b.life > 0);
}

function advanceMission(world) {
  const mission = currentMission(world.mission);
  if (!mission) return;
  world.mission.stage += 1;
  if (world.mission.stage >= mission.stages.length) {
    world.mission.done.push(mission.id);
    world.mission.index += 1;
    world.mission.stage = 0;
    world.mission.pickupCarried = false;
    world.mission.rivalsSpawned = false;
    world.cash += mission.reward;
    world.mission.banner = { text: `${mission.title} — COMPLETE  +$${mission.reward}`, until: world.time + 5 };
    if (world.sound) {
      world.sound.missionDone();
      world.sound.cash();
    }
    saveGame(world);
    if (world.mission.index < MISSIONS.length) {
      addMessage(world, `New mission: ${MISSIONS[world.mission.index].title}`, 5);
    } else {
      addMessage(world, 'All missions complete — Solmar Bay is yours', 6);
    }
  }
}

function stepMission(world, dt) {
  const state = world.mission;
  const mission = currentMission(state);
  if (!mission) return;
  const stage = currentStage(state);
  if (!stage) return;
  const p = world.player;
  const d = Math.hypot(p.x - stage.x, p.y - stage.y);

  if (mission.id === 'first-fare' && stage.type === 'goto' && d < 60) {
    advanceMission(world);
    addMessage(world, 'Client aboard — drive him to the Marina Bay docks', 4);
    return;
  }
  if (mission.id === 'first-fare' && stage.type === 'drive' && d < 70 && p.inCar) {
    advanceMission(world);
    return;
  }
  if (mission.id === 'the-pickup' && stage.type === 'goto' && d < 60) {
    state.pickupCarried = true;
    advanceMission(world);
    raiseWanted(world, 2);
    if (!state.rivalsSpawned) {
      state.rivalsSpawned = true;
      for (let i = 0; i < 3; i += 1) {
        const a = world.rng() * Math.PI * 2;
        world.rivals.push({
          x: stage.x + Math.cos(a) * 120,
          y: stage.y + Math.sin(a) * 120,
          health: 68, cool: 1, speed: 120,
        });
      }
      addMessage(world, 'Vega\u2019s rivals are here — and so are the police!', 4);
    }
    return;
  }
  if (mission.id === 'the-pickup' && stage.type === 'deliver' && d < 70) {
    advanceMission(world);
    return;
  }
  if (mission.id === 'bay-heist' && stage.type === 'escape') {
    if (world.wanted === 0 && d < 80 && p.inCar === state.heistCar) {
      advanceMission(world);
    }
  }

  // Rivals chase the player on foot.
  for (const r of world.rivals) {
    if (r.health <= 0) continue;
    const a = Math.atan2(p.y - r.y, p.x - r.x);
    const nx = r.x + Math.cos(a) * r.speed * dt;
    const ny = r.y + Math.sin(a) * r.speed * dt;
    if (!pointInBuilding(world.city, nx, ny)) {
      r.x = nx;
      r.y = ny;
    }
  }
}

function stepTaxi(world, dt, input) {
  const state = world.mission;
  const p = world.player;
  if (!state.fare) {
    // Hail a fare: driving slowly past a pedestrian who wants a ride.
    if (p.inCar && Math.abs(p.inCar.speed) < 60) {
      const ped = world.peds.find((q) => q.fare && q.walking && Math.hypot(q.x - p.x, q.y - p.y) < 70);
      if (ped) {
        const dest = nearestRoadPoint(pick(world.rng, [300, 900, 1500, 2100]), pick(world.rng, [300, 900, 1500, 2100]));
        state.fare = { to: dest, pay: Math.floor(range(world.rng, 35, 85)), passenger: ped };
        ped.walking = false;
        ped.x += 99999;
        addMessage(world, `Taxi fare — take your passenger to the yellow marker ($${state.fare.pay})`, 4);
      }
    }
    return;
  }
  const d = Math.hypot(p.x - state.fare.to.x, p.y - state.fare.to.y);
  if (d < 70 && p.inCar) {
    world.cash += state.fare.pay;
    world.stats.fares += 1;
    if (world.sound) world.sound.cash();
    addMessage(world, `Fare complete — +$${state.fare.pay}`, 3);
    state.fare = null;
  }
}

export function updateWorld(world, dt, input, mouseWorld) {
  world.time += dt;
  world.clock = (world.clock + dt / 240) % 24;
  stepParticles(world, dt);

  if (world.screen === SCREENS.TITLE) {
    if (input.wasPressed('confirm') || input.wasPressed('enter')) {
      startGame(world, world.titleChoice === 1);
    }
    if (input.held('up') && world.titleChoice === 1) world.titleChoice = 0;
    if (input.held('down') && world.hasSave) world.titleChoice = 1;
    return;
  }
  if (world.screen === SCREENS.PAUSE) {
    if (input.wasPressed('pause') || input.wasPressed('confirm')) world.screen = SCREENS.PLAY;
    if (input.wasPressed('enter')) {
      saveGame(world);
      world.screen = SCREENS.TITLE;
    }
    return;
  }
  if (world.screen === SCREENS.BUSTED || world.screen === SCREENS.WASTED) {
    world.endTimer += dt;
    if (world.endTimer > 2.2 && (input.wasPressed('confirm') || input.wasPressed('enter') || world.endTimer > 5)) {
      world.screen = SCREENS.TITLE;
      world.endTimer = 0;
    }
    return;
  }

  // --- playing ---
  if (input.wasPressed('pause')) {
    world.screen = SCREENS.PAUSE;
    return;
  }
  if (input.wasPressed('mission')) {
    const m = currentMission(world.mission);
    if (m) addMessage(world, `${m.title}: ${m.brief}`, 6);
  }

  const p = world.player;
  if (p.inCar) stepPlayerDriving(world, dt, input);
  else stepPlayerOnFoot(world, dt, input, mouseWorld);

  // Traffic and pedestrians keep living their lives.
  for (const car of world.traffic) stepTraffic(car, dt, world.city, world.rng);
  for (const ped of world.peds) {
    if (ped.walking) stepPedestrian(ped, dt, world.city, world.rng, p.inCar ? p.inCar : p);
  }
  // A crashed traffic car that the player smashed gets towed away, a fresh one arrives.
  world.traffic = world.traffic.filter((c) => c.damage < 200);

  // Police chase.
  updateWanted(world, dt);
  let touchingCop = false;
  for (const cop of world.police) {
    const result = stepPoliceCar(cop, p, !!p.inCar, dt, world.city);
    if (result.rammed) {
      // A ram hurts, but a cop cannot shred a car in one long shove: one hit
      // every 0.8 s at most.
      if (world.time - (world.lastRamAt || 0) > 0.8) {
        world.lastRamAt = world.time;
        p.inCar.damage += POLICE.ramDamage;
        addParticles(world, p.x, p.y, '#ffd94a', 6, 200);
      }
      if (p.inCar.damage > 380) {
        addParticles(world, p.x, p.y, '#ff8a3d', 30, 340);
        p.inCar = null;
        p.health -= 25;
        addMessage(world, 'Your car is wrecked!', 3);
      }
    }
    if (result.touching) touchingCop = true;
  }
  for (const officer of world.policeFoot) {
    const a = Math.atan2(p.y - officer.y, p.x - officer.x);
    officer.x += Math.cos(a) * officer.speed * dt;
    officer.y += Math.sin(a) * officer.speed * dt;
    officer.angle = a;
    if (Math.hypot(p.x - officer.x, p.y - officer.y) < POLICE.bustRange) touchingCop = true;
  }
  if (touchingCop && !p.inCar) {
    world.bustTimer += dt;
    if (world.bustTimer > POLICE.bustTime) {
      world.screen = SCREENS.BUSTED;
      world.endTimer = 0;
      world.cash = Math.max(0, world.cash - 150);
      world.wanted = 0;
      world.police = [];
      world.policeFoot = [];
      if (world.sound) world.sound.stopAll();
      saveGame(world);
    }
  } else {
    world.bustTimer = 0;
  }

  separateCars([...world.cars, ...world.traffic, ...world.police]);
  stepBullets(world, dt);
  stepMission(world, dt);
  stepTaxi(world, dt, input);

  // Ammo slowly restocks at the apartment, and health regens out of trouble.
  if (world.wanted === 0) {
    p.health = Math.min(PLAYER.maxHealth, p.health + 2 * dt);
    world.ammo = Math.min(48, world.ammo + 1 * dt);
  }
  if (p.health <= 0) {
    world.screen = SCREENS.WASTED;
    world.endTimer = 0;
    world.wanted = 0;
    if (world.sound) world.sound.stopAll();
    saveGame(world);
  }

  // Camera follows the player, clamped to the city.
  const vw = world.viewW || 1280;
  const vh = world.viewH || 800;
  world.camera.x = Math.max(vw / 2 - 100, Math.min(WORLD.size - vw / 2 + 100, p.x));
  world.camera.y = Math.max(vh / 2 - 100, Math.min(WORLD.size - vh / 2 + 100, p.y));
}

export function startGame(world, fresh) {
  if (fresh) {
    const keepSound = world.sound;
    const seed = world.seed;
    const freshWorld = createWorld(seed);
    Object.keys(freshWorld).forEach((k) => { world[k] = freshWorld[k]; });
    world.sound = keepSound;
    world.muted = keepSound ? keepSound.muted : false;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* no storage */ }
  } else if (world.hasSave) {
    loadSave(world);
  }
  world.screen = SCREENS.PLAY;
  world.mission.active = true;
  if (world.sound) world.sound.unlock();
  const mission = currentMission(world.mission);
  if (mission) addMessage(world, `${mission.title} — press M for the brief`, 5);
}
