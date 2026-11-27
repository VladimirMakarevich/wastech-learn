import { Dialog, DialogConfig, DialogRef } from "@angular/cdk/dialog";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Injector,
} from "@angular/core";
import { commitMessageSchema, type GitEntry } from "@wastech-learn/core";
import { AppData } from "../data/app-data";
import {
  blockLine,
  failureLine,
  resultLine,
  splitEntries,
  type Line,
} from "../data/git-model";
import { GitStatus } from "../data/git-state";
import type { SyncAnswer } from "../data/write-api";
import type { MessageKey } from "../i18n/en";
import { TPipe } from "../i18n/t.pipe";
import { vscodeLink } from "./vscode";

interface Outcome {
  readonly ok: boolean;
  readonly line: Line;
  readonly files: readonly { readonly path: string; readonly href: string }[];
}

/**
 * The Sync panel: what goes into the commit and what stays out, the message (suggested, editable), and
 * the two buttons. It says what happened in one line; a failure says what to do next and names the
 * files to open. Nothing reaches the network until a button is pressed.
 */
@Component({
  selector: "wl-sync-panel",
  imports: [TPipe],
  templateUrl: "./sync-panel.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "sync-panel" },
})
export class SyncPanel {
  private readonly ref = inject(DialogRef);
  private readonly data = inject(AppData);
  protected readonly git = inject(GitStatus);
  protected readonly message = signal("");
  protected readonly outcome = signal<Outcome | null>(null);
  // Once the owner typed a message, a refresh of the state must not replace it with a suggestion.
  private edited = false;

  protected readonly state = this.git.state;
  protected readonly lists = computed(() => {
    const state = this.state();
    return state === undefined ? undefined : splitEntries(state);
  });
  protected readonly block = computed(() => {
    const reason = this.state()?.blocked?.reason;
    return reason === undefined ? undefined : blockLine(reason);
  });
  protected readonly canAct = computed(
    () =>
      this.state() !== undefined &&
      this.block() === undefined &&
      !this.git.running(),
  );

  /** The message passes the same schema the server parses it with, so a press is never refused for it. */
  protected readonly messageValid = computed(
    () => commitMessageSchema.safeParse(this.message()).success,
  );

  constructor() {
    effect(() => {
      const suggested = this.state()?.suggestedMessage;
      if (suggested !== undefined && !this.edited) this.message.set(suggested);
    });
  }

  protected changeKey(entry: GitEntry): MessageKey {
    return `git.change.${entry.change}` as const;
  }

  protected edit(value: string): void {
    this.edited = true;
    this.message.set(value);
  }

  protected async sync(): Promise<void> {
    const message = commitMessageSchema.safeParse(this.message());
    if (!message.success) return;
    this.show(await this.git.sync(message.data));
  }

  protected async pull(): Promise<void> {
    this.show(await this.git.pull());
  }

  protected close(): void {
    this.ref.close();
  }

  private show(answer: SyncAnswer): void {
    if (answer.ok) {
      this.edited = false;
      this.outcome.set({
        ok: true,
        line: resultLine(answer.result),
        files: [],
      });
      return;
    }
    const root = this.data.status()?.contentPath;
    this.outcome.set({
      ok: false,
      line: failureLine(answer.failure),
      files: (answer.failure.files ?? []).map((path) => ({
        path,
        href: root === undefined ? "#" : vscodeLink(root, path),
      })),
    });
  }
}

/** Opens the Sync panel as a modal dialog: focus moves in, stays there, and returns where it was. */
export const openSyncPanel = (injector: Injector): void => {
  const dialog = injector.get(Dialog);
  if (dialog.openDialogs.length > 0) return;
  const config = new DialogConfig<unknown, DialogRef<unknown, SyncPanel>>();
  config.ariaLabelledBy = "sync-title";
  config.autoFocus = "first-tabbable";
  config.restoreFocus = true;
  config.panelClass = "dialog-panel";
  config.backdropClass = "dialog-backdrop";
  dialog.open(SyncPanel, config);
};
