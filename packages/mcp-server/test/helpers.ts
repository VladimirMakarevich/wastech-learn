import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Renderer } from "@wastech-learn/content-fs";
import { seededRng } from "@wastech-learn/srs";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { createLearnServer } from "../src/index.js";

export const GOLDEN = fileURLToPath(
  new URL("../../../fixtures/golden", import.meta.url),
);

const created: string[] = [];
const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(
    created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

// The server must never reach the network; every test file runs with sockets and fetch disabled, so an
// accidental call fails loudly instead of passing on a machine that happens to be online.
const offline = (): never => {
  throw new Error("Network access is disabled in MCP server tests");
};
beforeAll(() => {
  vi.spyOn(net.Socket.prototype, "connect").mockImplementation(offline);
  vi.stubGlobal("fetch", () =>
    Promise.reject(new Error("Network access is disabled in MCP server tests")),
  );
});
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

export const tempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "wastech-learn-mcp-"));
  created.push(dir);
  return dir;
};

export const goldenCopy = async (): Promise<string> => {
  const dir = await tempDir();
  await cp(GOLDEN, dir, { recursive: true });
  return dir;
};

/** Edits a JSON file of the copy, such as learn.config.json, in place. */
export const editJson = async (
  root: string,
  file: string,
  edit: (value: Record<string, unknown>) => void,
): Promise<void> => {
  const path = join(root, file);
  const value = JSON.parse(await readFile(path, "utf8")) as Record<
    string,
    unknown
  >;
  edit(value);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** The request cache a write appends to; only content files matter for "nothing written twice". */
export const REQUESTS = ".cache/mcp/requests.jsonl";

export const withoutRequests = (
  tree: Readonly<Record<string, string>>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tree).filter(([path]) => path !== REQUESTS),
  );

/** Every file under the repository with its text, for "nothing changed on disk" assertions. */
export const snapshotTree = async (
  root: string,
): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  for (const entry of await readdir(root, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    result[path.slice(root.length + 1)] = await readFile(path, "utf8");
  }
  return result;
};

export const stubRenderer = (fail?: string): Renderer & { calls: number } => {
  const renderer = {
    calls: 0,
    render: async (_source: string, output: string) => {
      renderer.calls++;
      if (fail !== undefined) {
        throw Object.assign(new Error("Command failed"), {
          stderr: `${fail}\n    at mermaid`,
        });
      }
      await writeFile(
        output,
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n',
      );
    },
  };
  return renderer;
};

export const START = new Date("2026-11-26T18:00:00.000Z");

/** A clock a test can move forward, to answer cards days later. */
export interface TestClock {
  now: Date;
  advance: (ms: number) => void;
}

export const testClock = (): TestClock => {
  const clock: TestClock = {
    now: START,
    advance: (ms) => {
      clock.now = new Date(clock.now.getTime() + ms);
    },
  };
  return clock;
};

export interface CallResult {
  readonly isError: boolean;
  readonly body: Record<string, unknown>;
  /** Length of the reply text the chat receives. */
  readonly bytes: number;
  readonly text: string;
}

export interface Session {
  readonly client: Client;
  readonly call: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<CallResult>;
}

/** Starts the server on a repository and connects an in-process client of the same SDK. */
export const connect = async (
  root: string,
  options: {
    readonly clock?: TestClock;
    readonly renderer?: Renderer;
    readonly seed?: number;
  } = {},
): Promise<Session> => {
  const clock = options.clock ?? testClock();
  const server = createLearnServer({
    root,
    now: () => clock.now,
    random: seededRng(options.seed ?? 1),
    renderer: options.renderer ?? stubRenderer(),
    hostname: () => "desk1",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "contract-test", version: "0.0.0" });
  await client.connect(clientTransport);
  clients.push(client);
  return {
    client,
    call: async (name, args = {}) => {
      const result = await client.callTool({ name, arguments: args });
      const content = result.content as { type: string; text: string }[];
      const text = content[0]?.text ?? "";
      return {
        isError: result.isError === true,
        body: JSON.parse(text) as Record<string, unknown>,
        bytes: Buffer.byteLength(text, "utf8"),
        text,
      };
    },
  };
};
