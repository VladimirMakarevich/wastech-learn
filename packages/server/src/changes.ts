import type { Finding } from "@wastech-learn/core";

/**
 * What the server tells the app over SSE: refetch the bundle, refetch the log, show a build error, or
 * reread the git state because a file of the work tree or the repository itself changed.
 */
export type ChangeEvent =
  | { readonly type: "content-changed" }
  | { readonly type: "events-changed" }
  | { readonly type: "git-changed" }
  | {
      readonly type: "build-failed";
      readonly findings: readonly Finding[];
    };

export interface ChangeHub {
  readonly publish: (event: ChangeEvent) => void;
  readonly subscribe: (listener: (event: ChangeEvent) => void) => () => void;
}

/** Fans one change out to every open tab of the app. */
export const createChangeHub = (): ChangeHub => {
  const listeners = new Set<(event: ChangeEvent) => void>();
  return {
    publish: (event) => {
      for (const listener of [...listeners]) listener(event);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
