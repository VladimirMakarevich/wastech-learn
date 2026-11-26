import { lstat, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { LearnError } from "@wastech-learn/core";
import { isMissing, toPosix } from "./fs-utils.js";

/** A path a tool received, checked to stay inside the content repository. */
export interface ConfinedPath {
  readonly absolute: string;
  /** Repository-relative POSIX path, as findings and the model name files. */
  readonly relative: string;
}

const exists = async (path: string): Promise<boolean> => {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
};

const isInside = (root: string, target: string): boolean => {
  const rel = relative(root, target);
  return (
    rel !== "" &&
    rel !== ".." &&
    !rel.startsWith(`..${sep}`) &&
    !isAbsolute(rel)
  );
};

/**
 * Resolves a repository-relative path and refuses anything that leaves the repository: an absolute path,
 * `..` climbing out, or a symbolic link anywhere on the way that points outside. The check runs on the
 * real paths of the deepest part that exists, so a file not written yet is judged by the folder it would
 * land in. A tool takes paths from a chat, and a chat can be talked into anything.
 */
export const confinePath = async (
  root: string,
  path: string,
): Promise<ConfinedPath> => {
  const refuse = (): LearnError =>
    new LearnError("path-outside-content", `${path} is outside ${root}`, {
      subject: path,
    });
  // Backslashes and drive letters would mean another path on Windows than the one checked here.
  if (
    path.includes("\0") ||
    path.includes("\\") ||
    isAbsolute(path) ||
    /^[A-Za-z]:/.test(path)
  ) {
    throw refuse();
  }
  const realRoot = await realpath(root);
  const target = resolve(realRoot, path);
  if (!isInside(realRoot, target)) throw refuse();
  let probe = target;
  for (;;) {
    try {
      const real = await realpath(probe);
      if (real !== realRoot && !isInside(realRoot, real)) throw refuse();
      break;
    } catch (error) {
      if (!isMissing(error)) throw error;
      // A dangling link resolves to nothing, but writing through it would create its target outside.
      if (await exists(probe)) throw refuse();
      probe = dirname(probe);
    }
  }
  return { absolute: target, relative: toPosix(relative(realRoot, target)) };
};
