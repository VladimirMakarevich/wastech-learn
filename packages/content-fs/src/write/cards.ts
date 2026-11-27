import {
  LearnError,
  cardDocument,
  newUniqueCardId,
  patchCardDocument,
  readDocument,
  successorCardDocument,
  withCardLinks,
  writeDocument,
  type AddCardsInput,
  type UpdateCardInput,
} from "@wastech-learn/core";
import { calendarDate, type Workspace } from "../workspace.js";
import { applyWrite, type WriteOutcomeOf } from "./apply.js";
import { planSuccessor, takenCardIds } from "./successor.js";
import { requireTopic } from "./topic-paths.js";

export interface AddedCards {
  readonly ids: readonly string[];
  readonly paths: readonly string[];
}

/**
 * Writes cards the learner picked into a topic: one file per card under a new random id, and a link to
 * each in the topic's `## Cards`. All of them and the index are one transaction: either the topic gains
 * every card, or nothing changes.
 */
export const addCards = async (
  workspace: Workspace,
  input: AddCardsInput,
): Promise<WriteOutcomeOf<AddedCards>> => {
  const snapshot = await workspace.snapshot();
  const topic = requireTopic(snapshot, input.topic);
  const created = calendarDate(
    workspace.options.now(),
    snapshot.config.timezone,
  );
  const taken = takenCardIds(snapshot.files, snapshot.parsed.model);
  const files = new Map<string, string>();
  const cards = input.cards.map((fields) => {
    const id = newUniqueCardId(workspace.options.random, taken);
    taken.add(id);
    const path = `${topic.dir}/cards/${id}.md`;
    files.set(
      path,
      writeDocument(
        cardDocument(fields, { id, origin: input.origin, created }),
      ),
    );
    return { id, title: fields.title, path };
  });
  files.set(topic.indexPath, writeDocument(withCardLinks(topic.index, cards)));
  return applyWrite(
    workspace,
    {
      basis: snapshot,
      files,
      incidental: [topic.indexPath],
      result: {
        ids: cards.map((card) => card.id),
        paths: cards.map((card) => card.path),
      },
    },
    { dryRun: input.dryRun === true },
  );
};

export interface UpdatedCard {
  /** The card that now carries the text: the same id, or the successor's when the meaning changed. */
  readonly id: string;
  readonly retired: string | undefined;
  readonly paths: readonly string[];
}

/**
 * Edits a card. A wording fix keeps the id and with it the review history. When the learner says the
 * meaning changed, the old card is retired and a successor with a new id takes the new text, because
 * the old history describes a different question; both files and the index change in one transaction.
 */
export const updateCard = async (
  workspace: Workspace,
  input: UpdateCardInput,
): Promise<WriteOutcomeOf<UpdatedCard>> => {
  const snapshot = await workspace.snapshot();
  const card = snapshot.parsed.model.cards.find(
    (candidate) => candidate.id === input.id,
  );
  const text = card === undefined ? undefined : snapshot.files.get(card.file);
  const document = text === undefined ? undefined : readDocument(text);
  if (card === undefined || document === undefined) {
    throw new LearnError("card-not-found", `No card with id ${input.id}`, {
      subject: input.id,
    });
  }
  const dryRun = input.dryRun === true;
  const topic = requireTopic(snapshot, card.topic);
  if (!input.meaningChanged) {
    const files = new Map([
      [card.file, writeDocument(patchCardDocument(document, input.fields))],
    ]);
    // A new title shows in the topic's list too; otherwise the index stays untouched.
    const { title } = input.fields;
    if (title !== undefined && title !== card.title) {
      files.set(
        topic.indexPath,
        writeDocument(withCardLinks(topic.index, [{ id: card.id, title }])),
      );
    }
    return applyWrite(
      workspace,
      {
        basis: snapshot,
        files,
        incidental: [topic.indexPath],
        result: { id: card.id, retired: undefined, paths: [card.file] },
      },
      { dryRun },
    );
  }
  const { id, path, files } = planSuccessor(
    workspace,
    snapshot,
    {
      file: card.file,
      topic: card.topic,
      origin: card.frontMatter.origin,
      document,
    },
    (meta) => ({
      document: successorCardDocument(document, input.fields, meta),
      title: input.fields.title ?? card.title ?? meta.id,
    }),
  );
  return applyWrite(
    workspace,
    {
      basis: snapshot,
      files,
      incidental: [topic.indexPath],
      result: { id, retired: card.id, paths: [card.file, path] },
    },
    { dryRun },
  );
};
