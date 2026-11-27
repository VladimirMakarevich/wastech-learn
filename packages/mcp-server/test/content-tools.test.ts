import { readFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { checkRepository } from "@wastech-learn/content-fs";
import {
  CARD_ID_PATTERN,
  parseContent,
  readDocument,
  sectionMarkdown,
} from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import {
  REQUESTS,
  connect,
  goldenCopy,
  snapshotTree,
  tempDir,
  withoutRequests,
} from "./helpers.js";

const TOPIC = "architecture/backpressure";
const DIR = `content/${TOPIC}`;

const card = (overrides: Record<string, unknown> = {}) => ({
  title: "Demand signal",
  type: "basic",
  bloom: "remember",
  grading: "self",
  status: "active",
  idea: "demand-signal",
  question: "[Reactive Streams] What does request(n) tell the publisher?",
  answer: "How many more items the subscriber can take.",
  sources: [{ title: "Summary: Comparison", url: "../summary.md#comparison" }],
  ...overrides,
});

const newTopic = {
  domain: "architecture",
  topic: "rate-limiting",
  title: "Rate limiting",
  lang: "en",
  familiarity: "familiar",
  keyIdea:
    "A limiter caps how often a client may call, so one client cannot use up shared capacity.",
  pretest: [
    {
      question: "What does a token bucket allow that a fixed window does not?",
      answer: "Bursts",
      confidence: 2,
    },
    { question: "Where is a limit enforced?" },
  ],
  tags: ["reliability"],
  related: ["architecture/backpressure"],
};

const read = (root: string, path: string): Promise<string> =>
  readFile(join(root, path), "utf8");

describe("create_topic", () => {
  it("creates an index that passes the M2 parser, mdlint and check", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const result = await session.call("create_topic", {
      ...newTopic,
      requestId: "t-1",
    });
    expect(result.body).toMatchObject({
      status: "written",
      topic: "architecture/rate-limiting",
      errors: 0,
      paths: [
        "content/architecture/rate-limiting/index.md",
        "content/architecture/rate-limiting/summary.md",
        "content/architecture/rate-limiting/materials.md",
      ],
    });
    const index = await read(
      root,
      "content/architecture/rate-limiting/index.md",
    );
    expect(index).toContain("familiarity: familiar");
    expect(index).toContain("## Key idea\n\nA limiter caps how often");
    expect(index).toContain(
      "1. What does a token bucket allow that a fixed window does not? - Bursts (2/3)",
    );
    const check = await checkRepository(root);
    expect(check.errorCount).toBe(0);
    expect(check.model.topics.map((topic) => topic.path)).toContain(
      "architecture/rate-limiting",
    );
    const lint = await session.call("validate", {
      paths: ["content/architecture/rate-limiting/index.md"],
    });
    expect(lint.body).toMatchObject({ errors: 0 });
  });

  it("refuses a topic that already exists", async () => {
    const session = await connect(await goldenCopy());
    const result = await session.call("create_topic", {
      ...newTopic,
      topic: "backpressure",
      requestId: "t-1",
    });
    expect(result.body).toMatchObject({ code: "TOPIC_EXISTS" });
  });
});

describe("add_cards", () => {
  it("writes three cards with new unique ids, keeps their status and lists them in ## Cards", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const result = await session.call("add_cards", {
      topic: TOPIC,
      requestId: "c-1",
      cards: [
        card(),
        card({
          title: "Demand is a count",
          status: "draft",
          question: "[Reactive Streams] What unit is n in request(n)?",
          answer: "Items, not bytes.",
        }),
        card({
          title: "Who requests",
          question: "[Reactive Streams] Which side calls request(n)?",
          answer: "The subscriber.",
        }),
      ],
    });
    expect(result.body).toMatchObject({ status: "written", errors: 0 });
    const ids = result.body.ids as string[];
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(CARD_ID_PATTERN);
    const { model } = await parseContent(
      new Map(
        [...Object.entries(await snapshotTree(root))].filter(([path]) =>
          path.startsWith("content/"),
        ),
      ),
    );
    const status = new Map(
      model.cards.map((candidate) => [
        candidate.id,
        candidate.frontMatter.status,
      ]),
    );
    expect(ids.map((id) => status.get(id))).toEqual([
      "active",
      "draft",
      "active",
    ]);
    const cards =
      sectionMarkdown(
        readDocument(await read(root, `${DIR}/index.md`))!,
        "Cards",
      ) ?? "";
    for (const id of ids) expect(cards).toContain(`(cards/${id}.md)`);
    expect((await checkRepository(root)).errorCount).toBe(0);
  });

  it("writes nothing when an answer is over its limit, and names the rule", async () => {
    const root = await goldenCopy();
    const before = await snapshotTree(root);
    const session = await connect(root);
    const result = await session.call("add_cards", {
      topic: TOPIC,
      requestId: "c-2",
      cards: [
        card({
          answer:
            "How many more items the subscriber can take before its buffer would overflow right now.",
        }),
      ],
    });
    expect(result.body).toMatchObject({ status: "blocked", errors: 1 });
    expect(result.body.findings).toEqual([
      expect.objectContaining({ rule: "answer-words", severity: "error" }),
    ]);
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("with dryRun returns findings and the future paths and writes nothing", async () => {
    const root = await goldenCopy();
    const before = await snapshotTree(root);
    const session = await connect(root);
    const result = await session.call("add_cards", {
      topic: TOPIC,
      dryRun: true,
      cards: [card()],
    });
    expect(result.body).toMatchObject({ status: "dry-run", errors: 0 });
    expect(result.body.paths).toEqual([
      expect.stringMatching(
        /^content\/architecture\/backpressure\/cards\/[0-9a-z]{8}\.md$/,
      ),
    ]);
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("returns the same answer for a repeated requestId, also after a restart, and writes one set of files", async () => {
    const root = await goldenCopy();
    const args = { topic: TOPIC, requestId: "c-3", cards: [card()] };
    const first = await (
      await connect(root, { seed: 1 })
    ).call("add_cards", args);
    const afterFirst = await snapshotTree(root);
    const again = await (
      await connect(root, { seed: 2 })
    ).call("add_cards", args);
    expect(again.text).toBe(first.text);
    const files = await snapshotTree(root);
    expect(files[REQUESTS]?.trim().split("\n")).toHaveLength(1);
    expect(withoutRequests(files)).toEqual(withoutRequests(afterFirst));
  });

  it("refuses a requestId reused with another input", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    await session.call("add_cards", {
      topic: TOPIC,
      requestId: "c-4",
      cards: [card()],
    });
    const reused = await session.call("add_cards", {
      topic: TOPIC,
      requestId: "c-4",
      cards: [card({ title: "Another" })],
    });
    expect(reused.isError).toBe(true);
    expect(reused.body).toMatchObject({ code: "REQUEST_ID_REUSED" });
  });

  it("answers writes briefly: under 2 KB and without the text of the files", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const calls: [string, Record<string, unknown>][] = [
      ["create_topic", { ...newTopic, requestId: "n-1" }],
      [
        "add_cards",
        {
          topic: TOPIC,
          requestId: "n-2",
          cards: [card(), card({ title: "Two", answer: "The subscriber." })],
        },
      ],
      [
        "update_card",
        {
          id: "0d1gjcys",
          requestId: "n-3",
          fields: {
            answer:
              "So the producer never sends more than the consumer can buffer.",
          },
        },
      ],
      [
        "save_summary",
        {
          topic: TOPIC,
          requestId: "n-4",
          sections: {
            "Open questions": "- How does gRPC expose flow control?",
          },
        },
      ],
      [
        "save_materials",
        {
          topic: TOPIC,
          requestId: "n-5",
          items: [
            {
              title: "RFC 7323",
              url: "https://www.rfc-editor.org/rfc/rfc7323",
              kind: "docs",
              why: "TCP window scaling",
            },
          ],
        },
      ],
      [
        "save_diagram",
        {
          topic: TOPIC,
          requestId: "n-6",
          name: "window",
          format: "mermaid",
          source: "flowchart LR\n  S[Sender] -->|rwnd| R[Receiver]",
          alt: "The receiver advertises its window to the sender",
        },
      ],
    ];
    for (const [name, args] of calls) {
      const result = await session.call(name, args);
      expect([name, result.isError, result.body.status]).toEqual([
        name,
        false,
        "written",
      ]);
      expect([name, result.bytes <= 2048]).toEqual([name, true]);
      expect(result.text).not.toContain("request(n) tell the publisher");
      expect(result.text).not.toContain("never sends more than");
    }
  });
});

describe("parallel writes", () => {
  it("queues writes to one topic so neither loses its cards in the index", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const [first, second] = await Promise.all([
      session.call("add_cards", {
        topic: TOPIC,
        requestId: "p-1",
        cards: [card()],
      }),
      session.call("add_cards", {
        topic: TOPIC,
        requestId: "p-2",
        cards: [card({ title: "Who requests", answer: "The subscriber." })],
      }),
    ]);
    const index = await read(root, `${DIR}/index.md`);
    for (const id of [
      ...(first.body.ids as string[]),
      ...(second.body.ids as string[]),
    ]) {
      expect(index).toContain(`(cards/${id}.md)`);
    }
    expect((await checkRepository(root)).errorCount).toBe(0);
  });
});

describe("update_card", () => {
  it("edits in place and keeps the id when the meaning did not change", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const result = await session.call("update_card", {
      id: "10dkrwp7",
      requestId: "u-1",
      fields: { answer: "`Subscription.request(n)`, called by the subscriber" },
    });
    expect(result.body).toMatchObject({
      status: "written",
      id: "10dkrwp7",
      paths: [`${DIR}/cards/10dkrwp7.md`],
    });
    expect(await read(root, `${DIR}/cards/10dkrwp7.md`)).toContain(
      "called by the subscriber",
    );
  });

  it("retires the old card and writes a successor with a new id when the meaning changed", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const result = await session.call("update_card", {
      id: "10dkrwp7",
      requestId: "u-2",
      meaningChanged: true,
      fields: {
        question: "[Reactive Streams] Which call cancels a subscription?",
        answer: "`Subscription.cancel()`",
      },
    });
    expect(result.body).toMatchObject({
      status: "written",
      retired: "10dkrwp7",
      errors: 0,
    });
    const id = result.body.id as string;
    expect(id).not.toBe("10dkrwp7");
    expect(await read(root, `${DIR}/cards/10dkrwp7.md`)).toContain(
      "status: retired",
    );
    const successor = await read(root, `${DIR}/cards/${id}.md`);
    expect(successor).toContain(`id: ${id}`);
    expect(successor).toContain("status: active");
    expect(successor).toContain("Subscription.cancel()");
    expect(await read(root, `${DIR}/index.md`)).toContain(`(cards/${id}.md)`);
  });

  it("answers CARD_NOT_FOUND for an unknown id", async () => {
    const session = await connect(await goldenCopy());
    const result = await session.call("update_card", {
      id: "zzzzzzzz",
      requestId: "u-3",
      fields: { answer: "x" },
    });
    expect(result.body).toMatchObject({ code: "CARD_NOT_FOUND" });
  });
});

describe("save_summary and save_materials", () => {
  it("rewrite only the given summary sections and append materials once", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const before = await read(root, `${DIR}/summary.md`);
    const summary = await session.call("save_summary", {
      topic: TOPIC,
      requestId: "s-1",
      sections: {
        "TL;DR":
          "Backpressure lets a slow consumer set the pace of a fast producer.",
      },
    });
    expect(summary.body).toMatchObject({
      status: "written",
      path: `${DIR}/summary.md`,
      errors: 0,
    });
    const after = await read(root, `${DIR}/summary.md`);
    expect(after).toContain(
      "## TL;DR\n\nBackpressure lets a slow consumer set the pace",
    );
    expect(after.split("## Mental model")[1]).toBe(
      before.split("## Mental model")[1],
    );
    const item = {
      title: "RFC 7323",
      url: "https://www.rfc-editor.org/rfc/rfc7323",
      kind: "docs",
      why: "TCP window scaling",
    };
    await session.call("save_materials", {
      topic: TOPIC,
      requestId: "m-1",
      items: [item],
    });
    await session.call("save_materials", {
      topic: TOPIC,
      requestId: "m-2",
      items: [item],
    });
    const materials = await read(root, `${DIR}/materials.md`);
    expect(materials.match(/rfc7323/g)).toHaveLength(1);
    expect(materials).toContain(
      "| [RFC 7323](https://www.rfc-editor.org/rfc/rfc7323) | docs | TCP window scaling | to-read |",
    );
  });
});

describe("save_summary with merge", () => {
  it("fills empty sections, keeps written ones and parks the new text under Open questions", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    await session.call("save_summary", {
      topic: TOPIC,
      requestId: "g-0",
      sections: { "When not to use": "" },
    });
    const args = {
      topic: TOPIC,
      requestId: "g-1",
      merge: true,
      sections: {
        "TL;DR": "Consumers signal demand so producers never outrun them.",
        "When not to use": "- Fire-and-forget telemetry.",
      },
    };
    const result = await session.call("save_summary", args);
    expect(result.body).toMatchObject({ status: "written", errors: 0 });
    const summary = readDocument(await read(root, `${DIR}/summary.md`))!;
    expect(sectionMarkdown(summary, "TL;DR")).toContain(
      "feedback signal from a slower consumer",
    );
    expect(sectionMarkdown(summary, "When not to use")).toBe(
      "- Fire-and-forget telemetry.",
    );
    expect(sectionMarkdown(summary, "Open questions")).toContain(
      "### TL;DR\n\nConsumers signal demand so producers never outrun them.",
    );
  });
});

describe("validate", () => {
  it("finds a duplicate id in a draft against the whole repository", async () => {
    const root = await goldenCopy();
    const session = await connect(root);
    const draft = await read(root, `${DIR}/cards/0d1gjcys.md`);
    const result = await session.call("validate", {
      drafts: [{ path: `${DIR}/cards/aaaaaaaa.md`, content: draft }],
    });
    expect(result.body.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "id-unique",
          file: `${DIR}/cards/aaaaaaaa.md`,
        }),
      ]),
    );
  });
});

describe("path confinement", () => {
  it("refuses .., absolute paths and symbolic links out of the repository, reading and writing nothing", async () => {
    const root = await goldenCopy();
    const outside = await tempDir();
    await symlink(outside, join(root, "content/escape"));
    const session = await connect(root);
    for (const path of [
      "../outside.md",
      join(outside, "x.md"),
      "content/escape/x.md",
    ]) {
      const validate = await session.call("validate", { paths: [path] });
      expect(validate.body).toMatchObject({ code: "PATH_OUTSIDE_CONTENT" });
      const draft = await session.call("validate", {
        drafts: [{ path, content: "---\n---\n" }],
      });
      expect(draft.body).toMatchObject({ code: "PATH_OUTSIDE_CONTENT" });
      const imported = await session.call("import_package", { path });
      expect(imported.body).toMatchObject({ code: "PATH_OUTSIDE_CONTENT" });
    }
    expect(await snapshotTree(outside)).toEqual({});
  });
});

describe("search", () => {
  it("finds a card by the words of its question first, filters, and folds Polish diacritics", async () => {
    const session = await connect(await goldenCopy());
    const byQuestion = await session.call("search", {
      query: "Which call does a subscriber use to ask for more items",
    });
    expect((byQuestion.body.hits as { id: string }[])[0]).toMatchObject({
      id: "10dkrwp7",
      kind: "card",
    });
    const filtered = await session.call("search", {
      query: "subscriber",
      domain: "dotnet",
    });
    expect(
      (filtered.body.hits as { domain: string }[]).every(
        (hit) => hit.domain === "dotnet",
      ),
    ).toBe(true);
    const polish = await session.call("search", { query: "zamowic" });
    expect(
      (polish.body.hits as { id: string }[]).map((hit) => hit.id),
    ).toContain("r8ysq6gr");
    const drafts = await session.call("search", {
      query: "backpressure",
      status: "draft",
    });
    expect(drafts.body.hits).toEqual([]);
  });
});
