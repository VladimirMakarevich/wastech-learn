import { Injectable, inject } from "@angular/core";
import { formatFinding, type AppTopicStatus } from "@wastech-learn/core";
import type { MessageKey } from "../i18n/en";
import { I18n } from "../i18n/i18n";
import { Toasts } from "../ui/toast";
import { GitStatus } from "./git-state";
import { ApiError } from "./api";
import type { WriteAnswer } from "./write-api";

const REFUSALS: Readonly<Record<string, MessageKey>> = {
  "content-changed": "write.content-changed",
  "card-not-found": "write.card-not-found",
  "topic-not-found": "write.topic-not-found",
  "nothing-to-restore": "write.nothing-to-restore",
};

/**
 * Archiving, returning, deleting and restoring cards and archiving topics, the same from every screen:
 * one call to the server, one calm message about what happened, and a way back where there is one. The
 * screens update when the server announces the rebuilt content, not from guesses here.
 */
@Injectable({ providedIn: "root" })
export class CardActions {
  private readonly git = inject(GitStatus);
  private readonly toasts = inject(Toasts);
  private readonly i18n = inject(I18n);

  async archive(id: string): Promise<boolean> {
    const done = await this.attempt(() =>
      this.git.api.cardStatus(id, "retired"),
    );
    if (done)
      this.toasts.show(this.i18n.t("toast.archived"), {
        label: this.i18n.t("action.return"),
        run: () => void this.unarchive(id),
      });
    return done;
  }

  async unarchive(id: string): Promise<boolean> {
    const done = await this.attempt(() =>
      this.git.api.cardStatus(id, "active"),
    );
    if (done) this.toasts.show(this.i18n.t("toast.returned"));
    return done;
  }

  /**
   * Deletes the card; the way back is offered only for a card the last commit holds, because restoring
   * reads it from there and a card never committed exists nowhere else.
   */
  async delete(id: string, committed: boolean): Promise<boolean> {
    const done = await this.attempt(() => this.git.api.deleteCard(id));
    if (done && committed)
      this.toasts.show(this.i18n.t("toast.deleted"), {
        label: this.i18n.t("action.undo-delete"),
        run: () => void this.restore(id),
      });
    else if (done) this.toasts.show(this.i18n.t("toast.deleted-for-good"));
    return done;
  }

  async restore(id: string): Promise<boolean> {
    const done = await this.attempt(() => this.git.api.restoreCard(id));
    if (done) this.toasts.show(this.i18n.t("toast.restored"));
    return done;
  }

  async topicStatus(topic: string, status: AppTopicStatus): Promise<boolean> {
    const done = await this.attempt(() =>
      this.git.api.topicStatus(topic, status),
    );
    if (done)
      this.toasts.show(
        this.i18n.t(
          status === "archived"
            ? "toast.topic-archived"
            : "toast.topic-returned",
        ),
      );
    return done;
  }

  /**
   * `true` when the write is on disk. Otherwise the learner hears why nothing changed, also when the
   * server is gone, and the git state is reread: a refusal often means it was stale.
   */
  private async attempt(write: () => Promise<WriteAnswer>): Promise<boolean> {
    let answer: WriteAnswer;
    try {
      answer = await write();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      answer = { kind: "refused", code: error.code };
    }
    const done = this.report(answer);
    if (!done) void this.git.refresh();
    return done;
  }

  private report(answer: WriteAnswer): boolean {
    if (answer.kind === "written") return true;
    if (answer.kind === "blocked") {
      const first = answer.findings[0];
      this.toasts.show(
        first === undefined
          ? this.i18n.t("write.blocked-plain")
          : this.i18n.t("write.blocked", {
              file: first.file,
              detail: formatFinding(this.i18n.lang(), first),
            }),
      );
      return false;
    }
    this.toasts.show(
      this.i18n.t(REFUSALS[answer.code] ?? "write.failed", {
        code: answer.code,
      }),
    );
    return false;
  }
}
