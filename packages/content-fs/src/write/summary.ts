import {
  mergeSummary,
  readDocument,
  summaryDocument,
  summaryTemplateFor,
  withSummarySections,
  writeDocument,
  type SaveSummaryInput,
  type SummarySectionName,
} from "@wastech-learn/core";
import { calendarDate, type Workspace } from "../workspace.js";
import { applyWrite, blockedBy, type WriteOutcomeOf } from "./apply.js";
import { requireTopic } from "./topic-paths.js";

export interface SavedFile {
  readonly path: string;
}

/** The topic's `#` title, which the summary and materials files repeat. */
export const topicTitle = (head: string, fallback: string): string =>
  /^# (.+)$/m.exec(head)?.[1]?.trim() ?? fallback;

/**
 * Writes the summary sections given and keeps every other section as the author left it; with `merge`,
 * a section that already has text keeps it and the new text goes under Open questions. Sections outside
 * the topic's template are kept too, after the template ones: losing text a chat produced is worse than a
 * section the template does not name.
 */
export const saveSummary = async (
  workspace: Workspace,
  input: SaveSummaryInput,
): Promise<WriteOutcomeOf<SavedFile>> => {
  const snapshot = await workspace.snapshot();
  const topic = requireTopic(snapshot, input.topic);
  const path = `${topic.dir}/summary.md`;
  const updated = calendarDate(
    workspace.options.now(),
    snapshot.config.timezone,
  );
  const template = summaryTemplateFor(topic.domain);
  const extra = (Object.keys(input.sections) as SummarySectionName[]).filter(
    (name) => !template.includes(name),
  );
  const order = [...template, ...extra];
  const existing = snapshot.files.get(path);
  const current = existing === undefined ? undefined : readDocument(existing);
  // A file that exists but cannot be read as front matter plus sections (a byte-order mark, no `---`
  // block) is the author's text in a form this tool does not understand; rewriting it from the input
  // alone would lose it, so the write stops and names the file.
  if (existing !== undefined && current === undefined) {
    return blockedBy(
      [
        {
          ruleId: "front-matter-missing",
          severity: "error",
          file: path,
          line: 1,
          params: {},
        },
      ],
      { path },
    );
  }
  const document =
    current === undefined
      ? summaryDocument({
          title: topicTitle(topic.index.head, input.topic),
          status: input.status ?? "active",
          updated,
          template: order,
          sections: input.sections,
        })
      : input.merge
        ? mergeSummary(current, input.sections, { template: order, updated })
        : withSummarySections(current, {
            sections: input.sections,
            template: order,
            updated,
            status: input.status,
          });
  return applyWrite(
    workspace,
    { files: new Map([[path, writeDocument(document)]]), result: { path } },
    { dryRun: input.dryRun === true },
  );
};
