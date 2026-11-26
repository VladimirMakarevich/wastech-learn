import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { CARD_ID_PATTERN } from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import { cli, goldenCopy, tempDir } from "./helpers.js";

const run = promisify(execFile);
const CARD = "content/dotnet/async-await/cards/capexe3a.md";

const event = (root: string, file: string, tool = "Edit"): string =>
  JSON.stringify({
    session_id: "s",
    hook_event_name: "PostToolUse",
    cwd: root,
    tool_name: tool,
    tool_input: {
      file_path: join(root, file),
      old_string: "a",
      new_string: "b",
    },
    tool_response: { success: true },
  });

describe("wastech-learn new-id", () => {
  it("prints 8 lower-case Crockford base32 characters", async () => {
    const result = await cli(["new-id", "--content", await tempDir()]);
    expect(result.code).toBe(0);
    expect(result.out).toMatch(CARD_ID_PATTERN);
  });

  it("is deterministic for one seed and prints --count distinct ids", async () => {
    const root = await tempDir();
    const first = await cli(["new-id", "--count", "5", "--content", root]);
    const second = await cli(["new-id", "--count", "5", "--content", root]);
    expect(first.out).toBe(second.out);
    const ids = first.out.split("\n");
    expect(new Set(ids).size).toBe(5);
    for (const id of ids) expect(id).toMatch(CARD_ID_PATTERN);
  });

  it("avoids ids already used in the content repository", async () => {
    const root = await goldenCopy();
    const fresh = (
      await cli(["new-id", "--count", "3", "--content", await tempDir()])
    ).out.split("\n");
    const taken = fresh[0]!;
    await writeFile(
      join(root, `content/dotnet/async-await/cards/${taken}.md`),
      await readFile(join(root, CARD), "utf8"),
    );
    const ids = (
      await cli(["new-id", "--count", "3", "--content", root])
    ).out.split("\n");
    expect(ids).not.toContain(taken);
  });

  it("refuses a count that is not a whole positive number", async () => {
    expect((await cli(["new-id", "--count", "0"])).code).toBe(2);
    expect((await cli(["new-id", "--count", "1000"])).code).toBe(2);
  });
});

describe("wastech-learn hook post-tool-use", () => {
  it("reports a card edited into a violation on stderr with exit code 2", async () => {
    const root = await goldenCopy();
    const path = join(root, CARD);
    const answer =
      "`ACB`: до первого незавершённого `await` метод выполняется синхронно.";
    await writeFile(
      path,
      (await readFile(path, "utf8")).replace(
        answer,
        `${answer} И ещё много лишних слов, которые не нужны в ответе.`,
      ),
    );
    const result = await cli(
      ["hook", "post-tool-use", "--content", root, "--lang", "en"],
      root,
      event(root, CARD),
    );
    expect(result.code).toBe(2);
    expect(result.err).toContain(`${CARD}:`);
    expect(result.err).toContain("answer-words");
    expect(result.err).toContain(
      `${CARD} has findings: fix them before going on`,
    );
    expect(result.out).toBe("");
  });

  it("passes a clean content file with exit code 0", async () => {
    const root = await goldenCopy();
    const result = await cli(
      ["hook", "post-tool-use"],
      root,
      event(root, CARD, "Write"),
    );
    expect(result).toMatchObject({ code: 0, err: "" });
  });

  it("does not check a file outside content/ and exits 0", async () => {
    const root = await goldenCopy();
    await writeFile(
      join(root, "notes.md"),
      "no front matter, broken [link](missing.md)\n",
    );
    const result = await cli(
      ["hook", "post-tool-use"],
      root,
      event(root, "notes.md"),
    );
    expect(result).toMatchObject({ code: 0, err: "" });
  });

  it("reports a stale diagram after its source was edited", async () => {
    const root = await goldenCopy();
    const source = "content/architecture/backpressure/diagrams/demand-flow.mmd";
    await writeFile(
      join(root, source),
      `${await readFile(join(root, source), "utf8")}%% edited\n`,
    );
    const result = await cli(
      ["hook", "post-tool-use", "--lang", "en"],
      root,
      event(root, source),
    );
    expect(result.code).toBe(2);
    expect(result.err).toContain("diagram-stale");
  });

  it("exits 1 without blocking when stdin holds no tool event", async () => {
    const result = await cli(
      ["hook", "post-tool-use", "--lang", "en"],
      await tempDir(),
      "not json",
    );
    expect(result.code).toBe(1);
    expect(result.err).toBe(
      "No tool event on stdin: run this command from a PostToolUse hook",
    );
  });

  it("answers a hook command line it cannot run with exit 1, so the agent is not blocked", async () => {
    expect((await cli(["hook", "pre-tool-use"])).code).toBe(1);
    expect((await cli(["hook"])).code).toBe(1);
  });

  it("reports an error the edit caused in another file", async () => {
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
    const summary = "content/architecture/backpressure/summary.md";
    const path = join(root, summary);
    await writeFile(
      path,
      (await readFile(path, "utf8")).replace(
        "## Comparison",
        "## Side by side",
      ),
    );
    const result = await cli(
      ["hook", "post-tool-use", "--lang", "en"],
      root,
      event(root, summary),
    );
    expect(result.code).toBe(2);
    expect(result.err).toContain("REF-002");
    expect(result.err).toContain("cards/");
  });
});
