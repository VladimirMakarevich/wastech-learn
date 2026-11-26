import type { Finding } from "../finding.js";
import type { UiLanguage } from "../schema/config.js";
import { en, type MessageKey } from "./en.js";
import { pl } from "./pl.js";
import { ru } from "./ru.js";
import type { Message, PluralMessage } from "./types.js";

export const CATALOGS: Readonly<
  Record<UiLanguage, Readonly<Record<MessageKey, Message>>>
> = {
  en,
  ru,
  pl,
};

const PLURAL_RULES: Readonly<Record<UiLanguage, Intl.PluralRules>> = {
  en: new Intl.PluralRules("en"),
  ru: new Intl.PluralRules("ru"),
  pl: new Intl.PluralRules("pl"),
};

export type MessageParams = Readonly<Record<string, string | number>>;

const pluralForm = (
  lang: UiLanguage,
  message: PluralMessage,
  params: MessageParams,
): string => {
  const value = params[message.count];
  const category = PLURAL_RULES[lang].select(
    typeof value === "number" ? value : Number(value),
  );
  return message[category] ?? message.other;
};

/**
 * Renders a catalog message in the reader's language. Unknown placeholders stay visible as `{name}`
 * instead of disappearing, so a missing parameter shows up in review rather than as a silently odd
 * sentence.
 */
export const formatMessage = (
  lang: UiLanguage,
  key: MessageKey,
  params: MessageParams = {},
): string => {
  const message = CATALOGS[lang][key];
  const template =
    typeof message === "string" ? message : pluralForm(lang, message, params);
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
};

export const formatFinding = (lang: UiLanguage, finding: Finding): string =>
  formatMessage(lang, `finding.${finding.ruleId}`, finding.params);
