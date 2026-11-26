import {
  LearnError,
  MATERIALS_TITLE_SUFFIX,
  materialsDocument,
  summaryDocument,
  summaryTemplateFor,
  topicIndexDocument,
  writeDocument,
  type CreateTopicInput,
} from "@wastech-learn/core";
import { calendarDate, type Workspace } from "../workspace.js";
import { applyWrite, type WriteOutcomeOf } from "./apply.js";
import { topicDir } from "./topic-paths.js";

export interface CreatedTopic {
  readonly topic: string;
  readonly paths: readonly string[];
}

/**
 * Creates a topic: its `index.md` with the key idea and pretest, plus a `summary.md` with every section of
 * its template still empty and a `materials.md` with an empty table. The three files are a topic only
 * together, and `check` reports a topic without its summary or materials as an error; empty sections are
 * warnings, the honest state of a summary not written yet.
 */
export const createTopic = async (
  workspace: Workspace,
  input: CreateTopicInput,
): Promise<WriteOutcomeOf<CreatedTopic>> => {
  const snapshot = await workspace.snapshot();
  const topic = `${input.domain}/${input.topic}`;
  const dir = topicDir(topic);
  if (snapshot.files.has(`${dir}/index.md`)) {
    throw new LearnError("topic-exists", `Topic ${topic} already exists`, {
      subject: topic,
    });
  }
  const today = calendarDate(workspace.options.now(), snapshot.config.timezone);
  const files = new Map<string, string>([
    [
      `${dir}/index.md`,
      writeDocument(
        topicIndexDocument({
          frontMatter: {
            title: input.title,
            domain: input.domain,
            lang: input.lang,
            status: "active",
            familiarity: input.familiarity,
            created: today,
            origin: input.origin,
            tags: input.tags,
            related: input.related,
          },
          keyIdea: input.keyIdea,
          pretest: input.pretest,
          cards: [],
        }),
      ),
    ],
  ]);
  // A summary or materials file left from an earlier attempt is the author's text and stays.
  if (!snapshot.files.has(`${dir}/summary.md`)) {
    files.set(
      `${dir}/summary.md`,
      writeDocument(
        summaryDocument({
          title: input.title,
          status: "draft",
          updated: today,
          template: summaryTemplateFor(input.domain),
          sections: {},
        }),
      ),
    );
  }
  if (!snapshot.files.has(`${dir}/materials.md`)) {
    files.set(
      `${dir}/materials.md`,
      writeDocument(
        materialsDocument({
          title: `${input.title}: ${MATERIALS_TITLE_SUFFIX[input.lang]}`,
          updated: today,
          items: [],
        }),
      ),
    );
  }
  return applyWrite(
    workspace,
    { files, result: { topic, paths: [...files.keys()] } },
    { dryRun: input.dryRun === true },
  );
};
