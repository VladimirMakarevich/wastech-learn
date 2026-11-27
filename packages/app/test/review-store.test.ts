import type { ReviewEvent } from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import { ApiError, type Api } from "../src/app/data/api";
import {
  createHttpReviewStore,
  type OutboxReport,
  type Timers,
} from "../src/app/data/review-store";
import type { LocalStore } from "../src/app/prefs/local-store";

const event = (n: number): ReviewEvent => ({
  v: 1,
  id: `01KB${String(n).padStart(22, "0")}`,
  ts: "2026-11-26T09:00:00.000Z",
  tz: "Europe/Warsaw",
  device: "desk1",
  writer: "web",
  kind: "review",
  item: "10dkrwp7:main",
  rating: 3,
  confidence: null,
  aiSuggested: null,
  grader: "self",
  contentHash: `sha256:${"a".repeat(64)}`,
  sched: "ts-fsrs@6.0.1/FSRS-7",
});

const memoryStore = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  const store: LocalStore = {
    get: (key) => data.get(key),
    set: (key, value) => data.set(key, value),
  };
  return { store, data };
};

/** Timers the test fires by hand, so a retry happens exactly when the test says. */
const manualTimers = () => {
  const queue: (() => void)[] = [];
  const timers: Timers = {
    set: (callback) => queue.push(callback),
    clear: () => undefined,
  };
  return {
    timers,
    fire: () => {
      for (const callback of queue.splice(0)) callback();
    },
    pending: () => queue.length,
  };
};

/** A server that is up or down at the test's say, and remembers every batch it accepted. */
const fakeServer = () => {
  let up = true;
  const received: string[][] = [];
  const log: ReviewEvent[] = [];
  const api: Api = {
    status: () => Promise.reject(new Error("not used")),
    bundle: () => Promise.reject(new Error("not used")),
    events: () =>
      up
        ? Promise.resolve([...log])
        : Promise.reject(new ApiError("unreachable", 0, "down")),
    append: (events) => {
      if (!up) return Promise.reject(new ApiError("unreachable", 0, "down"));
      received.push(events.map((e) => e.id));
      const known = new Set(log.map((e) => e.id));
      const fresh = events.filter((e) => !known.has(e.id));
      log.push(...fresh);
      return Promise.resolve({
        appended: fresh.length,
        duplicates: events.length - fresh.length,
      });
    },
  };
  return {
    api,
    received,
    log,
    setUp: (value: boolean) => {
      up = value;
    },
  };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The ids in the stored outbox; the storage holds plain JSON, so it is read as unknown. */
const storedIds = (text: string | undefined): string[] => {
  const raw: unknown = JSON.parse(text ?? "[]");
  return Array.isArray(raw)
    ? raw.map((item: unknown) =>
        typeof item === "object" && item !== null && "id" in item
          ? String(item.id)
          : "",
      )
    : [];
};

describe("HttpReviewStore", () => {
  it("sends appended events and leaves nothing waiting", async () => {
    const server = fakeServer();
    const { store, data } = memoryStore();
    const reports: OutboxReport[] = [];
    const reviews = createHttpReviewStore({
      api: server.api,
      store,
      subscribeChanges: () => () => undefined,
      onReport: (report) => reports.push(report),
    });
    await reviews.append([event(1)]);
    await reviews.flush();
    expect(server.received).toEqual([[event(1).id]]);
    expect(storedIds(data.get("wastech-learn.outbox"))).toEqual([]);
    expect(reports.at(-1)).toEqual({ pending: 0, offline: false, refused: 0 });
  });

  it("keeps events in memory and storage while the server is away and sends them once when it is back", async () => {
    const server = fakeServer();
    const { store, data } = memoryStore();
    const clock = manualTimers();
    const reports: OutboxReport[] = [];
    const reviews = createHttpReviewStore({
      api: server.api,
      store,
      timers: clock.timers,
      subscribeChanges: () => () => undefined,
      onReport: (report) => reports.push(report),
    });
    server.setUp(false);
    await reviews.append([event(1)]);
    await reviews.flush();
    await reviews.append([event(2)]);
    await reviews.flush();
    expect(reports.at(-1)).toMatchObject({ pending: 2, offline: true });
    expect(storedIds(data.get("wastech-learn.outbox"))).toEqual([
      event(1).id,
      event(2).id,
    ]);
    expect(clock.pending()).toBe(1);
    server.setUp(true);
    clock.fire();
    await settle();
    await reviews.flush();
    expect(server.log.map((e) => e.id)).toEqual([event(1).id, event(2).id]);
    expect(server.received).toHaveLength(1);
    expect(reports.at(-1)).toEqual({ pending: 0, offline: false, refused: 0 });
  });

  it("picks up the outbox a closed tab left behind and sends it", async () => {
    const server = fakeServer();
    const { store } = memoryStore({
      "wastech-learn.outbox": JSON.stringify([event(7), { broken: true }]),
    });
    const reviews = createHttpReviewStore({
      api: server.api,
      store,
      subscribeChanges: () => () => undefined,
    });
    await reviews.flush();
    expect(server.log.map((e) => e.id)).toEqual([event(7).id]);
  });

  it("drops a batch the server refuses instead of blocking the ratings after it", async () => {
    const { store } = memoryStore();
    const reports: OutboxReport[] = [];
    const reviews = createHttpReviewStore({
      api: {
        ...fakeServer().api,
        append: () =>
          Promise.reject(new ApiError("event-invalid", 400, "refused")),
      },
      store,
      subscribeChanges: () => () => undefined,
      onReport: (report) => reports.push(report),
    });
    await reviews.append([event(1), event(2)]);
    await reviews.flush();
    expect(reports.at(-1)).toEqual({ pending: 0, offline: false, refused: 2 });
  });

  it("loads the server's log with the events still waiting, each once", async () => {
    const server = fakeServer();
    const { store } = memoryStore();
    const reviews = createHttpReviewStore({
      api: server.api,
      store,
      timers: manualTimers().timers,
      subscribeChanges: () => () => undefined,
    });
    await reviews.append([event(1)]);
    await reviews.flush();
    server.setUp(false);
    await reviews.append([event(2)]);
    await reviews.flush();
    server.setUp(true);
    const loaded = await reviews.loadEvents();
    expect(loaded.map((e) => e.id)).toEqual([event(1).id, event(2).id]);
  });

  it("tells the caller about another writer's events and retries the outbox then", async () => {
    const server = fakeServer();
    const { store } = memoryStore();
    let announce: () => void = () => undefined;
    const reviews = createHttpReviewStore({
      api: server.api,
      store,
      timers: manualTimers().timers,
      subscribeChanges: (listener) => {
        announce = listener;
        return () => undefined;
      },
    });
    const heard: number[] = [];
    reviews.onExternalChange(() => heard.push(1));
    server.setUp(false);
    await reviews.append([event(3)]);
    await reviews.flush();
    server.setUp(true);
    announce();
    await settle();
    await reviews.flush();
    expect(heard).toEqual([1]);
    expect(server.log.map((e) => e.id)).toEqual([event(3).id]);
  });
});
