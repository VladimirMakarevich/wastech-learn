import type { MessageKey } from "../i18n/en";

/** The toolbar title of each route, read from the route's data. */
export const TITLE_KEY = "titleKey";

export const titleOf = (
  data: Readonly<Record<string, unknown>>,
): MessageKey => {
  const key = data[TITLE_KEY];
  return typeof key === "string" && key.startsWith("title.")
    ? (key as MessageKey)
    : "title.home";
};
