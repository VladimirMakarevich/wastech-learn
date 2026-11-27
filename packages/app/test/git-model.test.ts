import type { GitState } from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import {
  cardChanges,
  deletedCards,
  failureLine,
  hasUnsentReviews,
  isCommittedCard,
  isInSync,
  resultLine,
  splitEntries,
  topicEntries,
} from "../src/app/data/git-model";
import { parseSyncAnswer, parseWriteAnswer } from "../src/app/data/write-api";

const state = (overrides: Partial<GitState> = {}): GitState => ({
  branch: "main",
  upstream: "origin/main",
  ahead: 0,
  behind: 0,
  entries: [],
  suggestedMessage: "chore: sync from desk1",
  ...overrides,
});

const CARD = {
  path: "content/a/b/cards/7k2m9xqd.md",
  change: "modified",
  area: "card",
  topic: "a/b",
  card: "7k2m9xqd",
} as const;
const LOG = {
  path: "reviews/desk1/web-2026-11.jsonl",
  change: "untracked",
  area: "reviews",
} as const;
const OTHER = {
  path: ".codex/config.toml",
  change: "untracked",
  area: "other",
} as const;

describe("deleted cards", () => {
  const GONE = { ...CARD, change: "deleted" } as const;
  const MOVED = {
    ...CARD,
    path: "content/a/c/cards/7k2m9xqd.md",
    topic: "a/c",
    change: "untracked",
  } as const;

  it("lists a card deleted since the last commit", () => {
    expect(deletedCards(state({ entries: [GONE] }))).toEqual([
      { path: GONE.path, card: GONE.card },
    ]);
  });

  it("leaves out a card moved in the editor or still in the content", () => {
    expect(deletedCards(state({ entries: [GONE, MOVED] }))).toEqual([]);
    expect(
      deletedCards(state({ entries: [GONE] }), new Set([GONE.card])),
    ).toEqual([]);
  });

  it("knows a card git has never seen cannot come back", () => {
    expect(isCommittedCard(state({ entries: [MOVED] }), MOVED.card)).toBe(
      false,
    );
    expect(isCommittedCard(state({ entries: [CARD] }), CARD.card)).toBe(true);
    expect(isCommittedCard(state(), CARD.card)).toBe(true);
    expect(isCommittedCard(undefined, CARD.card)).toBe(false);
    expect(
      isCommittedCard(
        state({ blocked: { reason: "not-a-repository" } }),
        CARD.card,
      ),
    ).toBe(false);
  });
});

describe("the git state on screen", () => {
  it("splits what Sync commits from what the owner commits by hand", () => {
    const { synced, other } = splitEntries(
      state({ entries: [CARD, LOG, OTHER] }),
    );
    expect(synced).toEqual([CARD, LOG]);
    expect(other).toEqual([OTHER]);
  });

  it("is in sync only with nothing to commit, send or receive", () => {
    expect(isInSync(state())).toBe(true);
    expect(isInSync(state({ ahead: 1 }))).toBe(false);
    expect(isInSync(state({ behind: 1 }))).toBe(false);
    expect(isInSync(state({ entries: [OTHER] }))).toBe(false);
  });

  it("counts ratings as unsent while the log is uncommitted or a commit waits to be pushed", () => {
    expect(hasUnsentReviews(state({ entries: [LOG] }))).toBe(true);
    expect(hasUnsentReviews(state({ ahead: 1 }))).toBe(true);
    expect(hasUnsentReviews(state({ entries: [CARD, OTHER] }))).toBe(false);
  });

  it("picks a topic's files and each card's change", () => {
    const s = state({ entries: [CARD, LOG] });
    expect(topicEntries(s, "a/b")).toEqual([CARD]);
    expect(topicEntries(s, "a/c")).toEqual([]);
    expect(cardChanges(s).get("7k2m9xqd")).toBe("modified");
  });
});

describe("lines about a Sync", () => {
  it("say what was sent and received, or that nothing was new", () => {
    expect(resultLine({ committed: 0, pulled: 0, pushed: 0 }).key).toBe(
      "git.result.nothing",
    );
    expect(resultLine({ committed: 1, pulled: 0, pushed: 1 })).toEqual({
      key: "git.result.sent",
      params: { count: 1 },
    });
    expect(resultLine({ committed: 0, pulled: 2, pushed: 0 })).toEqual({
      key: "git.result.received",
      params: { count: 2 },
    });
    expect(resultLine({ committed: 1, pulled: 2, pushed: 1 }).key).toBe(
      "git.result.both",
    );
  });

  it("name the block reason of a refused press and keep git's own words for an unknown failure", () => {
    expect(
      failureLine({ code: "blocked", blocked: { reason: "no-upstream" } }).key,
    ).toBe("git.blocked.no-upstream");
    expect(failureLine({ code: "git-failed", detail: "hook said no" })).toEqual(
      {
        key: "git.failure.git-failed",
        params: { detail: "hook said no" },
      },
    );
    expect(
      failureLine({ code: "conflict", files: [], stashKept: true }).key,
    ).toBe("git.failure.conflict-stash");
  });
});

describe("answers of the write routes", () => {
  it("read a finished sync and a failure by their schemas", () => {
    expect(
      parseSyncAnswer(200, { committed: 1, pulled: 0, pushed: 1 }),
    ).toEqual({
      ok: true,
      result: { committed: 1, pulled: 0, pushed: 1 },
    });
    expect(parseSyncAnswer(409, { code: "conflict", files: ["a.md"] })).toEqual(
      {
        ok: false,
        failure: { code: "conflict", files: ["a.md"] },
      },
    );
    expect(() => parseSyncAnswer(409, { code: "exploded" })).toThrow();
  });

  it("read written, blocked with findings, and a refusal by code", () => {
    expect(parseWriteAnswer(200, { status: "written" })).toEqual({
      kind: "written",
    });
    expect(
      parseWriteAnswer(409, {
        status: "blocked",
        findings: [
          {
            ruleId: "answer-words",
            file: "x.md",
            params: {},
            severity: "error",
          },
        ],
        lint: [],
      }),
    ).toMatchObject({ kind: "blocked", findings: [{ file: "x.md" }] });
    expect(() =>
      parseWriteAnswer(409, {
        status: "blocked",
        findings: ["junk"],
        lint: [],
      }),
    ).toThrow();
    expect(parseWriteAnswer(409, { code: "content-changed" })).toEqual({
      kind: "refused",
      code: "content-changed",
    });
  });
});
