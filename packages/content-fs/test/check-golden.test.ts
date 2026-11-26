import { describe, expect, it } from "vitest";
import { checkRepository } from "../src/index.js";
import { GOLDEN } from "./helpers.js";

describe("check on the golden sample", () => {
  it("finds no errors and no preset drift", async () => {
    const result = await checkRepository(GOLDEN);
    expect(result.findings).toEqual([]);
    expect(result.model.cards).toHaveLength(30);
  });
});
