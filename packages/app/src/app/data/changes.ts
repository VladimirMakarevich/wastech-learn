import type { Finding } from "@wastech-learn/core";

/**
 * What the server announces: new content, a changed log, an edit that did not build, or a change that
 * may move the git state.
 */
export type ServerChange =
  | { readonly type: "content-changed" }
  | { readonly type: "events-changed" }
  | { readonly type: "git-changed" }
  | { readonly type: "build-failed"; readonly findings: readonly Finding[] };

export interface ChangeStream {
  readonly subscribe: (listener: (change: ServerChange) => void) => () => void;
  /** Whether the stream is open; the browser reconnects on its own when it is not. */
  readonly onConnection: (listener: (open: boolean) => void) => () => void;
  readonly close: () => void;
}

export type EventSourceFactory = (url: string) => EventSource;

const findingsOf = (data: string): readonly Finding[] => {
  try {
    const parsed: unknown = JSON.parse(data);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "findings" in parsed &&
      Array.isArray(parsed.findings)
    )
      return parsed.findings as readonly Finding[];
  } catch {
    // A garbled event still means "the build failed"; the banner then shows no file.
  }
  return [];
};

/**
 * The server's change stream over EventSource, which reconnects by itself after the server restarts. A
 * reconnect is reported as a change of every kind: whatever happened while the stream was down is unknown.
 */
export const createChangeStream = (
  open: EventSourceFactory = (url) => new EventSource(url),
): ChangeStream => {
  const listeners = new Set<(change: ServerChange) => void>();
  const connection = new Set<(open: boolean) => void>();
  const source = open("/api/changes");
  let wasOpen = false;
  let lostOnce = false;

  const emit = (change: ServerChange): void => {
    for (const listener of [...listeners]) listener(change);
  };

  source.addEventListener("open", () => {
    for (const listener of [...connection]) listener(true);
    if (lostOnce) {
      emit({ type: "content-changed" });
      emit({ type: "events-changed" });
      emit({ type: "git-changed" });
    }
    wasOpen = true;
  });
  source.addEventListener("error", () => {
    if (wasOpen) lostOnce = true;
    for (const listener of [...connection]) listener(false);
  });
  source.addEventListener("content-changed", () => {
    emit({ type: "content-changed" });
  });
  source.addEventListener("events-changed", () => {
    emit({ type: "events-changed" });
  });
  source.addEventListener("git-changed", () => {
    emit({ type: "git-changed" });
  });
  source.addEventListener("build-failed", (event) => {
    emit({
      type: "build-failed",
      findings: findingsOf((event as MessageEvent<string>).data),
    });
  });

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    onConnection: (listener) => {
      connection.add(listener);
      return () => {
        connection.delete(listener);
      };
    },
    close: () => {
      source.close();
    },
  };
};
