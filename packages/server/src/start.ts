import type { AddressInfo } from "node:net";
import { serve, type ServerType } from "@hono/node-server";
import { ServerError } from "./errors.js";
import { createServer, type ServerOptions } from "./server.js";

/** The only interface the server listens on: nothing of the learner's leaves the machine. */
export const LOOPBACK = "127.0.0.1";

export interface StartOptions extends Omit<ServerOptions, "port"> {
  /** `0` picks a free port, as the tests do. */
  readonly port: number;
}

export interface RunningServer {
  readonly url: string;
  readonly port: number;
  /** Resolves once the first bundle build finished. */
  readonly ready: Promise<void>;
  readonly close: () => Promise<void>;
}

const listen = (server: ServerType, port: number): Promise<number> =>
  new Promise((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException): void => {
      reject(
        error.code === "EADDRINUSE"
          ? new ServerError(
              "port-in-use",
              `Port ${String(port)} is taken`,
              port,
              {
                cause: error,
              },
            )
          : error,
      );
    };
    server.once("error", onError);
    server.once("listening", () => {
      server.off("error", onError);
      resolve((server.address() as AddressInfo).port);
    });
  });

/** Serves the local server on 127.0.0.1 and resolves once it listens. */
export const startServer = async (
  options: StartOptions,
): Promise<RunningServer> => {
  let port: number | undefined;
  const learn = createServer({ ...options, port: () => port });
  const server = serve({
    fetch: learn.app.fetch,
    hostname: LOOPBACK,
    port: options.port,
  });
  try {
    port = await listen(server, options.port);
  } catch (error) {
    learn.close();
    throw error;
  }
  return {
    url: `http://${LOOPBACK}:${String(port)}/`,
    port,
    ready: learn.ready,
    close: () =>
      new Promise<void>((resolve, reject) => {
        learn.close();
        // Open change streams would keep the server waiting for the browser to hang up.
        if ("closeAllConnections" in server) server.closeAllConnections();
        server.close((error) => {
          if (error === undefined) resolve();
          else reject(error);
        });
      }),
  };
};
