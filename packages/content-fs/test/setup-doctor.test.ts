import { execFile } from "node:child_process";
import { appendFile, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SETUP_CHECK_LEVELS,
  diagnoseSetup,
  frameworkLayout,
  gitEnvironment,
  type BuildUnit,
  type SetupCheck,
} from "../src/index.js";
import { git } from "./git-repo.js";
import { tempDir } from "./helpers.js";
import {
  FRAMEWORK,
  buildUnit,
  initializedRepository,
  installDependencies,
} from "./setup-fixtures.js";

const exec = promisify(execFile);

const FRESH = "2026-11-20T10:00:00.000Z";
const LATER = "2026-11-21T10:00:00.000Z";

// The machine's own git identity must not decide a test: git reads neither the global nor the system
// config here, so a repository has exactly the identity a test gives it.
beforeEach(async () => {
  const empty = join(await tempDir(), "gitconfig");
  await writeFile(empty, "");
  vi.stubEnv("GIT_CONFIG_GLOBAL", empty);
  vi.stubEnv("GIT_CONFIG_NOSYSTEM", "1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const diagnose = async (
  root: string,
  overrides: {
    readonly builds?: readonly BuildUnit[];
    readonly nodeVersion?: string;
  } = {},
): Promise<readonly SetupCheck[]> =>
  diagnoseSetup({
    root,
    framework: frameworkLayout(FRAMEWORK),
    builds: overrides.builds ?? [await buildUnit(FRESH, LATER)],
    nodeVersion: overrides.nodeVersion ?? "24.17.0",
    minNodeVersion: "24.17.0",
    hostname: () => "Test-Box.local",
  });

const ids = (checks: readonly SetupCheck[]): readonly string[] =>
  checks.map((check) => check.id);

const find = (
  checks: readonly SetupCheck[],
  id: SetupCheck["id"],
): SetupCheck | undefined => checks.find((check) => check.id === id);

/** A repository as the setup leaves it: init, npm install, git with an identity and a pushed branch. */
const finishedSetup = async (): Promise<string> => {
  const { root } = await initializedRepository();
  await installDependencies(root);
  await git(root, "init", "-q", "-b", "main");
  await git(root, "config", "user.name", "desk1");
  await git(root, "config", "user.email", "desk1@example.test");
  await git(root, "add", "--all");
  await git(root, "commit", "-q", "-m", "chore: start");
  const bare = join(await tempDir(), "content.git");
  await exec("git", ["init", "-q", "--bare", "-b", "main", bare], {
    env: gitEnvironment(),
  });
  await git(root, "remote", "add", "origin", bare);
  await git(root, "push", "-q", "-u", "origin", "main");
  return root;
};

describe("doctor", () => {
  it("passes a finished setup, every check in the order a fix has to follow", async () => {
    const checks = await diagnose(await finishedSetup());
    expect(ids(checks)).toEqual([
      "node",
      "build",
      "config",
      "device",
      "deps",
      "skills",
      "template",
      "git",
    ]);
    expect(checks.every((check) => SETUP_CHECK_LEVELS[check.id] === "ok")).toBe(
      true,
    );
    expect(find(checks, "config")?.params).toEqual({
      timezone: "Asia/Kolkata",
      language: "pl",
    });
    expect(find(checks, "git")?.params).toEqual({
      branch: "main",
      upstream: "origin/main",
    });
  });

  it("reports a Node older than the framework needs", async () => {
    const { root } = await initializedRepository();
    const checks = await diagnose(root, { nodeVersion: "22.11.0" });
    expect(checks[0]).toEqual({
      id: "node-old",
      params: { version: "22.11.0", required: "24.17.0" },
    });
    expect(SETUP_CHECK_LEVELS["node-old"]).toBe("error");
  });

  it("tells a framework that was never built from one whose sources changed after the build", async () => {
    const { root } = await initializedRepository();
    const missing = await diagnose(root, {
      builds: [await buildUnit(FRESH, undefined)],
    });
    expect(find(missing, "build-missing")?.params).toEqual({
      packages: "core",
      dir: FRAMEWORK,
    });
    const stale = await diagnose(root, {
      builds: [await buildUnit(LATER, FRESH)],
    });
    expect(find(stale, "build-stale")?.params).toEqual({
      packages: "core",
      dir: FRAMEWORK,
    });
  });

  it("counts a rebuilt package as fresh when its marker is newer than the sources", async () => {
    const { root } = await initializedRepository();
    const unit = await buildUnit(LATER, FRESH);
    const marker = join(await tempDir(), "tsconfig.tsbuildinfo");
    await writeFile(marker, "{}");
    const checks = await diagnose(root, {
      builds: [{ ...unit, markers: [marker] }],
    });
    expect(find(checks, "build")).toBeDefined();
  });

  it("stops after the config in a folder that is not a content repository", async () => {
    const checks = await diagnose(await tempDir());
    expect(ids(checks)).toEqual(["node", "build", "config-missing"]);
  });

  it("names the invalid field of the config, and a config that is not JSON at all", async () => {
    const { root } = await initializedRepository();
    await writeFile(
      join(root, "learn.config.json"),
      JSON.stringify({ timezone: "Mars/Olympus" }),
    );
    expect(find(await diagnose(root), "config-invalid")?.params).toEqual({
      field: "timezone",
    });
    await writeFile(join(root, "learn.config.json"), "{ nope");
    expect(find(await diagnose(root), "config-json")).toBeDefined();
  });

  it("warns that the hostname names the device when learn.local.json is missing, and rejects a bad name", async () => {
    const { root } = await initializedRepository();
    await rm(join(root, "learn.local.json"));
    expect(find(await diagnose(root), "device-hostname")?.params).toEqual({
      device: "test-box",
    });
    await writeFile(join(root, "learn.local.json"), '{ "device": "My PC" }');
    expect(find(await diagnose(root), "device-invalid")?.params).toEqual({
      field: "device",
    });
    await writeFile(join(root, "learn.local.json"), "{ device: desk1 }");
    expect(find(await diagnose(root), "device-json")).toBeDefined();
  });

  it("names every command npm install did not link", async () => {
    const { root } = await initializedRepository();
    expect(find(await diagnose(root), "deps-missing")?.params).toEqual({
      bins: "wastech-learn, wastech-learn-mcp, wastech-mdlint, wastech-mdlint-mcp",
    });
  });

  it("warns when the repository links another checkout of the framework", async () => {
    const { root } = await initializedRepository();
    const other = join(await tempDir(), "wastech-learn", "packages", "cli");
    await mkdir(other, { recursive: true });
    await installDependencies(root, other);
    expect(
      find(await diagnose(root), "deps-other-framework")?.params.dir,
    ).toMatch(/wastech-learn$/);
  });

  it("finds a missing skill and a skill that differs from the framework", async () => {
    const { root } = await initializedRepository();
    await rm(join(root, ".agents", "skills", "learn-quiz"), {
      recursive: true,
    });
    await appendFile(
      join(root, ".claude", "skills", "learn-capture", "SKILL.md"),
      "\nMine.\n",
    );
    const checks = await diagnose(root);
    expect(find(checks, "skill-missing")?.params).toEqual({
      skill: "learn-quiz",
      dir: ".agents/skills",
    });
    expect(find(checks, "skill-differs")?.params).toEqual({
      skill: "learn-capture",
      dir: ".claude/skills",
    });
    expect(find(checks, "skills")).toBeUndefined();
  });

  it("warns about a framework file that changed or went missing, but not about the README", async () => {
    const { root } = await initializedRepository();
    await writeFile(join(root, "AGENTS.md"), "# Mine\n");
    await writeFile(join(root, "README.md"), "# My notes\n");
    await rm(join(root, ".codex"), { recursive: true });
    const checks = (await diagnose(root)).filter((check) =>
      check.id.startsWith("template"),
    );
    expect(checks).toEqual([
      { id: "template-missing", params: { file: ".codex/config.toml" } },
      {
        id: "template-differs",
        params: {
          file: "AGENTS.md",
          template: join(frameworkLayout(FRAMEWORK).templateDir, "AGENTS.md"),
        },
      },
    ]);
  });

  it("warns about a folder outside git, a missing identity and a branch with no remote", async () => {
    const { root } = await initializedRepository();
    expect(find(await diagnose(root), "git-none")).toBeDefined();
    await git(root, "init", "-q", "-b", "main");
    const unborn = await diagnose(root);
    expect(find(unborn, "git-identity")).toBeDefined();
    // Nothing to push before the first commit: the advice is the commit, and never a check mark.
    expect(find(unborn, "git-no-commit")).toBeDefined();
    expect(find(unborn, "git-upstream")).toBeUndefined();
    expect(find(unborn, "git")).toBeUndefined();
    await git(root, "config", "user.name", "desk1");
    await git(root, "config", "user.email", "desk1@example.test");
    await git(root, "add", "--all");
    await git(root, "commit", "-q", "-m", "chore: start");
    const checks = await diagnose(root);
    expect(find(checks, "git-identity")).toBeUndefined();
    expect(find(checks, "git-no-commit")).toBeUndefined();
    expect(find(checks, "git-upstream")?.params).toEqual({ branch: "main" });
    expect(SETUP_CHECK_LEVELS["git-upstream"]).toBe("warning");
  });
});
