import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { gitEnvironment } from "@wastech-learn/content-fs";
import { goldenCopy, tempDir } from "./helpers.js";

const exec = promisify(execFile);

export const git = async (
  cwd: string,
  ...args: readonly string[]
): Promise<string> =>
  (await exec("git", ["-C", cwd, ...args], { env: gitEnvironment() })).stdout;

const identify = async (cwd: string, name: string): Promise<void> => {
  await git(cwd, "config", "user.name", name);
  await git(cwd, "config", "user.email", `${name}@example.test`);
};

/**
 * A golden copy committed once and tracking a bare repository in a temp folder, plus a way to clone that
 * bare repository as the second computer. No test opens the network.
 */
export const goldenRemote = async (): Promise<{
  readonly root: string;
  readonly bare: string;
  readonly clone: () => Promise<string>;
}> => {
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
