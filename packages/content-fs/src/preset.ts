import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { LearnError } from "@wastech-learn/core";

const PRESET_SPECIFIER = "@wastech-learn/core/preset/content.mdlint.jsonc";

/**
 * The canonical mdlint preset ships as a file inside the core package, the one place both the CLI and a
 * content repository copying it can find; reading it is IO, so it happens here and the core gets text.
 */
export const readCanonicalPreset = async (): Promise<string> => {
  const path = createRequire(import.meta.url).resolve(PRESET_SPECIFIER);
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    throw new LearnError(
      "io-failed",
      `Cannot read ${path}`,
      { file: path },
      { cause: error },
    );
  }
};
