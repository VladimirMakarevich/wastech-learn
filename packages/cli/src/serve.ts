import { fileURLToPath } from "node:url";
import { startServer, type BuildOutcome } from "@wastech-learn/server";
import {
  EXIT,
  UsageError,
  type CommandContext,
  type ExitCode,
} from "./context.js";

/** A port no common dev tool claims by default, so `serve` usually starts without `--port`. */
export const DEFAULT_PORT = 4747;

// The app's build next to this package in the workspace: the server serves it as files and never
// imports its code. Both src/ and dist/ sit one level below the package, so one path fits both.
const APP_DIR = fileURLToPath(
  new URL("../../app/dist/browser", import.meta.url),
);

const portOf = (ctx: CommandContext): number => {
  const raw = ctx.values.port;
  if (raw === undefined) return DEFAULT_PORT;
  const port = Number(raw);
  if (typeof raw !== "string" || !/^\d+$/.test(raw) || port > 65_535) {
    throw new UsageError("cli.error.bad-value", {
      option: "--port",
      value: String(raw),
    });
  }
  return port;
};

const reportBuild = (ctx: CommandContext, outcome: BuildOutcome): void => {
  if (outcome.ok) {
    ctx.io.err(
      ctx.t("cli.serve.built", {
        ms: outcome.ms,
        topics: ctx.t("count.topics", { count: outcome.topics }),
        cards: ctx.t("count.cards", { count: outcome.cards }),
      }),
    );
    return;
  }
  ctx.io.err(
    ctx.t("cli.serve.build-failed", {
      errors: ctx.t("count.errors", {
        count: Math.max(1, outcome.findings.length),
      }),
    }),
  );
};

/**
 * `wastech-learn serve`: the local server on 127.0.0.1 with the app, open in the browser until the
 * learner stops it. Build times and counts go to stderr; nothing of the content is printed.
 */
export const runServe = async (ctx: CommandContext): Promise<ExitCode> => {
  const running = await startServer({
    root: ctx.root,
    appDir: APP_DIR,
    port: portOf(ctx),
    now: ctx.io.now,
    onBuild: (outcome) => {
      reportBuild(ctx, outcome);
    },
    onWatchError: (error) => {
      ctx.io.err(
        ctx.t("cli.serve.watch-failed", {
          detail: error instanceof Error ? error.message : String(error),
        }),
      );
    },
  });
  ctx.io.out(ctx.t("cli.serve.listening", { url: running.url }));
  if (ctx.values["no-open"] !== true) ctx.io.openUrl(running.url);
  await ctx.io.untilInterrupted();
  await running.close();
  return EXIT.clean;
};
