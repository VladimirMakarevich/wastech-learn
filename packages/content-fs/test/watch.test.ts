import { appendFile, mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  watchRepository,
  type RepositoryChange,
  type RepositoryWatcher,
} from "../src/index.js";
import { goldenCopy } from "./helpers.js";

const DEBOUNCE_MS = 60;
// Long enough for the platform to deliver the events and the debounce to settle on a busy runner.
const SETTLE_MS = 600;

const watchers: RepositoryWatcher[] = [];
afterEach(() => {
  for (const watcher of watchers.splice(0)) watcher.close();
});

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** A watcher over a fresh golden copy that records every notification. */
const watched = async () => {
  const root = await goldenCopy();
  await mkdir(join(root, "reviews", "desk1"), { recursive: true });
  await mkdir(join(root, "reviews", "laptop"), { recursive: true });
  await mkdir(join(root, ".cache"), { recursive: true });
  const changes: RepositoryChange[] = [];
  const errors: unknown[] = [];
  const watcher = watchRepository(root, {
    debounceMs: DEBOUNCE_MS,
    onChange: (change) => changes.push(change),
    onError: (error) => errors.push(error),
  });
  watchers.push(watcher);
  // The recursive watcher sets itself up asynchronously on some platforms.
  await pause(100);
  return { root, watcher, changes, errors };
};

const CARD = "content/architecture/backpressure/cards/10dkrwp7.md";

describe("watching a repository", () => {
  it("reports an edited card as a content change", async () => {
    const { root, changes, errors } = await watched();
    await appendFile(join(root, CARD), "\n");
    await pause(SETTLE_MS);
    expect(changes).toEqual([{ kinds: ["content"], paths: [CARD] }]);
    expect(errors).toEqual([]);
  });

  it("reports another device's log lines and the config", async () => {
    const { root, changes } = await watched();
    await writeFile(join(root, "reviews/laptop/web-2026-11.jsonl"), "{}\n");
    await appendFile(join(root, "learn.config.json"), "\n");
    await pause(SETTLE_MS);
    expect(changes).toEqual([
      {
        kinds: ["reviews", "config"],
        paths: ["learn.config.json", "reviews/laptop/web-2026-11.jsonl"],
      },
    ]);
  });

  it("stays quiet about its own append and speaks up when someone else writes to the log", async () => {
    const { root, watcher, changes } = await watched();
    const file = "reviews/desk1/web-2026-11.jsonl";
    await writeFile(join(root, file), '{"id":"a"}\n');
    watcher.ownAppend(file, (await stat(join(root, file))).size);
    await pause(SETTLE_MS);
    expect(changes).toEqual([]);
    await appendFile(join(root, file), '{"id":"b"}\n');
    await pause(SETTLE_MS);
    expect(changes).toEqual([{ kinds: ["reviews"], paths: [file] }]);
  });

  it("turns a burst of edits into one notification", async () => {
    const { root, changes } = await watched();
    for (let index = 0; index < 5; index++) {
      await appendFile(join(root, CARD), "\n");
      await pause(10);
    }
    await pause(SETTLE_MS);
    expect(changes).toHaveLength(1);
  });

  it("ignores .git, .cache and files outside the repository's parts", async () => {
    const { root, changes } = await watched();
    await writeFile(join(root, ".cache/x.json"), "{}");
    await writeFile(join(root, "notes.txt"), "x");
    await pause(SETTLE_MS);
    expect(changes).toEqual([]);
  });

  it("announces nothing after close", async () => {
    const { root, watcher, changes } = await watched();
    await appendFile(join(root, CARD), "\n");
    watcher.close();
    await pause(SETTLE_MS);
    expect(changes).toEqual([]);
  });
});
