import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { seededRng } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import {
  checkRepository,
  deleteCard,
  openWorkspace,
  restoreCard,
  setCardStatus,
  setTopicStatus,
  type Workspace,
} from "../src/index.js";
import { git, goldenRemote } from "./git-repo.js";

const CARD = "content/architecture/backpressure/cards/10dkrwp7.md";
const INDEX = "content/architecture/backpressure/index.md";

const workspaceOn = (root: string): Workspace =>
  openWorkspace({
    root,
    now: () => new Date("2026-11-26T18:00:00.000Z"),
    random: seededRng(1),
  });

const read = (root: string, path: string): Promise<string> =>
  readFile(join(root, path), "utf8");

const exists = async (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false,
  );

describe("deleting a card", () => {
  it("removes the file and its line in the index, and the repository still checks clean", async () => {
    const { root } = await goldenRemote();

    const outcome = await deleteCard(workspaceOn(root), "10dkrwp7");

    expect(outcome.status).toBe("written");
    expect(await exists(join(root, CARD))).toBe(false);
    expect(await read(root, INDEX)).not.toContain("cards/10dkrwp7.md");
    const check = await checkRepository(root);
    expect(check.findings.filter((f) => f.severity === "error")).toEqual([]);
  });

  it("refuses a card that does not exist", async () => {
    const { root } = await goldenRemote();
    await expect(
      deleteCard(workspaceOn(root), "zzzzzzzz"),
    ).rejects.toMatchObject({ code: "card-not-found" });
  });
});

describe("undoing a deletion before it is committed", () => {
  it("brings the committed text back and puts the line back in place, keeping other index edits", async () => {
    const { root } = await goldenRemote();
    const card = await read(root, CARD);
    const committedIndex = await read(root, INDEX);
    const workspace = workspaceOn(root);
    await deleteCard(workspace, "10dkrwp7");
    const index = await read(root, INDEX);
    await writeFile(
      join(root, INDEX),
      index.replace("## Key idea\n", "## Key idea\n\nA note added later.\n"),
    );

    const outcome = await restoreCard(workspace, "10dkrwp7");

    expect(outcome.status).toBe("written");
    expect(await read(root, CARD)).toBe(card);
    const restored = await read(root, INDEX);
    expect(restored).toContain("A note added later.");
    const cardsOf = (text: string) => text.slice(text.indexOf("## Cards"));
    expect(cardsOf(restored)).toBe(cardsOf(committedIndex));
  });

  it("says there is nothing to bring back for a card that was not deleted", async () => {
    const { root } = await goldenRemote();
    await expect(
      restoreCard(workspaceOn(root), "10dkrwp7"),
    ).rejects.toMatchObject({
      code: "nothing-to-restore",
    });
  });

  it("says there is nothing to bring back once the deletion is committed", async () => {
    const { root } = await goldenRemote();
    await deleteCard(workspaceOn(root), "10dkrwp7");
    await git(root, "commit", "-qam", "delete");
    await expect(
      restoreCard(workspaceOn(root), "10dkrwp7"),
    ).rejects.toMatchObject({
      code: "nothing-to-restore",
    });
  });
});

describe("the status of a card and a topic", () => {
  it("archives a card and returns it, touching only its status", async () => {
    const { root } = await goldenRemote();
    const before = await read(root, CARD);
    const workspace = workspaceOn(root);

    expect((await setCardStatus(workspace, "10dkrwp7", "retired")).status).toBe(
      "written",
    );
    expect(await read(root, CARD)).toBe(
      before.replace(/^status: active$/m, "status: retired"),
    );
    await setCardStatus(workspace, "10dkrwp7", "active");
    expect(await read(root, CARD)).toBe(before);
  });

  it("archives a topic and returns it", async () => {
    const { root } = await goldenRemote();
    const before = await read(root, INDEX);
    const workspace = workspaceOn(root);
    await setTopicStatus(workspace, "architecture/backpressure", "archived");
    expect(await read(root, INDEX)).toBe(
      before.replace(/^status: active$/m, "status: archived"),
    );
    await setTopicStatus(workspace, "architecture/backpressure", "active");
    expect(await read(root, INDEX)).toBe(before);
  });

  it("blocks a status change on a card that does not pass the checks, and writes nothing", async () => {
    const { root } = await goldenRemote();
    // A question far past the word limit: the card still parses, but `check` reports an error in it.
    const broken = (await read(root, CARD)).replace(
      "## Question\n",
      `## Question\n\n${"word ".repeat(80)}\n`,
    );
    await writeFile(join(root, CARD), broken);

    const outcome = await setCardStatus(
      workspaceOn(root),
      "10dkrwp7",
      "retired",
    );

    expect(outcome.status).toBe("blocked");
    expect(outcome.report.errorCount).toBeGreaterThan(0);
    expect(await read(root, CARD)).toBe(broken);
  });

  it("refuses to overwrite a card edited on disk after it was read", async () => {
    const { root } = await goldenRemote();
    const opened = workspaceOn(root);
    const path = join(root, CARD);
    const edited = (await read(root, CARD)).replace("items", "ITEMS");
    // The editor saves right after the write planned its change from the snapshot.
    const workspace: Workspace = {
      ...opened,
      snapshot: async () => {
        const snapshot = await opened.snapshot();
        await writeFile(path, edited);
        return snapshot;
      },
    };

    await expect(
      setCardStatus(workspace, "10dkrwp7", "retired"),
    ).rejects.toMatchObject({ code: "content-changed" });
    expect(await read(root, CARD)).toBe(edited);
  });
});
