import type { ContentBundle } from "@wastech-learn/core";
import type { QueueCard } from "@wastech-learn/srs";
import { bundleQueueCards } from "./ports.js";

/** What a session draws from: every review item in introduction order and each card's current hash. */
export interface SessionDeck {
  readonly cards: readonly QueueCard[];
  readonly byItem: ReadonlyMap<string, QueueCard>;
  /** Card id → content hash, written into every rating and compared with the hash last answered on. */
  readonly contentHash: ReadonlyMap<string, string>;
}

export const deckFromBundle = (
  bundle: Pick<ContentBundle, "topics" | "cards">,
): SessionDeck => {
  const cards = bundleQueueCards(bundle);
  return {
    cards,
    byItem: new Map(cards.map((card) => [card.item, card])),
    contentHash: new Map(
      bundle.cards.map((card) => [card.id, card.contentHash]),
    ),
  };
};
