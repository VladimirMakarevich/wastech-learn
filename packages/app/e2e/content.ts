import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Queue, TrueRetention } from "@wastech-learn/srs";

/** The content copy this run serves; scenarios read its log and edit its files. */
export const contentRoot = (): string => {
  const root = process.env.E2E_CONTENT;
  if (root === undefined) throw new Error("E2E_CONTENT is not set");
  return root;
};

export interface LoggedEvent {
  readonly id: string;
  readonly ts: string;
  readonly kind: string;
  readonly item: string;
  readonly writer: string;
  readonly device: string;
  readonly rating?: number;
  readonly confidence?: number | null;
  readonly durMs?: number;
  readonly contentHash?: string;
  readonly sched: string;
  readonly target?: string;
}

/** Every event the app wrote into this device's web log, in file order. */
export const webEvents = async (): Promise<LoggedEvent[]> => {
  const dir = join(contentRoot(), "reviews", "e2e");
  let files: string[];
  try {
    files = (await readdir(dir))
      .filter((file) => file.startsWith("web-"))
      .sort();
  } catch {
    // No web log yet: the app has not written anything.
    return [];
  }
  const events: LoggedEvent[] = [];
  for (const file of files)
    for (const line of (await readFile(join(dir, file), "utf8")).split("\n"))
      if (line.trim() !== "") events.push(JSON.parse(line) as LoggedEvent);
  return events;
};

/** Edits a file of the copy and hands back a function that puts the old text back. */
export const editFile = async (
  file: string,
  edit: (text: string) => string,
): Promise<() => Promise<void>> => {
  const path = join(contentRoot(), file);
  const before = await readFile(path, "utf8");
  await writeFile(path, edit(before));
  return () => writeFile(path, before);
};

/**
 * The day's queue as srs builds it in Node over the same copy and log, at the moment the page reads its
 * clock: what Home must show.
 */
export const nodeQueue = async (nowMs: number): Promise<Queue> => {
  const { buildBundle, loadConfig, readReviewLog } =
    await import("@wastech-learn/content-fs");
  const { deckFromBundle, toReplayEvents, toSrsConfig } =
    await import("@wastech-learn/session");
  const {
    buildQueue,
    createScheduler,
    estimateDurations,
    prepareEvents,
    replay,
  } = await import("@wastech-learn/srs");
  const root = contentRoot();
  const config = toSrsConfig(await loadConfig(root));
  const built = await buildBundle(root, new Date(nowMs));
  if (!built.ok) throw new Error("the copy does not build");
  const deck = deckFromBundle(built.bundle);
  const { events } = await readReviewLog(root);
  const scheduler = await createScheduler(config);
  const now = new Date(nowMs);
  const state = replay(toReplayEvents(events), scheduler, config, now);
  return buildQueue(state, deck.cards, config, now, {
    mode: { kind: "full" },
    estimates: estimateDurations(prepareEvents(events), deck.cards),
  });
};

/** True retention and the 30-day load as srs counts them in Node, for Stats to match. */
export interface NodeStats {
  readonly week: TrueRetention;
  readonly month: TrueRetention;
  readonly forecast: readonly number[];
}

export const nodeStats = async (nowMs: number): Promise<NodeStats> => {
  const { buildBundle, loadConfig, readReviewLog } =
    await import("@wastech-learn/content-fs");
  const { deckFromBundle, toReplayEvents, toSrsConfig } =
    await import("@wastech-learn/session");
  const srs = await import("@wastech-learn/srs");
  const root = contentRoot();
  const config = toSrsConfig(await loadConfig(root));
  const built = await buildBundle(root, new Date(nowMs));
  if (!built.ok) throw new Error("the copy does not build");
  const deck = deckFromBundle(built.bundle);
  const { events } = await readReviewLog(root);
  const scheduler = await srs.createScheduler(config);
  const now = new Date(nowMs);
  const replayed = toReplayEvents(events);
  const records = srs.reviewRecords(replayed, scheduler, config, now);
  const week = srs.trueRetention(records, srs.studyDaysWindow(config, now, 7));
  const month = srs.trueRetention(
    records,
    srs.studyDaysWindow(config, now, 30),
  );
  const state = srs.replay(replayed, scheduler, config, now);
  const forecast = srs.loadForecast(
    state,
    deck.cards,
    config,
    now,
    30,
    srs.estimateDurations(srs.prepareEvents(events), deck.cards),
  );
  return { week, month, forecast: forecast.map((day) => day.due) };
};
