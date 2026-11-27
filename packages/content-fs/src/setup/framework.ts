import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { LearnError } from "@wastech-learn/core";

/** Where a framework checkout keeps what a new content repository is made from. */
export interface FrameworkLayout {
  /** The checkout itself: a content repository links its packages by a path relative to it. */
  readonly dir: string;
  readonly templateDir: string;
  readonly skillsDir: string;
}

export const frameworkLayout = (dir: string): FrameworkLayout => ({
  dir,
  templateDir: join(dir, "templates", "content-repo"),
  skillsDir: join(dir, "skills"),
});

/**
 * One package build: its sources and the output they compile to. Markers are files every rebuild
 * rewrites even when the emitted code comes out the same, so a rebuilt package never looks stale.
 */
export interface BuildUnit {
  readonly name: string;
  readonly sources: readonly string[];
  readonly output: string;
  readonly markers: readonly string[];
}

/**
 * The builds of a framework checkout that a content repository runs: the TypeScript packages and the
 * app. The app is built by Angular into its own folder; a type check writes its build info without
 * building it, so that file says nothing about the app's freshness.
 */
export const frameworkBuilds = async (
  dir: string,
): Promise<readonly BuildUnit[]> => {
  const packagesDir = join(dir, "packages");
  let names: string[];
  try {
    names = (await readdir(packagesDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    throw new LearnError(
      "io-failed",
      `Cannot list ${packagesDir}`,
      { file: packagesDir },
      { cause: error },
    );
  }
  return names.map((name) => {
    const pkg = join(packagesDir, name);
    return name === "app"
      ? {
          name,
          sources: [join(pkg, "src"), join(pkg, "public")],
          output: join(pkg, "dist", "browser"),
          markers: [],
        }
      : {
          name,
          sources: [join(pkg, "src")],
          output: join(pkg, "dist"),
          markers: [join(pkg, "tsconfig.tsbuildinfo")],
        };
  });
};
