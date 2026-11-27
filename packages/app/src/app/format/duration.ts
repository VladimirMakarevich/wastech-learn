import type { UiLang } from "../i18n/message";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type Unit = "minute" | "hour" | "day" | "month" | "year";

const unitOf = (
  ms: number,
): { readonly unit: Unit; readonly value: number } => {
  if (ms < HOUR_MS)
    return { unit: "minute", value: Math.max(1, Math.round(ms / MINUTE_MS)) };
  if (ms < DAY_MS) return { unit: "hour", value: Math.round(ms / HOUR_MS) };
  const days = ms / DAY_MS;
  if (days < 30) return { unit: "day", value: Math.round(days) };
  if (days < 365) return { unit: "month", value: Math.round(days / 30) };
  return { unit: "year", value: Math.round((days / 365) * 10) / 10 };
};

/**
 * An interval as the label under a rating button says it: "10 min", "4 days", "3 mo." in the reader's
 * language. Intl spells the unit, so no catalog holds unit names and plurals come out right.
 */
export const intervalLabel = (lang: UiLang, ms: number): string => {
  const { unit, value } = unitOf(Math.max(0, ms));
  return new Intl.NumberFormat(lang, {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
};

/** "today", "3 days ago", "сегодня", "3 dni temu": a past moment in whole days, as people say it. */
export const daysAgo = (lang: UiLang, atMs: number, nowMs: number): string =>
  new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(
    -Math.max(0, Math.round((nowMs - atMs) / DAY_MS)),
    "day",
  );

export const percent = (lang: UiLang, share: number): string =>
  new Intl.NumberFormat(lang, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(share);
