import type { CardType } from "../schema/front-matter.js";

const CLOZE = /\{\{c(\d+)::/g;

/**
 * How many gaps each cloze number has in a question: `{ 1: 1, 2: 2 }` means `c1` hides one span and
 * `c2` two. Variants are derived from it, and `check` uses the counts to flag a variant with more than one
 * gap.
 */
export const clozeGapCounts = (
  question: string,
): ReadonlyMap<number, number> => {
  const counts = new Map<number, number>();
  for (const match of question.matchAll(CLOZE)) {
    const number = Number(match[1]);
    counts.set(number, (counts.get(number) ?? 0) + 1);
  }
  return counts;
};

const CLOZE_TYPES: ReadonlySet<CardType> = new Set(["cloze", "grammar-cloze"]);
const TWO_WAY_TYPES: ReadonlySet<CardType> = new Set(["reversed", "vocab"]);

export const isClozeType = (type: CardType): boolean => CLOZE_TYPES.has(type);

/**
 * The variants a card is scheduled as: one review item per variant, `<id>:<variant>`. A cloze card has
 * one variant per cloze number, so adding a gap adds an item without touching the others' history. An
 * occlusion card has no mask format yet and schedules as one item until it gets one.
 */
export const variantsFor = (
  type: CardType,
  question: string,
): readonly string[] => {
  if (CLOZE_TYPES.has(type)) {
    return [...clozeGapCounts(question).keys()]
      .sort((a, b) => a - b)
      .map((n) => `c${String(n)}`);
  }
  if (TWO_WAY_TYPES.has(type)) return ["fwd", "rev"];
  return ["main"];
};
