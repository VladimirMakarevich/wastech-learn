import { stat } from "node:fs/promises";
import { join } from "node:path";
import {
  appendReviewEvents,
  loadConfigSource,
  loadDevice,
  readReviewLog,
  watchRepository,
  type RepositoryChange,
  type RepositoryWatcher,
  type WatchOptions,
} from "@wastech-learn/content-fs";
import {
  isLearnError,
  parseReviewEvent,
  type ReviewEvent,
} from "@wastech-learn/core";
import { SCHEDULER_PACKAGE } from "@wastech-learn/srs";
import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import {
  createBundleHolder,
  type BuildOutcome,
  type BundleHolder,
} from "./bundle.js";
import { createChangeHub, type ChangeEvent } from "./changes.js";
import { guard, limitBody } from "./guard.js";
import { appFile, fileUnder } from "./static.js";

/** The writer of events the app sends; the server appends nothing under any other name. */
export const WEB_WRITER = "web";

// The app loads nothing from anywhere but this server. Inline styles stay allowed: Angular adds component
// styles at run time, and the bundle's KaTeX and Shiki markup carries style attributes; scripts never.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// A proxy or the OS closes a connection that stays silent for minutes; a comment line keeps the change
// stream open without waking the app.
const KEEPALIVE_MS = 25_000;

export interface ServerOptions {
  /** Absolute path of the content repository. */
  readonly root: string;
  /** The app's build output to serve; without it only `/api` answers. */
  readonly appDir?: string | undefined;
  /** The port the server listens on, once known, for the `Host` and `Origin` checks. */
  readonly port?: () => number | undefined;
  readonly now?: () => Date;
  readonly hostname?: () => string;
  /** Replaced in tests, so a change can be announced without touching the disk. */
  readonly watch?: (root: string, options: WatchOptions) => RepositoryWatcher;
  /** Each bundle build, for the host to report time and counts; never content. */
  readonly onBuild?: (outcome: BuildOutcome) => void;
  /** The watcher failed (an inotify limit, a removed folder); the app keeps working without live updates. */
  readonly onWatchError?: (error: unknown) => void;
}

export interface LearnServer {
  readonly app: Hono;
  /** Resolves once the first build finished, whatever its outcome. */
  readonly ready: Promise<void>;
  readonly close: () => void;
}

type Refusal = { readonly code: string } & Readonly<Record<string, unknown>>;

const refusal = (c: Context, body: Refusal) => c.json(body, 400);

/**
 * Checks a batch from the app: every event is a valid v1 event written by the app on this device. One bad
 * event refuses the whole batch, so the app never has half a batch in the log and half in its outbox.
 */
const checkBatch = (
  raw: unknown,
  device: string,
):
  | { readonly ok: true; readonly events: readonly ReviewEvent[] }
  | { readonly ok: false; readonly refusal: Refusal } => {
  const refuse = (body: Refusal) => ({ ok: false as const, refusal: body });
  if (!Array.isArray(raw)) return refuse({ code: "body-invalid" });
  const events: ReviewEvent[] = [];
  for (const [index, item] of (raw as readonly unknown[]).entries()) {
    const parsed = parseReviewEvent(item);
    if (!parsed.ok)
      return refuse(
        parsed.reason === "invalid"
          ? {
              code: "event-invalid",
              index,
              field: parsed.field,
              message: parsed.message,
            }
          : {
              code: "event-version-unsupported",
              index,
              version: parsed.version,
            },
      );
    if (parsed.event.writer !== WEB_WRITER)
      return refuse({ code: "writer-not-allowed", index });
    if (parsed.event.device !== device)
      return refuse({ code: "device-not-allowed", index });
    events.push(parsed.event);
  }
  return { ok: true, events };
};

const routes = (
  options: ServerOptions,
  holder: BundleHolder,
  watcher: () => RepositoryWatcher | undefined,
  subscribe: (listener: (event: ChangeEvent) => void) => () => void,
  ready: Promise<void>,
): Hono => {
  const { root } = options;
  // Appends are queued one after another: two batches racing for the same file could both miss an id the
  // other is writing.
  let appending: Promise<unknown> = Promise.resolve();

  const api = new Hono();

  api.get("/status", async (c) => {
    const [{ config, source }, device] = await Promise.all([
      loadConfigSource(root),
      loadDevice(root, options.hostname),
    ]);
    const failure = holder.failure();
    return c.json({
      device: device.device,
      deviceSource: device.source,
      contentPath: root,
      // The file's own shape, already validated: the app parses it with the same schema at its edge.
      config: source,
      sched: `${SCHEDULER_PACKAGE}/${config.srs.model}`,
      build:
        failure === undefined
          ? { ok: true, builtAt: holder.served()?.bundle.builtAt ?? null }
          : {
              ok: false,
              findings: failure.findings,
              error: failure.error ?? null,
            },
    });
  });

  api.get("/bundle", async (c) => {
    await ready;
    const served = holder.served();
    if (served === undefined)
      return c.json(
        {
          code: "bundle-unavailable",
          findings: holder.failure()?.findings ?? [],
        },
        503,
      );
    c.header("ETag", served.etag);
    c.header("Cache-Control", "no-cache");
    if (c.req.header("if-none-match") === served.etag) return c.body(null, 304);
    c.header("Content-Type", "application/json; charset=utf-8");
    return c.body(served.text);
  });

  api.get("/events", async (c) => {
    const log = await readReviewLog(root);
    return c.json({ events: log.events, findings: log.findings });
  });

  api.post("/events", limitBody(), async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      // Not JSON at all: the app never sends that, so the answer is a refusal, not a crash.
      return refusal(c, { code: "body-not-json" });
    }
    const { device } = await loadDevice(root, options.hostname);
    const checked = checkBatch(raw, device);
    if (!checked.ok) return refusal(c, checked.refusal);
    const append = appending.then(() =>
      appendReviewEvents(root, checked.events),
    );
    appending = append.catch(() => undefined);
    const results = await append;
    for (const result of results) {
      if (result.written === 0) continue;
      watcher()?.ownAppend(
        result.file,
        (await stat(join(root, result.file))).size,
      );
    }
    return c.json({
      appended: results.reduce((sum, result) => sum + result.written, 0),
      duplicates: results.reduce((sum, result) => sum + result.skipped, 0),
    });
  });

  api.get("/changes", (c) =>
    streamSSE(c, async (stream) => {
      const closed = new Promise<void>((resolve) => {
        stream.onAbort(resolve);
      });
      const unsubscribe = subscribe((event) => {
        const { type, ...data } = event;
        stream
          .writeSSE({ event: type, data: JSON.stringify(data) })
          .catch(() => undefined);
      });
      const keepalive = setInterval(() => {
        stream.write(": keepalive\n\n").catch(() => undefined);
      }, KEEPALIVE_MS);
      await closed;
      clearInterval(keepalive);
      unsubscribe();
    }),
  );

  api.all("*", (c) => c.json({ code: "not-found" }, 404));

  const app = new Hono();
  // A broken config or an unreadable log answers with its code, never with a stack trace or file text.
  app.onError((error, c) =>
    c.json({ code: isLearnError(error) ? error.code : "internal" }, 500),
  );
  app.use("*", guard(options.port ?? (() => undefined)));
  app.use("*", async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");
  });
  app.route("/api", api);

  // Local images the bundle links to rather than inlines: only paths the bundle names, so the content
  // repository is not browsable through the server.
  app.get("/content/*", async (c) => {
    const path = c.req.path.slice(1);
    const listed = holder.served()?.bundle.assets[decodeURIComponent(path)];
    const file =
      listed === undefined ? undefined : await fileUnder(root, listed);
    if (file === undefined) return c.json({ code: "not-found" }, 404);
    c.header("Content-Type", file.type);
    return c.body(file.body);
  });

  app.get("*", async (c) => {
    const file =
      options.appDir === undefined
        ? undefined
        : await appFile(options.appDir, c.req.path);
    if (file === undefined) return c.json({ code: "not-found" }, 404);
    c.header("Content-Type", file.type);
    if (file.type.startsWith("text/html")) {
      c.header("Cache-Control", "no-cache");
      c.header("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    }
    return c.body(file.body);
  });

  return app;
};

/**
 * The local server over one content repository, as a Hono app: routes are exercised with `app.request()`
 * in tests and served on 127.0.0.1 by `startServer`. It builds the bundle at once, rebuilds it when the
 * content or the config changes, and tells the app over SSE what changed.
 */
export const createServer = (options: ServerOptions): LearnServer => {
  const now = options.now ?? (() => new Date());
  const holder = createBundleHolder(options.root, now);
  const hub = createChangeHub();

  const build = async (): Promise<BuildOutcome> => {
    const outcome = await holder.rebuild();
    options.onBuild?.(outcome);
    return outcome;
  };

  const ready = build().then(() => undefined);

  const onChange = (change: RepositoryChange): void => {
    if (change.kinds.includes("reviews"))
      hub.publish({ type: "events-changed" });
    if (change.kinds.includes("content") || change.kinds.includes("config")) {
      void build().then((outcome) => {
        hub.publish(
          outcome.ok
            ? { type: "content-changed" }
            : { type: "build-failed", findings: outcome.findings },
        );
      });
    }
  };

  const watcher = (options.watch ?? watchRepository)(options.root, {
    onChange,
    ...(options.onWatchError === undefined
      ? {}
      : { onError: options.onWatchError }),
  });

  return {
    app: routes(options, holder, () => watcher, hub.subscribe, ready),
    ready,
    close: () => {
      watcher.close();
    },
  };
};
