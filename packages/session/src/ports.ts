import type {
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

/**
 * The review items of the content in the order new cards are introduced: the most recently captured
 * topic first, so what was just learned in a chat comes up while it is fresh, then by card creation
 * date and id.
 */
export const toQueueCards = (model: ContentModel): readonly QueueCard[] => {
  const topicCreated = new Map(
    model.topics.map((topic) => [topic.path, topic.index.frontMatter.created]),
  );
  const cards = [...model.cards].sort(
    (a, b) =>
      (topicCreated.get(b.topic) ?? "").localeCompare(
        topicCreated.get(a.topic) ?? "",
        "en",
      ) ||
      a.topic.localeCompare(b.topic, "en") ||
      a.frontMatter.created.localeCompare(b.frontMatter.created, "en") ||
      a.id.localeCompare(b.id, "en"),
  );
  return cards.flatMap((card) =>
    card.items.map((item) => ({
      item,
      cardId: card.id,
      idea: card.frontMatter.idea,
      domain: card.domain,
      type: card.frontMatter.type,
      status: card.frontMatter.status,
    })),
  );
};
