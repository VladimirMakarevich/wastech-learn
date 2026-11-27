import { Injectable, computed, inject } from "@angular/core";
import { deckFromBundle, toReplayEvents } from "@wastech-learn/session";
import { estimateDurations, prepareEvents, replay } from "@wastech-learn/srs";
import { AppData } from "./app-data";
import { Clock } from "./clock";
import type { LibrarySnapshot } from "./snapshot";

/**
 * The replayed log for Home, Topic, Cards and Stats. A full replay of a large log takes up to a second, so
 * it runs only when a screen that needs it reads the snapshot and the log or the content changed since; the
 * review screen keeps its own incremental state and never pays for this.
 */
@Injectable({ providedIn: "root" })
export class Library {
  private readonly data = inject(AppData);
  private readonly clock = inject(Clock);

  readonly snapshot = computed((): LibrarySnapshot | undefined => {
    const context = this.data.context();
    const bundle = this.data.bundle();
    const events = this.data.events();
    if (context === undefined || bundle === undefined) return undefined;
    const now = this.clock.now();
    const deck = deckFromBundle(bundle);
    const prepared = prepareEvents(events);
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
      state: replay(
        toReplayEvents(events),
        context.scheduler,
        context.config,
        now,
      ),
      estimates: estimateDurations(prepared, deck.cards),
      answeredHash,
    };
  });
}
