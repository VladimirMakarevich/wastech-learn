import { cp, mkdir, symlink, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  frameworkLayout,
  initRepository,
  type BuildUnit,
  type FrameworkLayout,
  type InitReport,
} from "../src/index.js";
import { tempDir } from "./helpers.js";

/** This checkout: its real template and skills are what a new content repository is made from. */
export const FRAMEWORK = fileURLToPath(new URL("../../..", import.meta.url));

/** The framework's layout with the skills in a temp copy, for tests that change a skill. */
export const layoutWithSkillsCopy = async (): Promise<FrameworkLayout> => {
  const layout = frameworkLayout(FRAMEWORK);
  const skillsDir = join(await tempDir(), "skills");
  await cp(layout.skillsDir, skillsDir, { recursive: true });
  return { ...layout, skillsDir };
};

/** A content repository fresh from init in a folder of its own, with a fixed zone, language and device. */
export const initializedRepository = async (
  framework: FrameworkLayout = frameworkLayout(FRAMEWORK),
): Promise<{ readonly root: string; readonly report: InitReport }> => {
  const root = join(await tempDir(), "content");
  const outcome = await initRepository({
    root,
    framework,
    timezone: "Asia/Kolkata",
    uiLanguage: "pl",
    device: "desk1",
  });
  if (outcome.kind !== "done") throw new Error("init refused a new folder");
  return { root, report: outcome.report };
};

// The commands an agent and the hook run through `npx --no-install`; empty files are enough for a
// check that only asks whether npm linked them.
const BINS = [
  "wastech-learn",
  "wastech-learn-mcp",
  "wastech-mdlint",
  "wastech-mdlint-mcp",
];

/** What `npm install` leaves behind for doctor: the command shims and the link to the framework's CLI. */
export const installDependencies = async (
  root: string,
  cliPackage = join(FRAMEWORK, "packages", "cli"),
): Promise<void> => {
  await mkdir(join(root, "node_modules", ".bin"), { recursive: true });
  for (const bin of BINS)
    await writeFile(join(root, "node_modules", ".bin", bin), "");
  await mkdir(join(root, "node_modules", "@wastech-learn"), {
    recursive: true,
  });
  await symlink(
    cliPackage,
    join(root, "node_modules", "@wastech-learn", "cli"),
    "dir",
  );
};

const at = (iso: string): Date => new Date(iso);

/**
 * A package build in a temp folder with its sources last changed at `sourcesAt` and its output written at
 * `outputAt`; `undefined` leaves the output out, as before the first build.
 */
export const buildUnit = async (
  sourcesAt: string,
  outputAt: string | undefined,
): Promise<BuildUnit> => {
  const dir = await tempDir();
  const src = join(dir, "src");
  const dist = join(dir, "dist");
  await mkdir(src);
  await writeFile(join(src, "index.ts"), "export {};\n");
  await utimes(join(src, "index.ts"), at(sourcesAt), at(sourcesAt));
  await utimes(src, at(sourcesAt), at(sourcesAt));
  if (outputAt !== undefined) {
    await mkdir(dist);
    await writeFile(join(dist, "index.js"), "export {};\n");
    await utimes(join(dist, "index.js"), at(outputAt), at(outputAt));
    await utimes(dist, at(outputAt), at(outputAt));
  }
  return { name: "core", sources: [src], output: dist, markers: [] };
};
