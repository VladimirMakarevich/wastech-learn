import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { LearnError, sha256Hex } from "@wastech-learn/core";
import { isMissing } from "./fs-utils.js";

/**
 * Results of writes by request id. It lives in `.cache/`, outside git: losing it only weakens the guard
 * against a retried call, while the content and the log stay whole.
 */
export const REQUESTS_FILE = ".cache/mcp/requests.jsonl";

export interface RequestRecord {
  readonly requestId: string;
  readonly tool: string;
  readonly inputHash: string;
  readonly result: unknown;
  /** When the write happened, ISO-8601 UTC; a record past its tool's lifetime no longer answers. */
  readonly at?: string;
}

export interface RequestCall {
  readonly tool: string;
  readonly requestId: string;
  /** The parsed input; its `requestId` field is left out of the hash. */
  readonly input: Readonly<Record<string, unknown>>;
  readonly now: Date;
  /** How long a repeat counts as a retry of this write; without it, for good. */
  readonly lifetimeMs?: number | undefined;
}

/** What a write reports back: the result to return and whether anything reached the disk. */
export interface WriteOutcome<Result> {
  readonly result: Result;
  readonly written: boolean;
}

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, nested]) => [key, canonical(nested)]),
    );
  }
  return value;
};

/** Hash of a call's input: key order and the request id itself do not change it. */
export const inputHash = async (
  input: Readonly<Record<string, unknown>>,
): Promise<string> => {
  const rest = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "requestId"),
  );
  return sha256Hex(JSON.stringify(canonical(rest)));
};

const isRecord = (value: unknown): value is RequestRecord =>
  typeof value === "object" &&
  value !== null &&
  "requestId" in value &&
  typeof value.requestId === "string" &&
  "tool" in value &&
  typeof value.tool === "string" &&
  "inputHash" in value &&
  typeof value.inputHash === "string" &&
  "result" in value;

const readRecords = async (
  root: string,
): Promise<Map<string, RequestRecord>> => {
  let text: string;
  try {
    text = await readFile(join(root, REQUESTS_FILE), "utf8");
  } catch (error) {
    if (isMissing(error)) return new Map();
    throw new LearnError(
      "io-failed",
      `Cannot read ${REQUESTS_FILE}`,
      { file: REQUESTS_FILE },
      { cause: error },
    );
  }
  const records = new Map<string, RequestRecord>();
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const value: unknown = JSON.parse(line);
      // The latest record of an id wins: an id may be used again once its earlier record expired.
      if (isRecord(value)) records.set(value.requestId, value);
    } catch {
      // A line cut short by a crash is a lost cache entry, not a reason to refuse work.
    }
  }
  return records;
};

const appendRecord = async (
  root: string,
  record: RequestRecord,
): Promise<void> => {
  const path = join(root, REQUESTS_FILE);
  try {
    await mkdir(dirname(path), { recursive: true });
    const handle = await open(path, "a");
    try {
      await handle.write(`${JSON.stringify(record)}\n`);
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    throw new LearnError(
      "io-failed",
      `Cannot write ${REQUESTS_FILE}`,
      { file: REQUESTS_FILE },
      { cause: error },
    );
  }
};

/**
 * Runs a write at most once per request id within the call's lifetime. The same id with the same input
 * returns the first result and writes nothing, even after a restart; the same id with another input is
 * refused, because the caller meant two different writes. Past the lifetime the id is free again: a
 * quiz rating repeated next week is a new rating, not a retry. Only a write that reached the disk is remembered: a call refused
 * for findings can be retried with the same id once its input is fixed.
 *
 * The record is appended after the files are written. A crash between the two leaves files without a
 * record, so a retry would write them again under new ids; the opposite order would leave a record
 * claiming files that do not exist, which is worse for an agent that trusts it.
 */
export const runIdempotent = async <Result>(
  root: string,
  call: RequestCall,
  write: () => Promise<WriteOutcome<Result>>,
): Promise<Result> => {
  const hash = await inputHash(call.input);
  const recorded = (await readRecords(root)).get(call.requestId);
  const expired =
    recorded?.at !== undefined &&
    call.lifetimeMs !== undefined &&
    call.now.getTime() - Date.parse(recorded.at) > call.lifetimeMs;
  const previous = expired ? undefined : recorded;
  if (previous !== undefined) {
    if (previous.tool !== call.tool || previous.inputHash !== hash) {
      throw new LearnError(
        "request-id-reused",
        `requestId ${call.requestId} was used for another call`,
        {
          subject: call.requestId,
        },
      );
    }
    return previous.result as Result;
  }
  const outcome = await write();
  if (outcome.written) {
    try {
      await appendRecord(root, {
        requestId: call.requestId,
        tool: call.tool,
        inputHash: hash,
        result: outcome.result,
        at: call.now.toISOString(),
      });
    } catch {
      // The write itself is on disk. Answering with an error now would tell the chat nothing was
      // written and invite a second, duplicate write; a lost record only weakens the retry guard.
    }
  }
  return outcome.result;
};
