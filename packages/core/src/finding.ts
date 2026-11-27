/**
 * Every rule a finding can come from: the content parser's own checks and the second-tier `check` rules.
 * A rule id is stable: hosts, the message catalog and CI output match on it.
 */
export const RULE_IDS = [
  "front-matter-missing",
  "front-matter-yaml",
  "front-matter-schema",
  "section-missing",
  "topic-file-missing",
  "topic-missing",
  "question-words",
  "answer-words",
  "answer-points",
  "rubric-missing",
  "rubric-items",
  "rubric-required",
  "code-lines",
  "code-width",
  "cloze-gaps",
  "cloze-variants",
  "cloze-unclosed",
  "vocab-lang-pair",
  "vocab-example",
  "id-unique",
  "diagram-svg-missing",
  "diagram-stale",
  "summary-link",
  "active-edit",
  "card-id-changed",
  "preset-invalid",
  "preset-drift",
  "diagram-render",
  "package-card",
  "package-material",
  "package-summary-section",
] as const;
export type RuleId = (typeof RULE_IDS)[number];

export type Severity = "error" | "warning";

/**
 * What a message needs to be rendered: identifiers, paths and counts. Never the text of a card, so a
 * finding can go into a CI log or an MCP reply without leaking content.
 */
export type FindingParams = Readonly<Record<string, string | number>>;

/** A finding is data; turning it into a sentence is the message catalog's job, in the reader's language. */
export interface Finding {
  readonly ruleId: RuleId;
  readonly severity: Severity;
  /** Repository-relative POSIX path. */
  readonly file: string;
  /** 1-based line in that file, when the rule can point at one. */
  readonly line?: number;
  readonly params: FindingParams;
}

/**
 * Total order for findings: file, line, then rule, so output is identical whatever order the files were
 * loaded or the rules ran in.
 */
export const compareFindings = (a: Finding, b: Finding): number =>
  a.file.localeCompare(b.file, "en") ||
  (a.line ?? 0) - (b.line ?? 0) ||
  a.ruleId.localeCompare(b.ruleId, "en") ||
  JSON.stringify(a.params).localeCompare(JSON.stringify(b.params), "en");
