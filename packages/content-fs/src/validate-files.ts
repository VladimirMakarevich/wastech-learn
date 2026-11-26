import type { ValidateInput } from "@wastech-learn/core";
import { confinePath } from "./confine.js";
import { readGitBaseline } from "./git-baseline.js";
import { validateOverlay, type ValidationReport } from "./validate-overlay.js";
import type { Workspace } from "./workspace.js";

/**
 * Checks files as they are on disk, drafts as they would be if written, or both together, against the
 * whole repository, and writes nothing. A draft is judged in place, so its id is compared with every
 * other card and its links resolve from where it would live.
 */
export const validateFiles = async (
  workspace: Workspace,
  input: ValidateInput,
): Promise<ValidationReport> => {
  const touched: string[] = [];
  for (const path of input.paths ?? []) {
    touched.push((await confinePath(workspace.root, path)).relative);
  }
  const overlay = new Map<string, string>();
  for (const draft of input.drafts ?? []) {
    overlay.set(
      (await confinePath(workspace.root, draft.path)).relative,
      draft.content,
    );
  }
  return validateOverlay(workspace, overlay, { touched });
};

/**
 * Checks files an agent has just edited on disk, as a hook does: everything wrong in those files, and
 * every error the edit caused elsewhere. The repository as it was before the edit is the files'
 * committed text, so a renamed summary heading that breaks a card's anchor is reported now, not when
 * the card is edited next. A file git does not know yet has no earlier text and is compared as it is.
 */
export const validateEdited = async (
  workspace: Workspace,
  paths: readonly string[],
): Promise<ValidationReport> => {
  const touched: string[] = [];
  for (const path of paths) {
    touched.push((await confinePath(workspace.root, path)).relative);
  }
  const committed = await readGitBaseline(workspace.root);
  const before = new Map<string, string>();
  for (const path of touched) {
    const text = committed.get(path);
    if (text !== undefined) before.set(path, text);
  }
  return validateOverlay(workspace, new Map(), { touched, before });
};
