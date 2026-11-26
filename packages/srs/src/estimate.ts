import type { QueueCard } from "./ports.js";

/**
 * What an answer takes before the user's own history says otherwise: a fact is read and recalled in
 * seconds, a mechanism or a comparison takes a sentence, a scenario takes a plan.
 */
export const DEFAULT_DURATION_MS: Readonly<Record<string, number>> = {
  basic: 8_000,
  cloze: 8_000,
  reversed: 8_000,
  vocab: 8_000,
  "grammar-cloze": 8_000,
  occlusion: 8_000,
  salience: 8_000,
  why: 20_000,
  compare: 20_000,
  bug: 20_000,
  explain: 20_000,
  scenario: 45_000,
  design: 45_000,
  draw: 45_000,
};

const FALLBACK_DURATION_MS = 20_000;

// A median of a handful of answers swings with one distracted evening; below this many the default holds.
export const MIN_SAMPLES = 10;

// A card left open overnight would teach the estimate that recall takes hours; past two minutes the
// time says nothing about the card.
const MAX_DURATION_MS = 120_000;

/** A timed answer from the log; core's review event matches this shape. */
export interface DurationSample {
  readonly kind: string;
  readonly item: string;
  readonly durMs?: number | undefined;
}

export interface DurationEstimates {
  /** Milliseconds per answer, by card type. */
  readonly byType: Readonly<Record<string, number>>;
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
};

/**
 * Time per answer by card type: the median of the user's own timed reviews once there are enough of
 * them, the defaults until then. Practice answers count too: recall takes as long there.
 */
export const estimateDurations = (
  samples: readonly DurationSample[],
  cards: readonly QueueCard[],
): DurationEstimates => {
  const typeOf = new Map(cards.map((card) => [card.item, card.type]));
  const byType = new Map<string, number[]>();
  for (const sample of samples) {
    if (
      (sample.kind !== "review" && sample.kind !== "practice") ||
      sample.durMs === undefined
    )
      continue;
    const type = typeOf.get(sample.item);
    if (type === undefined) continue;
    const durations = byType.get(type) ?? [];
    durations.push(Math.min(sample.durMs, MAX_DURATION_MS));
    byType.set(type, durations);
  }
  const estimates: Record<string, number> = { ...DEFAULT_DURATION_MS };
  for (const [type, durations] of byType) {
    if (durations.length >= MIN_SAMPLES) estimates[type] = median(durations);
  }
  return { byType: estimates };
};

export const DEFAULT_ESTIMATES: DurationEstimates = {
  byType: DEFAULT_DURATION_MS,
};

export const estimateFor = (
  estimates: DurationEstimates,
  type: string,
): number =>
  estimates.byType[type] ?? DEFAULT_DURATION_MS[type] ?? FALLBACK_DURATION_MS;
