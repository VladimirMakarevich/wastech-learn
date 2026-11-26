import { sep } from "node:path";

/** Repository paths are POSIX in findings, the bundle and the log on every platform, Windows included. */
export const toPosix = (path: string): string =>
  sep === "/" ? path : path.split(sep).join("/");

/** A missing file is often an answer (no SVG yet, no log this month), not a failure. */
export const isMissing = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";
