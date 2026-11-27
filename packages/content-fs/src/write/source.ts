import { readFile, realpath } from "node:fs/promises";
import {
  LearnError,
  cardEditDecision,
  editableKind,
  needsMeaningDecision,
  readDocument,
  readSections,
  sha256Hex,
  splitFrontMatter,
  withCardLinks,
  withFrontMatterValue,
  writeDocument,
  type CardEditDecision,
  type EditableKind,
  type Finding,
  type SourceFile,
  type SourceSaveBody,
} from "@wastech-learn/core";
import { confinePath } from "../confine.js";
import { isMissing } from "../fs-utils.js";
import type { ValidationReport } from "../validate-overlay.js";
import { validateOverlay } from "../validate-overlay.js";
import { calendarDate, type Snapshot, type Workspace } from "../workspace.js";
import { applyWrite } from "./apply.js";
import { planSuccessor } from "./successor.js";
import { requireTopic } from "./topic-paths.js";

/**
 * What saving an edited file came to. `unchanged` — the text on disk already is the new text, so there
 * was nothing to write; `decision-needed` — the learner must say whether the card is still the same one
 * before anything is written; `blocked` — the checks found errors and nothing was written.
 */
export type SourceSaveOutcome =
  | {
      readonly status: "written" | "unchanged";
      readonly paths: readonly string[];
      /** For a card: the id that now carries the text, and the id retired for it, if any. */
      readonly card:
        { readonly id: string; readonly retired: string | null } | undefined;
      readonly report: ValidationReport;
    }
  | { readonly status: "blocked"; readonly report: ValidationReport }
  | { readonly status: "decision-needed"; readonly decision: CardEditDecision };

const EMPTY_REPORT: ValidationReport = {
  findings: [],
  lint: [],
  errorCount: 0,
  warningCount: 0,
};

const notFound = (path: string): LearnError =>
  new LearnError("source-not-found", `${path} cannot be edited`, {
    subject: path,
  });

/**
 * The absolute path of an editable file, refused unless it is one of the files the app edits and is
 * reached without any symbolic link: a link inside the repository could still lead the editor to a
 * config file or the review log under an innocent name.
 */
const editablePath = async (
  root: string,
  path: string,
): Promise<{ readonly kind: EditableKind; readonly absolute: string }> => {
  const kind = editableKind(path);
  if (kind === undefined) throw notFound(path);
  let absolute: string;
  try {
    absolute = (await confinePath(root, path)).absolute;
  } catch (error) {
    if (error instanceof LearnError && error.code === "path-outside-content")
      throw notFound(path);
    throw error;
  }
  try {
    if ((await realpath(absolute)) !== absolute) throw notFound(path);
  } catch (error) {
    if (isMissing(error)) throw notFound(path);
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
    if (isMissing(error)) throw notFound(path);
    throw new LearnError(
      "io-failed",
      `Cannot read ${path}`,
      { file: path },
      { cause: error },
    );
  }
  return { path, text, version: await sha256Hex(text) };
};

const frontMatterOf = (text: string): Readonly<Record<string, unknown>> => {
  const split = splitFrontMatter(text);
  return split.ok && typeof split.data === "object" && split.data !== null
    ? (split.data as Record<string, unknown>)
    : {};
};

const FILE_ID = /\/cards\/([^/]+)\.md$/;

/**
 * The id is what the review history hangs on; an edit that changes it would orphan every past answer.
 * The id before the edit is the reference, or the file name when the old text has no readable id.
 */
const idChange = (
  path: string,
  before: string,
  after: string,
): Finding | undefined => {
  const split = splitFrontMatter(after);
  if (!split.ok) return undefined;
  // YAML reads an id of digits (or one like `1e5abcde`) as a number; the text of the line is what counts.
  const asText = (value: unknown): string | undefined =>
    typeof value === "string" || typeof value === "number"
      ? String(value)
      : undefined;
  const expected =
    asText(frontMatterOf(before).id) ?? FILE_ID.exec(path)?.[1] ?? "";
  if (asText(frontMatterOf(after).id) === expected) return undefined;
  const lines = after.split("\n");
  const index = lines.findIndex((line) => /^id\s*:/.test(line));
  return {
    ruleId: "card-id-changed",
    severity: "error",
    file: path,
    line: index === -1 ? 1 : index + 1,
    params: { id: expected },
  };
};

const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

/**
 * Sets `updated` the way the chat tools do, unless the learner changed it themselves. Only that one
 * line of the front matter is replaced, so the rest of the text is saved exactly as typed.
 */
const withUpdatedToday = (
  before: string,
  after: string,
  today: string,
): string => {
  const was = frontMatterOf(before).updated;
  const now = frontMatterOf(after).updated;
  if (now !== was || now === today) return after;
  return withUpdated(after, today);
};

/** The text with its front matter's `updated` line set to `today`; the rest stays as typed. */
const withUpdated = (text: string, today: string): string => {
  const block = FRONT_MATTER.exec(text)?.[0];
  if (block === undefined) return text;
  return (
    block.replace(/^updated\s*:.*$/m, `updated: ${today}`) +
    text.slice(block.length)
  );
};

const titleOf = (text: string): string | undefined => {
  const split = splitFrontMatter(text);
  return split.ok ? readSections(split.body, split.bodyLine).title : undefined;
};

interface Plan {
  readonly files: ReadonlyMap<string, string>;
  readonly incidental: readonly string[];
  readonly card:
    { readonly id: string; readonly retired: string | null } | undefined;
}

/** A card edit: the file alone, or with the topic's list when the `#` title changed. */
const planCardEdit = (snapshot: Snapshot, path: string, text: string): Plan => {
  const card = snapshot.parsed.model.cards.find(
    (candidate) => candidate.file === path,
  );
  const files = new Map([[path, text]]);
  const id = card?.id ?? FILE_ID.exec(path)?.[1] ?? "";
  const title = titleOf(text);
  if (card === undefined || title === undefined || title === card.title)
    return { files, incidental: [], card: { id, retired: null } };
  const topic = requireTopic(snapshot, card.topic);
  files.set(
    topic.indexPath,
    writeDocument(withCardLinks(topic.index, [{ id: card.id, title }])),
  );
  return { files, incidental: [topic.indexPath], card: { id, retired: null } };
};

const withoutActiveEdit = (
  report: ValidationReport,
  path: string,
): ValidationReport => {
  const findings = report.findings.filter(
    (finding) => !(finding.ruleId === "active-edit" && finding.file === path),
  );
  return {
    ...report,
    findings,
    warningCount:
      report.warningCount - (report.findings.length - findings.length),
  };
};

/**
 * Saves the whole new text of one editable file, the way the chat tools write: the version the editor
 * opened must still be on disk, the id stays, a card that may now ask something else waits for the
 * learner's word, and only then both validation tiers run over the repository with the edit laid on
 * top before one transaction writes it. Cheap refusals come first, so a stale editor never pays for a
 * full validation.
 */
export const saveSource = async (
  workspace: Workspace,
  input: SourceSaveBody,
): Promise<SourceSaveOutcome> => {
  const { path, text } = input;
  const { kind } = await editablePath(workspace.root, path);
  const snapshot = await workspace.snapshot();
  const current = snapshot.files.get(path);
  if (current === undefined) throw notFound(path);
  const unchanged: SourceSaveOutcome = {
    status: "unchanged",
    paths: [],
    card: undefined,
    report: EMPTY_REPORT,
  };
  if ((await sha256Hex(current)) !== input.version) {
    // The same save sent twice finds its own text on disk, with today's `updated` for a summary or
    // materials file: that is done, not a conflict.
    const today = calendarDate(
      workspace.options.now(),
      snapshot.config.timezone,
    );
    if (current === text || current === withUpdated(text, today))
      return unchanged;
    throw new LearnError(
      "content-changed",
      `${path} changed after it was opened`,
      { file: path, subject: path },
    );
  }
  if (current === text) return unchanged;

  let plan: Plan;
  let decided = false;
  if (kind === "card") {
    const idFinding = idChange(path, current, text);
    if (idFinding !== undefined) {
      const report = await validateOverlay(workspace, new Map([[path, text]]));
      return {
        status: "blocked",
        report: {
          ...report,
          findings: [idFinding, ...report.findings],
          errorCount: report.errorCount + 1,
        },
      };
    }
    const decision = cardEditDecision(current, text);
    const card = snapshot.parsed.model.cards.find(
      (candidate) => candidate.file === path,
    );
    const document = readDocument(current);
    const successor = readDocument(text);
    if (needsMeaningDecision(decision)) {
      if (input.meaning === undefined)
        return { status: "decision-needed", decision };
      decided = input.meaning === "same";
    }
    if (
      needsMeaningDecision(decision) &&
      input.meaning === "new" &&
      card !== undefined &&
      document !== undefined &&
      successor !== undefined
    ) {
      const next = planSuccessor(
        workspace,
        snapshot,
        {
          file: path,
          topic: card.topic,
          origin: card.frontMatter.origin,
          document,
        },
        (meta) => {
          let result = withFrontMatterValue(successor, "id", meta.id);
          result = withFrontMatterValue(result, "created", meta.created);
          result = withFrontMatterValue(result, "status", "active");
          result = withFrontMatterValue(result, "origin", meta.origin);
          return { document: result, title: titleOf(text) ?? meta.id };
        },
      );
      plan = {
        files: next.files,
        incidental: [next.indexPath],
        card: { id: next.id, retired: card.id },
      };
    } else {
      plan = planCardEdit(snapshot, path, text);
    }
  } else if (kind === "summary" || kind === "materials") {
    const today = calendarDate(
      workspace.options.now(),
      snapshot.config.timezone,
    );
    plan = {
      files: new Map([[path, withUpdatedToday(current, text, today)]]),
      incidental: [],
      card: undefined,
    };
  } else {
    plan = { files: new Map([[path, text]]), incidental: [], card: undefined };
  }

  const outcome = await applyWrite(
    workspace,
    {
      basis: snapshot,
      files: plan.files,
      incidental: plan.incidental,
      result: undefined,
    },
    { dryRun: false },
  );
  if (outcome.status === "blocked")
    return { status: "blocked", report: outcome.report };
  // The learner has just said the rewrite is still the same card; repeating the warning would ask again.
  const report = decided
    ? withoutActiveEdit(outcome.report, path)
    : outcome.report;
  return {
    status: "written",
    paths: [...plan.files.keys()],
    card: plan.card,
    report,
  };
};
