import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";
import { ANSWER_POINTS_LIMIT, answerPointTypes } from "../limits.js";
import { topLevelListItems } from "../markdown-metrics.js";

/** Working memory holds three to five chunks; a longer list in an answer is an enumeration in disguise. */
export const checkAnswerPoints = (card: Card): readonly Finding[] => {
  const { type } = card.frontMatter;
  if (!answerPointTypes.has(type)) return [];
  const count = topLevelListItems(card.answer.markdown).length;
  if (count <= ANSWER_POINTS_LIMIT) return [];
  return [
    {
      ruleId: "answer-points",
      severity: "error",
      file: card.file,
      line: card.answer.line,
      params: { count, limit: ANSWER_POINTS_LIMIT, type },
    },
  ];
};
