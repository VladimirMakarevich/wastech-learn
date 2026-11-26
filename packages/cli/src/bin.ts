import { getRandomValues } from "node:crypto";
import { text } from "node:stream/consumers";
import { run } from "./main.js";

process.exitCode = await run(process.argv.slice(2), {
  out: (line) => {
    process.stdout.write(`${line}\n`);
  },
  err: (line) => {
    process.stderr.write(`${line}\n`);
  },
  cwd: process.cwd(),
  now: () => new Date(),
  random: () => (getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32,
  readStdin: () => text(process.stdin),
});
