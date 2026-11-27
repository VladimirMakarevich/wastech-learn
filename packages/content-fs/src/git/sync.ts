import type {
  GitFailure,
  GitFailureCode,
  GitSyncResult,
} from "@wastech-learn/core";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { isSynced } from "./message.js";
import { firstLine, runGit, type GitResult } from "./run.js";
import {
  isIndexLocked,
  isRebasing,
  locateRepository,
  readGitState,
} from "./status.js";

export type SyncOutcome =
  | { readonly ok: true; readonly result: GitSyncResult }
  | { readonly ok: false; readonly failure: GitFailure };

export interface SyncOptions {
  /** Extra environment for every git this operation starts; tests pass an askpass that always fails. */
  readonly env?: Readonly<Record<string, string>>;
  /** The limit for the commands that reach the remote; local steps keep the default. */
  readonly networkTimeoutMs?: number;
}

const fail = (failure: GitFailure): SyncOutcome => ({ ok: false, failure });

// A file named with `*` or `[` is still one file: paths from `git status` are passed as they are.
const LITERAL = { GIT_LITERAL_PATHSPECS: "1" } as const;

const onDisk = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    // Gone from the work tree: the index decides whether `git add` may still name it.
    return false;
  }
};

// Phrases of git and ssh (with LC_ALL=C) that mean the remote could not be reached at all. They are
// checked before the credential phrases: an offline ssh also ends with "could not read from remote".
const OFFLINE_PATTERNS = [
  /could not resolve host/i,
  /connection refused/i,
  /connection timed out/i,
  /network is unreachable/i,
  /no route to host/i,
  /temporary failure in name resolution/i,
];
// Phrases that mean the remote wants credentials the server cannot give.
const AUTH_PATTERNS = [
  /terminal prompts disabled/i,
  /could not read (username|password)/i,
  /authentication failed/i,
  /permission denied/i,
  /host key verification failed/i,
  /could not read from remote repository/i,
];
const IDENTITY_PATTERNS = [
  /please tell me who you are/i,
  /author identity unknown/i,
  /empty ident name/i,
];
const REJECTED_PATTERNS = [/\[rejected\]/, /fetch first/, /non-fast-forward/];

const matches = (result: GitResult, patterns: readonly RegExp[]): boolean =>
  patterns.some((pattern) =>
    pattern.test(`${result.stderr}\n${result.stdout}`),
  );

/**
 * What a failed git means for the owner. Only a command that talked to the remote can be offline or
 * want credentials: a hook printing "permission denied", or a slow local step, is a plain failure.
 */
const failureOf = (
  result: GitResult,
  network = false,
  fallback: GitFailureCode = "git-failed",
): GitFailure => {
  if (network && matches(result, OFFLINE_PATTERNS)) return { code: "offline" };
  if (network && (result.timedOut || matches(result, AUTH_PATTERNS)))
    return { code: "auth-required" };
  if (result.timedOut) return { code: fallback, detail: "timeout" };
  if (result.stderr.includes("index.lock")) return { code: "busy" };
  if (matches(result, IDENTITY_PATTERNS)) return { code: "identity-missing" };
  const detail = firstLine(result.stderr) || firstLine(result.stdout);
  return detail === "" ? { code: fallback } : { code: fallback, detail };
};

/**
 * A runner bound to one repository and one operation's environment. Network commands get batch-mode ssh
 * unless the owner configured an ssh command of their own: a host key prompt or a passphrase without an
 * agent would otherwise wait for a terminal the server does not have.
 */
const gitFor = async (root: string, gitDir: string, options: SyncOptions) => {
  const base = { ...options.env };
  const run = (
    args: readonly string[],
    env: Readonly<Record<string, string>> = {},
    timeoutMs?: number,
  ) =>
    runGit(root, args, {
      env: { ...base, ...env },
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    });
  const ownSsh =
    process.env.GIT_SSH_COMMAND !== undefined ||
    base.GIT_SSH_COMMAND !== undefined ||
    (await run(["config", "--get", "core.sshCommand"])).stdout.trim() !== "";
  const networkEnv: Record<string, string> = ownSsh
    ? {}
    : { GIT_SSH_COMMAND: "ssh -o BatchMode=yes" };
  return {
    run,
    network: (args: readonly string[]) =>
      run(args, networkEnv, options.networkTimeoutMs),
    gitDir,
  };
};

type Git = Awaited<ReturnType<typeof gitFor>>;

const revParse = async (git: Git, ref: string): Promise<string | undefined> => {
  const result = await git.run(["rev-parse", "--verify", "--quiet", ref]);
  return result.exitCode === 0 ? result.stdout.trim() : undefined;
};

const countBetween = async (
  git: Git,
  from: string,
  to: string,
): Promise<number> => {
  const result = await git.run(["rev-list", "--count", `${from}..${to}`]);
  const count = Number(result.stdout.trim());
  return result.exitCode === 0 && Number.isInteger(count) ? count : 0;
};

/** The paths `git add` accepts: present in the work tree, or tracked in the index. */
const knownPaths = async (
  git: Git,
  root: string,
  paths: readonly string[],
): Promise<readonly string[]> => {
  const tracked = await git.run(["ls-files", "-z", "--", ...paths], LITERAL);
  const inIndex = new Set(tracked.stdout.split("\0"));
  const present = await Promise.all(
    paths.map((path) => onDisk(join(root, path))),
  );
  return paths.filter((path, at) => present[at] === true || inIndex.has(path));
};

const conflictedFiles = async (git: Git): Promise<string[]> => {
  const result = await git.run([
    "diff",
    "--name-only",
    "-z",
    "--diff-filter=U",
  ]);
  return result.stdout
    .split("\0")
    .filter((path) => path.length > 0)
    .sort();
};

/** Where the press found the repository: its commit and its index, to put both back on failure. */
interface Checkpoint {
  readonly head: string;
  readonly index: string;
}

const restore = async (git: Git, checkpoint: Checkpoint): Promise<void> => {
  await git.run(["reset", "-q", "--soft", checkpoint.head]);
  await git.run(["read-tree", checkpoint.index]);
};

/**
 * Pulls with rebase over local commits, stashing other uncommitted edits for the time of the rebase.
 * A rebase that stops on a conflict is aborted at once, which also brings the stash back, so no press
 * of a button leaves the repository in the middle of a rebase.
 */
const pullRebase = async (
  git: Git,
  checkpoint: Checkpoint,
): Promise<
  | { readonly ok: true; readonly pulled: number }
  | { readonly ok: false; readonly failure: GitFailure }
> => {
  const before = await revParse(git, "HEAD");
  const pulled = await git.network([
    "pull",
    "--rebase",
    "--autostash",
    "--no-edit",
  ]);
  if (pulled.exitCode !== 0 && (await isRebasing(git.gitDir))) {
    const files = await conflictedFiles(git);
    await git.run(["rebase", "--abort"]);
    await restore(git, checkpoint);
    return { ok: false, failure: { code: "conflict", files } };
  }
  if (pulled.exitCode !== 0) {
    await restore(git, checkpoint);
    return { ok: false, failure: failureOf(pulled, true) };
  }
  // The pull itself finished, but the edits set aside for it did not go back cleanly: they wait in the
  // stash, and the conflicting files are named so the owner can settle them in the editor.
  if (
    /autostash resulted in conflicts|changes are safe in the stash/i.test(
      `${pulled.stdout}\n${pulled.stderr}`,
    )
  )
    return {
      ok: false,
      failure: {
        code: "conflict",
        files: await conflictedFiles(git),
        stashKept: true,
      },
    };
  // From the HEAD before the pull, not from the old upstream ref: an editor's background fetch may have
  // moved the ref already, and those commits still arrive only now.
  const after = await revParse(git, "@{upstream}");
  return {
    ok: true,
    pulled:
      before === undefined || after === undefined
        ? 0
        : await countBetween(git, before, after),
  };
};

const prepare = async (
  root: string,
  options: SyncOptions,
): Promise<
  | {
      readonly ok: true;
      readonly git: Git;
      readonly checkpoint: Checkpoint;
      readonly paths: readonly string[];
    }
  | { readonly ok: false; readonly failure: GitFailure }
> => {
  const located = await locateRepository(root);
  if (!located.ok)
    return {
      ok: false,
      failure: { code: "blocked", blocked: { reason: located.reason } },
    };
  if (await isIndexLocked(located.gitDir))
    return { ok: false, failure: { code: "busy" } };
  const state = await readGitState(root);
  if (state.blocked !== undefined)
    return { ok: false, failure: { code: "blocked", blocked: state.blocked } };
  const git = await gitFor(root, located.gitDir, options);
  const head = await revParse(git, "HEAD");
  if (head === undefined) return { ok: false, failure: { code: "git-failed" } };
  const index = await git.run(["write-tree"]);
  if (index.exitCode !== 0) return { ok: false, failure: failureOf(index) };
  const paths = [
    ...new Set(
      state.entries
        .filter(isSynced)
        .flatMap((entry) =>
          entry.from === undefined ? [entry.path] : [entry.path, entry.from],
        ),
    ),
  ].sort();
  return {
    ok: true,
    git,
    checkpoint: { head, index: index.stdout.trim() },
    paths,
  };
};

/**
 * Sync: commits what is not committed under `content/`, `reviews/` and `inbox/` with the owner's message,
 * pulls with rebase and pushes. Only those paths enter the commit, even when the owner staged something
 * else by hand. Any failure before the pull finishes puts the commit and the index back where the press
 * found them. Once the pull brought commits in, undoing it would turn them into edits of the work tree,
 * so a failed push, or edits that wait in the stash, keep the local commit for the next press; the
 * owner's hooks run as they would in a terminal.
 */
export const syncRepository = async (
  root: string,
  message: string,
  options: SyncOptions = {},
): Promise<SyncOutcome> => {
  const prepared = await prepare(root, options);
  if (!prepared.ok) return fail(prepared.failure);
  const { git, checkpoint, paths } = prepared;

  let committed = 0;
  if (paths.length > 0) {
    // A path removed or moved with `git rm` or `git mv` is in neither the index nor the work tree; naming
    // it to `git add` would stop the whole add, while `commit --only` still takes it from HEAD.
    const addable = await knownPaths(git, root, paths);
    const added =
      addable.length === 0
        ? undefined
        : await git.run(["add", "--all", "--", ...addable], LITERAL);
    if (added !== undefined && added.exitCode !== 0) {
      await restore(git, checkpoint);
      return fail(failureOf(added));
    }
    // --only keeps whatever else the owner staged out of this commit; whitespace cleanup keeps a line
    // starting with # instead of dropping it as a comment and leaving an empty message.
    const commit = await git.run(
      [
        "commit",
        "--only",
        "--cleanup=whitespace",
        "-m",
        message,
        "--",
        ...paths,
      ],
      LITERAL,
    );
    if (commit.exitCode !== 0) {
      await restore(git, checkpoint);
      return fail(failureOf(commit));
    }
    committed = 1;
  }

  const pulled = await pullRebase(git, checkpoint);
  if (!pulled.ok) return fail(pulled.failure);

  const upstream = await revParse(git, "@{upstream}");
  const pending =
    upstream === undefined ? 0 : await countBetween(git, upstream, "HEAD");
  if (pending === 0)
    return {
      ok: true,
      result: { committed, pulled: pulled.pulled, pushed: 0 },
    };

  const branch = (
    await git.run(["symbolic-ref", "--short", "HEAD"])
  ).stdout.trim();
  const remote = (
    await git.run(["config", "--get", `branch.${branch}.remote`])
  ).stdout.trim();
  const merge = (
    await git.run(["config", "--get", `branch.${branch}.merge`])
  ).stdout.trim();
  // An explicit target: `push.default` of the owner could otherwise push nothing, or another branch.
  const pushed = await git.network(["push", "--", remote, `HEAD:${merge}`]);
  if (pushed.exitCode !== 0)
    return fail(
      matches(pushed, REJECTED_PATTERNS) && !matches(pushed, AUTH_PATTERNS)
        ? { code: "push-rejected" }
        : failureOf(pushed, true),
    );
  return {
    ok: true,
    result: { committed, pulled: pulled.pulled, pushed: pending },
  };
};

/** Pull: brings the other computer's commits in over local ones, keeping uncommitted edits in place. */
export const pullRepository = async (
  root: string,
  options: SyncOptions = {},
): Promise<SyncOutcome> => {
  const prepared = await prepare(root, options);
  if (!prepared.ok) return fail(prepared.failure);
  const pulled = await pullRebase(prepared.git, prepared.checkpoint);
  if (!pulled.ok) return fail(pulled.failure);
  return {
    ok: true,
    result: { committed: 0, pulled: pulled.pulled, pushed: 0 },
  };
};
