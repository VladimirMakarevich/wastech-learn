import { hostname } from "node:os";
import {
  pullRepository,
  readGitState,
  suggestCommitMessage,
  syncRepository,
  type SyncOutcome,
  type Workspace,
} from "@wastech-learn/content-fs";
import {
  emptyBodySchema,
  gitSyncBodySchema,
  type GitState,
} from "@wastech-learn/core";
import { Hono, type Context } from "hono";
import { parseBody } from "./body.js";
import type { ChangeHub } from "./changes.js";
import { limitBody } from "./guard.js";

export interface GitRouteDeps {
  readonly options: {
    readonly root: string;
    readonly hostname?: (() => string) | undefined;
  };
  readonly workspace: Workspace;
  readonly hub: ChangeHub;
}

/** `GET /api/git`, Sync and Pull: thin calls into content-fs, queued with every other write. */
export const gitRoutes = ({ options, workspace, hub }: GitRouteDeps): Hono => {
  const { root } = options;
  const api = new Hono();

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

  api.get("/", async (c) => c.json(await gitState()));

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

  api.post("/sync", limitBody(), async (c) => {
    const body = await parseBody(c, gitSyncBodySchema);
    if (!body.ok) return body.response;
    return gitOperation(c, () => syncRepository(root, body.value.message));
  });

  api.post("/pull", limitBody(), async (c) => {
    const body = await parseBody(c, emptyBodySchema);
    if (!body.ok) return body.response;
    return gitOperation(c, () => pullRepository(root));
  });

  return api;
};
