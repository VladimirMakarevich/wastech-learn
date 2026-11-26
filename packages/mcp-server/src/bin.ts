import { getRandomValues } from "node:crypto";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLearnServer } from "./server.js";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { content: { type: "string" } },
  strict: true,
});

// The only randomness a card id or an event id gets; core receives it as a function and never reaches
// for a global source itself.
const random = (): number =>
  (getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32;

const server = createLearnServer({
  root: resolve(process.cwd(), values.content ?? "."),
  now: () => new Date(),
  random,
});
// stdout carries the protocol; nothing else may be printed there.
await server.connect(new StdioServerTransport());
