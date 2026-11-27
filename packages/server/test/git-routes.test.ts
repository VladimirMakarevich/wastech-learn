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
