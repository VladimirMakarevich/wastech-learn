import type { Finding } from "@wastech-learn/core";
import { commitFiles } from "../transaction.js";
import { confinePath } from "../confine.js";
import { validateOverlay, type ValidationReport } from "../validate-overlay.js";
import type { Workspace } from "../workspace.js";

/** Files one tool call wants to write, as repository-relative path → full text, and what to report. */
export interface WritePlan<Result> {
  readonly files: ReadonlyMap<string, string>;
  /** Files of the plan changed only on the side, such as the topic index that gains links. */
  readonly incidental?: readonly string[];
  readonly result: Result;
}

/**
 * `written` — the files are on disk; `dry-run` — they passed and nothing was written, as asked;
 * `blocked` — validation found errors and nothing was written.
 */
export type WriteStatus = "written" | "dry-run" | "blocked";

export interface WriteOutcomeOf<Result> {
  readonly status: WriteStatus;
  readonly result: Result;
  readonly report: ValidationReport;
}

/** An outcome that stops before validation, for a problem the plan itself ran into. */
export const blockedBy = <Result>(
  findings: readonly Finding[],
  result: Result,
): WriteOutcomeOf<Result> => ({
  status: "blocked",
  result,
  report: {
    findings,
    lint: [],
    errorCount: findings.filter((finding) => finding.severity === "error")
      .length,
    warningCount: findings.filter((finding) => finding.severity === "warning")
      .length,
  },
});

/**
 * The one way content reaches the disk from a tool: validate the planned files against the whole
 * repository, stop on any error, honour a dry run, then write the group in one transaction. Paths are
 * confined to the repository again here, right before writing, because a symbolic link can appear
 * between planning and writing.
 */
export const applyWrite = async <Result>(
  workspace: Workspace,
  plan: WritePlan<Result>,
  options: { readonly dryRun: boolean },
): Promise<WriteOutcomeOf<Result>> => {
  const report = await validateOverlay(workspace, plan.files, {
    incidental: plan.incidental ?? [],
  });
  if (report.errorCount > 0)
    return { status: "blocked", result: plan.result, report };
  if (options.dryRun) return { status: "dry-run", result: plan.result, report };
  const writes = [];
  for (const [path, text] of plan.files) {
    const confined = await confinePath(workspace.root, path);
    writes.push({ path: confined.absolute, text, label: confined.relative });
  }
  await commitFiles(writes, workspace.options.transactionFs);
  workspace.invalidate();
  return { status: "written", result: plan.result, report };
};
