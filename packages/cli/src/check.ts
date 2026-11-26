import { checkRepository } from "@wastech-learn/content-fs";
import { EXIT, type CommandContext, type ExitCode } from "./context.js";
import { printFindings, printSummary } from "./report.js";

/** `wastech-learn check`: errors fail the run, warnings are shown and let it pass. */
export const runCheck = async (ctx: CommandContext): Promise<ExitCode> => {
  const result = await checkRepository(ctx.root);
  if (result.findings.length === 0) {
    ctx.io.out(
      ctx.t("cli.check.clean", {
        cards: ctx.t("count.cards", { count: result.model.cards.length }),
      }),
    );
    return EXIT.clean;
  }
  printFindings(ctx, result.findings);
  ctx.io.out("");
  printSummary(ctx, result.findings);
  return result.errorCount > 0 ? EXIT.findings : EXIT.clean;
};
