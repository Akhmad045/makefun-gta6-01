// random.js — Solmar Bay's seeded dice.
// mulberry32 gives the city, the traffic and the screenshot scenes the same
// layout on every run that starts from the same seed, so a shot taken today
// matches a shot taken tomorrow.

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// A float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// One element of a list, picked uniformly.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// An integer in [min, max], both ends inclusive.
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
