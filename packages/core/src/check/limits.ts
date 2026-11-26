import type { CardType } from "../schema/front-matter.js";

// The numbers come from the card-writing rules: a question read in one pass, an answer within the
// minimum-information principle, a rubric checkable in about thirty seconds, code that fits on a screen.
// They are revisited by metrics (answer time, leech share), not per card.

export const QUESTION_WORDS_DEFAULT = 25;
export const QUESTION_WORDS_SCENARIO = 60;

export const questionWordLimit = (type: CardType): number =>
  type === "scenario" ? QUESTION_WORDS_SCENARIO : QUESTION_WORDS_DEFAULT;

const ANSWER_WORDS: Partial<Record<CardType, number>> = {
  basic: 12,
  cloze: 12,
  vocab: 12,
  why: 40,
  compare: 40,
};

/** The answer word limit of a type, or `undefined` when the rules set none (scenario is graded by its rubric). */
export const answerWordLimit = (type: CardType): number | undefined =>
  ANSWER_WORDS[type];

export const ANSWER_POINTS_LIMIT = 3;
export const answerPointTypes: ReadonlySet<CardType> = new Set([
  "why",
  "compare",
]);

export const RUBRIC_ITEMS_LIMIT = 5;
export const rubricTypes: ReadonlySet<CardType> = new Set([
  "scenario",
  "design",
]);
export const RUBRIC_REQUIRED_MARK = "(!)";

export const CODE_LINES_LIMIT = 12;
export const CODE_WIDTH_LIMIT = 80;

export const CLOZE_VARIANTS_LIMIT = 3;

/** Share of changed words in Question or Answer above which an edit of an active card probably changed its meaning. */
export const ACTIVE_EDIT_THRESHOLD = 0.4;
