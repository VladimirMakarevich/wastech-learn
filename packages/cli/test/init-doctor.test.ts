import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MIN_NODE_VERSION } from "../src/framework.js";
import { cli, tempDir } from "./helpers.js";

const readJson = async (root: string, file: string): Promise<unknown> =>
  JSON.parse(await readFile(join(root, file), "utf8"));

const newFolder = async (): Promise<string> => join(await tempDir(), "content");

describe("wastech-learn init", () => {
  it("creates a repository in the interface language given and names the next steps", async () => {
    const root = await newFolder();
    const result = await cli([
      "init",
      "--content",
      root,
      "--device",
      "desk1",
      "--timezone",
      "Europe/Warsaw",
      "--ui-language",
      "ru",
    ]);
    expect(result.code).toBe(0);
    expect(result.out).toContain(`Контент-репозиторий готов в ${root}`);
    expect(result.out).toContain(
      "learn.config.json: часовой пояс Europe/Warsaw, язык интерфейса ru",
    );
    expect(result.out).toContain("устройство desk1");
    expect(result.out).toContain(
      "Skills установлены для Claude Code и Codex: learn-capture, learn-import, learn-quiz",
    );
    expect(result.out).toContain(
      [
        "Дальше:",
        `  cd ${root}`,
        "  git init -b main",
        "  npm install",
        "  npx wastech-learn doctor",
      ].join("\n"),
    );
    expect(await readJson(root, "learn.local.json")).toEqual({
      device: "desk1",
    });
  });

  it("takes the zone, language and device name from the computer when none is given", async () => {
    const root = await newFolder();
    const result = await cli(["init", "--content", root]);
    expect(result.code).toBe(0);
    expect(await readJson(root, "learn.config.json")).toMatchObject({
      timezone: "Asia/Kolkata",
      uiLanguage: "pl",
    });
    expect(await readJson(root, "learn.local.json")).toEqual({
      device: "test-box",
    });
    expect(result.out).toContain("Repozytorium treści gotowe");
  });

  it("uses the --lang of the messages as the interface language too", async () => {
    const root = await newFolder();
    const result = await cli(["init", "--content", root, "--lang", "en"]);
    expect(result.out).toContain("interface language en");
    expect(await readJson(root, "learn.config.json")).toMatchObject({
      uiLanguage: "en",
    });
  });

  it("reports a repository that is already complete without touching it", async () => {
    const root = await newFolder();
    await cli(["init", "--content", root, "--device", "desk1"]);
    const again = await cli([
      "init",
      "--content",
      root,
      "--device",
      "laptop1",
      "--lang",
      "en",
    ]);
    expect(again.code).toBe(0);
    expect(again.out).toContain("learn.config.json is already there");
    expect(again.out).toContain(
      "learn.local.json already names this computer desk1",
    );
    expect(again.out).toContain(
      "Skills are up to date: learn-capture, learn-import, learn-quiz",
    );
    expect(again.out).not.toContain("Created from the template");
  });

  it.each([
    ["--device", "My PC"],
    ["--timezone", "Mars/Olympus"],
    ["--ui-language", "de"],
  ])(
    "stops with exit 2 on an invalid %s and writes nothing",
    async (option, value) => {
      const root = await newFolder();
      const result = await cli([
        "init",
        "--content",
        root,
        option,
        value,
        "--lang",
        "en",
      ]);
      expect(result.code).toBe(2);
      expect(result.err).toBe(
        `Invalid value ${value} for ${option}: run wastech-learn --help`,
      );
      await expect(readdir(root)).rejects.toThrow();
    },
  );

  it("refuses a folder with files of its own, with exit 2", async () => {
    const root = await tempDir();
    await writeFile(join(root, "notes.txt"), "mine\n");
    const result = await cli(["init", "--content", root, "--lang", "en"]);
    expect(result.code).toBe(2);
    expect(result.err).toContain(
      `${root} holds files a content repository does not have (notes.txt)`,
    );
    expect(await readdir(root)).toEqual(["notes.txt"]);
  });
});

describe("wastech-learn doctor", () => {
  it("fails with exit 1 and names the fix while the content dependencies are missing", async () => {
    const root = await newFolder();
    await cli(["init", "--content", root, "--device", "desk1"]);
    const result = await cli(["doctor", "--content", root, "--lang", "en"]);
    expect(result.code).toBe(1);
    expect(result.out).toContain("✓ Node 24.17.0");
    expect(result.out).toContain(
      "✓ learn.config.json: time zone Asia/Kolkata, interface language pl",
    );
    expect(result.out).toContain(
      "✓ Device desk1: reviews go to reviews/desk1/",
    );
    expect(result.out).toContain(
      "✗ Not installed in the content repository: wastech-learn, wastech-learn-mcp, wastech-mdlint, wastech-mdlint-mcp; run npm install there",
    );
    expect(result.out).toContain(
      "! Not a git repository: run git init -b main",
    );
    expect(result.out).toMatch(/\n\d+ errors?, \d+ warnings?$/);
  });

  it("speaks the repository's own language by default", async () => {
    const root = await newFolder();
    await cli(["init", "--content", root, "--ui-language", "ru"]);
    const result = await cli(["doctor", "--content", root]);
    expect(result.out).toContain("Это не git-репозиторий");
  });

  it("checks the Node every package declares in engines", async () => {
    const packages = join(import.meta.dirname, "..", "..");
    for (const name of await readdir(packages)) {
      const manifest = (await readJson(
        join(packages, name),
        "package.json",
      )) as {
        engines?: { node?: string };
      };
      expect(manifest.engines?.node).toBe(`>=${MIN_NODE_VERSION}`);
    }
  });
});

describe("wastech-learn --help", () => {
  it("lists init and doctor", async () => {
    const result = await cli(["--help", "--lang", "en"]);
    expect(result.out).toMatch(/^ {2}init {7}/m);
    expect(result.out).toMatch(/^ {2}doctor {5}/m);
    expect(result.out).toContain("init:     --device <name>");
  });
});
