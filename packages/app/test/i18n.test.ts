import { describe, expect, it } from "vitest";
import { en, type MessageKey } from "../src/app/i18n/en";
import { CATALOGS, translate } from "../src/app/i18n/format";
import { UI_LANGS, type Message } from "../src/app/i18n/message";

/** Every text of a message: the sentence, or each of its plural forms. */
const textsOf = (message: Message): readonly string[] =>
  typeof message === "string"
    ? [message]
    : [
        message.one,
        message.two,
        message.few,
        message.many,
        message.other,
      ].filter((text): text is string => text !== undefined);

const placeholders = (message: Message): string[] => {
  const texts = textsOf(message);
  return [
    ...new Set(
      texts.flatMap((text) =>
        [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? ""),
      ),
    ),
  ].sort();
};

const keys = Object.keys(en) as MessageKey[];

describe("catalog parity", () => {
  it("every language has exactly the English keys", () => {
    for (const lang of UI_LANGS)
      expect(Object.keys(CATALOGS[lang]).sort()).toEqual([...keys].sort());
  });

  it("every message keeps the English placeholders", () => {
    for (const lang of UI_LANGS)
      for (const key of keys)
        expect(placeholders(CATALOGS[lang][key]), `${lang} ${key}`).toEqual(
          placeholders(en[key]),
        );
  });

  it("a plural message has every CLDR form its language uses, and a sentence stays a sentence", () => {
    for (const lang of UI_LANGS) {
      const categories = new Intl.PluralRules(lang).resolvedOptions()
        .pluralCategories;
      for (const key of keys) {
        const message = CATALOGS[lang][key];
        expect(typeof message, `${lang} ${key}`).toBe(typeof en[key]);
        if (typeof message === "string") continue;
        for (const category of categories)
          expect(
            category === "zero" || category in message,
            `${lang} ${key} ${category}`,
          ).toBe(true);
      }
    }
  });
});

describe("plurals", () => {
  it.each([
    [
      "ru",
      ["1 карточка", "2 карточки", "5 карточек", "21 карточка", "1,5 карточки"],
    ],
    ["en", ["1 card", "2 cards", "5 cards", "21 cards", "1.5 cards"]],
    ["pl", ["1 karta", "2 karty", "5 kart", "21 kart", "1,5 karty"]],
  ] as const)("%s counts cards by the CLDR rules", (lang, expected) => {
    expect(
      [1, 2, 5, 21, 1.5].map((count) =>
        translate(lang, "count.cards", { count }),
      ),
    ).toEqual(expected);
  });

  it("formats numbers for the language", () => {
    expect(translate("ru", "count.cards", { count: 1500 })).toBe(
      // Russian groups thousands with a no-break space, so a count never wraps in the middle.
      "1\u00a0500 карточек",
    );
    expect(translate("en", "count.cards", { count: 1500 })).toBe("1,500 cards");
  });
});

// Wording the product never uses: guilt, debt, streaks, "wrong" (the tone rules list the calm versions).
const FORBIDDEN: Readonly<
  Record<(typeof UI_LANGS)[number], readonly RegExp[]>
> = {
  ru: [
    /пропусти/i,
    /пропущ/i,
    /серия/i,
    /стрик/i,
    /неправильно/i,
    /ошиблись/i,
    /осталось/i,
    /долг/i,
    /просроч/i,
  ],
  en: [
    /missed/i,
    /streak/i,
    /wrong/i,
    /you failed/i,
    /overdue/i,
    /\bdebt\b/i,
    /behind/i,
  ],
  pl: [
    /pominię/i,
    /opuści/i,
    /\bseria\b/i,
    /źle/i,
    /błędnie/i,
    /zaległ/i,
    /\bdług\b/i,
  ],
};

describe("tone", () => {
  it("no catalog carries guilt, streaks or debt", () => {
    for (const lang of UI_LANGS)
      for (const key of keys) {
        const message = CATALOGS[lang][key];
        const texts = textsOf(message);
        for (const text of texts)
          for (const pattern of FORBIDDEN[lang])
            expect(pattern.test(text), `${lang} ${key}: ${text}`).toBe(false);
      }
  });
});
