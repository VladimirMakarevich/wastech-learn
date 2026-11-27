import { realpath } from "node:fs/promises";
import { basename, dirname, join, sep } from "node:path";
import { LearnError, isLearnError } from "@wastech-learn/core";

/** Repository paths are POSIX in findings, the bundle and the log on every platform, Windows included. */
export const toPosix = (path: string): string =>
  sep === "/" ? path : path.split(sep).join("/");

/** A missing file is often an answer (no SVG yet, no log this month), not a failure. */
export const isMissing = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

/**
 * Runs one file operation and turns a failure into the package's typed error, naming the file, so a
 * host reports "cannot write X" in the reader's language instead of a raw system message.
 */
export const ioStep = async <Value>(
  file: string,
  action: () => Promise<Value>,
): Promise<Value> => {
  try {
    return await action();
  } catch (error) {
    if (isLearnError(error)) throw error;
    throw new LearnError(
      "io-failed",
      `File operation failed on ${file}`,
      { file },
      { cause: error },
    );
  }
};

/**
 * The path without symbolic links, also for a folder not created yet. Paths written into the repository
 * relative to the framework checkout, which is always physical, must start from a physical root too, or
 * a projects folder reached through a link yields a detour such as `../../../data/projects/…`.
 */
export const physicalPath = async (path: string): Promise<string> => {
  try {
    return await realpath(path);
  } catch (error) {
    if (!isMissing(error) || dirname(path) === path) return path;
    return join(await physicalPath(dirname(path)), basename(path));
  }
};
