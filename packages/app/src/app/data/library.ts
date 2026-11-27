import { DOCUMENT, Injectable, computed, inject, signal } from "@angular/core";
import { deckFromBundle, toReplayEvents } from "@wastech-learn/session";
import {
  estimateDurations,
  nextQueueChange,
  prepareEvents,
  replay,
} from "@wastech-learn/srs";
import { AppData } from "./app-data";
import { Clock } from "./clock";
import type { LibrarySnapshot } from "./snapshot";

/**
 * The replayed log for Home, Topic, Cards and Stats. A full replay of a large log takes up to a second, so
 * it runs only when a screen that needs it reads the snapshot and the log or the content changed since; the
 * review screen keeps its own incremental state and never pays for this.
 *
 * Time changes the queue too: a learning step comes due, a new study day begins. The snapshot goes stale at
 * the next such moment and when the tab is shown again, so a tab left open overnight greets the learner
 * with the morning's queue; it is replayed again only if a screen reads it then.
 */
@Injectable({ providedIn: "root" })
export class Library {
  private readonly data = inject(AppData);
  private readonly clock = inject(Clock);
  private readonly document = inject(DOCUMENT);
  private readonly tick = signal(0);
  private wake: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // A timer runs late after the computer slept and is throttled in a background tab; showing the tab
    // again catches up with both.
    this.document.addEventListener("visibilitychange", () => {
      if (this.document.visibilityState === "visible") this.stale();
    });
  }

  readonly snapshot = computed((): LibrarySnapshot | undefined => {
    this.tick();
    const context = this.data.context();
    const bundle = this.data.bundle();
    const events = this.data.events();
    if (
      context === undefined ||
      bundle === undefined ||
      !this.data.eventsLoaded()
    )
      return undefined;
    const now = this.clock.now();
    const deck = deckFromBundle(bundle);
    const prepared = prepareEvents(events);
    const state = replay(
      toReplayEvents(events),
      context.scheduler,
      context.config,
      now,
    );
    this.staleAt(nextQueueChange(state, context.config, now), now.getTime());
    const answeredHash = new Map<string, string>();
    for (const event of prepared)
      if (
        (event.kind === "review" || event.kind === "practice") &&
        event.contentHash !== undefined
      )
        answeredHash.set(event.item, event.contentHash);
    return {
      now,
      bundle,
      context,
      deck,
      events,
      state,
      estimates: estimateDurations(prepared, deck.cards),
      answeredHash,
    };
  });

  private stale(): void {
    this.tick.update((tick) => tick + 1);
  }

  private staleAt(at: number, now: number): void {
    clearTimeout(this.wake);
    // A second's margin lands past the boundary even when the timer fires a little early.
    this.wake = setTimeout(
      () => {
        this.stale();
      },
      Math.max(1_000, at - now + 1_000),
    );
  }
}
