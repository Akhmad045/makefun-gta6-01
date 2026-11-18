// Seeded randomness for Solmar Bay: one small generator (mulberry32) plus the
// helpers the city builder and the world use to pick things from it. The same
// seed always builds the same city, the same traffic and the same pedestrians,
// which is what makes the screenshot scenes repeatable.

export function seededRng(seed) {
  let a = (seed >>> 0) | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function randInt(rng, min, max) {
  return Math.floor(randRange(rng, min, max + 1));
}

export function randPick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function randChance(rng, probability) {
  return rng() < probability;
}

// A fair shuffle that consumes the same rng, so a shuffled list is still
// deterministic for a given seed.
export function shuffled(rng, list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
