import { appendFile, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gitStateSchema } from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import { git, goldenRemote } from "./git-repo.js";
import {
  CARD,
  LOG,
  get,
  goldenCopy,
  post,
  serverOver,
  webEvent,
} from "./helpers.js";

const OTHER_CARD = "content/architecture/backpressure/cards/0d1gjcys.md";

const gitState = async (
  server: Awaited<ReturnType<typeof serverOver>>["server"],
) => {
  const response = await get(server, "/api/git");
  expect(response.status).toBe(200);
  return gitStateSchema.parse(await response.json());
};

describe("GET /api/git", () => {
  it("reports what is not committed, by area, with the suggested message", async () => {
    const { root } = await goldenRemote();
    await writeFile(join(root, "learn.local.json"), '{ "device": "desk1" }\n');
    await appendFile(join(root, CARD), "\nEdited.\n");
    await rm(join(root, OTHER_CARD));
    await writeFile(
      join(root, "content/architecture/backpressure/diagrams/extra.mmd"),
      "graph LR\n  a --> b\n",
    );
    await mkdir(join(root, "reviews/desk1"), { recursive: true });
    await writeFile(join(root, LOG), "{}\n");
    await mkdir(join(root, ".codex"));
    await writeFile(join(root, ".codex/config.toml"), "model = 'x'\n");
    const { server } = await serverOver(root);

    const state = await gitState(server);
    expect(state).toMatchObject({
      branch: "main",
      upstream: "origin/main",
      ahead: 0,
      behind: 0,
      suggestedMessage: "chore: reviews and 1 topic from desk1",
    });
    expect(state.blocked).toBeUndefined();
    expect(state.entries.map((entry) => [entry.area, entry.change])).toEqual([
      ["other", "untracked"],
      ["card", "deleted"],
      ["card", "modified"],
      ["topic", "untracked"],
      ["reviews", "untracked"],
    ]);
    expect(state.entries[1]).toMatchObject({
      topic: "architecture/backpressure",
      card: "0d1gjcys",
    });
  });

  it("says why Sync is off without an upstream, on a detached HEAD and during a merge", async () => {
    const { root } = await goldenRemote();
    const { server } = await serverOver(root);
    await git(root, "branch", "--unset-upstream");
    expect((await gitState(server)).blocked).toEqual({ reason: "no-upstream" });
    await git(root, "checkout", "-q", "--detach");
    expect((await gitState(server)).blocked).toEqual({ reason: "detached" });
    await git(root, "checkout", "-q", "main");
    const head = (await git(root, "rev-parse", "HEAD")).trim();
    await writeFile(join(root, ".git/MERGE_HEAD"), `${head}\n`);
    expect((await gitState(server)).blocked).toEqual({
      reason: "operation-in-progress",
    });
  });

  it("says the folder is not a repository instead of failing", async () => {
    const { server } = await serverOver(await goldenCopy());
    expect((await gitState(server)).blocked).toEqual({
      reason: "not-a-repository",
    });
  });
});

describe("git-changed", () => {
  it("is announced after the app's own append, which the watcher keeps quiet about", async () => {
    const { root } = await goldenRemote();
    await writeFile(join(root, "learn.local.json"), '{ "device": "desk1" }\n');
    const { server } = await serverOver(root);
    const stream = await get(server, "/api/changes");
    const reader =
      stream.body!.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    const response = await post(
      server,
      "/api/events",
      JSON.stringify([webEvent()]),
    );
    expect(response.status).toBe(200);
    // Read until the event arrives: a keepalive or another event may come first.
    let text = "";
    while (!text.includes("event: git-changed")) {
      const { value, done } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
    expect(text).toContain("event: git-changed");
    await reader.cancel();
    expect((await gitState(server)).entries).toEqual([
      expect.objectContaining({ path: LOG, area: "reviews" }),
    ]);
  });
});

const sync = (
  server: Awaited<ReturnType<typeof serverOver>>["server"],
  message: string,
  headers: Record<string, string> = {},
) => post(server, "/api/git/sync", JSON.stringify({ message }), headers);

describe("POST /api/git/sync and /api/git/pull", () => {
  it("commits, pushes and answers what happened", async () => {
    const { root, bare } = await goldenRemote();
    await appendFile(join(root, CARD), "\nEdited.\n");
    const { server } = await serverOver(root);

    const response = await sync(server, "chore: 1 topic from desk1");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      committed: 1,
      pulled: 0,
      pushed: 1,
    });
    expect((await git(bare, "log", "-1", "--format=%s", "main")).trim()).toBe(
      "chore: 1 topic from desk1",
    );
  });

  it("answers a conflict with the file and leaves the commit where it was", async () => {
    const { root, clone } = await goldenRemote();
    const laptop = await clone();
    await appendFile(join(laptop, CARD), "\nLaptop.\n");
    await git(laptop, "commit", "-qam", "laptop edit");
    await git(laptop, "push", "-q");
    await appendFile(join(root, CARD), "\nDesk.\n");
    await git(root, "commit", "-qam", "desk edit");
    const head = await git(root, "rev-parse", "HEAD");
    const { server } = await serverOver(root);

    const response = await sync(server, "chore: sync");

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "conflict", files: [CARD] });
    expect(await git(root, "rev-parse", "HEAD")).toBe(head);
    expect(await git(root, "status", "--porcelain")).toBe("");
  });

  it("refuses with the block reason when there is no upstream", async () => {
    const { root } = await goldenRemote();
    await git(root, "branch", "--unset-upstream");
    const { server } = await serverOver(root);
    const response = await post(server, "/api/git/pull", "{}");
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "blocked",
      blocked: { reason: "no-upstream" },
    });
  });

  it("is busy while another git holds the index", async () => {
    const { root } = await goldenRemote();
    await writeFile(join(root, ".git/index.lock"), "");
    const { server } = await serverOver(root);
    expect(await (await sync(server, "m")).json()).toEqual({ code: "busy" });
  });

  it("runs two presses one after the other, the second seeing the first's result", async () => {
    const { root, bare } = await goldenRemote();
    await appendFile(join(root, CARD), "\nEdited.\n");
    const { server } = await serverOver(root);

    const [first, second] = await Promise.all([
      sync(server, "chore: first"),
      sync(server, "chore: second"),
    ]);

    expect(await first.json()).toEqual({ committed: 1, pulled: 0, pushed: 1 });
    expect(await second.json()).toEqual({
      committed: 0,
      pulled: 0,
      pushed: 0,
    });
    expect((await git(bare, "rev-list", "--count", "main")).trim()).toBe("2");
  });

  it("refuses an empty message, another field, another Origin and a body that is not JSON", async () => {
    const { root } = await goldenRemote();
    await appendFile(join(root, CARD), "\nEdited.\n");
    const { server } = await serverOver(root);

    const empty = await sync(server, "  ");
    expect(empty.status).toBe(400);
    expect(await empty.json()).toMatchObject({
      code: "body-invalid",
      field: "message",
    });
    const extra = await post(server, "/api/git/pull", '{"force":true}');
    expect(extra.status).toBe(400);
    const foreign = await sync(server, "m", {
      origin: "http://evil.test",
    });
    expect(foreign.status).toBe(403);
    const text = await sync(server, "m", { "content-type": "text/plain" });
    expect(text.status).toBe(415);
    expect(await git(root, "rev-list", "--count", "HEAD")).toBe("1\n");
  });
});
