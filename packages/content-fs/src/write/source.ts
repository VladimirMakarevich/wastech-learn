import {
  LearnError,
  cardEditDecision,
  needsMeaningDecision,
  readDocument,
  sha256Hex,
  withCardLinks,
  withFrontMatterValue,
  writeDocument,
  type CardEditDecision,
  type SavedCard,
  type SourceSaveBody,
} from "@wastech-learn/core";
import type { ValidationReport } from "../validate-overlay.js";
import { validateOverlay } from "../validate-overlay.js";
import { calendarDate, type Snapshot, type Workspace } from "../workspace.js";
import { applyWrite } from "./apply.js";
import { editablePath, sourceNotFound } from "./source-read.js";
import {
  fileCardId,
  idChange,
  titleOf,
  withUpdated,
  withUpdatedToday,
} from "./source-text.js";
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
      readonly card: SavedCard | undefined;
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

interface Plan {
  readonly files: ReadonlyMap<string, string>;
  readonly incidental: readonly string[];
  readonly card: SavedCard | undefined;
}

/** A card edit: the file alone, or with the topic's list when the `#` title changed. */
const planCardEdit = (snapshot: Snapshot, path: string, text: string): Plan => {
  const card = snapshot.parsed.model.cards.find(
    (candidate) => candidate.file === path,
  );
  const files = new Map([[path, text]]);
  const id = card?.id ?? fileCardId(path) ?? "";
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

/**
 * The old card retired with its text as on disk, and the edited text as a new card. `undefined` when the
 * card is not in the content model (its topic does not parse, say): there is then no topic to list the
 * new card in.
 */
const planNewCard = (
  workspace: Workspace,
  snapshot: Snapshot,
  path: string,
  current: string,
  text: string,
): Plan | undefined => {
  const card = snapshot.parsed.model.cards.find(
    (candidate) => candidate.file === path,
  );
  const document = readDocument(current);
  const successor = readDocument(text);
  if (card === undefined || document === undefined || successor === undefined)
    return undefined;
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
  return {
    files: next.files,
    incidental: [next.indexPath],
    card: { id: next.id, retired: card.id },
  };
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
  if (current === undefined) throw sourceNotFound(path);
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
    const meaningAsked = needsMeaningDecision(decision);
    if (meaningAsked && input.meaning === undefined)
      return { status: "decision-needed", decision };
    decided = meaningAsked && input.meaning === "same";
    const next =
      meaningAsked && input.meaning === "new"
        ? planNewCard(workspace, snapshot, path, current, text)
        : undefined;
    plan = next ?? planCardEdit(snapshot, path, text);
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
