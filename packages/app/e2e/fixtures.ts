import { readFileSync } from "node:fs";
import { test as base, expect } from "@playwright/test";
import { webEvents } from "./content.js";
import type { LogFixture } from "./fixture-log.js";

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined)
    throw new Error(
      `${name} is not set: run the scenarios through playwright test`,
    );
  return value;
};

interface Fixtures {
  /** The generated log's facts: the pinned time, the leech, the changed card, what is due. */
  readonly logFixture: LogFixture;
  /** Requests the page sent anywhere but the local server; every test ends with none. */
  readonly foreignRequests: string[];
  /** Errors the page logged, a broken content policy included; every test ends with none. */
  readonly consoleErrors: string[];
}

/**
 * Every scenario runs against the server of this run, with the browser clock pinned to the fixture's now,
 * and fails if the page reached for anything but 127.0.0.1 or logged an error.
 */
export const test = base.extend<Fixtures>({
  baseURL: async ({}, use) => {
    await use(required("E2E_BASE_URL"));
  },
  logFixture: async ({}, use) => {
    await use(
      JSON.parse(readFileSync(required("E2E_FIXTURE"), "utf8")) as LogFixture,
    );
  },
  foreignRequests: [
    async ({ page }, use) => {
      const origin = new URL(required("E2E_BASE_URL")).origin;
      const foreign: string[] = [];
      page.on("request", (request) => {
        const url = request.url();
        if (url.startsWith("data:") || url.startsWith("blob:")) return;
        if (new URL(url).origin !== origin) foreign.push(url);
      });
      await use(foreign);
      expect(foreign, "requests outside 127.0.0.1").toEqual([]);
    },
    { auto: true },
  ],
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      expect(errors, "errors in the console").toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page, logFixture }, use) => {
    // Scenarios share one log: each starts a second after the last event an earlier one wrote, or a
    // replay at the fixture's own moment would see those events as still to come and leave them out.
    const latest = Math.max(
      Date.parse(logFixture.now),
      ...(await webEvents()).map((event) => Date.parse(event.ts) + 1_000),
    );
    await page.clock.install({ time: new Date(latest) });
    await use(page);
  },
});

export { expect };
