import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";
import { questionWordLimit } from "../limits.js";
import { countWords } from "../markdown-metrics.js";

/** A long question is memorized as a picture, and recall turns into pattern matching. */
export const checkQuestionWords = (card: Card): readonly Finding[] => {
  const { type } = card.frontMatter;
  const limit = questionWordLimit(type);
  const count = countWords(card.question.markdown);
  if (count <= limit) return [];
  return [
    {
      ruleId: "question-words",
      severity: "error",
      file: card.file,
      line: card.question.line,
      params: { count, limit, type },
    },
  ];
};
