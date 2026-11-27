import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { hostname as osHostname } from "node:os";
import { dirname, join } from "node:path";
import {
  LearnError,
  deviceFromHostname,
  firstIssue,
  learnConfigSchema,
  learnLocalSchema,
  type UiLanguage,
} from "@wastech-learn/core";
import { ioStep, isMissing, physicalPath } from "../fs-utils.js";
import { CONFIG_FILE, LOCAL_FILE, loadDevice, readText } from "../repo.js";
import type { FrameworkLayout } from "./framework.js";
import { installSkills, readSkillsLock, type SkillInstall } from "./skills.js";
import {
  isFrameworkOwned,
  readTemplate,
  type TemplateFile,
} from "./template.js";

export interface InitOptions {
  readonly root: string;
  readonly framework: FrameworkLayout;
  /** This computer's name in the log. Without it the hostname stands in, written down so it stays put. */
  readonly device?: string;
  /** Used only when the repository gets its first `learn.config.json`. */
  readonly timezone: string;
  readonly uiLanguage: UiLanguage;
  readonly hostname?: () => string;
}

export type InitConfig =
  | {
      readonly written: true;
      readonly timezone: string;
      readonly uiLanguage: UiLanguage;
    }
  | { readonly written: false };

export interface InitReport {
  /** Template files written, by repository path. */
  readonly created: readonly string[];
  /** Framework files that already existed with other content and were left as they are. */
  readonly kept: readonly string[];
  readonly config: InitConfig;
  readonly device: { readonly name: string; readonly written: boolean };
  readonly skills: readonly SkillInstall[];
  /** Whether the folder is a git work tree already; init itself never runs git. */
  readonly hasGit: boolean;
}

export type InitOutcome =
  | { readonly kind: "refused"; readonly foreign: readonly string[] }
  | { readonly kind: "done"; readonly report: InitReport };

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw new LearnError(
      "io-failed",
      `Cannot read ${path}`,
      { file: path },
      { cause: error },
    );
  }
};

const listFolder = async (root: string): Promise<readonly string[]> => {
  try {
    return (await readdir(root)).sort();
  } catch (error) {
    if (isMissing(error)) return [];
    throw new LearnError(
      "io-failed",
      `Cannot list ${root}`,
      { file: root },
      { cause: error },
    );
  }
};

// Init run in the wrong folder (a home directory, the framework itself) would scatter the template among
// unrelated files. A folder qualifies when it is a content repository already, or holds nothing but git
// and files the template has too, such as the README of a repository just created on GitHub.
const foreignEntries = (
  entries: readonly string[],
  template: readonly TemplateFile[],
): readonly string[] => {
  if (entries.includes(CONFIG_FILE)) return [];
  const known = new Set([
    ".git",
    ...template.map((file) => file.path.split("/")[0] ?? ""),
  ]);
  return entries.filter((entry) => !known.has(entry));
};

const writeNew = (
  root: string,
  path: string,
  content: string | Buffer,
): Promise<void> =>
  ioStep(path, async () => {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    // `wx` fails instead of overwriting: a file that appeared since the check stays the owner's.
    await writeFile(target, content, { flag: "wx" });
  });

// Only the two values change, as text, so the new file keeps the template's layout; the result is parsed
// with the config schema, so a template that no longer has the keys fails here rather than in a session.
const configText = (
  template: Buffer,
  timezone: string,
  uiLanguage: UiLanguage,
): string => {
  const text = template
    .toString("utf8")
    .replace(
      /("timezone"\s*:\s*)"[^"]*"/,
      (_, key: string) => `${key}${JSON.stringify(timezone)}`,
    )
    .replace(
      /("uiLanguage"\s*:\s*)"[^"]*"/,
      (_, key: string) => `${key}${JSON.stringify(uiLanguage)}`,
    );
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new LearnError(
      "config-invalid",
      `${CONFIG_FILE} of the template is not valid JSON`,
      { file: CONFIG_FILE },
      { cause: error },
    );
  }
  const parsed = learnConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    throw new LearnError(
      "config-invalid",
      `${CONFIG_FILE}: ${issue.field}: ${issue.message}`,
      { file: CONFIG_FILE, field: issue.field },
    );
  }
  if (
    parsed.data.timezone !== timezone ||
    parsed.data.uiLanguage !== uiLanguage
  ) {
    throw new LearnError(
      "config-invalid",
      `${CONFIG_FILE}: the template's timezone or uiLanguage could not be set`,
      { file: CONFIG_FILE, field: "timezone" },
    );
  }
  return text;
};

const setUpDevice = async (
  options: InitOptions,
): Promise<InitReport["device"]> => {
  if ((await readText(options.root, LOCAL_FILE)) !== undefined) {
    const existing = await loadDevice(options.root);
    return { name: existing.device, written: false };
  }
  const name =
    options.device ?? deviceFromHostname((options.hostname ?? osHostname)());
  const parsed = learnLocalSchema.safeParse({ device: name });
  if (!parsed.success) {
    throw new LearnError(
      "config-invalid",
      `${LOCAL_FILE}: device: ${firstIssue(parsed.error).message}`,
      { file: LOCAL_FILE, field: "device" },
    );
  }
  await writeNew(
    options.root,
    LOCAL_FILE,
    `${JSON.stringify(parsed.data, null, 2)}\n`,
  );
  return { name: parsed.data.device, written: true };
};

/**
 * Makes `root` a content repository from the framework's template, or completes one: missing template
 * files are created, existing files are never overwritten, the config gets the time zone and language,
 * the device is written down, and the framework's skills are installed or brought up to date. Running it
 * again is safe and is how a repository picks up new skills. It touches no git and installs no packages.
 */
export const initRepository = async (
  options: InitOptions,
): Promise<InitOutcome> => {
  const root = await physicalPath(options.root);
  const template = await readTemplate(options.framework, root);
  const foreign = foreignEntries(await listFolder(root), template);
  if (foreign.length > 0) return { kind: "refused", foreign };
  // A lock this framework cannot read stops init before it writes anything, not halfway through.
  await readSkillsLock(root);
  await ioStep(root, () => mkdir(root, { recursive: true }));

  const created: string[] = [];
  const kept: string[] = [];
  let config: InitConfig = { written: false };
  for (const file of template) {
    const existing = await pathExists(join(root, file.path));
    if (file.path === CONFIG_FILE) {
      if (existing) continue;
      const text = configText(
        file.content,
        options.timezone,
        options.uiLanguage,
      );
      await writeNew(root, file.path, text);
      created.push(file.path);
      config = {
        written: true,
        timezone: options.timezone,
        uiLanguage: options.uiLanguage,
      };
      continue;
    }
    if (!existing) {
      await writeNew(root, file.path, file.content);
      created.push(file.path);
      continue;
    }
    if (!isFrameworkOwned(file.path)) continue;
    const current = await ioStep(file.path, () =>
      readFile(join(root, file.path)),
    );
    if (!current.equals(file.content)) kept.push(file.path);
  }

  const device = await setUpDevice({ ...options, root });
  const skills = await installSkills(root, options.framework.skillsDir);
  const hasGit = await pathExists(join(root, ".git"));
  return {
    kind: "done",
    report: { created, kept, config, device, skills, hasGit },
  };
};
