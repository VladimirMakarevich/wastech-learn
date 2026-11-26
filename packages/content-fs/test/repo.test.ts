import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LearnError, parseContent } from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import { loadConfig, loadDevice, loadRepository } from "../src/index.js";
import { GOLDEN, goldenCopy, tempDir } from "./helpers.js";

describe("loadRepository on the golden sample", () => {
  it("names the device after the hostname when learn.local.json is missing", async () => {
    const repo = await loadRepository(GOLDEN, {
      hostname: () => "Desk-1.local",
    });
    expect(repo.device).toEqual({ device: "desk-1", source: "hostname" });
    expect(repo.config.timezone).toBe("Europe/Warsaw");
    expect(repo.config.srs.model).toBe("FSRS-7");
    expect(repo.config.limits.domains["lang-pl"]).toEqual({
      newPerDay: 10,
      reviewsPerDay: 150,
    });
  });

  it("loads content files under repository-relative POSIX paths", async () => {
    const repo = await loadRepository(GOLDEN);
    expect(repo.files.has("content/architecture/backpressure/index.md")).toBe(
      true,
    );
    expect(
      repo.files.has("content/dotnet/async-await/diagrams/deadlock.mmd"),
    ).toBe(true);
    expect(repo.files.has("wastech-mdlint.config.json")).toBe(true);
  });

  it("parses into 3 topics and 30 cards with variants by type", async () => {
    const repo = await loadRepository(GOLDEN);
    const { model, findings } = await parseContent(repo.files);
    expect(findings).toEqual([]);
    expect(model.topics).toHaveLength(3);
    expect(model.cards).toHaveLength(30);
    for (const card of model.cards) {
      const { type } = card.frontMatter;
      if (type === "cloze" || type === "grammar-cloze") {
        expect(card.variants.length).toBeGreaterThan(0);
        card.variants.forEach((variant, index) => {
          expect(variant).toBe(`c${String(index + 1)}`);
        });
      } else if (type === "vocab" || type === "reversed") {
        expect(card.variants).toEqual(["fwd", "rev"]);
      } else {
        expect(card.variants).toEqual(["main"]);
      }
    }
    expect(new Set(model.cards.map((card) => card.lang))).toEqual(
      new Set(["en", "ru", "pl"]),
    );
  });
});

describe("loadConfig", () => {
  it("names the file and the field of an invalid value", async () => {
    const root = await goldenCopy();
    const path = join(root, "learn.config.json");
    const config = JSON.parse(await readFile(path, "utf8")) as {
      srs: Record<string, unknown>;
    };
    config.srs.desiredRetention = 1.5;
    await writeFile(path, JSON.stringify(config));
    const error = await loadConfig(root).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LearnError);
    expect(error).toMatchObject({
      code: "config-invalid",
      file: "learn.config.json",
      field: "srs.desiredRetention",
    });
  });

  it("reports a folder that is not a content repository", async () => {
    const error = await loadConfig(await tempDir()).catch(
      (caught: unknown) => caught,
    );
    expect(error).toMatchObject({
      code: "repository-not-found",
      file: "learn.config.json",
    });
  });

  it("reports broken JSON as an invalid config", async () => {
    const root = await tempDir();
    await writeFile(join(root, "learn.config.json"), "{ nope");
    await expect(loadConfig(root)).rejects.toMatchObject({
      code: "config-invalid",
    });
  });
});

describe("loadDevice", () => {
  it("prefers learn.local.json over the hostname", async () => {
    const root = await tempDir();
    await writeFile(
      join(root, "learn.local.json"),
      JSON.stringify({ device: "laptop" }),
    );
    expect(await loadDevice(root, () => "desk")).toEqual({
      device: "laptop",
      source: "local",
    });
  });

  it("rejects a device name that is not a safe folder name", async () => {
    const root = await tempDir();
    await writeFile(
      join(root, "learn.local.json"),
      JSON.stringify({ device: "../x" }),
    );
    await expect(loadDevice(root)).rejects.toMatchObject({
      code: "config-invalid",
      file: "learn.local.json",
      field: "device",
    });
  });
});
