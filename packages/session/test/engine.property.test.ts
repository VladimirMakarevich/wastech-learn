import type { ReviewEvent } from "@wastech-learn/core";
import { replay, snapshot } from "@wastech-learn/srs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  bury,
  rate,
  reset,
  startSession,
  suspend,
  undo,
  type SessionState,
  type Transition,
} from "../src/index.js";
import {
  CONFIG,
  NOW,
  at,
  cardIds,
  contextOf,
  deckOf,
  pastReview,
  ulid,
} from "./fixtures.js";

const context = await contextOf({ ...CONFIG, leechThreshold: 2 });
const ids = cardIds(5);
const deck = deckOf([
  ...ids.map((id) => ({ id })),
  { id: "v0000001", variants: ["fwd", "rev"] },
  { id: "n0000001" },
]);
const history: ReviewEvent[] = ids.map((id, index) =>
  pastReview(`${id}:main`, at(-40), 3, ulid(index)),
);

type Step =
  | { readonly kind: "rate"; readonly rating: 1 | 2 | 3 | 4 }
  | { readonly kind: "undo" | "suspend" | "reset" | "bury" };

const stepArb: fc.Arbitrary<Step> = fc.oneof(
  {
    weight: 6,
    arbitrary: fc
      .constantFrom(1, 2, 3, 4)
      .map((rating) => ({ kind: "rate" as const, rating })),
  },
  {
    weight: 1,
    arbitrary: fc
      .constantFrom("undo", "suspend", "reset", "bury")
      .map((kind) => ({ kind })),
  },
);

const run = (
  steps: readonly Step[],
  gapsMs: readonly number[],
): { state: SessionState; written: ReviewEvent[]; end: Date } => {
  let state = startSession(context, {
    deck,
    events: history,
    mode: { kind: "full" },
    now: NOW,
  });
  const written = [...history];
  let now = NOW;
  steps.forEach((step, index) => {
    now = new Date(now.getTime() + (gapsMs[index] ?? 0));
    let transition: Transition;
    switch (step.kind) {
      case "rate":
        transition = rate(context, state, { rating: step.rating }, now);
        break;
      case "undo":
        transition = undo(context, state, now);
        break;
      case "suspend":
        transition = suspend(context, state, now);
        break;
      case "reset":
        transition = reset(context, state, now);
        break;
      case "bury":
        transition = { state: bury(state, now), events: [] };
        break;
    }
    state = transition.state;
    written.push(...transition.events);
  });
  return { state, written, end: now };
};

describe("the session's incremental replay", () => {
  it("equals a full replay of the written log, whatever the learner does", () => {
    fc.assert(
      fc.property(
        fc.array(stepArb, { maxLength: 25 }),
        fc.array(fc.integer({ min: 0, max: 3 * 86_400_000 }), {
          maxLength: 25,
        }),
        (steps, gaps) => {
          const { state, written, end } = run(steps, gaps);
          const full = replay(written, context.scheduler, context.config, end);
          expect(state.log.state.items.size).toBe(full.items.size);
          for (const [item, memory] of full.items) {
            // Untouched items keep the retrievability of the moment they were replayed; the rest is exact.
            expect({
              ...state.log.state.items.get(item),
              retrievability: null,
            }).toEqual({
              ...memory,
              retrievability: null,
            });
            expect(state.log.state.history.get(item)).toEqual(
              full.history.get(item),
            );
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it("is byte-identical to a full replay when time stands still", () => {
    fc.assert(
      fc.property(fc.array(stepArb, { maxLength: 20 }), (steps) => {
        const { state, written } = run(steps, []);
        expect(snapshot(state.log.state)).toBe(
          snapshot(replay(written, context.scheduler, context.config, NOW)),
        );
      }),
      { numRuns: 40 },
    );
  });
});
