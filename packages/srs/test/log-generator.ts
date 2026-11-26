import {
  seededRng,
  type Rating,
  type ReplayEvent,
  type ReplayEventKind,
} from "../src/index.js";

export interface GeneratedLog {
  readonly items: readonly string[];
  /** The log as written by several writers: one array per file, in append order. */
  readonly files: readonly (readonly ReplayEvent[])[];
}

const KINDS: readonly [ReplayEventKind, number][] = [
  ["review", 0.84],
  ["practice", 0.04],
  ["suspend", 0.02],
  ["unsuspend", 0.02],
  ["reset", 0.01],
  ["manual_due", 0.02],
  ["undo", 0.05],
];

const pick = <T>(rng: () => number, weighted: readonly [T, number][]): T => {
  let roll = rng();
  for (const [value, weight] of weighted) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return weighted[0]![0];
};

/**
 * A realistic mixed log from a seed: reviews with every rating, practice, suspensions, resets, manual
 * moves and undos, spread over three writers, with some events synced into two files. The same seed always
 * gives the same log.
 */
export const generateLog = (
  seed: number,
  eventCount = 1000,
  itemCount = 60,
  spanDays = 150,
): GeneratedLog => {
  const meanGapMs = (spanDays * 86_400_000) / eventCount;
  const rng = seededRng(seed);
  const items = Array.from({ length: itemCount }, (_, index) => {
    const card = `c${String(index).padStart(7, "0")}`;
    return index % 3 === 0 ? `${card}:rev` : `${card}:main`;
  });
  const files: ReplayEvent[][] = [[], [], []];
  const written: ReplayEvent[] = [];
  let time = Date.parse("2026-01-01T08:00:00.000Z");
  for (let index = 0; index < eventCount; index++) {
    time += Math.floor(rng() * 2 * meanGapMs);
    const kind = pick(rng, KINDS);
    const item = items[Math.floor(rng() * items.length)]!;
    const base = {
      id: `01J${String(index).padStart(10, "0")}`,
      ts: new Date(time).toISOString(),
      kind,
      item,
    };
    let entry: ReplayEvent;
    if (kind === "review" || kind === "practice") {
      const rating = pick<Rating>(rng, [
        [1, 0.15],
        [2, 0.15],
        [3, 0.6],
        [4, 0.1],
      ]);
      entry = { ...base, rating };
    } else if (kind === "undo") {
      const target = written[Math.floor(rng() * written.length)];
      if (target === undefined) continue;
      entry = { ...base, item: target.item, target: target.id };
    } else if (kind === "manual_due") {
      entry = {
        ...base,
        due: new Date(time + Math.floor(rng() * 20) * 86_400_000).toISOString(),
      };
    } else {
      entry = base;
    }
    written.push(entry);
    const file = Math.floor(rng() * files.length);
    files[file]!.push(entry);
    if (rng() < 0.03) files[(file + 1) % files.length]!.push(entry);
  }
  return { items, files };
};
