import { DIALOG_DATA, DialogRef } from "@angular/cdk/dialog";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { TPipe } from "../../i18n/t.pipe";

export interface ConfirmDeleteData {
  readonly title: string;
  readonly lang: string;
  /**
   * The log holds events of this card: deleting it takes the card out of the queue, while its past answers
   * stay in the log and keep counting in the statistics.
   */
  readonly history: boolean;
  /** The last commit holds the card, so a deletion can be undone until the next commit. */
  readonly committed: boolean;
}

/** What the learner chose: delete the file, archive it instead, or neither (the dialog was closed). */
export type DeleteChoice = "delete" | "archive";

/**
 * Asks before a card is deleted. A card without history goes after one plain confirmation. A card with
 * history says what is lost and offers the archive as the first choice: it keeps the history and can be
 * undone at any time, while a deletion can be undone only until it is committed. A card the last commit
 * does not hold is said to go for good: there is no copy to bring back.
 */
@Component({
  selector: "wl-confirm-delete",
  imports: [TPipe],
  template: `<h2 id="confirm-title">{{ "delete.title" | t }}</h2>
    <p [attr.lang]="data.lang">{{ data.title }}</p>
    @if (data.history) {
      <p class="git-note" data-history>{{ "delete.history" | t }}</p>
    } @else if (data.committed) {
      <p class="git-note">{{ "delete.plain" | t }}</p>
    }
    @if (!data.committed) {
      <p class="git-note" data-permanent>{{ "delete.permanent" | t }}</p>
    }
    <div class="row dialog-actions">
      @if (data.history) {
        <button
          class="btn primary"
          type="button"
          data-choose-archive
          (click)="close('archive')"
        >
          {{ "action.archive" | t }}
        </button>
        <button
          class="btn danger"
          type="button"
          data-choose-delete
          (click)="close('delete')"
        >
          {{ "delete.anyway" | t }}
        </button>
      } @else {
        <button
          class="btn danger"
          type="button"
          data-choose-delete
          (click)="close('delete')"
        >
          {{ "action.delete" | t }}
        </button>
      }
      <button class="btn" type="button" (click)="close(undefined)">
        {{ "delete.cancel" | t }}
      </button>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "confirm-panel" },
})
export class ConfirmDelete {
  protected readonly data = inject<ConfirmDeleteData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<DeleteChoice>>(DialogRef);

  protected close(choice: DeleteChoice | undefined): void {
    this.ref.close(choice);
  }
}
