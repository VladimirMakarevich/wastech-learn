import { relative, sep } from "node:path";
import {
  openWorkspace,
  validateEdited,
  type ValidationReport,
} from "@wastech-learn/content-fs";
import { formatFinding, postToolUseEventSchema } from "@wastech-learn/core";
import type { CommandContext, ExitCode } from "./context.js";
import { describeError } from "./describe-error.js";

/**
 * Exit codes as Claude Code reads a hook: 0 lets the agent go on, 2 hands stderr back to the agent as
 * something to fix, any other code shows stderr to the person without blocking the agent.
 */
const HOOK_EXIT = {
  pass: 0,
  notChecked: 1,
  blocked: 2,
} as const satisfies Readonly<Record<string, ExitCode>>;

const contentPath = (root: string, file: string): string | undefined => {
  const rel = relative(root, file).split(sep).join("/");
  return rel.startsWith("content/") ? rel : undefined;
};

const report = (ctx: CommandContext, result: ValidationReport): void => {
  const lines = [
    ...result.findings.map((finding) => ({
      file: finding.file,
      line: finding.line,
      text: `${finding.severity} ${finding.ruleId}: ${formatFinding(ctx.lang, finding)}`,
    })),
    ...result.lint.map((finding) => ({
      file: finding.file,
      line: finding.line,
      text: `${finding.severity} ${finding.ruleId}: ${finding.message}`,
    })),
  ];
  for (const line of lines) {
    ctx.io.err(
      `${line.file}${line.line === undefined ? "" : `:${String(line.line)}`} ${line.text}`,
    );
  }
};

/**
 * `wastech-learn hook post-tool-use`: run after an agent's Write or Edit. A file under `content/` is checked
 * by mdlint and `check`: its own errors, and errors the edit caused in other files compared with the
 * committed state, go back to the agent; any other file passes untouched, so the hook costs nothing
 * outside the content.
 */
export const runHook = async (ctx: CommandContext): Promise<ExitCode> => {
  let event;
  try {
    event = postToolUseEventSchema.safeParse(
      JSON.parse(await ctx.io.readStdin()),
    );
  } catch {
    // Not JSON at all: the command was run by hand or by a misconfigured hook.
    event = undefined;
  }
  if (event?.success !== true) {
    ctx.io.err(ctx.t("cli.hook.bad-event"));
    return HOOK_EXIT.notChecked;
  }
  const file = event.data.tool_input.file_path;
  const rel = file === undefined ? undefined : contentPath(ctx.root, file);
  if (rel === undefined) return HOOK_EXIT.pass;
  // A diagram's findings land on its SVG: an edited source makes the rendered file stale.
  const paths = rel.endsWith(".mmd")
    ? [rel, rel.replace(/\.mmd$/, ".svg")]
    : [rel];
  try {
    const workspace = openWorkspace({
      root: ctx.root,
      now: ctx.io.now,
      random: ctx.io.random,
    });
    const result = await validateEdited(workspace, paths);
    if (result.errorCount === 0) return HOOK_EXIT.pass;
    report(ctx, result);
    ctx.io.err(ctx.t("cli.hook.findings", { file: rel }));
    return HOOK_EXIT.blocked;
  } catch (error) {
    ctx.io.err(
      ctx.t("cli.hook.failed", {
        detail: describeError(error, ctx.t, ctx.root),
      }),
    );
    return HOOK_EXIT.notChecked;
  }
};
