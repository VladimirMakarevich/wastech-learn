import {
  gitFailureSchema,
  gitStateSchema,
  gitSyncResultSchema,
  type Finding,
  type GitFailure,
  type GitState,
  type GitSyncResult,
} from "@wastech-learn/core";
import { ApiError, type Fetch } from "./api";

/** A Sync or Pull as the app shows it: what happened, or why nothing (or only part) happened. */
export type SyncAnswer =
  | { readonly ok: true; readonly result: GitSyncResult }
  | { readonly ok: false; readonly failure: GitFailure };

/**
 * A card or topic write: on disk, stopped by the checks with their findings, or not tried for a reason
 * the server names by code (the file changed meanwhile, the card is gone, nothing to bring back).
 */
export type WriteAnswer =
  | { readonly kind: "written" }
  | { readonly kind: "blocked"; readonly findings: readonly Finding[] }
  | { readonly kind: "refused"; readonly code: string };

export interface WriteApi {
  readonly gitState: () => Promise<GitState>;
  readonly sync: (message: string) => Promise<SyncAnswer>;
  readonly pull: () => Promise<SyncAnswer>;
  readonly cardStatus: (
    id: string,
    status: "active" | "retired",
  ) => Promise<WriteAnswer>;
  readonly deleteCard: (id: string) => Promise<WriteAnswer>;
  readonly restoreCard: (id: string) => Promise<WriteAnswer>;
  readonly topicStatus: (
    topic: string,
    status: "active" | "archived",
  ) => Promise<WriteAnswer>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFinding = (value: unknown): value is Finding =>
  isRecord(value) &&
  typeof value.ruleId === "string" &&
  typeof value.file === "string" &&
  isRecord(value.params);

const invalid = (what: string): ApiError =>
  new ApiError("response-invalid", 200, `The server sent an unusable ${what}`);

const bodyOf = async (response: Response): Promise<unknown> => {
  try {
    return (await response.json()) as unknown;
  } catch {
    // An empty or broken body: the status code alone says what happened.
    return undefined;
  }
};

/** A card or topic write's answer, read by shape at the edge. */
export const parseWriteAnswer = (status: number, raw: unknown): WriteAnswer => {
  if (!isRecord(raw)) throw invalid("write answer");
  if (status === 200 && raw.status === "written") return { kind: "written" };
  if (raw.status === "blocked")
    return {
      kind: "blocked",
      findings: Array.isArray(raw.findings)
        ? raw.findings.filter(isFinding)
        : [],
    };
  if (typeof raw.code === "string") return { kind: "refused", code: raw.code };
  throw invalid("write answer");
};

/** A Sync or Pull answer, through core's schemas, so server and app agree on one shape. */
export const parseSyncAnswer = (status: number, raw: unknown): SyncAnswer => {
  if (status === 200) {
    const result = gitSyncResultSchema.safeParse(raw);
    if (result.success) return { ok: true, result: result.data };
  } else {
    const failure = gitFailureSchema.safeParse(raw);
    if (failure.success) return { ok: false, failure: failure.data };
  }
  throw invalid("sync answer");
};

/**
 * The calls that change the content repository: Sync, Pull and the card and topic writes. Every one is a
 * JSON body from this page, which is what the server's guard lets through.
 */
export const createWriteApi = (fetcher: Fetch): WriteApi => {
  const call = async (
    path: string,
    method: string,
    body?: unknown,
  ): Promise<Response> => {
    try {
      return await fetcher(path, {
        method,
        ...(body === undefined
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
      });
    } catch (error) {
      throw new ApiError(
        "unreachable",
        0,
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const write = async (
    path: string,
    method: string,
    body: unknown,
  ): Promise<WriteAnswer> => {
    const response = await call(path, method, body);
    if (response.status !== 200 && response.status !== 409)
      throw new ApiError(
        "http",
        response.status,
        `HTTP ${String(response.status)}`,
      );
    return parseWriteAnswer(response.status, await bodyOf(response));
  };

  const git = async (path: string, body: unknown): Promise<SyncAnswer> => {
    const response = await call(path, "POST", body);
    if (response.status !== 200 && response.status !== 409)
      throw new ApiError(
        "http",
        response.status,
        `HTTP ${String(response.status)}`,
      );
    return parseSyncAnswer(response.status, await bodyOf(response));
  };

  return {
    gitState: async () => {
      const response = await call("/api/git", "GET");
      if (!response.ok)
        throw new ApiError(
          "http",
          response.status,
          `HTTP ${String(response.status)}`,
        );
      const parsed = gitStateSchema.safeParse(await bodyOf(response));
      if (!parsed.success) throw invalid("git state");
      return parsed.data;
    },
    sync: (message) => git("/api/git/sync", { message }),
    pull: () => git("/api/git/pull", {}),
    cardStatus: (id, status) =>
      write(`/api/cards/${encodeURIComponent(id)}/status`, "POST", { status }),
    deleteCard: (id) =>
      write(`/api/cards/${encodeURIComponent(id)}`, "DELETE", {}),
    restoreCard: (id) =>
      write(`/api/cards/${encodeURIComponent(id)}/restore`, "POST", {}),
    topicStatus: (topic, status) => {
      const [domain = "", name = ""] = topic.split("/");
      return write(
        `/api/topics/${encodeURIComponent(domain)}/${encodeURIComponent(name)}/status`,
        "POST",
        { status },
      );
    },
  };
};
