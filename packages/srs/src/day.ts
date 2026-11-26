/** One study day: a calendar date in the user's zone that starts at `dayStartsAt`, not at midnight. */
export interface StudyDay {
  /** Local date of the day, `YYYY-MM-DD`. */
  readonly key: string;
  /** Epoch milliseconds of the day's start. */
  readonly start: number;
  /** Epoch milliseconds of the next day's start. */
  readonly end: number;
}

export interface StudyCalendar {
  readonly dayOf: (instant: number) => StudyDay;
  /** The day after `day`. */
  readonly next: (day: StudyDay) => StudyDay;
}

const pad = (value: number): string => String(value).padStart(2, "0");

/**
 * Day boundaries in the configured zone, computed with Intl from the zone's rules, never from the
 * machine's zone: a session at 03:30 with `dayStartsAt` 04:00 belongs to the previous day on every
 * computer, and a day that crosses a DST switch is 23 or 25 hours long, as it really is.
 */
export const createCalendar = (
  timezone: string,
  dayStartsAt: string,
): StudyCalendar => {
  const [startHour = 0, startMinute = 0] = dayStartsAt.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const wallClock = (instant: number) => {
    const parts = Object.fromEntries(
      format
        .formatToParts(instant)
        .map((part) => [part.type, Number(part.value)]),
    );
    return {
      year: parts.year ?? 1970,
      month: parts.month ?? 1,
      day: parts.day ?? 1,
      hour: parts.hour ?? 0,
      minute: parts.minute ?? 0,
      second: parts.second ?? 0,
    };
  };

  // The zone's offset at an instant; seconds are enough, no zone in use has sub-second offsets.
  const offsetAt = (instant: number): number => {
    const local = wallClock(instant);
    const asUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    return asUtc - Math.floor(instant / 1000) * 1000;
  };

  const instantOf = (year: number, month: number, day: number): number => {
    const guess = Date.UTC(year, month - 1, day, startHour, startMinute);
    const first = guess - offsetAt(guess);
    const second = guess - offsetAt(first);
    return second;
  };

  const startOf = (date: Date): number =>
    instantOf(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());

  // `start` is passed in when the caller already knows it: walking day by day reuses the previous day's
  // end, which halves the Intl work of a year-long walk.
  const dayAt = (
    year: number,
    month: number,
    day: number,
    start?: number,
  ): StudyDay => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return {
      key: `${String(date.getUTCFullYear())}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
      start: start ?? startOf(date),
      end: startOf(new Date(Date.UTC(year, month - 1, day + 1))),
    };
  };

  const dayOf = (instant: number): StudyDay => {
    const local = wallClock(instant);
    const beforeStart = local.hour * 60 + local.minute < startMinutes;
    return dayAt(
      local.year,
      local.month,
      beforeStart ? local.day - 1 : local.day,
    );
  };

  const next = (day: StudyDay): StudyDay => {
    const [year = 1970, month = 1, date = 1] = day.key.split("-").map(Number);
    return dayAt(year, month, date + 1, day.end);
  };

  return { dayOf, next };
};
