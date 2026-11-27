import {
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import type { CardEntry, ReviewEvent, TopicMeta } from "@wastech-learn/core";
import {
  bury,
  deckFromBundle,
  isChanged,
  previewCurrent,
  progress,
  rate,
  refresh,
  reset,
  startSession,
  suggestRating,
  summarize,
  suspend,
  undo,
  type IntervalPreview,
  type SessionContext,
  type SessionMode,
  type SessionState,
  type SessionSummary,
  type Transition,
} from "@wastech-learn/session";
import {
  DEFAULT_ESTIMATES,
  estimateFor,
  type Rating,
} from "@wastech-learn/srs";
import { AppData } from "../data/app-data";
import { Clock } from "../data/clock";

export type Phase = "question" | "answer";
export type Confidence = 1 | 2 | 3;

/** A browser's cryptographic source, in [0, 1): event ids from different tabs and devices never collide. */
const cryptoRandom = (): number =>
  (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32;

/** What a transition did, for the screen to say it in a toast. */
export type Notice = "undone" | "suspended" | "buried" | "leech" | "reset";

/**
 * The review session of the app as signals over the pure session engine. It feeds the engine the bundle,
 * the log and the clock, hands the events it returns to the review store, and keeps what only the screen
 * needs: the phase, the confidence picked before the answer and the ticked rubric.
 */
@Injectable({ providedIn: "root" })
export class ReviewSession {
  private readonly data = inject(AppData);
  private readonly clock = inject(Clock);

  readonly state = signal<SessionState | undefined>(undefined);
  readonly phase = signal<Phase>("question");
  readonly confidence = signal<Confidence | undefined>(undefined);
  readonly marks = signal<readonly boolean[]>([]);
  /** When the card on screen appeared: the answer time, and the moment the button intervals refer to. */
  readonly shownAt = signal(0);
  readonly notice = signal<{
    readonly kind: Notice;
    readonly at: number;
  } | null>(null);
  /** The summary of the session that ended last, for the end screen. */
  readonly summary = signal<SessionSummary | undefined>(undefined);
  /**
   * The session that just ended, kept until the next one starts: the last card's rating ends the session at
   * once, and the learner must still be able to take that rating back.
   */
  private readonly ended = signal<SessionState | undefined>(undefined);
  readonly canUndoEnded = computed(
    () => (this.ended()?.answers.length ?? 0) > 0,
  );
  /** When the answer was shown: the end of recall, which the rubric's pace measures. */
  private readonly revealedAt = signal<number | undefined>(undefined);

  readonly context = computed((): SessionContext | undefined => {
    const replay = this.data.context();
    const status = this.data.status();
    if (replay === undefined || status === undefined) return undefined;
    return {
      ...replay,
      origin: {
        device: status.device,
        writer: "web",
        timezone: status.config.timezone,
        sched: replay.scheduler.sched,
        random: cryptoRandom,
      },
    };
  });

  private readonly cards = computed(
    () =>
      new Map((this.data.bundle()?.cards ?? []).map((card) => [card.id, card])),
  );
  private readonly topics = computed(
    () =>
      new Map(
        (this.data.bundle()?.topics ?? []).map((topic) => [topic.path, topic]),
      ),
  );

  readonly active = computed(() => this.state() !== undefined);
  readonly current = computed(() => this.state()?.current);
  readonly card = computed((): CardEntry | undefined => {
    const entry = this.current();
    return entry === undefined ? undefined : this.cards().get(entry.cardId);
  });
  readonly variant = computed(() => {
    const item = this.current()?.item ?? "";
    return item.slice(item.indexOf(":") + 1);
  });
  readonly topic = computed((): TopicMeta | undefined => {
    const card = this.card();
    return card === undefined ? undefined : this.topics().get(card.topic);
  });
  readonly progress = computed(() => {
    const state = this.state();
    return state === undefined ? { done: 0, total: 0 } : progress(state);
  });
  readonly changed = computed(() => {
    const state = this.state();
    const entry = this.current();
    return (
      state !== undefined && entry !== undefined && isChanged(state, entry.item)
    );
  });
  readonly memory = computed(() =>
    this.state()?.log.state.items.get(this.current()?.item ?? ""),
  );

  readonly preview = computed((): readonly IntervalPreview[] => {
    const context = this.context();
    const state = this.state();
    if (context === undefined || state === undefined) return [];
    return previewCurrent(context, state, new Date(this.shownAt()));
  });

  /** The rating the ticked rubric suggests, once the answer is shown; `undefined` for a card without one. */
  readonly suggested = computed((): Rating | undefined => {
    const card = this.card();
    if (
      card === undefined ||
      card.rubric.length === 0 ||
      this.phase() !== "answer"
    )
      return undefined;
    const estimateMs =
      this.current()?.estimateMs ?? estimateFor(DEFAULT_ESTIMATES, card.type);
    // Recall ends when the answer is shown; ticking the rubric afterwards is checking, not remembering.
    const recalledAt = this.revealedAt() ?? this.shownAt();
    return suggestRating(
      card.rubric,
      this.marks().map((mark) => (mark ? "yes" : "no")),
      { durMs: recalledAt - this.shownAt(), estimateMs },
    );
  });

  /** Minutes the rest of the session takes at the estimate of each card type. */
  readonly minutesLeft = computed(() => {
    const state = this.state();
    if (state === undefined) return 0;
    const entries = [
      ...(state.current === undefined ? [] : [state.current]),
      ...state.queue,
      ...state.pending.map((step) => step.entry),
    ];
    return Math.ceil(
      entries.reduce((sum, entry) => sum + entry.estimateMs, 0) / 60_000,
    );
  });

  constructor() {
    // An edit in VS Code, a pull or another writer's events: the engine replays the log again and keeps the
    // card on screen if it can still be asked.
    effect(() => {
      const bundle = this.data.bundle();
      this.data.externalRevision();
      untracked(() => {
        const state = this.state();
        const context = this.context();
        if (
          state === undefined ||
          context === undefined ||
          bundle === undefined
        )
          return;
        const before = state.current?.item;
        const next = refresh(
          context,
          state,
          { deck: deckFromBundle(bundle), events: this.data.events() },
          this.clock.now(),
        );
        this.state.set(next);
        if (next.current?.item !== before) this.showNext();
      });
    });
  }

  /** Starts a session over the day's queue; `false` while the content, the log or the scheduler is loading. */
  start(mode: SessionMode): boolean {
    const context = this.context();
    const bundle = this.data.bundle();
    if (
      context === undefined ||
      bundle === undefined ||
      !this.data.eventsLoaded()
    )
      return false;
    this.summary.set(undefined);
    this.ended.set(undefined);
    this.state.set(
      startSession(context, {
        deck: deckFromBundle(bundle),
        events: this.data.events(),
        mode,
        now: this.clock.now(),
      }),
    );
    this.showNext();
    return true;
  }

  reveal(): void {
    if (this.current() === undefined || this.phase() === "answer") return;
    this.revealedAt.set(this.clock.now().getTime());
    this.phase.set("answer");
  }

  setConfidence(confidence: Confidence | undefined): void {
    if (this.phase() === "question") this.confidence.set(confidence);
  }

  toggleMark(index: number): void {
    this.marks.update((marks) =>
      marks.map((mark, at) => (at === index ? !mark : mark)),
    );
  }

  rate(rating: Rating): void {
    const state = this.state();
    if (state?.current === undefined || this.phase() !== "answer") return;
    const now = this.clock.now();
    this.apply((context) =>
      rate(
        context,
        state,
        {
          rating,
          confidence: this.confidence(),
          durMs: now.getTime() - this.shownAt(),
        },
        now,
      ),
    );
  }

  undo(): void {
    if ((this.state()?.answers.length ?? 0) === 0) return;
    this.apply((context, state, now) => undo(context, state, now), "undone");
  }

  suspend(): void {
    this.apply(
      (context, state, now) => suspend(context, state, now),
      "suspended",
    );
  }

  reset(): void {
    this.apply(
      (context, state, now) => reset(context, state, now),
      "reset",
      false,
    );
  }

  bury(): void {
    const state = this.state();
    if (state?.current === undefined) return;
    this.state.set(bury(state, this.clock.now()));
    this.notify("buried");
    this.showNext();
  }

  /** Ends the session and keeps its summary for the end screen; the log already holds every rating. */
  finish(): SessionSummary | undefined {
    const state = this.state();
    const context = this.context();
    if (state === undefined || context === undefined) return this.summary();
    const summary = summarize(context, state, this.clock.now());
    this.summary.set(summary);
    this.ended.set(state);
    this.state.set(undefined);
    return summary;
  }

  /** Reopens the session that just ended with its last rating taken back; `false` when there is none. */
  undoEnded(): boolean {
    const ended = this.ended();
    if (ended === undefined || ended.answers.length === 0) return false;
    this.ended.set(undefined);
    this.summary.set(undefined);
    this.state.set(ended);
    this.undo();
    return true;
  }

  private apply(
    step: (
      context: SessionContext,
      state: SessionState,
      now: Date,
    ) => Transition,
    notice?: Notice,
    advances = true,
  ): void {
    const context = this.context();
    const state = this.state();
    if (context === undefined || state === undefined) return;
    const { state: next, events } = step(context, state, this.clock.now());
    this.state.set(next);
    void this.data.append(events);
    const leech =
      events.some((event: ReviewEvent) => event.kind === "suspend") &&
      notice === undefined;
    if (notice !== undefined) this.notify(notice);
    else if (leech) this.notify("leech");
    if (advances) this.showNext();
  }

  private notify(kind: Notice): void {
    this.notice.set({ kind, at: this.clock.now().getTime() });
  }

  private showNext(): void {
    this.phase.set("question");
    this.revealedAt.set(undefined);
    this.confidence.set(undefined);
    this.marks.set(this.card()?.rubric.map(() => false) ?? []);
    this.shownAt.set(this.clock.now().getTime());
  }
}
