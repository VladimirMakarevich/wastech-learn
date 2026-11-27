import { createHash } from "node:crypto";
import { buildBundle } from "@wastech-learn/content-fs";
import {
  isLearnError,
  type ContentBundle,
  type Finding,
} from "@wastech-learn/core";

/** The bundle the app gets: the last one that built, ready to send, with its validator. */
export interface ServedBundle {
  readonly bundle: ContentBundle;
  readonly text: string;
  readonly etag: string;
}

export type BuildOutcome =
  | {
      readonly ok: true;
      readonly ms: number;
      readonly topics: number;
      readonly cards: number;
    }
  | {
      readonly ok: false;
      readonly ms: number;
      readonly findings: readonly Finding[];
      /** A failure that stopped the build before the content was read, such as an invalid config. */
      readonly error: string | undefined;
    };

export interface BundleHolder {
  /** The last bundle that built; `undefined` until the first build succeeds. */
  readonly served: () => ServedBundle | undefined;
  /** Why the latest build failed; `undefined` once a build succeeds again. */
  readonly failure: () => Extract<BuildOutcome, { ok: false }> | undefined;
  /** Rebuilds now, or once more after the build in flight, and resolves with the outcome. */
  readonly rebuild: () => Promise<BuildOutcome>;
}

/**
 * Builds the whole bundle on every change and keeps the last one that built. A card saved half-way with a
 * schema error leaves the app working on the previous bundle while the error is shown, instead of
 * emptying the screen. Builds never overlap: a change during a build schedules exactly one more.
 */
export const createBundleHolder = (
  root: string,
  now: () => Date,
): BundleHolder => {
  let served: ServedBundle | undefined;
  let failure: Extract<BuildOutcome, { ok: false }> | undefined;
  let running: Promise<BuildOutcome> | undefined;
  let queued: Promise<BuildOutcome> | undefined;

  const buildOnce = async (): Promise<BuildOutcome> => {
    const started = performance.now();
    const elapsed = (): number => Math.round(performance.now() - started);
    try {
      const result = await buildBundle(root, now());
      if (!result.ok) {
        failure = {
          ok: false,
          ms: elapsed(),
          findings: result.findings,
          error: undefined,
        };
        return failure;
      }
      const text = JSON.stringify(result.bundle);
      served = {
        bundle: result.bundle,
        text,
        etag: `"${createHash("sha256").update(text).digest("hex").slice(0, 32)}"`,
      };
      failure = undefined;
      return {
        ok: true,
        ms: elapsed(),
        topics: result.bundle.topics.length,
        cards: result.bundle.cards.length,
      };
    } catch (error) {
      // The server outlives a broken config or an unreadable file: the app keeps the last bundle and is
      // told why the new one is missing.
      failure = {
        ok: false,
        ms: elapsed(),
        findings: [],
        error: isLearnError(error) ? error.code : "build-failed",
      };
      return failure;
    }
  };

  const rebuild = (): Promise<BuildOutcome> => {
    if (running === undefined) {
      running = buildOnce().finally(() => {
        running = undefined;
      });
      return running;
    }
    queued ??= running.then(() => {
      queued = undefined;
      return rebuild();
    });
    return queued;
  };

  return { served: () => served, failure: () => failure, rebuild };
};
