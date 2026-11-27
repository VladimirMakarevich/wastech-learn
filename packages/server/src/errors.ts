/** Failures of the server host that the CLI turns into a message and exit code 2. */
export type ServerErrorCode = "port-in-use";

export class ServerError extends Error {
  readonly code: ServerErrorCode;
  readonly port: number;

  constructor(
    code: ServerErrorCode,
    message: string,
    port: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ServerError";
    this.code = code;
    this.port = port;
  }
}

export const isServerError = (error: unknown): error is ServerError =>
  error instanceof ServerError;
