import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  ValidationReport,
  WriteOutcomeOf,
} from "@wastech-learn/content-fs";
import {
  formatFinding,
  formatMessage,
  isLearnError,
  type LearnErrorCode,
  type UiLanguage,
} from "@wastech-learn/core";
import { SCHEDULER_PACKAGE, isSrsError } from "@wastech-learn/srs";

/** The shape every failed call returns: a stable code to match on, and two sentences for the chat. */
export interface ToolError {
  readonly code: string;
  readonly message: string;
  readonly hint: string;
  readonly field?: string;
  /** For an invalid input, the schema's own reason, in English: data for the chat, not a sentence. */
  readonly detail?: string;
}

/** Failures the server itself detects before any package runs. */
export type HostErrorCode = "input-invalid" | "tool-unknown" | "unexpected";

/** An input that failed its schema: the field and the schema's own reason. */
export class InputError extends Error {
  readonly field: string;

  constructor(field: string, detail: string) {
    super(detail);
    this.name = "InputError";
    this.field = field;
  }
}

/** `path-outside-content` → `PATH_OUTSIDE_CONTENT`: the codes clients match on read as constants. */
const wireCode = (code: string): string =>
  code.toUpperCase().replaceAll("-", "_");

type ErrorCode =
  LearnErrorCode | HostErrorCode | "scheduler-unsupported" | "config-json";

const describe = (
  lang: UiLanguage,
  code: ErrorCode,
  params: Readonly<Record<string, string>>,
  field?: string,
): ToolError => ({
  code: wireCode(code),
  message: formatMessage(lang, `error.${code}`, params),
  hint: formatMessage(lang, `hint.${code}`, params),
  ...(field === undefined || field === "" ? {} : { field }),
});

/** Maps anything a tool threw to the `{ code, message, hint }` a chat can act on, in the learner's language. */
export const toolErrorOf = (error: unknown, lang: UiLanguage): ToolError => {
  if (error instanceof InputError) {
    return {
      ...describe(lang, "input-invalid", { field: error.field }, error.field),
      detail: error.message,
    };
  }
  if (isLearnError(error)) {
    // A config error without a field is a file that is not JSON at all; "field  is invalid" says nothing.
    const code =
      error.code === "config-invalid" && (error.field ?? "") === ""
        ? "config-json"
        : error.code;
    return describe(
      lang,
      code,
      {
        subject: error.subject ?? "",
        file: error.file ?? "",
        field: error.field ?? "",
      },
      error.field,
    );
  }
  if (isSrsError(error)) {
    return describe(lang, "scheduler-unsupported", {
      expected: SCHEDULER_PACKAGE,
    });
  }
  return describe(lang, "unexpected", {
    detail: error instanceof Error ? error.message : String(error),
  });
};

export const unknownTool = (name: string, lang: UiLanguage): ToolError =>
  describe(lang, "tool-unknown", { subject: name });

const text = (payload: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(payload) }],
});

export const success = (payload: unknown): CallToolResult => text(payload);

export const failure = (error: ToolError): CallToolResult => ({
  ...text(error),
  isError: true,
});

/** One line of a report as a chat reads it; repeats of one rule in one file are folded into one line. */
export interface ReportedFinding {
  readonly file: string;
  readonly line?: number;
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  /** How many times the rule fired in the file when more than once. */
  readonly count?: number;
}

// The subscription pays for every token of a reply: errors always fit, a long tail of warnings is cut.
const MAX_FINDINGS = 12;

/**
 * The findings of a report, errors first, in the learner's language for `check` and in mdlint's own words
 * for the linter, with repeats of one rule in one file folded. Card text never appears: messages name
 * files, rules and counts.
 */
export const reportedFindings = (
  report: ValidationReport,
  lang: UiLanguage,
): {
  readonly findings: readonly ReportedFinding[];
  readonly omitted: number;
} => {
  const all: ReportedFinding[] = [
    ...report.findings.map((finding) => ({
      file: finding.file,
      ...(finding.line === undefined ? {} : { line: finding.line }),
      rule: finding.ruleId,
      severity: finding.severity,
      message: formatFinding(lang, finding),
    })),
    ...report.lint.map((finding) => ({
      file: finding.file,
      line: finding.line,
      rule: finding.ruleId,
      severity: finding.severity,
      message: finding.message,
    })),
  ];
  const grouped = new Map<string, ReportedFinding>();
  for (const finding of all) {
    const key = `${finding.file}|${finding.rule}|${finding.severity}`;
    const seen = grouped.get(key);
    grouped.set(
      key,
      seen === undefined ? finding : { ...seen, count: (seen.count ?? 1) + 1 },
    );
  }
  const ordered = [...grouped.values()].sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1) ||
      a.file.localeCompare(b.file, "en") ||
      (a.line ?? 0) - (b.line ?? 0) ||
      a.rule.localeCompare(b.rule, "en"),
  );
  // Every error stays, whatever the count: the chat must see all it has to fix in one round.
  const errors = ordered.filter((finding) => finding.severity === "error");
  const warnings = ordered.filter((finding) => finding.severity !== "error");
  const shown = warnings.slice(0, Math.max(0, MAX_FINDINGS - errors.length));
  return {
    findings: [...errors, ...shown],
    omitted: warnings.length - shown.length,
  };
};

/** What a write tool answers: the outcome, its paths and ids, and the findings that decided it. */
export const writeResponse = <Result extends object>(
  outcome: WriteOutcomeOf<Result>,
  lang: UiLanguage,
): Readonly<Record<string, unknown>> => {
  const { findings, omitted } = reportedFindings(outcome.report, lang);
  return {
    status: outcome.status,
    ...outcome.result,
    errors: outcome.report.errorCount,
    warnings: outcome.report.warningCount,
    findings,
    ...(omitted === 0 ? {} : { omitted }),
  };
};
