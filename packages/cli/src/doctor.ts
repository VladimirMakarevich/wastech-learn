import {
  SETUP_CHECK_LEVELS,
  diagnoseSetup,
  frameworkBuilds,
  frameworkLayout,
  type SetupLevel,
} from "@wastech-learn/content-fs";
import { EXIT, type CommandContext, type ExitCode } from "./context.js";
import { FRAMEWORK_DIR, MIN_NODE_VERSION } from "./framework.js";

// One glance down the left edge shows what needs attention; the words after it say what to do.
const MARKS: Readonly<Record<SetupLevel, string>> = {
  ok: "✓",
  warning: "!",
  error: "✗",
};

/**
 * `wastech-learn doctor`: checks this computer's setup, read-only, one line per check with the fix.
 * Errors fail the run, so a script or an agent can tell a finished setup from an unfinished one.
 */
export const runDoctor = async (ctx: CommandContext): Promise<ExitCode> => {
  const checks = await diagnoseSetup({
    root: ctx.root,
    framework: frameworkLayout(FRAMEWORK_DIR),
    builds: await frameworkBuilds(FRAMEWORK_DIR),
    nodeVersion: ctx.io.system.nodeVersion,
    minNodeVersion: MIN_NODE_VERSION,
    hostname: () => ctx.io.system.hostname,
  });
  let errors = 0;
  let warnings = 0;
  for (const check of checks) {
    const level = SETUP_CHECK_LEVELS[check.id];
    if (level === "error") errors++;
    if (level === "warning") warnings++;
    ctx.io.out(
      `${MARKS[level]} ${ctx.t(`cli.doctor.${check.id}`, check.params)}`,
    );
  }
  ctx.io.out("");
  ctx.io.out(
    errors + warnings === 0
      ? ctx.t("cli.doctor.passed")
      : ctx.t("cli.doctor.summary", {
          errors: ctx.t("count.errors", { count: errors }),
          warnings: ctx.t("count.warnings", { count: warnings }),
        }),
  );
  return errors > 0 ? EXIT.findings : EXIT.clean;
};
