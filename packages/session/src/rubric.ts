import type { Rating } from "@wastech-learn/srs";

/** What the learner ticked for one rubric item: named it, named part of it, or missed it. */
export type RubricMark = "yes" | "partial" | "no";

/** How long the answer took against the usual time for the card type. */
export interface AnswerPace {
  readonly durMs: number;
  readonly estimateMs: number;
}

/**
 * The rating the ticked rubric suggests, by the grading protocol the chat tutor follows: a required item
 * missed is Again; every required item there but one only partly is Hard; every required item there is
 * Good; everything there, the optional items included, and no slower than usual is Easy. A rubric without
 * required items treats all of its items as required. The learner decides; this is only the suggestion.
 * A mark missing from `marks` counts as missed.
 */
export const suggestRating = (
  rubric: readonly { readonly required: boolean }[],
  marks: readonly RubricMark[],
  pace?: AnswerPace,
): Rating => {
  if (rubric.length === 0) return 3;
  const marked = rubric.map((entry, index) => ({
    required: entry.required,
    mark: marks[index] ?? "no",
  }));
  const hasRequired = marked.some((entry) => entry.required);
  const core = hasRequired ? marked.filter((entry) => entry.required) : marked;
  if (core.some((entry) => entry.mark === "no")) return 1;
  if (core.some((entry) => entry.mark === "partial")) return 2;
  const everything = marked.every((entry) => entry.mark === "yes");
  const extra = hasRequired && marked.some((entry) => !entry.required);
  const quick = pace !== undefined && pace.durMs <= pace.estimateMs;
  return everything && extra && quick ? 4 : 3;
};
