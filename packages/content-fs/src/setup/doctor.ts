import type { Stats } from "node:fs";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isLearnError } from "@wastech-learn/core";
import { ioStep, isMissing, physicalPath } from "../fs-utils.js";
import { runGit } from "../git/run.js";
import { locateRepository, readGitState } from "../git/status.js";
import { loadConfig, loadDevice } from "../repo.js";
import type { BuildUnit, FrameworkLayout } from "./framework.js";
import {
  AGENT_SKILL_DIRS,
  installedSkillHash,
  readFrameworkSkills,
} from "./skills.js";
import { isFrameworkOwned, readTemplate } from "./template.js";

export type SetupLevel = "ok" | "warning" | "error";

/**
 * Every answer doctor can give and how much it matters. An error means something the learner needs
 * does not work yet (the app, capture or the log); a warning means it works with a catch, such as Sync
 * waiting for a remote branch.
 */
export const SETUP_CHECK_LEVELS = {
  node: "ok",
  "node-old": "error",
  build: "ok",
  "build-missing": "error",
  "build-stale": "warning",
  config: "ok",
  "config-missing": "error",
  "config-invalid": "error",
  "config-json": "error",
  device: "ok",
  "device-hostname": "warning",
  "device-invalid": "error",
  "device-json": "error",
  deps: "ok",
  "deps-missing": "error",
  "deps-other-framework": "warning",
  skills: "ok",
  "skill-missing": "error",
  "skill-differs": "warning",
  template: "ok",
  "template-missing": "warning",
  "template-differs": "warning",
  git: "ok",
  "git-missing": "warning",
  "git-none": "warning",
  "git-identity": "warning",
  "git-no-commit": "warning",
  "git-upstream": "warning",
} as const satisfies Readonly<Record<string, SetupLevel>>;

export type SetupCheckId = keyof typeof SETUP_CHECK_LEVELS;

export interface SetupCheck {
  readonly id: SetupCheckId;
  readonly params: Readonly<Record<string, string>>;
}

export interface DiagnoseOptions {
  readonly root: string;
  readonly framework: FrameworkLayout;
  readonly builds: readonly BuildUnit[];
  readonly nodeVersion: string;
  readonly minNodeVersion: string;
  readonly hostname?: () => string;
}

const check = (
  id: SetupCheckId,
  params: Readonly<Record<string, string>> = {},
): SetupCheck => ({ id, params });

const versionParts = (version: string): readonly number[] =>
  (/(\d+)\.(\d+)\.(\d+)/.exec(version)?.slice(1) ?? []).map(Number);

const isAtLeast = (version: string, minimum: string): boolean => {
  const have = versionParts(version);
  const need = versionParts(minimum);
  for (let index = 0; index < 3; index++) {
    const a = have[index] ?? 0;
    const b = need[index] ?? 0;
    if (a !== b) return a > b;
  }
  return true;
};

/** The newest modification time under a file or folder, or `undefined` when it does not exist. */
const newestChange = (path: string): Promise<number | undefined> =>
  ioStep(path, async () => {
    let info: Stats;
    try {
      info = await stat(path);
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
    if (!info.isDirectory()) return info.mtimeMs;
    let newest = info.mtimeMs;
    const entries = await readdir(path, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const file = await stat(join(entry.parentPath, entry.name));
      newest = Math.max(newest, file.mtimeMs);
    }
    return newest;
  });

const checkBuilds = async (
  builds: readonly BuildUnit[],
  frameworkDir: string,
): Promise<SetupCheck> => {
  const missing: string[] = [];
  const stale: string[] = [];
  for (const unit of builds) {
    const output = await newestChange(unit.output);
    if (output === undefined) {
      missing.push(unit.name);
      continue;
    }
    const markers = await Promise.all(unit.markers.map(newestChange));
    const built = Math.max(output, ...markers.map((time) => time ?? 0));
    const sources = await Promise.all(unit.sources.map(newestChange));
    if (Math.max(0, ...sources.map((time) => time ?? 0)) > built) {
      stale.push(unit.name);
    }
  }
  if (missing.length > 0) {
    return check("build-missing", {
      packages: missing.join(", "),
      dir: frameworkDir,
    });
  }
  if (stale.length > 0) {
    return check("build-stale", {
      packages: stale.join(", "),
      dir: frameworkDir,
    });
  }
  return check("build");
};

const checkConfig = async (root: string): Promise<SetupCheck> => {
  try {
    const config = await loadConfig(root);
    return check("config", {
      timezone: config.timezone,
      language: config.uiLanguage,
    });
  } catch (error) {
    if (!isLearnError(error)) throw error;
    if (error.code === "repository-not-found")
      return check("config-missing", { root });
    if (error.code !== "config-invalid") throw error;
    return (error.field ?? "") === ""
      ? check("config-json")
      : check("config-invalid", { field: error.field ?? "" });
  }
};

const checkDevice = async (
  root: string,
  hostname: (() => string) | undefined,
): Promise<SetupCheck> => {
  try {
    const { device, source } = await loadDevice(root, hostname);
    return check(source === "local" ? "device" : "device-hostname", {
      device,
    });
  } catch (error) {
    if (!isLearnError(error) || error.code !== "config-invalid") throw error;
    return (error.field ?? "") === ""
      ? check("device-json")
      : check("device-invalid", { field: error.field ?? "" });
  }
};

// What the agents and the hook run through `npx --no-install`; without them capture fails silently in
// the chat, so a missing one is an error. Windows installs a .cmd shim next to each.
const CONTENT_BINS = [
  "wastech-learn",
  "wastech-learn-mcp",
  "wastech-mdlint",
  "wastech-mdlint-mcp",
] as const;

const exists = async (path: string): Promise<boolean> =>
  (await newestChange(path)) !== undefined;

const checkDeps = async (
  root: string,
  frameworkDir: string,
): Promise<SetupCheck> => {
  const missing: string[] = [];
  for (const bin of CONTENT_BINS) {
    const shim = join(root, "node_modules", ".bin", bin);
    if (!(await exists(shim)) && !(await exists(`${shim}.cmd`)))
      missing.push(bin);
  }
  if (missing.length > 0)
    return check("deps-missing", { bins: missing.join(", ") });
  // Two checkouts of the framework on one computer: the repository may link the other one, and then a
  // rebuild here changes nothing for the agents.
  const linked = await realpath(
    join(root, "node_modules", "@wastech-learn", "cli"),
  ).catch(() => undefined);
  const own = await realpath(join(frameworkDir, "packages", "cli")).catch(
    () => undefined,
  );
  if (linked !== undefined && own !== undefined && linked !== own) {
    return check("deps-other-framework", { dir: dirname(dirname(linked)) });
  }
  return check("deps");
};

const checkSkills = async (
  root: string,
  skillsDir: string,
): Promise<readonly SetupCheck[]> => {
  const skills = await readFrameworkSkills(skillsDir);
  const found: SetupCheck[] = [];
  for (const skill of skills) {
    for (const dir of AGENT_SKILL_DIRS) {
      const installed = await installedSkillHash(root, dir, skill.name);
      if (installed === undefined)
        found.push(check("skill-missing", { skill: skill.name, dir }));
      else if (installed !== skill.hash)
        found.push(check("skill-differs", { skill: skill.name, dir }));
    }
  }
  return found.length > 0
    ? found
    : [
        check("skills", {
          skills: skills.map((skill) => skill.name).join(", "),
        }),
      ];
};

const checkTemplate = async (
  root: string,
  framework: FrameworkLayout,
): Promise<readonly SetupCheck[]> => {
  const found: SetupCheck[] = [];
  for (const file of await readTemplate(framework, root)) {
    if (!isFrameworkOwned(file.path)) continue;
    const current = await ioStep(file.path, async () => {
      try {
        return await readFile(join(root, file.path));
      } catch (error) {
        if (isMissing(error)) return undefined;
        throw error;
      }
    });
    if (current === undefined) {
      found.push(check("template-missing", { file: file.path }));
    } else if (!current.equals(file.content)) {
      found.push(
        check("template-differs", {
          file: file.path,
          template: join(framework.templateDir, file.path),
        }),
      );
    }
  }
  return found.length > 0 ? found : [check("template")];
};

const isSet = async (root: string, key: string): Promise<boolean> => {
  const result = await runGit(root, ["config", key]);
  return result.exitCode === 0 && result.stdout.trim() !== "";
};

const checkGit = async (root: string): Promise<readonly SetupCheck[]> => {
  const located = await locateRepository(root);
  if (!located.ok)
    return [check(located.reason === "no-git" ? "git-missing" : "git-none")];
  const found: SetupCheck[] = [];
  if (!(await isSet(root, "user.name")) || !(await isSet(root, "user.email")))
    found.push(check("git-identity"));
  const state = await readGitState(root);
  // Before the first commit there is nothing to push yet: the advice is the commit, not the push.
  const hasCommit =
    (await runGit(root, ["rev-parse", "--verify", "--quiet", "HEAD"]))
      .exitCode === 0;
  if (!hasCommit) found.push(check("git-no-commit"));
  else if (state.branch !== null && state.upstream === null)
    found.push(check("git-upstream", { branch: state.branch }));
  if (found.length > 0) return found;
  return [
    check("git", {
      branch: state.branch ?? "",
      upstream: state.upstream ?? "",
    }),
  ];
};

/**
 * Checks a computer's setup from the framework build to the content repository's git, read-only, in the
 * order a fix has to follow: a later check often fails only because an earlier one did. Without a
 * `learn.config.json` the folder is not a content repository, and the checks of one are skipped.
 */
export const diagnoseSetup = async (
  options: DiagnoseOptions,
): Promise<readonly SetupCheck[]> => {
  const { framework } = options;
  const root = await physicalPath(options.root);
  const node = isAtLeast(options.nodeVersion, options.minNodeVersion)
    ? check("node", { version: options.nodeVersion })
    : check("node-old", {
        version: options.nodeVersion,
        required: options.minNodeVersion,
      });
  const build = await checkBuilds(options.builds, framework.dir);
  const config = await checkConfig(root);
  if (config.id === "config-missing") return [node, build, config];
  return [
    node,
    build,
    config,
    await checkDevice(root, options.hostname),
    await checkDeps(root, framework.dir),
    ...(await checkSkills(root, framework.skillsDir)),
    ...(await checkTemplate(root, framework)),
    ...(await checkGit(root)),
  ];
};
