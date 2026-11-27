import { toReplayEvents } from "@wastech-learn/session";
import {
  buildQueue,
  comebackDays,
  comebackStatus,
  loadForecast,
  type ForecastDay,
  type Queue,
} from "@wastech-learn/srs";
import type { LibrarySnapshot } from "../../data/snapshot";

export interface TopicRow {
  readonly path: string;
  readonly title: string;
  readonly lang: string;
  readonly cards: number;
  readonly due: number;
  /** One point per card: the mean retrievability of its items, `null` while all are new. */
  readonly points: readonly (number | null)[];
}

export interface DomainGroup {
  readonly id: string;
  readonly topics: readonly TopicRow[];
}

export interface HomeModel {
  readonly queue: Queue;
  readonly newByDomain: readonly {
    readonly domain: string;
    readonly count: number;
  }[];
  readonly newPaused: boolean;
  readonly forecast: readonly ForecastDay[];
  /** Set after a pause of more than three study days: greet with a plan instead of a count. */
  readonly comeback:
    { readonly days: number; readonly sessionMinutes: number } | undefined;
  readonly domains: readonly DomainGroup[];
}

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Everything Home shows, from the replayed log: the day's queue and its minutes, new cards by domain, the
 * week's load, the plan to come back after a break, and the topics with their memory and what is due.
 */
export const homeModel = (snapshot: LibrarySnapshot): HomeModel => {
  const { state, deck, context, now, estimates, bundle } = snapshot;
  const { config } = context;
  const queue = buildQueue(state, deck.cards, config, now, {
    mode: { kind: "full" },
    estimates,
  });
  const fresh = new Map<string, number>();
  for (const entry of queue.entries)
    if (entry.kind === "new")
      fresh.set(entry.domain, (fresh.get(entry.domain) ?? 0) + 1);
  const dueByCard = new Map<string, number>();
  for (const entry of queue.entries)
    dueByCard.set(entry.cardId, (dueByCard.get(entry.cardId) ?? 0) + 1);
  const itemsByCard = new Map<string, string[]>();
  for (const card of deck.cards)
    itemsByCard.set(card.cardId, [
      ...(itemsByCard.get(card.cardId) ?? []),
      card.item,
    ]);
  const topics = new Map(bundle.topics.map((topic) => [topic.path, topic]));
  const status = comebackStatus(toReplayEvents(snapshot.events), config, now);
  return {
    queue,
    newByDomain: [...fresh]
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([domain, count]) => ({ domain, count })),
    newPaused: queue.policies.some((policy) => policy.paused),
    forecast: loadForecast(state, deck.cards, config, now, 7, estimates),
    comeback: status.returning
      ? {
          days: comebackDays(
            queue.estimateMinutes,
            config.limits.sessionMinutes,
          ),
          sessionMinutes: config.limits.sessionMinutes,
        }
      : undefined,
    domains: bundle.domains.map((domain) => ({
      id: domain.id,
      topics: domain.topics.flatMap((path) => {
        const topic = topics.get(path);
        if (topic === undefined) return [];
        return [
          {
            path,
            title: topic.title,
            lang: topic.lang,
            cards: topic.cards.length,
            due: topic.cards.reduce(
              (sum, id) => sum + (dueByCard.get(id) ?? 0),
              0,
            ),
            points: topic.cards.map((id) => {
              const known = (itemsByCard.get(id) ?? []).flatMap((item) => {
                const r = state.items.get(item)?.retrievability;
                return r === null || r === undefined ? [] : [r];
              });
              return known.length === 0 ? null : mean(known);
            }),
          },
        ];
      }),
    })),
  };
};
