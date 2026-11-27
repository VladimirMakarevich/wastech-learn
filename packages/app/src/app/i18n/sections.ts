import type { SummarySectionName } from "@wastech-learn/core";
import type { MessageKey } from "./en";

// Section keys stay English in the files, whatever the topic's language; the reader sees them in the
// interface language. A key the app does not know is shown as written.
const SECTION_KEYS: Readonly<Record<SummarySectionName, MessageKey>> = {
  "TL;DR": "section.tldr",
  "Mental model": "section.mental-model",
  Diagram: "section.diagram",
  "Worked example": "section.worked-example",
  "Trade-offs": "section.trade-offs",
  "When not to use": "section.when-not",
  Misconceptions: "section.misconceptions",
  Comparison: "section.comparison",
  "Self-check": "section.self-check",
  Related: "section.related",
  "Open questions": "section.open-questions",
  Sources: "section.sources",
  Rules: "section.rules",
  Examples: "section.examples",
  Exceptions: "section.exceptions",
};

export const sectionKey = (name: string): MessageKey | undefined =>
  (SECTION_KEYS as Readonly<Record<string, MessageKey>>)[name];

/** An anchor for a section, stable across languages because it comes from the English key. */
export const sectionAnchor = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
