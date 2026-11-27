import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkRepository,
  frameworkLayout,
  initRepository,
  skillFolderHash,
} from "../src/index.js";
import { tempDir } from "./helpers.js";
import {
  FRAMEWORK,
  initializedRepository,
  layoutWithSkillsCopy,
} from "./setup-fixtures.js";

const TEMPLATE = frameworkLayout(FRAMEWORK).templateDir;

const read = (root: string, path: string): Promise<string> =>
  readFile(join(root, path), "utf8");

const readJson = async (root: string, path: string): Promise<unknown> =>
  JSON.parse(await read(root, path));

const posix = (path: string): string => path.split("\\").join("/");

describe("init", () => {
  it("creates a content repository that passes check, with the zone, language and device given", async () => {
    const { root, report } = await initializedRepository();
    expect(report.created).toContain("AGENTS.md");
    expect(report.created).toContain(".codex/config.toml");
    expect(report.created).toContain("content/.gitkeep");
    expect(report.kept).toEqual([]);
    expect(report.config).toEqual({
      written: true,
      timezone: "Asia/Kolkata",
      uiLanguage: "pl",
    });
    expect(report.device).toEqual({ name: "desk1", written: true });
    expect(report.hasGit).toBe(false);
    expect(await readJson(root, "learn.local.json")).toEqual({
      device: "desk1",
    });
    const template = await read(TEMPLATE, "learn.config.json");
    expect(await read(root, "learn.config.json")).toBe(
      template
        .replace('"Europe/Warsaw"', '"Asia/Kolkata"')
        .replace('"uiLanguage": "ru"', '"uiLanguage": "pl"'),
    );
    expect((await checkRepository(root)).findings).toEqual([]);
  });

  it("installs every skill for both agents and locks it as npx skills add --copy would", async () => {
    const { root, report } = await initializedRepository();
    const skills = (await readdir(join(FRAMEWORK, "skills"))).sort();
    expect(report.skills).toHaveLength(skills.length * 2);
    expect(
      report.skills.every((install) => install.status === "installed"),
    ).toBe(true);
    const lock = await readJson(root, "skills-lock.json");
    const expected: Record<string, unknown> = {};
    for (const skill of skills) {
      const hash = await skillFolderHash(join(FRAMEWORK, "skills", skill));
      expect(
        await skillFolderHash(join(root, ".claude", "skills", skill)),
      ).toBe(hash);
      expect(
        await skillFolderHash(join(root, ".agents", "skills", skill)),
      ).toBe(hash);
      expected[skill] = {
        source: posix(
          relative(await realpath(root), join(FRAMEWORK, "skills")),
        ),
        sourceType: "local",
        computedHash: hash,
        installMode: "copy",
      };
    }
    expect(lock).toEqual({ version: 2, skills: expected });
  });

  it("keeps the template's framework link when the repository sits next to a checkout named wastech-learn", async () => {
    const parent = await tempDir();
    const root = join(parent, "wastech-learn-content");
    const outcome = await initRepository({
      root,
      framework: {
        ...frameworkLayout(FRAMEWORK),
        dir: join(parent, "wastech-learn"),
      },
      timezone: "UTC",
      uiLanguage: "en",
      device: "desk1",
    });
    expect(outcome.kind).toBe("done");
    expect(await read(root, "package.json")).toBe(
      await read(TEMPLATE, "package.json"),
    );
  });

  it("links the framework by its path from the repository when it sits elsewhere", async () => {
    const { root } = await initializedRepository();
    const manifest = await read(root, "package.json");
    const link = posix(relative(await realpath(root), FRAMEWORK));
    expect(manifest).toContain(`"file:${link}/packages/cli"`);
    expect(manifest).toContain(`"file:${link}/packages/mcp-server"`);
    expect(manifest).not.toContain("file:../wastech-learn/");
  });

  it("writes paths from the physical folder when the repository is reached through a link", async () => {
    const real = await tempDir();
    const linked = join(await tempDir(), "projects");
    await symlink(real, linked, "dir");
    const outcome = await initRepository({
      root: join(linked, "content"),
      framework: frameworkLayout(FRAMEWORK),
      timezone: "UTC",
      uiLanguage: "en",
      device: "desk1",
    });
    expect(outcome.kind).toBe("done");
    const physical = join(await realpath(real), "content");
    const link = posix(relative(physical, FRAMEWORK));
    expect(await read(physical, "package.json")).toContain(
      `"file:${link}/packages/cli"`,
    );
  });

  it("stops before writing anything when skills-lock.json is in a format it cannot read", async () => {
    const root = await tempDir();
    await writeFile(
      join(root, "learn.config.json"),
      await read(TEMPLATE, "learn.config.json"),
    );
    await writeFile(
      join(root, "skills-lock.json"),
      JSON.stringify({ version: 1, skills: {} }),
    );
    await expect(
      initRepository({
        root,
        framework: frameworkLayout(FRAMEWORK),
        timezone: "UTC",
        uiLanguage: "en",
        device: "desk1",
      }),
    ).rejects.toMatchObject({
      code: "config-invalid",
      file: "skills-lock.json",
    });
    expect((await readdir(root)).sort()).toEqual([
      "learn.config.json",
      "skills-lock.json",
    ]);
  });

  it("changes nothing when it runs again", async () => {
    const { root } = await initializedRepository();
    const before = await read(root, "skills-lock.json");
    const again = await initRepository({
      root,
      framework: frameworkLayout(FRAMEWORK),
      timezone: "Europe/Warsaw",
      uiLanguage: "ru",
      device: "laptop1",
    });
    expect(again.kind).toBe("done");
    if (again.kind !== "done") return;
    expect(again.report.created).toEqual([]);
    expect(again.report.kept).toEqual([]);
    expect(again.report.config).toEqual({ written: false });
    expect(again.report.device).toEqual({ name: "desk1", written: false });
    expect(
      again.report.skills.every((install) => install.status === "current"),
    ).toBe(true);
    expect(await read(root, "skills-lock.json")).toBe(before);
    expect(await readJson(root, "learn.config.json")).toMatchObject({
      timezone: "Asia/Kolkata",
      uiLanguage: "pl",
    });
  });

  it("never overwrites a file and reports a framework file that differs from the template", async () => {
    const { root } = await initializedRepository();
    await writeFile(join(root, "AGENTS.md"), "# Mine\n");
    await writeFile(join(root, "README.md"), "# My notes\n");
    await rm(join(root, ".mcp.json"));
    const again = await initRepository({
      root,
      framework: frameworkLayout(FRAMEWORK),
      timezone: "UTC",
      uiLanguage: "en",
    });
    if (again.kind !== "done") throw new Error("refused");
    expect(again.report.kept).toEqual(["AGENTS.md"]);
    expect(again.report.created).toEqual([".mcp.json"]);
    expect(await read(root, "AGENTS.md")).toBe("# Mine\n");
    expect(await read(root, "README.md")).toBe("# My notes\n");
  });

  it("refuses a folder that holds files a content repository does not have, and writes nothing", async () => {
    const root = await tempDir();
    await writeFile(join(root, "notes.txt"), "mine\n");
    await mkdir(join(root, "photos"));
    const outcome = await initRepository({
      root,
      framework: frameworkLayout(FRAMEWORK),
      timezone: "UTC",
      uiLanguage: "en",
      device: "desk1",
    });
    expect(outcome).toEqual({
      kind: "refused",
      foreign: ["notes.txt", "photos"],
    });
    expect((await readdir(root)).sort()).toEqual(["notes.txt", "photos"]);
  });

  it("accepts a fresh clone that holds only git and a README, and keeps the README", async () => {
    const root = await tempDir();
    await mkdir(join(root, ".git"));
    await writeFile(join(root, "README.md"), "# On GitHub\n");
    const outcome = await initRepository({
      root,
      framework: frameworkLayout(FRAMEWORK),
      timezone: "UTC",
      uiLanguage: "en",
      device: "desk1",
    });
    expect(outcome.kind).toBe("done");
    if (outcome.kind !== "done") return;
    expect(outcome.report.hasGit).toBe(true);
    expect(outcome.report.created).not.toContain("README.md");
    expect(await read(root, "README.md")).toBe("# On GitHub\n");
  });

  it("names the device after the hostname when none is given, and keeps a name already written", async () => {
    const root = join(await tempDir(), "content");
    const first = await initRepository({
      root,
      framework: frameworkLayout(FRAMEWORK),
      timezone: "UTC",
      uiLanguage: "en",
      hostname: () => "Desk-1.local",
    });
    expect(first.kind === "done" && first.report.device).toEqual({
      name: "desk-1",
      written: true,
    });
    await writeFile(
      join(root, "learn.local.json"),
      '{ "device": "laptop1" }\n',
    );
    const second = await initRepository({
      root,
      framework: frameworkLayout(FRAMEWORK),
      timezone: "UTC",
      uiLanguage: "en",
      device: "desk2",
    });
    expect(second.kind === "done" && second.report.device).toEqual({
      name: "laptop1",
      written: false,
    });
  });

  it("updates a skill the framework changed and keeps a copy someone edited by hand", async () => {
    const framework = await layoutWithSkillsCopy();
    const { root } = await initializedRepository(framework);
    const lockBefore = (await readJson(root, "skills-lock.json")) as {
      skills: Record<string, { computedHash: string }>;
    };
    await appendFile(
      join(framework.skillsDir, "learn-quiz", "SKILL.md"),
      "\nNew step.\n",
    );
    await appendFile(
      join(framework.skillsDir, "learn-capture", "SKILL.md"),
      "\nNew step.\n",
    );
    await appendFile(
      join(root, ".claude", "skills", "learn-capture", "SKILL.md"),
      "\nMine.\n",
    );

    const again = await initRepository({
      root,
      framework,
      timezone: "UTC",
      uiLanguage: "en",
    });
    if (again.kind !== "done") throw new Error("refused");
    const statusOf = (skill: string, dir: string): string | undefined =>
      again.report.skills.find(
        (install) => install.skill === skill && install.dir === dir,
      )?.status;
    expect(statusOf("learn-quiz", ".claude/skills")).toBe("updated");
    expect(statusOf("learn-quiz", ".agents/skills")).toBe("updated");
    expect(statusOf("learn-capture", ".claude/skills")).toBe("kept");
    expect(statusOf("learn-capture", ".agents/skills")).toBe("updated");
    expect(statusOf("learn-import", ".claude/skills")).toBe("current");

    const lock = (await readJson(
      root,
      "skills-lock.json",
    )) as typeof lockBefore;
    expect(lock.skills["learn-quiz"]?.computedHash).toBe(
      await skillFolderHash(join(framework.skillsDir, "learn-quiz")),
    );
    expect(lock.skills["learn-capture"]).toEqual(
      lockBefore.skills["learn-capture"],
    );
    expect(await read(root, ".claude/skills/learn-capture/SKILL.md")).toContain(
      "Mine.",
    );
    expect(await read(root, ".agents/skills/learn-quiz/SKILL.md")).toContain(
      "New step.",
    );
  });

  it("keeps the lock entries of skills installed from elsewhere", async () => {
    const root = join(await tempDir(), "content");
    await mkdir(root);
    const other = {
      source: "someone/skills",
      sourceType: "github",
      commit: "abc",
      computedHash: "123",
    };
    await writeFile(
      join(root, "skills-lock.json"),
      JSON.stringify({ version: 2, skills: { "zz-other": other } }, null, 2),
    );
    await writeFile(
      join(root, "learn.config.json"),
      await read(TEMPLATE, "learn.config.json"),
    );
    await initRepository({
      root,
      framework: frameworkLayout(FRAMEWORK),
      timezone: "UTC",
      uiLanguage: "en",
      device: "desk1",
    });
    const lock = (await readJson(root, "skills-lock.json")) as {
      skills: Record<string, unknown>;
    };
    expect(lock.skills["zz-other"]).toEqual(other);
    expect(Object.keys(lock.skills)).toEqual([
      "learn-capture",
      "learn-import",
      "learn-quiz",
      "zz-other",
    ]);
  });
});
