import {
  deleteCard,
  restoreCard,
  setCardStatus,
  setTopicStatus,
  type WriteOutcomeOf,
  type Workspace,
} from "@wastech-learn/content-fs";
import {
  CONTENT_WRITE_FAILURE_CODES,
  cardIdParamSchema,
  cardStatusBodySchema,
  emptyBodySchema,
  isLearnError,
  kebabParamSchema,
  topicStatusBodySchema,
} from "@wastech-learn/core";
import { Hono, type Context } from "hono";
import { parseBody } from "./body.js";
import type { ChangeHub } from "./changes.js";
import { limitBody } from "./guard.js";

export interface ContentRouteDeps {
  readonly workspace: Workspace;
  readonly hub: ChangeHub;
}

/**
 * Archiving, returning and deleting a card, and archiving a topic, from the app: the same validated
 * writes the MCP tools use, queued with git. The watcher sees the files change and rebuilds the bundle.
 */
export const contentRoutes = ({ workspace, hub }: ContentRouteDeps): Hono => {
  const api = new Hono();

  // A content write from the app takes the same queue as git, and answers in the app's terms: written,
  // blocked with the findings that stopped it, or the code of the reason nothing was tried.
  const contentWrite = async (
    c: Context,
    write: () => Promise<WriteOutcomeOf<unknown>>,
  ): Promise<Response> => {
    try {
      const outcome = await workspace.exclusive(write);
      if (outcome.status !== "written")
        return c.json(
          {
            status: "blocked",
            findings: outcome.report.findings,
            lint: outcome.report.lint,
          },
          409,
        );
      hub.publish({ type: "git-changed" });
      return c.json({ status: "written" });
    } catch (error) {
      if (
        isLearnError(error) &&
        CONTENT_WRITE_FAILURE_CODES.some((code) => code === error.code)
      )
        // A card or topic that is not there is a missing resource, as a malformed id in the URL is; the
        // other codes mean the request was fine but the repository's state stopped it.
        return c.json(
          { code: error.code },
          error.code === "card-not-found" || error.code === "topic-not-found"
            ? 404
            : 409,
        );
      throw error;
    }
  };

  const cardIdOf = (c: Context): string | undefined => {
    const parsed = cardIdParamSchema.safeParse(c.req.param("id"));
    return parsed.success ? parsed.data : undefined;
  };

  api.post("/cards/:id/status", limitBody(), async (c) => {
    const id = cardIdOf(c);
    if (id === undefined) return c.json({ code: "card-not-found" }, 404);
    const body = await parseBody(c, cardStatusBodySchema);
    if (!body.ok) return body.response;
    return contentWrite(c, () =>
      setCardStatus(workspace, id, body.value.status),
    );
  });

  api.delete("/cards/:id", limitBody(), async (c) => {
    const id = cardIdOf(c);
    if (id === undefined) return c.json({ code: "card-not-found" }, 404);
    const body = await parseBody(c, emptyBodySchema);
    if (!body.ok) return body.response;
    return contentWrite(c, () => deleteCard(workspace, id));
  });

  api.post("/cards/:id/restore", limitBody(), async (c) => {
    const id = cardIdOf(c);
    if (id === undefined) return c.json({ code: "card-not-found" }, 404);
    const body = await parseBody(c, emptyBodySchema);
    if (!body.ok) return body.response;
    return contentWrite(c, () => restoreCard(workspace, id));
  });

  api.post("/topics/:domain/:topic/status", limitBody(), async (c) => {
    const domain = kebabParamSchema.safeParse(c.req.param("domain"));
    const topic = kebabParamSchema.safeParse(c.req.param("topic"));
    if (!domain.success || !topic.success)
      return c.json({ code: "topic-not-found" }, 404);
    const body = await parseBody(c, topicStatusBodySchema);
    if (!body.ok) return body.response;
    return contentWrite(c, () =>
      setTopicStatus(
        workspace,
        `${domain.data}/${topic.data}`,
        body.value.status,
      ),
    );
  });

  return api;
};
