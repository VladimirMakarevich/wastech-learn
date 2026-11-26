import { resolve } from "node:path";
import {
  isLearnError,
  type LearnError,
  type UiLanguage,
} from "@wastech-learn/core";
import { readUiLanguage } from "@wastech-learn/content-fs";
import { SCHEDULER_PACKAGE, isSrsError } from "@wastech-learn/srs";
import { parseCommandLine, type CommandName } from "./args.js";
import { runCheck } from "./check.js";
import {
  EXIT,
  UsageError,
  translator,
  type CliIo,
  type CommandContext,
  type ExitCode,
} from "./context.js";

type Command = (ctx: CommandContext) => Promise<ExitCode>;

// Commands load on demand: `build` pulls in Shiki and KaTeX and `simulate` the scheduler, which `check`,
// the command run on every save and in CI, should not pay for.
const COMMANDS: Readonly<Record<CommandName, Command>> = {
  check: runCheck,
  build: async (ctx) => (await import("./build.js")).runBuild(ctx),
  render: async (ctx) => (await import("./render.js")).runRender(ctx),
  simulate: async (ctx) => (await import("./simulate.js")).runSimulate(ctx),
};

const describeLearnError = (
  error: LearnError,
  t: ReturnType<typeof translator>,
  root: string,
): string => {
  const file = error.file ?? "";
  switch (error.code) {
    case "config-invalid":
      return error.field === undefined || error.field === ""
        ? t("cli.error.config-json", { file })
        : t("cli.error.config-invalid", { file, field: error.field });
    case "event-invalid":
      return t("cli.error.event-invalid", { field: error.field ?? "" });
    case "repository-not-found":
      return t("cli.error.repository-not-found", { file, root });
    case "io-failed":
      return t("cli.error.io-failed", { file });
    case "render-failed":
      return t("cli.error.render-failed", { file });
  }
};

/**
 * Runs one command line and returns its exit code: 0 clean, 1 findings, 2 the work could not be done.
 * Every message goes through the catalog, in `--lang`, else the repository's `uiLanguage`, else English.
 */
export const run = async (
  argv: readonly string[],
  io: CliIo,
): Promise<ExitCode> => {
  let lang: UiLanguage = "en";
  let root = io.cwd;
  try {
    const parsed = parseCommandLine(argv);
    if (parsed.kind === "help") {
      io.out(translator(parsed.lang ?? lang)("cli.help"));
      return EXIT.clean;
    }
    const content = parsed.values.content;
    root = resolve(io.cwd, typeof content === "string" ? content : ".");
    lang = parsed.lang ?? (await readUiLanguage(root)) ?? lang;
    return await COMMANDS[parsed.command]({
      io,
      lang,
      root,
      values: parsed.values,
      t: translator(lang),
    });
  } catch (error) {
    const t = translator(lang);
    if (error instanceof UsageError) io.err(t(error.key, error.params));
    else if (isLearnError(error)) io.err(describeLearnError(error, t, root));
    else if (isSrsError(error))
      io.err(
        t("cli.error.scheduler-unsupported", { expected: SCHEDULER_PACKAGE }),
      );
    else
      io.err(
        t("cli.error.unexpected", {
          detail: error instanceof Error ? error.message : String(error),
        }),
      );
    return EXIT.failure;
  }
};
