import {
  appendFile,
  chmod,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pullRepository, syncRepository } from "../src/index.js";
import { git, goldenRemote } from "./git-repo.js";
import { tempDir } from "./helpers.js";

const CARD = "content/architecture/backpressure/cards/0d1gjcys.md";
const LOG = "reviews/desk1/web-2026-11.jsonl";
const NEW_CARD = "content/architecture/backpressure/cards/zz9zz9zz.md";

// Without the branch header: a failed sync may still have fetched, which moves only the upstream ref.
const status = async (root: string): Promise<string> =>
  `${await git(root, "rev-parse", "HEAD")}${await git(root, "status", "--porcelain=v2")}`;

const committedPaths = async (bare: string): Promise<string[]> =>
  (await git(bare, "show", "--name-only", "--format=", "main"))
    .trim()
    .split("\n")
    .sort();

const writeLog = async (root: string): Promise<void> => {
  await mkdir(join(root, "reviews/desk1"), { recursive: true });
  await appendFile(join(root, LOG), '{"v":1}\n');
};

/** A stand-in for ssh that answers like a server refusing the key, so no test opens the network. */
const fakeSsh = async (body: string): Promise<string> => {
  const script = join(await tempDir(), "ssh");
  await writeFile(script, `#!/bin/sh\n${body}\n`);
  await chmod(script, 0o755);
  return script;
};

describe("Sync", () => {
  it("commits only content, reviews and inbox with the owner's message and pushes it", async () => {
    const { root, bare } = await goldenRemote();
    await appendFile(join(root, CARD), "\nEdited.\n");
    await writeLog(root);
    await mkdir(join(root, ".codex"));
    await writeFile(join(root, ".codex/config.toml"), "x = 1\n");

    const outcome = await syncRepository(
      root,
      "chore: reviews and 1 topic from desk1",
    );

    expect(outcome).toEqual({
      ok: true,
      result: { committed: 1, pulled: 0, pushed: 1 },
    });
    expect(await committedPaths(bare)).toEqual([CARD, LOG]);
    expect((await git(bare, "log", "-1", "--format=%s", "main")).trim()).toBe(
      "chore: reviews and 1 topic from desk1",
    );
    expect(await git(root, "status", "--porcelain")).toBe("?? .codex/\n");
  });

  it("keeps what the owner staged by hand outside the commit", async () => {
    const { root, bare } = await goldenRemote();
    await appendFile(join(root, CARD), "\nEdited.\n");
    await writeFile(join(root, "notes.md"), "mine\n");
    await git(root, "add", "notes.md");

    expect((await syncRepository(root, "chore: sync")).ok).toBe(true);

    expect(await committedPaths(bare)).toEqual([CARD]);
    expect(await git(root, "status", "--porcelain")).toBe("A  notes.md\n");
  });

  it("puts a message with shell characters into the commit as plain text", async () => {
    const { root, bare } = await goldenRemote();
    const marker = join(root, "pwned");
    await appendFile(join(root, CARD), "\nEdited.\n");
    const message = `#42 fix; rm -rf / $(touch ${marker}) \`touch ${marker}\` --amend`;

    expect((await syncRepository(root, message)).ok).toBe(true);

    expect((await git(bare, "log", "-1", "--format=%B", "main")).trim()).toBe(
      message,
    );
    await expect(stat(marker)).rejects.toThrow();
    expect((await git(bare, "rev-list", "--count", "main")).trim()).toBe("2");
  });

  it("brings in the other computer's commit when there is nothing to commit", async () => {
    const { root, clone } = await goldenRemote();
    const laptop = await clone();
    await writeFile(join(laptop, NEW_CARD), "new\n");
    await git(laptop, "add", "--all");
    await git(laptop, "commit", "-qm", "laptop card");
    await git(laptop, "push", "-q");

    const outcome = await syncRepository(root, "chore: sync");

    expect(outcome).toEqual({
      ok: true,
      result: { committed: 0, pulled: 1, pushed: 0 },
    });
    expect(await readFile(join(root, NEW_CARD), "utf8")).toBe("new\n");
  });

  it("rebases a local commit over the other computer's and pushes both", async () => {
    const { root, bare, clone } = await goldenRemote();
    const laptop = await clone();
    await writeFile(join(laptop, NEW_CARD), "new\n");
    await git(laptop, "add", "--all");
    await git(laptop, "commit", "-qm", "laptop card");
    await git(laptop, "push", "-q");
    await writeLog(root);

    const outcome = await syncRepository(root, "chore: reviews from desk1");

    expect(outcome).toEqual({
      ok: true,
      result: { committed: 1, pulled: 1, pushed: 1 },
    });
    expect((await git(bare, "rev-list", "--count", "main")).trim()).toBe("3");
    expect((await git(root, "log", "--merges", "--format=%H")).trim()).toBe("");
  });

  it("gives a conflict back with the file and leaves the repository as it found it", async () => {
    const { root, clone } = await goldenRemote();
    const laptop = await clone();
    await appendFile(join(laptop, CARD), "\nLaptop.\n");
    await git(laptop, "commit", "-qam", "laptop edit");
    await git(laptop, "push", "-q");
    await appendFile(join(root, CARD), "\nDesk.\n");
    await git(root, "commit", "-qam", "desk edit");
    await writeLog(root);
    const head = await git(root, "rev-parse", "HEAD");
    const before = await status(root);
    const card = await readFile(join(root, CARD), "utf8");

    const outcome = await syncRepository(root, "chore: reviews from desk1");

    expect(outcome).toEqual({
      ok: false,
      failure: { code: "conflict", files: [CARD] },
    });
    await expect(stat(join(root, ".git/rebase-merge"))).rejects.toThrow();
    expect(await git(root, "rev-parse", "HEAD")).toBe(head);
    expect(await readFile(join(root, CARD), "utf8")).toBe(card);
    expect(await status(root)).toBe(before);
  });

  it("asks for the terminal when the remote wants credentials, without waiting for them", async () => {
    const { root } = await goldenRemote();
    await git(
      root,
      "remote",
      "set-url",
      "origin",
      "ssh://git@example.test/content.git",
    );
    await writeLog(root);
    const before = await status(root);
    const ssh = await fakeSsh(
      'echo "git@example.test: Permission denied (publickey)." >&2\necho "fatal: Could not read from remote repository." >&2\nexit 255',
    );

    const outcome = await syncRepository(root, "chore: sync", {
      env: { GIT_SSH_COMMAND: ssh, GIT_ASKPASS: "false" },
    });

    expect(outcome).toEqual({ ok: false, failure: { code: "auth-required" } });
    expect(await status(root)).toBe(before);
  });

  it("stops a remote that hangs at the timeout", async () => {
    const { root } = await goldenRemote();
    await git(
      root,
      "remote",
      "set-url",
      "origin",
      "ssh://git@example.test/content.git",
    );
    const ssh = await fakeSsh("sleep 30");
    const started = Date.now();

    const outcome = await pullRepository(root, {
      env: { GIT_SSH_COMMAND: ssh },
      networkTimeoutMs: 500,
    });

    expect(outcome).toEqual({ ok: false, failure: { code: "auth-required" } });
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it("says who to configure when git has no identity, and commits nothing", async () => {
    const { root, bare } = await goldenRemote();
    await git(root, "config", "--unset", "user.name");
    await git(root, "config", "--unset", "user.email");
    await git(root, "config", "user.useConfigOnly", "true");
    await writeLog(root);
    const before = await status(root);

    const outcome = await syncRepository(root, "chore: sync");

    expect(outcome).toEqual({
      ok: false,
      failure: { code: "identity-missing" },
    });
    expect(await status(root)).toBe(before);
    expect((await git(bare, "rev-list", "--count", "main")).trim()).toBe("1");
  });

  it("runs the owner's pre-commit hook and leaves the index as it was when it refuses", async () => {
    const { root } = await goldenRemote();
    const hook = join(root, ".git/hooks/pre-commit");
    await writeFile(
      hook,
      "#!/bin/sh\necho 'lint failed in summary.md' >&2\nexit 1\n",
    );
    await chmod(hook, 0o755);
    await writeLog(root);
    const before = await status(root);

    const outcome = await syncRepository(root, "chore: sync");

    expect(outcome).toEqual({
      ok: false,
      failure: { code: "git-failed", detail: "lint failed in summary.md" },
    });
    expect(await status(root)).toBe(before);
  });

  it("is blocked without an upstream and busy while another git holds the index", async () => {
    const { root } = await goldenRemote();
    await writeFile(join(root, ".git/index.lock"), "");
    expect(await syncRepository(root, "m")).toEqual({
      ok: false,
      failure: { code: "busy" },
    });
    await import("node:fs/promises").then((fs) =>
      fs.rm(join(root, ".git/index.lock")),
    );
    await git(root, "branch", "--unset-upstream");
    expect(await syncRepository(root, "m")).toEqual({
      ok: false,
      failure: { code: "blocked", blocked: { reason: "no-upstream" } },
    });
  });
});

describe("Sync on the edges", () => {
  it("commits a file whose name holds pathspec characters as that one file", async () => {
    const { root, bare } = await goldenRemote();
    const odd = "content/architecture/backpressure/notes[1]*.md";
    await writeFile(join(root, odd), "odd\n");

    expect((await syncRepository(root, "chore: odd")).ok).toBe(true);
    expect(await committedPaths(bare)).toEqual([odd]);
  });

  it("runs the owner's hooks without its own pathspec settings", async () => {
    const { root } = await goldenRemote();
    const hook = join(root, ".git/hooks/pre-commit");
    await writeFile(
      hook,
      '#!/bin/sh\nif [ -n "$GIT_LITERAL_PATHSPECS" ]; then echo leaked >&2; exit 1; fi\n',
    );
    await chmod(hook, 0o755);
    await writeLog(root);

    expect((await syncRepository(root, "chore: sync")).ok).toBe(true);
  });

  it("commits a card the owner removed with git rm", async () => {
    const { root, bare } = await goldenRemote();
    await git(root, "rm", "-q", CARD);

    expect((await syncRepository(root, "chore: remove")).ok).toBe(true);
    expect(await committedPaths(bare)).toEqual([CARD]);
  });

  it("counts commits an earlier fetch already brought to the upstream ref", async () => {
    const { root, clone } = await goldenRemote();
    const laptop = await clone();
    await writeFile(join(laptop, NEW_CARD), "new\n");
    await git(laptop, "add", "--all");
    await git(laptop, "commit", "-qm", "laptop card");
    await git(laptop, "push", "-q");
    await git(root, "fetch", "-q");

    expect(await syncRepository(root, "chore: sync")).toEqual({
      ok: true,
      result: { committed: 0, pulled: 1, pushed: 0 },
    });
  });

  it("says the remote is out of reach instead of asking for credentials when offline", async () => {
    const { root } = await goldenRemote();
    await git(
      root,
      "remote",
      "set-url",
      "origin",
      "ssh://git@example.test/content.git",
    );
    const ssh = await fakeSsh(
      'echo "ssh: Could not resolve hostname example.test: Name or service not known" >&2\necho "fatal: Could not read from remote repository." >&2\nexit 255',
    );
    expect(
      await pullRepository(root, { env: { GIT_SSH_COMMAND: ssh } }),
    ).toEqual({
      ok: false,
      failure: { code: "offline" },
    });
  });

  it("reports a hook that prints permission denied as a plain failure", async () => {
    const { root } = await goldenRemote();
    const hook = join(root, ".git/hooks/pre-commit");
    await writeFile(
      hook,
      "#!/bin/sh\necho 'Permission denied: lint.sh' >&2\nexit 1\n",
    );
    await chmod(hook, 0o755);
    await writeLog(root);
    expect(await syncRepository(root, "chore: sync")).toEqual({
      ok: false,
      failure: { code: "git-failed", detail: "Permission denied: lint.sh" },
    });
  });
});

describe("Pull", () => {
  it("brings the other computer's card in and keeps an uncommitted edit in place", async () => {
    const { root, clone } = await goldenRemote();
    const laptop = await clone();
    await writeFile(join(laptop, NEW_CARD), "new\n");
    await git(laptop, "add", "--all");
    await git(laptop, "commit", "-qm", "laptop card");
    await git(laptop, "push", "-q");
    await appendFile(join(root, CARD), "\nDesk.\n");

    const outcome = await pullRepository(root);

    expect(outcome).toEqual({
      ok: true,
      result: { committed: 0, pulled: 1, pushed: 0 },
    });
    expect(await readFile(join(root, NEW_CARD), "utf8")).toBe("new\n");
    expect(await readFile(join(root, CARD), "utf8")).toContain("Desk.");
    expect(await git(root, "stash", "list")).toBe("");
  });
});
