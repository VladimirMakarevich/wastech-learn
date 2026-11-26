import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { checkRepository, readGitBaseline } from "../src/index.js";
import { goldenCopy } from "./helpers.js";

const run = promisify(execFile);
const CARD = "content/architecture/backpressure/cards/0d1gjcys.md";

const commitAll = async (root: string): Promise<void> => {
  await run("git", ["-C", root, "init", "-q"]);
  await run("git", ["-C", root, "add", "."]);
  await run("git", [
    "-C",
    root,
    "-c",
    "user.name=test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "-q",
    "-m",
    "golden",
  ]);
};

describe("checkRepository", () => {
  it("warns about a large rewrite of a committed active card", async () => {
    const root = await goldenCopy();
    await commitAll(root);
    const path = join(root, CARD);
    const text = await readFile(path, "utf8");
    await writeFile(
      path,
      text.replace(
        "So the producer never sends more than the consumer can buffer and process.",
        "Because retries with jitter spread load after a timeout.",
      ),
    );
    const result = await checkRepository(root);
    expect(result.findings).toMatchObject([
      {
        ruleId: "active-edit",
        severity: "warning",
        file: CARD,
        params: { section: "Answer" },
      },
    ]);
    expect(result.errorCount).toBe(0);
  });

  it("reads no baseline outside a git repository", async () => {
    expect(await readGitBaseline(await goldenCopy())).toEqual(new Map());
  });

  it("warns when the content copy of the preset drops a rule, and accepts an extra one", async () => {
    const root = await goldenCopy();
    const path = join(root, "wastech-mdlint.config.json");
    const text = await readFile(path, "utf8");
    const withoutSize = text.replace(
      /\{\s*"rule": "SIZE-001",[\s\S]*?\n {4}\},\n/,
      "",
    );
    expect(withoutSize).not.toContain("SIZE-001");
    await writeFile(path, withoutSize);
    const dropped = await checkRepository(root);
    expect(dropped.findings).toMatchObject([
      {
        ruleId: "preset-drift",
        severity: "warning",
        params: { rule: "SIZE-001" },
      },
    ]);
    expect(dropped.errorCount).toBe(0);

    await writeFile(
      path,
      text.replace(
        '"rules": [',
        '"rules": [\n    { "rule": "custom", "id": "MINE", "options": {} },',
      ),
    );
    expect((await checkRepository(root)).findings).toEqual([]);
  });
});
