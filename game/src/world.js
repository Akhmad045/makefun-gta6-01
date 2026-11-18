// The simulation of Solmar Bay: the player on foot and in cars, traffic on the
// road grid, pedestrians (some hailing a taxi), the police and the wanted
// level, pistol combat, taxi fares and the story missions. No drawing and no
// browser in here: step() advances one fixed step from a command snapshot and
// returns what happened as bit flags, so the caller can react.

import { CAR, COMBAT, FARES, PLAYER, POLICE, WORLD } from './config.js';
import {
  buildCity, districtAt, inWater, pushOutOfBuildings, randomRoadSpot, randomSidewalkSpot,
} from './city.js';
import {
  KIND_CAB, KIND_POLICE, KIND_TARGET, KIND_TRAFFIC, angleTo, chasePoint, dist,
  driveCar, driveTraffic, makeBullet, makeCar, makeOfficer, makeParticle, makePed,
  makeRival,
} from './entities.js';
import { createDirector } from './missions.js';
import { randChance, randInt, randRange } from './random.js';

export const EVENT_BUSTED = 1;
export const EVENT_WRECKED = 2;
export const EVENT_CASH = 4;

const TRAFFIC_COUNT = 14;
const PED_COUNT = 26;
const HAILING_COUNT = 4;

export function createWorld(rng, hooks) {
  const city = buildCity(rng);

  const state = {
    city,
    elapsed: 0,
    clockMin: 8 * 60 + 12,
    cash: PLAYER.startCash,
    health: PLAYER.maxHealth,
    ammo: PLAYER.startAmmo,
    wanted: 0,
    calmTimer: 0,
    missionsDone: 0,
    player: {
      x: city.playerSpawn.x, y: city.playerSpawn.y,
      angle: city.playerSpawn.angle, aim: city.playerSpawn.angle,
      onFoot: true, car: null, fireCooldown: 0, invuln: 0,
    },
    cars: [],
    peds: [],
    officers: [],
    rivals: [],
    bullets: [],
    particles: [],
    fare: null,
    fareMarker: null,
    marker: null,
    flags: { heistCarTaken: false },
    camera: { x: city.playerSpawn.x, y: city.playerSpawn.y, zoom: 1 },
    district: 'Downtown',
    toast: '',
    toastTimer: 0,
    ramCooldown: 0,
    hailTimer: 0,
    bustedEvent: 0,
  };

  // The story director is built after the state exists: its first mission
  // announcement runs immediately and writes into the state through hooks.
  const director = createDirector(city, {
    setMarker: (x, y, label) => { state.marker = { x, y, label }; },
    clearMarker: () => { state.marker = null; },
    toast: (msg) => showToast(msg),
    giveCash: (amount) => { state.cash += amount; },
    audioCash: () => hooks.audio.cash(),
    spawnRivals: (x, y, n) => spawnRivals(x, y, n),
    setWanted: (n) => { state.wanted = Math.max(state.wanted, n); },
    saveGame: () => hooks.saveGame(),
  });

  function showToast(msg) {
    state.toast = msg;
    state.toastTimer = 4.5;
  }

  function spawnTraffic(count) {
    for (let i = 0; i < count; i += 1) {
      const spot = randomRoadSpot(rng, city);
      const car = makeCar(KIND_TRAFFIC, spot.x, spot.y, 0, null, rng);
      if (rng() < 0.5) {
        car.axis = 'v';
        car.roadIndex = nearestRoadIndex(city.roadsV, spot.x);
        car.dir = rng() < 0.5 ? -1 : 1;
      } else {
        car.axis = 'h';
        car.roadIndex = nearestRoadIndex(city.roadsH, spot.y);
        car.dir = rng() < 0.5 ? -1 : 1;
      }
      car.speed = car.cruise;
      car.driver = 'traffic';
      state.cars.push(car);
    }
  }

  function nearestRoadIndex(list, value) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < list.length; i += 1) {
      const d = Math.abs(list[i] - value);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function spawnPeds(count) {
    for (let i = 0; i < count; i += 1) {
      const spot = randomSidewalkSpot(rng, city);
      state.peds.push(makePed(spot.x, spot.y, rng));
    }
    let hailing = 0;
    for (const ped of state.peds) {
      if (hailing >= HAILING_COUNT) break;
      ped.hailing = true;
      hailing += 1;
    }
  }

  function spawnRivals(x, y, n) {
    for (let i = 0; i < n; i += 1) {
      state.rivals.push(makeRival(x + randRange(rng, -70, 70), y + randRange(rng, -70, 70), rng));
    }
  }

  function spawnPoliceCar() {
    const angle = randRange(rng, 0, Math.PI * 2);
    const px = state.player.x + Math.cos(angle) * randRange(rng, 420, 620);
    const py = state.player.y + Math.sin(angle) * randRange(rng, 420, 620);
    const spot = randomRoadSpot(rng, city);
    const car = makeCar(KIND_POLICE, spot.x, spot.y, 0, null, rng);
    car.x = Math.max(80, Math.min(city.width - 420, px));
    car.y = Math.max(80, Math.min(city.height - 120, py));
    car.speed = 320;
    car.driver = 'police';
    state.cars.push(car);
    return car;
  }

  function spawnOfficer() {
    const angle = randRange(rng, 0, Math.PI * 2);
    state.officers.push(makeOfficer(
      state.player.x + Math.cos(angle) * randRange(rng, 220, 320),
      state.player.y + Math.sin(angle) * randRange(rng, 220, 320),
    ));
  }

  function reset() {
    state.elapsed = 0;
    state.clockMin = 8 * 60 + 12;
    state.cash = PLAYER.startCash;
    state.health = PLAYER.maxHealth;
    state.ammo = PLAYER.startAmmo;
    state.wanted = 0;
    state.calmTimer = 0;
    state.missionsDone = 0;
    state.cars = [];
    state.peds = [];
    state.officers = [];
    state.rivals = [];
    state.bullets = [];
    state.particles = [];
    state.fare = null;
    state.fareMarker = null;
    state.flags.heistCarTaken = false;
    state.player.x = city.playerSpawn.x;
    state.player.y = city.playerSpawn.y;
    state.player.angle = city.playerSpawn.angle;
    state.player.aim = city.playerSpawn.angle;
    state.player.onFoot = true;
    state.player.car = null;
    state.player.fireCooldown = 0;
    state.player.invuln = 0;
    state.camera.x = city.playerSpawn.x;
    state.camera.y = city.playerSpawn.y;
    state.camera.zoom = 1;
    state.district = 'Downtown';
    state.toast = '';
    state.toastTimer = 0;

    const cab = makeCar(KIND_CAB, city.cabSpot.x, city.cabSpot.y, city.cabSpot.angle, null, rng);
    cab.driver = 'none';
    state.cars.push(cab);
    const target = makeCar(KIND_TARGET, city.spots.targetCar.x, city.spots.targetCar.y, Math.PI / 2, null, rng);
    target.driver = 'none';
    state.cars.push(target);
    spawnTraffic(TRAFFIC_COUNT);
    spawnPeds(PED_COUNT);
    director.restore(0);
  }

  function nearestCar(x, y, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of state.cars) {
      if (car.wrecked) continue;
      const d = dist(x, y, car.x, car.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function addWanted(n) {
    state.wanted = Math.min(5, state.wanted + n);
    state.calmTimer = 0;
  }

  function enterCar(car) {
    state.player.car = car;
    state.player.onFoot = false;
    car.driver = 'player';
    if (car.kind === KIND_TRAFFIC) {
      addWanted(1);
      showToast('You stole a stranger\u2019s car - the heat is on!');
      hooks.audio.denied();
    } else if (car.kind === KIND_CAB) {
      showToast('Your cab. Marisol is waiting on the radio.');
    } else if (car.kind === KIND_TARGET) {
      state.flags.heistCarTaken = true;
      if (director.index === 2) {
        showToast('The coupe is yours. Now lose the cops!');
      } else {
        addWanted(2);
        showToast('That coupe belongs to someone dangerous - the heat is on!');
      }
    }
  }

  function exitCar() {
    const car = state.player.car;
    if (!car) return;
    car.driver = 'none';
    car.speed = 0;
    state.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    state.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    state.player.onFoot = true;
    state.player.car = null;
    state.player.angle = car.angle;
  }

  function wreckCar(car) {
    car.wrecked = true;
    car.speed = 0;
    for (let i = 0; i < 10; i += 1) {
      state.particles.push(makeParticle(car.x, car.y, 'smoke', rng));
    }
    hooks.audio.crash();
  }

  function bustPlayer(reason) {
    const lost = Math.min(state.cash, 120);
    state.cash -= lost;
    state.wanted = 0;
    state.officers = [];
    state.rivals = [];
    state.calmTimer = 0;
    if (state.player.car) {
      state.player.car.driver = 'none';
      state.player.car.speed = 0;
      state.player.car = null;
    }
    state.player.onFoot = true;
    state.player.x = city.playerSpawn.x;
    state.player.y = city.playerSpawn.y;
    state.health = PLAYER.maxHealth;
    state.player.invuln = 2;
    showToast(reason === 'busted'
      ? `Busted! The police took $${lost} in fines.`
      : `You woke up at home, $${lost} lighter.`);
    hooks.audio.busted();
    return reason === 'busted' ? EVENT_BUSTED : EVENT_WRECKED;
  }

  function stepPlayer(dt, cmd) {
    const p = state.player;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (state.ramCooldown > 0) state.ramCooldown -= dt;

    if (p.onFoot) {
      const len = Math.hypot(cmd.move.x, cmd.move.y);
      if (len > 0) {
        const nx = p.x + (cmd.move.x / len) * PLAYER.walkSpeed * dt;
        const ny = p.y + (cmd.move.y / len) * PLAYER.walkSpeed * dt;
        const prevX = p.x;
        const prevY = p.y;
        p.x = nx;
        p.y = ny;
        if (inWater(city, p.x, p.y)) { p.x = prevX; p.y = prevY; }
        pushOutOfBuildings(city, p, PLAYER.radius);
        p.angle = Math.atan2(cmd.move.y, cmd.move.x);
      }
      p.aim = angleTo(p.x, p.y, cmd.aimX, cmd.aimY);
      if ((cmd.fire || cmd.firing) && p.fireCooldown <= 0) {
        if (state.ammo > 0) {
          state.ammo -= 1;
          state.bullets.push(makeBullet(
            p.x + Math.cos(p.aim) * 20, p.y + Math.sin(p.aim) * 20, p.aim, true,
          ));
          p.fireCooldown = COMBAT.fireCooldown;
          hooks.audio.shoot();
        } else if (cmd.fire) {
          hooks.audio.denied();
          showToast('Out of ammo - find Marisol, she keeps a stash in the cab.');
        }
      }
      if (cmd.enter) {
        const car = nearestCar(p.x, p.y, CAR.enterRadius);
        if (car) enterCar(car);
      }
    } else if (p.car) {
      const car = p.car;
      const prevX = car.x;
      const prevY = car.y;
      const top = car.kind === KIND_CAB ? CAR.taxiTopSpeed : car.kind === KIND_POLICE ? CAR.policeTopSpeed : CAR.topSpeed;
      driveCar(car, cmd.move, dt, top);
      car.x = Math.max(30, Math.min(city.width - 30, car.x));
      car.y = Math.max(30, Math.min(city.height - 30, car.y));
      if (inWater(city, car.x, car.y)) {
        car.x = prevX;
        car.y = prevY;
        car.speed = 0;
      }
      if (pushOutOfBuildings(city, car, 20)) {
        if (Math.abs(car.speed) > 220) {
          car.hp -= 12;
          hooks.audio.crash();
          for (let i = 0; i < 6; i += 1) state.particles.push(makeParticle(car.x, car.y, 'smoke', rng));
        }
        car.speed *= 0.4;
      }
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      if (cmd.enter) exitCar();
      // Hitting a pedestrian while driving is a crime the whole city sees.
      for (const ped of state.peds) {
        if (!ped.down && dist(car.x, car.y, ped.x, ped.y) < 26 && Math.abs(car.speed) > 60) {
          ped.down = true;
          ped.downTimer = 6;
          addWanted(2);
          showToast('You hit a pedestrian! The police are coming.');
          hooks.audio.crash();
        }
      }
      if (car.hp <= 0 && !car.wrecked) {
        wreckCar(car);
        exitCar();
        showToast('Your car is wrecked. Get out and find another ride.');
      }
    }
    hooks.audio.engine(p.car ? p.car.speed : 0, !p.onFoot);
  }

  function stepTraffic(dt) {
    for (const car of state.cars) {
      if (car.driver !== 'traffic' || car.wrecked) continue;
      driveTraffic(car, city, rng, dt);
      // Rear-end the player and the traffic car ahead slows down instead.
      if (state.player.car && dist(car.x, car.y, state.player.car.x, state.player.car.y) < 70) {
        car.speed = Math.min(car.speed, 60);
      }
    }
    // Player car bumping traffic: the hit costs a little speed and a little
    // paint, and the other car is shoved out of the way. Gated by the same
    // cooldown as the damage, so a long overlap cannot grind the player to
    // a halt one frame at a time.
    if (state.player.car) {
      const pc = state.player.car;
      for (const car of state.cars) {
        if (car === pc || car.wrecked) continue;
        if (dist(pc.x, pc.y, car.x, car.y) < 36) {
          const nx = (car.x - pc.x) / 36;
          const ny = (car.y - pc.y) / 36;
          car.x += nx * 26;
          car.y += ny * 26;
          if (state.ramCooldown <= 0) {
            car.hp -= 14;
            pc.hp -= 6;
            state.ramCooldown = 0.4;
            pc.speed *= 0.9;
            hooks.audio.crash();
            for (let i = 0; i < 5; i += 1) state.particles.push(makeParticle(car.x, car.y, 'smoke', rng));
          }
          if (car.hp <= 0 && !car.wrecked) wreckCar(car);
        }
      }
    }
  }

  function stepPeds(dt) {
    state.hailTimer -= dt;
    for (const ped of state.peds) {
      if (ped.down) {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) { ped.down = false; ped.x += 30; }
        continue;
      }
      ped.walkPhase += dt * 6;
      if (ped.hailing) continue;
      if (randChance(rng, 0.004)) ped.angle = randRange(rng, 0, Math.PI * 2);
      const prevX = ped.x;
      const prevY = ped.y;
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (inWater(city, ped.x, ped.y) || ped.x < 40 || ped.y < 40 || ped.x > city.width - 380 || ped.y > city.height - 60) {
        ped.x = prevX;
        ped.y = prevY;
        ped.angle += Math.PI / 2;
      }
      pushOutOfBuildings(city, ped, 10);
    }
    // Keep a few people waving for a cab.
    if (state.hailTimer <= 0) {
      state.hailTimer = 6;
      let hailing = 0;
      for (const ped of state.peds) if (ped.hailing) hailing += 1;
      if (hailing < HAILING_COUNT && !state.fare) {
        const candidates = state.peds.filter((ped) => !ped.hailing && !ped.down);
        if (candidates.length > 0) candidates[Math.floor(rng() * candidates.length)].hailing = true;
      }
    }
  }

  function stepFare(dt) {
    void dt;
    if (state.fare) {
      const dest = state.fare.dest;
      if (dist(state.player.x, state.player.y, dest.x, dest.y) < 120) {
        const amount = state.fare.amount + (randChance(rng, 0.3) ? 10 : 0);
        state.cash += amount;
        hooks.audio.cash();
        showToast(`Fare done - $${amount} in your pocket.`);
        state.fare = null;
        state.fareMarker = null;
        hooks.saveGame();
      }
      return;
    }
    // Pick up a waving pedestrian when Rae drives her cab up to them.
    if (!state.player.onFoot && state.player.car && state.player.car.kind === KIND_CAB) {
      for (const ped of state.peds) {
        if (!ped.hailing || ped.down) continue;
        if (dist(state.player.x, state.player.y, ped.x, ped.y) < 75) {
          ped.hailing = false;
          const dest = randomRoadSpot(rng, city);
          const amount = randInt(rng, FARES.min, FARES.max);
          state.fare = { ped, dest, amount };
          state.fareMarker = { x: dest.x, y: dest.y, label: `Fare to ${districtAt(dest.x, dest.y)}` };
          showToast(`Fare: take them to ${districtAt(dest.x, dest.y)} ($${amount}).`);
          hooks.audio.pickup();
          state.peds = state.peds.filter((other) => other !== ped);
          break;
        }
      }
    }
  }

  function stepPolice(dt) {
    const px = state.player.x;
    const py = state.player.y;
    // Wanted cars: keep the right number of police cars on the road.
    let policeCars = state.cars.filter((car) => car.kind === KIND_POLICE && !car.wrecked);
    const wantedCars = Math.min(state.wanted, POLICE.maxCars);
    while (policeCars.length < wantedCars) {
      policeCars.push(spawnPoliceCar());
    }
    if (policeCars.length > wantedCars) {
      // The extra cars give up once they are far away; at zero wanted they
      // all stand down at once.
      for (const car of policeCars) {
        if (policeCars.length <= wantedCars) break;
        if (wantedCars === 0 || dist(car.x, car.y, px, py) > 900) {
          state.cars = state.cars.filter((other) => other !== car);
          policeCars = policeCars.filter((other) => other !== car);
        }
      }
    }
    for (const car of policeCars) {
      chasePoint(car, px, py, dt, CAR.policeTopSpeed);
      if (pushOutOfBuildings(city, car, 20)) car.speed *= 0.5;
      if (inWater(city, car.x, car.y)) { car.speed = 0; car.x = px + 400; car.y = py; }
      const d = dist(car.x, car.y, px, py);
      if (d < 44 && state.ramCooldown <= 0) {
        state.ramCooldown = 0.6;
        if (state.player.car) {
          state.player.car.hp -= POLICE.ramDamage;
          state.player.car.speed *= 0.88;
          hooks.audio.crash();
        } else if (state.player.invuln <= 0) {
          state.health -= POLICE.ramDamage;
          state.player.invuln = 0.8;
          hooks.audio.crash();
        }
      }
      if (car.hp <= 0 && !car.wrecked) {
        wreckCar(car);
        showToast('Police car wrecked! That will not go unnoticed.');
      }
    }
    // Foot officers at two stars and up.
    const wantedOfficers = state.wanted >= 2 ? Math.min(3, state.wanted - 1) : 0;
    while (state.officers.length < wantedOfficers) spawnOfficer();
    if (state.officers.length > wantedOfficers) {
      state.officers = state.officers.slice(0, wantedOfficers);
    }
    for (const officer of state.officers) {
      officer.angle = angleTo(officer.x, officer.y, px, py);
      officer.x += Math.cos(officer.angle) * officer.speed * dt;
      officer.y += Math.sin(officer.angle) * officer.speed * dt;
      officer.walkPhase += dt * 8;
      pushOutOfBuildings(city, officer, 10);
      if (state.player.onFoot && dist(officer.x, officer.y, px, py) < POLICE.bustRadius) {
        state.bustedEvent = EVENT_BUSTED;
      }
    }
    // Heat cools off when no police can see Rae for a while.
    let nearestPolice = Infinity;
    for (const car of policeCars) nearestPolice = Math.min(nearestPolice, dist(car.x, car.y, px, py));
    for (const officer of state.officers) nearestPolice = Math.min(nearestPolice, dist(officer.x, officer.y, px, py));
    if (state.wanted > 0) {
      if (nearestPolice > 700) {
        state.calmTimer += dt;
        if (state.calmTimer >= POLICE.calmSeconds) {
          state.wanted -= 1;
          state.calmTimer = 0;
          showToast(state.wanted === 0 ? 'You lost them. The heat is off.' : `Heat dropping - ${state.wanted} star${state.wanted === 1 ? '' : 's'} left.`);
        }
      } else {
        state.calmTimer = 0;
      }
    }
  }

  function stepRivals(dt) {
    const px = state.player.x;
    const py = state.player.y;
    for (const rival of state.rivals) {
      const d = dist(rival.x, rival.y, px, py);
      rival.angle = angleTo(rival.x, rival.y, px, py);
      if (d > 160) {
        rival.x += Math.cos(rival.angle) * 130 * dt;
        rival.y += Math.sin(rival.angle) * 130 * dt;
      }
      rival.walkPhase += dt * 6;
      rival.shootTimer -= dt;
      if (rival.shootTimer <= 0 && d < 520) {
        rival.shootTimer = COMBAT.rivalShotCooldown + randRange(rng, 0, 0.6);
        state.bullets.push(makeBullet(rival.x, rival.y, rival.angle, false));
        hooks.audio.rivalShoot();
      }
      pushOutOfBuildings(city, rival, 11);
    }
  }

  function stepBullets(dt) {
    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0) continue;
      if (bullet.fromPlayer) {
        for (const rival of state.rivals) {
          if (dist(bullet.x, bullet.y, rival.x, rival.y) < 17) {
            rival.hp -= COMBAT.pistolDamage;
            bullet.life = 0;
            state.particles.push(makeParticle(bullet.x, bullet.y, 'spark', rng));
            if (rival.hp <= 0) {
              state.cash += 25;
              showToast('Rival down - $25 lifted from his pocket.');
            }
            break;
          }
        }
        if (bullet.life <= 0) continue;
        for (const car of state.cars) {
          if (car.wrecked) continue;
          if (dist(bullet.x, bullet.y, car.x, car.y) < 27) {
            car.hp -= COMBAT.pistolDamage;
            bullet.life = 0;
            state.particles.push(makeParticle(bullet.x, bullet.y, 'spark', rng));
            if (car.kind === KIND_POLICE && car.hp <= 0) wreckCar(car);
            else if (car.kind !== KIND_POLICE && car.hp <= 0) wreckCar(car);
            break;
          }
        }
        if (bullet.life <= 0) continue;
        for (const ped of state.peds) {
          if (!ped.down && dist(bullet.x, bullet.y, ped.x, ped.y) < 14) {
            ped.down = true;
            ped.downTimer = 6;
            addWanted(1);
            bullet.life = 0;
            showToast('You shot a bystander! The police are coming.');
            break;
          }
        }
      } else {
        if (state.player.onFoot && state.player.invuln <= 0 && dist(bullet.x, bullet.y, state.player.x, state.player.y) < 15) {
          state.health -= COMBAT.rivalDamage;
          state.player.invuln = 0.5;
          bullet.life = 0;
        } else if (state.player.car && dist(bullet.x, bullet.y, state.player.car.x, state.player.car.y) < 27) {
          state.player.car.hp -= 10;
          bullet.life = 0;
        }
      }
    }
    state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > 0 && b.y > 0 && b.x < city.width && b.y < city.height);
    state.rivals = state.rivals.filter((r) => r.hp > 0);
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    // Wrecked cars smoke for a while, then stay as burnt shells.
    for (const car of state.cars) {
      if (car.wrecked && randChance(rng, 0.06)) {
        state.particles.push(makeParticle(car.x + randRange(rng, -14, 14), car.y + randRange(rng, -10, 10), 'smoke', rng));
      }
    }
  }

  function step(dt, cmd, harmless) {
    state.elapsed += dt;
    state.clockMin = (state.clockMin + dt) % (24 * 60);
    if (state.toastTimer > 0) state.toastTimer -= dt;

    // The title screen's backdrop: the city lives, nothing can hurt Rae.
    if (harmless) {
      stepTraffic(dt);
      stepPeds(dt);
      state.camera.x += Math.cos(state.elapsed * 0.05) * 12 * dt;
      state.camera.y += Math.sin(state.elapsed * 0.04) * 10 * dt;
      return 0;
    }

    let events = 0;
    stepPlayer(dt, cmd);
    stepTraffic(dt);
    stepPeds(dt);
    stepFare(dt);
    stepPolice(dt);
    stepRivals(dt);
    stepBullets(dt);
    director.update(state, dt);

    if (state.bustedEvent) {
      state.bustedEvent = 0;
      events |= bustPlayer('busted');
    }
    if (state.health <= 0) {
      events |= bustPlayer('wrecked');
    }
    if (state.player.car && state.player.car.hp <= 0 && !state.player.car.wrecked) {
      wreckCar(state.player.car);
      exitCar();
    }

    state.district = districtAt(state.player.x, state.player.y);
    const targetX = state.player.x;
    const targetY = state.player.y;
    state.camera.x += (targetX - state.camera.x) * Math.min(1, 5 * dt);
    state.camera.y += (targetY - state.camera.y) * Math.min(1, 5 * dt);
    return events;
  }

  reset();

  return {
    state,
    city,
    director,
    reset,
    step,
    snapshot() {
      return {
        cash: state.cash,
        health: state.health,
        ammo: state.ammo,
        missionIndex: director.index,
        missionsDone: state.missionsDone,
      };
    },
    restoreSave(save) {
      if (!save) return;
      if (typeof save.cash === 'number') state.cash = save.cash;
      if (typeof save.health === 'number') state.health = save.health;
      if (typeof save.ammo === 'number') state.ammo = save.ammo;
      if (typeof save.missionsDone === 'number') state.missionsDone = save.missionsDone;
      if (typeof save.missionIndex === 'number') director.restore(save.missionIndex);
    },
  };
}
