import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";
import { answerWordLimit } from "../limits.js";
import { countWords } from "../markdown-metrics.js";

/** An answer past the limit is recalled by halves, and a half-recalled answer cannot be graded honestly. */
export const checkAnswerWords = (card: Card): readonly Finding[] => {
  const { type } = card.frontMatter;
  const limit = answerWordLimit(type);
  if (limit === undefined) return [];
  const count = countWords(card.answer.markdown);
  if (count <= limit) return [];
  return [
    {
      ruleId: "answer-words",
      severity: "error",
      file: card.file,
      line: card.answer.line,
      params: { count, limit, type },
    },
  ];
};
