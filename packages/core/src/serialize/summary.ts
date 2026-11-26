import type { SummarySections } from "../schema/mcp/content.js";
import {
  OPEN_QUESTIONS_SECTION,
  type SummarySectionName,
} from "../template.js";
import {
  frontMatterText,
  sectionMarkdown,
  withFrontMatterValue,
  withSection,
  type ContentDocument,
} from "./document.js";
import { oneLine } from "./inline.js";

export type { SummarySections };

export interface SummaryInput {
  readonly title: string;
  readonly status: string;
  /** `YYYY-MM-DD` of this write. */
  readonly updated: string;
  readonly template: readonly SummarySectionName[];
  readonly sections: SummarySections;
}

/**
 * A summary with every section of its template, filled or empty. An empty section is a visible gap the
 * linter warns about, which is the honest state of a topic whose summary is not written yet; a missing
 * one would be an error and would block every later write to the topic.
 */
export const summaryDocument = (input: SummaryInput): ContentDocument => ({
  frontMatter: frontMatterText([
    ["status", input.status],
    ["updated", input.updated],
  ]),
  head: `# ${oneLine(input.title)}`,
  sections: input.template.map((name) => ({
    heading: `## ${name}`,
    name,
    markdown: (input.sections[name] ?? "").trim(),
  })),
});

/**
 * An existing summary with the given sections rewritten and every other section kept as it is. Template
 * sections the file lacks are added empty in their place, so the file passes the section rules after
 * any partial write.
 */
export const withSummarySections = (
  document: ContentDocument,
  update: {
    readonly sections: SummarySections;
    readonly template: readonly SummarySectionName[];
    readonly updated: string;
    readonly status?: string | undefined;
  },
): ContentDocument => {
  let result = withFrontMatterValue(document, "updated", update.updated);
  if (update.status !== undefined)
    result = withFrontMatterValue(result, "status", update.status);
  for (const name of update.template) {
    const given = update.sections[name];
    if (given !== undefined) {
      result = withSection(result, name, given, update.template);
    } else if (sectionMarkdown(result, name) === undefined) {
      result = withSection(result, name, "", update.template);
    }
  }
  return result;
};

const normalized = (markdown: string): string =>
  markdown.replace(/\s+/g, " ").trim();

/**
 * Folds an imported summary into an existing one without overwriting the author: a section that is
 * missing or empty takes the imported text; a section that already says something keeps it, and the
 * imported version goes under `## Open questions` as a `###` block to reconcile by hand. Text that is
 * already there, in its section or among the open questions, is not added again, so importing the
 * same package twice changes nothing.
 */
export const mergeSummary = (
  document: ContentDocument,
  incoming: SummarySections,
  options: {
    readonly template: readonly SummarySectionName[];
    readonly updated: string;
  },
): ContentDocument => {
  const filled: SummarySections = {};
  const conflicts: string[] = [];
  const openQuestions = sectionMarkdown(document, OPEN_QUESTIONS_SECTION) ?? "";
  for (const [name, markdown] of Object.entries(incoming) as [
    SummarySectionName,
    string,
  ][]) {
    const text = markdown.trim();
    if (text === "") continue;
    const current = sectionMarkdown(document, name)?.trim() ?? "";
    if (current === "") {
      filled[name] = text;
      continue;
    }
    if (
      normalized(current).includes(normalized(text)) ||
      normalized(openQuestions).includes(normalized(text))
    ) {
      continue;
    }
    conflicts.push(`### ${name}\n\n${text}`);
  }
  const order: readonly SummarySectionName[] = options.template.includes(
    OPEN_QUESTIONS_SECTION,
  )
    ? options.template
    : [
        ...options.template.filter((name) => name !== "Sources"),
        OPEN_QUESTIONS_SECTION,
        "Sources",
      ];
  let result = withSummarySections(document, {
    sections: filled,
    template: options.template,
    updated: options.updated,
  });
  if (conflicts.length > 0) {
    const base = sectionMarkdown(result, OPEN_QUESTIONS_SECTION)?.trim() ?? "";
    result = withSection(
      result,
      OPEN_QUESTIONS_SECTION,
      [base, ...conflicts].filter((block) => block !== "").join("\n\n"),
      order,
    );
  }
  return result;
};
