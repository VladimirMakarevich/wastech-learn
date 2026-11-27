import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { goldenRemote } from "./git-repo.js";
import { CARD, get, serverOver } from "./helpers.js";

// The app rereads the git state after every change it hears about; past this budget the sidebar would lag
// behind an edit the owner just saved.
const BUDGET_MS = 300;
const RUNS = 7;

describe("GET /api/git", () => {
  it("answers within budget on the golden repository with a pending change", async () => {
    const { root } = await goldenRemote();
    await appendFile(join(root, CARD), "\nEdited.\n");
    const { server } = await serverOver(root);
    const times: number[] = [];
    for (let run = 0; run < RUNS; run++) {
      const start = performance.now();
      const response = await get(server, "/api/git");
      await response.json();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.floor(RUNS / 2)]).toBeLessThan(BUDGET_MS);
  });
});
