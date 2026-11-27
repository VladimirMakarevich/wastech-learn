import { ACTIVE_EDIT_THRESHOLD } from "../check/limits.js";
import { changedWordShare } from "../check/rules/active-edit.js";
import { splitFrontMatter } from "../parse/front-matter.js";
import { findSection, readSections } from "../parse/sections.js";
import { variantsFor } from "../parse/variants.js";
import {
  cardFrontMatterSchema,
  type CardStatus,
  type CardType,
} from "../schema/front-matter.js";

/** A section of an active card rewritten past the threshold, with the share of words that changed. */
export interface LargeEdit {
  readonly section: string;
  readonly percent: number;
}

/**
 * Why an edit may have turned a card into another one. Either list being non-empty means the learner is
 * asked whether it is still the same card before anything is written.
 */
export interface CardEditDecision {
  readonly largeEdit: readonly LargeEdit[];
  /** Variants the card had and no longer has: their history would describe no card at all. */
  readonly removedVariants: readonly string[];
}

const NO_DECISION: CardEditDecision = { largeEdit: [], removedVariants: [] };

interface ReadCard {
  readonly status: CardStatus;
  readonly type: CardType;
  readonly question: string | undefined;
  readonly answer: string | undefined;
}

const readCard = (text: string): ReadCard | undefined => {
  const split = splitFrontMatter(text);
  if (!split.ok) return undefined;
  const front = cardFrontMatterSchema.safeParse(split.data);
  if (!front.success) return undefined;
  const { sections } = readSections(split.body, split.bodyLine);
  return {
    status: front.data.status,
    type: front.data.type,
    question: findSection(sections, "Question")?.markdown,
    answer: findSection(sections, "Answer")?.markdown,
  };
};

export const needsMeaningDecision = (decision: CardEditDecision): boolean =>
  decision.largeEdit.length > 0 || decision.removedVariants.length > 0;

/**
 * Compares a card as it was opened with the text about to be saved. Only a card that stays active
 * carries review history worth protecting; a draft has none yet and a retired card is out of the queue.
 * The comparison is against the opened text, not the last commit, so a second save of an edit already
 * on disk does not ask again. A text that cannot be read gives no decision: the checks report it.
 */
export const cardEditDecision = (
  before: string,
  after: string,
): CardEditDecision => {
  const old = readCard(before);
  const next = readCard(after);
  if (old?.status !== "active" || next?.status !== "active") return NO_DECISION;
  // Without both sections the card is broken, not reworded: the checks say so, a question would not.
  if (
    old.question === undefined ||
    old.answer === undefined ||
    next.question === undefined ||
    next.answer === undefined
  )
    return NO_DECISION;
  const largeEdit: LargeEdit[] = [];
  for (const [section, was, now] of [
    ["Question", old.question, next.question],
    ["Answer", old.answer, next.answer],
  ] as const) {
    const share = changedWordShare(was, now);
    if (share > ACTIVE_EDIT_THRESHOLD)
      largeEdit.push({ section, percent: Math.round(share * 100) });
  }
  const kept = new Set(variantsFor(next.type, next.question));
  const removedVariants = variantsFor(old.type, old.question).filter(
    (variant) => !kept.has(variant),
  );
  return { largeEdit, removedVariants };
};
