import { readFile, realpath } from "node:fs/promises";
import {
  LearnError,
  editableKind,
  sha256Hex,
  type EditableKind,
  type SourceFile,
} from "@wastech-learn/core";
import { confinePath } from "../confine.js";
import { isMissing } from "../fs-utils.js";
import type { Workspace } from "../workspace.js";

export const sourceNotFound = (path: string): LearnError =>
  new LearnError("source-not-found", `${path} cannot be edited`, {
    subject: path,
  });

/**
 * The absolute path of an editable file, refused unless it is one of the files the app edits and is
 * reached without any symbolic link: a link inside the repository could still lead the editor to a
 * config file or the review log under an innocent name.
 */
export const editablePath = async (
  root: string,
  path: string,
): Promise<{ readonly kind: EditableKind; readonly absolute: string }> => {
  const kind = editableKind(path);
  if (kind === undefined) throw sourceNotFound(path);
  let absolute: string;
  try {
    absolute = (await confinePath(root, path)).absolute;
  } catch (error) {
    if (error instanceof LearnError && error.code === "path-outside-content")
      throw sourceNotFound(path);
    throw error;
  }
  try {
    if ((await realpath(absolute)) !== absolute) throw sourceNotFound(path);
  } catch (error) {
    if (isMissing(error)) throw sourceNotFound(path);
    throw error;
  }
  return { kind, absolute };
};

/** One editable file as text with its version, the hash a later save names to prove what it edited. */
export const readSource = async (
  workspace: Workspace,
  path: string,
): Promise<SourceFile> => {
  const { absolute } = await editablePath(workspace.root, path);
  let text: string;
  try {
    text = await readFile(absolute, "utf8");
  } catch (error) {
    if (isMissing(error)) throw sourceNotFound(path);
    throw new LearnError(
      "io-failed",
      `Cannot read ${path}`,
      { file: path },
      { cause: error },
    );
  }
  return { path, text, version: await sha256Hex(text) };
};
