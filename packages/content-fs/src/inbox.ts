import { readFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import {
  LearnError,
  parseLearningPackage,
  type ArchivePackageInput,
  type Finding,
  type ImportPackageInput,
  type LearningPackage,
} from "@wastech-learn/core";
import { confinePath, type ConfinedPath } from "./confine.js";
import { isMissing } from "./fs-utils.js";
import { nodeTransactionFs, type TransactionFs } from "./transaction.js";
import type { Workspace } from "./workspace.js";

/** Where packages wait to be imported, and where they go once they are. */
export const INBOX_DIR = "inbox";
export const INBOX_DONE_DIR = "inbox/done";

const PACKAGE_PATH = /^inbox\/[^/]+\.md$/;

/**
 * A package path the inbox tools accept: a Markdown file directly in `inbox/`. Archived packages in
 * `inbox/done/` are history, not input, and anything else is not a package.
 */
const confinePackage = async (
  root: string,
  path: string,
): Promise<ConfinedPath> => {
  const confined = await confinePath(root, path);
  if (!PACKAGE_PATH.test(confined.relative)) {
    throw new LearnError(
      "package-not-found",
      `${path} is not a package in ${INBOX_DIR}/`,
      { subject: path },
    );
  }
  return confined;
};

export interface ImportedPackage {
  readonly path: string;
  readonly package: LearningPackage | undefined;
  readonly findings: readonly Finding[];
  /** The topic already exists: the import merges into it instead of creating it. */
  readonly topicExists: boolean;
}

/**
 * Reads and parses a learning package without changing anything: the learner first picks candidates, and
 * the content tools write what was picked. Moving the file to `inbox/done/` is a separate, explicit step.
 */
export const importPackage = async (
  workspace: Workspace,
  input: ImportPackageInput,
): Promise<ImportedPackage> => {
  const confined = await confinePackage(workspace.root, input.path);
  let text: string;
  try {
    text = await readFile(confined.absolute, "utf8");
  } catch (error) {
    if (isMissing(error)) {
      throw new LearnError("package-not-found", `No package at ${input.path}`, {
        subject: input.path,
      });
    }
    throw new LearnError(
      "io-failed",
      `Cannot read ${confined.relative}`,
      { file: confined.relative },
      { cause: error },
    );
  }
  const parsed = parseLearningPackage(confined.relative, text);
  const snapshot = await workspace.snapshot();
  const topic =
    parsed.package === undefined
      ? undefined
      : `content/${parsed.package.frontMatter.domain}/${parsed.package.frontMatter.topic}/index.md`;
  return {
    path: confined.relative,
    package: parsed.package,
    findings: parsed.findings,
    topicExists: topic !== undefined && snapshot.files.has(topic),
  };
};

export interface ArchivedPackage {
  readonly from: string;
  readonly to: string;
}

// An older package under the same name stays: the new one gets the first free numbered name instead.
const freeTarget = async (
  fs: TransactionFs,
  root: string,
  name: string,
): Promise<ConfinedPath> => {
  const stem = name.replace(/\.md$/, "");
  for (let index = 1; ; index++) {
    const candidate = `${INBOX_DONE_DIR}/${index === 1 ? stem : `${stem}-${String(index)}`}.md`;
    const confined = await confinePath(root, candidate);
    if (!(await fs.exists(confined.absolute))) return confined;
  }
};

/**
 * Moves an imported package to `inbox/done/`, after the learner picked its cards. A rename within the
 * repository is atomic, so the package is in exactly one of the two places at any moment.
 */
export const archivePackage = async (
  workspace: Workspace,
  input: ArchivePackageInput,
): Promise<ArchivedPackage> => {
  const fs = workspace.options.transactionFs ?? nodeTransactionFs;
  const source = await confinePackage(workspace.root, input.path);
  if (!(await fs.exists(source.absolute))) {
    throw new LearnError("package-not-found", `No package at ${input.path}`, {
      subject: input.path,
    });
  }
  const target = await freeTarget(
    fs,
    workspace.root,
    basename(source.relative),
  );
  if (input.dryRun !== true) {
    try {
      await fs.mkdir(dirname(target.absolute));
      await fs.rename(source.absolute, target.absolute);
    } catch (error) {
      throw new LearnError(
        "io-failed",
        `Cannot move ${source.relative}`,
        { file: source.relative },
        { cause: error },
      );
    }
    workspace.invalidate();
  }
  return { from: source.relative, to: target.relative };
};
