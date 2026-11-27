import { describe, expect, it } from "vitest";
import {
  cardIdParamSchema,
  cardStatusBodySchema,
  emptyBodySchema,
  fieldPath,
  gitFailureSchema,
  gitStateSchema,
  gitSyncBodySchema,
  gitSyncResultSchema,
  topicStatusBodySchema,
} from "../src/index.js";

const failedField = (result: {
  readonly success: boolean;
  readonly error?: { readonly issues: readonly { path: PropertyKey[] }[] };
}): string => fieldPath(result.error?.issues[0]?.path ?? []);

describe("bodies of the app's write routes", () => {
  it("accept a commit message with shell characters as plain text", () => {
    const parsed = gitSyncBodySchema.safeParse({
      message: "  chore: x; rm -rf / $(id) --amend  ",
    });
    expect(parsed.success && parsed.data.message).toBe(
      "chore: x; rm -rf / $(id) --amend",
    );
  });

  it("refuse an empty message, a NUL byte and a field the route does not know", () => {
    const empty = gitSyncBodySchema.safeParse({ message: "   " });
    expect(empty.success).toBe(false);
    expect(failedField(empty)).toBe("message");
    expect(gitSyncBodySchema.safeParse({ message: "a\0b" }).success).toBe(
      false,
    );
    const extra = gitSyncBodySchema.safeParse({ message: "m", amend: true });
    expect(extra.success).toBe(false);
  });

  it("let the app archive and return a card but never set it back to draft", () => {
    expect(cardStatusBodySchema.safeParse({ status: "retired" }).success).toBe(
      true,
    );
    expect(cardStatusBodySchema.safeParse({ status: "active" }).success).toBe(
      true,
    );
    const draft = cardStatusBodySchema.safeParse({ status: "draft" });
    expect(draft.success).toBe(false);
    expect(failedField(draft)).toBe("status");
  });

  it("let the app archive and return a topic", () => {
    expect(
      topicStatusBodySchema.safeParse({ status: "archived" }).success,
    ).toBe(true);
    expect(topicStatusBodySchema.safeParse({ status: "retired" }).success).toBe(
      false,
    );
  });

  it("take an empty object for pull, delete and restore and nothing else", () => {
    expect(emptyBodySchema.safeParse({}).success).toBe(true);
    expect(emptyBodySchema.safeParse({ force: true }).success).toBe(false);
    expect(emptyBodySchema.safeParse([]).success).toBe(false);
  });

  it("accept only a card id shape in the URL", () => {
    expect(cardIdParamSchema.safeParse("7k2m9xqd").success).toBe(true);
    expect(cardIdParamSchema.safeParse("../index").success).toBe(false);
  });
});

describe("answers of the git routes", () => {
  it("parse a state with a block reason and classified entries", () => {
    const state = {
      branch: "main",
      upstream: null,
      ahead: 0,
      behind: 0,
      blocked: { reason: "no-upstream" },
      entries: [
        {
          path: "content/arch/flow/cards/7k2m9xqd.md",
          change: "deleted",
          area: "card",
          topic: "arch/flow",
          card: "7k2m9xqd",
        },
      ],
      suggestedMessage: "chore: 1 card deleted",
    };
    expect(gitStateSchema.parse(state)).toEqual(state);
    expect(gitStateSchema.safeParse({ ...state, ahead: -1 }).success).toBe(
      false,
    );
  });

  it("tell a finished sync from a failure by shape", () => {
    expect(
      gitSyncResultSchema.safeParse({ committed: 1, pulled: 0, pushed: 1 })
        .success,
    ).toBe(true);
    expect(
      gitFailureSchema.safeParse({ code: "conflict", files: ["a.md"] }).success,
    ).toBe(true);
    expect(gitFailureSchema.safeParse({ code: "exploded" }).success).toBe(
      false,
    );
  });
});
