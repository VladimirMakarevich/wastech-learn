import { relative, resolve } from "node:path";
import { buildBundle, writeBundle } from "@wastech-learn/content-fs";
import {
  EXIT,
  UsageError,
  type CommandContext,
  type ExitCode,
} from "./context.js";
import { printFindings, printSummary } from "./report.js";

/** Derived, never committed: the content repository already ignores `.cache/`. */
const DEFAULT_OUT = ".cache/content-bundle.json";

const builtAtOf = (ctx: CommandContext): Date => {
  const raw = ctx.values["built-at"];
  if (raw === undefined) return ctx.io.now();
  const date = new Date(String(raw));
  if (typeof raw !== "string" || Number.isNaN(date.getTime())) {
    throw new UsageError("cli.error.bad-value", {
      option: "--built-at",
      value: String(raw),
    });
  }
  return date;
};

/** `wastech-learn build`: writes the content bundle, or nothing at all when the content has schema errors. */
export const runBuild = async (ctx: CommandContext): Promise<ExitCode> => {
  const out = ctx.values.out;
  const path = resolve(ctx.root, typeof out === "string" ? out : DEFAULT_OUT);
  const result = await buildBundle(ctx.root, builtAtOf(ctx));
  if (!result.ok) {
    printFindings(ctx, result.findings);
    ctx.io.out("");
    printSummary(ctx, result.findings);
    ctx.io.err(ctx.t("cli.build.blocked"));
    return EXIT.findings;
  }
  await writeBundle(path, result.bundle);
  ctx.io.out(
    ctx.t("cli.build.written", {
      file: relative(ctx.io.cwd, path) || path,
      topics: ctx.t("count.topics", { count: result.bundle.topics.length }),
      cards: ctx.t("count.cards", { count: result.bundle.cards.length }),
    }),
  );
  return EXIT.clean;
};
