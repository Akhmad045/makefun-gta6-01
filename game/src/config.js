// Every tuning number, colour and label in one place, so the rest of the game
// never hard-codes a magic value. Solmar Bay is a fixed-size world (3600 x 2600
// units); the camera shows a 1280 x 800 logical window of it at zoom 1.

export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay.save.v1';

export const WORLD = { width: 3600, height: 2600 };

export const VIEW = { width: 1280, height: 800 };

export const PLAYER = {
  walkSpeed: 165,
  radius: 13,
  maxHealth: 100,
  startCash: 40,
  startAmmo: 24,
  maxAmmo: 120,
};

export const CAR = {
  accel: 420,
  brake: 620,
  reverseTop: 150,
  drag: 0.55,
  grip: 2.6,
  topSpeed: 560,
  taxiTopSpeed: 500,
  policeTopSpeed: 600,
  enterRadius: 105,
};

export const POLICE = {
  ramDamage: 9,
  bustRadius: 26,
  calmSeconds: 9,
  maxCars: 5,
};

export const COMBAT = {
  bulletSpeed: 900,
  bulletLife: 0.9,
  pistolDamage: 34,
  fireCooldown: 0.22,
  rivalShotCooldown: 1.4,
  rivalDamage: 8,
};

export const FARES = { min: 18, max: 55 };

export const MISSION_REWARDS = { fare: 120, package: 350, heist: 900 };

export const DISTRICTS = [
  { name: 'Downtown', x0: 0, y0: 0, x1: 1680, y1: 1080 },
  { name: 'Old Port', x0: 1680, y0: 0, x1: 3600, y1: 1080 },
  { name: 'Palm Court', x0: 0, y0: 1080, x1: 1680, y1: 1880 },
  { name: 'North Hills', x0: 0, y0: 1880, x1: 1680, y1: 2600 },
  { name: 'Marina Bay', x0: 1680, y0: 1080, x1: 3600, y1: 2600 },
];

export const PALETTE = {
  backdrop: '#0b1020',
  grass: '#3f7a4a',
  grassDark: '#35683f',
  sand: '#d9c08a',
  water: '#1d6f8f',
  waterDeep: '#155a75',
  road: '#33363d',
  roadEdge: '#4a4e57',
  lane: '#e8d44d',
  sidewalk: '#8a8d94',
  building: ['#b5674e', '#7a6a8f', '#4e7a8f', '#8f7a4e', '#5e8f6a', '#94604e', '#6a5e7a', '#7a8a9a'],
  roof: ['#5a4a3a', '#3a4a5a', '#6a3a3a', '#4a5a3a', '#3a3a4a'],
  park: '#2f6b3a',
  tree: '#2c6b34',
  palm: '#3f8f4a',
  pier: '#7a5c3e',
  cab: '#f2c230',
  player: '#e84a5f',
  police: '#2b5fd9',
  policeLight: '#ff3b30',
  rival: '#8a2f2f',
  text: '#f4f1e8',
  muted: '#b9c0cc',
  gold: '#f2c230',
  panel: 'rgba(12, 16, 30, 0.88)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const CONTROLS_TEXT = [
  'W A S D / arrows - walk or drive',
  'E - get in / out of a car',
  'Mouse - aim, click or F - fire pistol',
  'M - mute, P - pause, Enter - start',
];
