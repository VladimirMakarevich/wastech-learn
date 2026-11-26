import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach } from "vitest";

export const GOLDEN = fileURLToPath(
  new URL("../../../fixtures/golden", import.meta.url),
);

const created: string[] = [];

afterEach(async () => {
  await Promise.all(
    created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

/** A fresh empty folder, removed after the test, so no test ever writes next to the real fixtures. */
export const tempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "wastech-learn-"));
  created.push(dir);
  return dir;
};

/** A throwaway copy of the golden sample for tests that edit or write files. */
export const goldenCopy = async (): Promise<string> => {
  const dir = await tempDir();
  await cp(GOLDEN, dir, { recursive: true });
  return dir;
};
