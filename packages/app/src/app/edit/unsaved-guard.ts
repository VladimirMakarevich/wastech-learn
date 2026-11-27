import { DOCUMENT, Injectable, Injector, inject } from "@angular/core";
import type { CanDeactivateFn } from "@angular/router";
import { I18n } from "../i18n/i18n";

/**
 * Knows whether an open editor holds text that is not saved, and asks before it is lost: on leaving the
 * screen through the app, and through the browser's own prompt when the tab is closed or reloaded.
 */
@Injectable({ providedIn: "root" })
export class UnsavedEdits {
  private readonly injector = inject(Injector);
  private readonly i18n = inject(I18n);
  private readonly sources = new Set<() => boolean>();

  constructor() {
    inject(DOCUMENT).defaultView?.addEventListener("beforeunload", (event) => {
      if (this.dirty()) event.preventDefault();
    });
  }

  /** An editor reports its state while it is open; the returned function forgets it. */
  register(isDirty: () => boolean): () => void {
    this.sources.add(isDirty);
    return () => this.sources.delete(isDirty);
  }

  dirty(): boolean {
    return [...this.sources].some((isDirty) => isDirty());
  }

  /** `true` when there is nothing to lose or the learner chose to drop the text. */
  async mayDiscard(): Promise<boolean> {
    if (!this.dirty()) return true;
    // Loaded on first use: the guard sits on routes of the first paint, and the dialog with the CDK
    // overlay would otherwise ride in the initial bundle for a question most sessions never ask.
    const { Confirm } = await import("../ui/confirm-dialog");
    const choice = await this.injector.get(Confirm).ask({
      title: this.i18n.t("edit.discard.title"),
      lines: [this.i18n.t("edit.discard.body")],
      choices: [
        {
          value: "stay",
          label: this.i18n.t("edit.discard.stay"),
          tone: "primary",
        },
        {
          value: "discard",
          label: this.i18n.t("edit.discard.leave"),
          tone: "danger",
        },
      ],
    });
    return choice === "discard";
  }
}

/** Keeps a screen with an unsaved edit open until the learner says the text may go. */
export const unsavedGuard: CanDeactivateFn<unknown> = () =>
  inject(UnsavedEdits).mayDiscard();
