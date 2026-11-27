// `npm run fix`: every autofixer runs, even when an earlier one leaves findings it cannot fix, so one
// unfixable ESLint error never blocks the formatting fixes. The order matters: typographic dashes become
// hyphens first, ESLint and Stylelint may change code, Prettier then formats the result, wastech-mdlint
// fixes the docs. Exits 1 and names the tools whose remaining findings need a human.
import { spawnSync } from "node:child_process";

// Each step is a label, a command and its arguments. The dash fix runs first, so the formatters and the
// docs linter see the final text.
/** @type {[string, string, string[]][]} */
const steps = [
  ["dashes", process.execPath, ["scripts/check-dashes.mjs", "--fix"]],
  ["eslint", "npx", ["--no-install", "eslint", ".", "--fix"]],
  ["stylelint", "npx", ["--no-install", "stylelint", "**/*.css", "--fix"]],
  [
    "prettier",
    "npx",
    ["--no-install", "prettier", "--write", ".", "--log-level", "warn"],
  ],
  [
    "wastech-mdlint",
    "npx",
    ["--no-install", "wastech-mdlint", "lint", ".", "--fix"],
  ],
];

/** @type {string[]} */
const unresolved = [];
for (const [label, command, args] of steps) {
  const run = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32" && command === "npx",
  });
  if (run.status !== 0) unresolved.push(label);
}

if (unresolved.length > 0) {
  console.error(
    `\nFixes applied; findings that need a human remain in: ${unresolved.join(", ")}`,
  );
  process.exitCode = 1;
}
