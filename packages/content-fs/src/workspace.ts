import { glob, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  buildSearchIndex,
  parseContent,
  type ContentFiles,
  type ContentSearchIndex,
  type LearnConfig,
  type ParsedContent,
  type RandomSource,
} from "@wastech-learn/core";
import { toPosix } from "./fs-utils.js";
import type { Renderer } from "./render.js";
import {
  CONFIG_FILE,
  MDLINT_CONFIG_FILE,
  loadConfig,
  loadContentFiles,
  loadDevice,
} from "./repo.js";
import type { TransactionFs } from "./transaction.js";

/** What a long-running host passes once: the repository and its sources of time and randomness. */
export interface WorkspaceOptions {
  readonly root: string;
  readonly now: () => Date;
  readonly random: RandomSource;
  readonly renderer?: Renderer;
  readonly hostname?: () => string;
  readonly transactionFs?: TransactionFs;
}

/** The repository as it was when the snapshot was taken. */
export interface Snapshot {
  /** Changes whenever a file the snapshot depends on changes on disk. */
  readonly stamp: string;
  readonly config: LearnConfig;
  readonly files: ContentFiles;
  readonly parsed: ParsedContent;
}

/**
 * A content repository held open by a long-running host such as the MCP server. Parsing every file for
 * every call would be wasteful, keeping one parse forever would miss edits made in an editor meanwhile;
 * so each snapshot is keyed by the modification times of the files it was read from and rebuilt as soon
 * as one of them changes. Values derived from a snapshot are cached under the same key.
 */
export interface Workspace {
  readonly root: string;
  readonly options: WorkspaceOptions;
  readonly snapshot: () => Promise<Snapshot>;
  readonly searchIndex: () => Promise<ContentSearchIndex>;
  /** A value computed once per snapshot, such as the findings of the repository as it stands. */
  readonly derived: <Value>(
    key: string,
    compute: (snapshot: Snapshot) => Promise<Value>,
  ) => Promise<Value>;
  readonly device: () => Promise<string>;
  /** Drops the cache after this host wrote, so the next call reads its own writes. */
  readonly invalidate: () => void;
  /**
   * Runs writes one after another. Two writes planned from the same snapshot would each rewrite a shared
   * file such as a topic's `index.md`, and the second would drop the first one's lines; a chat can send
   * tool calls in parallel, so the host queues every write here.
   */
  readonly exclusive: <Value>(task: () => Promise<Value>) => Promise<Value>;
}

// Everything that feeds the model or the linter's view of content; the mdlint corpus outside content/
// (root documents, inbox, journal) is not written by tools and only matters for its own findings.
const STAMP_GLOBS = [
  "content/**/*.{md,mmd,svg}",
  "*.md",
  "inbox/*.md",
  "journal/*.md",
];

const stampOf = async (root: string): Promise<string> => {
  const paths: string[] = [CONFIG_FILE, MDLINT_CONFIG_FILE];
  for (const pattern of STAMP_GLOBS) {
    for await (const path of glob(pattern, { cwd: root }))
      paths.push(toPosix(path));
  }
  paths.sort();
  const parts: string[] = [];
  for (const path of paths) {
    try {
      const info = await stat(join(root, path));
      parts.push(`${path}:${String(info.mtimeMs)}:${String(info.size)}`);
    } catch {
      // A file deleted between listing and stat simply drops out of the stamp; the next stamp sees it gone.
      parts.push(`${path}:-`);
    }
  }
  return parts.join("\n");
};

/**
 * Today's date in the learner's zone, `YYYY-MM-DD`: what `created` and `updated` record. A card captured
 * late in the evening in Warsaw is dated that evening, not the next UTC day.
 */
export const calendarDate = (now: Date, timeZone: string): string => {
  // Assembled from parts: the order and separators of a formatted date depend on the locale data the
  // Node build ships, the parts do not.
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const openWorkspace = (options: WorkspaceOptions): Workspace => {
  const { root } = options;
  let queue: Promise<unknown> = Promise.resolve();
  let current:
    { snapshot: Snapshot; derived: Map<string, Promise<unknown>> } | undefined;

  const snapshot = async (): Promise<Snapshot> => {
    const stamp = await stampOf(root);
    if (current?.snapshot.stamp === stamp) return current.snapshot;
    const config = await loadConfig(root);
    const files = await loadContentFiles(root);
    const parsed = await parseContent(files);
    const fresh: Snapshot = { stamp, config, files, parsed };
    current = { snapshot: fresh, derived: new Map() };
    return fresh;
  };

  const derived = async <Value>(
    key: string,
    compute: (snapshot: Snapshot) => Promise<Value>,
  ): Promise<Value> => {
    const snap = await snapshot();
    const cache =
      current?.snapshot === snap
        ? current.derived
        : new Map<string, Promise<unknown>>();
    const cached = cache.get(key);
    // Each key is computed by one caller with one type; the map only forgets which.
    if (cached !== undefined) return cached as Promise<Value>;
    const value = compute(snap);
    cache.set(key, value);
    // A failed computation must not stay cached: the next call retries it instead of repeating the error.
    void value.catch(() => cache.delete(key));
    return value;
  };

  return {
    root,
    options,
    snapshot,
    derived,
    searchIndex: () =>
      derived("search", (snap) =>
        Promise.resolve(buildSearchIndex(snap.parsed.model)),
      ),
    device: async () => (await loadDevice(root, options.hostname)).device,
    invalidate: () => {
      current = undefined;
    },
    exclusive: <Value>(task: () => Promise<Value>): Promise<Value> => {
      const run = queue.then(task, task);
      // The queue only orders writes; a failed one must not stop those after it.
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
};
