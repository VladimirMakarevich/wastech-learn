import { parseAppBody } from "@wastech-learn/core";
import type { Context } from "hono";

export type Refusal = { readonly code: string } & Readonly<
  Record<string, unknown>
>;

/** A request the app would never send: answered with its code, never with a stack trace. */
export const refusal = (c: Context, body: Refusal): Response =>
  c.json(body, 400);

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
