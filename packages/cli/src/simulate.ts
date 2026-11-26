import { loadConfig, toSrsConfig } from "@wastech-learn/content-fs";
import {
  BACKLOG_ORDERS,
  DEFAULT_BACKLOG_ORDER,
  DEFAULT_SIMULATION,
  compareBacklogOrders,
  createScheduler,
  type OrderComparison,
} from "@wastech-learn/srs";
import { positiveInt } from "./args.js";
import { EXIT, type CommandContext, type ExitCode } from "./context.js";
import { formatTable } from "./table.js";

// Five learners keep a run under ten seconds and already show whether an order wins by luck.
const DEFAULT_RUNS = 5;

const printComparison = (
  ctx: CommandContext,
  comparison: OrderComparison,
  recoveryDays: number,
): void => {
  const { t } = ctx;
  const rows = comparison.summaries.map((summary) => [
    summary.order === DEFAULT_BACKLOG_ORDER
      ? t("cli.simulate.default", { order: summary.order })
      : summary.order,
    summary.medianDays === null
      ? t("cli.simulate.never", { days: recoveryDays })
      : String(summary.medianDays),
    `${String(summary.clearedWithinTarget)}/${String(summary.runs)}`,
    `${String(Math.round(summary.meanRecall * 100))}%`,
  ]);
  const header = [
    t("cli.simulate.col.order"),
    t("cli.simulate.col.median"),
    t("cli.simulate.col.cleared", { target: comparison.targetDays }),
    t("cli.simulate.col.recall"),
  ];
  for (const line of formatTable([header, ...rows])) ctx.io.out(line);
};

/**
 * `wastech-learn simulate`: plays a regular rhythm, a break and the sessions after it under every backlog
 * order with the repository's own limits, and prints how long the backlog takes and the load per day.
 */
export const runSimulate = async (ctx: CommandContext): Promise<ExitCode> => {
  const config = toSrsConfig(await loadConfig(ctx.root));
  const scheduler = await createScheduler(config);
  const params = {
    ...DEFAULT_SIMULATION,
    cards: positiveInt(ctx.values, "cards", DEFAULT_SIMULATION.cards),
    warmupDays: positiveInt(
      ctx.values,
      "warmup-days",
      DEFAULT_SIMULATION.warmupDays,
    ),
    breakDays: positiveInt(
      ctx.values,
      "break-days",
      DEFAULT_SIMULATION.breakDays,
    ),
    sessionMinutes: positiveInt(
      ctx.values,
      "session-minutes",
      config.limits.sessionMinutes,
    ),
  };
  const firstSeed = positiveInt(ctx.values, "seed", 1);
  const runs = positiveInt(ctx.values, "runs", DEFAULT_RUNS);
  const seeds = Array.from({ length: runs }, (_, index) => firstSeed + index);
  const comparison = compareBacklogOrders(
    params,
    config,
    scheduler,
    seeds,
    BACKLOG_ORDERS,
  );
  const { t } = ctx;
  const sample = comparison.reports.find(
    (report) => report.order === DEFAULT_BACKLOG_ORDER,
  );

  ctx.io.out(
    t("cli.simulate.header", {
      breakDays: params.breakDays,
      sessionMinutes: params.sessionMinutes,
      cards: t("count.cards", { count: params.cards }),
      items: sample?.items ?? 0,
      warmupDays: params.warmupDays,
      seeds:
        runs === 1
          ? String(firstSeed)
          : `${String(firstSeed)}–${String(firstSeed + runs - 1)}`,
    }),
  );
  ctx.io.out("");
  printComparison(ctx, comparison, params.recoveryDays);
  if (sample === undefined) return EXIT.clean;

  ctx.io.out("");
  ctx.io.out(
    t("cli.simulate.days-title", { order: sample.order, seed: sample.seed }),
  );
  const header = [
    t("cli.simulate.col.day"),
    t("cli.simulate.col.backlog"),
    t("cli.simulate.col.reviews"),
    t("cli.simulate.col.minutes"),
    t("cli.simulate.col.new"),
  ];
  const rows = sample.days
    .filter((day) => day.phase === "recovery")
    .map((day) => [
      day.day,
      String(day.backlogAtStart),
      String(day.reviews),
      String(day.minutes),
      day.newCardsOffered
        ? t("cli.simulate.new-offered")
        : t("cli.simulate.new-paused"),
    ]);
  for (const line of formatTable([header, ...rows])) ctx.io.out(line);
  ctx.io.out("");
  ctx.io.out(
    sample.clearedAfterDays === null
      ? t("cli.simulate.not-cleared", {
          backlog: sample.backlogAtReturn,
          days: params.recoveryDays,
        })
      : t("cli.simulate.cleared", {
          backlog: sample.backlogAtReturn,
          count: sample.clearedAfterDays,
        }),
  );
  return EXIT.clean;
};
