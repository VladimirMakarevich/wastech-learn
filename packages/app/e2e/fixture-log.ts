import {
  appendReviewEvents,
  loadConfig,
  loadContentFiles,
} from "@wastech-learn/content-fs";
import {
  newUlid,
  parseContent,
  type Card,
  type ReviewEvent,
} from "@wastech-learn/core";
import { toSrsConfig } from "@wastech-learn/session";
import {
  createScheduler,
  replay,
  seededRng,
  type Rating,
} from "@wastech-learn/srs";

/** The moment every scenario runs at: the browser clock is pinned here with `page.clock`. */
export const E2E_NOW = new Date("2026-11-26T09:00:00.000Z");

/** What the scenarios need to know about the generated log. */
export interface LogFixture {
  readonly now: string;
  /** A review item past the leech threshold. */
  readonly leech: string;
  /** A review item last answered on a different content hash: its card counts as changed. */
  readonly changed: string;
  /** Review items due at `now`. */
  readonly due: readonly string[];
}

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/**
 * Writes a review log into a golden copy as another device's quiz would have: every active card answered
 * Good forty days ago, so its first variant is overdue now; one card lapsed past the leech threshold; one
 * card answered on an older version of its text. The same seed gives the same log on every run.
 */
export const writeLogFixture = async (root: string): Promise<LogFixture> => {
  const config = await loadConfig(root);
  const srsConfig = toSrsConfig(config);
  const scheduler = await createScheduler(srsConfig);
  const { model } = await parseContent(await loadContentFiles(root));
  const random = seededRng(2026);
  const cards = [...model.cards]
    .filter((card) => card.frontMatter.status === "active")
    .sort((a, b) => a.id.localeCompare(b.id, "en"));
  const [leechCard, changedCard, ...rest] = cards;
  if (leechCard === undefined || changedCard === undefined)
    throw new Error("the golden sample needs at least two active cards");

  const answer = (
    card: Card,
    item: string,
    at: Date,
    rating: Rating,
    contentHash = card.contentHash,
  ): ReviewEvent => ({
    v: 1,
    id: newUlid(at, random),
    ts: at.toISOString(),
    tz: config.timezone,
    device: "laptop",
    writer: "mcp",
    kind: "review",
    item,
    rating,
    aiSuggested: null,
    grader: "self",
    confidence: null,
    durMs: 9_000,
    contentHash,
    sched: scheduler.sched,
  });

  const events: ReviewEvent[] = [];
  const fortyDaysAgo = new Date(E2E_NOW.getTime() - 40 * DAY_MS);
  for (const [index, card] of rest.entries()) {
    const at = new Date(fortyDaysAgo.getTime() + index * MINUTE_MS);
    for (const item of card.items) events.push(answer(card, item, at, 3));
  }
  const changed = changedCard.items[0] ?? "";
  events.push(
    answer(changedCard, changed, fortyDaysAgo, 3, `sha256:${"0".repeat(64)}`),
  );

  // A lapse counts only from the review phase: forget the item when it is due, relearn it a quarter of an
  // hour later, and repeat until the threshold is reached.
  const leech = leechCard.items[0] ?? "";
  const own: ReviewEvent[] = [
    answer(leechCard, leech, new Date(E2E_NOW.getTime() - 300 * DAY_MS), 3),
  ];
  for (let lapse = 0; lapse < config.leechThreshold; lapse++) {
    const state = replay(own, scheduler, srsConfig, E2E_NOW).items.get(leech);
    const forgotten = new Date((state?.dueAt ?? 0) + 60 * MINUTE_MS);
    own.push(answer(leechCard, leech, forgotten, 1));
    own.push(
      answer(
        leechCard,
        leech,
        new Date(forgotten.getTime() + 15 * MINUTE_MS),
        3,
      ),
    );
  }
  events.push(...own);
  if (own.some((event) => Date.parse(event.ts) >= E2E_NOW.getTime()))
    throw new Error("the leech history runs past the fixture's now");

  await appendReviewEvents(root, events);
  const state = replay(events, scheduler, srsConfig, E2E_NOW);
  return {
    now: E2E_NOW.toISOString(),
    leech,
    changed,
    due: [...state.items.values()]
      .filter((item) => item.dueAt !== null && item.dueAt <= E2E_NOW.getTime())
      .map((item) => item.item)
      .sort(),
  };
};
