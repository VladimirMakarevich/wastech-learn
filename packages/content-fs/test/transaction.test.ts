import { mkdir, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  commitFiles,
  confinePath,
  nodeTransactionFs,
  type TransactionFs,
} from "../src/index.js";
import { tempDir } from "./helpers.js";

/** Every file under a folder with its text, temporary and backup files included. */
const tree = async (dir: string): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  for (const entry of await readdir(dir, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    result[path.slice(dir.length + 1)] = await readFile(path, "utf8");
  }
  return result;
};

const failingOnRename = (failAt: number): TransactionFs => {
  let renames = 0;
  return {
    ...nodeTransactionFs,
    rename: async (from, to) => {
      renames++;
      if (renames === failAt) throw new Error("disk full");
      await nodeTransactionFs.rename(from, to);
    },
  };
};

describe("commitFiles", () => {
  it("writes a group of new and replaced files and leaves no temporary files", async () => {
    const root = await tempDir();
    await writeFile(join(root, "a.md"), "old a\n");
    await commitFiles([
      { path: join(root, "a.md"), text: "new a\n" },
      { path: join(root, "deep/er/b.md"), text: "b\n" },
    ]);
    expect(await tree(root)).toEqual({
      "a.md": "new a\n",
      "deep/er/b.md": "b\n",
    });
  });

  it("restores all five files when the third rename fails, and removes temporary files and new folders", async () => {
    const root = await tempDir();
    await mkdir(join(root, "topic/cards"), { recursive: true });
    await writeFile(join(root, "topic/index.md"), "index\n");
    await writeFile(join(root, "topic/cards/one.md"), "one\n");
    const before = await tree(root);
    const writes = [
      { path: join(root, "topic/index.md"), text: "index v2\n" },
      { path: join(root, "topic/cards/one.md"), text: "one v2\n" },
      { path: join(root, "topic/cards/two.md"), text: "two\n" },
      { path: join(root, "topic/diagrams/flow.mmd"), text: "flowchart LR\n" },
      { path: join(root, "topic/diagrams/flow.svg"), text: "<svg/>\n" },
    ];
    await expect(commitFiles(writes, failingOnRename(3))).rejects.toMatchObject(
      { code: "io-failed" },
    );
    expect(await tree(root)).toEqual(before);
    expect(await readdir(join(root, "topic"))).toEqual(["cards", "index.md"]);
  });

  it("rolls back when writing a temporary file fails", async () => {
    const root = await tempDir();
    await writeFile(join(root, "a.md"), "a\n");
    let writes = 0;
    const fs: TransactionFs = {
      ...nodeTransactionFs,
      writeFile: async (path, text) => {
        writes++;
        if (writes === 2) throw new Error("no space");
        await nodeTransactionFs.writeFile(path, text);
      },
    };
    await expect(
      commitFiles(
        [
          { path: join(root, "a.md"), text: "a2\n" },
          { path: join(root, "b.md"), text: "b\n" },
        ],
        fs,
      ),
    ).rejects.toMatchObject({ code: "io-failed" });
    expect(await tree(root)).toEqual({ "a.md": "a\n" });
  });
});

describe("confinePath", () => {
  it("accepts a path inside the repository, existing or not", async () => {
    const root = await tempDir();
    expect((await confinePath(root, "content/a/b/index.md")).relative).toBe(
      "content/a/b/index.md",
    );
    expect((await confinePath(root, "content/../inbox/x.md")).relative).toBe(
      "inbox/x.md",
    );
  });

  it("refuses .., absolute paths, and symbolic links that lead out", async () => {
    const root = await tempDir();
    const outside = await tempDir();
    await mkdir(join(root, "content"));
    await symlink(outside, join(root, "content/escape"));
    await symlink(
      join(outside, "nothing-yet.md"),
      join(root, "content/dangling.md"),
    );
    for (const path of [
      "../x.md",
      "content/../../x.md",
      join(outside, "x.md"),
      "/etc/passwd",
      "content/escape/x.md",
      "content/dangling.md",
      "content\\..\\..\\x.md",
    ]) {
      await expect(confinePath(root, path)).rejects.toMatchObject({
        code: "path-outside-content",
      });
    }
  });

  it("removes a file with the others and skips one that is already gone", async () => {
    const root = await tempDir();
    await writeFile(join(root, "index.md"), "index\n");
    await writeFile(join(root, "card.md"), "card\n");
    await commitFiles([
      { path: join(root, "index.md"), text: "index v2\n" },
      { path: join(root, "card.md"), text: null },
      { path: join(root, "gone.md"), text: null },
    ]);
    expect(await tree(root)).toEqual({ "index.md": "index v2\n" });
  });

  it("brings a removed file back when a later rename fails, and leaves no copies aside", async () => {
    const root = await tempDir();
    await writeFile(join(root, "a.md"), "a\n");
    await writeFile(join(root, "card.md"), "card\n");
    await writeFile(join(root, "z.md"), "z\n");
    const before = await tree(root);
    await expect(
      commitFiles(
        [
          { path: join(root, "a.md"), text: "a v2\n" },
          { path: join(root, "card.md"), text: null },
          { path: join(root, "z.md"), text: "z v2\n" },
        ],
        failingOnRename(2),
      ),
    ).rejects.toMatchObject({ code: "io-failed" });
    expect(await tree(root)).toEqual(before);
  });

  it("puts everything back when the unlink itself fails", async () => {
    const root = await tempDir();
    await writeFile(join(root, "a.md"), "a\n");
    await writeFile(join(root, "card.md"), "card\n");
    const before = await tree(root);
    const fs: TransactionFs = {
      ...nodeTransactionFs,
      unlink: async (path) => {
        if (path.endsWith("card.md")) throw new Error("busy");
        await nodeTransactionFs.unlink(path);
      },
    };
    await expect(
      commitFiles(
        [
          { path: join(root, "a.md"), text: "a v2\n" },
          { path: join(root, "card.md"), text: null },
        ],
        fs,
      ),
    ).rejects.toMatchObject({ code: "io-failed" });
    expect(await tree(root)).toEqual(before);
  });
});
