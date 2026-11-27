import { describe, expect, it } from "vitest";
import {
  comebackDays,
  comebackStatus,
  createScheduler,
  loadForecast,
  replay,
  reviewRecords,
  studyDaysWindow,
  trueRetention,
  type ItemState,
  type ReplayState,
  type ReviewRecord,
} from "../src/index.js";
import { CONFIG, at, card, event, review } from "./fixtures.js";

const scheduler = await createScheduler(CONFIG);
const DAY = 86_400_000;
const MINUTE = 60_000;
// 11:00 in Warsaw (CET): the study day began at 04:00 local, 03:00 UTC.
const NOW = at("2026-11-26T10:00:00.000Z");
const TODAY_START = Date.parse("2026-11-26T03:00:00.000Z");

const record = (
  daysAgo: number,
  rating: ReviewRecord["rating"],
  scheduledDays: number,
  phase: ReviewRecord["phase"] = "review",
): ReviewRecord => ({
  item: "a0000001:main",
  at: NOW.getTime() - daysAgo * DAY,
  rating,
  phase,
  scheduledDays,
});

describe("true retention", () => {
  it("counts only review-phase answers in the window, young below 21 days, mature from 21", () => {
    const records = [
      record(1, 3, 5), // young, passed
      record(2, 1, 10), // young, failed
      record(3, 2, 20), // young, passed (Hard is a recall)
      record(1, 4, 21), // mature, passed
      record(5, 1, 40), // mature, failed
      record(6, 3, 60), // mature, passed
      record(1, 1, 0, "learning"), // a learning step: not memory yet
      record(1, 3, 0, "new"), // a first answer
      record(1, 1, 3, "relearning"), // after a lapse
      record(9, 1, 30), // outside the 7-day window
    ];
    const window = studyDaysWindow(CONFIG, NOW, 7);
    const retention = trueRetention(records, window);
    expect(retention.young).toEqual({ passed: 2, total: 3, rate: 2 / 3 });
    expect(retention.mature).toEqual({ passed: 2, total: 3, rate: 2 / 3 });
    const month = trueRetention(records, studyDaysWindow(CONFIG, NOW, 30));
    expect(month.mature).toEqual({ passed: 2, total: 4, rate: 0.5 });
  });

  it("says nothing rather than 0% when there was nothing to measure", () => {
    expect(trueRetention([], studyDaysWindow(CONFIG, NOW, 7))).toEqual({
      young: { passed: 0, total: 0, rate: null },
      mature: { passed: 0, total: 0, rate: null },
    });
  });

  it("windows start at dayStartsAt in the configured zone, across a DST switch", () => {
    expect(studyDaysWindow(CONFIG, NOW, 1)).toEqual({
      from: TODAY_START,
      until: NOW.getTime(),
    });
    // Warsaw left summer time on 25 October: a week back from the 27th starts at 04:00 CEST, 02:00 UTC.
    const afterSwitch = at("2026-10-27T10:00:00.000Z");
    expect(studyDaysWindow(CONFIG, afterSwitch, 7).from).toBe(
      Date.parse("2026-10-21T02:00:00.000Z"),
    );
    // Before 04:00 local the previous study day is still running.
    const night = at("2026-11-26T02:30:00.000Z");
    expect(studyDaysWindow(CONFIG, night, 1).from).toBe(
      Date.parse("2026-11-25T03:00:00.000Z"),
    );
  });
});

describe("review records", () => {
  it("carry the phase and interval the item had just before each answer", () => {
    const item = "a0000001:main";
    const t0 = "2026-10-01T08:00:00.000Z";
    const t1 = "2026-10-01T08:15:00.000Z";
    const afterStep = replay(
      [review(item, t0, 3)],
      scheduler,
      CONFIG,
      at(t1),
    ).items.get(item)!;
    const graduated = replay(
      [review(item, t0, 3), review(item, t1, 3)],
      scheduler,
      CONFIG,
      at(t1),
    ).items.get(item)!;
    const t2 = new Date(graduated.dueAt! + DAY).toISOString();
    const log = [
      review(item, t0, 3),
      review(item, t1, 3),
      review(item, t2, 1),
      event("practice", item, t2, { rating: 4 }),
    ];
    const records = reviewRecords(log, scheduler, CONFIG, NOW);
    expect(records.map((entry) => [entry.phase, entry.rating])).toEqual([
      ["new", 3],
      [afterStep.phase, 3],
      ["review", 1],
    ]);
    expect(records[2]!.scheduledDays).toBe(graduated.scheduledDays);
    expect(records[2]!.at).toBe(Date.parse(t2));
  });

  it("leave out undone answers and answers after now", () => {
    const item = "a0000001:main";
    const kept = review(item, "2026-11-20T08:00:00.000Z", 3);
    const undone = review(item, "2026-11-21T08:00:00.000Z", 1);
    const undo = event("undo", item, "2026-11-21T08:01:00.000Z", {
      target: undone.id,
    });
    const future = review(item, "2026-12-01T08:00:00.000Z", 4);
    const records = reviewRecords(
      [kept, undone, undo, future],
      scheduler,
      CONFIG,
      NOW,
    );
    expect(records.map((entry) => entry.at)).toEqual([Date.parse(kept.ts)]);
  });
});

const itemState = (
  item: string,
  dueAt: number | null,
  extra: Partial<ItemState> = {},
): ItemState => ({
  item,
  cardId: item.slice(0, item.indexOf(":")),
  variant: item.slice(item.indexOf(":") + 1),
  phase: dueAt === null ? "new" : "review",
  stability: 10,
  difficulty: 5,
  retrievability: 0.9,
  dueAt,
  lastReviewAt: dueAt === null ? null : dueAt - 10 * DAY,
  introducedAt: null,
  scheduledDays: 10,
  reps: 3,
  lapses: 0,
  suspended: false,
  leech: false,
  ...extra,
});

const stateOf = (items: readonly ItemState[]): ReplayState => ({
  now: NOW.getTime(),
  sched: "test",
  items: new Map(items.map((entry) => [entry.item, entry])),
  history: new Map(),
});

describe("load forecast", () => {
  it("buckets due items by study day, overdue into today, with minutes at the learner's pace", () => {
    const state = stateOf([
      itemState("over0001:main", TODAY_START - 5 * DAY),
      itemState("today001:main", NOW.getTime() + 2 * 3_600_000),
      itemState("learn001:main", NOW.getTime() + 10 * MINUTE, {
        phase: "learning",
      }),
      // 03:30 local the next morning still belongs to today's study day.
      itemState("night001:main", Date.parse("2026-11-27T02:30:00.000Z")),
      itemState("tomor001:main", Date.parse("2026-11-27T09:00:00.000Z")),
      itemState("week0001:main", Date.parse("2026-12-02T09:00:00.000Z")),
      itemState("later001:main", Date.parse("2026-12-03T09:00:00.000Z")),
      itemState("susp0001:main", TODAY_START, { suspended: true }),
      // A leech is suspended by the rating that made it one; while it is, it holds no load.
      itemState("leech001:main", TODAY_START, { leech: true, suspended: true }),
      itemState("retir001:main", TODAY_START),
      itemState("gone0001:main", TODAY_START),
      itemState("new00001:main", null),
    ]);
    const cards = [
      card("over0001:main", { type: "scenario" }),
      card("today001:main"),
      card("learn001:main", { type: "why" }),
      card("night001:main"),
      card("tomor001:main", { type: "why" }),
      card("week0001:main"),
      card("later001:main"),
      card("susp0001:main"),
      card("leech001:main"),
      card("retir001:main", { status: "retired" }),
      card("new00001:main"),
    ];
    const forecast = loadForecast(state, cards, CONFIG, NOW, 7);
    expect(forecast.map((day) => day.day.key)).toEqual([
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
    ]);
    expect(forecast.map((day) => day.due)).toEqual([4, 1, 0, 0, 0, 0, 1]);
    // 45 s scenario + 8 s + 20 s why + 8 s = 81 s, rounded up to 2 minutes.
    expect(forecast[0]).toMatchObject({ estimateMs: 81_000, minutes: 2 });
    expect(forecast[1]).toMatchObject({ estimateMs: 20_000, minutes: 1 });
    expect(forecast[2]).toMatchObject({ estimateMs: 0, minutes: 0 });
  });

  it("uses the learner's own medians once there are enough of them", () => {
    const state = stateOf([itemState("today001:main", NOW.getTime())]);
    const [today] = loadForecast(
      state,
      [card("today001:main")],
      CONFIG,
      NOW,
      1,
      { byType: { basic: 30_000 } },
    );
    expect(today).toMatchObject({ due: 1, estimateMs: 30_000, minutes: 1 });
  });
});

describe("comeback", () => {
  const item = "a0000001:main";
  const daysAgo = (days: number): string =>
    new Date(NOW.getTime() - days * DAY).toISOString();

  it("has nothing to say before the first answer", () => {
    expect(comebackStatus([], CONFIG, NOW)).toEqual({
      lastStudyAt: null,
      daysAway: null,
      returning: false,
    });
  });

  it("plans a return only after more than three study days away", () => {
    for (const [days, returning] of [
      [0, false],
      [3, false],
      [4, true],
      [14, true],
    ] as const) {
      const status = comebackStatus(
        [review(item, daysAgo(days), 3)],
        CONFIG,
        NOW,
      );
      expect(status).toEqual({
        lastStudyAt: Date.parse(daysAgo(days)),
        daysAway: days,
        returning,
      });
    }
  });

  it("counts practice, ignores undone answers and anything after now", () => {
    const practice = event("practice", item, daysAgo(2), { rating: 3 });
    const undone = review(item, daysAgo(1), 3);
    const undo = event("undo", item, daysAgo(1), { target: undone.id });
    const future = review(item, "2026-12-30T10:00:00.000Z", 3);
    expect(
      comebackStatus(
        [review(item, daysAgo(20), 3), practice, undone, undo, future],
        CONFIG,
        NOW,
      ),
    ).toMatchObject({ daysAway: 2, returning: false });
  });

  it("measures study days, so 03:30 local belongs to the day before", () => {
    // 03:30 CET on the 22nd is the study day of the 21st: five days before the 26th.
    const status = comebackStatus(
      [review(item, "2026-11-22T02:30:00.000Z", 3)],
      CONFIG,
      NOW,
    );
    expect(status.daysAway).toBe(5);
  });

  it("spreads a backlog over sessions of the configured length", () => {
    expect(comebackDays(45, 15)).toBe(3);
    expect(comebackDays(46, 15)).toBe(4);
    expect(comebackDays(0, 15)).toBe(1);
  });
});
