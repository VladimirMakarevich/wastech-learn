import { createServer, type Server } from "node:net";
import { seededRng } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import { run, type ExitCode } from "../src/index.js";
import { FIXED_NOW, goldenCopy } from "./helpers.js";

/** Runs `serve` in-process and hands the test its URL; the test decides when the learner presses Ctrl+C. */
const serve = (argv: readonly string[], cwd: string) => {
  const out: string[] = [];
  const err: string[] = [];
  const opened: string[] = [];
  let stop: () => void = () => undefined;
  const stopped = new Promise<void>((resolve) => {
    stop = resolve;
  });
  let listening: (url: string) => void = () => undefined;
  const url = new Promise<string>((resolve) => {
    listening = resolve;
  });
  const exit: Promise<ExitCode> = run(["serve", ...argv], {
    out: (line) => {
      out.push(line);
      const match = /http:\/\/[^\s;]+/.exec(line);
      if (match !== null) listening(match[0]);
    },
    err: (line) => err.push(line),
    cwd,
    now: () => FIXED_NOW,
    random: seededRng(7),
    readStdin: () => Promise.resolve(""),
    openUrl: (target) => opened.push(target),
    untilInterrupted: () => stopped,
  });
  return { url, exit, stop, out, err, opened };
};

const occupy = (): Promise<{ server: Server; port: number }> =>
  new Promise((resolve) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        port:
          typeof address === "object" && address !== null ? address.port : 0,
      });
    });
  });

describe("wastech-learn serve", () => {
  it("listens on 127.0.0.1 only, opens the browser unless told not to, and stops on Ctrl+C", async () => {
    const root = await goldenCopy();
    const session = serve(["--content", root, "--port", "0"], root);
    const url = await session.url;
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect(session.opened).toEqual([url]);
    const status = await fetch(new URL("api/status", url));
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({ contentPath: root });
    session.stop();
    expect(await session.exit).toBe(0);
    await expect(fetch(new URL("api/status", url))).rejects.toThrow();
  }, 30_000);

  it("leaves the browser closed with --no-open", async () => {
    const root = await goldenCopy();
    const session = serve(
      ["--content", root, "--port", "0", "--no-open"],
      root,
    );
    await session.url;
    expect(session.opened).toEqual([]);
    session.stop();
    expect(await session.exit).toBe(0);
  }, 30_000);

  it("explains a taken port and points to --port", async () => {
    const root = await goldenCopy();
    const { server, port } = await occupy();
    try {
      const session = serve(
        ["--content", root, "--port", String(port), "--lang", "en"],
        root,
      );
      expect(await session.exit).toBe(2);
      expect(session.err.join("\n")).toContain(`Port ${String(port)}`);
      expect(session.err.join("\n")).toContain("--port");
    } finally {
      server.close();
    }
  });

  it("refuses a port that is not a number", async () => {
    const root = await goldenCopy();
    const session = serve(
      ["--content", root, "--port", "web", "--lang", "en"],
      root,
    );
    expect(await session.exit).toBe(2);
    expect(session.err.join("\n")).toContain("--port");
  });
});
