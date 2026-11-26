import { glob, readFile } from "node:fs/promises";
import { hostname as osHostname } from "node:os";
import { join, sep } from "node:path";
import {
  LearnError,
  UI_LANGUAGES,
  deviceFromHostname,
  firstIssue,
  learnConfigSchema,
  learnLocalSchema,
  type ContentFiles,
  type LearnConfig,
  type UiLanguage,
} from "@wastech-learn/core";

export const CONFIG_FILE = "learn.config.json";
export const LOCAL_FILE = "learn.local.json";
export const MDLINT_CONFIG_FILE = "wastech-mdlint.config.json";

/** Text files that make up the content: Markdown, diagram sources and their rendered SVGs. */
const CONTENT_GLOB = "content/**/*.{md,mmd,svg}";

const isMissing = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

const readText = async (
  root: string,
  file: string,
): Promise<string | undefined> => {
  try {
    return await readFile(join(root, file), "utf8");
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw new LearnError(
      "io-failed",
      `Cannot read ${file}`,
      { file },
      { cause: error },
    );
  }
};

const parseJsonFile = (file: string, text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new LearnError(
      "config-invalid",
      `${file} is not valid JSON`,
      { file },
      { cause: error },
    );
  }
};

/** Reads and validates `learn.config.json`; a missing or invalid file stops the work with its field named. */
export const loadConfig = async (root: string): Promise<LearnConfig> => {
  const text = await readText(root, CONFIG_FILE);
  if (text === undefined) {
    throw new LearnError(
      "repository-not-found",
      `${CONFIG_FILE} not found in ${root}`,
      {
        file: CONFIG_FILE,
      },
    );
  }
  const parsed = learnConfigSchema.safeParse(parseJsonFile(CONFIG_FILE, text));
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    throw new LearnError(
      "config-invalid",
      `${CONFIG_FILE}: ${issue.field}: ${issue.message}`,
      {
        file: CONFIG_FILE,
        field: issue.field,
      },
    );
  }
  return parsed.data;
};

/**
 * The configured UI language, read without validating the rest of the file, so a host can report an
 * invalid config in the user's language. `undefined` when the file or the field is unusable.
 */
export const readUiLanguage = async (
  root: string,
): Promise<UiLanguage | undefined> => {
  try {
    const raw: unknown = JSON.parse(
      (await readText(root, CONFIG_FILE)) ?? "null",
    );
    if (typeof raw !== "object" || raw === null || !("uiLanguage" in raw))
      return undefined;
    const lang = raw.uiLanguage;
    return UI_LANGUAGES.find((candidate) => candidate === lang);
  } catch {
    // An unreadable or broken file is reported by loadConfig; here it only means "no preference".
    return undefined;
  }
};

export interface DeviceName {
  readonly device: string;
  /** Whether the name came from `learn.local.json` or was derived from the hostname. */
  readonly source: "local" | "hostname";
}

/**
 * Names this machine. Without `learn.local.json` the hostname stands in, so a fresh clone can append to
 * the log at once while two machines still never share a log folder.
 */
export const loadDevice = async (
  root: string,
  hostname: () => string = osHostname,
): Promise<DeviceName> => {
  const text = await readText(root, LOCAL_FILE);
  if (text === undefined)
    return { device: deviceFromHostname(hostname()), source: "hostname" };
  const parsed = learnLocalSchema.safeParse(parseJsonFile(LOCAL_FILE, text));
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    throw new LearnError(
      "config-invalid",
      `${LOCAL_FILE}: ${issue.field}: ${issue.message}`,
      {
        file: LOCAL_FILE,
        field: issue.field,
      },
    );
  }
  return { device: parsed.data.device, source: "local" };
};

const toPosix = (path: string): string =>
  sep === "/" ? path : path.split(sep).join("/");

/**
 * Loads every content file and the mdlint config copy into the `path → text` map the core parses. Paths
 * are repository-relative and POSIX, so findings and the bundle read the same on every platform.
 */
export const loadContentFiles = async (root: string): Promise<ContentFiles> => {
  const paths: string[] = [];
  try {
    for await (const path of glob(CONTENT_GLOB, { cwd: root }))
      paths.push(toPosix(path));
  } catch (error) {
    throw new LearnError(
      "io-failed",
      `Cannot list content in ${root}`,
      {},
      { cause: error },
    );
  }
  paths.sort();
  const files = new Map<string, string>();
  for (const path of paths) files.set(path, (await readText(root, path)) ?? "");
  const mdlintConfig = await readText(root, MDLINT_CONFIG_FILE);
  if (mdlintConfig !== undefined) files.set(MDLINT_CONFIG_FILE, mdlintConfig);
  return files;
};

export interface Repository {
  readonly root: string;
  readonly config: LearnConfig;
  readonly device: DeviceName;
  readonly files: ContentFiles;
}

/** Everything a host needs from the content repository before it parses, checks or schedules. */
export const loadRepository = async (
  root: string,
  options: { readonly hostname?: () => string } = {},
): Promise<Repository> => {
  const config = await loadConfig(root);
  const device = await loadDevice(root, options.hostname);
  const files = await loadContentFiles(root);
  return { root, config, device, files };
};
