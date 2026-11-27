import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { gitEnvironment } from "../src/index.js";
import { goldenCopy, tempDir } from "./helpers.js";

const exec = promisify(execFile);

/** Runs git in a test repository and returns its stdout; a failure fails the test. */
export const git = async (
  cwd: string,
  ...args: readonly string[]
): Promise<string> =>
  (await exec("git", ["-C", cwd, ...args], { env: gitEnvironment() })).stdout;

const identify = async (cwd: string, name: string): Promise<void> => {
  await git(cwd, "config", "user.name", name);
  await git(cwd, "config", "user.email", `${name}@example.test`);
};

export interface TestRemote {
  /** A clone of the golden sample with one commit, `main` tracking `origin/main`. */
  readonly root: string;
  /** The bare repository both clones push to: a folder on disk, so no test opens the network. */
  readonly bare: string;
  /** Another clone of the same bare repository, standing for the second computer. */
  readonly clone: () => Promise<string>;
}

/**
 * The golden sample as a git repository with an upstream, the shape a real content repository has.
 * Everything lives in fresh temp folders removed after the test.
 */
export const goldenRemote = async (): Promise<TestRemote> => {
  const root = await goldenCopy();
  const bare = join(await tempDir(), "content.git");
  // As in a real content repository: the device name and the cache stay on this computer.
  await writeFile(join(root, ".gitignore"), "learn.local.json\n.cache/\n");
  await git(root, "init", "-q", "-b", "main");
  await identify(root, "desk1");
  await git(root, "add", "--all");
  await git(root, "commit", "-q", "-m", "chore: golden sample");
  await exec("git", ["init", "-q", "--bare", "-b", "main", bare], {
    env: gitEnvironment(),
  });
  await git(root, "remote", "add", "origin", bare);
  await git(root, "push", "-q", "-u", "origin", "main");
  return {
    root,
    bare,
    clone: async () => {
      const dir = join(await tempDir(), "laptop");
      await exec("git", ["clone", "-q", bare, dir], { env: gitEnvironment() });
      await identify(dir, "laptop");
      return dir;
    },
  };
};
