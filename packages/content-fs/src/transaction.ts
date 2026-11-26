import { randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  open,
  rename,
  rmdir,
  unlink,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { LearnError } from "@wastech-learn/core";
import { isMissing } from "./fs-utils.js";

/** One file of a transaction: its absolute path and the full text it ends up with. */
export interface FileWrite {
  readonly path: string;
  readonly text: string;
  /** How an error names the file: repository-relative, so no home folder reaches a chat. */
  readonly label?: string;
}

/** The file operations a transaction uses; a test swaps in one that fails on a chosen call. */
export interface TransactionFs {
  /** Writes the whole text and flushes it to disk before resolving. */
  readonly writeFile: (path: string, text: string) => Promise<void>;
  readonly rename: (from: string, to: string) => Promise<void>;
  readonly copyFile: (from: string, to: string) => Promise<void>;
  readonly unlink: (path: string) => Promise<void>;
  /** Creates a folder and its parents; resolves to the first folder it had to create, if any. */
  readonly mkdir: (path: string) => Promise<string | undefined>;
  readonly rmdir: (path: string) => Promise<void>;
  readonly exists: (path: string) => Promise<boolean>;
}

export const nodeTransactionFs: TransactionFs = {
  writeFile: async (path, text) => {
    const handle = await open(path, "wx");
    try {
      await handle.writeFile(text, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
  },
  rename,
  copyFile,
  unlink,
  mkdir: (path) => mkdir(path, { recursive: true }),
  rmdir,
  exists: async (path) => {
    try {
      await lstat(path);
      return true;
    } catch (error) {
      if (isMissing(error)) return false;
      throw error;
    }
  },
};

interface Staged {
  readonly target: string;
  readonly temporary: string;
  readonly backup: string | undefined;
}

// Hidden siblings of the target: the same folder keeps the final rename atomic (one file system), and
// the dot keeps a half-finished transaction out of globs and the editor's file tree.
const sibling = (target: string, kind: "tmp" | "bak", tag: string): string =>
  join(dirname(target), `.${basename(target)}.${kind}-${tag}`);

const quietly = async (step: () => Promise<void>): Promise<void> => {
  try {
    await step();
  } catch {
    // Rollback and cleanup are best effort: the original error is what the caller needs to see, and
    // one leftover temporary file must not hide it.
  }
};

/**
 * Writes a group of files all or nothing. Every new text goes to a temporary file next to its target
 * and is flushed; every file about to be replaced is copied aside; then each temporary file is renamed
 * over its target. A failure at any step renames the copies back, deletes files that did not exist
 * before, and removes temporary files and folders it created, so the repository is left exactly as it
 * was. A rename within a folder is atomic, so a reader never sees half a file either way.
 */
export const commitFiles = async (
  writes: readonly FileWrite[],
  fs: TransactionFs = nodeTransactionFs,
): Promise<void> => {
  const tag = randomUUID().slice(0, 8);
  const createdDirs: string[] = [];
  const staged: Staged[] = [];
  const committed: Staged[] = [];
  let failing: FileWrite | undefined;
  try {
    for (const write of writes) {
      failing = write;
      const created = await fs.mkdir(dirname(write.path));
      // mkdir names only the topmost folder it created; rollback removes the whole chain, deepest first.
      for (
        let dir = dirname(write.path);
        created !== undefined;
        dir = dirname(dir)
      ) {
        createdDirs.push(dir);
        if (dir === created || dirname(dir) === dir) break;
      }
      const temporary = sibling(write.path, "tmp", tag);
      staged.push({ target: write.path, temporary, backup: undefined });
      await fs.writeFile(temporary, write.text);
    }
    for (const [index, entry] of staged.entries()) {
      failing = writes[index];
      if (!(await fs.exists(entry.target))) continue;
      const backup = sibling(entry.target, "bak", tag);
      staged[index] = { ...entry, backup };
      await fs.copyFile(entry.target, backup);
    }
    for (const [index, entry] of staged.entries()) {
      failing = writes[index];
      await fs.rename(entry.temporary, entry.target);
      committed.push(entry);
    }
  } catch (error) {
    for (const entry of [...committed].reverse()) {
      const { backup } = entry;
      await quietly(() =>
        backup === undefined
          ? fs.unlink(entry.target)
          : fs.rename(backup, entry.target),
      );
    }
    for (const entry of staged) {
      if (!committed.includes(entry))
        await quietly(() => fs.unlink(entry.temporary));
      const { backup } = entry;
      if (backup !== undefined && !committed.includes(entry)) {
        await quietly(() => fs.unlink(backup));
      }
    }
    const byDepth = [...new Set(createdDirs)].sort(
      (a, b) => b.length - a.length,
    );
    for (const dir of byDepth) {
      await quietly(() => fs.rmdir(dir));
    }
    const file = failing?.label ?? failing?.path ?? "";
    throw new LearnError(
      "io-failed",
      `Cannot write ${file}`,
      { file },
      { cause: error },
    );
  }
  for (const entry of committed) {
    const { backup } = entry;
    if (backup !== undefined) await quietly(() => fs.unlink(backup));
  }
};
