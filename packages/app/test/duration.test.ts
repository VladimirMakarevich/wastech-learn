import { describe, expect, it } from "vitest";
import { daysAgo, intervalLabel, percent } from "../src/app/format/duration";

const MINUTE = 60_000;
const DAY = 86_400_000;

describe("interval labels", () => {
  it("pick the unit a person would say, in the reader's language", () => {
    expect(intervalLabel("en", 10 * MINUTE)).toBe("10 min");
    expect(intervalLabel("en", 30_000)).toBe("1 min");
    expect(intervalLabel("en", 4 * DAY)).toBe("4 days");
    expect(intervalLabel("en", 90 * DAY)).toBe("3 mths");
    expect(intervalLabel("ru", 4 * DAY)).toBe("4 дн.");
    expect(intervalLabel("pl", 4 * DAY)).toBe("4 dni");
  });

  it("say the last review in days, today included", () => {
    const now = Date.parse("2026-11-26T12:00:00Z");
    expect(daysAgo("en", now - 2 * 3_600_000, now)).toBe("today");
    expect(daysAgo("ru", now - 3 * DAY, now)).toBe("3 дня назад");
    expect(daysAgo("pl", now - 3 * DAY, now)).toBe("3 dni temu");
  });

  it("round shares to whole percent", () => {
    expect(percent("en", 0.876)).toBe("88%");
  });
});
