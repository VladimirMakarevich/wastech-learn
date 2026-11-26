import { createScheduler, replay, type ReplayEvent } from "@wastech-learn/srs";
import { DefaultScheduler } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { previewIntervals } from "../src/index.js";
import { CONFIG, NOW, at } from "./fixtures.js";

const ITEM = "10dkrwp7:main";
const MINUTE_MS = 60_000;

// The same options srs passes to ts-fsrs, written out: the preview is checked against the library itself,
// not against the adapter it is built on.
const directFsrs = () =>
  DefaultScheduler({
    desiredRetention: CONFIG.srs.desiredRetention,
    maximumInterval: CONFIG.srs.maxIntervalDays,
    learningSteps: CONFIG.srs.learningSteps,
    relearningSteps: CONFIG.srs.relearningSteps,
    allowModelOverride: CONFIG.srs.allowModelOverride,
    graduatingInterval: CONFIG.srs.graduatingIntervalDays,
    enableShortTerm: true,
    enableFuzz: CONFIG.srs.fuzz,
    version: "FSRS-7",
  });

describe("interval preview", () => {
  it("a new item gets the due dates ts-fsrs gives each grade", async () => {
    const scheduler = await createScheduler(CONFIG);
    const fsrs = await directFsrs();
    const preview = previewIntervals([], ITEM, scheduler, CONFIG, NOW);
    const card = fsrs.newCard({ now: NOW, cardId: ITEM });
    expect(preview.map((entry) => entry.rating)).toEqual([1, 2, 3, 4]);
    for (const entry of preview) {
      const due = fsrs.review({ card, grade: entry.rating, now: NOW }).card
        .dueAt;
      expect(entry.dueAt).toBe(due.getTime());
      expect(entry.intervalMs).toBe(due.getTime() - NOW.getTime());
    }
    // Again and Hard on a new card are learning steps of minutes, Easy jumps to days.
    expect(preview[0]!.intervalMs).toBeLessThan(15 * MINUTE_MS);
    expect(preview[3]!.intervalMs).toBeGreaterThan(86_400_000);
  });

  it("a reviewed item continues from its own history, other items' events ignored", async () => {
    const scheduler = await createScheduler(CONFIG);
    const fsrs = await directFsrs();
    const history: ReplayEvent[] = [
      {
        id: "E1",
        ts: NOW.toISOString(),
        kind: "review",
        item: ITEM,
        rating: 3,
      },
      {
        id: "E2",
        ts: new Date(NOW.getTime() + 10 * MINUTE_MS).toISOString(),
        kind: "review",
        item: ITEM,
        rating: 3,
      },
      {
        id: "E3",
        ts: NOW.toISOString(),
        kind: "review",
        item: "0d1gjcys:c1",
        rating: 1,
      },
    ];
    const now = at(5);
    let card = fsrs.newCard({ now: NOW, cardId: ITEM });
    for (const event of history.slice(0, 2))
      card = fsrs.review({
        card,
        grade: event.rating!,
        now: new Date(event.ts),
      }).card;
    const preview = previewIntervals(history, ITEM, scheduler, CONFIG, now);
    for (const entry of preview) {
      expect(entry.dueAt).toBe(
        fsrs.review({ card, grade: entry.rating, now }).card.dueAt.getTime(),
      );
    }
    expect(new Set(preview.map((entry) => entry.dueAt)).size).toBe(4);
  });

  it("matches what a recorded rating replays to", async () => {
    const scheduler = await createScheduler(CONFIG);
    const now = at(3);
    const history: ReplayEvent[] = [
      {
        id: "E1",
        ts: NOW.toISOString(),
        kind: "review",
        item: ITEM,
        rating: 4,
      },
    ];
    for (const entry of previewIntervals(
      history,
      ITEM,
      scheduler,
      CONFIG,
      now,
    )) {
      const recorded: ReplayEvent = {
        id: "01KAZZZZZZZZZZZZZZZZZZZZZZ",
        ts: now.toISOString(),
        kind: "review",
        item: ITEM,
        rating: entry.rating,
      };
      const state = replay([...history, recorded], scheduler, CONFIG, now);
      expect(state.items.get(ITEM)?.dueAt).toBe(entry.dueAt);
    }
  });
});
