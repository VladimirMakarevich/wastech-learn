import { watch, type FSWatcher } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { LearnError } from "@wastech-learn/core";
import { isMissing, toPosix } from "./fs-utils.js";
import { CONFIG_FILE, LOCAL_FILE } from "./repo.js";

/**
 * What changed: the content (cards, topics, diagrams), the review log, the configuration, or any other
 * file of the work tree, which matters only to the git state the app shows.
 */
export type ChangeKind = "content" | "reviews" | "config" | "other";

export interface RepositoryChange {
  readonly kinds: readonly ChangeKind[];
  /** Repository-relative paths, sorted; empty when the platform did not say which file changed. */
  readonly paths: readonly string[];
}

export interface WatchOptions {
  readonly onChange: (change: RepositoryChange) => void;
  readonly onError?: (error: unknown) => void;
  /** How long the files must stay quiet before one notification goes out. */
  readonly debounceMs?: number;
}

export interface RepositoryWatcher {
  /**
   * Records that this process appended to a log file and left it at `size` bytes. A change that finds the
   * file at exactly that size is this process's own write and is not announced: the client already has
   * the event, and a notification would make it replay the whole log for nothing.
   */
  readonly ownAppend: (file: string, size: number) => void;
  /** Stops watching; nothing is announced afterwards. */
  readonly close: () => void;
}

// An editor saves a file as several writes and renames, and a pull touches many files at once; one quiet
// moment of this length turns each burst into a single rebuild.
const DEFAULT_DEBOUNCE_MS = 200;

const IGNORED = [".git/", ".cache/", "node_modules/"];
const KIND_ORDER: readonly ChangeKind[] = [
  "content",
  "reviews",
  "config",
  "other",
];

const kindOf = (path: string): ChangeKind | undefined => {
  if (
    IGNORED.some(
      (prefix) => path.startsWith(prefix) || path === prefix.slice(0, -1),
    )
  )
    return undefined;
  if (path.startsWith("content/")) return "content";
  if (path.startsWith("reviews/") && path.endsWith(".jsonl")) return "reviews";
  if (path === CONFIG_FILE || path === LOCAL_FILE) return "config";
  return "other";
};

const sizeOf = async (path: string): Promise<number | undefined> => {
  try {
    return (await stat(path)).size;
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
};

/**
 * Watches a content repository with the platform's recursive watcher and reports, after a quiet moment,
 * which kinds of files changed: content, the review log, the configuration or another file of the work
 * tree. `.git/`, `.cache/` and `node_modules/` are ignored: their churn says nothing about what the
 * owner has not committed. Appends this process registers with `ownAppend` are left out, so a client is
 * told only about what it does not already know: an edit in VS Code, a pull, another writer's events.
 */
export const watchRepository = (
  root: string,
  options: WatchOptions,
): RepositoryWatcher => {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const own = new Map<string, number>();
  let pending = new Set<string>();
  // The platform may not name the file; the safe answer is "anything may have changed".
  let unnamed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const report = (error: unknown): void => {
    if (!closed) options.onError?.(error);
  };

  const flush = async (): Promise<void> => {
    timer = undefined;
    const paths = [...pending].sort();
    const anything = unnamed;
    pending = new Set();
    unnamed = false;
    const announced: string[] = [];
    for (const path of paths) {
      const expected = own.get(path);
      if (
        expected !== undefined &&
        (await sizeOf(join(root, path))) === expected
      )
        continue;
      announced.push(path);
    }
    if (closed) return;
    const kinds = anything
      ? KIND_ORDER
      : KIND_ORDER.filter((kind) =>
          announced.some((path) => kindOf(path) === kind),
        );
    if (kinds.length > 0) options.onChange({ kinds, paths: announced });
  };

  const schedule = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      flush().catch(report);
    }, debounceMs);
  };

  let watcher: FSWatcher;
  try {
    watcher = watch(root, { recursive: true }, (_event, filename) => {
      if (closed) return;
      if (filename === null) {
        unnamed = true;
        schedule();
        return;
      }
      const path = toPosix(filename);
      if (kindOf(path) === undefined) return;
      pending.add(path);
      schedule();
    });
  } catch (error) {
    throw new LearnError(
      "io-failed",
      `Cannot watch ${root}`,
      { file: root },
      { cause: error },
    );
  }
  watcher.on("error", report);

  return {
    ownAppend: (file, size) => {
      own.set(toPosix(file), size);
    },
    close: () => {
      closed = true;
      if (timer !== undefined) clearTimeout(timer);
      watcher.close();
    },
  };
};
