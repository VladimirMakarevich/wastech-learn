import { parseArgs } from "node:util";
import { UI_LANGUAGES, type UiLanguage } from "@wastech-learn/core";
import { UsageError } from "./context.js";

type OptionSpec = Readonly<
  Record<string, { readonly type: "string" | "boolean" }>
>;

const COMMON: OptionSpec = {
  content: { type: "string" },
  lang: { type: "string" },
  help: { type: "boolean" },
};

/** Options each command accepts besides the common ones; anything else is a usage error. */
export const COMMAND_OPTIONS = {
  check: {},
  build: { out: { type: "string" }, "built-at": { type: "string" } },
  render: { check: { type: "boolean" } },
  simulate: {
    "break-days": { type: "string" },
    "session-minutes": { type: "string" },
    cards: { type: "string" },
    "warmup-days": { type: "string" },
    seed: { type: "string" },
    runs: { type: "string" },
  },
  "new-id": { count: { type: "string" } },
  hook: {},
  serve: { port: { type: "string" }, "no-open": { type: "boolean" } },
} as const satisfies Readonly<Record<string, OptionSpec>>;

/** Subcommands a command accepts as its words; a command not listed here takes none. */
const COMMAND_POSITIONALS: Partial<Record<CommandName, readonly string[]>> = {
  hook: ["post-tool-use"],
};

export type CommandName = keyof typeof COMMAND_OPTIONS;

export type ParsedCommandLine =
  | { readonly kind: "help"; readonly lang: UiLanguage | undefined }
  | {
      readonly kind: "command";
      readonly command: CommandName;
      readonly lang: UiLanguage | undefined;
      readonly values: Readonly<Record<string, string | boolean | undefined>>;
      readonly positionals: readonly string[];
    };

const isCommand = (name: string): name is CommandName =>
  name in COMMAND_OPTIONS;

const quoted = (message: string): string =>
  /'([^']+)'/.exec(message)?.[1] ?? message;

const parseLang = (
  value: string | boolean | undefined,
): UiLanguage | undefined => {
  if (value === undefined) return undefined;
  const lang = UI_LANGUAGES.find((candidate) => candidate === value);
  if (lang === undefined)
    throw new UsageError("cli.error.bad-value", {
      option: "--lang",
      value: String(value),
    });
  return lang;
};

/** Splits `wastech-learn <command> [options]` and validates options against that command. */
export const parseCommandLine = (
  argv: readonly string[],
): ParsedCommandLine => {
  // Common options may come before the command (`--lang ru check`); the command is the first token that
  // is neither an option nor the value of a common option that takes one.
  let index = 0;
  while (argv[index]?.startsWith("-") === true) {
    const name = argv[index]?.slice(2) ?? "";
    index += COMMON[name]?.type === "string" ? 2 : 1;
  }
  const first = argv[index];
  if (first === undefined) {
    if (argv.includes("--help") || argv.includes("-h")) {
      return { kind: "help", lang: undefined };
    }
    throw new UsageError("cli.error.missing-command");
  }
  if (!isCommand(first))
    throw new UsageError("cli.error.unknown-command", { command: first });
  let values: Record<string, string | boolean | undefined>;
  let positionals: string[];
  const allowed = COMMAND_POSITIONALS[first];
  try {
    ({ values, positionals } = parseArgs({
      args: [...argv.slice(0, index), ...argv.slice(index + 1)],
      options: { ...COMMON, ...COMMAND_OPTIONS[first] },
      strict: true,
      allowPositionals: allowed !== undefined,
    }));
  } catch (error) {
    const code =
      error instanceof Error && "code" in error ? error.code : undefined;
    const detail = error instanceof Error ? quoted(error.message) : "";
    if (code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
      throw new UsageError("cli.error.unknown-option", { option: detail });
    }
    if (code === "ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL") {
      throw new UsageError("cli.error.unknown-command", { command: detail });
    }
    throw new UsageError("cli.error.bad-value", { option: detail, value: "" });
  }
  const lang = parseLang(values.lang);
  if (values.help === true) return { kind: "help", lang };
  if (allowed !== undefined) {
    if (positionals.length !== 1 || !allowed.includes(positionals[0] ?? "")) {
      throw new UsageError("cli.error.unknown-command", {
        command: [first, ...positionals].join(" "),
      });
    }
  }
  return { kind: "command", command: first, lang, values, positionals };
};

/** Reads a whole positive number option, or the default when it is absent. */
export const positiveInt = (
  values: Readonly<Record<string, string | boolean | undefined>>,
  name: string,
  fallback: number,
): number => {
  const raw = values[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (typeof raw !== "string" || !/^\d+$/.test(raw) || value <= 0) {
    throw new UsageError("cli.error.bad-value", {
      option: `--${name}`,
      value: String(raw),
    });
  }
  return value;
};
