import { resolve } from "node:path";
import type { UiLanguage } from "@wastech-learn/core";
import { readUiLanguage } from "@wastech-learn/content-fs";
import { parseCommandLine, type CommandName } from "./args.js";
import { runCheck } from "./check.js";
import { describeError } from "./describe-error.js";
import {
  EXIT,
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
  "new-id": async (ctx) => (await import("./new-id.js")).runNewId(ctx),
  hook: async (ctx) => (await import("./hook.js")).runHook(ctx),
  serve: async (ctx) => (await import("./serve.js")).runServe(ctx),
  init: async (ctx) => (await import("./init.js")).runInit(ctx),
  doctor: async (ctx) => (await import("./doctor.js")).runDoctor(ctx),
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
      positionals: parsed.positionals,
      t: translator(lang),
    });
  } catch (error) {
    io.err(describeError(error, translator(lang), root));
    // A hook command line Claude Code cannot run (a typo in settings.json) must not be handed back to
    // the agent as something to fix: for a hook, exit 2 means "the agent's edit has findings".
    return argv.includes("hook") ? EXIT.findings : EXIT.failure;
  }
};
