import { mkdir, rm, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyPath,
  parsePorcelainV2,
  readGitState,
  runGit,
  suggestCommitMessage,
} from "../src/index.js";
import { git, goldenRemote } from "./git-repo.js";
import { tempDir } from "./helpers.js";

const CARD = "content/architecture/backpressure/cards/0d1gjcys.md";
const OTHER_CARD = "content/architecture/backpressure/cards/10dkrwp7.md";

const records = (...lines: readonly string[]): string =>
  `${lines.join("\0")}\0`;

describe("parsing git status", () => {
  it("reads the branch header with upstream and divergence", () => {
    const parsed = parsePorcelainV2(
      records(
        "# branch.oid 1234",
        "# branch.head main",
        "# branch.upstream origin/main",
        "# branch.ab +2 -3",
      ),
    );
    expect(parsed.branch).toEqual({
      head: "main",
      upstream: "origin/main",
      ahead: 2,
      behind: 3,
    });
    expect(parsed.entries).toEqual([]);
  });

  it("notices conflicts left unsettled in the index", () => {
    expect(
      parsePorcelainV2(
        records(
          "# branch.head main",
          "u UU N... 100644 100644 100644 100644 a b c content/a/b/index.md",
        ),
      ).unmerged,
    ).toBe(true);
  });

  it("treats an upstream whose remote branch is gone as no upstream", () => {
    expect(
      parsePorcelainV2(
        records("# branch.head main", "# branch.upstream origin/old"),
      ).branch.upstream,
    ).toBeNull();
  });

  it("knows a detached HEAD and a branch without upstream", () => {
    expect(
      parsePorcelainV2(records("# branch.oid 1234", "# branch.head (detached)"))
        .branch,
    ).toEqual({ head: null, upstream: null, ahead: 0, behind: 0 });
  });

  it("reads a rename with its original path, deletions and untracked files in a new folder", () => {
    const parsed = parsePorcelainV2(
      records(
        "# branch.head main",
        `2 R. N... 100644 100644 100644 aaa bbb R100 content/a/b/cards/7k2m9xqd.md`,
        "content/a/c/cards/7k2m9xqd.md",
        `1 .D N... 100644 100644 000000 aaa aaa ${CARD}`,
        "? content/new/topic with space/index.md",
        `1 AD N... 000000 100644 000000 000 bbb content/a/b/gone.md`,
      ),
    );
    expect(parsed.entries).toEqual([
      {
        path: "content/a/b/cards/7k2m9xqd.md",
        change: "renamed",
        area: "card",
        topic: "a/b",
        card: "7k2m9xqd",
        from: "content/a/c/cards/7k2m9xqd.md",
      },
      {
        path: CARD,
        change: "deleted",
        area: "card",
        topic: "architecture/backpressure",
        card: "0d1gjcys",
      },
      {
        path: "content/new/topic with space/index.md",
        change: "untracked",
        area: "topic",
        topic: "new/topic with space",
      },
    ]);
  });
});

describe("classifying paths", () => {
  it("tells cards, topic files, the log, the inbox and everything else apart", () => {
    expect(classifyPath(CARD)).toEqual({
      area: "card",
      topic: "architecture/backpressure",
      card: "0d1gjcys",
    });
    expect(
      classifyPath("content/architecture/backpressure/diagrams/x.svg"),
    ).toEqual({ area: "topic", topic: "architecture/backpressure" });
    expect(
      classifyPath("content/architecture/backpressure/cards/notes.md"),
    ).toEqual({ area: "topic", topic: "architecture/backpressure" });
    expect(classifyPath("content/README.md")).toEqual({ area: "topic" });
    expect(classifyPath("reviews/desk1/web-2026-11.jsonl")).toEqual({
      area: "reviews",
    });
    expect(classifyPath("inbox/pkg.md")).toEqual({ area: "inbox" });
    expect(classifyPath(".codex/config.toml")).toEqual({ area: "other" });
  });
});

describe("the suggested commit message", () => {
  it("names reviews, touched topics and the device", () => {
    expect(
      suggestCommitMessage(
        [
          {
            path: "reviews/desk1/web.jsonl",
            change: "modified",
            area: "reviews",
          },
          { ...classifyPath(CARD), path: CARD, change: "modified" },
          { ...classifyPath(OTHER_CARD), path: OTHER_CARD, change: "deleted" },
          { path: ".codex/config.toml", change: "untracked", area: "other" },
        ],
        "desk1",
      ),
    ).toBe("chore: reviews and 1 topic from desk1");
    expect(
      suggestCommitMessage(
        [{ path: "reviews/x.jsonl", change: "modified", area: "reviews" }],
        "desk1",
      ),
    ).toBe("chore: reviews from desk1");
  });

  it("lists three parts with a comma and counts topics", () => {
    expect(
      suggestCommitMessage(
        [
          { path: "reviews/x.jsonl", change: "modified", area: "reviews" },
          {
            path: "content/a/b/index.md",
            change: "modified",
            area: "topic",
            topic: "a/b",
          },
          {
            path: "content/a/c/index.md",
            change: "added",
            area: "topic",
            topic: "a/c",
          },
          { path: "inbox/p.md", change: "untracked", area: "inbox" },
        ],
        "laptop",
      ),
    ).toBe("chore: reviews, 2 topics and inbox from laptop");
  });

  it("falls back to a plain sync when nothing will be committed", () => {
    expect(
      suggestCommitMessage(
        [{ path: ".codex/x", change: "untracked", area: "other" }],
        "desk1",
      ),
    ).toBe("chore: sync from desk1");
  });
});

describe("reading the repository's git state", () => {
  it("reports each kind of change with its area, topic and card", async () => {
    const { root } = await goldenRemote();
    await appendFile(join(root, CARD), "\nEdited.\n");
    await rm(join(root, OTHER_CARD));
    await writeFile(
      join(root, "content/architecture/backpressure/diagrams/extra.mmd"),
      "graph LR\n  a --> b\n",
    );
    await mkdir(join(root, "reviews/desk1"), { recursive: true });
    await writeFile(join(root, "reviews/desk1/web-2026-11.jsonl"), "{}\n");
    await mkdir(join(root, ".codex"));
    await writeFile(join(root, ".codex/config.toml"), "model = 'x'\n");

    const state = await readGitState(root);
    expect(state).toMatchObject({
      branch: "main",
      upstream: "origin/main",
      ahead: 0,
      behind: 0,
    });
    expect(state.blocked).toBeUndefined();
    expect(
      state.entries.map(({ path, change, area, card }) => ({
        path,
        change,
        area,
        card,
      })),
    ).toEqual([
      {
        path: ".codex/config.toml",
        change: "untracked",
        area: "other",
        card: undefined,
      },
      { path: CARD, change: "modified", area: "card", card: "0d1gjcys" },
      { path: OTHER_CARD, change: "deleted", area: "card", card: "10dkrwp7" },
      {
        path: "content/architecture/backpressure/diagrams/extra.mmd",
        change: "untracked",
        area: "topic",
        card: undefined,
      },
      {
        path: "reviews/desk1/web-2026-11.jsonl",
        change: "untracked",
        area: "reviews",
        card: undefined,
      },
    ]);
  });

  it("counts commits ahead of the upstream", async () => {
    const { root } = await goldenRemote();
    await appendFile(join(root, CARD), "\nEdited.\n");
    await git(root, "commit", "-qam", "local");
    expect((await readGitState(root)).ahead).toBe(1);
  });

  it("blocks Sync without an upstream, on a detached HEAD and during a merge", async () => {
    const { root } = await goldenRemote();
    await git(root, "branch", "--unset-upstream");
    expect((await readGitState(root)).blocked).toEqual({
      reason: "no-upstream",
    });
    await git(root, "branch", "--set-upstream-to=origin/main");
    await git(root, "checkout", "-q", "--detach");
    expect((await readGitState(root)).blocked).toEqual({ reason: "detached" });
    await git(root, "checkout", "-q", "main");
    const head = (await git(root, "rev-parse", "HEAD")).trim();
    await writeFile(join(root, ".git/MERGE_HEAD"), `${head}\n`);
    expect((await readGitState(root)).blocked).toEqual({
      reason: "operation-in-progress",
    });
  });

  it("blocks Sync outside a git repository", async () => {
    const dir = await tempDir();
    expect(await readGitState(dir)).toEqual({
      branch: null,
      upstream: null,
      ahead: 0,
      behind: 0,
      blocked: { reason: "not-a-repository" },
      entries: [],
    });
  });

  it("strips the content root's place inside a larger work tree", async () => {
    const top = await tempDir();
    await mkdir(join(top, "learn/content/a/b/cards"), { recursive: true });
    await git(top, "init", "-q", "-b", "main");
    await writeFile(join(top, "learn/content/a/b/cards/7k2m9xqd.md"), "x\n");
    await writeFile(join(top, "notes.md"), "x\n");
    const state = await readGitState(join(top, "learn"));
    expect(state.entries).toEqual([
      {
        path: "content/a/b/cards/7k2m9xqd.md",
        change: "untracked",
        area: "card",
        topic: "a/b",
        card: "7k2m9xqd",
      },
      { path: "notes.md", change: "untracked", area: "other" },
    ]);
  });
});

describe("running git", () => {
  it("passes shell characters through as one argument and never through a shell", async () => {
    const dir = await tempDir();
    const marker = join(dir, "pwned");
    const result = await runGit(dir, [
      "check-ref-format",
      "--allow-onelevel",
      `x; touch ${marker} $(touch ${marker})`,
    ]);
    expect(result.exitCode).not.toBe(0);
    expect(result.missing).toBe(false);
    await expect(
      import("node:fs/promises").then((fs) => fs.stat(marker)),
    ).rejects.toThrow();
  });
});
