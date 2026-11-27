import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { skillFolderHash } from "../src/index.js";
import { tempDir } from "./helpers.js";

const writeSkill = async (dir: string, skillMd: string): Promise<string> => {
  await mkdir(join(dir, "templates"), { recursive: true });
  await mkdir(join(dir, ".git"), { recursive: true });
  await writeFile(join(dir, "SKILL.md"), skillMd);
  await writeFile(join(dir, "templates", "b.md"), "b\n");
  await writeFile(join(dir, "templates", "a.md"), "a");
  await writeFile(join(dir, "metadata.json"), "{}");
  await writeFile(join(dir, ".git", "HEAD"), "x");
  await writeFile(join(dir, "Ж.md"), "ж\n");
  return dir;
};

describe("skill folder hash", () => {
  it("equals the hash the skills CLI 1.9.1 records for the same folder", async () => {
    // Computed with computeSkillFolderHash of skills@1.9.1 over this very folder: the lock entries
    // written by init have to read as the CLI's own.
    const dir = await writeSkill(
      join(await tempDir(), "skill"),
      "---\nname: demo\n---\r\nLine with CRLF\r\n",
    );
    expect(await skillFolderHash(dir)).toBe(
      "f1d38c462a4de2ba8686bbc587b99d61965b05e7a60a9c4564c3b98aebc68524",
    );
  });

  it("does not see CRLF line endings of a Windows checkout as a change", async () => {
    const root = await tempDir();
    const crlf = await writeSkill(
      join(root, "crlf"),
      "---\nname: demo\n---\r\nLine with CRLF\r\n",
    );
    const lf = await writeSkill(
      join(root, "lf"),
      "---\nname: demo\n---\nLine with CRLF\n",
    );
    expect(await skillFolderHash(lf)).toBe(await skillFolderHash(crlf));
  });

  it("changes when a file of the skill changes", async () => {
    const root = await tempDir();
    const before = await skillFolderHash(
      await writeSkill(join(root, "a"), "one\n"),
    );
    const after = await skillFolderHash(
      await writeSkill(join(root, "b"), "two\n"),
    );
    expect(after).not.toBe(before);
  });
});
