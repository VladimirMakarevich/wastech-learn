import { z } from "zod";
import {
  CARD_ID_PATTERN,
  CONTENT_LANGS,
  ORIGINS,
  isoDateSchema,
  kebabSchema,
} from "./common.js";

/**
 * Every card type the content model knows, the MVP ones and those planned for later. A type outside this
 * list is a typo; a planned type is accepted so a card can be drafted before its renderer exists.
 */
export const CARD_TYPES = [
  "basic",
  "cloze",
  "reversed",
  "why",
  "compare",
  "scenario",
  "vocab",
  "grammar-cloze",
  "design",
  "bug",
  "explain",
  "occlusion",
  "draw",
  "salience",
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_STATUSES = ["draft", "active", "retired"] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export const cardFrontMatterSchema = z.object({
  id: z.string().regex(CARD_ID_PATTERN, {
    error: "Expected 8 lower-case Crockford base32 characters",
  }),
  type: z.enum(CARD_TYPES),
  status: z.enum(CARD_STATUSES),
  bloom: z.enum([
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
  ]),
  grading: z.enum(["self", "ai", "none"]),
  idea: kebabSchema.optional(),
  tags: z.array(kebabSchema).optional(),
  origin: z.enum(ORIGINS),
  created: isoDateSchema,
  lang: z.enum(CONTENT_LANGS).optional(),
  langPair: z.enum(["pl-ru", "pl-en"]).optional(),
});
export type CardFrontMatter = z.infer<typeof cardFrontMatterSchema>;

export const topicIndexFrontMatterSchema = z.object({
  title: z.string().min(1),
  domain: kebabSchema,
  lang: z.enum(CONTENT_LANGS),
  status: z.enum(["draft", "active", "archived"]),
  familiarity: z.enum(["new", "familiar"]),
  created: isoDateSchema,
  origin: z.enum(ORIGINS),
  tags: z.array(kebabSchema).optional(),
  related: z
    .array(
      z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, {
        error: "Expected <domain>/<topic>",
      }),
    )
    .optional(),
});
export type TopicIndexFrontMatter = z.infer<typeof topicIndexFrontMatterSchema>;

export const summaryFrontMatterSchema = z.object({
  status: z.string().min(1),
  updated: isoDateSchema,
});
export type SummaryFrontMatter = z.infer<typeof summaryFrontMatterSchema>;

export const materialsFrontMatterSchema = z.object({
  updated: isoDateSchema,
});
export type MaterialsFrontMatter = z.infer<typeof materialsFrontMatterSchema>;
