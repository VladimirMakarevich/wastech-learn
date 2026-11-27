import {
  ConfigError,
  buildContextGraph,
  createScopeTester,
  lintContext,
  loadConfiguration,
  loadContext,
  parseDocument,
  replaceDocuments,
  type ConfiguredRule,
  type LintConfig,
  type LintMessage,
  type ParsedDocument,
  type ResolvedSettings,
  type ScopeTester,
} from "@wastech-mdlint/core";
import {
  LearnError,
  checkContent,
  type ContentFiles,
  type Finding,
} from "@wastech-learn/core";
import { readGitBaseline } from "./git-baseline.js";
import { readCanonicalPreset } from "./preset.js";
import { MDLINT_CONFIG_FILE } from "./repo.js";
import type { Workspace } from "./workspace.js";

/** A finding of the first validation tier, wastech-mdlint, in its own words. */
export interface LintFinding {
  readonly file: string;
  readonly line: number;
  readonly ruleId: string;
  readonly severity: "error" | "warning";
  readonly message: string;
}

/** Both validation tiers over the files a call touches. */
export interface ValidationReport {
  readonly findings: readonly Finding[];
  readonly lint: readonly LintFinding[];
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface OverlayOptions {
  /** Files the caller asks about beyond the overlay, such as paths given to `validate`. */
  readonly touched?: readonly string[];
  /**
   * Files the write changes only on the side, such as a topic's `index.md` that gains card links: their
   * findings count only when the write causes them, so an old problem there does not block the write.
   */
  readonly incidental?: readonly string[];
  /**
   * The repository as it was before an edit that is already on disk, as path → text (`null`: the file
   * did not exist). Without it, the baseline is the repository on disk.
   */
  readonly before?: ReadonlyMap<string, string | null>;
}

interface LintBase {
  readonly config: LintConfig;
  readonly rules: readonly ConfiguredRule[];
  readonly settings: ResolvedSettings;
  readonly scope: ScopeTester;
  readonly documents: Map<string, ParsedDocument>;
}

interface Tiers {
  readonly findings: readonly Finding[];
  readonly lint: readonly LintFinding[];
}

const toLintFinding = (message: LintMessage): LintFinding => ({
  file: message.filePath,
  line: message.line,
  ruleId: message.ruleId,
  severity: message.severity,
  message: message.message,
});

const loadLintBase = async (root: string): Promise<LintBase> => {
  try {
    const { config, rules, settings } = await loadConfiguration({ cwd: root });
    const { documents } = await loadContext({ cwd: root, config, settings });
    return {
      config,
      rules,
      settings,
      scope: createScopeTester({ cwd: root, config }),
      documents,
    };
  } catch (error) {
    if (error instanceof ConfigError) {
      throw new LearnError(
        "config-invalid",
        `${MDLINT_CONFIG_FILE} is invalid`,
        { file: MDLINT_CONFIG_FILE },
        { cause: error },
      );
    }
    throw error;
  }
};

/**
 * Lints the repository as it would be with `overlay` written: the overlaid Markdown files replace their
 * parsed documents and the link graph is rebuilt over the result, so a new card linked from an index
 * written in the same call, or an anchor in a summary written with it, resolves exactly as it will on
 * disk. Linting one file on its own could not see either. A `null` text removes the document.
 */
const lintWithOverlay = (
  root: string,
  base: LintBase,
  overlay: ReadonlyMap<string, string | null>,
): LintFinding[] => {
  const swaps = [...overlay]
    .filter(([path]) => path.endsWith(".md") && base.scope.includes(path))
    .map(([path, content]) =>
      content === null
        ? { remove: path }
        : { remove: path, add: parseDocument({ path, content }) },
    );
  const documents = replaceDocuments(base.documents, swaps);
  const { siteRouter, idRef } = base.settings;
  const graph = buildContextGraph(documents, {
    ...(siteRouter === undefined ? {} : { siteRouter }),
    ...(idRef === undefined ? {} : { idRef }),
  });
  return lintContext({
    cwd: root,
    context: { documents, graph },
    rules: base.rules,
    settings: base.settings,
  }).messages.map(toLintFinding);
};

const withOverlay = (
  files: ContentFiles,
  overlay: ReadonlyMap<string, string | null>,
): Map<string, string> => {
  const result = new Map(files);
  for (const [path, text] of overlay) {
    if (text === null) result.delete(path);
    else result.set(path, text);
  }
  return result;
};

const findingKey = (finding: Finding): string =>
  `${finding.file}|${finding.ruleId}|${JSON.stringify(finding.params)}`;

const lintKey = (finding: LintFinding): string =>
  `${finding.file}|${finding.ruleId}|${finding.message}`;

/**
 * Runs mdlint and `check` over the repository with `overlay` laid on top, and reports what the caller
 * must know before writing: every finding in the files it writes or names, and any error the change
 * causes elsewhere (a duplicate id, an anchor that no longer resolves). An error that was already there
 * before the change is left out unless it is in a file the caller writes or names, so one broken file in
 * the repository does not block every later write.
 */
export const validateOverlay = async (
  workspace: Workspace,
  overlay: ReadonlyMap<string, string | null>,
  options: OverlayOptions = {},
): Promise<ValidationReport> => {
  const snapshot = await workspace.snapshot();
  const [base, preset, git] = await Promise.all([
    workspace.derived("lint-base", () => loadLintBase(workspace.root)),
    readCanonicalPreset(),
    // Read for every call, not cached: a commit changes HEAD without touching any content file.
    readGitBaseline(workspace.root),
  ]);
  // The large-edit warning compares a changed card with its committed text; a file clean on disk is
  // its committed text, and git lists only files that already differ.
  const gitBaseline = new Map(git);
  for (const path of overlay.keys()) {
    const current = snapshot.files.get(path);
    if (!gitBaseline.has(path) && current !== undefined) {
      gitBaseline.set(path, current);
    }
  }
  const tiers = async (
    layer: ReadonlyMap<string, string | null>,
  ): Promise<Tiers> => ({
    findings: (
      await checkContent({
        files: withOverlay(snapshot.files, layer),
        preset,
        baseline: gitBaseline,
      })
    ).findings,
    lint: lintWithOverlay(workspace.root, base, layer),
  });
  const baseline =
    options.before === undefined
      ? await workspace.derived("validation-baseline", () => tiers(new Map()))
      : await tiers(options.before);
  const after = await tiers(overlay);
  const incidental = new Set(options.incidental ?? []);
  const own = new Set(
    [...overlay.keys(), ...(options.touched ?? [])].filter(
      (path) => !incidental.has(path),
    ),
  );
  const knownFindings = new Set(baseline.findings.map(findingKey));
  const knownLint = new Set(baseline.lint.map(lintKey));
  const reported = (file: string, severity: string, known: boolean): boolean =>
    own.has(file) || ((severity === "error" || incidental.has(file)) && !known);
  const findings = after.findings.filter((finding) =>
    reported(
      finding.file,
      finding.severity,
      knownFindings.has(findingKey(finding)),
    ),
  );
  const lint = after.lint.filter((finding) =>
    reported(finding.file, finding.severity, knownLint.has(lintKey(finding))),
  );
  const errorCount = [...findings, ...lint].filter(
    (finding) => finding.severity === "error",
  ).length;
  return {
    findings,
    lint,
    errorCount,
    warningCount: findings.length + lint.length - errorCount,
  };
};
