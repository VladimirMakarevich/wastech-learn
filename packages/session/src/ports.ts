import type {
  ContentBundle,
  ContentModel,
  LearnConfig,
  ReviewEvent,
} from "@wastech-learn/core";
import type { QueueCard, ReplayEvent, SrsConfig } from "@wastech-learn/srs";

// The two pure packages never import each other, so srs states its inputs as narrow ports. These bridges
// are where the type checker proves that core's parsed values fit them: a field renamed on either side
// fails the build here instead of at runtime.

export const toReplayEvents = (
  events: readonly ReviewEvent[],
): readonly ReplayEvent[] => events satisfies readonly ReplayEvent[];

export const toSrsConfig = (config: LearnConfig): SrsConfig =>
  config satisfies SrsConfig;

interface QueueSource {
  readonly topic: string;
  readonly created: string;
  readonly cardId: string;
  readonly items: readonly string[];
  readonly idea: string | undefined;
  readonly domain: string;
  readonly type: string;
  readonly status: string;
}

// The most recently captured topic first, so what was just learned in a chat comes up while it is fresh,
// then by card creation date and id. The chat quiz reads the model and the app reads the bundle; both go
// through this one order, so they introduce new cards identically.
const ordered = (
  topics: readonly { readonly path: string; readonly created: string }[],
  sources: readonly QueueSource[],
): readonly QueueCard[] => {
  const topicCreated = new Map(
    topics.map((topic) => [topic.path, topic.created]),
  );
  return [...sources]
    .sort(
      (a, b) =>
        (topicCreated.get(b.topic) ?? "").localeCompare(
          topicCreated.get(a.topic) ?? "",
          "en",
        ) ||
        a.topic.localeCompare(b.topic, "en") ||
        a.created.localeCompare(b.created, "en") ||
        a.cardId.localeCompare(b.cardId, "en"),
    )
    .flatMap((source) =>
      source.items.map((item) => ({
        item,
        cardId: source.cardId,
        idea: source.idea,
        domain: source.domain,
        type: source.type,
        status: source.status,
      })),
    );
};

/** The review items of the content in the order new cards are introduced. */
export const toQueueCards = (model: ContentModel): readonly QueueCard[] =>
  ordered(
    model.topics.map((topic) => ({
      path: topic.path,
      created: topic.index.frontMatter.created,
    })),
    model.cards.map((card) => ({
      topic: card.topic,
      created: card.frontMatter.created,
      cardId: card.id,
      items: card.items,
      idea: card.frontMatter.idea,
      domain: card.domain,
      type: card.frontMatter.type,
      status: card.frontMatter.status,
    })),
  );

/** The same review items, in the same order, from the content bundle the app reads. */
export const bundleQueueCards = (
  bundle: Pick<ContentBundle, "topics" | "cards">,
): readonly QueueCard[] =>
  ordered(
    bundle.topics,
    bundle.cards.map((card) => ({
      topic: card.topic,
      created: card.created,
      cardId: card.id,
      items: card.variants.map((variant) => `${card.id}:${variant}`),
      idea: card.idea ?? undefined,
      domain: card.domain,
      type: card.type,
      status: card.status,
    })),
  );
