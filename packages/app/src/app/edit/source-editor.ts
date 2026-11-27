import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from "@angular/core";
import { formatFinding } from "@wastech-learn/core";
import { AppData } from "../data/app-data";
import { GitStatus } from "../data/git-state";
import type { MessageKey } from "../i18n/en";
import { I18n } from "../i18n/i18n";
import { TPipe } from "../i18n/t.pipe";
import { Confirm } from "../ui/confirm-dialog";
import { Toasts } from "../ui/toast";
import { EditorModel, type EditorFinding } from "./editor-model";
import { lineOffset, sectionLine } from "./text-position";
import { UnsavedEdits } from "./unsaved-guard";

/** A file the editor can show, with the label of its tab when there are several. */
export interface EditorFile {
  readonly path: string;
  readonly label: MessageKey;
}

export type EditorClose = "saved" | "cancelled";

/**
 * The whole file as plain Markdown in a text field, saved through the server's validated write. Tab is
 * left to move focus, so the field is never a keyboard trap; Ctrl+S saves and Esc closes. The editor asks
 * before it drops text: on Esc, on switching files and, through the route guard, on leaving the screen.
 */
@Component({
  selector: "wl-source-editor",
  imports: [TPipe],
  templateUrl: "./source-editor.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "source-editor", "(keydown)": "onKey($event)" },
})
export class SourceEditor {
  readonly files = input.required<readonly EditorFile[]>();
  readonly initial = input.required<string>();
  /** A summary section to put the cursor on when the file opens. */
  readonly section = input<string | undefined>(undefined);
  /** The content's language, so a screen reader and the spell checker read the text right. */
  readonly lang = input<string>("en");
  readonly closed = output<EditorClose>();

  private readonly data = inject(AppData);
  private readonly git = inject(GitStatus);
  private readonly confirm = inject(Confirm);
  private readonly toasts = inject(Toasts);
  private readonly unsaved = inject(UnsavedEdits);
  protected readonly i18n = inject(I18n);

  protected readonly model = new EditorModel({
    load: (path) => this.git.api.source(path),
    save: (body) => this.git.api.saveSource(body),
    afterWrite: () => this.data.refreshContent(),
  });

  private readonly area = viewChild<ElementRef<HTMLTextAreaElement>>("area");

  protected readonly fileName = computed(
    () => this.model.path()?.split("/").at(-1) ?? "",
  );

  // A save can take the card out of the session while it runs; the screen has then moved on already.
  private destroyed = false;

  constructor() {
    const release = this.unsaved.register(() => this.model.dirty());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      release();
    });
    effect(() => {
      const path = this.initial();
      untracked(() => void this.model.open(path));
    });
    // The text goes into the field only when it comes from the server, never on every keystroke, so
    // the cursor stays where the learner put it.
    effect(() => {
      const revision = this.model.revision();
      const area = this.area()?.nativeElement;
      if (area === undefined || revision === 0) return;
      untracked(() => {
        area.value = this.model.draft();
        const section = this.section();
        const opensSummary = this.model.path()?.endsWith("/summary.md");
        const line =
          section !== undefined && opensSummary === true
            ? sectionLine(area.value, section) + 1
            : 1;
        this.goTo(line);
      });
    });
  }

  protected onInput(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement)
      this.model.setDraft(event.target.value);
  }

  protected onKey(event: KeyboardEvent): void {
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key.toLowerCase() === "s" || event.code === "KeyS")
    ) {
      event.preventDefault();
      void this.save();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      void this.cancel();
    }
  }

  protected async save(meaning?: "same" | "new"): Promise<void> {
    const result = await this.model.save(meaning);
    if (this.model.phase() === "decision") {
      await this.askMeaning();
      return;
    }
    if (result === undefined) return;
    const warning = result.warnings[0];
    this.toasts.show(
      warning === undefined
        ? this.i18n.t("edit.saved")
        : this.i18n.t("edit.saved-warning", { detail: this.describe(warning) }),
    );
    if (!this.destroyed) this.closed.emit("saved");
  }

  protected async cancel(): Promise<void> {
    if (this.model.busy()) return;
    if (await this.unsavedMayGo()) this.closed.emit("cancelled");
  }

  protected async switchTo(path: string): Promise<void> {
    if (path === this.model.path() || this.model.busy()) return;
    if (await this.unsavedMayGo()) await this.model.open(path);
  }

  protected async reload(): Promise<void> {
    const choice = await this.confirm.ask({
      title: this.i18n.t("edit.reload.title"),
      lines: [this.i18n.t("edit.reload.body")],
      choices: [
        {
          value: "keep",
          label: this.i18n.t("edit.reload.keep"),
          tone: "primary",
        },
        {
          value: "replace",
          label: this.i18n.t("edit.reload.replace"),
          tone: "danger",
        },
      ],
    });
    if (choice === "replace") await this.model.reload();
  }

  /** Where a finding points, and what it says, in the learner's language where the catalog has it. */
  protected describe(finding: EditorFinding): string {
    const detail =
      finding.detail.kind === "check"
        ? formatFinding(this.i18n.lang(), finding.detail.finding)
        : `${finding.detail.ruleId}: ${finding.detail.message}`;
    if (finding.line === undefined)
      return this.i18n.t("edit.finding-file", { file: finding.file, detail });
    return finding.here
      ? this.i18n.t("edit.finding-here", { line: finding.line, detail })
      : this.i18n.t("edit.finding-there", {
          file: finding.file,
          line: finding.line,
          detail,
        });
  }

  /** Puts the cursor at the start of a 1-based line and scrolls it into view near the top. */
  protected goTo(line: number): void {
    const area = this.area()?.nativeElement;
    if (area === undefined) return;
    const offset = lineOffset(area.value, line);
    area.focus();
    area.setSelectionRange(offset, offset);
    const lineHeight = Number.parseFloat(getComputedStyle(area).lineHeight);
    if (Number.isFinite(lineHeight))
      area.scrollTop = Math.max(0, (line - 3) * lineHeight);
  }

  private async unsavedMayGo(): Promise<boolean> {
    if (!this.model.dirty()) return true;
    return this.unsaved.mayDiscard();
  }

  private async askMeaning(): Promise<void> {
    const question = this.model.question();
    if (question === undefined) return;
    const lines = [
      ...question.largeEdit.map((edit) =>
        this.i18n.t("edit.meaning.large", {
          section: edit.section,
          percent: edit.percent,
        }),
      ),
      ...(question.removedVariants.length === 0
        ? []
        : [
            this.i18n.t("edit.meaning.variants", {
              variants: question.removedVariants.join(", "),
            }),
          ]),
      this.i18n.t("edit.meaning.same-note"),
      this.i18n.t("edit.meaning.new-note"),
    ];
    const choice = await this.confirm.ask({
      title: this.i18n.t("edit.meaning.title"),
      lines,
      choices: [
        {
          value: "same",
          label: this.i18n.t("edit.meaning.same"),
          tone: "primary",
        },
        { value: "new", label: this.i18n.t("edit.meaning.new"), tone: "plain" },
        {
          value: "back",
          label: this.i18n.t("edit.meaning.back"),
          tone: "plain",
        },
      ],
    });
    if (choice === "same" || choice === "new") {
      this.model.dismissQuestion();
      await this.save(choice);
    } else {
      this.model.dismissQuestion();
      this.area()?.nativeElement.focus();
    }
  }
}
