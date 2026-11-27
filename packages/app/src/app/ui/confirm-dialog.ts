import {
  DIALOG_DATA,
  Dialog,
  DialogConfig,
  DialogRef,
} from "@angular/cdk/dialog";
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  inject,
} from "@angular/core";
import { firstValueFrom } from "rxjs";

/** One answer of a question; the first one is where focus lands, so it is the safe or expected one. */
export interface ConfirmChoice {
  readonly value: string;
  readonly label: string;
  readonly tone: "primary" | "danger" | "plain";
}

export interface ConfirmData {
  readonly title: string;
  readonly lines: readonly string[];
  readonly choices: readonly ConfirmChoice[];
}

/**
 * A modal question with a few answers, already in the learner's language. Closing it with Esc or the
 * backdrop chooses nothing, which every caller treats as "leave things as they are".
 */
@Component({
  selector: "wl-confirm-dialog",
  template: `<h2 id="confirm-dialog-title">{{ data.title }}</h2>
    @for (line of data.lines; track $index) {
      <p class="git-note">{{ line }}</p>
    }
    <div class="row dialog-actions">
      @for (choice of data.choices; track choice.value) {
        <button
          type="button"
          class="btn"
          [class.primary]="choice.tone === 'primary'"
          [class.danger]="choice.tone === 'danger'"
          [attr.data-choice]="choice.value"
          (click)="ref.close(choice.value)"
        >
          {{ choice.label }}
        </button>
      }
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "confirm-panel" },
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
}

/** Opens a `ConfirmDialog` and resolves with the chosen value, or `undefined` when it was closed. */
@Injectable({ providedIn: "root" })
export class Confirm {
  private readonly dialog = inject(Dialog);

  ask(data: ConfirmData): Promise<string | undefined> {
    const config = new DialogConfig<ConfirmData, DialogRef<string>>();
    config.data = data;
    config.ariaLabelledBy = "confirm-dialog-title";
    config.autoFocus = "first-tabbable";
    config.restoreFocus = true;
    config.panelClass = "dialog-panel";
    config.backdropClass = "dialog-backdrop";
    const ref = this.dialog.open<string, ConfirmData>(ConfirmDialog, config);
    return firstValueFrom(ref.closed);
  }
}
