import { parse, type ParseError } from "jsonc-parser";
import { z } from "zod";
import { LearnError } from "../../errors.js";
import type { Finding } from "../../finding.js";

const ruleEntrySchema = z.looseObject({
  rule: z.string(),
  id: z.string().optional(),
  severity: z.string().optional(),
  options: z.unknown().optional(),
});
const mdlintConfigSchema = z.looseObject({ rules: z.array(ruleEntrySchema) });
type RuleEntry = z.infer<typeof ruleEntrySchema>;

/** Parses a wastech-mdlint config (JSONC); `undefined` when it is not one. */
export const parseMdlintRules = (
  text: string,
): readonly RuleEntry[] | undefined => {
  const errors: ParseError[] = [];
  const value: unknown = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) return undefined;
  const parsed = mdlintConfigSchema.safeParse(value);
  return parsed.success ? parsed.data.rules : undefined;
};

const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, nested: unknown) =>
    typeof nested === "object" && nested !== null && !Array.isArray(nested)
      ? Object.fromEntries(
          Object.entries(nested).sort(([a], [b]) => a.localeCompare(b, "en")),
        )
      : nested,
  );

/**
 * A rule is the same when its key (the built-in rule, or the id of a custom one), its severity and its
 * options are; the description is prose and may be translated in the copy.
 */
const identity = (entry: RuleEntry): string =>
  canonical({
    key: entry.rule === "custom" ? `custom:${entry.id ?? ""}` : entry.rule,
    severity: entry.severity ?? null,
    options: entry.options ?? null,
  });

export const PRESET_COPY_FILE = "wastech-mdlint.config.json";

/**
 * mdlint has no `extends`, so the content repository keeps a copy of the preset that ships with the CLI.
 * Every preset rule must be in the copy with the same options; the copy may add rules of its own. A
 * dropped or loosened rule is a warning: the first validation tier silently stopped checking something.
 */
export const checkPresetDrift = (
  presetText: string,
  copyText: string | undefined,
): readonly Finding[] => {
  const preset = parseMdlintRules(presetText);
  if (preset === undefined) {
    throw new LearnError(
      "config-invalid",
      "The canonical mdlint preset is not a valid config",
      {
        file: "preset/content.mdlint.jsonc",
      },
    );
  }
  const copy = copyText === undefined ? undefined : parseMdlintRules(copyText);
  if (copy === undefined) {
    return [
      {
        ruleId: "preset-invalid",
        severity: "warning",
        file: PRESET_COPY_FILE,
        params: {},
      },
    ];
  }
  const inCopy = new Set(copy.map(identity));
  const findings: Finding[] = [];
  preset.forEach((entry, index) => {
    if (inCopy.has(identity(entry))) return;
    findings.push({
      ruleId: "preset-drift",
      severity: "warning",
      file: PRESET_COPY_FILE,
      params: {
        rule: entry.rule === "custom" ? (entry.id ?? "custom") : entry.rule,
        position: index + 1,
      },
    });
  });
  return findings;
};
