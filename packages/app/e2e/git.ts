import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { contentRoot } from "./content.js";

const exec = promisify(execFile);

// Git for the scenarios and the server reads only the temp repository's config: the owner's signing,
// hooks or default branch must not change what a run does.
export const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

export const git = async (cwd: string, ...args: string[]): Promise<string> =>
  (await exec("git", ["-C", cwd, ...args], { env: GIT_ENV })).stdout;

/**
 * The copy as a real content repository: one commit on `main`, tracking a bare repository next to it on
 * disk, so Sync and Pull run for real and no scenario opens the network.
 */
export const makeRepository = async (
  content: string,
  bare: string,
): Promise<void> => {
  await writeFile(join(content, ".gitignore"), "learn.local.json\n.cache/\n");
  await git(content, "init", "-q", "-b", "main");
  await git(content, "config", "user.name", "e2e");
  await git(content, "config", "user.email", "e2e@example.test");
  await git(content, "add", "--all");
  await git(content, "commit", "-q", "-m", "chore: golden sample");
  await exec("git", ["init", "-q", "--bare", "-b", "main", bare], {
    env: GIT_ENV,
  });
  await git(content, "remote", "add", "origin", bare);
  await git(content, "push", "-q", "-u", "origin", "main");
};

/** The bare repository the served copy tracks, set by the global setup. */
export const bareRoot = (): string => {
  const bare = process.env.E2E_BARE;
  if (bare === undefined) throw new Error("E2E_BARE is not set");
  return bare;
};

/** A fresh clone of the bare repository: the second computer, which commits and pushes on its own. */
export const secondComputer = async (): Promise<string> => {
  const dir = join(
    await mkdtemp(join(tmpdir(), "wastech-learn-laptop-")),
    "laptop",
  );
  await exec("git", ["clone", "-q", bareRoot(), dir], { env: GIT_ENV });
  await git(dir, "config", "user.name", "laptop");
  await git(dir, "config", "user.email", "laptop@example.test");
  return dir;
};

/** Commits and pushes whatever earlier scenarios left, so each one starts from a repository in sync. */
export const settle = async (): Promise<void> => {
  const root = contentRoot();
  await git(root, "add", "--all");
  if ((await git(root, "status", "--porcelain")).trim() !== "")
    await git(root, "commit", "-q", "-m", "chore: settle e2e");
  await git(root, "push", "-q");
};
