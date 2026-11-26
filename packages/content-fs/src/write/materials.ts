import {
  MATERIALS_TITLE_SUFFIX,
  materialsDocument,
  readDocument,
  withMaterials,
  writeDocument,
  type SaveMaterialsInput,
} from "@wastech-learn/core";
import { calendarDate, type Workspace } from "../workspace.js";
import { applyWrite, blockedBy, type WriteOutcomeOf } from "./apply.js";
import { topicTitle } from "./summary.js";
import { requireTopic, topicLang } from "./topic-paths.js";

export interface SavedMaterials {
  readonly path: string;
}

/** Appends materials to the topic's table; a link already listed keeps its row and the learner's status. */
export const saveMaterials = async (
  workspace: Workspace,
  input: SaveMaterialsInput,
): Promise<WriteOutcomeOf<SavedMaterials>> => {
  const snapshot = await workspace.snapshot();
  const topic = requireTopic(snapshot, input.topic);
  const path = `${topic.dir}/materials.md`;
  const updated = calendarDate(
    workspace.options.now(),
    snapshot.config.timezone,
  );
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
  const title = `${topicTitle(topic.index.head, input.topic)}: ${MATERIALS_TITLE_SUFFIX[topicLang(snapshot, input.topic)]}`;
  const document =
    current === undefined
      ? materialsDocument({ title, updated, items: input.items })
      : withMaterials(current, input.items, updated);
  return applyWrite(
    workspace,
    {
      basis: snapshot,
      files: new Map([[path, writeDocument(document)]]),
      result: { path },
    },
    { dryRun: input.dryRun === true },
  );
};
