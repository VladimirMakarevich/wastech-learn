import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  BLOOM_LEVELS,
  MATERIAL_KINDS,
  PACKAGE_FORMAT,
  PACKAGE_SECTIONS,
  SUMMARY_SECTIONS,
  learningPackageFrontMatterSchema,
} from "@wastech-learn/core";
import { describe, expect, it } from "vitest";

const LANGS = ["en", "ru", "pl"] as const;

const prompt = (lang: (typeof LANGS)[number]): Promise<string> =>
  readFile(
    fileURLToPath(
      new URL(
        `../../../skills/learn-import/templates/export-prompt.${lang}.md`,
        import.meta.url,
      ),
    ),
    "utf8",
  );

// What the package parser needs from a chat, taken from the parser's own definitions, so a prompt that
// stops asking for a field fails here before a package without it fails an import.
const REQUIRED = [
  PACKAGE_FORMAT,
  ...Object.keys(learningPackageFrontMatterSchema.shape),
  ...PACKAGE_SECTIONS,
  ...SUMMARY_SECTIONS,
  ...BLOOM_LEVELS,
  ...MATERIAL_KINDS,
  "Key idea:",
  "### <type> · <bloom> · <idea>",
  '"Q:"',
  '"A:"',
  '"R:"',
  '"E:"',
  "(!)",
  "Title | Kind | Why",
  "basic",
  "cloze",
  "why",
  "compare",
  "scenario",
  "vocab",
];

const numbers = (text: string): string[] =>
  [...text.matchAll(/(?:≤|\b)(\d+(?:–\d+)?)\b/g)]
    .map((match) => match[1] ?? "")
    .sort();

describe("export prompts", () => {
  it("ask for every field, section and card format the package parser reads, in every language", async () => {
    for (const lang of LANGS) {
      const text = await prompt(lang);
      for (const token of REQUIRED) {
        expect([lang, token, text.includes(token)]).toEqual([
          lang,
          token,
          true,
        ]);
      }
    }
  });

  it("state the same limits in every language", async () => {
    const [en, ru, pl] = await Promise.all(LANGS.map(prompt));
    expect(numbers(ru ?? "")).toEqual(numbers(en ?? ""));
    expect(numbers(pl ?? "")).toEqual(numbers(en ?? ""));
  });
});
