import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  RepositoryWatcher,
  WatchOptions,
} from "@wastech-learn/content-fs";
import type { ReviewEvent } from "@wastech-learn/core";
import { afterEach } from "vitest";
import {
  createServer,
  type LearnServer,
  type ServerOptions,
} from "../src/index.js";

export const GOLDEN = fileURLToPath(
  new URL("../../../fixtures/golden", import.meta.url),
);
export const PORT = 4747;
export const HOST = `127.0.0.1:${String(PORT)}`;
export const ORIGIN = `http://${HOST}`;
export const NOW = new Date("2026-11-26T18:00:00.000Z");
export const CARD = "content/architecture/backpressure/cards/10dkrwp7.md";

const created: string[] = [];
const servers: LearnServer[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) server.close();
  await Promise.all(
    created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

export const tempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "wastech-learn-server-"));
  created.push(dir);
  return dir;
};

/** A golden copy that names its device in learn.local.json, as a set-up repository does. */
export const goldenCopy = async (): Promise<string> => {
  const dir = await tempDir();
  await cp(GOLDEN, dir, { recursive: true });
  await writeFile(join(dir, "learn.local.json"), '{ "device": "desk1" }\n');
  return dir;
};

/** A watcher that never touches the disk: the test announces changes itself. */
export interface FakeWatcher {
  readonly announce: WatchOptions["onChange"];
  readonly own: [string, number][];
  closed: boolean;
}

export const serverOver = async (
  root: string,
  appDir?: string,
  extra: Partial<ServerOptions> = {},
): Promise<{ server: LearnServer; watcher: FakeWatcher }> => {
  const watcher: FakeWatcher = {
    announce: () => undefined,
    own: [],
    closed: false,
  };
  const server = createServer({
    root,
    appDir,
    port: () => PORT,
    now: () => NOW,
    watch: (_root, options): RepositoryWatcher => {
      Object.assign(watcher, { announce: options.onChange });
      return {
        ownAppend: (file, size) => watcher.own.push([file, size]),
        close: () => {
          watcher.closed = true;
        },
      };
    },
    ...extra,
  });
  servers.push(server);
  await server.ready;
  return { server, watcher };
};

export const get = (
  server: LearnServer,
  path: string,
  headers: Record<string, string> = {},
): Promise<Response> =>
  Promise.resolve(
    server.app.request(path, { headers: { host: HOST, ...headers } }),
  );

export const post = (
  server: LearnServer,
  path: string,
  body: string,
  headers: Record<string, string> = {},
): Promise<Response> =>
  Promise.resolve(
    server.app.request(path, {
      method: "POST",
      body,
      headers: {
        host: HOST,
        origin: ORIGIN,
        "content-type": "application/json",
        ...headers,
      },
    }),
  );

let sequence = 0;

/** A review the app would send: writer `web`, this device. */
export const webEvent = (
  overrides: Partial<ReviewEvent> = {},
): ReviewEvent => ({
  v: 1,
  id: `01KB${String(++sequence).padStart(22, "0")}`,
  ts: NOW.toISOString(),
  tz: "Europe/Warsaw",
  device: "desk1",
  writer: "web",
  kind: "review",
  item: "10dkrwp7:main",
  rating: 3,
  confidence: null,
  aiSuggested: null,
  grader: "self",
  durMs: 8000,
  contentHash: `sha256:${"a".repeat(64)}`,
  sched: "ts-fsrs@6.0.1/FSRS-7",
  ...overrides,
});

export const LOG = "reviews/desk1/web-2026-11.jsonl";
