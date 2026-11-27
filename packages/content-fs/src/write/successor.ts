import {
  newUniqueCardId,
  withCardLinks,
  withFrontMatterValue,
  writeDocument,
  type ContentDocument,
  type ContentFiles,
  type ContentModel,
  type NewCardMeta,
} from "@wastech-learn/core";
import { calendarDate, type Snapshot, type Workspace } from "../workspace.js";
import { requireTopic, topicDir } from "./topic-paths.js";

const CARD_FILE = /\/cards\/([^/]+)\.md$/;

/**
 * Every id in use: those of parsed cards and the file names of cards that failed to parse, which still
 * own their id. A new id must avoid both. Without a model, the file names alone.
 */
export const takenCardIds = (
  files: ContentFiles,
  model?: ContentModel,
): Set<string> => {
  const ids = new Set(model?.cards.map((card) => card.id) ?? []);
  for (const path of files.keys()) {
    const id = CARD_FILE.exec(path)?.[1];
    if (id !== undefined) ids.add(id);
  }
  return ids;
};

/** The card whose meaning changed, as the plan needs it: where it lives and the text it keeps. */
export interface RetiringCard {
  readonly file: string;
  readonly topic: string;
  readonly origin: NewCardMeta["origin"];
  /** The text the retired file keeps; only its `status` changes. */
  readonly document: ContentDocument;
}

/** The successor's text, built once its id and date are known, and the title its index line shows. */
export interface SuccessorText {
  readonly document: ContentDocument;
  readonly title: string;
}

export interface SuccessorPlan {
  readonly id: string;
  readonly path: string;
  /** The retired card, the successor and the topic's index: one transaction, or none of them. */
  readonly files: ReadonlyMap<string, string>;
  readonly indexPath: string;
}

/**
 * A card whose meaning changed keeps its id only on the old file, now retired, because its review
 * history describes the old question; the new text goes to a card with a new id, dated today in the
 * learner's zone and linked in the topic's `## Cards`. The chat tool and the app's editor both retire a
 * card this way, so the rule lives here once.
 */
export const planSuccessor = (
  workspace: Workspace,
  snapshot: Snapshot,
  retiring: RetiringCard,
  successor: (meta: NewCardMeta) => SuccessorText,
): SuccessorPlan => {
  const topic = requireTopic(snapshot, retiring.topic);
  const id = newUniqueCardId(
    workspace.options.random,
    takenCardIds(snapshot.files, snapshot.parsed.model),
  );
  const path = `${topicDir(retiring.topic)}/cards/${id}.md`;
  const next = successor({
    id,
    origin: retiring.origin,
    created: calendarDate(workspace.options.now(), snapshot.config.timezone),
  });
  const files = new Map([
    [
      retiring.file,
      writeDocument(
        withFrontMatterValue(retiring.document, "status", "retired"),
      ),
    ],
    [path, writeDocument(next.document)],
    [
      topic.indexPath,
      writeDocument(withCardLinks(topic.index, [{ id, title: next.title }])),
    ],
  ]);
  return { id, path, files, indexPath: topic.indexPath };
};
