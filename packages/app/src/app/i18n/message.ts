/** A plural message: one form per CLDR category the language uses; `other` is always there. */
export interface PluralMessage {
  readonly one: string;
  readonly two?: string;
  readonly few?: string;
  readonly many?: string;
  readonly other: string;
}

/** A sentence with `{name}` placeholders, or its plural forms selected by `{count}`. */
export type Message = string | PluralMessage;

export const UI_LANGS = ["ru", "en", "pl"] as const;
export type UiLang = (typeof UI_LANGS)[number];

export const isUiLang = (value: unknown): value is UiLang =>
  UI_LANGS.some((lang) => lang === value);

export type MessageParams = Readonly<Record<string, string | number>>;
