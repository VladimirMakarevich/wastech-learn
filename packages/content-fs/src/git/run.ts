import { spawn } from "node:child_process";

// Card files are a few kilobytes; the limit only guards against a runaway diff or status listing.
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

/**
 * Long enough for a pull of a year of reviews over a slow link, short enough that a remote which hangs
 * without asking for anything does not keep the app's button spinning forever.
 */
export const GIT_TIMEOUT_MS = 60_000;

/** How one git process ended. A non-zero exit is an answer the caller reads, not an exception. */
export interface GitResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  /** Git is not installed or not on `PATH`. */
  readonly missing: boolean;
  /** Stopped after the timeout: a remote that waits for input the server cannot give. */
  readonly timedOut: boolean;
}

export interface GitRunOptions {
  /** Extra environment, such as an ssh command or, in tests, an askpass helper that always fails. */
  readonly env?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

// Git's messages are parsed for a few known phrases (a conflict, a missing identity); a translated git
// would hide them. Prompts are refused outright: there is no terminal behind the server to type into, so
// git must fail at once instead of waiting for a password until the timeout.
const FIXED_ENV = {
  LC_ALL: "C",
  LANGUAGE: "C",
  GIT_TERMINAL_PROMPT: "0",
} as const;

// Set by git for its hooks and by some editors; inherited, they would point every command at another
// repository or index than the one `-C` names.
const REPOSITORY_ENV = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_PREFIX",
];

/** The environment a git of this repository runs with: the owner's, minus pointers to another repository. */
export const gitEnvironment = (
  extra: Readonly<Record<string, string>> = {},
): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env, ...FIXED_ENV, ...extra };
  for (const name of REPOSITORY_ENV) {
    if (!(name in extra)) Reflect.deleteProperty(env, name);
  }
  return env;
};

const isWindows = process.platform === "win32";

/**
 * Runs git on the repository at `root` with a fixed argument list and no shell: an argument is one argv
 * entry, so text such as a commit message can never become a command, whatever characters it holds.
 * Git runs in a process group of its own, so the timeout stops ssh or a credential helper it started
 * too, instead of waiting for them to let go of the output. Resolves with the exit code and output; it
 * never rejects.
 */
export const runGit = (
  root: string,
  args: readonly string[],
  options: GitRunOptions = {},
): Promise<GitResult> =>
  new Promise((resolve) => {
    const child = spawn("git", ["-C", root, ...args], {
      env: gitEnvironment(options.env),
      stdio: ["ignore", "pipe", "pipe"],
      detached: !isWindows,
      windowsHide: true,
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let size = 0;
    let timedOut = false;
    let settled = false;

    const stopGroup = (): void => {
      try {
        if (!isWindows && child.pid !== undefined)
          process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        // The group is already gone: there is nothing left to stop.
      }
    };

    const finish = (result: Omit<GitResult, "stdout" | "stderr">): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ...result,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      });
    };

    const collect = (into: Buffer[]) => (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) {
        stopGroup();
        return;
      }
      into.push(chunk);
    };
    child.stdout.on("data", collect(out));
    child.stderr.on("data", collect(err));

    const timer = setTimeout(() => {
      timedOut = true;
      stopGroup();
    }, options.timeoutMs ?? GIT_TIMEOUT_MS);

    child.on("error", (error: NodeJS.ErrnoException) => {
      finish({
        exitCode: 1,
        missing: error.code === "ENOENT",
        timedOut: false,
      });
    });
    // `exit`, not `close`: after a timeout a grandchild may still hold the pipes for a moment, and the
    // answer must not wait for it.
    child.on("exit", (code) => {
      if (timedOut) finish({ exitCode: code ?? 1, missing: false, timedOut });
    });
    child.on("close", (code) => {
      finish({ exitCode: code ?? 1, missing: false, timedOut });
    });
  });

/** The first line git printed on failure: enough to say what went wrong without the noise around it. */
export const firstLine = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";
