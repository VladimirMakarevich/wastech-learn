import { glob, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  LearnError,
  newUlid,
  promptMarkdown,
  revealFor,
  type Card,
  type LearnConfig,
  type QuizNextInput,
  type RecordReviewInput,
  type ReviewEvent,
  type RevealInput,
} from "@wastech-learn/core";
import {
  buildQueue,
  createScheduler,
  estimateDurations,
  prepareEvents,
  replay,
  type EntryKind,
  type ItemState,
  type QueueCard,
  type ReplayState,
  type Scheduler,
} from "@wastech-learn/srs";
import { isMissing, toPosix } from "./fs-utils.js";
import { toQueueCards, toReplayEvents, toSrsConfig } from "./load.js";
import { appendReviewEvents, logFileOf } from "./log-append.js";
import { readReviewLog } from "./log-read.js";
import type { Snapshot, Workspace } from "./workspace.js";

/** The writer name of events recorded through MCP: its own log file per device and month. */
export const MCP_WRITER = "mcp";

export interface QueueStatus {
  /** Learning steps and reviews due now. */
  readonly due: number;
  readonly new: number;
  readonly backlog: number;
  readonly estimateMinutes: number;
  readonly sessionMinutes: number;
  /** Domains whose new cards are paused because their backlog is too large. */
  readonly newPaused: readonly string[];
}

export interface QuizItem {
  readonly item: string;
  readonly card: string;
  readonly variant: string;
  readonly type: string;
  readonly kind: EntryKind | "practice";
  readonly topic: string;
  readonly lang: string;
  /** Markdown of what is asked; never the answer, the rubric or the explanation. */
  readonly question: string;
}

export interface Revealed {
  readonly item: string;
  readonly answer: string;
  readonly cloze: readonly string[];
  readonly rubric: string | undefined;
  readonly explanation: string | undefined;
  readonly contentHash: string;
}

export interface RecordedReview {
  readonly event: string;
  readonly item: string;
  readonly rating: number;
  /** When the item comes back, ISO-8601 UTC; `null` for a practice answer, which schedules nothing. */
  readonly due: string | null;
  readonly intervalDays: number;
  readonly phase: string;
  readonly lapses: number;
  /** The item reached the leech threshold and was suspended by this call. */
  readonly suspended: boolean;
}

export interface UndoneEvents {
  readonly undone: readonly {
    readonly event: string;
    readonly item: string;
    readonly kind: string;
  }[];
}

export interface Study {
  readonly queueStatus: () => Promise<QueueStatus>;
  readonly next: (input: QuizNextInput) => Promise<readonly QuizItem[]>;
  readonly reveal: (input: RevealInput) => Promise<Revealed>;
  readonly record: (input: RecordReviewInput) => Promise<RecordedReview>;
  readonly undoLast: () => Promise<UndoneEvents>;
}

const LOG_GLOB = "reviews/**/*.jsonl";

const logStamp = async (root: string): Promise<string> => {
  const parts: string[] = [];
  const paths: string[] = [];
  for await (const path of glob(LOG_GLOB, { cwd: root }))
    paths.push(toPosix(path));
  paths.sort();
  for (const path of paths) {
    try {
      const info = await stat(join(root, path));
      parts.push(`${path}:${String(info.mtimeMs)}:${String(info.size)}`);
    } catch (error) {
      // A git checkout can remove a log file between listing and stat; the stamp then records it gone.
      if (!isMissing(error)) throw error;
      parts.push(`${path}:-`);
    }
  }
  return parts.join("\n");
};

const notActive = (item: string): LearnError =>
  new LearnError(
    "item-not-active",
    `${item} is not a review item of an active card`,
    { subject: item },
  );

const cardOfItem = (snapshot: Snapshot, item: string): Card | undefined => {
  const cardId = item.slice(0, item.indexOf(":"));
  const card = snapshot.parsed.model.cards.find(
    (candidate) => candidate.id === cardId,
  );
  return card?.items.includes(item) === true ? card : undefined;
};

const variantOf = (item: string): string => item.slice(item.indexOf(":") + 1);

const inScope = (
  card: Card,
  snapshot: Snapshot,
  scope: QuizNextInput["scope"],
): boolean => {
  if (scope === undefined) return true;
  if (scope.domain !== undefined && card.domain !== scope.domain) return false;
  if (scope.topic !== undefined && card.topic !== scope.topic) return false;
  if (scope.tag !== undefined) {
    const topicTags = snapshot.parsed.model.topics.find(
      (topic) => topic.path === card.topic,
    )?.index.frontMatter.tags;
    if (
      !(card.frontMatter.tags ?? []).includes(scope.tag) &&
      !(topicTags ?? []).includes(scope.tag)
    )
      return false;
  }
  return true;
};

const iso = (epochMs: number | null): string | null =>
  epochMs === null ? null : new Date(epochMs).toISOString();

/**
 * Practice drills whatever is weakest without moving the schedule: reviewed items by ascending
 * retrievability, then items never reviewed, one variant per card so a batch does not ask the same card
 * twice.
 */
const practiceOrder = (
  cards: readonly QueueCard[],
  state: ReplayState,
): readonly QueueCard[] => {
  const seen = new Set<string>();
  return cards
    .filter(
      (card) =>
        card.status === "active" &&
        state.items.get(card.item)?.suspended !== true,
    )
    .map((card) => ({
      card,
      retrievability: state.items.get(card.item)?.retrievability ?? null,
    }))
    .sort(
      (a, b) =>
        (a.retrievability ?? 2) - (b.retrievability ?? 2) ||
        (a.card.item < b.card.item ? -1 : a.card.item > b.card.item ? 1 : 0),
    )
    .map(({ card }) => card)
    .filter((card) => {
      if (seen.has(card.cardId)) return false;
      seen.add(card.cardId);
      return true;
    });
};

/**
 * The quiz over a workspace: what is due, what to ask, the answer after the attempt, and the rating the
 * learner settled on appended to this device's `mcp` log. The log is read once and kept until a file of
 * it changes on disk, and a recorded rating replays only its own review item, so a quiz turn costs
 * milliseconds; a whole replay runs again only when a queue is built.
 */
export const createStudy = (workspace: Workspace): Study => {
  let log: { stamp: string; events: ReviewEvent[] } | undefined;
  let schedulerFor: { key: string; scheduler: Promise<Scheduler> } | undefined;

  const events = async (): Promise<ReviewEvent[]> => {
    const stamp = await logStamp(workspace.root);
    if (log?.stamp !== stamp)
      log = {
        stamp,
        events: [...(await readReviewLog(workspace.root)).events],
      };
    return log.events;
  };

  const scheduler = (config: LearnConfig): Promise<Scheduler> => {
    const key = JSON.stringify(config.srs);
    if (schedulerFor?.key !== key)
      schedulerFor = { key, scheduler: createScheduler(toSrsConfig(config)) };
    return schedulerFor.scheduler;
  };

  const fullState = async (
    snapshot: Snapshot,
    now: Date,
  ): Promise<ReplayState> =>
    replay(
      toReplayEvents(await events()),
      await scheduler(snapshot.config),
      snapshot.config,
      now,
    );

  const itemState = async (
    snapshot: Snapshot,
    item: string,
    now: Date,
    extra: readonly ReviewEvent[] = [],
  ): Promise<ItemState | undefined> => {
    const own = [...(await events()), ...extra].filter(
      (event) => event.item === item,
    );
    return replay(
      toReplayEvents(own),
      await scheduler(snapshot.config),
      snapshot.config,
      now,
    ).items.get(item);
  };

  const append = async (written: readonly ReviewEvent[]): Promise<void> => {
    // Read before appending: afterwards the changed file would trigger a full reload of the log.
    const current = await events();
    const stampBefore = log?.stamp ?? "";
    await appendReviewEvents(workspace.root, written);
    current.push(...written);
    const stampAfter = await logStamp(workspace.root);
    // The cache stays only when nothing but this append changed the log; another writer's lines or a
    // pull in between make the next call read the whole log again.
    const ours = new Set(written.map((event) => logFileOf(event)));
    const others = (stamp: string): string =>
      stamp
        .split("\n")
        .filter((line) => !ours.has(line.slice(0, line.indexOf(":"))))
        .join("\n");
    log =
      others(stampBefore) === others(stampAfter)
        ? { stamp: stampAfter, events: current }
        : undefined;
  };

  const eventBase = async (snapshot: Snapshot, item: string, now: Date) => ({
    v: 1 as const,
    ts: now.toISOString(),
    tz: snapshot.config.timezone,
    device: await workspace.device(),
    writer: MCP_WRITER,
    item,
    sched: (await scheduler(snapshot.config)).sched,
  });

  return {
    queueStatus: async () => {
      const snapshot = await workspace.snapshot();
      const now = workspace.options.now();
      const cards = toQueueCards(snapshot.parsed.model);
      const queue = buildQueue(
        await fullState(snapshot, now),
        cards,
        toSrsConfig(snapshot.config),
        now,
        {
          mode: { kind: "full" },
          estimates: estimateDurations(prepareEvents(await events()), cards),
        },
      );
      const fresh = queue.entries.filter(
        (entry) => entry.kind === "new",
      ).length;
      return {
        due: queue.entries.length - fresh,
        new: fresh,
        backlog: queue.backlog,
        estimateMinutes: queue.estimateMinutes,
        sessionMinutes: snapshot.config.limits.sessionMinutes,
        newPaused: queue.policies
          .filter((policy) => policy.paused)
          .map((policy) => policy.domain),
      };
    },

    next: async (input) => {
      const snapshot = await workspace.snapshot();
      const now = workspace.options.now();
      const scoped = new Set(
        snapshot.parsed.model.cards
          .filter((card) => inScope(card, snapshot, input.scope))
          .map((card) => card.id),
      );
      const all = toQueueCards(snapshot.parsed.model);
      const cards = all.filter((card) => scoped.has(card.cardId));
      const state = await fullState(snapshot, now);
      const picked: {
        readonly item: string;
        readonly kind: QuizItem["kind"];
      }[] =
        input.mode === "practice"
          ? practiceOrder(cards, state).map((card) => ({
              item: card.item,
              kind: "practice",
            }))
          : // The day's queue is built over every card and only then narrowed: limits, the backlog
            // pause and sibling burial are per domain and per day, not per scope a chat asks for.
            buildQueue(state, all, toSrsConfig(snapshot.config), now, {
              mode: { kind: "full" },
              estimates: estimateDurations(prepareEvents(await events()), all),
            })
              .entries.filter((entry) => scoped.has(entry.cardId))
              .map((entry) => ({ item: entry.item, kind: entry.kind }));
      return picked.slice(0, input.limit).flatMap(({ item, kind }) => {
        const card = cardOfItem(snapshot, item);
        if (card === undefined) return [];
        const variant = variantOf(item);
        return [
          {
            item,
            card: card.id,
            variant,
            type: card.frontMatter.type,
            kind,
            topic: card.topic,
            lang: card.lang,
            question: promptMarkdown(card, variant),
          },
        ];
      });
    },

    reveal: async (input) => {
      const snapshot = await workspace.snapshot();
      const card = cardOfItem(snapshot, input.item);
      if (card === undefined) throw notActive(input.item);
      const revealed = revealFor(card, variantOf(input.item));
      return { item: input.item, ...revealed, contentHash: card.contentHash };
    },

    record: async (input) => {
      const snapshot = await workspace.snapshot();
      const card = cardOfItem(snapshot, input.item);
      if (card?.frontMatter.status !== "active") throw notActive(input.item);
      const now = workspace.options.now();
      const { random } = workspace.options;
      const base = await eventBase(snapshot, input.item, now);
      const review: ReviewEvent = {
        ...base,
        id: newUlid(now, random),
        kind: input.mode === "practice" ? "practice" : "review",
        rating: input.rating,
        aiSuggested: input.aiSuggested ?? null,
        grader: input.grader,
        confidence: input.confidence ?? null,
        ...(input.durMs === undefined ? {} : { durMs: input.durMs }),
        contentHash: card.contentHash,
      };
      const before = await itemState(snapshot, input.item, now);
      const after = await itemState(snapshot, input.item, now, [review]);
      // A leech is suspended the moment it crosses the threshold: drilling it again wastes the session,
      // and the learner sees it in the fix list instead. An item already past the threshold, unsuspended
      // after a rewrite, is not suspended again by its next answer.
      const suspend =
        review.kind === "review" &&
        after !== undefined &&
        after.leech &&
        !after.suspended &&
        (before?.lapses ?? 0) < snapshot.config.leechThreshold;
      const written: ReviewEvent[] = suspend
        ? [review, { ...base, id: newUlid(now, random), kind: "suspend" }]
        : [review];
      // One append for the rating and its suspend: both reach the log, or neither does.
      await append(written);
      const state = suspend
        ? await itemState(snapshot, input.item, now)
        : after;
      return {
        event: review.id,
        item: input.item,
        rating: input.rating,
        due: review.kind === "practice" ? null : iso(state?.dueAt ?? null),
        intervalDays: state?.scheduledDays ?? 0,
        phase: state?.phase ?? "new",
        lapses: state?.lapses ?? 0,
        suspended: suspend,
      };
    },

    undoLast: async () => {
      const snapshot = await workspace.snapshot();
      const device = await workspace.device();
      const now = workspace.options.now();
      const own = prepareEvents(await events()).filter(
        (event) => event.writer === MCP_WRITER && event.device === device,
      );
      const last = own.findLast(
        (event) => event.kind === "review" || event.kind === "practice",
      );
      if (last === undefined) {
        throw new LearnError(
          "nothing-to-undo",
          "No review from this device to undo",
          {},
        );
      }
      // The suspend a rating triggered goes with it: undoing the rating alone would leave the item hidden.
      const targets = [
        last,
        ...own.filter(
          (event) =>
            event.kind === "suspend" &&
            event.item === last.item &&
            event.ts === last.ts,
        ),
      ];
      const base = await eventBase(snapshot, last.item, now);
      await append(
        targets.map((target) => ({
          ...base,
          item: target.item,
          id: newUlid(now, workspace.options.random),
          kind: "undo",
          target: target.id,
        })),
      );
      return {
        undone: targets.map((target) => ({
          event: target.id,
          item: target.item,
          kind: target.kind,
        })),
      };
    },
  };
};
