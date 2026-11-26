import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  LearnError,
  buildSearchIndex,
  compileBundle,
  parseContent,
  type ContentBundle,
  type Finding,
} from "@wastech-learn/core";
import { loadConfig, loadContentFiles } from "./repo.js";

export type BundleBuild =
  | { readonly ok: true; readonly bundle: ContentBundle }
  | { readonly ok: false; readonly findings: readonly Finding[] };

/**
 * Compiles the repository into a content bundle with its search index, or returns the schema findings that
 * prevent it: a bundle with a card silently missing would look complete to the app.
 */
export const buildBundle = async (
  root: string,
  builtAt: Date,
): Promise<BundleBuild> => {
  await loadConfig(root);
  const files = await loadContentFiles(root);
  const { model, findings } = await parseContent(files);
  if (findings.length > 0) return { ok: false, findings };
  const bundle = await compileBundle(model, files, { builtAt });
  return {
    ok: true,
    bundle: { ...bundle, searchIndex: buildSearchIndex(model).serialize() },
  };
};

/** The bundle as written to disk: stable key order from the compiler, two-space indent, final newline. */
export const serializeBundle = (bundle: ContentBundle): string =>
  `${JSON.stringify(bundle, null, 2)}\n`;

/**
 * Writes through a temporary file and a rename, so a reader (the local server, the app's dev build) never
 * sees half a bundle.
 */
export const writeBundle = async (
  path: string,
  bundle: ContentBundle,
): Promise<void> => {
  const temporary = `${path}.tmp-${String(process.pid)}`;
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporary, serializeBundle(bundle));
    await rename(temporary, path);
  } catch (error) {
    throw new LearnError(
      "io-failed",
      `Cannot write ${path}`,
      { file: path },
      { cause: error },
    );
  }
};
