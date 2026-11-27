import { defineConfig } from "vitest/config";

const BENCHMARKS = "packages/*/test/**/benchmark.test.ts";

export default defineConfig({
  // Workspace packages import each other's TypeScript sources, the same export condition tsc and the editor
  // use, so `npm test` never runs against a stale dist/.
  resolve: { conditions: ["@wastech-learn/source"] },
  ssr: { resolve: { conditions: ["@wastech-learn/source"] } },
  test: {
    // Code that reads the machine's zone is a bug; a zone with DST and a half-hour offset makes such a bug
    // fail loudly instead of passing by luck on a UTC runner.
    // The owner's global git config (signing, hooks, a default branch name) must not decide whether a
    // test of the git code passes; tests read only the temp repository's own config.
    env: {
      TZ: "Australia/Adelaide",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["packages/*/test/**/*.test.ts"],
          exclude: [BENCHMARKS],
          sequence: { groupOrder: 0 },
        },
      },
      {
        // Timing budgets measured while every other test file runs on the other cores measure the machine,
        // not the code: the benchmarks run after the unit tests, one file at a time.
        extends: true,
        test: {
          name: "benchmark",
          include: [BENCHMARKS],
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
