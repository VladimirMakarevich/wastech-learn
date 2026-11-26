import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReviewEvent } from "@wastech-learn/core";
import { createScheduler, replay } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import {
  appendReviewEvents,
  loadConfig,
  readReviewLog,
  toReplayEvents,
  toSrsConfig,
} from "../src/index.js";
import { GOLDEN, tempDir } from "./helpers.js";

const event = (
  id: string,
  ts: string,
  extra: Partial<ReviewEvent> = {},
): ReviewEvent => ({
  v: 1,
  id,
  ts,
  tz: "Europe/Warsaw",
  device: "desk1",
  writer: "web",
  kind: "review",
  item: "0d1gjcys:main",
  rating: 3,
  durMs: 8000,
  sched: "ts-fsrs@6.0.1/FSRS-7",
  ...extra,
});

const writeLog = async (
  root: string,
  file: string,
  lines: readonly string[],
): Promise<void> => {
  await mkdir(join(root, file, ".."), { recursive: true });
  await writeFile(join(root, file), `${lines.join("\n")}\n`);
};

describe("readReviewLog", () => {
  it("drops a duplicate, reports garbage with its file and line, and orders by time then id", async () => {
    const root = await tempDir();
    const shared = event(
      "01JDX4Q8Z7M2K9V3N5R6T8W1YB",
      "2026-11-25T18:00:00.000Z",
    );
    const late = event(
      "01JDX4Q8Z7M2K9V3N5R6T8W1YC",
      "2026-11-26T18:00:00.000Z",
    );
    const tie = event(
      "01JDX4Q8Z7M2K9V3N5R6T8W1YA",
      "2026-11-25T18:00:00.000Z",
      { item: "10dkrwp7:main" },
    );
    await writeLog(root, "reviews/desk1/web-2026-11.jsonl", [
      JSON.stringify(late),
      JSON.stringify(shared),
    ]);
    await writeLog(root, "reviews/laptop/mcp-2026-11.jsonl", [
      JSON.stringify(shared),
      "{ not json",
      JSON.stringify(tie),
    ]);
    const log = await readReviewLog(root);
    expect(log.events.map((e) => e.id)).toEqual([tie.id, shared.id, late.id]);
    expect(log.findings).toEqual([
      {
        file: "reviews/laptop/mcp-2026-11.jsonl",
        line: 2,
        code: "log-json-invalid",
      },
    ]);
  });

  it("leaves an undone review out of the replay", async () => {
    const root = await tempDir();
    const kept = event(
      "01JDX4Q8Z7M2K9V3N5R6T8W1Y1",
      "2026-11-20T18:00:00.000Z",
    );
    const undone = event(
      "01JDX4Q8Z7M2K9V3N5R6T8W1Y2",
      "2026-11-25T18:00:00.000Z",
      { rating: 1 },
    );
    const undo = event(
      "01JDX4Q8Z7M2K9V3N5R6T8W1Y3",
      "2026-11-25T18:00:04.000Z",
      {
        kind: "undo",
        rating: undefined,
        target: undone.id,
      },
    );
    await writeLog(
      root,
      "reviews/desk1/web-2026-11.jsonl",
      [kept, undone, undo].map((e) => JSON.stringify(e)),
    );
    const log = await readReviewLog(root);
    expect(log.events.map((e) => e.id)).toEqual([kept.id]);

    const config = toSrsConfig(await loadConfig(GOLDEN));
    const scheduler = await createScheduler(config);
    const now = new Date("2026-11-26T00:00:00.000Z");
    const withUndo = replay(toReplayEvents(log.events), scheduler, config, now);
    const onlyKept = replay(toReplayEvents([kept]), scheduler, config, now);
    expect(withUndo.items.get("0d1gjcys:main")).toEqual(
      onlyKept.items.get("0d1gjcys:main"),
    );
  });

  it("reads an event with an unknown optional field and reports one from a newer schema", async () => {
    const root = await tempDir();
    await writeLog(root, "reviews/desk1/web-2026-11.jsonl", [
      JSON.stringify({
        ...event("01JDX4Q8Z7M2K9V3N5R6T8W1Y1", "2026-11-20T18:00:00.000Z"),
        mood: "calm",
      }),
      JSON.stringify({
        ...event("01JDX4Q8Z7M2K9V3N5R6T8W1Y2", "2026-11-21T18:00:00.000Z"),
        v: 2,
      }),
      JSON.stringify({
        ...event("01JDX4Q8Z7M2K9V3N5R6T8W1Y3", "2026-11-22T18:00:00.000Z"),
        rating: 9,
      }),
    ]);
    const log = await readReviewLog(root);
    expect(log.events).toHaveLength(1);
    expect(log.findings).toEqual([
      {
        file: "reviews/desk1/web-2026-11.jsonl",
        line: 2,
        code: "log-event-version",
      },
      {
        file: "reviews/desk1/web-2026-11.jsonl",
        line: 3,
        code: "log-event-invalid",
        field: "rating",
      },
    ]);
  });

  it("finds no events in a repository without a log", async () => {
    expect(await readReviewLog(await tempDir())).toEqual({
      events: [],
      findings: [],
    });
  });
});

describe("appendReviewEvents", () => {
  it("writes an event appended twice only once", async () => {
    const root = await tempDir();
    const once = event(
      "01JDX4Q8Z7M2K9V3N5R6T8W1Y1",
      "2026-11-25T18:00:00.000Z",
    );
    expect(await appendReviewEvents(root, [once])).toEqual([
      { file: "reviews/desk1/web-2026-11.jsonl", written: 1, skipped: 0 },
    ]);
    expect(await appendReviewEvents(root, [once, once])).toEqual([
      { file: "reviews/desk1/web-2026-11.jsonl", written: 0, skipped: 2 },
    ]);
    const text = await readFile(
      join(root, "reviews/desk1/web-2026-11.jsonl"),
      "utf8",
    );
    expect(text.trimEnd().split("\n")).toHaveLength(1);
  });

  it("files events by their writer and the UTC month of their timestamp", async () => {
    const root = await tempDir();
    const results = await appendReviewEvents(root, [
      event("01JDX4Q8Z7M2K9V3N5R6T8W1Y1", "2026-11-30T23:30:00.000Z"),
      event("01JDX4Q8Z7M2K9V3N5R6T8W1Y2", "2026-12-01T00:30:00.000Z", {
        writer: "mcp",
      }),
    ]);
    expect(results.map((result) => result.file)).toEqual([
      "reviews/desk1/mcp-2026-12.jsonl",
      "reviews/desk1/web-2026-11.jsonl",
    ]);
  });

  it("starts on a new line after a torn last line", async () => {
    const root = await tempDir();
    await mkdir(join(root, "reviews/desk1"), { recursive: true });
    await writeFile(
      join(root, "reviews/desk1/web-2026-11.jsonl"),
      '{"v":1,"id":"torn',
    );
    await appendReviewEvents(root, [
      event("01JDX4Q8Z7M2K9V3N5R6T8W1Y1", "2026-11-25T18:00:00.000Z"),
    ]);
    const log = await readReviewLog(root);
    expect(log.events).toHaveLength(1);
    expect(log.findings).toEqual([
      {
        file: "reviews/desk1/web-2026-11.jsonl",
        line: 1,
        code: "log-json-invalid",
      },
    ]);
  });

  it("refuses an invalid event and writes nothing", async () => {
    const root = await tempDir();
    const bad = {
      ...event("01JDX4Q8Z7M2K9V3N5R6T8W1Y1", "2026-11-25T18:00:00.000Z"),
      device: "../x",
    };
    await expect(appendReviewEvents(root, [bad])).rejects.toMatchObject({
      code: "event-invalid",
      field: "device",
    });
    expect(await readReviewLog(root)).toEqual({ events: [], findings: [] });
  });
});
