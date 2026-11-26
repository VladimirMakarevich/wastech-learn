/** A source of numbers in [0, 1) that the caller seeds; srs never reaches for Math.random. */
export type Rng = () => number;

/**
 * Mulberry32: tiny, fast and good enough for simulation and test data. The point is reproducibility: the
 * same seed gives the same synthetic log and the same report on every machine.
 */
export const seededRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** A deterministic shuffle for tests and simulations that need "any order" to be a fixed order. */
export const shuffled = <T>(values: readonly T[], rng: Rng): T[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(rng() * (index + 1));
    const current = result[index] as T;
    result[index] = result[other] as T;
    result[other] = current;
  }
  return result;
};
