import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { seededRng } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import {
  REQUESTS_FILE,
  openWorkspace,
  runIdempotent,
  validateOverlay,
  type Workspace,
} from "../src/index.js";
import { goldenCopy } from "./helpers.js";

const CARD = "content/architecture/backpressure/cards/0d1gjcys.md";
const INDEX = "content/architecture/backpressure/index.md";

const workspaceOn = (root: string): Workspace =>
  openWorkspace({
    root,
    now: () => new Date("2026-11-26T18:00:00.000Z"),
    random: seededRng(1),
  });

describe("validateOverlay", () => {
  it("reports nothing for the golden sample as it is", async () => {
    const workspace = workspaceOn(await goldenCopy());
    const report = await validateOverlay(workspace, new Map(), {
      touched: [CARD, INDEX],
    });
    expect(report).toMatchObject({ errorCount: 0, warningCount: 0 });
  });

  it("sees a new card and the index that links it as one change", async () => {
    const root = await goldenCopy();
    const workspace = workspaceOn(root);
    const card = (await readFile(join(root, CARD), "utf8")).replace(
      "id: 0d1gjcys",
      "id: zzzzzzzz",
    );
    const index = (await readFile(join(root, INDEX), "utf8")).replace(
      "## Cards\n",
      "## Cards\n\n- [Copy](cards/zzzzzzzz.md)",
    );
    const alone = await validateOverlay(workspace, new Map([[INDEX, index]]));
    expect(alone.lint.map((finding) => finding.ruleId)).toContain("REF-001");
    const together = await validateOverlay(
      workspace,
      new Map([
        [INDEX, index],
        ["content/architecture/backpressure/cards/zzzzzzzz.md", card],
      ]),
    );
    expect(together.errorCount).toBe(0);
  });

  it("reports a duplicate id in a draft against the whole repository", async () => {
    const root = await goldenCopy();
    const draft = await readFile(join(root, CARD), "utf8");
    const path = "content/architecture/backpressure/cards/aaaaaaaa.md";
    const report = await validateOverlay(
      workspaceOn(root),
      new Map([[path, draft]]),
    );
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "id-unique",
          file: path,
          params: { id: "0d1gjcys", other: CARD },
        }),
      ]),
    );
  });
});

describe("runIdempotent", () => {
  const NOW = new Date("2026-11-26T18:00:00.000Z");
  const call = {
    tool: "add_cards",
    requestId: "r-1",
    input: { topic: "a/b", requestId: "r-1" },
    now: NOW,
  };

  it("returns the first result for a repeated id and input, even from a fresh process", async () => {
    const root = await goldenCopy();
    let runs = 0;
    const write = () => {
      runs++;
      return Promise.resolve({ result: { run: runs }, written: true });
    };
    expect(await runIdempotent(root, call, write)).toEqual({ run: 1 });
    expect(
      await runIdempotent(
        root,
        { ...call, input: { requestId: "r-1", topic: "a/b" } },
        write,
      ),
    ).toEqual({
      run: 1,
    });
    expect(runs).toBe(1);
    expect(await readFile(join(root, REQUESTS_FILE), "utf8")).toContain(
      '"requestId":"r-1"',
    );
  });

  it("refuses the same id for another input or tool", async () => {
    const root = await goldenCopy();
    const write = () => Promise.resolve({ result: {}, written: true });
    await runIdempotent(root, call, write);
    await expect(
      runIdempotent(
        root,
        { ...call, input: { topic: "a/c", requestId: "r-1" } },
        write,
      ),
    ).rejects.toMatchObject({ code: "request-id-reused", subject: "r-1" });
    await expect(
      runIdempotent(root, { ...call, tool: "save_summary" }, write),
    ).rejects.toMatchObject({
      code: "request-id-reused",
    });
  });

  it("treats an id past its lifetime as new, so a rating next week is recorded", async () => {
    const root = await goldenCopy();
    let runs = 0;
    const write = () => {
      runs++;
      return Promise.resolve({ result: { run: runs }, written: true });
    };
    const rated = { ...call, tool: "record_review", lifetimeMs: 600_000 };
    await runIdempotent(root, rated, write);
    expect(
      await runIdempotent(
        root,
        { ...rated, now: new Date(NOW.getTime() + 60_000) },
        write,
      ),
    ).toEqual({ run: 1 });
    expect(
      await runIdempotent(
        root,
        { ...rated, now: new Date(NOW.getTime() + 7 * 86_400_000) },
        write,
      ),
    ).toEqual({ run: 2 });
  });

  it("returns the written result even when the record cannot be kept", async () => {
    const root = await goldenCopy();
    await mkdir(join(root, ".cache/mcp"), { recursive: true });
    await writeFile(join(root, REQUESTS_FILE), "");
    await chmod(join(root, REQUESTS_FILE), 0o444);
    const result = await runIdempotent(root, call, () =>
      Promise.resolve({ result: { ok: true }, written: true }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("forgets a call that wrote nothing, so it can be retried with the same id", async () => {
    const root = await goldenCopy();
    let runs = 0;
    const blocked = () => {
      runs++;
      return Promise.resolve({ result: { blocked: true }, written: false });
    };
    await runIdempotent(root, call, blocked);
    await runIdempotent(root, call, blocked);
    expect(runs).toBe(2);
  });
});
