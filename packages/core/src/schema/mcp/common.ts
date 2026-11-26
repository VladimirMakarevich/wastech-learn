import { z } from "zod";

/**
 * Identifies one logical write across retries. A client that lost the reply sends the same call again with
 * the same id and gets the first result back instead of a second set of files.
 */
export const requestIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[\w.:-]+$/, {
    error: "Expected letters, digits, dots, colons, dashes or underscores",
  });

/**
 * The two fields every mutating tool shares. A dry run writes nothing and needs no `requestId`; a real
 * write must carry one, because a retried write without it could not be told from a new one.
 */
export const mutationShape = {
  requestId: requestIdSchema.optional(),
  dryRun: z.boolean().optional(),
};

/** The `requestId` and `dryRun` part of a mutating tool's parsed input. */
export type MutationInput = z.infer<z.ZodObject<typeof mutationShape>>;

export const requireRequestId = (
  input: {
    readonly requestId?: string | undefined;
    readonly dryRun?: boolean | undefined;
  },
  ctx: z.RefinementCtx,
): void => {
  if (input.dryRun !== true && input.requestId === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["requestId"],
      message: "A write needs a requestId; only a dry run may omit it",
    });
  }
};

/** A repository-relative POSIX path as a tool receives it; confinement to the repository is checked on disk. */
export const repoPathSchema = z.string().min(1).max(512);
