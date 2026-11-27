import type {
  CardEntry,
  ContentBundle,
  ReviewEvent,
  TopicMeta,
} from "@wastech-learn/core";
import { deckFromBundle } from "@wastech-learn/session";
import { createScheduler, replay, type SrsConfig } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import type { LibrarySnapshot } from "../src/app/data/snapshot";
import { homeModel } from "../src/app/screens/home/home-model";

const CONFIG: SrsConfig = {
  timezone: "Europe/Warsaw",
  dayStartsAt: "04:00",
  srs: {
    scheduler: "ts-fsrs@6.0.1",
    model: "FSRS-7",
    desiredRetention: 0.9,
    maxIntervalDays: 365,
    learningSteps: ["1m", "10m"],
    relearningSteps: ["10m"],
    allowModelOverride: true,
    graduatingIntervalDays: 1,
    fuzz: true,
    weights: null,
  },
  limits: {
    default: { newPerDay: 10, reviewsPerDay: 150 },
    domains: {},
    sessionMinutes: 15,
    pauseNewWhenBacklogOver: 2,
  },
  leechThreshold: 8,
};

const topic = (path: string, cards: string[]): TopicMeta => ({
  path,
  domain: path.split("/")[0] ?? "",
  title: path,
  lang: "en",
  status: "active",
  familiarity: "new",
  created: "2026-11-01",
  tags: [],
  related: [],
  keyIdeaHtml: "",
  summary: [],
  materialsHtml: "",
  cards,
});

const card = (id: string, path: string): CardEntry => ({
  id,
  topic: path,
  domain: path.split("/")[0] ?? "",
  type: "basic",
  status: "active",
  bloom: "remember",
  grading: "self",
  idea: null,
  tags: [],
  created: "2026-11-01",
  lang: "en",
  langPair: null,
  title: id,
  variants: ["main"],
  file: `content/${path}/cards/${id}.md`,
  questionHtml: "",
  reverseHtml: null,
  answerHtml: "",
  rubric: [],
  explanationHtml: "",
  sourcesHtml: "",
  contentHash: "sha256:x",
});

const BUNDLE: ContentBundle = {
  version: 1,
  builtAt: "2026-11-26T00:00:00.000Z",
  domains: [
    { id: "arch", topics: ["arch/flow"] },
    { id: "lang-pl", topics: ["lang-pl/words"] },
  ],
  topics: [
    topic("arch/flow", ["a0000001", "a0000002"]),
    topic("lang-pl/words", ["p0000001"]),
  ],
  cards: [
    card("a0000001", "arch/flow"),
    card("a0000002", "arch/flow"),
    card("p0000001", "lang-pl/words"),
  ],
  assets: {},
};

const review = (item: string, ts: string, id: string): ReviewEvent => ({
  v: 1,
  id,
  ts,
  tz: "Europe/Warsaw",
  device: "d",
  writer: "web",
  kind: "review",
  item,
  rating: 3,
  sched: "ts-fsrs@6.0.1/FSRS-7",
});

const snapshotAt = async (
  now: Date,
  events: ReviewEvent[],
): Promise<LibrarySnapshot> => {
  const scheduler = await createScheduler(CONFIG);
  return {
    now,
    bundle: BUNDLE,
    context: { scheduler, config: CONFIG },
    deck: deckFromBundle(BUNDLE),
    events,
    state: replay(events, scheduler, CONFIG, now),
    estimates: { byType: { basic: 8_000 } },
    answeredHash: new Map(),
  };
};

describe("home model", () => {
  it("counts the day's queue, new cards by domain and what each topic has due", async () => {
    const events = [
      review(
        "a0000001:main",
        "2026-10-01T09:00:00.000Z",
        "01KB0000000000000000000001",
      ),
    ];
    const model = homeModel(
      await snapshotAt(new Date("2026-11-26T09:00:00.000Z"), events),
    );
    expect(
      model.queue.entries.map((entry) => [entry.item, entry.kind]),
    ).toEqual([
      ["a0000001:main", "review"],
      ["a0000002:main", "new"],
      ["p0000001:main", "new"],
    ]);
    expect(model.newByDomain).toEqual([
      { domain: "arch", count: 1 },
      { domain: "lang-pl", count: 1 },
    ]);
    expect(
      model.domains.map((domain) =>
        domain.topics.map((row) => [row.path, row.cards, row.due]),
      ),
    ).toEqual([[["arch/flow", 2, 2]], [["lang-pl/words", 1, 1]]]);
    expect(model.domains[0]?.topics[0]?.points[1]).toBeNull();
    expect(model.forecast).toHaveLength(7);
    expect(model.comeback).toBeDefined();
  });

  it("has no plan to come back before the first answer or right after one", async () => {
    expect(
      homeModel(await snapshotAt(new Date("2026-11-26T09:00:00.000Z"), []))
        .comeback,
    ).toBeUndefined();
    const recent = [
      review(
        "a0000001:main",
        "2026-11-25T09:00:00.000Z",
        "01KB0000000000000000000002",
      ),
    ];
    expect(
      homeModel(await snapshotAt(new Date("2026-11-26T09:00:00.000Z"), recent))
        .comeback,
    ).toBeUndefined();
  });
});
