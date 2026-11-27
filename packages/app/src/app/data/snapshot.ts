import type { ContentBundle, ReviewEvent } from "@wastech-learn/core";
import type { ReplayContext, SessionDeck } from "@wastech-learn/session";
import type { DurationEstimates, ReplayState } from "@wastech-learn/srs";

/** The whole log replayed at one moment, with what the library screens derive from it. */
export interface LibrarySnapshot {
  readonly now: Date;
  readonly bundle: ContentBundle;
  readonly context: ReplayContext;
  readonly deck: SessionDeck;
  readonly events: readonly ReviewEvent[];
  readonly state: ReplayState;
  readonly estimates: DurationEstimates;
  /** The content hash each item was last answered on, to mark changed cards. */
  readonly answeredHash: ReadonlyMap<string, string>;
}

/** Whether the card changed since its item was last answered, as the session decides it too. */
export const changedSince = (
  snapshot: LibrarySnapshot,
  item: string,
  cardHash: string,
): boolean => {
  const answered = snapshot.answeredHash.get(item);
  return answered !== undefined && answered !== cardHash;
};
