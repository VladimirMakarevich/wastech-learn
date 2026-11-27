import { spawn } from "node:child_process";
import { getRandomValues } from "node:crypto";
import { text } from "node:stream/consumers";
import { run } from "./main.js";

// The URL is the server's own loopback address, never input, so handing it to the platform opener is safe.
const OPENERS: Readonly<Record<string, readonly string[]>> = {
  darwin: ["open"],
  win32: ["cmd", "/c", "start", '""'],
};

const openUrl = (url: string): void => {
  const [command = "xdg-open", ...args] = OPENERS[process.platform] ?? [];
  const child = spawn(command, [...args, url], {
    stdio: "ignore",
    detached: true,
  });
  // Without a browser opener (a headless machine) the printed URL is enough.
  child.on("error", () => undefined);
  child.unref();
};

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
  openUrl,
  untilInterrupted: () =>
    new Promise((resolve) => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
    }),
});
