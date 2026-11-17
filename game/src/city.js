// city.js — builds Solmar Bay from a seed: the road grid, the blocks and their
// buildings, the beach and the bay, the park, the plaza and the marina, plus the
// named places missions and the minimap use.

import { WORLD, PALETTE, DISTRICTS } from './config.js';
import { mulberry32, range, pick, intRange } from './random.js';

export function roadCenters() {
  // Roads stop at the beach: the southernmost grid line would run through the bay.
  const centers = [];
  for (let c = WORLD.roadEvery / 2; c < WORLD.beachY; c += WORLD.roadEvery) centers.push(c);
  return centers;
}

export function isOnRoad(x, y) {
  const half = WORLD.roadWidth / 2;
  for (const c of roadCenters()) {
    if (Math.abs(x - c) < half || Math.abs(y - c) < half) return true;
  }
  return false;
}

export function nearestRoadPoint(x, y) {
  const centers = roadCenters();
  let best = { x, y, d: Infinity };
  for (const c of centers) {
    const d = Math.abs(x - c);
    if (d < best.d) best = { x: c, y, d };
    const dy = Math.abs(y - c);
    if (dy < best.d) best = { x, y: c, d: dy };
  }
  return best;
}

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const centers = roadCenters();
  const buildings = [];
  const palms = [];
  const parks = [];
  const lots = [];

  // One building (or a small cluster) per block, kept off the roads and the beach.
  for (let bx = 0; bx < centers.length - 1; bx += 1) {
    for (let by = 0; by < centers.length - 1; by += 1) {
      const x0 = centers[bx] + WORLD.roadWidth / 2 + 14;
      const y0 = centers[by] + WORLD.roadWidth / 2 + 14;
      const x1 = centers[bx + 1] - WORLD.roadWidth / 2 - 14;
      const y1 = centers[by + 1] - WORLD.roadWidth / 2 - 14;
      if (y0 > WORLD.beachY - 60) continue; // the beach strip stays open
      const roll = rng();
      if (roll < 0.14) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let i = 0; i < 5; i += 1) {
          palms.push({ x: range(rng, x0 + 10, x1 - 10), y: range(rng, y0 + 10, y1 - 10), s: range(rng, 0.8, 1.3) });
        }
        continue;
      }
      if (roll < 0.2) {
        lots.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }); // empty lot / parking
        continue;
      }
      const count = rng() < 0.45 ? 1 : 2;
      for (let i = 0; i < count; i += 1) {
        const w = range(rng, 70, Math.min(150, (x1 - x0) / count - 8));
        const h = range(rng, 60, Math.min(130, y1 - y0 - 8));
        const x = x0 + (i * (x1 - x0)) / count + range(rng, 2, 10);
        const y = y0 + range(rng, 2, Math.max(3, y1 - y0 - h - 4));
        buildings.push({
          x, y, w, h,
          color: pick(rng, PALETTE.buildingRoof),
          tall: rng() < 0.3,
          roof: intRange(rng, 0, 2),
        });
      }
    }
  }

  // Palm rows along the beach and the marina promenade.
  for (let x = 60; x < WORLD.size; x += 90) {
    palms.push({ x: x + range(rng, -14, 14), y: WORLD.beachY + range(rng, 14, 60), s: range(rng, 0.9, 1.4) });
  }
  for (let y = 200; y < WORLD.beachY; y += 260) {
    if (rng() < 0.5) palms.push({ x: WORLD.size - 46, y: y + range(rng, -30, 30), s: range(rng, 0.8, 1.2) });
  }

  const places = {
    start: { x: 910, y: 910, name: 'Rae\u2019s apartment, Palm Court' },
    marina: { x: 2470, y: 2210, name: 'Marina Bay docks' },
    plaza: { x: 1300, y: 1300, name: 'Solmar Plaza' },
    garage: { x: 390, y: 2210, name: 'Old Port garage' },
    diner: { x: 650, y: 650, name: 'Sunset Diner' },
    pier: { x: 1300, y: 2520, name: 'The Pier' },
    bank: { x: 1560, y: 910, name: 'Bay Trust Bank' },
  };

  return { seed, centers, buildings, palms, parks, lots, places, districts: DISTRICTS };
}

export function collideBuildings(city, x, y, radius) {
  // Push a circle out of every building it overlaps; returns the corrected point.
  let px = x;
  let py = y;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(px, b.x + b.w));
    const cy = Math.max(b.y, Math.min(py, b.y + b.h));
    const dx = px - cx;
    const dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        px = cx + (dx / d) * radius;
        py = cy + (dy / d) * radius;
      } else {
        py = b.y - radius;
      }
    }
  }
  px = Math.max(20, Math.min(WORLD.size - 20, px));
  py = Math.max(20, Math.min(WORLD.size - 20, py));
  return { x: px, y: py };
}

export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  }
  return false;
}
