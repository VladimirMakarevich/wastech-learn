import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cli, goldenCopy, tempDir } from "./helpers.js";

const BASIC_CARD = "content/dotnet/async-await/cards/capexe3a.md";

describe("wastech-learn check", () => {
  it("passes the golden sample with exit code 0", async () => {
    const root = await goldenCopy();
    const result = await cli(["check", "--content", root, "--lang", "en"]);
    expect(result).toMatchObject({ code: 0, err: "" });
    expect(result.out).toBe("30 cards checked, no findings");
  });

  it("speaks the repository's uiLanguage when --lang is absent", async () => {
    const result = await cli(["check", "--content", await goldenCopy()]);
    expect(result.out).toBe("Проверено: 30 карточек, замечаний нет");
  });

  it("exits 1 and names the file and rule of an error, without quoting the card", async () => {
    const root = await goldenCopy();
    const path = join(root, BASIC_CARD);
    const text = await readFile(path, "utf8");
    const answer =
      "`ACB`: до первого незавершённого `await` метод выполняется синхронно.";
    const long = `${answer} Это длинное объяснение, которое явно не помещается в двенадцать слов ответа.`;
    await writeFile(path, text.replace(answer, long));
    const result = await cli(["check", "--content", root, "--lang", "pl"]);
    expect(result.code).toBe(1);
    expect(result.out).toContain(BASIC_CARD);
    expect(result.out).toContain("answer-words");
    expect(result.out).toContain("Odpowiedź ma 19 słów, limit dla basic to 12");
    expect(result.out).toContain("1 plik, 1 błąd, 0 ostrzeżeń");
    expect(result.out).not.toContain("длинное объяснение");
  });

  it("exits 2 with the file and field when the config is invalid", async () => {
    const root = await goldenCopy();
    const path = join(root, "learn.config.json");
    await writeFile(
      path,
      (await readFile(path, "utf8")).replace(
        '"desiredRetention": 0.9',
        '"desiredRetention": 1.5',
      ),
    );
    const result = await cli(["check", "--content", root, "--lang", "en"]);
    expect(result.code).toBe(2);
    expect(result.err).toBe(
      "learn.config.json: srs.desiredRetention is invalid, fix the value and run again",
    );
  });

  it("exits 2 outside a content repository", async () => {
    const root = await tempDir();
    const result = await cli(["check", "--content", root]);
    expect(result.code).toBe(2);
    expect(result.err).toContain("learn.config.json");
  });

  it("exits 2 on an unknown option, an unknown command and a bad --lang", async () => {
    expect(await cli(["check", "--frobnicate"])).toMatchObject({
      code: 2,
      err: "Unknown option --frobnicate: run wastech-learn --help",
    });
    expect(await cli(["chek"])).toMatchObject({
      code: 2,
      err: "Unknown command chek: run wastech-learn --help",
    });
    expect((await cli(["check", "--lang", "de"])).code).toBe(2);
    expect((await cli([])).code).toBe(2);
  });

  it("accepts common options before the command", async () => {
    const root = await goldenCopy();
    const result = await cli(["--lang", "en", "--content", root, "check"]);
    expect(result).toMatchObject({
      code: 0,
      out: "30 cards checked, no findings",
    });
  });

  it("prints help with exit code 0", async () => {
    const result = await cli(["--help"]);
    expect(result.code).toBe(0);
    expect(result.out).toContain("wastech-learn <command>");
  });
});
