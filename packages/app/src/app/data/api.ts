import {
  learnConfigSchema,
  parseReviewEvent,
  type ContentBundle,
  type Finding,
  type LearnConfig,
  type ReviewEvent,
} from "@wastech-learn/core";

/** What the local server says about itself and the repository it serves. */
export interface ServerStatus {
  readonly device: string;
  /** Absolute path of the content repository, for `vscode://file/…` links. */
  readonly contentPath: string;
  readonly config: LearnConfig;
  readonly sched: string;
  readonly build:
    | { readonly ok: true; readonly builtAt: string | null }
    | {
        readonly ok: false;
        readonly findings: readonly Finding[];
        readonly error: string | null;
      };
}

/** A typed failure of a call to the local server: no answer at all, or an answer the app cannot use. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFinding = (value: unknown): value is Finding =>
  isRecord(value) &&
  typeof value.ruleId === "string" &&
  typeof value.file === "string" &&
  isRecord(value.params);

const findingsOf = (value: unknown): readonly Finding[] =>
  Array.isArray(value) ? value.filter(isFinding) : [];

const invalid = (what: string): ApiError =>
  new ApiError("response-invalid", 200, `The server sent an unusable ${what}`);

/**
 * Checks the server's status at the edge: the config through core's schema, the rest by shape. A status the
 * app cannot read is an error here, not a crash three screens later.
 */
export const parseStatus = (raw: unknown): ServerStatus => {
  if (
    !isRecord(raw) ||
    typeof raw.device !== "string" ||
    typeof raw.contentPath !== "string" ||
    typeof raw.sched !== "string" ||
    !isRecord(raw.build)
  )
    throw invalid("status");
  const config = learnConfigSchema.safeParse(raw.config);
  if (!config.success) throw invalid("config");
  const build = raw.build;
  return {
    device: raw.device,
    contentPath: raw.contentPath,
    config: config.data,
    sched: raw.sched,
    build:
      build.ok === true
        ? {
            ok: true,
            builtAt: typeof build.builtAt === "string" ? build.builtAt : null,
          }
        : {
            ok: false,
            findings: findingsOf(build.findings),
            error: typeof build.error === "string" ? build.error : null,
          },
  };
};

/**
 * The bundle comes from the same build of wastech-learn that serves the app, so its version and the shape
 * of its lists are checked, not every field of every card.
 */
export const parseBundle = (raw: unknown): ContentBundle => {
  if (
    !isRecord(raw) ||
    raw.version !== 1 ||
    !Array.isArray(raw.topics) ||
    !Array.isArray(raw.cards) ||
    !Array.isArray(raw.domains)
  )
    throw invalid("bundle");
  return raw as unknown as ContentBundle;
};

/** Every event through core's schema; a line the schema refuses is left out, as the log reader does. */
export const parseEvents = (raw: unknown): readonly ReviewEvent[] => {
  if (!isRecord(raw) || !Array.isArray(raw.events)) throw invalid("event log");
  return raw.events.flatMap((item: unknown) => {
    const parsed = parseReviewEvent(item);
    return parsed.ok ? [parsed.event] : [];
  });
};

const body = async (response: Response): Promise<unknown> => {
  try {
    return (await response.json()) as unknown;
  } catch {
    // An empty or broken body: the status code alone says what happened.
    return undefined;
  }
};

const refusal = async (response: Response): Promise<ApiError> => {
  const answer = await body(response);
  const code =
    isRecord(answer) && typeof answer.code === "string" ? answer.code : "http";
  return new ApiError(code, response.status, `HTTP ${String(response.status)}`);
};

export type BundleAnswer =
  | {
      readonly kind: "bundle";
      readonly bundle: ContentBundle;
      readonly etag: string | null;
    }
  | { readonly kind: "not-modified" }
  | { readonly kind: "unavailable"; readonly findings: readonly Finding[] };

/** The four reads and one write of the local server, all relative to the page's own origin. */
export interface Api {
  readonly status: () => Promise<ServerStatus>;
  readonly bundle: (etag: string | null) => Promise<BundleAnswer>;
  readonly events: () => Promise<readonly ReviewEvent[]>;
  readonly append: (
    events: readonly ReviewEvent[],
  ) => Promise<{ readonly appended: number; readonly duplicates: number }>;
}

export const createApi = (fetcher: Fetch): Api => {
  const get = async (path: string, headers: HeadersInit = {}) => {
    try {
      return await fetcher(path, { headers });
    } catch (error) {
      throw new ApiError(
        "unreachable",
        0,
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  return {
    status: async () => {
      const response = await get("/api/status");
      if (!response.ok) throw await refusal(response);
      return parseStatus(await body(response));
    },
    bundle: async (etag) => {
      const response = await get(
        "/api/bundle",
        etag === null ? {} : { "If-None-Match": etag },
      );
      if (response.status === 304) return { kind: "not-modified" };
      if (response.status === 503) {
        const answer = await body(response);
        return {
          kind: "unavailable",
          findings: isRecord(answer) ? findingsOf(answer.findings) : [],
        };
      }
      if (!response.ok) throw await refusal(response);
      return {
        kind: "bundle",
        bundle: parseBundle(await body(response)),
        etag: response.headers.get("ETag"),
      };
    },
    events: async () => {
      const response = await get("/api/events");
      if (!response.ok) throw await refusal(response);
      return parseEvents(await body(response));
    },
    append: async (events) => {
      let response: Response;
      try {
        response = await fetcher("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(events),
        });
      } catch (error) {
        throw new ApiError(
          "unreachable",
          0,
          error instanceof Error ? error.message : String(error),
        );
      }
      if (!response.ok) throw await refusal(response);
      const answer = await body(response);
      if (
        !isRecord(answer) ||
        typeof answer.appended !== "number" ||
        typeof answer.duplicates !== "number"
      )
        throw invalid("append answer");
      return { appended: answer.appended, duplicates: answer.duplicates };
    },
  };
};
