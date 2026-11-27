import { describe, expect, it } from "vitest";
import {
  ApiError,
  createApi,
  parseStatus,
  type Fetch,
} from "../src/app/data/api";
import { vscodeLink } from "../src/app/shell/vscode";

const CONFIG = {
  timezone: "Europe/Warsaw",
  dayStartsAt: "04:00",
  uiLanguage: "ru",
  srs: {
    scheduler: "ts-fsrs@6.0.1",
    model: "FSRS-7",
    desiredRetention: 0.9,
    maxIntervalDays: 365,
    learningSteps: ["1m", "10m"],
    relearningSteps: ["10m"],
    allowModelOverride: true,
    graduatingIntervalDays: 1,
    fuzz: true,
    weights: null,
  },
  limits: {
    default: { newPerDay: 10, reviewsPerDay: 150 },
    "lang-pl": { newPerDay: 10, reviewsPerDay: 150 },
    sessionMinutes: 15,
    pauseNewWhenBacklogOver: 2,
  },
  leechThreshold: 8,
};

const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

describe("server answers", () => {
  it("parses a status, its config through core's schema", () => {
    const status = parseStatus({
      device: "desk1",
      contentPath: "/home/u/content",
      config: CONFIG,
      sched: "ts-fsrs@6.0.1/FSRS-7",
      build: {
        ok: false,
        findings: [{ ruleId: "x", file: "a.md", params: {} }, 3],
        error: null,
      },
    });
    expect(status.config.leechThreshold).toBe(8);
    expect(status.config.limits.domains["lang-pl"]).toEqual({
      newPerDay: 10,
      reviewsPerDay: 150,
    });
    expect(status.build).toEqual({
      ok: false,
      findings: [{ ruleId: "x", file: "a.md", params: {} }],
      error: null,
    });
  });

  it("refuses a status whose config breaks the schema", () => {
    expect(() =>
      parseStatus({
        device: "d",
        contentPath: "/c",
        config: { ...CONFIG, leechThreshold: "eight" },
        sched: "s",
        build: { ok: true },
      }),
    ).toThrow(ApiError);
  });

  it("revalidates the bundle with its ETag and tells an unavailable bundle from a missing server", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const answers = [
      json(
        {
          version: 1,
          builtAt: "x",
          domains: [],
          topics: [],
          cards: [],
          assets: {},
        },
        200,
        { ETag: '"abc"' },
      ),
      json(undefined, 304),
      json(
        {
          code: "bundle-unavailable",
          findings: [{ ruleId: "r", file: "f.md", params: {} }],
        },
        503,
      ),
    ];
    const fetcher: Fetch = (input, init) => {
      calls.push([input, init]);
      const next = answers.shift();
      return next === undefined
        ? Promise.reject(new Error("down"))
        : Promise.resolve(next);
    };
    const api = createApi(fetcher);
    expect(await api.bundle(null)).toMatchObject({
      kind: "bundle",
      etag: '"abc"',
    });
    expect(await api.bundle('"abc"')).toEqual({ kind: "not-modified" });
    expect(calls[1]?.[1]?.headers).toEqual({ "If-None-Match": '"abc"' });
    expect(await api.bundle(null)).toMatchObject({
      kind: "unavailable",
      findings: [{ file: "f.md" }],
    });
    await expect(api.bundle(null)).rejects.toMatchObject({
      code: "unreachable",
      status: 0,
    });
  });

  it("leaves out a log line the event schema refuses", async () => {
    const api = createApi(() =>
      Promise.resolve(json({ events: [{ v: 1, id: "bad" }], findings: [] })),
    );
    expect(await api.events()).toEqual([]);
  });

  it("reports the server's refusal of a batch with its code", async () => {
    const api = createApi(() =>
      Promise.resolve(json({ code: "writer-not-allowed", index: 0 }, 400)),
    );
    await expect(api.append([])).rejects.toMatchObject({
      code: "writer-not-allowed",
      status: 400,
    });
  });
});

describe("VS Code links", () => {
  it("point at the absolute file and line", () => {
    expect(vscodeLink("/home/u/content/", "content/a b/c.md", 12)).toBe(
      "vscode://file/home/u/content/content/a%20b/c.md:12",
    );
  });
});
