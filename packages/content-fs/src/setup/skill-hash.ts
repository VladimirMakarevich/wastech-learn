import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { join, sep } from "node:path";

// The `skills` CLI leaves these out of a skill's hash; matching it keeps a lock entry written here equal
// to the one `npx skills add` would write for the same folder.
const EXCLUDED_FILES = new Set(["metadata.json"]);
const EXCLUDED_DIRS = new Set([".git", "__pycache__", "__pypackages__"]);

/** A file of a skill folder: its POSIX path inside the folder and its bytes. */
export interface SkillFile {
  readonly path: string;
  readonly content: Buffer;
}

const collect = async (
  dir: string,
  prefix: string,
  root: string,
  ancestors: ReadonlySet<string>,
  files: SkillFile[],
): Promise<void> => {
  const realDir = await realpath(dir);
  // A link back up the tree would recurse forever.
  if (ancestors.has(realDir)) return;
  const branch = new Set(ancestors).add(realDir);
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    let isDirectory = entry.isDirectory();
    if (
      EXCLUDED_FILES.has(entry.name) ||
      (isDirectory && EXCLUDED_DIRS.has(entry.name))
    )
      continue;
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      // A link out of the skill would pull foreign files into its hash and its copies.
      const target = await realpath(full).catch(() => undefined);
      if (
        target === undefined ||
        (target !== root && !target.startsWith(root + sep))
      )
        continue;
      isDirectory = (await stat(target)).isDirectory();
      if (isDirectory && EXCLUDED_DIRS.has(entry.name)) continue;
    } else if (!isDirectory && !entry.isFile()) continue;
    const path = `${prefix}${entry.name}`;
    if (isDirectory) await collect(full, `${path}/`, root, branch, files);
    else files.push({ path, content: await readFile(full) });
  }
};

/** Every file of a skill folder that belongs to the skill, sorted by path. */
export const collectSkillFiles = async (
  dir: string,
): Promise<readonly SkillFile[]> => {
  const files: SkillFile[] = [];
  await collect(dir, "", await realpath(dir), new Set(), files);
  return files.toSorted((a, b) =>
    Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)),
  );
};

// A checkout on Windows may turn LF into CRLF; the hash must not see that as a change of the skill.
const normalizeLineEndings = (content: Buffer): Buffer =>
  content.includes(0) || !content.includes("\r\n")
    ? content
    : Buffer.from(
        content.toString("latin1").replaceAll("\r\n", "\n"),
        "latin1",
      );

/**
 * The content hash the `skills` CLI records as `computedHash`: SHA-256 over each file's path, length and
 * bytes, in byte order of the paths. Equal hashes mean an installed copy is the skill as it was locked.
 */
export const hashSkillFiles = (files: readonly SkillFile[]): string => {
  const entries = files
    .map((file) => ({
      path: Buffer.from(file.path, "utf8"),
      content: normalizeLineEndings(file.content),
    }))
    .sort((a, b) => Buffer.compare(a.path, b.path));
  const hash = createHash("sha256");
  for (const { path, content } of entries) {
    hash.update(path);
    hash.update("\0");
    hash.update(String(content.length));
    hash.update("\0");
    hash.update(content);
  }
  return hash.digest("hex");
};

export const skillFolderHash = async (dir: string): Promise<string> =>
  hashSkillFiles(await collectSkillFiles(dir));
