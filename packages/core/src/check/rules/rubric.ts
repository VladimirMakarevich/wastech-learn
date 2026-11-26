import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";
import { findSection } from "../../parse/sections.js";
import {
  RUBRIC_ITEMS_LIMIT,
  RUBRIC_REQUIRED_MARK,
  rubricTypes,
} from "../limits.js";
import { listItemText, topLevelListItems } from "../markdown-metrics.js";

/**
 * A rubric is what makes an open answer gradable: short enough to check in half a minute, with at least
 * one required point, because "named every required point" is the line between Good and Again.
 */
export const checkRubric = (card: Card): readonly Finding[] => {
  const { type } = card.frontMatter;
  const rubric = findSection(card.sections, "Rubric");
  if (rubric === undefined) {
    if (!rubricTypes.has(type)) return [];
    return [
      {
        ruleId: "rubric-missing",
        severity: "error",
        file: card.file,
        params: { type },
      },
    ];
  }
  const items = topLevelListItems(rubric.markdown);
  const findings: Finding[] = [];
  if (items.length > RUBRIC_ITEMS_LIMIT) {
    findings.push({
      ruleId: "rubric-items",
      severity: "error",
      file: card.file,
      line: rubric.line,
      params: { count: items.length, limit: RUBRIC_ITEMS_LIMIT },
    });
  }
  if (
    !items.some((item) => listItemText(item).startsWith(RUBRIC_REQUIRED_MARK))
  ) {
    findings.push({
      ruleId: "rubric-required",
      severity: "error",
      file: card.file,
      line: rubric.line,
      params: {},
    });
  }
  return findings;
};
