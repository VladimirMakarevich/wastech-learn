/**
 * A message whose wording depends on a number. Each language lists the CLDR plural categories it uses
 * (English: one, other; Russian and Polish: one, few, many, other), so "1 карточка / 2 карточки /
 * 5 карточек" comes out right without building sentences from fragments.
 */
export interface PluralMessage {
  /** Name of the numeric parameter that selects the form. */
  readonly count: string;
  readonly zero?: string;
  readonly one?: string;
  readonly two?: string;
  readonly few?: string;
  readonly many?: string;
  readonly other: string;
}

/** A template with `{name}` placeholders, or a set of plural forms of one. */
export type Message = string | PluralMessage;
