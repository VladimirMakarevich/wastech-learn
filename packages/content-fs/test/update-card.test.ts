import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { seededRng } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import { openWorkspace, updateCard, type Workspace } from "../src/index.js";
import { goldenCopy } from "./helpers.js";

const DIR = "content/architecture/backpressure";

const workspaceOn = (root: string): Workspace =>
  openWorkspace({
    root,
    now: () => new Date("2026-11-26T23:30:00.000Z"),
    random: seededRng(7),
  });

const read = (root: string, path: string): Promise<string> =>
  readFile(join(root, path), "utf8");

describe("updateCard when the meaning changed", () => {
  it("retires the card, writes a successor dated in the learner's zone and links it in the index", async () => {
    const root = await goldenCopy();
    const outcome = await updateCard(workspaceOn(root), {
      id: "10dkrwp7",
      meaningChanged: true,
      fields: {
        title: "Cancelling a subscription",
        question: "[Reactive Streams] Which call cancels a subscription?",
        answer: "`Subscription.cancel()`",
      },
    });

    expect(outcome.status).toBe("written");
    const { id, retired, paths } = outcome.result;
    expect(retired).toBe("10dkrwp7");
    expect(paths).toEqual([
      `${DIR}/cards/10dkrwp7.md`,
      `${DIR}/cards/${id}.md`,
    ]);
    expect(await read(root, `${DIR}/cards/10dkrwp7.md`)).toMatchSnapshot(
      "retired",
    );
    expect(await read(root, `${DIR}/cards/${id}.md`)).toMatchSnapshot(
      "successor",
    );
    expect(await read(root, `${DIR}/index.md`)).toMatchSnapshot("index");
  });

  it("writes nothing on a dry run but reports the same plan", async () => {
    const root = await goldenCopy();
    const before = await read(root, `${DIR}/index.md`);
    const outcome = await updateCard(workspaceOn(root), {
      id: "10dkrwp7",
      meaningChanged: true,
      dryRun: true,
      fields: { answer: "`Subscription.cancel()`" },
    });
    expect(outcome.status).toBe("dry-run");
    expect(outcome.result.retired).toBe("10dkrwp7");
    expect(await read(root, `${DIR}/index.md`)).toBe(before);
  });
});
