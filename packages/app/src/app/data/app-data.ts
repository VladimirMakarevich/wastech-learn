import { Injectable, computed, signal } from "@angular/core";
import type { ContentBundle, Finding, ReviewEvent } from "@wastech-learn/core";
import { toSrsConfig, type ReplayContext } from "@wastech-learn/session";
import { createScheduler } from "@wastech-learn/srs";
import { browserStore } from "../prefs/local-store";
import { ApiError, createApi, type Api, type ServerStatus } from "./api";
import { createChangeStream, type ChangeStream } from "./changes";
import {
  createHttpReviewStore,
  type OutboxReport,
  type ReviewStore,
} from "./review-store";

/** Why the content on screen may be older than the files: the latest build failed, with or without findings. */
export interface BuildFailure {
  readonly findings: readonly Finding[];
  readonly error: string | null;
}

export type LoadState = "loading" | "ready" | "unavailable" | "unreachable";

/**
 * Everything the screens read from the local server, as signals: the server's status, the content bundle,
 * the review log and the scheduler built from the config. It reloads what the server says changed and keeps
 * showing the last good bundle when a build fails. Writes go only through the review store.
 */
@Injectable({ providedIn: "root" })
export class AppData {
  private readonly api: Api = createApi((input, init) =>
    globalThis.fetch(input, init),
  );
  private readonly changes: ChangeStream = createChangeStream();
  private etag: string | null = null;
  private schedulerKey = "";

  readonly status = signal<ServerStatus | undefined>(undefined);
  readonly bundle = signal<ContentBundle | undefined>(undefined);
  readonly events = signal<readonly ReviewEvent[]>([]);
  /** Bumped on every reload of the log from outside, so a running session knows to refresh. */
  readonly externalRevision = signal(0);
  /** The log has been loaded once: a queue built before that would treat every card as new. */
  readonly eventsLoaded = signal(false);
  readonly context = signal<ReplayContext | undefined>(undefined);
  readonly loadState = signal<LoadState>("loading");
  readonly buildFailure = signal<BuildFailure | null>(null);
  readonly connected = signal(true);
  readonly outbox = signal<OutboxReport>({
    pending: 0,
    offline: false,
    refused: 0,
  });

  readonly ready = computed(
    () =>
      this.bundle() !== undefined &&
      this.status() !== undefined &&
      this.context() !== undefined &&
      this.eventsLoaded(),
  );

  readonly store: ReviewStore = createHttpReviewStore({
    api: this.api,
    store: browserStore(),
    subscribeChanges: (listener) =>
      this.changes.subscribe((change) => {
        if (change.type === "events-changed") listener();
      }),
    onReport: (report) => {
      this.outbox.set(report);
    },
    currentDevice: async () => {
      const status = await this.api.status();
      this.status.set(status);
      return status.device;
    },
  });
  // Two loads can overlap (a reconnect and an announced change); only the latest may set the log.
  private loadGeneration = 0;

  constructor() {
    this.changes.onConnection((open) => {
      this.connected.set(open);
    });
    this.changes.subscribe((change) => {
      switch (change.type) {
        case "content-changed":
          void this.loadContent();
          break;
        case "build-failed":
          this.buildFailure.set({ findings: change.findings, error: null });
          break;
        case "events-changed":
          break;
      }
    });
    this.store.onExternalChange(() => {
      void this.loadEvents();
    });
    void this.reload();
  }

  /** Loads the status, the bundle and the log again: the shell's "reload" and the first start. */
  async reload(): Promise<void> {
    await Promise.all([this.loadContent(), this.loadEvents()]);
  }

  /** Appends this client's events: they count at once on screen and reach the server when it is there. */
  async append(events: readonly ReviewEvent[]): Promise<void> {
    if (events.length === 0) return;
    const known = new Set(this.events().map((event) => event.id));
    this.events.update((current) => [
      ...current,
      ...events.filter((event) => !known.has(event.id)),
    ]);
    await this.store.append(events);
  }

  private async loadContent(): Promise<void> {
    try {
      const [status, answer] = await Promise.all([
        this.api.status(),
        this.api.bundle(this.etag),
      ]);
      this.status.set(status);
      await this.ensureScheduler(status);
      this.buildFailure.set(
        status.build.ok
          ? null
          : { findings: status.build.findings, error: status.build.error },
      );
      if (answer.kind === "bundle") {
        this.bundle.set(answer.bundle);
        this.etag = answer.etag;
      }
      this.loadState.set(
        answer.kind === "unavailable" && this.bundle() === undefined
          ? "unavailable"
          : "ready",
      );
      if (answer.kind === "unavailable")
        this.buildFailure.set({ findings: answer.findings, error: null });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (this.bundle() === undefined) this.loadState.set("unreachable");
    }
  }

  private async loadEvents(): Promise<void> {
    const generation = ++this.loadGeneration;
    try {
      const events = await this.store.loadEvents();
      if (generation !== this.loadGeneration) return;
      this.events.set(events);
      this.eventsLoaded.set(true);
      this.externalRevision.update((revision) => revision + 1);
    } catch (error) {
      // Without the server the log already on screen stays; the session goes on with it.
      if (!(error instanceof ApiError)) throw error;
    }
  }

  private async ensureScheduler(status: ServerStatus): Promise<void> {
    const key = JSON.stringify(status.config);
    if (key === this.schedulerKey && this.context() !== undefined) return;
    this.schedulerKey = key;
    const config = toSrsConfig(status.config);
    this.context.set({ scheduler: await createScheduler(config), config });
  }
}
