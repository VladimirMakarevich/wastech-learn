import { z } from "zod";
import type { Finding } from "../finding.js";
import { findingSchema, toFindings } from "./app.js";

/**
 * What the learner answers when an edit may have turned a card into another one: `same` keeps the id
 * and its history, `new` retires the card and gives the text to a successor with a new id.
 */
export const EDIT_MEANINGS = ["same", "new"] as const;
export type EditMeaning = (typeof EDIT_MEANINGS)[number];

// Long enough for any repository path the bundle names; a longer one is not a content file.
const MAX_PATH = 512;

export const sourcePathSchema = z.string().min(1).max(MAX_PATH);

/** The SHA-256 of the text the editor was opened with, so a save can tell whether the file moved on. */
export const sourceVersionSchema = z.string().regex(/^[0-9a-f]{64}$/);

/** `GET /api/source`: the file as text, and the version a later save names. */
export const sourceFileSchema = z.object({
  path: sourcePathSchema,
  text: z.string(),
  version: sourceVersionSchema,
});
export type SourceFile = z.infer<typeof sourceFileSchema>;

/** `PUT /api/source`: the whole new text of one file, against the version it was edited from. */
export const sourceSaveBodySchema = z.strictObject({
  path: sourcePathSchema,
  version: sourceVersionSchema,
  text: z.string(),
  meaning: z.enum(EDIT_MEANINGS).optional(),
});
export type SourceSaveBody = z.infer<typeof sourceSaveBodySchema>;

/** A finding of wastech-mdlint, shown in its own English words: it ships no other catalog. */
export const lintFindingSchema = z.object({
  file: z.string(),
  line: z.number().int(),
  ruleId: z.string(),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
});
export type SourceLintFinding = z.infer<typeof lintFindingSchema>;

const largeEditSchema = z.object({
  section: z.string(),
  percent: z.number().int().nonnegative(),
});

/** Stable codes of a save that was not tried, each with the HTTP status the server answers it with. */
export const SOURCE_REFUSAL_CODES = [
  "source-not-found",
  "content-changed",
  "body-invalid",
] as const;
export type SourceRefusalCode = (typeof SOURCE_REFUSAL_CODES)[number];

/**
 * Every shape `PUT /api/source` answers with: written (or nothing to write), stopped by the checks,
 * waiting for the learner's word on the meaning, or refused by code.
 */
export const sourceSaveAnswerSchema = z.union([
  z.object({
    status: z.enum(["written", "unchanged"]),
    paths: z.array(z.string()),
    card: z
      .object({ id: z.string(), retired: z.string().nullable() })
      .optional(),
    findings: z.array(findingSchema),
    lint: z.array(lintFindingSchema),
  }),
  z.object({
    status: z.literal("blocked"),
    findings: z.array(findingSchema),
    lint: z.array(lintFindingSchema),
  }),
  z.object({
    code: z.literal("decision-needed"),
    largeEdit: z.array(largeEditSchema),
    removedVariants: z.array(z.string()),
  }),
  z.object({ code: z.string().min(1) }),
]);

/** A save's answer in the app's terms, with findings shaped as core's `Finding`. */
export type SourceSaveAnswer =
  | {
      readonly kind: "saved";
      readonly status: "written" | "unchanged";
      readonly paths: readonly string[];
      readonly card:
        { readonly id: string; readonly retired: string | null } | undefined;
      readonly findings: readonly Finding[];
      readonly lint: readonly SourceLintFinding[];
    }
  | {
      readonly kind: "blocked";
      readonly findings: readonly Finding[];
      readonly lint: readonly SourceLintFinding[];
    }
  | {
      readonly kind: "decision";
      readonly largeEdit: readonly {
        readonly section: string;
        readonly percent: number;
      }[];
      readonly removedVariants: readonly string[];
    }
  | { readonly kind: "refused"; readonly code: string };

export const parseSourceSaveAnswer = (
  raw: unknown,
): SourceSaveAnswer | undefined => {
  const parsed = sourceSaveAnswerSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const answer = parsed.data;
  if ("code" in answer) {
    return "largeEdit" in answer
      ? {
          kind: "decision",
          largeEdit: answer.largeEdit,
          removedVariants: answer.removedVariants,
        }
      : { kind: "refused", code: answer.code };
  }
  if (answer.status === "blocked")
    return {
      kind: "blocked",
      findings: toFindings(answer.findings),
      lint: answer.lint,
    };
  return {
    kind: "saved",
    status: answer.status,
    paths: answer.paths,
    card: answer.card,
    findings: toFindings(answer.findings),
    lint: answer.lint,
  };
};
