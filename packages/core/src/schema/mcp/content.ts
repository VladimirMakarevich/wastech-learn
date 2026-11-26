import { z } from "zod";
import {
  CARD_ID_PATTERN,
  CONTENT_LANGS,
  ORIGINS,
  kebabSchema,
  topicPathSchema,
} from "../common.js";
import {
  BLOOM_LEVELS,
  CARD_TYPES,
  FAMILIARITIES,
  GRADINGS,
  LANG_PAIRS,
} from "../front-matter.js";
import {
  MATERIAL_KINDS,
  MATERIAL_STATUSES,
  SUMMARY_SECTION_NAMES,
} from "../../template.js";
import { parseMarkdown } from "../../parse/markdown.js";
import { mutationShape, repoPathSchema, requireRequestId } from "./common.js";

const cardIdSchema = z.string().regex(CARD_ID_PATTERN, {
  error: "Expected 8 lower-case Crockford base32 characters",
});

const markdownSchema = z.string().trim().min(1);

const hasSectionHeading = (markdown: string): boolean =>
  parseMarkdown(markdown).children.some(
    (node) => node.type === "heading" && node.depth <= 2,
  );

/**
 * Markdown that goes under a `##` section of a file. A `#`/`##` heading in it, or a line underlined with
 * `---`, would start a new section when the file is read back, and the text after it would be lost from
 * the field it was written for; `###` and deeper stay inside the section.
 */
const sectionTextSchema = (base: z.ZodString) =>
  base.refine((markdown) => !hasSectionHeading(markdown), {
    error:
      "Use ### or deeper for headings here, and no line underlined with --- or ===",
  });

const sectionMarkdownSchema = sectionTextSchema(markdownSchema);

/** Section name → Markdown of a summary; an empty string empties the section. */
export const summarySectionsSchema = z.partialRecord(
  z.enum(SUMMARY_SECTION_NAMES),
  sectionTextSchema(z.string()),
);
export type SummarySections = z.infer<typeof summarySectionsSchema>;

export const pretestItemSchema = z.strictObject({
  question: markdownSchema,
  answer: markdownSchema.optional(),
  /** 1 guess, 2 unsure, 3 sure: the same scale review events record. */
  confidence: z.literal([1, 2, 3]).optional(),
});
export type PretestItem = z.infer<typeof pretestItemSchema>;

export const createTopicInputSchema = z
  .strictObject({
    domain: kebabSchema,
    topic: kebabSchema,
    title: markdownSchema.max(120),
    lang: z.enum(CONTENT_LANGS),
    familiarity: z.enum(FAMILIARITIES),
    keyIdea: sectionMarkdownSchema,
    pretest: z.array(pretestItemSchema).max(10).default([]),
    tags: z.array(kebabSchema).optional(),
    related: z.array(topicPathSchema).optional(),
    origin: z.enum(ORIGINS).default("claude-code"),
    ...mutationShape,
  })
  .superRefine(requireRequestId);
export type CreateTopicInput = z.infer<typeof createTopicInputSchema>;

export const cardSourceSchema = z.strictObject({
  title: markdownSchema,
  url: z.string().trim().min(1),
});
export type CardSource = z.infer<typeof cardSourceSchema>;

/** What a tool may say about a card; the id, origin and creation date are the tool's to assign. */
export const cardFieldsSchema = z.strictObject({
  /** Short `#` title for lists, search and the topic's `## Cards`; never shown while recalling. */
  title: markdownSchema.max(120),
  type: z.enum(CARD_TYPES),
  bloom: z.enum(BLOOM_LEVELS),
  grading: z.enum(GRADINGS),
  /** A new card is a candidate until the learner picks it; `retired` is reached only through an update. */
  status: z.enum(["draft", "active"]),
  idea: kebabSchema.optional(),
  tags: z.array(kebabSchema).optional(),
  lang: z.enum(CONTENT_LANGS).optional(),
  langPair: z.enum(LANG_PAIRS).optional(),
  question: sectionMarkdownSchema,
  answer: sectionMarkdownSchema,
  /** Checklist points; a required one starts with `(!)`. */
  rubric: z.array(markdownSchema).optional(),
  explanation: sectionMarkdownSchema.optional(),
  sources: z.array(cardSourceSchema).default([]),
});
export type CardFields = z.infer<typeof cardFieldsSchema>;

export const addCardsInputSchema = z
  .strictObject({
    topic: topicPathSchema,
    cards: z.array(cardFieldsSchema).min(1).max(20),
    origin: z.enum(ORIGINS).default("claude-code"),
    ...mutationShape,
  })
  .superRefine(requireRequestId);
export type AddCardsInput = z.infer<typeof addCardsInputSchema>;

export const cardPatchSchema = cardFieldsSchema
  .omit({ status: true, sources: true })
  .extend({
    status: z.enum(["draft", "active", "retired"]),
    sources: z.array(cardSourceSchema),
  })
  .partial();
export type CardPatch = z.infer<typeof cardPatchSchema>;

export const updateCardInputSchema = z
  .strictObject({
    id: cardIdSchema,
    fields: cardPatchSchema,
    /**
     * The learner decided the card now asks or means something else: its history no longer describes
     * the new text, so the old card retires and the new text starts as a new card with a fresh id.
     */
    meaningChanged: z.boolean().default(false),
    ...mutationShape,
  })
  .superRefine(requireRequestId);
export type UpdateCardInput = z.infer<typeof updateCardInputSchema>;

export const saveSummaryInputSchema = z
  .strictObject({
    topic: topicPathSchema,
    /** Section name → Markdown; sections left out keep their current text. */
    sections: summarySectionsSchema,
    status: z.string().trim().min(1).optional(),
    /**
     * Import into an existing topic: empty sections take the text, sections that already say something
     * keep it, and the new version is parked under Open questions instead of overwriting the author.
     */
    merge: z.boolean().default(false),
    ...mutationShape,
  })
  .superRefine(requireRequestId);
export type SaveSummaryInput = z.infer<typeof saveSummaryInputSchema>;

export const materialItemSchema = z.strictObject({
  title: markdownSchema,
  url: z.string().trim().min(1),
  kind: z.enum(MATERIAL_KINDS),
  why: markdownSchema,
  status: z.enum(MATERIAL_STATUSES).default("to-read"),
});
export type MaterialItem = z.infer<typeof materialItemSchema>;

export const saveMaterialsInputSchema = z
  .strictObject({
    topic: topicPathSchema,
    items: z.array(materialItemSchema).min(1).max(30),
    ...mutationShape,
  })
  .superRefine(requireRequestId);
export type SaveMaterialsInput = z.infer<typeof saveMaterialsInputSchema>;

export const saveDiagramInputSchema = z
  .strictObject({
    topic: topicPathSchema,
    name: kebabSchema,
    format: z.literal("mermaid"),
    source: z.string().trim().min(1).max(20_000),
    /** What the diagram shows, for a reader who cannot see it; the embed snippet carries it. */
    alt: z.string().trim().min(1, { error: "A diagram needs alt text" }),
    ...mutationShape,
  })
  .superRefine(requireRequestId);
export type SaveDiagramInput = z.infer<typeof saveDiagramInputSchema>;

export const draftFileSchema = z.strictObject({
  path: repoPathSchema,
  content: z.string().max(200_000),
});

export const validateInputSchema = z
  .strictObject({
    paths: z.array(repoPathSchema).max(50).optional(),
    drafts: z.array(draftFileSchema).max(20).optional(),
  })
  .refine(
    (input) => (input.paths?.length ?? 0) + (input.drafts?.length ?? 0) > 0,
    { error: "Name paths to check or pass drafts", path: ["paths"] },
  );
export type ValidateInput = z.infer<typeof validateInputSchema>;

export const searchInputSchema = z.strictObject({
  query: z.string().trim().min(1).max(300),
  domain: kebabSchema.optional(),
  type: z.enum(CARD_TYPES).optional(),
  status: z.enum(["draft", "active", "retired", "archived"]).optional(),
  limit: z.int().min(1).max(20).default(8),
});
export type SearchInput = z.infer<typeof searchInputSchema>;
