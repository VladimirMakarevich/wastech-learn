import { describe, expect, it } from "vitest";
import {
  CATALOGS,
  RULE_IDS,
  UI_LANGUAGES,
  formatFinding,
  formatMessage,
  type Message,
} from "../src/index.js";

const textsOf = (message: Message): string[] =>
  typeof message === "string"
    ? [message]
    : [
        message.zero,
        message.one,
        message.two,
        message.few,
        message.many,
        message.other,
      ].filter((text): text is string => text !== undefined);

const placeholders = (message: Message): string[] => {
  const names = textsOf(message).flatMap((text) =>
    [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? ""),
  );
  return [...new Set(names)].sort();
};

describe("message catalogs", () => {
  it("have the same keys in ru, en and pl", () => {
    const keys = Object.keys(CATALOGS.en).sort();
    for (const lang of UI_LANGUAGES)
      expect(Object.keys(CATALOGS[lang]).sort()).toEqual(keys);
  });

  it("use the same placeholders in every language", () => {
    for (const [key, message] of Object.entries(CATALOGS.en)) {
      for (const lang of UI_LANGUAGES) {
        const other = CATALOGS[lang][key as keyof typeof CATALOGS.en];
        expect([lang, key, placeholders(other)]).toEqual([
          lang,
          key,
          placeholders(message),
        ]);
      }
    }
  });

  it("give every plural message each CLDR form its language needs", () => {
    for (const lang of UI_LANGUAGES) {
      const categories = new Intl.PluralRules(lang).resolvedOptions()
        .pluralCategories;
      for (const [key, message] of Object.entries(CATALOGS[lang])) {
        if (typeof message === "string") continue;
        for (const category of categories) {
          expect([lang, key, category, category in message]).toEqual([
            lang,
            key,
            category,
            true,
          ]);
        }
      }
    }
  });

  it("have a message for every rule a finding can come from", () => {
    for (const ruleId of RULE_IDS)
      expect(`finding.${ruleId}` in CATALOGS.en).toBe(true);
  });
});

describe("formatMessage", () => {
  const finding = {
    ruleId: "answer-words",
    severity: "error",
    file: "content/a/b/cards/7k2m9xqd.md",
    params: { count: 19, limit: 12, type: "basic" },
  } as const;

  it("renders a finding in Polish", () => {
    expect(formatFinding("pl", finding)).toBe(
      "Odpowiedź ma 19 słów, limit dla basic to 12",
    );
  });

  it("picks the Russian plural form by count", () => {
    expect(formatMessage("ru", "count.cards", { count: 1 })).toBe("1 карточка");
    expect(formatMessage("ru", "count.cards", { count: 3 })).toBe("3 карточки");
    expect(formatMessage("ru", "count.cards", { count: 25 })).toBe(
      "25 карточек",
    );
    expect(formatFinding("ru", finding)).toBe(
      "Ответ 19 слов, для basic не больше 12",
    );
  });

  it("keeps an unknown placeholder visible", () => {
    expect(formatMessage("en", "finding.id-unique", { id: "x" })).toBe(
      "id x is already used in {other}",
    );
  });
});
