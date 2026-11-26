import { z } from "zod";

/** Crockford base32 in lower case: no i, l, o, u, so an id survives being read aloud or retyped. */
export const CARD_ID_PATTERN = /^[0-9a-hjkmnp-tv-z]{8}$/;

export const KEBAB_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const CONTENT_LANGS = ["en", "ru", "pl"] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];

export const ORIGINS = ["claude-code", "chatgpt", "manual", "import"] as const;

export const kebabSchema = z.string().regex(KEBAB_PATTERN);

/** `<domain>/<topic>`: a topic's identity, the same string the content model and `related` use. */
export const TOPIC_PATH_PATTERN = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;

export const topicPathSchema = z
  .string()
  .regex(TOPIC_PATH_PATTERN, { error: "Expected <domain>/<topic>" });

/** A calendar date as written in front matter; YAML keeps `2026-11-25` a string under its core schema. */
export const isoDateSchema = z.iso.date();

/**
 * Turns a schema issue path into the dotted field name an error message shows (`srs.desiredRetention`,
 * `limits.lang-pl.newPerDay`), so the user can find the key in the file they edit.
 */
export const fieldPath = (path: readonly PropertyKey[]): string =>
  path
    .map((key) => (typeof key === "number" ? `[${String(key)}]` : String(key)))
    .join(".")
    .replaceAll(".[", "[");

export interface SchemaIssue {
  readonly field: string;
  readonly message: string;
}

/** The first issue of a failed parse: one precise pointer helps more than a wall of follow-up errors. */
export const firstIssue = (error: z.ZodError): SchemaIssue => {
  const issue = error.issues[0];
  return {
    field: issue === undefined ? "" : fieldPath(issue.path),
    message: issue?.message ?? "Invalid value",
  };
};
