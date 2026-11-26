import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";
import {
  clozeClosure,
  clozeGapCounts,
  isClozeType,
} from "../../parse/variants.js";
import { CLOZE_VARIANTS_LIMIT } from "../limits.js";

/** One gap per variant, few variants per card: each variant must test exactly one thing. */
export const checkCloze = (card: Card): readonly Finding[] => {
  if (!isClozeType(card.frontMatter.type)) return [];
  const counts = clozeGapCounts(card.question.markdown);
  const findings: Finding[] = [];
  if (counts.size === 0 || counts.size > CLOZE_VARIANTS_LIMIT) {
    findings.push({
      ruleId: "cloze-variants",
      severity: "error",
      file: card.file,
      line: card.question.line,
      params: { count: counts.size, limit: CLOZE_VARIANTS_LIMIT },
    });
  }
  // An unclosed gap still counts as a variant, but nothing can hide it: the prompt would show its answer.
  const { opened, closed } = clozeClosure(card.question.markdown);
  if (opened > closed) {
    findings.push({
      ruleId: "cloze-unclosed",
      severity: "error",
      file: card.file,
      line: card.question.line,
      params: { count: opened - closed },
    });
  }
  for (const [number, gaps] of [...counts].sort(([a], [b]) => a - b)) {
    if (gaps === 1) continue;
    findings.push({
      ruleId: "cloze-gaps",
      severity: "error",
      file: card.file,
      line: card.question.line,
      params: { variant: `c${String(number)}`, count: gaps },
    });
  }
  return findings;
};
