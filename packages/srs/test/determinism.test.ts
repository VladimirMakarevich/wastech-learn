import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createScheduler,
  replay,
  seededRng,
  shuffled,
  snapshot,
} from "../src/index.js";
import { CONFIG, at } from "./fixtures.js";
import { generateLog } from "./log-generator.js";

const scheduler = await createScheduler(CONFIG);
const NOW = at("2026-06-01T12:00:00.000Z");
const log = generateLog(42);

const snapshotOf = (
  files: readonly (readonly Parameters<typeof replay>[0][number][])[],
): string => snapshot(replay(files.flat(), scheduler, CONFIG, NOW));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("replay determinism", () => {
  it("works on a log of about a thousand events", () => {
    expect(log.files.flat().length).toBeGreaterThanOrEqual(1000);
  });

  it("gives a byte-identical snapshot with lines and files shuffled", () => {
    const reference = snapshotOf(log.files);
    const rng = seededRng(7);
    const shuffledLines = log.files.map((file) => shuffled(file, rng));
    const shuffledFiles = shuffled(log.files, rng);
    expect(snapshotOf(shuffledLines)).toBe(reference);
    expect(snapshotOf(shuffledFiles)).toBe(reference);
    expect(snapshotOf([shuffled(log.files.flat(), rng)])).toBe(reference);
  });

  it("does not depend on the process time zone", () => {
    const reference = snapshotOf(log.files);
    vi.stubEnv("TZ", "Pacific/Kiritimati");
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
      "Pacific/Kiritimati",
    );
    expect(snapshotOf(log.files)).toBe(reference);
    vi.stubEnv("TZ", "America/Los_Angeles");
    expect(snapshotOf(log.files)).toBe(reference);
  });

  it("changes when the log changes", () => {
    expect(snapshotOf(log.files.slice(1))).not.toBe(snapshotOf(log.files));
  });
});
