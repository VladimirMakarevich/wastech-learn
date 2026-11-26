import {
  formatMessage,
  type MessageKey,
  type MessageParams,
  type UiLanguage,
} from "@wastech-learn/core";

/** Exit codes shared with wastech-mdlint, so CI scripts treat both tools alike. */
export const EXIT = { clean: 0, findings: 1, failure: 2 } as const;
export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

/** The process surface a command may touch; tests pass their own to run commands in-process. */
export interface CliIo {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
  readonly cwd: string;
  /** The clock is read here, in the host, and handed to the pure packages as a value. */
  readonly now: () => Date;
}

export interface CommandContext {
  readonly io: CliIo;
  readonly lang: UiLanguage;
  /** Absolute path of the content repository. */
  readonly root: string;
  readonly values: Readonly<Record<string, string | boolean | undefined>>;
  readonly t: (key: MessageKey, params?: MessageParams) => string;
}

export const translator =
  (lang: UiLanguage) =>
  (key: MessageKey, params: MessageParams = {}): string =>
    formatMessage(lang, key, params);

/**
 * A command line the CLI cannot act on. It carries a catalog key, so the message reaches the user in
 * their language like every other.
 */
export class UsageError extends Error {
  readonly key: MessageKey;
  readonly params: MessageParams;

  constructor(key: MessageKey, params: MessageParams = {}) {
    super(key);
    this.name = "UsageError";
    this.key = key;
    this.params = params;
  }
}
