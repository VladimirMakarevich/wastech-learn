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

export const BLOOM_LEVELS = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
] as const;
export type BloomLevel = (typeof BLOOM_LEVELS)[number];

export const GRADINGS = ["self", "ai", "none"] as const;

export const TOPIC_STATUSES = ["draft", "active", "archived"] as const;
export const FAMILIARITIES = ["new", "familiar"] as const;
export const LANG_PAIRS = ["pl-ru", "pl-en"] as const;

export const cardFrontMatterSchema = z.object({
  id: z.string().regex(CARD_ID_PATTERN, {
    error: "Expected 8 lower-case Crockford base32 characters",
  }),
  type: z.enum(CARD_TYPES),
  status: z.enum(CARD_STATUSES),
  bloom: z.enum(BLOOM_LEVELS),
  grading: z.enum(GRADINGS),
  idea: kebabSchema.optional(),
  tags: z.array(kebabSchema).optional(),
  origin: z.enum(ORIGINS),
  created: isoDateSchema,
  lang: z.enum(CONTENT_LANGS).optional(),
  langPair: z.enum(LANG_PAIRS).optional(),
});
export type CardFrontMatter = z.infer<typeof cardFrontMatterSchema>;

export const topicIndexFrontMatterSchema = z.object({
  title: z.string().min(1),
  domain: kebabSchema,
  lang: z.enum(CONTENT_LANGS),
  status: z.enum(TOPIC_STATUSES),
  familiarity: z.enum(FAMILIARITIES),
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
