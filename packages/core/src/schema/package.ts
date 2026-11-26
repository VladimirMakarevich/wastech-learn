import { z } from "zod";
import { CONTENT_LANGS, isoDateSchema, kebabSchema } from "./common.js";
import { FAMILIARITIES } from "./front-matter.js";

/** The format marker of the only package version this framework reads. */
export const PACKAGE_FORMAT = "wastech-learn/v1";

/**
 * Front matter of a learning package: everything needed to place it before a single file of the topic
 * exists. `source` names the chat it came from; the content language is the one the learner studied in,
 * not the language of the export prompt.
 */
export const learningPackageFrontMatterSchema = z.object({
  package: z.literal(PACKAGE_FORMAT, {
    error: `Expected package: ${PACKAGE_FORMAT}`,
  }),
  source: kebabSchema,
  lang: z.enum(CONTENT_LANGS),
  domain: kebabSchema,
  topic: kebabSchema,
  familiarity: z.enum(FAMILIARITIES),
  created: isoDateSchema,
});
export type LearningPackageFrontMatter = z.infer<
  typeof learningPackageFrontMatterSchema
>;

/** The `##` sections of a package, in the order the export prompt asks for them. */
export const PACKAGE_SECTIONS = [
  "Topic",
  "Summary",
  "Materials",
  "Diagrams",
  "Cards",
] as const;

/** A chat may leave out materials or diagrams it has nothing for; without these three there is no topic. */
export const REQUIRED_PACKAGE_SECTIONS = ["Topic", "Summary", "Cards"] as const;
