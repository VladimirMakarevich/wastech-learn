import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { goldenRemote } from "./git-repo.js";
import { CARD, HOST, ORIGIN, post, serverOver } from "./helpers.js";

const INDEX = "content/architecture/backpressure/index.md";

const send = (
  server: Awaited<ReturnType<typeof serverOver>>["server"],
  method: string,
  path: string,
  body: string,
  headers: Record<string, string> = {},
): Promise<Response> =>
  Promise.resolve(
    server.app.request(path, {
      method,
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

const setup = async () => {
  const { root } = await goldenRemote();
  await writeFile(join(root, "learn.local.json"), '{ "device": "desk1" }\n');
  const { server } = await serverOver(root);
  return { root, server };
};

describe("POST /api/cards/:id/status", () => {
  it("archives a card and returns it", async () => {
    const { root, server } = await setup();
    const before = await read(root, CARD);
    const archived = await post(
      server,
      "/api/cards/10dkrwp7/status",
      '{"status":"retired"}',
    );
    expect(archived.status).toBe(200);
    expect(await archived.json()).toEqual({ status: "written" });
    expect(await read(root, CARD)).toContain("status: retired");
    await post(server, "/api/cards/10dkrwp7/status", '{"status":"active"}');
    expect(await read(root, CARD)).toBe(before);
  });

  it("answers blocked with the findings and writes nothing when the card does not pass the checks", async () => {
    const { root, server } = await setup();
    const broken = (await read(root, CARD)).replace(
      "## Question\n",
      `## Question\n\n${"word ".repeat(80)}\n`,
    );
    await writeFile(join(root, CARD), broken);
    const response = await post(
      server,
      "/api/cards/10dkrwp7/status",
      '{"status":"retired"}',
    );
    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      status: string;
      findings: { file: string; severity: string }[];
    };
    expect(body.status).toBe("blocked");
    expect(body.findings).toContainEqual(
      expect.objectContaining({ file: CARD, severity: "error" }),
    );
    expect(await read(root, CARD)).toBe(broken);
  });

  it("refuses an unknown card, a draft status and a foreign page, writing nothing", async () => {
    const { root, server } = await setup();
    const before = await read(root, CARD);
    const missing = await post(
      server,
      "/api/cards/zzzzzzzz/status",
      '{"status":"retired"}',
    );
    expect(await missing.json()).toEqual({ code: "card-not-found" });
    expect(
      (await post(server, "/api/cards/../status", '{"status":"retired"}'))
        .status,
    ).toBe(404);
    expect(
      (await post(server, "/api/cards/10dkrwp7/status", '{"status":"draft"}'))
        .status,
    ).toBe(400);
    expect(
      (
        await post(
          server,
          "/api/cards/10dkrwp7/status",
          '{"status":"retired"}',
          { origin: "http://evil.test" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await post(
          server,
          "/api/cards/10dkrwp7/status",
          '{"status":"retired"}',
          { "content-type": "text/plain" },
        )
      ).status,
    ).toBe(415);
    expect(await read(root, CARD)).toBe(before);
  });
});

describe("DELETE /api/cards/:id and POST /api/cards/:id/restore", () => {
  it("deletes a card with its index line and brings both back", async () => {
    const { root, server } = await setup();
    const card = await read(root, CARD);
    const index = await read(root, INDEX);

    const deleted = await send(server, "DELETE", "/api/cards/10dkrwp7", "{}");
    expect(await deleted.json()).toEqual({ status: "written" });
    await expect(stat(join(root, CARD))).rejects.toThrow();
    expect(await read(root, INDEX)).not.toContain("cards/10dkrwp7.md");

    const restored = await post(server, "/api/cards/10dkrwp7/restore", "{}");
    expect(await restored.json()).toEqual({ status: "written" });
    expect(await read(root, CARD)).toBe(card);
    expect(await read(root, INDEX)).toBe(index);
  });

  it("says there is nothing to restore for a card that is in place", async () => {
    const { server } = await setup();
    const response = await post(server, "/api/cards/10dkrwp7/restore", "{}");
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "nothing-to-restore" });
  });

  it("refuses a delete from another page", async () => {
    const { root, server } = await setup();
    const response = await send(server, "DELETE", "/api/cards/10dkrwp7", "{}", {
      origin: "http://evil.test",
    });
    expect(response.status).toBe(403);
    await expect(stat(join(root, CARD))).resolves.toBeDefined();
  });
});

describe("POST /api/topics/:domain/:topic/status", () => {
  it("archives a topic and returns it", async () => {
    const { root, server } = await setup();
    const before = await read(root, INDEX);
    const response = await post(
      server,
      "/api/topics/architecture/backpressure/status",
      '{"status":"archived"}',
    );
    expect(await response.json()).toEqual({ status: "written" });
    expect(await read(root, INDEX)).toContain("status: archived");
    await post(
      server,
      "/api/topics/architecture/backpressure/status",
      '{"status":"active"}',
    );
    expect(await read(root, INDEX)).toBe(before);
  });

  it("answers an unknown topic with its code", async () => {
    const { server } = await setup();
    const response = await post(
      server,
      "/api/topics/architecture/nothing/status",
      '{"status":"archived"}',
    );
    expect(await response.json()).toEqual({ code: "topic-not-found" });
  });
});
