// The repository writes the ASCII hyphen-minus wherever a dash is meant: in docs, rules, code, comments
// and UI copy alike. Agents copy the typography they read around them, so a single em or en dash left
// in a file brings more back; this check keeps the tree clean and `--fix` makes it clean again.
//
//   node scripts/check-dashes.mjs          lists every dash in the tracked and new files, exits 1 if any
//   node scripts/check-dashes.mjs --fix    replaces each with "-" in place
//   node scripts/check-dashes.mjs --hook   a Claude Code PostToolUse hook: checks the file just written
//                                          and hands the findings back to the agent with exit code 2
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const DASHES = /[\u2013\u2014]/gu;
const HAS_DASH = /[\u2013\u2014]/u;

/** @param {string} dash */
const nameOf = (dash) =>
  dash === "\u2013" ? "en dash U+2013" : "em dash U+2014";

// Text written elsewhere and installed here (skills and agents of other repositories, their state),
// and the frozen prototype, whose data is generated from the content repository.
const EXCLUDED = [".agents/", ".claude/", ".impeccable/", "prototypes/"];

const root = resolve(import.meta.dirname, "..");

/** @param {string} path */
const isExcluded = (path) => EXCLUDED.some((prefix) => path.startsWith(prefix));

/** @returns {string[]} */
const listFiles = () => {
  const git = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  );
  if (git.status !== 0) throw new Error(`git ls-files failed: ${git.stderr}`);
  return git.stdout
    .split("\0")
    .filter((path) => path !== "" && !isExcluded(path));
};

/**
 * The file's text, or undefined for a binary file or one deleted since git listed it.
 * @param {string} path
 * @returns {string | undefined}
 */
const readText = (path) => {
  let bytes;
  try {
    bytes = readFileSync(resolve(root, path));
  } catch {
    // A file listed by git but removed from the work tree has nothing to check.
    return undefined;
  }
  return bytes.includes(0) ? undefined : bytes.toString("utf8");
};

/**
 * @param {string} path
 * @param {string} text
 * @returns {string[]}
 */
const findingsIn = (path, text) =>
  text
    .split("\n")
    .flatMap((line, index) =>
      [...line.matchAll(DASHES)].map(
        (match) =>
          `${path}:${String(index + 1)}:${String(match.index + 1)}  ${nameOf(match[0])}: use "-"`,
      ),
    );

/**
 * @param {readonly string[]} paths
 * @param {boolean} fix
 * @returns {string[]}
 */
const checkFiles = (paths, fix) => {
  /** @type {string[]} */
  const findings = [];
  for (const path of paths) {
    const text = readText(path);
    if (text === undefined || !HAS_DASH.test(text)) continue;
    if (fix) writeFileSync(resolve(root, path), text.replaceAll(DASHES, "-"));
    else findings.push(...findingsIn(path, text));
  }
  return findings;
};

const readStdin = () => {
  try {
    return readFileSync(0, "utf8");
  } catch {
    // No stdin at all: not run as a hook, so there is no file to check.
    return "";
  }
};

/** @returns {number} */
const runHook = () => {
  /** @type {unknown} */
  let event;
  try {
    event = JSON.parse(readStdin());
  } catch {
    // An event the hook cannot read is not the agent's edit to fix; exit 1 shows it to the person only.
    console.error("check-dashes: no PostToolUse event on stdin");
    return 1;
  }
  const input =
    typeof event === "object" && event !== null && "tool_input" in event
      ? event.tool_input
      : undefined;
  const file =
    typeof input === "object" && input !== null && "file_path" in input
      ? input.file_path
      : undefined;
  if (typeof file !== "string") return 0;
  const path = relative(root, resolve(file)).split(sep).join("/");
  if (path.startsWith("..") || isExcluded(path)) return 0;
  const findings = checkFiles([path], false);
  if (findings.length === 0) return 0;
  console.error(
    [
      `${path} uses typographic dashes; this repository writes the ASCII hyphen-minus "-":`,
      ...findings,
    ].join("\n"),
  );
  return 2;
};

const mode = process.argv[2];
if (mode === "--hook") {
  process.exitCode = runHook();
} else {
  const findings = checkFiles(listFiles(), mode === "--fix");
  if (findings.length > 0) {
    console.error(findings.join("\n"));
    console.error(
      `\n${String(findings.length)} typographic dashes: write "-" instead, or run node scripts/check-dashes.mjs --fix`,
    );
    process.exitCode = 1;
  }
}
