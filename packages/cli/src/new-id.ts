import { loadContentFiles, takenCardIds } from "@wastech-learn/content-fs";
import { newUniqueCardId } from "@wastech-learn/core";
import { positiveInt } from "./args.js";
import {
  EXIT,
  UsageError,
  type CommandContext,
  type ExitCode,
} from "./context.js";

// Enough for a hand-written batch of cards; a larger count is a typo, not a plan.
const MAX_COUNT = 100;

/**
 * `wastech-learn new-id`: prints fresh card ids for writing cards by hand. Inside a content repository the
 * ids already used by card files are avoided, so a pasted id never collides.
 */
export const runNewId = async (ctx: CommandContext): Promise<ExitCode> => {
  const count = positiveInt(ctx.values, "count", 1);
  if (count > MAX_COUNT) {
    throw new UsageError("cli.error.bad-value", {
      option: "--count",
      value: String(count),
    });
  }
  const taken = takenCardIds(await loadContentFiles(ctx.root));
  for (let index = 0; index < count; index++) {
    const id = newUniqueCardId(ctx.io.random, taken);
    taken.add(id);
    ctx.io.out(id);
  }
  return EXIT.clean;
};
