import { defineConfig } from "vitest/config";

export default defineConfig({
  // Workspace packages import each other's TypeScript sources, the same export condition tsc and the editor
  // use, so `npm test` never runs against a stale dist/.
  resolve: { conditions: ["@wastech-learn/source"] },
  ssr: { resolve: { conditions: ["@wastech-learn/source"] } },
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    // Code that reads the machine's zone is a bug; a zone with DST and a half-hour offset makes such a bug
    // fail loudly instead of passing by luck on a UTC runner.
    env: { TZ: "Australia/Adelaide" },
  },
});
