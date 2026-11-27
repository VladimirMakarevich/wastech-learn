import { spawn, type ChildProcess } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeLogFixture } from "./fixture-log.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const GOLDEN = join(ROOT, "fixtures/golden");
const CLI = join(ROOT, "packages/cli/bin/wastech-learn.mjs");

const listening = (child: ChildProcess): Promise<string> =>
  new Promise((resolve, reject) => {
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const url = /http:\/\/127\.0\.0\.1:\d+\//.exec(output)?.[0];
      if (url !== undefined) resolve(url);
    });
    child.once("exit", (code) => {
      reject(new Error(`wastech-learn serve exited with ${String(code)}`));
    });
  });

/**
 * One fresh golden copy with a generated log, served by the real CLI on a free port. The scenarios read
 * the address, the copy and the fixture from the environment, which Playwright hands to its workers.
 */
// eslint-disable-next-line no-restricted-syntax -- Playwright loads the global setup from its default export.
export default async function globalSetup(): Promise<() => Promise<void>> {
  const base = await mkdtemp(join(tmpdir(), "wastech-learn-e2e-"));
  const content = join(base, "content");
  await cp(GOLDEN, content, { recursive: true });
  await writeFile(join(content, "learn.local.json"), '{ "device": "e2e" }\n');
  const fixture = await writeLogFixture(content);
  const fixtureFile = join(base, "fixture.json");
  await writeFile(fixtureFile, `${JSON.stringify(fixture, null, 2)}\n`);
  const server = spawn(
    process.execPath,
    [
      CLI,
      "serve",
      "--content",
      content,
      "--port",
      "0",
      "--no-open",
      "--lang",
      "en",
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const url = await listening(server);
  process.env.E2E_BASE_URL = url;
  process.env.E2E_CONTENT = content;
  process.env.E2E_FIXTURE = fixtureFile;
  return async () => {
    if (server.exitCode === null) {
      const exited = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGINT");
      await exited;
    }
    await rm(base, { recursive: true, force: true });
  };
}
