import { renderDiagrams } from "@wastech-learn/content-fs";
import { EXIT, type CommandContext, type ExitCode } from "./context.js";

/** `wastech-learn render`: re-renders stale diagrams; with `--check` it only lists them and fails if any. */
export const runRender = async (ctx: CommandContext): Promise<ExitCode> => {
  const check = ctx.values.check === true;
  const report = await renderDiagrams(ctx.root, { check });
  if (check) {
    for (const file of report.stale)
      ctx.io.out(ctx.t("cli.render.stale", { file }));
    ctx.io.out(
      ctx.t("cli.render.check-summary", {
        total: report.total,
        stale: report.stale.length,
      }),
    );
    return report.stale.length > 0 ? EXIT.findings : EXIT.clean;
  }
  for (const file of report.rendered)
    ctx.io.out(ctx.t("cli.render.rendered", { file }));
  ctx.io.out(
    ctx.t("cli.render.summary", {
      total: report.total,
      rendered: report.rendered.length,
    }),
  );
  return EXIT.clean;
};
