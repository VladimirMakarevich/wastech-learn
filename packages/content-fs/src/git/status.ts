import { stat } from "node:fs/promises";
import { join } from "node:path";
import {
  CARD_ID_PATTERN,
  type GitBlockReason,
  type GitChange,
  type GitEntry,
} from "@wastech-learn/core";
import { runGit } from "./run.js";

/** The branch header of `git status --porcelain=v2 --branch`. */
export interface BranchInfo {
  /** `null` on a detached HEAD. */
  readonly head: string | null;
  readonly upstream: string | null;
  readonly ahead: number;
  readonly behind: number;
}

export interface ParsedStatus {
  readonly branch: BranchInfo;
  readonly entries: readonly GitEntry[];
}

/** Where a repository-relative path belongs, read from its shape alone, so a deleted card is known too. */
export const classifyPath = (
  path: string,
): Pick<GitEntry, "area" | "topic" | "card"> => {
  if (path.startsWith("reviews/")) return { area: "reviews" };
  if (path.startsWith("inbox/")) return { area: "inbox" };
  if (!path.startsWith("content/")) return { area: "other" };
  const parts = path.split("/");
  const [, domain, topic, folder, file] = parts;
  // A file straight under content/ or a domain belongs to no topic, but Sync still commits it with content.
  if (
    domain === undefined ||
    topic === undefined ||
    parts.length < 4 ||
    domain.length === 0 ||
    topic.length === 0
  )
    return { area: "topic" };
  const topicPath = `${domain}/${topic}`;
  const id = file?.endsWith(".md") === true ? file.slice(0, -3) : undefined;
  if (
    parts.length === 5 &&
    folder === "cards" &&
    id !== undefined &&
    CARD_ID_PATTERN.test(id)
  )
    return { area: "card", topic: topicPath, card: id };
  return { area: "topic", topic: topicPath };
};

/**
 * What the owner would see in `git status`, folded into one word: the index and the work tree are both
 * "not committed yet". A file added and then deleted again never existed for the last commit, so it is
 * left out.
 */
const changeOf = (xy: string): GitChange | undefined => {
  const index = xy[0] ?? ".";
  const tree = xy[1] ?? ".";
  if (index === "A" && tree === "D") return undefined;
  if (index === "D" || tree === "D") return "deleted";
  if (index === "A" || index === "C") return "added";
  return "modified";
};

const entry = (path: string, change: GitChange, from?: string): GitEntry => ({
  path,
  change,
  ...classifyPath(path),
  ...(from === undefined ? {} : { from }),
});

const count = (text: string | undefined): number => {
  const value = Number(text?.slice(1));
  return Number.isInteger(value) && value >= 0 ? value : 0;
};

/**
 * Parses the NUL-separated output of `git status --porcelain=v2 --branch -z`. Paths come verbatim, never
 * quoted; a rename's original path is the record after it. Entries are sorted by path so the answer does
 * not depend on the order git walked the tree in.
 */
export const parsePorcelainV2 = (output: string): ParsedStatus => {
  const records = output.split("\0");
  let head: string | null = null;
  let upstream: string | null = null;
  let ahead = 0;
  let behind = 0;
  let diverged = false;
  const entries: GitEntry[] = [];
  for (let at = 0; at < records.length; at += 1) {
    const record = records[at] ?? "";
    if (record.startsWith("# branch.head ")) {
      const name = record.slice("# branch.head ".length);
      head = name === "(detached)" ? null : name;
    } else if (record.startsWith("# branch.upstream "))
      upstream = record.slice("# branch.upstream ".length);
    else if (record.startsWith("# branch.ab ")) {
      diverged = true;
      const [plus, minus] = record.slice("# branch.ab ".length).split(" ");
      ahead = count(plus);
      behind = count(minus);
    } else if (record.startsWith("1 ")) {
      // 1 XY sub mH mI mW hH hI path — the path is the ninth field and may itself contain spaces.
      const fields = record.split(" ");
      const change = changeOf(fields[1] ?? "");
      if (change !== undefined)
        entries.push(entry(fields.slice(8).join(" "), change));
    } else if (record.startsWith("2 ")) {
      // 2 XY sub mH mI mW hH hI Xscore path, then the original path as the next record.
      const fields = record.split(" ");
      const path = fields.slice(9).join(" ");
      const from = records[at + 1] ?? "";
      at += 1;
      const kind = fields[8]?.[0];
      entries.push(
        kind === "C" ? entry(path, "added") : entry(path, "renamed", from),
      );
    } else if (record.startsWith("u ")) {
      // u XY sub m1 m2 m3 mW h1 h2 h3 path: only seen while a merge or rebase is under way.
      entries.push(entry(record.split(" ").slice(10).join(" "), "modified"));
    } else if (record.startsWith("? ")) {
      entries.push(entry(record.slice(2), "untracked"));
    }
  }
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  // An upstream whose remote branch was deleted or renamed gets no divergence line: there is nothing to
  // pull from or push to, which is the same as having no upstream.
  if (!diverged) upstream = null;
  return { branch: { head, upstream, ahead, behind }, entries };
};

/** The repository's state as `GET /api/git` reports it, before the commit message is suggested. */
export interface RepositoryGitState {
  readonly branch: string | null;
  readonly upstream: string | null;
  readonly ahead: number;
  readonly behind: number;
  readonly blocked?: { readonly reason: GitBlockReason };
  readonly entries: readonly GitEntry[];
}

// Each marks an operation the owner started in a terminal and has not finished; a Sync on top of it
// would commit half a merge or rebase.
const OPERATION_MARKERS = [
  "rebase-merge",
  "rebase-apply",
  "MERGE_HEAD",
  "CHERRY_PICK_HEAD",
  "REVERT_HEAD",
];

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    // Missing is the common answer here, and any other failure to stat is treated the same: not marked.
    return false;
  }
};

/** The `.git` folder and the content root's place inside the work tree, or why there is none. */
export const locateRepository = async (
  root: string,
): Promise<
  | { readonly ok: true; readonly gitDir: string; readonly prefix: string }
  | { readonly ok: false; readonly reason: "no-git" | "not-a-repository" }
> => {
  const located = await runGit(root, [
    "rev-parse",
    "--absolute-git-dir",
    "--show-prefix",
  ]);
  if (located.missing) return { ok: false, reason: "no-git" };
  if (located.exitCode !== 0) return { ok: false, reason: "not-a-repository" };
  const [gitDir = "", prefix = ""] = located.stdout.split("\n");
  return { ok: true, gitDir, prefix };
};

/** True while another git process holds the index, such as a commit from a terminal. */
export const isIndexLocked = (gitDir: string): Promise<boolean> =>
  exists(join(gitDir, "index.lock"));

const operationInProgress = async (gitDir: string): Promise<boolean> =>
  (
    await Promise.all(
      OPERATION_MARKERS.map((marker) => exists(join(gitDir, marker))),
    )
  ).some(Boolean);

/** Porcelain paths are relative to the top of the work tree; the app speaks paths relative to `--content`. */
const underPrefix = (
  entries: readonly GitEntry[],
  prefix: string,
): readonly GitEntry[] =>
  prefix === ""
    ? entries
    : entries.map((item) =>
        item.path.startsWith(prefix)
          ? entry(
              item.path.slice(prefix.length),
              item.change,
              item.from?.startsWith(prefix) === true
                ? item.from.slice(prefix.length)
                : item.from,
            )
          : { path: item.path, change: item.change, area: "other" },
      );

const emptyState = (reason: GitBlockReason): RepositoryGitState => ({
  branch: null,
  upstream: null,
  ahead: 0,
  behind: 0,
  blocked: { reason },
  entries: [],
});

/**
 * Reads where the content repository stands: branch, upstream, ahead and behind, the paths not
 * committed, and whether Sync must stay off. `git status` runs without taking optional locks, so a
 * refresh of the app never makes a commit in the owner's terminal fail on `index.lock`.
 */
export const readGitState = async (
  root: string,
): Promise<RepositoryGitState> => {
  const located = await locateRepository(root);
  if (!located.ok) return emptyState(located.reason);
  const [status, busy] = await Promise.all([
    runGit(
      root,
      ["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"],
      { env: { GIT_OPTIONAL_LOCKS: "0" } },
    ),
    operationInProgress(located.gitDir),
  ]);
  if (status.exitCode !== 0) return emptyState("not-a-repository");
  const parsed = parsePorcelainV2(status.stdout);
  const reason: GitBlockReason | undefined = busy
    ? "operation-in-progress"
    : parsed.branch.head === null
      ? "detached"
      : parsed.branch.upstream === null
        ? "no-upstream"
        : undefined;
  return {
    branch: parsed.branch.head,
    upstream: parsed.branch.upstream,
    ahead: parsed.branch.ahead,
    behind: parsed.branch.behind,
    ...(reason === undefined ? {} : { blocked: { reason } }),
    entries: underPrefix(parsed.entries, located.prefix),
  };
};
