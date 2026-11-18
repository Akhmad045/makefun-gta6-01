// Solmar Bay's city, generated from a seed: a road grid with named districts, a
// beach and a bay with a pier, parks, plazas and palm rows. Everything the
// renderer and the traffic AI need lives on the object this returns, including
// the small helpers that answer "is this a road?" and "which district is this?".

import { DISTRICTS, PALETTE, WORLD } from './config.js';
import { randChance, randInt, randPick, randRange } from './random.js';

export const ROAD_W = 72;
export const ROADS_V = [320, 720, 1120, 1520, 1920, 2320, 2720, 3120];
export const ROADS_H = [300, 640, 980, 1320, 1660, 2000, 2320];

const BEACH_X0 = 3300;
const WATER_X0 = 3440;
const SOUTH_WATER_Y0 = 2440;

export function buildCity(rng) {
  const buildings = [];
  const parks = [];
  const plazas = [];
  const palms = [];
  const trees = [];

  // Fill the blocks between roads. A block is either buildings, a park, a
  // plaza, or an empty lot with a few trees. Blocks past the beach line stay
  // sand; the bay itself stays water.
  const edgesV = [0, ...ROADS_V, BEACH_X0];
  const edgesH = [0, ...ROADS_H, SOUTH_WATER_Y0];
  for (let bi = 0; bi < edgesV.length - 1; bi += 1) {
    for (let bj = 0; bj < edgesH.length - 1; bj += 1) {
      const x0 = edgesV[bi] + 52;
      const x1 = edgesV[bi + 1] - 52;
      const y0 = edgesH[bj] + 52;
      const y1 = edgesH[bj + 1] - 52;
      if (x1 - x0 < 70 || y1 - y0 < 70) continue;
      const roll = rng();
      if (roll < 0.16) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        const count = randInt(rng, 4, 9);
        for (let t = 0; t < count; t += 1) {
          trees.push({ x: randRange(rng, x0 + 14, x1 - 14), y: randRange(rng, y0 + 14, y1 - 14), r: randRange(rng, 9, 15) });
        }
      } else if (roll < 0.26) {
        plazas.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        const count = randInt(rng, 2, 5);
        for (let t = 0; t < count; t += 1) {
          palms.push({ x: randRange(rng, x0 + 16, x1 - 16), y: randRange(rng, y0 + 16, y1 - 16) });
        }
      } else if (roll < 0.82) {
        const count = randInt(rng, 1, 3);
        for (let b = 0; b < count; b += 1) {
          const w = randRange(rng, 70, Math.min(190, x1 - x0 - 16));
          const h = randRange(rng, 60, Math.min(150, y1 - y0 - 16));
          const x = randRange(rng, x0 + 8, x1 - w - 8);
          const y = randRange(rng, y0 + 8, y1 - h - 8);
          buildings.push({
            x, y, w, h,
            color: randPick(rng, PALETTE.building),
            roof: randPick(rng, PALETTE.roof),
            tall: randChance(rng, 0.3),
          });
        }
      } else {
        const count = randInt(rng, 1, 4);
        for (let t = 0; t < count; t += 1) {
          trees.push({ x: randRange(rng, x0 + 14, x1 - 14), y: randRange(rng, y0 + 14, y1 - 14), r: randRange(rng, 8, 13) });
        }
      }
    }
  }

  // Palm rows along the beach and along the Marina Bay promenade.
  for (let y = 120; y < WORLD.height - 120; y += 130) {
    palms.push({ x: randRange(rng, 3330, 3410), y: y + randRange(rng, -20, 20) });
  }
  for (let x = 1800; x < 3260; x += 150) {
    if (randChance(rng, 0.7)) palms.push({ x: x + randRange(rng, -14, 14), y: 1690 });
  }

  const city = {
    width: WORLD.width,
    height: WORLD.height,
    roadsV: ROADS_V,
    roadsH: ROADS_H,
    roadW: ROAD_W,
    buildings,
    parks,
    plazas,
    palms,
    trees,
    beach: { x0: BEACH_X0, x1: WATER_X0 },
    water: [
      { x: WATER_X0, y: 0, w: WORLD.width - WATER_X0, h: WORLD.height },
      { x: 0, y: SOUTH_WATER_Y0, w: WORLD.width, h: WORLD.height - SOUTH_WATER_Y0 },
    ],
    pier: { x: 3290, y: 1452, w: 290, h: 34 },
    // Rae's apartment block and the yellow cab parked on the avenue outside.
    apartment: { x: 470, y: 700, w: 130, h: 110 },
    cabSpot: { x: 720, y: 612, angle: -Math.PI / 2 },
    playerSpawn: { x: 700, y: 700, angle: -Math.PI / 2 },
    // Story markers, all on or beside a road so a car can reach them.
    spots: {
      client: { x: 2720, y: 1500, label: 'Marisol\u2019s client' },
      palmDrop: { x: 720, y: 1500, label: 'Palm Court drop-off' },
      warehouse: { x: 2900, y: 640, label: 'Old Port warehouse' },
      downtownDrop: { x: 1120, y: 640, label: 'Downtown drop-off' },
      targetCar: { x: 1360, y: 2000, label: 'The marked coupe' },
      garage: { x: 760, y: 2200, label: 'Marisol\u2019s garage' },
    },
  };

  return city;
}

export function isRoad(city, x, y) {
  const half = city.roadW / 2;
  for (const rx of city.roadsV) {
    if (Math.abs(x - rx) <= half && y >= -half && y <= city.height + half) return true;
  }
  for (const ry of city.roadsH) {
    if (Math.abs(y - ry) <= half && x >= -half && x <= city.width + half) return true;
  }
  return false;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
  }
  return 'Solmar Bay';
}

export function inWater(city, x, y) {
  for (const w of city.water) {
    if (x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h) return true;
  }
  return false;
}

export function onSand(city, x, y) {
  return x >= city.beach.x0 && x < city.beach.x1 && y < SOUTH_WATER_Y0;
}

export function randomIntersection(rng, city) {
  return {
    x: randPick(rng, city.roadsV),
    y: randPick(rng, city.roadsH),
  };
}

// A point on a road, for spawning traffic cars.
export function randomRoadSpot(rng, city) {
  if (rng() < 0.5) {
    return { x: randPick(rng, city.roadsV) + randRange(rng, -14, 14), y: randRange(rng, 120, city.height - 220) };
  }
  return { x: randRange(rng, 120, city.width - 420), y: randPick(rng, city.roadsH) + randRange(rng, -14, 14) };
}

// A point on a sidewalk beside a road, for spawning pedestrians.
export function randomSidewalkSpot(rng, city) {
  if (rng() < 0.5) {
    const rx = randPick(rng, city.roadsV);
    return { x: rx + (rng() < 0.5 ? -48 : 48), y: randRange(rng, 120, city.height - 220) };
  }
  const ry = randPick(rng, city.roadsH);
  return { x: randRange(rng, 120, city.width - 420), y: ry + (rng() < 0.5 ? -48 : 48) };
}

// Push a circle out of every building it overlaps. Returns true when it hit.
export function pushOutOfBuildings(city, ent, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(ent.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(ent.y, b.y + b.h));
    const dx = ent.x - cx;
    const dy = ent.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        ent.x = cx + (dx / d) * radius;
        ent.y = cy + (dy / d) * radius;
      } else {
        ent.y = b.y - radius;
      }
    }
  }
  // The apartment block is solid too.
  const a = city.apartment;
  const cx = Math.max(a.x, Math.min(ent.x, a.x + a.w));
  const cy = Math.max(a.y, Math.min(ent.y, a.y + a.h));
  const dx = ent.x - cx;
  const dy = ent.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 < radius * radius) {
    hit = true;
    if (d2 > 0.01) {
      const d = Math.sqrt(d2);
      ent.x = cx + (dx / d) * radius;
      ent.y = cy + (dy / d) * radius;
    } else {
      ent.y = a.y - radius;
    }
  }
  return hit;
}
