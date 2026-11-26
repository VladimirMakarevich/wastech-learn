import { formatFinding, type Finding } from "@wastech-learn/core";
import type { CommandContext } from "./context.js";

/**
 * Prints findings grouped by file, one line each: line, severity, rule, message. The rule id stays in
 * English in every language so it can be searched for and matched in CI logs.
 */
export const printFindings = (
  ctx: CommandContext,
  findings: readonly Finding[],
): void => {
  if (findings.length === 0) return;
  const ruleWidth = Math.max(
    ...findings.map((finding) => finding.ruleId.length),
  );
  let file: string | undefined;
  for (const finding of findings) {
    if (finding.file !== file) {
      if (file !== undefined) ctx.io.out("");
      file = finding.file;
      ctx.io.out(file);
    }
    const line = finding.line === undefined ? "" : String(finding.line);
    ctx.io.out(
      `  ${line.padStart(4)}  ${finding.severity.padEnd(7)}  ${finding.ruleId.padEnd(ruleWidth)}  ${formatFinding(ctx.lang, finding)}`,
    );
  }
};

export const printSummary = (
  ctx: CommandContext,
  findings: readonly Finding[],
): void => {
  const files = new Set(findings.map((finding) => finding.file)).size;
  const errors = findings.filter(
    (finding) => finding.severity === "error",
  ).length;
  const warnings = findings.length - errors;
  ctx.io.out(
    ctx.t("cli.check.summary", {
      files: ctx.t("count.files", { count: files }),
      errors: ctx.t("count.errors", { count: errors }),
      warnings: ctx.t("count.warnings", { count: warnings }),
    }),
  );
};
