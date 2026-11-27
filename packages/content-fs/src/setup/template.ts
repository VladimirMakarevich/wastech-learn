import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { LearnError } from "@wastech-learn/core";
import { toPosix } from "../fs-utils.js";
import { CONFIG_FILE } from "../repo.js";
import type { FrameworkLayout } from "./framework.js";

/** A file of the content repository template, as it should read in one particular repository. */
export interface TemplateFile {
  /** POSIX path inside the repository. */
  readonly path: string;
  readonly content: Buffer;
}

// The owner tunes the config and rewrites the README; the empty .gitkeep files only hold folders until
// the first topic. Init creates them when missing, but a difference in them is no news.
const OWNED_BY_REPOSITORY = new Set([CONFIG_FILE, "README.md"]);

/** Whether a template file stays the framework's: a copy that differs from it is worth reporting. */
export const isFrameworkOwned = (path: string): boolean =>
  !OWNED_BY_REPOSITORY.has(path) && !path.endsWith(".gitkeep");

// The template links the framework as a sibling folder named wastech-learn. A repository created next
// to a checkout with another name, or anywhere else, needs the path to the checkout it came from, or
// `npm install` links nothing.
const linkFramework = (
  path: string,
  content: Buffer,
  root: string,
  frameworkDir: string,
): Buffer => {
  if (path !== "package.json") return content;
  const link = toPosix(relative(root, frameworkDir));
  return Buffer.from(
    content
      .toString("utf8")
      .replaceAll('"file:../wastech-learn/', `"file:${link}/`),
    "utf8",
  );
};

/**
 * Every file of the template, sorted by path, with the framework link set for `root`. Init writes these
 * bytes and doctor compares against them, so both agree on what "as in the template" means.
 */
export const readTemplate = async (
  layout: FrameworkLayout,
  root: string,
): Promise<readonly TemplateFile[]> => {
  try {
    const entries = await readdir(layout.templateDir, {
      recursive: true,
      withFileTypes: true,
    });
    const paths = entries
      .filter((entry) => entry.isFile())
      .map((entry) =>
        toPosix(
          relative(layout.templateDir, join(entry.parentPath, entry.name)),
        ),
      )
      .sort();
    return await Promise.all(
      paths.map(async (path) => ({
        path,
        content: linkFramework(
          path,
          await readFile(join(layout.templateDir, path)),
          root,
          layout.dir,
        ),
      })),
    );
  } catch (error) {
    throw new LearnError(
      "io-failed",
      `Cannot read the template in ${layout.templateDir}`,
      { file: layout.templateDir },
      { cause: error },
    );
  }
};
