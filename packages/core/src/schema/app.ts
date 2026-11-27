import { z } from "zod";
import type { LearnErrorCode } from "../errors.js";
import { RULE_IDS, type Finding } from "../finding.js";
import {
  CARD_ID_PATTERN,
  firstIssue,
  kebabSchema,
  type SchemaIssue,
} from "./common.js";

/** How a path differs from the last commit, in the words the app shows; a copy counts as an addition. */
export const GIT_CHANGES = [
  "added",
  "modified",
  "deleted",
  "renamed",
  "untracked",
] as const;
export type GitChange = (typeof GIT_CHANGES)[number];

/**
 * What a changed path belongs to. Only `topic`, `card`, `reviews` and `inbox` are committed by Sync; `other`
 * is everything the owner commits by hand, so the app can show it apart instead of committing it silently.
 */
export const GIT_AREAS = [
  "topic",
  "card",
  "reviews",
  "inbox",
  "other",
] as const;
export type GitArea = (typeof GIT_AREAS)[number];

/** The areas Sync commits; the app lists them as going into the commit and the rest as staying out. */
export const SYNC_AREAS = [
  "topic",
  "card",
  "reviews",
  "inbox",
] as const satisfies readonly GitArea[];

export const isSyncedArea = (area: GitArea): boolean =>
  (SYNC_AREAS as readonly GitArea[]).includes(area);

/**
 * Why Sync and Pull are unavailable. Each names a state the owner resolves in a terminal; pressing a
 * button in any of them would leave the repository in the middle of an operation or fail half way.
 */
export const GIT_BLOCK_REASONS = [
  "no-git",
  "not-a-repository",
  "detached",
  "no-upstream",
  "operation-in-progress",
  "unmerged",
] as const;
export type GitBlockReason = (typeof GIT_BLOCK_REASONS)[number];

/**
 * Stable codes of a Sync or Pull that did not finish. A failure before the pull finishes leaves the
 * repository as it was before the press. After it, a failed push or local edits that wait in the stash
 * keep the local commit (and what the pull brought), and the next Sync picks up from there.
 */
export const GIT_FAILURE_CODES = [
  "conflict",
  "auth-required",
  "identity-missing",
  "offline",
  "busy",
  "blocked",
  "push-rejected",
  "git-failed",
] as const;
export type GitFailureCode = (typeof GIT_FAILURE_CODES)[number];

/** Stable codes of a card or topic write from the app that was not applied. */
export const CONTENT_WRITE_FAILURE_CODES = [
  "content-changed",
  "card-not-found",
  "topic-not-found",
  "nothing-to-restore",
] as const satisfies readonly (LearnErrorCode | "nothing-to-restore")[];
export type ContentWriteFailureCode =
  (typeof CONTENT_WRITE_FAILURE_CODES)[number];

// A subject line and a short body are plenty; a pasted wall of text is a mistake, not a message.
const MAX_COMMIT_MESSAGE = 2000;

/**
 * The commit message of a Sync. It reaches git as one argument, never through a shell, so any character
 * is safe; it must still say something, and a NUL byte would cut it short inside git.
 */
export const commitMessageSchema = z
  .string()
  .trim()
  .min(1, { error: "Write a commit message" })
  .max(MAX_COMMIT_MESSAGE)
  .refine((text) => !text.includes("\0"), {
    error: "The message cannot contain a NUL character",
  });

export const gitSyncBodySchema = z.strictObject({
  message: commitMessageSchema,
});
export type GitSyncBody = z.infer<typeof gitSyncBodySchema>;

/** Pull, delete and restore carry everything in the URL; an unexpected field is a client from elsewhere. */
export const emptyBodySchema = z.strictObject({});

/** The app archives and returns a card; `draft` stays a capture-time state the app never sets. */
export const APP_CARD_STATUSES = ["active", "retired"] as const;
export type AppCardStatus = (typeof APP_CARD_STATUSES)[number];

export const cardStatusBodySchema = z.strictObject({
  status: z.enum(APP_CARD_STATUSES),
});
export type CardStatusBody = z.infer<typeof cardStatusBodySchema>;

export const APP_TOPIC_STATUSES = ["active", "archived"] as const;
export type AppTopicStatus = (typeof APP_TOPIC_STATUSES)[number];

export const topicStatusBodySchema = z.strictObject({
  status: z.enum(APP_TOPIC_STATUSES),
});
export type TopicStatusBody = z.infer<typeof topicStatusBodySchema>;

export const cardIdParamSchema = z.string().regex(CARD_ID_PATTERN);
export const kebabParamSchema = kebabSchema;

/** Why the buttons are off, in one shape for the state and for a refused Sync. */
export const gitBlockSchema = z.object({ reason: z.enum(GIT_BLOCK_REASONS) });

export const gitEntrySchema = z.object({
  path: z.string().min(1),
  change: z.enum(GIT_CHANGES),
  area: z.enum(GIT_AREAS),
  /** `<domain>/<topic>`, so the Topic screen can pick its own files out of the whole repository. */
  topic: z.string().optional(),
  /** The card id taken from the file name, so a deleted card is recognized too. */
  card: z.string().optional(),
  /** Where a renamed file came from: a move of a card between topics touches both topics. */
  from: z.string().optional(),
});
export type GitEntry = z.infer<typeof gitEntrySchema>;

/**
 * What `GET /api/git` answers: where the branch stands against its upstream and what is not committed.
 * The app parses it with this schema at its edge, so server and app share one shape.
 */
export const gitStateSchema = z.object({
  branch: z.string().nullable(),
  upstream: z.string().nullable(),
  ahead: z.number().int().nonnegative(),
  behind: z.number().int().nonnegative(),
  blocked: gitBlockSchema.optional(),
  entries: z.array(gitEntrySchema),
  suggestedMessage: z.string(),
});
export type GitState = z.infer<typeof gitStateSchema>;

/** A finished Sync or Pull: how many commits were made, received and sent. */
export const gitSyncResultSchema = z.object({
  committed: z.number().int().nonnegative(),
  pulled: z.number().int().nonnegative(),
  pushed: z.number().int().nonnegative(),
});
export type GitSyncResult = z.infer<typeof gitSyncResultSchema>;

/**
 * A Sync or Pull that did not finish. `files` names the conflicting paths, `blocked` the block in the same shape as the state, `detail`
 * the first line git printed when nothing more specific is known; `stashKept` says local edits wait in
 * `git stash list` because they could not be put back.
 */
export const gitFailureSchema = z.object({
  code: z.enum(GIT_FAILURE_CODES),
  files: z.array(z.string()).optional(),
  blocked: gitBlockSchema.optional(),
  detail: z.string().optional(),
  stashKept: z.boolean().optional(),
});
export type GitFailure = z.infer<typeof gitFailureSchema>;

/**
 * Parses a request body with one of the schemas above, for a host that has no zod of its own: the
 * schema stays the single owner of the shape, and a refusal names the first bad field.
 */
export const parseAppBody = <Value>(
  schema: z.ZodType<Value>,
  raw: unknown,
):
  | { readonly ok: true; readonly value: Value }
  | ({ readonly ok: false } & SchemaIssue) => {
  const parsed = schema.safeParse(raw);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, ...firstIssue(parsed.error) };
};

const findingSchema = z.object({
  ruleId: z.enum(RULE_IDS),
  severity: z.enum(["error", "warning"]),
  file: z.string(),
  line: z.number().int().positive().optional(),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
});

/**
 * What a card or topic write from the app answers: on disk, stopped by the checks with their findings,
 * or not tried for the reason a code names (the file changed meanwhile, the card is gone).
 */
export const contentWriteAnswerSchema = z.union([
  z.object({ status: z.literal("written") }),
  z.object({
    status: z.literal("blocked"),
    findings: z.array(findingSchema),
    lint: z.array(z.unknown()),
  }),
  z.object({ code: z.string().min(1) }),
]);

/** A write's answer in the app's terms, with findings shaped as core's `Finding`. */
export type ContentWriteAnswer =
  | { readonly kind: "written" }
  | { readonly kind: "blocked"; readonly findings: readonly Finding[] }
  | { readonly kind: "refused"; readonly code: string };

export const parseContentWriteAnswer = (
  raw: unknown,
): ContentWriteAnswer | undefined => {
  const parsed = contentWriteAnswerSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const answer = parsed.data;
  if ("code" in answer) return { kind: "refused", code: answer.code };
  if (answer.status === "written") return { kind: "written" };
  return {
    kind: "blocked",
    findings: answer.findings.map(({ line, ...finding }): Finding =>
      line === undefined ? finding : { ...finding, line },
    ),
  };
};
