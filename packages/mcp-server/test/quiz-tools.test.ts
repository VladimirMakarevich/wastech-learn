import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { readReviewLog } from "@wastech-learn/content-fs";
import { parseReviewEvent } from "@wastech-learn/core";
import { createScheduler, replay, snapshot } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import {
  connect,
  editJson,
  goldenCopy,
  testClock,
  type Session,
} from "./helpers.js";

const DAY = 86_400_000;
const LOG = "reviews/desk1/mcp-2026-11.jsonl";

interface QuizItem {
  item: string;
  card: string;
  kind: string;
  question: string;
}

/** Every line the mcp writer of this device appended, across month files, in file order. */
const logLines = async (
  root: string,
): Promise<{ kind: string; item: string; writer: string }[]> => {
  const dir = join(root, "reviews/desk1");
  const files = (await readdir(dir))
    .filter((name) => name.startsWith("mcp-"))
    .sort();
  const lines: { kind: string; item: string; writer: string }[] = [];
  for (const file of files) {
    for (const line of (await readFile(join(dir, file), "utf8"))
      .trim()
      .split("\n")) {
      lines.push(
        JSON.parse(line) as { kind: string; item: string; writer: string },
      );
    }
  }
  return lines;
};

const items = async (
  session: Session,
  args: Record<string, unknown> = {},
): Promise<QuizItem[]> =>
  (await session.call("quiz_next", args)).body.items as QuizItem[];

const fullState = async (root: string, now: Date) => {
  const config = JSON.parse(
    await readFile(join(root, "learn.config.json"), "utf8"),
  ) as Parameters<typeof createScheduler>[0] & { leechThreshold: number };
  const { events } = await readReviewLog(root);
  return replay(events, await createScheduler(config), config, now);
};

describe("quiz tools", () => {
  it("queue_status reports new cards and minutes on a fresh repository", async () => {
    const session = await connect(await goldenCopy());
    const result = await session.call("queue_status");
    expect(result.body).toMatchObject({
      due: 0,
      backlog: 0,
      sessionMinutes: 15,
      newPaused: [],
    });
    expect(result.body.new).toBeGreaterThan(0);
    expect(result.body.estimateMinutes).toBeGreaterThan(0);
  });

  it("quiz_next returns at most the limit and never the answer, rubric or explanation", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const result = await session.call("quiz_next", { limit: 5 });
    const batch = result.body.items as QuizItem[];
    expect(batch.length).toBeGreaterThan(0);
    expect(batch.length).toBeLessThanOrEqual(5);
    const scenario = await session.call("quiz_next", {
      limit: 10,
      scope: { topic: "dotnet/async-await" },
    });
    const all = [...batch, ...(scenario.body.items as QuizItem[])];
    for (const entry of all) {
      const revealed = (await session.call("reveal", { item: entry.item }))
        .body as {
        answer: string;
        rubric?: string;
        explanation?: string;
      };
      for (const secret of [
        revealed.answer,
        revealed.rubric,
        revealed.explanation,
      ]) {
        if (secret !== undefined)
          expect([entry.item, entry.question.includes(secret)]).toEqual([
            entry.item,
            false,
          ]);
      }
    }
    expect(JSON.stringify(scenario.body)).not.toContain("Rubric");
    expect(JSON.stringify(scenario.body)).not.toContain("(!)");
  });

  it("hides only the asked gap of a cloze card and reveals it after", async () => {
    const session = await connect(await goldenCopy());
    const batch = await items(session, {
      limit: 10,
      scope: { topic: "architecture/backpressure" },
    });
    const cloze = batch.find((entry) => entry.item === "2by9881r:c1");
    expect(cloze?.question).toBe(
      "[TCP] Flow control slows the sender using the receiver's advertised […].",
    );
    const revealed = await session.call("reveal", { item: "2by9881r:c1" });
    expect(revealed.body).toMatchObject({
      cloze: ["receive window"],
      answer: "`rwnd`: how many bytes the receiver can still accept.",
    });
    expect(revealed.body.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("record_review appends a v1 event to the mcp log and reports the due date a full replay gives", async () => {
    const root = await goldenCopy();
    const clock = testClock();
    const session = await connect(root, { clock });
    const [first] = await items(session, { limit: 1 });
    const result = await session.call("record_review", {
      item: first!.item,
      rating: 3,
      aiSuggested: 2,
      grader: "ai:claude-code",
      confidence: 2,
      durMs: 9000,
      requestId: "r-1",
    });
    expect(result.isError).toBe(false);
    const lines = (await readFile(join(root, LOG), "utf8")).trim().split("\n");
    expect(lines).toHaveLength(1);
    const parsed = parseReviewEvent(JSON.parse(lines[0]!));
    expect(parsed.ok && parsed.event).toMatchObject({
      v: 1,
      device: "desk1",
      writer: "mcp",
      kind: "review",
      item: first!.item,
      rating: 3,
      aiSuggested: 2,
      grader: "ai:claude-code",
      confidence: 2,
      durMs: 9000,
      sched: "ts-fsrs@6.0.1/FSRS-7",
      ts: clock.now.toISOString(),
    });
    const state = await fullState(root, clock.now);
    const item = state.items.get(first!.item);
    expect(result.body).toMatchObject({
      item: first!.item,
      due: new Date(item!.dueAt!).toISOString(),
      intervalDays: item!.scheduledDays,
      phase: item!.phase,
      suspended: false,
    });
    const again = await session.call("record_review", {
      item: first!.item,
      rating: 3,
      aiSuggested: 2,
      grader: "ai:claude-code",
      confidence: 2,
      durMs: 9000,
      requestId: "r-1",
    });
    expect(again.text).toBe(result.text);
    expect(
      (await readFile(join(root, LOG), "utf8")).trim().split("\n"),
    ).toHaveLength(1);
  });

  it("refuses to record a review item of a card that is not active", async () => {
    const session = await connect(await goldenCopy());
    for (const item of ["zzzzzzzz:main", "0d1gjcys:c9"]) {
      const result = await session.call("record_review", {
        item,
        rating: 3,
        requestId: `x-${item}`,
      });
      expect(result.body).toMatchObject({ code: "ITEM_NOT_ACTIVE" });
    }
  });

  it("suspends a leech in the same call and drops it from quiz_next", async () => {
    const root = await goldenCopy();
    await editJson(root, "learn.config.json", (config) => {
      config.leechThreshold = 1;
    });
    const clock = testClock();
    const session = await connect(root, { clock });
    const item = "10dkrwp7:main";
    const easy = await session.call("record_review", {
      item,
      rating: 4,
      requestId: "l-1",
    });
    expect(easy.body).toMatchObject({ phase: "review", suspended: false });
    clock.advance(30 * DAY);
    const lapse = await session.call("record_review", {
      item,
      rating: 1,
      requestId: "l-2",
    });
    expect(lapse.body).toMatchObject({ lapses: 1, suspended: true });
    expect((await logLines(root)).map((line) => line.kind)).toEqual([
      "review",
      "review",
      "suspend",
    ]);
    clock.advance(30 * DAY);
    const batch = await items(session, {
      limit: 10,
      scope: { topic: "architecture/backpressure" },
    });
    expect(batch.map((entry) => entry.item)).not.toContain(item);
  });

  it("undo_last appends undo events and brings the item back with its previous state", async () => {
    const root = await goldenCopy();
    const clock = testClock();
    const session = await connect(root, { clock });
    const item = "10dkrwp7:main";
    await session.call("record_review", { item, rating: 4, requestId: "u-1" });
    // Easy on a new card schedules it weeks ahead; two months later it is due again.
    clock.advance(60 * DAY);
    const before = snapshot(await fullState(root, clock.now));
    await session.call("record_review", { item, rating: 1, requestId: "u-2" });
    expect(snapshot(await fullState(root, clock.now))).not.toBe(before);
    const undo = await session.call("undo_last", { requestId: "u-3" });
    expect(undo.body).toMatchObject({ undone: [{ item, kind: "review" }] });
    expect((await logLines(root)).at(-1)).toMatchObject({
      kind: "undo",
      item,
      writer: "mcp",
    });
    expect(snapshot(await fullState(root, clock.now))).toBe(before);
    const batch = await items(session, {
      limit: 10,
      scope: { topic: "architecture/backpressure" },
    });
    expect(batch.map((entry) => entry.item)).toContain(item);
  });

  it("undo_last answers NOTHING_TO_UNDO before any review", async () => {
    const session = await connect(await goldenCopy());
    expect(
      (await session.call("undo_last", { requestId: "n-1" })).body,
    ).toMatchObject({ code: "NOTHING_TO_UNDO" });
  });

  it("practice drills without moving the schedule", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const [entry] = await items(session, {
      limit: 1,
      mode: "practice",
      scope: { domain: "dotnet" },
    });
    expect(entry?.kind).toBe("practice");
    const result = await session.call("record_review", {
      item: entry!.item,
      rating: 3,
      mode: "practice",
      requestId: "p-1",
    });
    expect(result.body).toMatchObject({ due: null });
    expect(
      (await fullState(root, new Date("2026-11-26T18:00:00.000Z"))).items.get(
        entry!.item,
      )?.phase ?? "new",
    ).toBe("new");
  });
});
