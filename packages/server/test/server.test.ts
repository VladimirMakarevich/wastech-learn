import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_BODY_BYTES } from "../src/index.js";
import {
  CARD,
  HOST,
  LOG,
  NOW,
  get,
  goldenCopy,
  post,
  serverOver,
  tempDir,
  webEvent,
} from "./helpers.js";

const lines = async (root: string, file = LOG): Promise<string[]> =>
  (await readFile(join(root, file), "utf8")).trim().split("\n");

const exists = async (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false,
  );

describe("GET /api/status", () => {
  it("names the device, the absolute content path, the parsed config and the scheduler", async () => {
    const root = await goldenCopy();
    const { server } = await serverOver(root);
    const response = await get(server, "/api/status");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      device: "desk1",
      deviceSource: "local",
      contentPath: root,
      config: { timezone: "Europe/Warsaw", leechThreshold: 8 },
      sched: "ts-fsrs@6.0.1/FSRS-7",
      build: { ok: true, builtAt: NOW.toISOString() },
    });
  });

  it("answers a broken config with its code and nothing else", async () => {
    const root = await goldenCopy();
    const { server } = await serverOver(root);
    await writeFile(join(root, "learn.config.json"), "{ not json");
    const response = await get(server, "/api/status");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ code: "config-invalid" });
  });
});

describe("GET /api/bundle", () => {
  it("sends the bundle with a validator and answers a repeat with 304", async () => {
    const { server } = await serverOver(await goldenCopy());
    const response = await get(server, "/api/bundle");
    expect(response.status).toBe(200);
    const etag = response.headers.get("etag");
    expect(etag).toMatch(/^"[0-9a-f]{32}"$/);
    const bundle = (await response.json()) as {
      cards: unknown[];
      searchIndex: unknown;
    };
    expect(bundle.cards).toHaveLength(30);
    expect(typeof bundle.searchIndex).toBe("string");
    const again = await get(server, "/api/bundle", { "if-none-match": etag! });
    expect(again.status).toBe(304);
  });
});

describe("GET /api/events", () => {
  it("returns every device's events and reports a broken line instead of failing", async () => {
    const root = await goldenCopy();
    await mkdir(join(root, "reviews/laptop"), { recursive: true });
    const other = webEvent({ device: "laptop", writer: "mcp" });
    await writeFile(
      join(root, "reviews/laptop/mcp-2026-11.jsonl"),
      `${JSON.stringify(other)}\nnot json\n`,
    );
    const { server } = await serverOver(root);
    const body = (await (await get(server, "/api/events")).json()) as {
      events: { id: string }[];
      findings: { file: string; line: number }[];
    };
    expect(body.events.map((event) => event.id)).toEqual([other.id]);
    expect(body.findings).toEqual([
      expect.objectContaining({
        file: "reviews/laptop/mcp-2026-11.jsonl",
        line: 2,
      }),
    ]);
  });
});

describe("POST /api/events", () => {
  it("appends the app's events to this device's web log and skips a repeated id", async () => {
    const root = await goldenCopy();
    const { server, watcher } = await serverOver(root);
    const event = webEvent();
    const first = await post(server, "/api/events", JSON.stringify([event]));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ appended: 1, duplicates: 0 });
    expect(await lines(root)).toHaveLength(1);
    expect(JSON.parse((await lines(root))[0]!)).toMatchObject({ id: event.id });
    // The server registers its own append, so the watcher does not announce it back to the app.
    expect(watcher.own).toEqual([[LOG, (await stat(join(root, LOG))).size]]);
    const again = await post(server, "/api/events", JSON.stringify([event]));
    expect(await again.json()).toEqual({ appended: 0, duplicates: 1 });
    expect(await lines(root)).toHaveLength(1);
    const after = (await (await get(server, "/api/events")).json()) as {
      events: unknown[];
    };
    expect(after.events).toHaveLength(1);
  });

  it.each([
    ["another writer", webEvent({ writer: "mcp" }), "writer-not-allowed"],
    ["another device", webEvent({ device: "laptop" }), "device-not-allowed"],
    ["a broken schema", { ...webEvent(), rating: 7 }, "event-invalid"],
    ["a newer version", { ...webEvent(), v: 2 }, "event-version-unsupported"],
  ])("refuses %s with 400 and writes nothing", async (_name, event, code) => {
    const root = await goldenCopy();
    const { server } = await serverOver(root);
    const response = await post(
      server,
      "/api/events",
      JSON.stringify([webEvent(), event]),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code, index: 1 });
    expect(await exists(join(root, "reviews"))).toBe(false);
  });

  it("refuses a body that is not a JSON array", async () => {
    const { server } = await serverOver(await goldenCopy());
    const notArray = await post(
      server,
      "/api/events",
      JSON.stringify(webEvent()),
    );
    expect(notArray.status).toBe(400);
    expect(await notArray.json()).toEqual({ code: "body-invalid" });
    const notJson = await post(server, "/api/events", "{");
    expect(notJson.status).toBe(400);
    expect(await notJson.json()).toEqual({ code: "body-not-json" });
  });
});

describe("the guard", () => {
  it("refuses another Host, also on reads, so a rebinding page reads nothing", async () => {
    const { server } = await serverOver(await goldenCopy());
    for (const host of [
      "evil.example:4747",
      "127.0.0.1:9999",
      "localhost.evil:4747",
    ]) {
      const response = await get(server, "/api/bundle", { host });
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ code: "host-not-allowed" });
    }
    expect(
      (await get(server, "/api/status", { host: "localhost:4747" })).status,
    ).toBe(200);
  });

  it("refuses a write without this server's Origin or JSON, and a body past the limit", async () => {
    const root = await goldenCopy();
    const { server } = await serverOver(root);
    const body = JSON.stringify([webEvent()]);
    const cases: [Record<string, string>, string, number, string][] = [
      [{ origin: "" }, body, 403, "origin-not-allowed"],
      [{ origin: "http://evil.example" }, body, 403, "origin-not-allowed"],
      [{ origin: "http://localhost:4747" }, body, 403, "origin-not-allowed"],
      [{ "content-type": "text/plain" }, body, 415, "unsupported-media-type"],
      [
        {},
        JSON.stringify([{ pad: "x".repeat(MAX_BODY_BYTES) }]),
        413,
        "body-too-large",
      ],
    ];
    for (const [headers, payload, status, code] of cases) {
      const response = await post(server, "/api/events", payload, headers);
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ code });
    }
    expect(await exists(join(root, "reviews"))).toBe(false);
  });

  it("never sends a CORS header, not even to a preflight", async () => {
    const { server } = await serverOver(await goldenCopy());
    const responses = [
      await get(server, "/api/bundle", { origin: "http://evil.example" }),
      await Promise.resolve(
        server.app.request("/api/events", {
          method: "OPTIONS",
          headers: {
            host: HOST,
            origin: "http://evil.example",
            "access-control-request-method": "POST",
          },
        }),
      ),
    ];
    for (const response of responses)
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(responses[1]!.status).toBe(403);
  });
});

/** Reads server-sent events until `count` have arrived. */
const readEvents = async (
  response: Response,
  count: number,
): Promise<{ event: string; data: unknown }[]> => {
  const reader =
    response.body!.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const decoder = new TextDecoder();
  let text = "";
  const events: { event: string; data: unknown }[] = [];
  while (events.length < count) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    let end = text.indexOf("\n\n");
    while (end !== -1) {
      const block = text.slice(0, end);
      text = text.slice(end + 2);
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (event !== undefined)
        events.push({ event, data: JSON.parse(data ?? "null") });
      end = text.indexOf("\n\n");
    }
  }
  await reader.cancel();
  return events;
};

/** Waits until the bundle the server sends is no longer `before`: a rebuild runs in the background. */
const changedBundle = async (
  server: Awaited<ReturnType<typeof serverOver>>["server"],
  before: unknown,
): Promise<void> => {
  const previous = JSON.stringify(before);
  for (let attempt = 0; attempt < 200; attempt++) {
    const current = JSON.stringify(
      await (await get(server, "/api/bundle")).json(),
    );
    if (current !== previous) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("the bundle was not rebuilt");
};

describe("GET /api/changes", () => {
  it("tells the app about another writer's events, a rebuilt bundle and a failed build", async () => {
    const root = await goldenCopy();
    const { server, watcher } = await serverOver(root);
    const before = (await (await get(server, "/api/bundle")).json()) as {
      cards: { id: string; questionHtml: string }[];
    };
    const stream = await get(server, "/api/changes");
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const received = readEvents(stream, 3);

    watcher.announce({
      kinds: ["reviews"],
      paths: ["reviews/laptop/mcp-2026-11.jsonl"],
    });

    const text = await readFile(join(root, CARD), "utf8");
    await writeFile(
      join(root, CARD),
      text.replace("ask for more items", "ask for more elements"),
    );
    watcher.announce({ kinds: ["content"], paths: [CARD] });
    await changedBundle(server, before);
    const rebuilt = (await (
      await get(server, "/api/bundle")
    ).json()) as typeof before;
    const card = (bundle: typeof before) =>
      bundle.cards.find((entry) => entry.id === "10dkrwp7")!.questionHtml;
    expect(card(rebuilt)).toContain("ask for more elements");
    expect(card(before)).toContain("ask for more items");

    await writeFile(
      join(root, CARD),
      text.replace("type: basic", "type: no-such-type"),
    );
    watcher.announce({ kinds: ["content"], paths: [CARD] });

    const events = await received;
    expect(events.map((event) => event.event)).toEqual([
      "events-changed",
      "content-changed",
      "build-failed",
    ]);
    expect(events[2]!.data).toMatchObject({
      findings: [expect.objectContaining({ file: CARD })],
    });
    // The app keeps working on the last bundle that built.
    expect(
      card((await (await get(server, "/api/bundle")).json()) as typeof before),
    ).toContain("ask for more elements");
    const status = (await (await get(server, "/api/status")).json()) as {
      build: { ok: boolean; findings: { file: string; line?: number }[] };
    };
    expect(status.build.ok).toBe(false);
    expect(status.build.findings[0]).toMatchObject({ file: CARD });
  }, 30_000);
});

describe("serving the app", () => {
  it("sends the built files, index.html for app routes, 404 for a missing file or a way out", async () => {
    const appDir = await tempDir();
    await writeFile(
      join(appDir, "index.html"),
      "<!doctype html><title>app</title>",
    );
    await writeFile(join(appDir, "main.js"), "export {};");
    const { server } = await serverOver(await goldenCopy(), appDir);
    const index = await get(server, "/");
    expect(index.headers.get("content-type")).toContain("text/html");
    expect(await index.text()).toContain("<title>app</title>");
    // Nothing from other sites: no remote script, font or connection, even if a bundle tried.
    expect(index.headers.get("content-security-policy")).toContain(
      "default-src 'self'",
    );
    expect(
      await (await get(server, "/topic/architecture/backpressure")).text(),
    ).toContain("<title>app</title>");
    const script = await get(server, "/main.js");
    expect(script.headers.get("content-type")).toContain("text/javascript");
    expect((await get(server, "/missing.js")).status).toBe(404);
    expect((await get(server, "/..%2F..%2Fetc%2Fpasswd.txt")).status).toBe(404);
    expect((await get(server, "/api/nothing")).status).toBe(404);
    expect(
      (await get(server, "/content/architecture/backpressure/index.md")).status,
    ).toBe(404);
  });

  it("answers only /api without a built app", async () => {
    const { server } = await serverOver(await goldenCopy());
    expect((await get(server, "/")).status).toBe(404);
    expect((await get(server, "/api/status")).status).toBe(200);
  });
});
