import type { Card } from "../model.js";
import { findSection } from "../parse/sections.js";
import { CLOZE_GAP, isClozeType } from "../parse/variants.js";

// Variants are numbered by value (`{{c01::` is variant `c1`), so gap numbers are compared as numbers too.
const askedGap = (variant: string): number => Number(variant.replace(/^c/, ""));

const isReverse = (card: Card, variant: string): boolean =>
  variant === "rev" &&
  (card.frontMatter.type === "reversed" || card.frontMatter.type === "vocab");

// A vocab answer is the translation plus an example sentence in italics, and that sentence uses the
// very word the reverse side asks for: `счёт (м. р.) - *Poproszę rachunek.*`. Content written before the
// repository settled on the ASCII hyphen joins them with an em or en dash, so those are trimmed too.
const EMPHASIS = /(\*[^*\n]+\*|_[^_\n]+_)/g;

/**
 * The answer side of a vocab card as a prompt for its reverse variant: the translation without the
 * example sentence, which would give the word away. A reversed card has no such sentence and is asked
 * with its whole answer.
 */
const reversePrompt = (card: Card): string => {
  const answer = card.answer.markdown;
  if (card.frontMatter.type !== "vocab") return answer;
  return answer
    .replace(EMPHASIS, "")
    .replace(/[\s\u2014\u2013:-]+$/u, "")
    .trim();
};

/**
 * What the learner sees before answering one review item, as Markdown: the question, with the gaps of
 * the asked cloze variant hidden (its hint, if any, stays visible) and the other gaps filled in; for the
 * reverse side of a two-way card, the answer side without the example sentence. Never contains the
 * answer of the item asked.
 */
export const promptMarkdown = (card: Card, variant: string): string => {
  if (isReverse(card, variant)) return reversePrompt(card);
  if (!isClozeType(card.frontMatter.type)) return card.question.markdown;
  const asked = askedGap(variant);
  return card.question.markdown.replace(
    CLOZE_GAP,
    (_match, number: string, answer: string, hint: string | undefined) =>
      Number(number) === asked ? `[${hint ?? "…"}]` : answer,
  );
};

/** What `reveal` shows after the attempt: the expected answer and what grading needs. */
export interface Reveal {
  readonly answer: string;
  /** The hidden spans of the asked cloze variant, in order. */
  readonly cloze: readonly string[];
  /** The answer side as written, for the reverse of a vocab card whose prompt left its example out. */
  readonly example: string | undefined;
  readonly rubric: string | undefined;
  readonly explanation: string | undefined;
}

export const revealFor = (card: Card, variant: string): Reveal => {
  const asked = askedGap(variant);
  const reverse = isReverse(card, variant);
  const cloze = isClozeType(card.frontMatter.type)
    ? [...card.question.markdown.matchAll(CLOZE_GAP)]
        .filter((match) => Number(match[1]) === asked)
        .map((match) => match[2] ?? "")
    : [];
  return {
    answer: reverse ? card.question.markdown : card.answer.markdown,
    cloze,
    example:
      reverse && card.frontMatter.type === "vocab"
        ? card.answer.markdown
        : undefined,
    rubric: findSection(card.sections, "Rubric")?.markdown,
    explanation: findSection(card.sections, "Explanation")?.markdown,
  };
};
