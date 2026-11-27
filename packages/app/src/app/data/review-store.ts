import { parseReviewEvent, type ReviewEvent } from "@wastech-learn/core";
import type { LocalStore } from "../prefs/local-store";
import { ApiError, type Api } from "./api";

/**
 * The only way the UI reads and writes the review log. Phase 1 talks to the local server; a later phase
 * swaps in an outbox on the device that syncs with the cloud, and no screen changes.
 */
export interface ReviewStore {
  /** The whole log as the app should replay it: the server's events and those still waiting to be sent. */
  readonly loadEvents: () => Promise<readonly ReviewEvent[]>;
  /** Queues events and sends them; resolves once they are safe on the device. Idempotent by `event.id`. */
  readonly append: (events: readonly ReviewEvent[]) => Promise<void>;
  /** Another writer, a pull or an edit changed the log; the caller loads it again. */
  readonly onExternalChange: (listener: () => void) => () => void;
}

/** What the HTTP store reports while it sends, for the toast and the status line. */
export interface OutboxReport {
  /** Events not yet confirmed by the server. */
  readonly pending: number;
  /** The last send failed for lack of a server; the events wait and are sent again. */
  readonly offline: boolean;
  /** Events the server refused for good; they are dropped from the outbox. */
  readonly refused: number;
}

export interface Timers {
  readonly set: (callback: () => void, ms: number) => unknown;
  readonly clear: (handle: unknown) => void;
}

export interface HttpReviewStoreOptions {
  readonly api: Api;
  readonly store: LocalStore;
  readonly subscribeChanges: (listener: () => void) => () => void;
  readonly onReport?: (report: OutboxReport) => void;
  readonly timers?: Timers;
  /**
   * The device the server appends for now. Without `learn.local.json` the name follows the hostname, which
   * can change under an open tab; the events waiting then carry the old name and are re-stamped with this.
   */
  readonly currentDevice?: () => Promise<string>;
}

const OUTBOX_KEY = "wastech-learn.outbox";
const FIRST_RETRY_MS = 1_000;
// A server stopped for the night is not worth knocking on every second; half a minute keeps the retry
// cheap and still sends the ratings soon after `serve` starts again.
const MAX_RETRY_MS = 30_000;
// An event is a few hundred bytes, so this many stay far below the server's body limit; a long offline
// stretch then drains batch by batch instead of growing into one request the server never accepts.
export const MAX_BATCH = 200;

const browserTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
};

const restore = (text: string | undefined): ReviewEvent[] => {
  if (text === undefined) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    // A damaged outbox cannot be trusted line by line; starting empty loses at most unsent ratings.
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: unknown) => {
    const parsed = parseReviewEvent(item);
    return parsed.ok ? [parsed.event] : [];
  });
};

const idsOf = (events: readonly ReviewEvent[]): Set<string> =>
  new Set(events.map((event) => event.id));

/**
 * The phase 1 store: events go to the local server, and until it confirms them they wait in memory and in
 * this browser's storage, so a rating survives a stopped server and a closed tab. Sending is serialized:
 * one batch in flight, the rest after it, retried with a growing delay while the server is away. A retry
 * is safe because the server skips an event id it already has.
 *
 * Every tab of the app shares the stored outbox: a tab adopts the events another one left there and keeps
 * them when it writes its own, so two tabs rating offline never overwrite each other's ratings.
 */
export const createHttpReviewStore = (
  options: HttpReviewStoreOptions,
): ReviewStore & { readonly flush: () => Promise<void> } => {
  const timers = options.timers ?? browserTimers;
  let outbox = restore(options.store.get(OUTBOX_KEY));
  // Confirmed or refused here: another tab's stored copy of them must not bring them back.
  const settled = new Set<string>();
  // A load in flight may get an answer that misses what this tab sent meanwhile, so each collects it.
  const loads = new Set<ReviewEvent[]>();
  let sending: Promise<void> | undefined;
  let retry: unknown;
  let retryMs = FIRST_RETRY_MS;
  let batchSize = MAX_BATCH;
  let offline = false;
  let refused = 0;

  const report = (): void => {
    options.onReport?.({ pending: outbox.length, offline, refused });
  };

  const persist = (): void => {
    const own = idsOf(outbox);
    const others = restore(options.store.get(OUTBOX_KEY)).filter(
      (event) => !own.has(event.id) && !settled.has(event.id),
    );
    outbox = [...outbox, ...others];
    options.store.set(OUTBOX_KEY, JSON.stringify(outbox));
  };

  const settle = (events: readonly ReviewEvent[]): void => {
    const done = idsOf(events);
    for (const id of done) settled.add(id);
    outbox = outbox.filter((event) => !done.has(event.id));
  };

  const refuse = (events: readonly ReviewEvent[]): void => {
    settle(events);
    refused += events.length;
  };

  const schedule = (): void => {
    if (retry !== undefined) return;
    retry = timers.set(() => {
      retry = undefined;
      void flush();
    }, retryMs);
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
  };

  const goOffline = (): false => {
    offline = true;
    schedule();
    return false;
  };

  /**
   * The server names this machine differently than the waiting events do. They were never written under
   * either name, so stamping them with the current one keeps every rating; `false` when that cannot help.
   */
  const restamp = async (): Promise<boolean> => {
    if (options.currentDevice === undefined) return false;
    const device = await options.currentDevice();
    if (outbox.every((event) => event.device === device)) return false;
    outbox = outbox.map((event) =>
      event.device === device ? event : { ...event, device },
    );
    return true;
  };

  /** A refusal the server explained: only the named event goes, the rest of the batch is sent again. */
  const refusedPart = (
    error: ApiError,
    batch: readonly ReviewEvent[],
  ): readonly ReviewEvent[] => {
    const named = error.index === undefined ? undefined : batch[error.index];
    return named === undefined ? batch : [named];
  };

  /** Sends one batch; `false` when the server could not be reached and a retry is scheduled. */
  const sendOnce = async (): Promise<boolean> => {
    const batch = outbox.slice(0, batchSize);
    try {
      await options.api.append(batch);
      settle(batch);
      offline = false;
      retryMs = FIRST_RETRY_MS;
      batchSize = MAX_BATCH;
      return true;
    } catch (error) {
      // Only an answer of the server says what to drop; anything else keeps the events for a retry.
      if (!(error instanceof ApiError)) return goOffline();
      if (error.status === 413) {
        // Too large even as one event: nothing smaller can be sent, and keeping it blocks the rest.
        if (batch.length === 1) refuse(batch);
        else batchSize = Math.max(1, Math.floor(batch.length / 2));
        return true;
      }
      if (error.code === "device-not-allowed") {
        try {
          if (await restamp()) return true;
        } catch {
          // The server went away between the refusal and the question; the events wait for the retry.
          return goOffline();
        }
      }
      if (error.status === 400) {
        // The server read the batch and refused it: sending the refused event again would be refused
        // again, and keeping it would block every later rating behind it.
        refuse(refusedPart(error, batch));
        return true;
      }
      return goOffline();
    } finally {
      persist();
      report();
    }
  };

  const flush = (): Promise<void> => {
    sending ??= (async () => {
      try {
        // Events appended while a batch was in flight go out right after it, not after the retry delay.
        while (outbox.length > 0 && (await sendOnce()));
      } finally {
        sending = undefined;
      }
    })();
    return sending;
  };

  if (outbox.length > 0) void flush();

  return {
    loadEvents: async () => {
      // The server may read its files before a batch sent meanwhile is written and answer after the batch
      // left the outbox; everything this tab knew of during the load is added back, so no rating vanishes.
      const known = [...outbox];
      loads.add(known);
      try {
        const events = await options.api.events();
        const merged = new Map(events.map((event) => [event.id, event]));
        for (const event of [...known, ...outbox])
          if (!merged.has(event.id)) merged.set(event.id, event);
        return [...merged.values()];
      } finally {
        loads.delete(known);
      }
    },
    append: (events) => {
      const known = idsOf(outbox);
      const fresh = events.filter((event) => !known.has(event.id));
      outbox = [...outbox, ...fresh];
      for (const load of loads) load.push(...fresh);
      persist();
      report();
      void flush();
      return Promise.resolve();
    },
    onExternalChange: (listener) =>
      options.subscribeChanges(() => {
        // A server that tells us about a change is back: try the outbox now instead of at the next retry.
        if (outbox.length > 0) void flush();
        listener();
      }),
    flush,
  };
};
