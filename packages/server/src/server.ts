import { getRandomValues } from "node:crypto";
import { stat } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";
import {
  appendReviewEvents,
  loadConfigSource,
  loadDevice,
  openWorkspace,
  pullRepository,
  readGitState,
  readReviewLog,
  suggestCommitMessage,
  syncRepository,
  watchRepository,
  type SyncOutcome,
  type Workspace,
  type RepositoryChange,
  type RepositoryWatcher,
  type WatchOptions,
} from "@wastech-learn/content-fs";
import {
  emptyBodySchema,
  gitSyncBodySchema,
  parseAppBody,
  isLearnError,
  parseReviewEvent,
  type GitState,
  type RandomSource,
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
import { createChangeHub, type ChangeHub } from "./changes.js";
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
  /** The randomness of new ids; tests pass a seeded one. */
  readonly random?: RandomSource;
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
 * Reads a JSON body through a core schema, once, at the edge. A refusal names the first bad field so
 * the app's developer sees what it sent wrong; the app itself never sends one.
 */
export const parseBody = async <Value>(
  c: Context,
  schema: Parameters<typeof parseAppBody<Value>>[0],
): Promise<
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly response: Response }
> => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    // Not JSON at all: the app never sends that, so the answer is a refusal, not a crash.
    return { ok: false, response: refusal(c, { code: "body-not-json" }) };
  }
  const parsed = parseAppBody(schema, raw);
  if (parsed.ok) return parsed;
  return {
    ok: false,
    response: refusal(c, {
      code: "body-invalid",
      field: parsed.field,
      message: parsed.message,
    }),
  };
};

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

const cryptoRandom: RandomSource = () =>
  (getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32;

interface RouteDeps {
  readonly options: ServerOptions;
  readonly holder: BundleHolder;
  readonly workspace: Workspace;
  readonly watcher: () => RepositoryWatcher | undefined;
  readonly hub: ChangeHub;
  readonly ready: Promise<void>;
}

const routes = ({
  options,
  holder,
  workspace,
  watcher,
  hub,
  ready,
}: RouteDeps): Hono => {
  const { root } = options;
  const subscribe = hub.subscribe;

  const gitState = async (): Promise<GitState> => {
    const [state, device] = await Promise.all([
      readGitState(root),
      // The device only names the suggested message; a broken learn.local.json must not hide the state.
      workspace.device().catch(() => (options.hostname ?? hostname)()),
    ]);
    return {
      ...state,
      entries: [...state.entries],
      suggestedMessage: suggestCommitMessage(state.entries, device),
    };
  };

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
    // Appends share the queue with content writes and git: two batches racing for the same file could
    // both miss an id the other is writing, and a line appended in the middle of a rebase could be lost.
    const results = await workspace.exclusive(() =>
      appendReviewEvents(root, checked.events),
    );
    for (const result of results) {
      if (result.written === 0) continue;
      watcher()?.ownAppend(
        result.file,
        (await stat(join(root, result.file))).size,
      );
    }
    if (results.some((result) => result.written > 0))
      hub.publish({ type: "git-changed" });
    return c.json({
      appended: results.reduce((sum, result) => sum + result.written, 0),
      duplicates: results.reduce((sum, result) => sum + result.skipped, 0),
    });
  });

  api.get("/git", async (c) => c.json(await gitState()));

  // A git operation waits for any write in flight and blocks the next one: a commit taken halfway
  // through an append, or an append landing in the middle of a rebase, could lose a line.
  const gitOperation = async (
    c: Context,
    operation: () => Promise<SyncOutcome>,
  ): Promise<Response> => {
    const outcome = await workspace.exclusive(operation);
    workspace.invalidate();
    hub.publish({ type: "git-changed" });
    return outcome.ok ? c.json(outcome.result) : c.json(outcome.failure, 409);
  };

  api.post("/git/sync", limitBody(), async (c) => {
    const body = await parseBody(c, gitSyncBodySchema);
    if (!body.ok) return body.response;
    return gitOperation(c, () => syncRepository(root, body.value.message));
  });

  api.post("/git/pull", limitBody(), async (c) => {
    const body = await parseBody(c, emptyBodySchema);
    if (!body.ok) return body.response;
    return gitOperation(c, () => pullRepository(root));
  });

  api.get("/changes", (c) =>
    streamSSE(c, async (stream) => {
      const closed = new Promise<void>((resolve) => {
        stream.onAbort(resolve);
      });
      // A write fails only once the tab has gone; onAbort then ends this stream and drops the listener, so
      // a failed write needs no handling of its own.
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
    let path: string;
    try {
      path = decodeURIComponent(c.req.path.slice(1));
    } catch {
      // A malformed escape names no asset; it is a missing file, not a server failure.
      return c.json({ code: "not-found" }, 404);
    }
    const listed = holder.served()?.bundle.assets[path];
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
  const workspace = openWorkspace({
    root: options.root,
    now,
    random: options.random ?? cryptoRandom,
    ...(options.hostname === undefined ? {} : { hostname: options.hostname }),
  });

  const build = async (): Promise<BuildOutcome> => {
    const outcome = await holder.rebuild();
    options.onBuild?.(outcome);
    return outcome;
  };

  const ready = build().then(() => undefined);

  const onChange = (change: RepositoryChange): void => {
    // Any change in the work tree may change what is not committed yet; the app rereads only the cheap
    // git state, not the bundle.
    hub.publish({ type: "git-changed" });
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
    app: routes({
      options,
      holder,
      workspace,
      watcher: () => watcher,
      hub,
      ready,
    }),
    ready,
    close: () => {
      watcher.close();
    },
  };
};
