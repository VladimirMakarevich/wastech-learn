import { en, type MessageKey } from "./en";
import type { Message, MessageParams, UiLang } from "./message";
import { pl } from "./pl";
import { ru } from "./ru";

export const CATALOGS: Readonly<
  Record<UiLang, Readonly<Record<MessageKey, Message>>>
> = { ru, en, pl };

const pluralRules = new Map<UiLang, Intl.PluralRules>();

const rulesFor = (lang: UiLang): Intl.PluralRules => {
  let rules = pluralRules.get(lang);
  if (rules === undefined) {
    rules = new Intl.PluralRules(lang);
    pluralRules.set(lang, rules);
  }
  return rules;
};

const fill = (template: string, params: MessageParams, lang: UiLang): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === "number"
      ? new Intl.NumberFormat(lang).format(value)
      : value;
  });

/**
 * One message in the reader's language. A plural message picks its form for `params.count` by the
 * language's CLDR rules: "1 карточка, 2 карточки, 5 карточек" and "1 karta, 2 karty, 5 kart" come from one
 * call each. Numbers are formatted for the language, so 1500 reads "1 500" in Russian and "1,500" in English.
 */
export const translate = (
  lang: UiLang,
  key: MessageKey,
  params: MessageParams = {},
): string => {
  const message = CATALOGS[lang][key];
  if (typeof message === "string") return fill(message, params, lang);
  const count = typeof params.count === "number" ? params.count : 0;
  const category = rulesFor(lang).select(count);
  const form =
    (category === "zero" ? undefined : message[category]) ?? message.other;
  return fill(form, params, lang);
};
