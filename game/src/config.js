// Solmar Bay — a 2D top-down open-world crime game.
// config.js: every tunable number and the palette in one place.

export const WORLD = {
  size: 2600, // the city is a square, world units
  roadEvery: 260, // spacing of the road grid
  roadWidth: 58,
  beachY: 2320, // south of here is sand, then the bay
  waterY: 2470,
};

export const PLAYER = {
  walkSpeed: 175,
  radius: 11,
  maxHealth: 100,
  enterCarRange: 46,
};

export const CAR = {
  length: 48,
  width: 24,
  accel: 340,
  brake: 520,
  reverseMax: 150,
  maxSpeed: 430,
  sportMaxSpeed: 540,
  grip: 2.6, // steering authority, radians per second at full lock
  drag: 0.55,
};

export const POLICE = {
  maxSpeed: 470,
  accel: 380,
  ramDamage: 6,
  bustRange: 34,
  bustTime: 1.6, // seconds a cop must stay on the player to bust them
};

export const WANTED = {
  maxStars: 5,
  decayDelay: 9, // seconds unseen before stars start falling
  decayEvery: 6,
  copsPerStar: 2,
  maxCops: 6,
};

export const TRAFFIC = { cars: 14, peds: 26 };
export const SHOT = { seconds: 5 };

export const PALETTE = {
  grass: '#7fae62',
  grassDry: '#93bd74',
  sand: '#e8d5a4',
  water: '#2e8fb5',
  waterDeep: '#22779e',
  road: '#3d3f45',
  roadEdge: '#2c2e33',
  sidewalk: '#b9b3a4',
  lane: '#e8c84a',
  buildingRoof: ['#c96f4a', '#4a7fb5', '#b5a04a', '#8a5fa8', '#5fa88a', '#b5526a', '#6a8a4f', '#d98a3d'],
  buildingEdge: 'rgba(0,0,0,0.28)',
  park: '#5d9b4e',
  plaza: '#c9bfa8',
  carColors: ['#d94f3d', '#3d7bd9', '#e8c84a', '#7ab648', '#e8e8e8', '#222831', '#c96fd0', '#4fb8c9'],
  policeBody: '#e8e8ea',
  playerShirt: '#ffcf3f',
  minimapRoad: '#8a8f98',
};

export const DISTRICTS = [
  { name: 'Old Port', x: 0, y: 1950, w: 900, h: 370 },
  { name: 'Marina Bay', x: 1700, y: 1950, w: 900, h: 370 },
  { name: 'Downtown', x: 780, y: 780, w: 1040, h: 780 },
  { name: 'North Hills', x: 0, y: 0, w: 2600, h: 520 },
  { name: 'Palm Court', x: 0, y: 1300, w: 780, h: 650 },
];
