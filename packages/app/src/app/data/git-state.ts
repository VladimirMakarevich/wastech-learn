import { DOCUMENT, Injectable, computed, inject, signal } from "@angular/core";
import type { GitState } from "@wastech-learn/core";
import { ApiError } from "./api";
import { AppData } from "./app-data";
import { hasUnsentReviews, isInSync } from "./git-model";
import { createWriteApi, type SyncAnswer, type WriteApi } from "./write-api";

/**
 * The content repository's git state as a signal, reread whenever it may have changed: the server
 * announces a change of the work tree, a Sync or Pull finishes, or the tab comes back into view (a commit
 * made in a terminal touches only `.git/`, which the server does not watch).
 */
@Injectable({ providedIn: "root" })
export class GitStatus {
  private readonly data = inject(AppData);
  readonly api: WriteApi = createWriteApi((input, init) =>
    globalThis.fetch(input, init),
  );
  readonly state = signal<GitState | undefined>(undefined);
  /** A Sync or Pull is running: the buttons wait, so a second press cannot start a second one. */
  readonly running = signal(false);
  private generation = 0;

  readonly changeCount = computed(() => this.state()?.entries.length ?? 0);
  readonly inSync = computed(() => {
    const state = this.state();
    return state !== undefined && isInSync(state);
  });
  readonly unsentReviews = computed(() => {
    const state = this.state();
    return state !== undefined && hasUnsentReviews(state);
  });

  constructor() {
    const document = inject(DOCUMENT);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void this.refresh();
    });
    this.data.onChange((change) => {
      if (change.type === "git-changed") void this.refresh();
    });
    void this.refresh();
  }

  /** Rereads the state; when two refreshes overlap, only the later one is kept. */
  async refresh(): Promise<void> {
    const generation = ++this.generation;
    try {
      const state = await this.api.gitState();
      if (generation === this.generation) this.state.set(state);
    } catch (error) {
      // Without the server the last state stays on screen; the offline banner already says why.
      if (!(error instanceof ApiError)) throw error;
    }
  }

  sync(message: string): Promise<SyncAnswer> {
    return this.run(() => this.api.sync(message));
  }

  pull(): Promise<SyncAnswer> {
    return this.run(() => this.api.pull());
  }

  private async run(operation: () => Promise<SyncAnswer>): Promise<SyncAnswer> {
    if (this.running()) return { ok: false, failure: { code: "busy" } };
    this.running.set(true);
    try {
      return await operation();
    } catch (error) {
      // No answer, or one the app cannot read: said in the panel like any other failure, never lost.
      if (!(error instanceof ApiError)) throw error;
      return { ok: false, failure: { code: "git-failed", detail: error.code } };
    } finally {
      this.running.set(false);
      await this.refresh();
    }
  }
}
