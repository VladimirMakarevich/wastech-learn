import {
  checkContent,
  type CheckResult,
  type LearnConfig,
} from "@wastech-learn/core";
import { readGitBaseline } from "./git-baseline.js";
import { readCanonicalPreset } from "./preset.js";
import { loadConfig, loadContentFiles } from "./repo.js";

export interface RepositoryCheck extends CheckResult {
  readonly config: LearnConfig;
}

/**
 * Runs the second validation tier over a content repository on disk: the configuration first (an invalid
 * one stops the work), then every content file against the canonical preset, with the last commit as the
 * baseline for the large-edit warning.
 */
export const checkRepository = async (
  root: string,
): Promise<RepositoryCheck> => {
  const config = await loadConfig(root);
  const [files, preset, baseline] = await Promise.all([
    loadContentFiles(root),
    readCanonicalPreset(),
    readGitBaseline(root),
  ]);
  const result = await checkContent({ files, preset, baseline });
  return { ...result, config };
};
