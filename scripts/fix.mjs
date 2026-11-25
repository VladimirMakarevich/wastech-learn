// `npm run fix`: every autofixer runs, even when an earlier one leaves findings it cannot fix, so one
// unfixable ESLint error never blocks the formatting fixes. The order matters: ESLint and Stylelint may
// change code, Prettier then formats the result, wastech-mdlint fixes the docs. Exits 1 and names the
// tools whose remaining findings need a human.
import { spawnSync } from "node:child_process";

/** @type {[string, string[]][]} */
const steps = [
  ["eslint", [".", "--fix"]],
  ["stylelint", ["**/*.css", "--fix"]],
  ["prettier", ["--write", ".", "--log-level", "warn"]],
  ["wastech-mdlint", ["lint", ".", "--fix"]],
];

/** @type {string[]} */
const unresolved = [];
for (const [tool, args] of steps) {
  const run = spawnSync("npx", ["--no-install", tool, ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (run.status !== 0) unresolved.push(tool);
}

if (unresolved.length > 0) {
  console.error(
    `\nFixes applied; findings that need a human remain in: ${unresolved.join(", ")}`,
  );
  process.exitCode = 1;
}
