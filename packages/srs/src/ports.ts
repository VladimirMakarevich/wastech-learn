// The narrow inputs of the scheduler. srs cannot import core, where the schemas live, so it states only
// what it reads; the host passes core's parsed values, which match these shapes structurally, and the
// type checker proves it where the two meet.

export type ReplayEventKind =
  | "review"
  | "practice"
  | "reset"
  | "suspend"
  | "unsuspend"
  | "undo"
  | "manual_due";

export type Rating = 1 | 2 | 3 | 4;

/** One review-log event as the replay needs it. */
export interface ReplayEvent {
  readonly id: string;
  /** ISO-8601 UTC. */
  readonly ts: string;
  readonly kind: ReplayEventKind;
  /** `<cardId>:<variant>`. */
  readonly item: string;
  readonly rating?: Rating | undefined;
  /** Id of the event an `undo` cancels. */
  readonly target?: string | undefined;
  /** New due date of a `manual_due`, ISO-8601 UTC. */
  readonly due?: string | undefined;
}

/** One review item of the content as the queue needs it. */
export interface QueueCard {
  readonly item: string;
  readonly cardId: string;
  /** Cards sharing an idea in a domain are siblings and never come up on the same day. */
  readonly idea?: string | undefined;
  readonly domain: string;
  readonly type: string;
  readonly status: string;
}

export type StepUnit = `${number}m` | `${number}h` | `${number}d`;

export interface DomainLimits {
  readonly newPerDay: number;
  readonly reviewsPerDay: number;
}

/** The scheduling part of `learn.config.json`, already validated by the host. */
export interface SrsConfig {
  readonly timezone: string;
  /** `HH:MM` local time at which a study day begins. */
  readonly dayStartsAt: string;
  readonly srs: {
    readonly scheduler: string;
    readonly model: "FSRS-7" | "FSRS-6";
    readonly desiredRetention: number;
    readonly maxIntervalDays: number;
    readonly learningSteps: readonly StepUnit[];
    readonly relearningSteps: readonly StepUnit[];
    readonly allowModelOverride: boolean;
    readonly graduatingIntervalDays: number;
    readonly fuzz: boolean;
    readonly weights: readonly number[] | null;
  };
  readonly limits: {
    readonly default: DomainLimits;
    readonly domains: Readonly<Record<string, DomainLimits>>;
    readonly sessionMinutes: number;
    readonly pauseNewWhenBacklogOver: number;
  };
  readonly leechThreshold: number;
}

export const limitsFor = (config: SrsConfig, domain: string): DomainLimits =>
  config.limits.domains[domain] ?? config.limits.default;
