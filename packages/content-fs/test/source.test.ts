import {
  mkdir,
  readFile,
  readdir,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { sha256Hex } from "@wastech-learn/core";
import { seededRng } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import {
  nodeTransactionFs,
  openWorkspace,
  readSource,
  saveSource,
  type SourceSaveOutcome,
  type TransactionFs,
  type Workspace,
} from "../src/index.js";
import { goldenRemote } from "./git-repo.js";
import { goldenCopy } from "./helpers.js";

const DIR = "content/architecture/backpressure";
const CARD = `${DIR}/cards/10dkrwp7.md`;
const SUMMARY = `${DIR}/summary.md`;
const INDEX = `${DIR}/index.md`;

const workspaceOn = (root: string, transactionFs?: TransactionFs): Workspace =>
  openWorkspace({
    root,
    // Late evening in Warsaw is already the next day there: the date must follow the config's zone.
    now: () => new Date("2026-11-27T23:30:00.000Z"),
    random: seededRng(3),
    ...(transactionFs === undefined ? {} : { transactionFs }),
  });

const read = (root: string, path: string): Promise<string> =>
  readFile(join(root, path), "utf8");

/** Opens a file as the editor does and saves the result of `edit` against that version. */
const edit = async (
  workspace: Workspace,
  path: string,
  change: (text: string) => string,
  meaning?: "same" | "new",
): Promise<SourceSaveOutcome> => {
  const source = await readSource(workspace, path);
  return saveSource(workspace, {
    path,
    version: source.version,
    text: change(source.text),
    ...(meaning === undefined ? {} : { meaning }),
  });
};

const REWRITTEN_ANSWER = (text: string): string =>
  text.replace(
    "`Subscription.request(n)`",
    "The subscriber calls `Subscription.request(n)` when ready",
  );

describe("readSource", () => {
  it("returns the file as it is on disk with the hash of its text", async () => {
    const root = await goldenCopy();
    const source = await readSource(workspaceOn(root), CARD);
    const text = await read(root, CARD);
    expect(source).toEqual({
      path: CARD,
      text,
      version: await sha256Hex(text),
    });
  });

  it("refuses anything that is not a topic or card file, and links of any kind", async () => {
    const root = await goldenCopy();
    await symlink(
      join(root, "learn.config.json"),
      join(root, `${DIR}/cards/zzzzzzzz.md`),
    );
    await symlink("/etc", join(root, "content/architecture/outside"));
    const workspace = workspaceOn(root);
    for (const path of [
      "learn.config.json",
      "reviews/2026/11/desk-web.jsonl",
      `${DIR}/../../../learn.config.json`,
      `${DIR}/diagrams/demand-flow.mmd`,
      `${DIR}/cards/zzzzzzzz.md`,
      "content/architecture/outside/index.md",
      `${DIR}/cards/missing0.md`,
    ])
      await expect(readSource(workspace, path), path).rejects.toMatchObject({
        code: "source-not-found",
      });
  });
});

describe("saveSource", () => {
  it("writes a clean edit and answers unchanged for the same save again", async () => {
    const root = await goldenCopy();
    const workspace = workspaceOn(root);
    const source = await readSource(workspace, CARD);
    const body = {
      path: CARD,
      version: source.version,
      text: source.text.replace(
        "ask for more items",
        "ask the producer for more items",
      ),
    };
    const outcome = await saveSource(workspace, body);
    expect(outcome).toMatchObject({
      status: "written",
      paths: [CARD],
      card: { id: "10dkrwp7", retired: null },
    });
    expect(await read(root, CARD)).toBe(body.text);
    const writtenAt = (await stat(join(root, CARD))).mtimeMs;

    expect((await saveSource(workspace, body)).status).toBe("unchanged");
    expect((await stat(join(root, CARD))).mtimeMs).toBe(writtenAt);
    expect(
      (
        await saveSource(workspace, {
          ...body,
          version: await sha256Hex(body.text),
        })
      ).status,
    ).toBe("unchanged");
  });

  it("refuses a file saved elsewhere since it was opened and leaves that edit alone", async () => {
    const root = await goldenCopy();
    const workspace = workspaceOn(root);
    const source = await readSource(workspace, CARD);
    const theirs = source.text.replace("ask for more", "request more");
    await writeFile(join(root, CARD), theirs);
    await expect(
      saveSource(workspace, {
        path: CARD,
        version: source.version,
        text: source.text.replace("items", "elements"),
      }),
    ).rejects.toMatchObject({ code: "content-changed" });
    expect(await read(root, CARD)).toBe(theirs);
  });

  it("blocks a card that lost its Answer, with the finding on its line, and writes nothing", async () => {
    const root = await goldenCopy();
    const before = await read(root, CARD);
    const outcome = await edit(workspaceOn(root), CARD, (text) =>
      text.replace("## Answer\n\n", ""),
    );
    expect(outcome.status).toBe("blocked");
    const findings =
      outcome.status === "blocked" ? outcome.report.findings : [];
    const missing = findings.find(
      (finding) =>
        finding.ruleId === "section-missing" &&
        finding.params.section === "Answer",
    );
    expect(missing).toMatchObject({ severity: "error", file: CARD });
    expect(missing?.line).toBeGreaterThan(0);
    expect(await read(root, CARD)).toBe(before);
  });

  it("blocks an edit that breaks an anchor another file links to, naming that file", async () => {
    const root = await goldenCopy();
    const outcome = await edit(workspaceOn(root), SUMMARY, (text) =>
      text.replace("## Comparison", "## Side by side"),
    );
    expect(outcome.status).toBe("blocked");
    if (outcome.status !== "blocked") return;
    const elsewhere = [
      ...outcome.report.findings,
      ...outcome.report.lint,
    ].filter(
      (finding) => finding.file !== SUMMARY && finding.severity === "error",
    );
    expect(elsewhere.map((finding) => finding.file)).toContain(CARD);
    expect(elsewhere.every((finding) => (finding.line ?? 0) > 0)).toBe(true);
  });

  it("keeps an id YAML reads as a number", async () => {
    const root = await goldenCopy();
    const digits = `${DIR}/cards/10000000.md`;
    await writeFile(
      join(root, digits),
      (await read(root, CARD)).replace("id: 10dkrwp7", "id: 10000000"),
    );
    const outcome = await edit(workspaceOn(root), digits, (text) =>
      text.replace("ask for more items", "ask for more elements"),
    );
    if (outcome.status === "blocked")
      expect(outcome.report.findings.map((f) => f.ruleId)).not.toContain(
        "card-id-changed",
      );
  });

  it("refuses to change a card's id and points at the id line", async () => {
    const root = await goldenCopy();
    const before = await read(root, CARD);
    const outcome = await edit(workspaceOn(root), CARD, (text) =>
      text.replace("id: 10dkrwp7", "id: 10dkrwp8"),
    );
    expect(outcome.status).toBe("blocked");
    if (outcome.status !== "blocked") return;
    expect(outcome.report.findings[0]).toEqual({
      ruleId: "card-id-changed",
      severity: "error",
      file: CARD,
      line: 2,
      params: { id: "10dkrwp7" },
    });
    expect(await read(root, CARD)).toBe(before);
  });

  it("asks before a large rewrite of an active card and keeps a draft's rewrite quiet", async () => {
    const root = await goldenCopy();
    const workspace = workspaceOn(root);
    const before = await read(root, CARD);
    const asked = await edit(workspace, CARD, REWRITTEN_ANSWER);
    expect(asked).toEqual({
      status: "decision-needed",
      decision: {
        largeEdit: [{ section: "Answer", percent: 83 }],
        removedVariants: [],
      },
    });
    expect(await read(root, CARD)).toBe(before);

    const draft = before.replace("status: active", "status: draft");
    await writeFile(join(root, CARD), draft);
    expect((await edit(workspace, CARD, REWRITTEN_ANSWER)).status).toBe(
      "written",
    );
  });

  it("keeps the id on 'same' and drops the large-edit warning of that file", async () => {
    const { root } = await goldenRemote();
    const workspace = workspaceOn(root);
    const outcome = await edit(workspace, CARD, REWRITTEN_ANSWER, "same");
    expect(outcome).toMatchObject({
      status: "written",
      paths: [CARD],
      card: { id: "10dkrwp7", retired: null },
    });
    if (outcome.status !== "written") return;
    expect(
      outcome.report.findings.map((finding) => finding.ruleId),
    ).not.toContain("active-edit");

    // A small follow-up asks nothing, but the file still differs a lot from its commit: the warning
    // comes back as a warning and the edit is written anyway.
    const followUp = await edit(workspace, CARD, (text) =>
      text.replace("when ready", "when ready again"),
    );
    expect(followUp.status).toBe("written");
    if (followUp.status !== "written") return;
    expect(followUp.report.findings).toContainEqual(
      expect.objectContaining({ ruleId: "active-edit", severity: "warning" }),
    );
  });

  it("on 'new' retires the disk text and writes the edit as a dated successor linked in the index", async () => {
    const root = await goldenCopy();
    const workspace = workspaceOn(root);
    const before = await read(root, CARD);
    const edited = REWRITTEN_ANSWER(before).replace(
      "origin: claude-code",
      "origin: manual",
    );
    const source = await readSource(workspace, CARD);
    const outcome = await saveSource(workspace, {
      path: CARD,
      version: source.version,
      text: edited,
      meaning: "new",
    });
    expect(outcome.status).toBe("written");
    if (outcome.status !== "written" || outcome.card === undefined) return;
    const { id, retired } = outcome.card;
    expect(retired).toBe("10dkrwp7");
    expect(id).not.toBe("10dkrwp7");
    expect(await read(root, CARD)).toBe(
      before.replace("status: active", "status: retired"),
    );
    const successor = await read(root, `${DIR}/cards/${id}.md`);
    expect(successor).toContain(`id: ${id}`);
    expect(successor).toContain("created: 2026-11-28");
    expect(successor).toContain("status: active");
    expect(successor).toContain("origin: claude-code");
    expect(successor).toContain("calls `Subscription.request(n)` when ready");
    expect(await read(root, INDEX)).toContain(
      `- [Reactive Streams: requesting items](cards/${id}.md)`,
    );
  });

  it("on 'new' for a card outside the model blocks instead of keeping the id on the new text", async () => {
    const root = await goldenCopy();
    // A topic whose index cannot be read leaves its cards out of the model: there is no list to put a
    // successor in.
    await writeFile(join(root, INDEX), "# No front matter\n");
    const before = await read(root, CARD);
    const cards = await readdir(join(root, DIR, "cards"));
    const outcome = await edit(
      workspaceOn(root),
      CARD,
      REWRITTEN_ANSWER,
      "new",
    );
    expect(outcome.status).toBe("blocked");
    if (outcome.status !== "blocked") return;
    expect(outcome.report.errorCount).toBeGreaterThan(0);
    expect(await read(root, CARD)).toBe(before);
    expect(await readdir(join(root, DIR, "cards"))).toEqual(cards);
  });

  it("puts a new card title into the topic's list in the same write", async () => {
    const root = await goldenCopy();
    const outcome = await edit(workspaceOn(root), CARD, (text) =>
      text.replace(
        "# Reactive Streams: requesting items",
        "# Asking for items",
      ),
    );
    expect(outcome).toMatchObject({ status: "written", paths: [CARD, INDEX] });
    expect(await read(root, INDEX)).toContain(
      "- [Asking for items](cards/10dkrwp7.md)",
    );
  });

  it("dates a summary edit today in the configured zone unless the learner set the date", async () => {
    const root = await goldenCopy();
    const workspace = workspaceOn(root);
    const opened = await readSource(workspace, SUMMARY);
    const body = {
      path: SUMMARY,
      version: opened.version,
      text: opened.text.replace("## TL;DR\n\n", "## TL;DR\n\nIn short: "),
    };
    expect((await saveSource(workspace, body)).status).toBe("written");
    const dated = await read(root, SUMMARY);
    expect(dated).toContain("updated: 2026-11-28");
    expect(dated).toContain("In short: Backpressure");
    // The same save again finds its own text, dated by the server: done, not a conflict.
    expect((await saveSource(workspace, body)).status).toBe("unchanged");

    await edit(workspace, SUMMARY, (text) =>
      text.replace("updated: 2026-11-28", "updated: 2026-11-20"),
    );
    expect(await read(root, SUMMARY)).toContain("updated: 2026-11-20");
  });

  it("leaves every file as it was when the successor's transaction fails half way", async () => {
    const root = await goldenCopy();
    let renames = 0;
    const failing: TransactionFs = {
      ...nodeTransactionFs,
      rename: async (from, to) => {
        renames++;
        if (renames === 3) throw new Error("disk full");
        await nodeTransactionFs.rename(from, to);
      },
    };
    const workspace = workspaceOn(root, failing);
    const before = {
      card: await read(root, CARD),
      index: await read(root, INDEX),
    };
    await expect(
      edit(workspace, CARD, REWRITTEN_ANSWER, "new"),
    ).rejects.toThrow();
    expect(await read(root, CARD)).toBe(before.card);
    expect(await read(root, INDEX)).toBe(before.index);
  });

  it("never touches the review log", async () => {
    const root = await goldenCopy();
    const log = "reviews/2026/11/desk-web.jsonl";
    await mkdir(join(root, "reviews/2026/11"), { recursive: true });
    await writeFile(join(root, log), '{"v":1}\n');
    const workspace = workspaceOn(root);
    await edit(workspace, CARD, REWRITTEN_ANSWER, "new");
    await edit(workspace, SUMMARY, (text) => `${text}\nMore.\n`);
    expect(await read(root, log)).toBe('{"v":1}\n');
  });
});
