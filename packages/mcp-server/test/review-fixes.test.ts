import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { appendReviewEvents, type Renderer } from "@wastech-learn/content-fs";
import { describe, expect, it } from "vitest";
import {
  connect,
  editJson,
  goldenCopy,
  snapshotTree,
  stubRenderer,
  testClock,
} from "./helpers.js";

const run = promisify(execFile);
const TOPIC = "architecture/backpressure";
const DIR = `content/${TOPIC}`;
const DAY = 86_400_000;

const card = (overrides: Record<string, unknown> = {}) => ({
  title: "Demand signal",
  type: "basic",
  bloom: "remember",
  grading: "self",
  status: "active",
  question: "[Reactive Streams] What does request(n) tell the publisher?",
  answer: "How many more items the subscriber can take.",
  sources: [{ title: "Summary: Comparison", url: "../summary.md#comparison" }],
  ...overrides,
});

interface Item {
  item: string;
  card: string;
  kind: string;
  question: string;
}

describe("review fixes: content writes", () => {
  it("refuses to overwrite a summary or materials file it cannot read", async () => {
    const root = await goldenCopy();
    for (const name of ["summary.md", "materials.md"]) {
      const path = join(root, DIR, name);
      await writeFile(path, `\uFEFF${await readFile(path, "utf8")}`);
    }
    const before = await snapshotTree(root);
    const session = await connect(root);
    const summary = await session.call("save_summary", {
      topic: TOPIC,
      requestId: "s-1",
      sections: { "Open questions": "- Anything else?" },
    });
    expect(summary.body).toMatchObject({ status: "blocked", errors: 1 });
    expect(summary.body.findings).toEqual([
      expect.objectContaining({
        rule: "front-matter-missing",
        file: `${DIR}/summary.md`,
      }),
    ]);
    const materials = await session.call("save_materials", {
      topic: TOPIC,
      requestId: "m-1",
      items: [
        {
          title: "RFC",
          url: "https://example.org/rfc",
          kind: "docs",
          why: "Spec",
        },
      ],
    });
    expect(materials.body).toMatchObject({ status: "blocked" });
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("adds cards to a topic whose index already has an unrelated error", async () => {
    const root = await goldenCopy();
    const index = join(root, DIR, "index.md");
    await writeFile(
      index,
      (await readFile(index, "utf8")).replace(
        "## Cards\n",
        "## Cards\n\n- [Old notes](notes-moved.md)",
      ),
    );
    const session = await connect(root);
    const result = await session.call("add_cards", {
      topic: TOPIC,
      requestId: "c-1",
      cards: [card()],
    });
    expect(result.body).toMatchObject({ status: "written", errors: 0 });
  });

  it("refreshes the title in the topic index when a card is renamed", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const result = await session.call("update_card", {
      id: "10dkrwp7",
      requestId: "u-0",
      fields: { title: "Reactive Streams: request(n)" },
    });
    expect(result.body).toMatchObject({ status: "written", errors: 0 });
    expect(await readFile(join(root, DIR, "index.md"), "utf8")).toContain(
      "- [Reactive Streams: request(n)](cards/10dkrwp7.md)",
    );
  });

  it("warns about a large edit of a committed active card", async () => {
    const root = await goldenCopy();
    const git = (...args: string[]) =>
      run("git", [
        "-C",
        root,
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@example.org",
        ...args,
      ]);
    await git("init", "-q");
    await git("add", "-A");
    await git("commit", "-q", "-m", "golden");
    const session = await connect(root);
    const result = await session.call("update_card", {
      id: "10dkrwp7",
      dryRun: true,
      fields: {
        question: "[Kafka] Which setting caps records per poll?",
        answer: "`max.poll.records`",
      },
    });
    expect(result.body.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "active-edit", severity: "warning" }),
      ]),
    );
  });

  it("lists every error in a reply, however many", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const long =
      "How many more items the subscriber can take before its buffer would overflow right now.";
    const result = await session.call("add_cards", {
      topic: TOPIC,
      dryRun: true,
      cards: Array.from({ length: 14 }, (_, index) =>
        card({ title: `Card ${String(index)}`, answer: long }),
      ),
    });
    expect(result.body.errors).toBe(14);
    expect(
      (result.body.findings as { severity: string }[]).filter(
        (f) => f.severity === "error",
      ),
    ).toHaveLength(14);
  });

  it("does not hold quiz ratings behind a slow diagram render", async () => {
    const root = await goldenCopy();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const stub = stubRenderer();
    const slow: Renderer = {
      render: async (source, output) => {
        await gate;
        await stub.render(source, output);
      },
    };
    const session = await connect(root, { renderer: slow });
    const diagram = session.call("save_diagram", {
      topic: TOPIC,
      requestId: "d-1",
      name: "window",
      format: "mermaid",
      source: "flowchart LR\n  S -->|rwnd| R",
      alt: "The receiver advertises its window",
    });
    const rating = await session.call("record_review", {
      item: "10dkrwp7:main",
      rating: 3,
      requestId: "r-1",
    });
    expect(rating.isError).toBe(false);
    release();
    expect((await diagram).body).toMatchObject({ status: "written" });
  });
});

describe("review fixes: quiz", () => {
  it("asks the reverse of a vocab card without its example sentence", async () => {
    const session = await connect(await goldenCopy());
    const items = (
      await session.call("quiz_next", {
        limit: 10,
        mode: "practice",
        scope: { topic: "lang-pl/w-restauracji" },
      })
    ).body.items as Item[];
    for (const entry of items) {
      const revealed = (await session.call("reveal", { item: entry.item }))
        .body as { answer: string };
      expect([entry.item, entry.question.includes(revealed.answer)]).toEqual([
        entry.item,
        false,
      ]);
    }
    const reverse = (await session.call("reveal", { item: "e4ej1s8e:rev" }))
      .body;
    expect(reverse).toMatchObject({
      example: "счёт (м. р.) — *Poproszę rachunek.*",
    });
  });

  it("keeps the day's new-card limit when quiz_next is scoped", async () => {
    const root = await goldenCopy();
    await editJson(root, "learn.config.json", (config) => {
      const limits = config.limits as { default: { newPerDay: number } };
      limits.default.newPerDay = 2;
    });
    const session = await connect(root);
    await session.call("record_review", {
      item: "10dkrwp7:main",
      rating: 3,
      requestId: "n-1",
    });
    const scoped = (
      await session.call("quiz_next", { limit: 10, scope: { tag: "channels" } })
    ).body.items as Item[];
    expect(
      scoped.filter((entry) => entry.kind === "new").length,
    ).toBeLessThanOrEqual(1);
  });

  it("records a repeated rating with the same requestId once its retry window passed", async () => {
    const root = await goldenCopy();
    const clock = testClock();
    const session = await connect(root, { clock });
    const args = {
      item: "10dkrwp7:main",
      rating: 3,
      confidence: 3,
      requestId: "quiz-10dkrwp7-1",
    };
    const first = await session.call("record_review", args);
    const retry = await session.call("record_review", args);
    expect(retry.text).toBe(first.text);
    clock.advance(7 * DAY);
    const later = await session.call("record_review", args);
    expect(later.body.event).not.toBe(first.body.event);
  });

  it("does not suspend again an item that was past the leech threshold and unsuspended", async () => {
    const root = await goldenCopy();
    await editJson(root, "learn.config.json", (config) => {
      config.leechThreshold = 1;
    });
    const clock = testClock();
    const session = await connect(root, { clock });
    const item = "10dkrwp7:main";
    await session.call("record_review", { item, rating: 4, requestId: "l-1" });
    clock.advance(60 * DAY);
    const lapse = await session.call("record_review", {
      item,
      rating: 1,
      requestId: "l-2",
    });
    expect(lapse.body).toMatchObject({ suspended: true });
    clock.advance(60_000);
    await appendReviewEvents(root, [
      {
        v: 1,
        id: "01MASR4W80ZZZZZZZZZZZZZZZZ",
        ts: clock.now.toISOString(),
        tz: "Europe/Warsaw",
        device: "desk1",
        writer: "web",
        kind: "unsuspend",
        item,
        sched: "ts-fsrs@6.0.1/FSRS-7",
      },
    ]);
    clock.advance(DAY);
    const next = await session.call("record_review", {
      item,
      rating: 3,
      requestId: "l-3",
    });
    expect(next.body).toMatchObject({ suspended: false });
  });
});
