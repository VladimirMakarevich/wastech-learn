/**
 * Stable codes of the operational failures a host maps to its own surface: the CLI turns every one into
 * exit code 2, an MCP server into `{ code, message, hint }`. A code never changes meaning once shipped,
 * so hosts and tests match on it instead of on the message.
 */
export type LearnErrorCode =
  | "config-invalid"
  | "event-invalid"
  | "repository-not-found"
  | "io-failed"
  | "render-failed";

/** Where an error points: a repository-relative file and, for schema errors, the dotted field path. */
export interface LearnErrorDetails {
  readonly file?: string;
  readonly field?: string;
}

/**
 * The single error type of the core packages' callers. Findings about content are data, not errors;
 * this is for failures that stop the work, such as an unreadable or invalid configuration.
 */
export class LearnError extends Error {
  readonly code: LearnErrorCode;
  readonly file: string | undefined;
  readonly field: string | undefined;

  constructor(
    code: LearnErrorCode,
    message: string,
    details: LearnErrorDetails = {},
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "LearnError";
    this.code = code;
    this.file = details.file;
    this.field = details.field;
  }
}

export const isLearnError = (error: unknown): error is LearnError =>
  error instanceof LearnError;
