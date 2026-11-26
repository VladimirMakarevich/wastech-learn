import { describe, expect, it } from "vitest";
import { createCalendar } from "../src/index.js";

const warsaw = createCalendar("Europe/Warsaw", "04:00");
const HOUR = 3_600_000;

describe("study day", () => {
  it("counts 03:30 local time as the previous day", () => {
    // 03:30 in Warsaw in winter is 02:30 UTC.
    expect(warsaw.dayOf(Date.parse("2026-01-15T02:30:00Z")).key).toBe(
      "2026-01-14",
    );
    expect(warsaw.dayOf(Date.parse("2026-01-15T03:00:00Z")).key).toBe(
      "2026-01-15",
    );
  });

  it("starts the day at 04:00 local time", () => {
    const day = warsaw.dayOf(Date.parse("2026-01-15T12:00:00Z"));
    expect(new Date(day.start).toISOString()).toBe("2026-01-15T03:00:00.000Z");
    expect(new Date(day.end).toISOString()).toBe("2026-01-16T03:00:00.000Z");
  });

  it("makes the spring DST day 23 hours and the autumn one 25 hours long", () => {
    const spring = warsaw.dayOf(Date.parse("2026-03-28T12:00:00Z"));
    expect(spring.key).toBe("2026-03-28");
    expect((spring.end - spring.start) / HOUR).toBe(23);
    const autumn = warsaw.dayOf(Date.parse("2026-10-24T12:00:00Z"));
    expect(autumn.key).toBe("2026-10-24");
    expect((autumn.end - autumn.start) / HOUR).toBe(25);
  });

  it("walks to the next day across a month end", () => {
    const last = warsaw.dayOf(Date.parse("2026-01-31T12:00:00Z"));
    expect(warsaw.next(last).key).toBe("2026-02-01");
  });

  it("does not depend on the machine's zone", () => {
    const tokyo = createCalendar("Asia/Tokyo", "04:00");
    // 19:30 UTC is 04:30 the next morning in Tokyo.
    expect(tokyo.dayOf(Date.parse("2026-06-01T19:30:00Z")).key).toBe(
      "2026-06-02",
    );
  });
});
