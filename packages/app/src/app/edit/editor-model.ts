import { computed, signal } from "@angular/core";
import type {
  EditMeaning,
  Finding,
  SourceFile,
  SourceLintFinding,
  SourceSaveAnswer,
  SourceSaveBody,
} from "@wastech-learn/core";
import { ApiError } from "../data/api";

/** What the editor needs from the outside world; tests pass fakes, the app the server and the bundle. */
export interface EditorDeps {
  readonly load: (path: string) => Promise<SourceFile>;
  readonly save: (body: SourceSaveBody) => Promise<SourceSaveAnswer>;
  /** Resolves once the screen shows the saved text, so the editor never closes over the old one. */
  readonly afterWrite: () => Promise<void>;
}

/**
 * `blocked` — the checks stopped the save and the findings are listed; `decision` — the learner is asked
 * whether the card is still the same; `conflict` — the file changed elsewhere since it was opened;
 * `missing` — the file is no longer there or may not be edited; `failed` — the server did not answer
 * usefully; `done` — saved, the editor is about to close.
 */
export type EditorPhase =
  | "loading"
  | "editing"
  | "saving"
  | "blocked"
  | "decision"
  | "conflict"
  | "missing"
  | "failed"
  | "done";

/** A finding as the editor lists it: whether it is in the open file, so choosing it can move the cursor. */
export interface EditorFinding {
  readonly file: string;
  readonly line: number | undefined;
  readonly here: boolean;
  readonly severity: "error" | "warning";
  readonly detail:
    | { readonly kind: "check"; readonly finding: Finding }
    | {
        readonly kind: "lint";
        readonly ruleId: string;
        readonly message: string;
      };
}

export interface MeaningQuestion {
  readonly largeEdit: readonly {
    readonly section: string;
    readonly percent: number;
  }[];
  readonly removedVariants: readonly string[];
}

export interface SaveResult {
  readonly status: "written" | "unchanged";
  readonly warnings: readonly EditorFinding[];
}

const LINE_BREAKS = /\r\n?/g;

const editorFindings = (
  path: string,
  findings: readonly Finding[],
  lint: readonly SourceLintFinding[],
): readonly EditorFinding[] =>
  [
    ...findings.map((finding): EditorFinding => ({
      file: finding.file,
      line: finding.line,
      here: finding.file === path,
      severity: finding.severity,
      detail: { kind: "check", finding },
    })),
    ...lint.map((finding): EditorFinding => ({
      file: finding.file,
      // mdlint puts a finding about the whole file on line 0: there is no line to go to.
      line: finding.line > 0 ? finding.line : undefined,
      here: finding.file === path,
      severity: finding.severity,
      detail: {
        kind: "lint",
        ruleId: finding.ruleId,
        message: finding.message,
      },
    })),
  ]
    // Errors before warnings and the open file before others: what blocks this save comes first.
    .map((finding, index) => ({ finding, index }))
    .sort(
      (a, b) =>
        Number(a.finding.severity === "warning") -
          Number(b.finding.severity === "warning") ||
        Number(!a.finding.here) - Number(!b.finding.here) ||
        a.index - b.index,
    )
    .map(({ finding }) => finding);

/**
 * The state of one open file: the text as opened and as edited, and where a save stands. It holds no
 * DOM and no Angular injection, so every transition is tested as plain calls.
 */
export class EditorModel {
  readonly path = signal<string | undefined>(undefined);
  readonly phase = signal<EditorPhase>("loading");
  readonly draft = signal("");
  readonly findings = signal<readonly EditorFinding[]>([]);
  readonly question = signal<MeaningQuestion | undefined>(undefined);
  readonly failure = signal<string | undefined>(undefined);
  /** Bumped whenever the text is replaced from the server, so the view puts it into the field. */
  readonly revision = signal(0);
  private readonly opened = signal<SourceFile | undefined>(undefined);

  /** A browser text field turns every line break into `\n`; comparing as it would keep CRLF files clean. */
  readonly dirty = computed(() => {
    const opened = this.opened();
    return (
      opened !== undefined &&
      this.draft() !== opened.text.replace(LINE_BREAKS, "\n")
    );
  });

  readonly busy = computed(
    () => this.phase() === "loading" || this.phase() === "saving",
  );

  constructor(private readonly deps: EditorDeps) {}

  async open(path: string): Promise<void> {
    this.path.set(path);
    this.phase.set("loading");
    this.findings.set([]);
    this.question.set(undefined);
    try {
      const source = await this.deps.load(path);
      // A slow answer for a file the learner already left must not replace the one now open.
      if (this.path() !== path) return;
      this.take(source);
      this.phase.set("editing");
    } catch (error) {
      if (this.path() !== path) return;
      this.fail(error);
    }
  }

  setDraft(text: string): void {
    this.draft.set(text);
  }

  /**
   * Sends the draft against the version it was opened from. `meaning` is the learner's answer to the
   * question a previous save raised. Resolves with the result once the text is on disk and on screen.
   */
  async save(meaning?: EditMeaning): Promise<SaveResult | undefined> {
    const opened = this.opened();
    const path = this.path();
    if (opened === undefined || path === undefined || this.busy())
      return undefined;
    if (!this.dirty()) {
      this.phase.set("done");
      return { status: "unchanged", warnings: [] };
    }
    this.phase.set("saving");
    this.question.set(undefined);
    let answer: SourceSaveAnswer;
    try {
      answer = await this.deps.save({
        path,
        version: opened.version,
        text: this.draft(),
        ...(meaning === undefined ? {} : { meaning }),
      });
    } catch (error) {
      this.fail(error);
      return undefined;
    }
    switch (answer.kind) {
      case "saved":
        this.findings.set([]);
        // The draft is on disk now: a navigation before the editor closes must not ask to drop it.
        this.opened.set({ ...opened, text: this.draft() });
        this.phase.set("done");
        await this.deps.afterWrite();
        return {
          status: answer.status,
          warnings: editorFindings(path, answer.findings, answer.lint),
        };
      case "blocked":
        this.findings.set(editorFindings(path, answer.findings, answer.lint));
        this.phase.set("blocked");
        return undefined;
      case "decision":
        this.question.set({
          largeEdit: answer.largeEdit,
          removedVariants: answer.removedVariants,
        });
        this.phase.set("decision");
        return undefined;
      case "refused":
        this.refused(answer.code);
        return undefined;
    }
  }

  /** The learner closed the question without choosing: back to the text, nothing written. */
  dismissQuestion(): void {
    this.question.set(undefined);
    this.phase.set("editing");
  }

  /** Replaces the draft with the file as it is now on disk; the caller has asked the learner first. */
  async reload(): Promise<void> {
    const path = this.path();
    if (path !== undefined) await this.open(path);
  }

  private take(source: SourceFile): void {
    this.opened.set(source);
    this.draft.set(source.text.replace(LINE_BREAKS, "\n"));
    this.revision.update((revision) => revision + 1);
  }

  private refused(code: string): void {
    if (code === "content-changed") this.phase.set("conflict");
    else if (code === "source-not-found") this.phase.set("missing");
    else {
      this.failure.set(code);
      this.phase.set("failed");
    }
  }

  private fail(error: unknown): void {
    if (!(error instanceof ApiError)) throw error;
    this.refused(error.code);
  }
}
