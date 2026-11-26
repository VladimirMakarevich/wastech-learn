import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  LearnError,
  firstIssue,
  reviewEventSchema,
  type ReviewEvent,
} from "@wastech-learn/core";

/**
 * The file an event belongs to: its own device and writer, the month of its timestamp in UTC. One file per
 * writer means two processes never append to the same file, and git merges logs without conflicts.
 */
export const logFileOf = (
  event: Pick<ReviewEvent, "device" | "writer" | "ts">,
): string =>
  `reviews/${event.device}/${event.writer}-${event.ts.slice(0, 7)}.jsonl`;

export interface AppendResult {
  readonly file: string;
  readonly written: number;
  /** Events whose id the file already had: an append is idempotent, so a retry never duplicates. */
  readonly skipped: number;
}

const existingIds = (text: string): Set<string> => {
  const ids = new Set<string>();
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const value: unknown = JSON.parse(line);
      if (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        typeof value.id === "string"
      ) {
        ids.add(value.id);
      }
    } catch {
      // A broken line has no id to compare with; the reader reports it, the writer must not stop on it.
    }
  }
  return ids;
};

const readExisting = async (path: string, file: string): Promise<string> => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return "";
    throw new LearnError(
      "io-failed",
      `Cannot read ${file}`,
      { file },
      { cause: error },
    );
  }
};

/**
 * Appends events to their writers' log files. Every event is validated first; ids already in the file
 * are skipped; each file gets one write of whole lines followed by fsync, so a crash leaves at most a
 * missing tail, never half a line in the middle. Lines are never rewritten.
 */
export const appendReviewEvents = async (
  root: string,
  events: readonly unknown[],
): Promise<readonly AppendResult[]> => {
  const byFile = new Map<string, ReviewEvent[]>();
  for (const raw of events) {
    const parsed = reviewEventSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = firstIssue(parsed.error);
      throw new LearnError(
        "event-invalid",
        `Invalid review event: ${issue.field}: ${issue.message}`,
        {
          field: issue.field,
        },
      );
    }
    const file = logFileOf(parsed.data);
    const batch = byFile.get(file) ?? [];
    batch.push(parsed.data);
    byFile.set(file, batch);
  }
  const results: AppendResult[] = [];
  for (const [file, batch] of [...byFile].sort(([a], [b]) =>
    a.localeCompare(b, "en"),
  )) {
    const path = join(root, file);
    const existing = await readExisting(path, file);
    const seen = existingIds(existing);
    const fresh = batch.filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
    if (fresh.length > 0) {
      // A previous crash may have left the last line without its newline; the next line must not glue onto it.
      const lead = existing !== "" && !existing.endsWith("\n") ? "\n" : "";
      const text =
        lead + fresh.map((event) => `${JSON.stringify(event)}\n`).join("");
      try {
        await mkdir(dirname(path), { recursive: true });
        const handle = await open(path, "a");
        try {
          await handle.write(text);
          await handle.sync();
        } finally {
          await handle.close();
        }
      } catch (error) {
        throw new LearnError(
          "io-failed",
          `Cannot append to ${file}`,
          { file },
          { cause: error },
        );
      }
    }
    results.push({
      file,
      written: fresh.length,
      skipped: batch.length - fresh.length,
    });
  }
  return results;
};
