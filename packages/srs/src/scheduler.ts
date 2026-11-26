import { DefaultScheduler, type DefaultSchedulerCard } from "ts-fsrs";
import { SrsError } from "./errors.js";
import type { Rating, SrsConfig } from "./ports.js";

/** The exact scheduler this build replays with; a config naming another version is refused, not guessed. */
export const SCHEDULER_PACKAGE = "ts-fsrs@6.0.1";

/** The memory a ts-fsrs card carries, as far as replay and the queue read it. */
export interface MemoryCard {
  readonly stability: number;
  readonly difficulty: number;
  /** 0 new, 1 learning, 2 review, 3 relearning. */
  readonly state: number;
  readonly dueAt: Date;
  readonly lastReviewAt: Date | null;
  readonly reps: number;
  readonly lapses: number;
  readonly scheduledDays: number;
}

/**
 * The few operations replay needs, over whichever model the config selects. Keeping ts-fsrs behind this
 * seam is what lets a library upgrade touch one file and one replay test.
 */
export interface Scheduler {
  /** `<package>/<model>`, as every event records it in `sched`. */
  readonly sched: string;
  readonly newCard: (item: string, now: Date) => MemoryCard;
  readonly review: (card: MemoryCard, rating: Rating, now: Date) => MemoryCard;
  readonly forget: (card: MemoryCard, now: Date) => MemoryCard;
  readonly retrievability: (card: MemoryCard, now: Date) => number;
}

interface FsrsLike<Card extends MemoryCard> {
  newCard(input: { now: Date; cardId: string }): Card;
  review(input: { card: Card; grade: Rating; now: Date }): { card: Card };
  forget(input: { card: Card; now: Date }): Card;
  readonly chrono: { difference(from: Date, to: Date): number };
  readonly model: { forgettingCurve(card: Card, elapsedDays: number): number };
}

// Only cards this scheduler created come back to it (replay never mixes models), so narrowing the
// public MemoryCard back to the model's own card type is safe at this one seam.
const wrap = <Card extends MemoryCard>(
  fsrs: FsrsLike<Card>,
  sched: string,
): Scheduler => ({
  sched,
  // The card id seeds ts-fsrs's fuzz together with the repetition count, so the same log always lands
  // on the same due dates; the review item is the scheduled unit, so it is the id.
  newCard: (item, now) => fsrs.newCard({ now, cardId: item }),
  review: (card, rating, now) =>
    fsrs.review({ card: card as Card, grade: rating, now }).card,
  forget: (card, now) => fsrs.forget({ card: card as Card, now }),
  retrievability: (card, now) => {
    if (card.lastReviewAt === null) return 0;
    const elapsed = Math.max(0, fsrs.chrono.difference(card.lastReviewAt, now));
    return fsrs.model.forgettingCurve(card as Card, elapsed);
  },
});

/**
 * Creates the scheduler once per process from the validated config. It is asynchronous because ts-fsrs
 * loads its model lazily; everything after it is synchronous and pure.
 */
export const createScheduler = async (
  config: SrsConfig,
): Promise<Scheduler> => {
  const { srs } = config;
  if (srs.scheduler !== SCHEDULER_PACKAGE) {
    throw new SrsError(
      "scheduler-unsupported",
      `learn.config.json asks for ${srs.scheduler}, this build replays with ${SCHEDULER_PACKAGE}`,
    );
  }
  const options = {
    desiredRetention: srs.desiredRetention,
    maximumInterval: srs.maxIntervalDays,
    learningSteps: srs.learningSteps,
    relearningSteps: srs.relearningSteps,
    allowModelOverride: srs.allowModelOverride,
    graduatingInterval: srs.graduatingIntervalDays,
    enableShortTerm: true,
    enableFuzz: srs.fuzz,
    ...(srs.weights === null ? {} : { weights: srs.weights }),
  };
  const sched = `${SCHEDULER_PACKAGE}/${srs.model}`;
  return srs.model === "FSRS-7"
    ? wrap<DefaultSchedulerCard>(
        await DefaultScheduler({ ...options, version: "FSRS-7" }),
        sched,
      )
    : wrap<DefaultSchedulerCard<"FSRS-6">>(
        await DefaultScheduler({ ...options, version: "FSRS-6" }),
        sched,
      );
};
