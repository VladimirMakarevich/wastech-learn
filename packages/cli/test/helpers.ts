import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach } from "vitest";
import { seededRng } from "@wastech-learn/srs";
import { run, type ExitCode, type SystemFacts } from "../src/index.js";

export const GOLDEN = fileURLToPath(
  new URL("../../../fixtures/golden", import.meta.url),
);

const created: string[] = [];

afterEach(async () => {
  await Promise.all(
    created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

export const tempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "wastech-learn-cli-"));
  created.push(dir);
  return dir;
};

export const goldenCopy = async (): Promise<string> => {
  const dir = await tempDir();
  await cp(GOLDEN, dir, { recursive: true });
  return dir;
};

export interface CliRun {
  readonly code: ExitCode;
  readonly out: string;
  readonly err: string;
}

export const FIXED_NOW = new Date("2026-11-26T18:00:00.000Z");

/** A computer that is not the one the tests run on: setup defaults never leak the machine's own. */
export const TEST_SYSTEM: SystemFacts = {
  timeZone: "Asia/Kolkata",
  locale: "pl-PL",
  nodeVersion: "24.17.0",
  hostname: "Test-Box.local",
};

/** Runs the CLI in-process, as the bin would, with captured output and a fixed clock. */
export const cli = async (
  argv: readonly string[],
  cwd = process.cwd(),
  stdin = "",
  system: SystemFacts = TEST_SYSTEM,
): Promise<CliRun> => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(argv, {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    cwd,
    now: () => FIXED_NOW,
    random: seededRng(7),
    readStdin: () => Promise.resolve(stdin),
    openUrl: () => undefined,
    untilInterrupted: () => Promise.resolve(),
    system,
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
};
