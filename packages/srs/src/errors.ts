/** Stable codes of the failures srs can raise; a host maps them like core's error codes. */
export type SrsErrorCode = "scheduler-unsupported";

/** The single error type of srs, which cannot share core's because the two never import each other. */
export class SrsError extends Error {
  readonly code: SrsErrorCode;

  constructor(code: SrsErrorCode, message: string) {
    super(message);
    this.name = "SrsError";
    this.code = code;
  }
}

export const isSrsError = (error: unknown): error is SrsError =>
  error instanceof SrsError;
