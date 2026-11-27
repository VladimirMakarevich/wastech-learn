import {
  readSource,
  saveSource,
  type Workspace,
} from "@wastech-learn/content-fs";
import {
  isLearnError,
  sourcePathSchema,
  sourceSaveBodySchema,
  type ContentBundle,
} from "@wastech-learn/core";
import { Hono } from "hono";
import { parseBody } from "./body.js";
import { limitBody } from "./guard.js";

export interface SourceRouteDeps {
  readonly workspace: Workspace;
  /** The last bundle that built, after the first build finished. */
  readonly bundle: () => Promise<ContentBundle | undefined>;
  /** Rebuilds the bundle and tells the open tabs, so a save answers only once the screen can show it. */
  readonly refresh: () => Promise<void>;
}

const TOPIC_FILES = ["index.md", "summary.md", "materials.md"] as const;

/**
 * Only files the app shows may be opened: the server is not a file browser, and a path the bundle never
 * named cannot be guessed into a config or the review log.
 */
const namedByBundle = (
  bundle: ContentBundle | undefined,
  path: string,
): boolean =>
  bundle !== undefined &&
  (bundle.cards.some((card) => card.file === path) ||
    bundle.topics.some((topic) =>
      TOPIC_FILES.some((name) => `content/${topic.path}/${name}` === path),
    ));

const NOT_FOUND = { code: "source-not-found" } as const;

/**
 * A topic or card file as text and back: the same validated, transactional write the chat tools use,
 * queued with every other write of the server. The edited text never appears in an error answer or a
 * log; only codes and findings go back.
 */
export const sourceRoutes = ({
  workspace,
  bundle,
  refresh,
}: SourceRouteDeps): Hono => {
  const api = new Hono();

  api.get("/", async (c) => {
    const path = sourcePathSchema.safeParse(c.req.query("path"));
    if (!path.success || !namedByBundle(await bundle(), path.data))
      return c.json(NOT_FOUND, 404);
    try {
      return c.json(await readSource(workspace, path.data));
    } catch (error) {
      if (isLearnError(error) && error.code === "source-not-found")
        return c.json(NOT_FOUND, 404);
      throw error;
    }
  });

  api.put("/", limitBody(), async (c) => {
    const body = await parseBody(c, sourceSaveBodySchema);
    if (!body.ok) return body.response;
    if (!namedByBundle(await bundle(), body.value.path))
      return c.json(NOT_FOUND, 404);
    try {
      const outcome = await workspace.exclusive(async () => {
        const saved = await saveSource(workspace, body.value);
        // Inside the queue: a second save waiting behind this one must find the bundle that has it.
        if (saved.status === "written") await refresh();
        return saved;
      });
      switch (outcome.status) {
        case "decision-needed":
          return c.json(
            {
              code: "decision-needed",
              largeEdit: outcome.decision.largeEdit,
              removedVariants: outcome.decision.removedVariants,
            },
            409,
          );
        case "blocked":
          return c.json(
            {
              status: "blocked",
              findings: outcome.report.findings,
              lint: outcome.report.lint,
            },
            422,
          );
        case "written":
        case "unchanged":
          return c.json({
            status: outcome.status,
            paths: outcome.paths,
            ...(outcome.card === undefined ? {} : { card: outcome.card }),
            findings: outcome.report.findings,
            lint: outcome.report.lint,
          });
      }
    } catch (error) {
      if (isLearnError(error) && error.code === "source-not-found")
        return c.json(NOT_FOUND, 404);
      if (isLearnError(error) && error.code === "content-changed")
        return c.json({ code: "content-changed" }, 409);
      throw error;
    }
  });

  return api;
};
