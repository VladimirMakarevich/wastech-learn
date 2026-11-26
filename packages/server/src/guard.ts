import type { Context, MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";

/** Names the browser may use for this server; anything else is another site reaching in. */
const LOOPBACK_NAMES: readonly string[] = ["127.0.0.1", "localhost"];

/** A batch of events is a few KB; a larger body is a mistake or an attack, never a session. */
export const MAX_BODY_BYTES = 256 * 1024;

const refuse = (c: Context, status: 403 | 413 | 415, code: string): Response =>
  c.json({ code }, status);

const hostParts = (
  host: string,
): { readonly name: string; readonly port: number | undefined } => {
  const separator = host.lastIndexOf(":");
  if (separator === -1) return { name: host, port: undefined };
  return {
    name: host.slice(0, separator),
    port: Number(host.slice(separator + 1)),
  };
};

/**
 * Keeps the server to its own pages. There is no login, so the checks do the work: a page of another
 * site that resolves its name to 127.0.0.1 (DNS rebinding) sends its own `Host` and is refused; a form or
 * script of another origin cannot write to the log, because a write needs this server's own `Origin` and a
 * JSON body, which a cross-site form cannot send without a CORS preflight this server never answers.
 */
export const guard =
  (port: () => number | undefined): MiddlewareHandler =>
  async (c, next) => {
    const host = c.req.header("host") ?? "";
    const { name, port: hostPort } = hostParts(host);
    const listening = port();
    if (
      !LOOPBACK_NAMES.includes(name) ||
      (listening !== undefined && hostPort !== listening)
    )
      return refuse(c, 403, "host-not-allowed");
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      if (c.req.header("origin") !== `http://${host}`)
        return refuse(c, 403, "origin-not-allowed");
      const type = c.req.header("content-type") ?? "";
      if (type.split(";")[0]?.trim().toLowerCase() !== "application/json")
        return refuse(c, 415, "unsupported-media-type");
    }
    await next();
    return undefined;
  };

/** Stops reading a body past the limit, also when it arrives without a length. */
export const limitBody = (): MiddlewareHandler =>
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => refuse(c, 413, "body-too-large"),
  });
