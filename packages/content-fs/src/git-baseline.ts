import { runGit } from "./git/run.js";

// Not a git repository, no commit yet, git missing, or the file is new: there is no previous version to
// compare with, and the large-edit warning simply stays silent.
const git = async (
  root: string,
  args: readonly string[],
): Promise<string | undefined> => {
  const result = await runGit(root, args);
  return result.exitCode === 0 ? result.stdout : undefined;
};

/**
 * Previous text of the content files changed since the last commit, read from `HEAD`. It is the baseline
 * for the large-edit warning: what the author is about to commit compared with what is committed. Paths
 * are relative to `root`, which may sit anywhere inside the git work tree.
 */
export const readGitBaseline = async (
  root: string,
): Promise<ReadonlyMap<string, string>> => {
  const baseline = new Map<string, string>();
  const changed = await git(root, [
    "diff",
    "--name-only",
    // NUL-separated, so git prints every path verbatim instead of quoting unusual characters.
    "-z",
    "--relative",
    "HEAD",
    "--",
    "content",
  ]);
  if (changed === undefined) return baseline;
  const paths = changed
    .split("\0")
    .filter((path) => path.endsWith(".md"))
    .sort();
  for (const path of paths) {
    const text = await git(root, ["show", `HEAD:./${path}`]);
    if (text !== undefined) baseline.set(path, text);
  }
  return baseline;
};
