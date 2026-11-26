import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkRepository, npxMermaidRenderer } from "@wastech-learn/content-fs";
import { markerHash, sha256Hex } from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import {
  connect,
  goldenCopy,
  snapshotTree,
  stubRenderer,
  withoutRequests,
} from "./helpers.js";

const TOPIC = "architecture/backpressure";
const DIR = `content/${TOPIC}`;

const diagram = {
  topic: TOPIC,
  name: "window",
  format: "mermaid",
  source: "flowchart LR\n  S[Sender] -->|rwnd| R[Receiver]",
  alt: "The receiver advertises its window to the sender",
};

describe("save_diagram", () => {
  it("writes the source and an SVG whose marker is the source hash", async () => {
    const root = await goldenCopy();
    const renderer = stubRenderer();
    const session = await connect(root, { renderer });
    const result = await session.call("save_diagram", {
      ...diagram,
      requestId: "d-1",
    });
    expect(result.body).toMatchObject({
      status: "written",
      errors: 0,
      paths: [`${DIR}/diagrams/window.mmd`, `${DIR}/diagrams/window.svg`],
      embed:
        "![The receiver advertises its window to the sender](diagrams/window.svg)",
    });
    const source = await readFile(
      join(root, DIR, "diagrams/window.mmd"),
      "utf8",
    );
    const svg = await readFile(join(root, DIR, "diagrams/window.svg"), "utf8");
    expect(markerHash(svg)).toBe(await sha256Hex(source));
    expect((await checkRepository(root)).errorCount).toBe(0);
  });

  it("returns a finding for a source Mermaid cannot render and writes nothing", async () => {
    const root = await goldenCopy();
    const before = await snapshotTree(root);
    const session = await connect(root, {
      renderer: stubRenderer("Parse error on line 2: unexpected -->>"),
    });
    const result = await session.call("save_diagram", {
      ...diagram,
      requestId: "d-2",
    });
    expect(result.body).toMatchObject({ status: "blocked", errors: 1 });
    expect(result.body.findings).toEqual([
      expect.objectContaining({
        rule: "diagram-render",
        file: `${DIR}/diagrams/window.mmd`,
        message:
          "Mermaid не смог отрисовать этот источник: Parse error on line 2: unexpected -->>",
      }),
    ]);
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("refuses a diagram without alt text and writes nothing", async () => {
    const root = await goldenCopy();
    const before = await snapshotTree(root);
    const renderer = stubRenderer();
    const session = await connect(root, { renderer });
    const result = await session.call("save_diagram", {
      ...diagram,
      alt: "",
      requestId: "d-3",
    });
    expect(result.body).toMatchObject({ code: "INPUT_INVALID", field: "alt" });
    expect(renderer.calls).toBe(0);
    expect(await snapshotTree(root)).toEqual(before);
  });

  it.runIf(process.env.WASTECH_RENDER_E2E === "1")(
    "renders with the real mermaid-cli end to end",
    async () => {
      const root = await goldenCopy();
      const session = await connect(root, { renderer: npxMermaidRenderer });
      const result = await session.call("save_diagram", {
        ...diagram,
        requestId: "d-4",
      });
      expect(result.body).toMatchObject({ status: "written" });
      expect(
        await readFile(join(root, DIR, "diagrams/window.svg"), "utf8"),
      ).toContain("<svg");
    },
    180_000,
  );
});

// The example of the learning package format, as a chat would export it.
const PACKAGE = `---
package: wastech-learn/v1
source: chatgpt
lang: en
domain: architecture
topic: load-shedding
familiarity: new
created: 2026-11-25
---

# Load shedding

## Topic

Key idea: Under overload, reject some work early so the rest still finishes in time.

## Summary

### TL;DR
Dropping excess requests at the edge keeps latency bounded for the accepted ones.
### Mental model
A bouncer at a full club.

## Materials

| Title | Kind | Why |
| --- | --- | --- |
| [Google SRE book: Handling overload](https://sre.google/sre-book/handling-overload/) | book | Shedding at scale |

## Diagrams

\`\`\`mermaid
flowchart LR
  C[Clients] -->|excess dropped| G[Gateway] --> S[Service]
\`\`\`

## Cards

### why · understand · shed-early
Q: [Overload] Why shed load at the edge rather than deep in the stack?
A: Rejected work then costs almost nothing.

### basic · remember · shed-status
Q: [HTTP] Which status code signals load shedding?
A: 503 Service Unavailable.
`;

describe("import_package and archive_package", () => {
  it("parses a package from inbox/ into a topic and candidates without changing any file", async () => {
    const root = await goldenCopy();
    await mkdir(join(root, "inbox"), { recursive: true });
    await writeFile(join(root, "inbox/load-shedding.md"), PACKAGE);
    const before = await snapshotTree(root);
    const session = await connect(root);
    const result = await session.call("import_package", {
      path: "inbox/load-shedding.md",
    });
    expect(result.isError).toBe(false);
    expect(result.body).toMatchObject({
      path: "inbox/load-shedding.md",
      topicExists: false,
      findings: [],
      package: {
        frontMatter: {
          domain: "architecture",
          topic: "load-shedding",
          source: "chatgpt",
        },
        keyIdea:
          "Under overload, reject some work early so the rest still finishes in time.",
        diagrams: [
          "flowchart LR\n  C[Clients] -->|excess dropped| G[Gateway] --> S[Service]",
        ],
      },
    });
    const pkg = result.body.package as {
      cards: { type: string }[];
      materials: unknown[];
    };
    expect(pkg.cards.map((candidate) => candidate.type)).toEqual([
      "why",
      "basic",
    ]);
    expect(pkg.materials).toHaveLength(1);
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("reports a broken package with its field and refuses paths outside inbox/", async () => {
    const root = await goldenCopy();
    await mkdir(join(root, "inbox/done"), { recursive: true });
    await writeFile(
      join(root, "inbox/broken.md"),
      PACKAGE.replace("lang: en", "lang: de"),
    );
    await writeFile(join(root, "inbox/done/old.md"), PACKAGE);
    const session = await connect(root);
    const broken = await session.call("import_package", {
      path: "inbox/broken.md",
    });
    expect(broken.body.package).toBeUndefined();
    expect(broken.body.findings).toEqual([
      expect.objectContaining({
        rule: "front-matter-schema",
        message: "Поле front matter lang отсутствует или неверно",
      }),
    ]);
    for (const path of [
      "inbox/done/old.md",
      "content/architecture/backpressure/index.md",
      "inbox/missing.md",
    ]) {
      expect(
        (await session.call("import_package", { path })).body,
      ).toMatchObject({ code: "PACKAGE_NOT_FOUND" });
    }
  });

  it("moves an imported package to inbox/done/, and a repeated requestId moves nothing twice", async () => {
    const root = await goldenCopy();
    await mkdir(join(root, "inbox"), { recursive: true });
    await writeFile(join(root, "inbox/load-shedding.md"), PACKAGE);
    const session = await connect(root);
    const dry = await session.call("archive_package", {
      path: "inbox/load-shedding.md",
      dryRun: true,
    });
    expect(dry.body).toMatchObject({
      status: "dry-run",
      to: "inbox/done/load-shedding.md",
    });
    const first = await session.call("archive_package", {
      path: "inbox/load-shedding.md",
      requestId: "a-1",
    });
    expect(first.body).toEqual({
      status: "written",
      from: "inbox/load-shedding.md",
      to: "inbox/done/load-shedding.md",
    });
    const tree = await snapshotTree(root);
    expect(tree["inbox/done/load-shedding.md"]).toBe(PACKAGE);
    expect(tree["inbox/load-shedding.md"]).toBeUndefined();
    const again = await session.call("archive_package", {
      path: "inbox/load-shedding.md",
      requestId: "a-1",
    });
    expect(again.isError).toBe(false);
    expect(again.text).toBe(first.text);
    expect(withoutRequests(await snapshotTree(root))).toEqual(
      withoutRequests(tree),
    );
  });
});
