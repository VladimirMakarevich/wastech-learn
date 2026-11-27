import { readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  nodeTransactionFs,
  type TransactionFs,
} from "@wastech-learn/content-fs";
import { sha256Hex } from "@wastech-learn/core";
import { describe, expect, it, vi } from "vitest";
import { CARD, HOST, ORIGIN, get, goldenCopy, serverOver } from "./helpers.js";

const DIR = "content/architecture/backpressure";
const INDEX = `${DIR}/index.md`;
const SECOND = `${DIR}/cards/0d1gjcys.md`;

type Server = Awaited<ReturnType<typeof serverOver>>["server"];

const put = (
  server: Server,
  body: string,
  headers: Record<string, string> = {},
): Promise<Response> =>
  Promise.resolve(
    server.app.request("/api/source", {
      method: "PUT",
      body,
      headers: {
        host: HOST,
        origin: ORIGIN,
        "content-type": "application/json",
        ...headers,
      },
    }),
  );

const read = (root: string, path: string): Promise<string> =>
  readFile(join(root, path), "utf8");

const open = async (
  server: Server,
  path: string,
): Promise<{ text: string; version: string }> => {
  const response = await get(
    server,
    `/api/source?path=${encodeURIComponent(path)}`,
  );
  expect(response.status).toBe(200);
  return (await response.json()) as { text: string; version: string };
};

describe("GET /api/source", () => {
  it("answers a card's text and version", async () => {
    const root = await goldenCopy();
    const { server } = await serverOver(root);
    const text = await read(root, CARD);
    expect(await open(server, CARD)).toEqual({
      path: CARD,
      text,
      version: await sha256Hex(text),
    });
  });

  it("answers 404 for anything the bundle does not name or that leaves the repository", async () => {
    const root = await goldenCopy();
    await symlink("/etc/hostname", join(root, `${DIR}/cards/zzzzzzzz.md`));
    const { server } = await serverOver(root);
    for (const path of [
      "learn.config.json",
      "reviews/desk1/web-2026-11.jsonl",
      "content/../learn.config.json",
      `${DIR}/diagrams/demand-flow.mmd`,
      `${DIR}/cards/zzzzzzzz.md`,
      `${DIR}/cards/aaaaaaaa.md`,
    ]) {
      const response = await get(
        server,
        `/api/source?path=${encodeURIComponent(path)}`,
      );
      expect(response.status, path).toBe(404);
      expect(await response.json()).toEqual({ code: "source-not-found" });
    }
    expect((await get(server, "/api/source")).status).toBe(404);
  });
});

describe("PUT /api/source", () => {
  it("writes, rebuilds the bundle before answering, and answers unchanged for a repeat", async () => {
    const root = await goldenCopy();
    const { server } = await serverOver(root);
    const etag = (await get(server, "/api/bundle")).headers.get("etag");
    const { text, version } = await open(server, CARD);
    const body = JSON.stringify({
      path: CARD,
      version,
      text: text.replace("ask for more items", "ask the producer for more"),
    });
    const response = await put(server, body);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "written",
      paths: [CARD],
      card: { id: "10dkrwp7", retired: null },
      findings: [],
    });
    const bundle = await get(server, "/api/bundle");
    expect(bundle.headers.get("etag")).not.toBe(etag);
    expect(await bundle.text()).toContain("ask the producer for more");

    const again = await put(server, body);
    expect(await again.json()).toMatchObject({ status: "unchanged" });
  });

  it("answers each refusal with its code and status", async () => {
    const root = await goldenCopy();
    const { server } = await serverOver(root);
    const { text, version } = await open(server, CARD);

    const blocked = await put(
      server,
      JSON.stringify({
        path: CARD,
        version,
        text: text.replace("## Answer\n\n", ""),
      }),
    );
    expect(blocked.status).toBe(422);
    expect(await blocked.json()).toMatchObject({ status: "blocked" });

    const decision = await put(
      server,
      JSON.stringify({
        path: CARD,
        version,
        text: text.replace(
          "`Subscription.request(n)`",
          "The subscriber calls `Subscription.request(n)` when ready",
        ),
      }),
    );
    expect(decision.status).toBe(409);
    expect(await decision.json()).toMatchObject({
      code: "decision-needed",
      removedVariants: [],
    });

    await writeFile(join(root, CARD), text.replace("items", "elements"));
    const changed = await put(
      server,
      JSON.stringify({ path: CARD, version, text: `${text}\nMore.\n` }),
    );
    expect(changed.status).toBe(409);
    expect(await changed.json()).toEqual({ code: "content-changed" });

    const outside = await put(
      server,
      JSON.stringify({ path: "learn.config.json", version, text: "{}" }),
    );
    expect(outside.status).toBe(404);
    expect(await read(root, "learn.config.json")).not.toBe("{}");

    const invalid = await put(server, JSON.stringify({ path: CARD }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ code: "body-invalid" });
  });

  it("refuses a foreign page, a form body and an oversized body", async () => {
    const root = await goldenCopy();
    const { server } = await serverOver(root);
    const before = await read(root, CARD);
    const { version } = await open(server, CARD);
    const body = JSON.stringify({ path: CARD, version, text: "x" });
    expect(
      (await put(server, body, { origin: "http://evil.test" })).status,
    ).toBe(403);
    expect(
      (await put(server, body, { "content-type": "text/plain" })).status,
    ).toBe(415);
    const huge = JSON.stringify({
      path: CARD,
      version,
      text: "x".repeat(300 * 1024),
    });
    expect((await put(server, huge)).status).toBe(413);
    expect(await read(root, CARD)).toBe(before);
  });

  it("queues two saves that both retitle cards of one topic, so the index keeps both lines", async () => {
    const root = await goldenCopy();
    const { server } = await serverOver(root);
    const first = await open(server, CARD);
    const second = await open(server, SECOND);
    const [a, b] = await Promise.all([
      put(
        server,
        JSON.stringify({
          path: CARD,
          version: first.version,
          text: first.text.replace(
            "# Reactive Streams: requesting items",
            "# Asking for items",
          ),
        }),
      ),
      put(
        server,
        JSON.stringify({
          path: SECOND,
          version: second.version,
          text: second.text.replace(
            "# Why a consumer signals demand",
            "# Demand signals",
          ),
        }),
      ),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const index = await read(root, INDEX);
    expect(index).toContain("- [Asking for items](cards/10dkrwp7.md)");
    expect(index).toContain("- [Demand signals](cards/0d1gjcys.md)");
  });

  it("answers a failed write with its code alone and never prints the text", async () => {
    const root = await goldenCopy();
    const failing: TransactionFs = {
      ...nodeTransactionFs,
      rename: () => Promise.reject(new Error("disk full")),
    };
    const { server } = await serverOver(root, undefined, {
      transactionFs: failing,
    });
    const logged = [
      vi.spyOn(console, "log"),
      vi.spyOn(console, "error"),
      vi.spyOn(console, "warn"),
    ];
    const { text, version } = await open(server, CARD);
    const secret = "a-very-private-sentence";
    const response = await put(
      server,
      JSON.stringify({
        path: CARD,
        version,
        text: text.replace("ask for more items", secret),
      }),
    );
    expect(response.status).toBe(500);
    const answer = await response.text();
    expect(JSON.parse(answer)).toEqual({ code: "io-failed" });
    for (const spy of logged) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(secret);
      spy.mockRestore();
    }
    expect(await read(root, CARD)).toBe(text);
  });
});
