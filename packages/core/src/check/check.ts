import { compareFindings, type Finding } from "../finding.js";
import type { Card, ContentModel } from "../model.js";
import { parseContent, type ContentFiles } from "../parse/content.js";
import { checkActiveEdit } from "./rules/active-edit.js";
import { checkAnswerPoints } from "./rules/answer-points.js";
import { checkAnswerWords } from "./rules/answer-words.js";
import { checkCloze } from "./rules/cloze.js";
import { checkCodeSize } from "./rules/code-size.js";
import { checkDiagramFresh } from "./rules/diagram-fresh.js";
import { checkIdUnique } from "./rules/id-unique.js";
import { PRESET_COPY_FILE, checkPresetDrift } from "./rules/preset-drift.js";
import { checkQuestionWords } from "./rules/question-words.js";
import { checkRubric } from "./rules/rubric.js";
import { checkSummaryLink } from "./rules/summary-link.js";
import { checkVocab } from "./rules/vocab.js";

const CARD_RULES: readonly ((card: Card) => readonly Finding[])[] = [
  checkQuestionWords,
  checkAnswerWords,
  checkAnswerPoints,
  checkRubric,
  checkCodeSize,
  checkCloze,
  checkVocab,
  checkSummaryLink,
];

export interface CheckInput {
  readonly files: ContentFiles;
  /** Text of the canonical mdlint preset; without it the preset copy is not compared. */
  readonly preset?: string;
  /** Previous text of the same files, for the large-edit warning; without it the warning is off. */
  readonly baseline?: ReadonlyMap<string, string>;
}

export interface CheckResult {
  readonly model: ContentModel;
  readonly findings: readonly Finding[];
  readonly errorCount: number;
  readonly warningCount: number;
}

/**
 * The second validation tier: everything about content that a one-file Markdown linter cannot or should
 * not know. Pure over its inputs, so the CLI, the MCP server before a write and a test run the same rules.
 */
export const checkContent = async (input: CheckInput): Promise<CheckResult> => {
  const { model, findings: parseFindings } = await parseContent(input.files);
  const findings: Finding[] = [
    ...parseFindings,
    ...model.cards.flatMap((card) => CARD_RULES.flatMap((rule) => rule(card))),
    ...checkIdUnique(model.cards),
    ...(await checkDiagramFresh(model.diagrams)),
    ...(input.baseline === undefined
      ? []
      : checkActiveEdit(model.cards, input.baseline)),
    ...(input.preset === undefined
      ? []
      : checkPresetDrift(input.preset, input.files.get(PRESET_COPY_FILE))),
  ];
  findings.sort(compareFindings);
  return {
    model,
    findings,
    errorCount: findings.filter((finding) => finding.severity === "error")
      .length,
    warningCount: findings.filter((finding) => finding.severity === "warning")
      .length,
  };
};
