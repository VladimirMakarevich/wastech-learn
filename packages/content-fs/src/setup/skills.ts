import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import {
  LearnError,
  firstIssue,
  skillsLockSchema,
  type SkillsLock,
  type SkillsLockEntry,
} from "@wastech-learn/core";
import { ioStep, isMissing, toPosix } from "../fs-utils.js";
import { readText } from "../repo.js";
import {
  collectSkillFiles,
  hashSkillFiles,
  skillFolderHash,
  type SkillFile,
} from "./skill-hash.js";

/** Claude Code reads skills from the first folder, Codex from the second. */
export const AGENT_SKILL_DIRS = [".claude/skills", ".agents/skills"] as const;
export type AgentSkillDir = (typeof AGENT_SKILL_DIRS)[number];

export const SKILLS_LOCK_FILE = "skills-lock.json";

/** A skill as the framework ships it. */
export interface FrameworkSkill {
  readonly name: string;
  readonly files: readonly SkillFile[];
  readonly hash: string;
}

/** The framework's skills: every folder of the skills directory that holds a SKILL.md, by name. */
export const readFrameworkSkills = async (
  skillsDir: string,
): Promise<readonly FrameworkSkill[]> => {
  let names: string[];
  try {
    names = (await readdir(skillsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    throw new LearnError(
      "io-failed",
      `Cannot list ${skillsDir}`,
      { file: skillsDir },
      { cause: error },
    );
  }
  const skills: FrameworkSkill[] = [];
  for (const name of names) {
    const files = await collectSkillFiles(join(skillsDir, name));
    if (!files.some((file) => file.path === "SKILL.md")) continue;
    skills.push({ name, files, hash: hashSkillFiles(files) });
  }
  return skills;
};

/** The hash of an installed copy, or `undefined` when there is none. */
export const installedSkillHash = async (
  root: string,
  dir: AgentSkillDir,
  name: string,
): Promise<string | undefined> => {
  try {
    return await skillFolderHash(join(root, dir, name));
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw new LearnError(
      "io-failed",
      `Cannot read ${dir}/${name}`,
      { file: `${dir}/${name}` },
      { cause: error },
    );
  }
};

/** `skills-lock.json` as it stands, or an empty lock when the repository has none yet. */
export const readSkillsLock = async (root: string): Promise<SkillsLock> => {
  const text = await readText(root, SKILLS_LOCK_FILE);
  if (text === undefined) return { version: 2, skills: {} };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new LearnError(
      "config-invalid",
      `${SKILLS_LOCK_FILE} is not valid JSON`,
      { file: SKILLS_LOCK_FILE },
      { cause: error },
    );
  }
  const parsed = skillsLockSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    throw new LearnError(
      "config-invalid",
      `${SKILLS_LOCK_FILE}: ${issue.field}: ${issue.message}`,
      { file: SKILLS_LOCK_FILE, field: issue.field },
    );
  }
  return parsed.data;
};

// The `skills` CLI stores a local source relative to the lock so the file reads the same on every
// computer that keeps both checkouts side by side; the same spelling keeps its entries comparable.
const portableSource = (root: string, skillsDir: string): string => {
  const path = relative(root, skillsDir);
  if (isAbsolute(path)) return toPosix(path);
  const posix = toPosix(path);
  if (posix === "") return ".";
  return posix === ".." || posix.startsWith("../") ? posix : `./${posix}`;
};

const serializeLock = (lock: SkillsLock): string => {
  const skills = Object.fromEntries(
    Object.keys(lock.skills)
      .sort()
      .map((name) => [name, lock.skills[name]]),
  );
  return `${JSON.stringify({ ...lock, skills }, null, 2)}\n`;
};

const writeCopy = (
  root: string,
  copy: string,
  files: readonly SkillFile[],
): Promise<void> =>
  ioStep(copy, async () => {
    const target = join(root, copy);
    await rm(target, { recursive: true, force: true });
    for (const file of files) {
      const path = join(target, file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.content);
    }
  });

/**
 * What happened to one skill in one agent folder: copied fresh, replaced by the framework's newer
 * version, already the framework's, or kept because someone changed it after it was installed.
 */
export type SkillInstallStatus = "installed" | "updated" | "current" | "kept";

export interface SkillInstall {
  readonly skill: string;
  readonly dir: AgentSkillDir;
  readonly status: SkillInstallStatus;
}

/**
 * Copies the framework's skills into both agent folders and records them in `skills-lock.json`, so the
 * repository gets the same files and lock as from `npx skills add <skills> --copy`, without fetching
 * that tool. A copy is replaced only while it is exactly what the lock says was installed: a skill
 * edited by hand is kept, and its lock entry with it.
 */
export const installSkills = async (
  root: string,
  skillsDir: string,
): Promise<readonly SkillInstall[]> => {
  const skills = await readFrameworkSkills(skillsDir);
  const lock = await readSkillsLock(root);
  const entries: Record<string, SkillsLockEntry> = { ...lock.skills };
  const results: SkillInstall[] = [];
  for (const skill of skills) {
    const locked = lock.skills[skill.name]?.computedHash;
    let kept = false;
    for (const dir of AGENT_SKILL_DIRS) {
      const installed = await installedSkillHash(root, dir, skill.name);
      let status: SkillInstallStatus;
      if (installed === skill.hash) status = "current";
      else if (installed === undefined) status = "installed";
      else if (installed === locked) status = "updated";
      else status = "kept";
      if (status === "installed" || status === "updated") {
        await writeCopy(root, `${dir}/${skill.name}`, skill.files);
      }
      kept ||= status === "kept";
      results.push({ skill: skill.name, dir, status });
    }
    if (!kept) {
      entries[skill.name] = {
        source: portableSource(root, skillsDir),
        sourceType: "local",
        computedHash: skill.hash,
        installMode: "copy",
      };
    }
  }
  const next = serializeLock({ ...lock, skills: entries });
  if ((await readText(root, SKILLS_LOCK_FILE)) !== next) {
    await ioStep(SKILLS_LOCK_FILE, () =>
      writeFile(join(root, SKILLS_LOCK_FILE), next),
    );
  }
  return results;
};
