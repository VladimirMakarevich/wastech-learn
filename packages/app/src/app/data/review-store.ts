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
}

const OUTBOX_KEY = "wastech-learn.outbox";
const FIRST_RETRY_MS = 1_000;
// A server stopped for the night is not worth knocking on every second; half a minute keeps the retry
// cheap and still sends the ratings soon after `serve` starts again.
const MAX_RETRY_MS = 30_000;

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

/**
 * The phase 1 store: events go to the local server, and until it confirms them they wait in memory and in
 * this browser's storage, so a rating survives a stopped server and a closed tab. Sending is serialized:
 * one batch in flight, the rest after it, retried with a growing delay while the server is away. A retry
 * is safe because the server skips an event id it already has.
 */
export const createHttpReviewStore = (
  options: HttpReviewStoreOptions,
): ReviewStore & { readonly flush: () => Promise<void> } => {
  const timers = options.timers ?? browserTimers;
  let outbox = restore(options.store.get(OUTBOX_KEY));
  let sending: Promise<void> | undefined;
  let retry: unknown;
  let retryMs = FIRST_RETRY_MS;
  let offline = false;
  let refused = 0;

  const report = (): void => {
    options.onReport?.({ pending: outbox.length, offline, refused });
  };

  const persist = (): void => {
    options.store.set(OUTBOX_KEY, JSON.stringify(outbox));
  };

  const schedule = (): void => {
    if (retry !== undefined) return;
    retry = timers.set(() => {
      retry = undefined;
      void flush();
    }, retryMs);
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
  };

  /** Sends what is queued; `false` when the server could not be reached and a retry is scheduled. */
  const sendOnce = async (): Promise<boolean> => {
    const batch = outbox;
    try {
      await options.api.append(batch);
      const sent = new Set(batch.map((event) => event.id));
      outbox = outbox.filter((event) => !sent.has(event.id));
      offline = false;
      retryMs = FIRST_RETRY_MS;
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        // The server read the batch and refused it: sending it again would be refused again, and keeping
        // it would block every later rating behind it.
        const dropped = new Set(batch.map((event) => event.id));
        outbox = outbox.filter((event) => !dropped.has(event.id));
        refused += batch.length;
        return true;
      }
      offline = true;
      schedule();
      return false;
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
      const events = await options.api.events();
      const known = new Set(events.map((event) => event.id));
      return [...events, ...outbox.filter((event) => !known.has(event.id))];
    },
    append: (events) => {
      const known = new Set(outbox.map((event) => event.id));
      outbox = [...outbox, ...events.filter((event) => !known.has(event.id))];
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
