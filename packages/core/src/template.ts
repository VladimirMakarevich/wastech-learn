// The fixed section keys of each content file, in the order the content preset of mdlint checks them.
// They are English in every topic language: the UI translates the keys, the author's text stays as written.

export const INDEX_SECTIONS = ["Key idea", "Pretest", "Cards"] as const;

export const CARD_SECTIONS = [
  "Question",
  "Answer",
  "Rubric",
  "Explanation",
  "Sources",
] as const;

/** The twelve sections of a technical topic's summary. */
export const SUMMARY_SECTIONS = [
  "TL;DR",
  "Mental model",
  "Diagram",
  "Worked example",
  "Trade-offs",
  "When not to use",
  "Misconceptions",
  "Comparison",
  "Self-check",
  "Related",
  "Open questions",
  "Sources",
] as const;

/** A language topic learns rules and phrases, not mechanisms, so its summary has its own shorter template. */
export const LANGUAGE_SUMMARY_SECTIONS = [
  "TL;DR",
  "Rules",
  "Examples",
  "Exceptions",
  "Comparison",
  "Self-check",
  "Related",
  "Sources",
] as const;

export type SummarySectionName =
  | (typeof SUMMARY_SECTIONS)[number]
  | (typeof LANGUAGE_SUMMARY_SECTIONS)[number];

export const SUMMARY_SECTION_NAMES: readonly SummarySectionName[] = [
  ...new Set<SummarySectionName>([
    ...SUMMARY_SECTIONS,
    ...LANGUAGE_SUMMARY_SECTIONS,
  ]),
];

/** Language domains are named `lang-<iso>`, and only they use the language template. */
export const isLanguageDomain = (domain: string): boolean =>
  domain.startsWith("lang-");

export const summaryTemplateFor = (
  domain: string,
): readonly SummarySectionName[] =>
  isLanguageDomain(domain) ? LANGUAGE_SUMMARY_SECTIONS : SUMMARY_SECTIONS;

/** Where text goes that would otherwise overwrite what the author already wrote in a summary section. */
export const OPEN_QUESTIONS_SECTION = "Open questions";

export const MATERIAL_KINDS = [
  "docs",
  "article",
  "video",
  "book",
  "repo",
  "course",
  "chat",
] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export const MATERIAL_STATUSES = ["to-read", "read", "reference"] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export const MATERIALS_SECTION = "Materials";

/**
 * The second half of the `#` title of a new `materials.md`, in the topic's language, as the hand-written
 * files have it (`Backpressure: materials`). Template text, like the section keys, not translated content.
 */
export const MATERIALS_TITLE_SUFFIX: Readonly<
  Record<"en" | "ru" | "pl", string>
> = {
  en: "materials",
  ru: "материалы",
  pl: "materiały",
};
