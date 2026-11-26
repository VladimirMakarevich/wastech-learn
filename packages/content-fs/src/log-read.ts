import { glob, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  LearnError,
  parseReviewEvent,
  type ReviewEvent,
} from "@wastech-learn/core";
import { prepareEvents } from "@wastech-learn/srs";
import { toPosix } from "./fs-utils.js";

export type LogFindingCode =
  "log-json-invalid" | "log-event-invalid" | "log-event-version";

/** A log line that could not be read: where it is and why, never what it says. */
export interface LogFinding {
  readonly file: string;
  /** 1-based line number. */
  readonly line: number;
  readonly code: LogFindingCode;
  /** The schema field at fault, for `log-event-invalid`. */
  readonly field?: string;
}

export interface ReviewLog {
  /** Events that shape the schedule: deduplicated, in total order, undone ones removed. */
  readonly events: readonly ReviewEvent[];
  readonly findings: readonly LogFinding[];
}

const LOG_GLOB = "reviews/**/*.jsonl";

/**
 * Reads every writer's log file. A broken line is reported with its file and line instead of being
 * skipped silently, and a line from a newer schema version is reported as such, so a stale framework
 * says "update me" rather than corrupting the schedule.
 */
export const readReviewLog = async (root: string): Promise<ReviewLog> => {
  const files: string[] = [];
  try {
    for await (const path of glob(LOG_GLOB, { cwd: root }))
      files.push(toPosix(path));
  } catch (error) {
    throw new LearnError(
      "io-failed",
      `Cannot list the review log in ${root}`,
      {},
      { cause: error },
    );
  }
  files.sort();
  const events: ReviewEvent[] = [];
  const findings: LogFinding[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = await readFile(join(root, file), "utf8");
    } catch (error) {
      throw new LearnError(
        "io-failed",
        `Cannot read ${file}`,
        { file },
        { cause: error },
      );
    }
    text.split("\n").forEach((raw, index) => {
      const line = index + 1;
      if (raw.trim() === "") return;
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        // A line cut short by a crash or mangled by a bad merge; reported, the rest of the log still counts.
        findings.push({ file, line, code: "log-json-invalid" });
        return;
      }
      const parsed = parseReviewEvent(value);
      if (parsed.ok) events.push(parsed.event);
      else if (parsed.reason === "version-unsupported")
        findings.push({ file, line, code: "log-event-version" });
      else
        findings.push({
          file,
          line,
          code: "log-event-invalid",
          field: parsed.field,
        });
    });
  }
  return { events: prepareEvents(events), findings };
};
