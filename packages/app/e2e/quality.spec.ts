import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { editFile, nodeDue, webEvents } from "./content.js";
import { expect, test } from "./fixtures.js";

const ROUTES = [
  "/",
  "/review?mode=all",
  "/topic/architecture/backpressure",
  "/browser",
  "/stats",
  "/settings",
] as const;

/** Ends a short session, so the summary screen has something to show. */
const sessionSummary = async (page: Page): Promise<void> => {
  await page.goto("/review?mode=all");
  await expect(page.locator("article.review-card")).toBeVisible();
  await page.keyboard.press("Space");
  await page.keyboard.press("3");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/session-end$/);
};

const screenReady = async (page: Page): Promise<void> => {
  await expect(
    page.locator(".screen, wl-review article, wl-review .end").first(),
  ).toBeVisible();
};

test.describe("quality", () => {
  for (const scheme of ["dark", "light"] as const) {
    test(`no serious or critical accessibility violation on any screen, ${scheme} theme`, async ({
      page,
    }) => {
      // Without motion: the tray fades in, and a contrast measured mid-fade is not the contrast on screen.
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      const check = async (where: string): Promise<void> => {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const serious = result.violations
          .filter(
            (violation) =>
              violation.impact === "serious" || violation.impact === "critical",
          )
          .map(
            (violation) =>
              `${where}: ${violation.id} (${String(violation.nodes.length)}) ${violation.nodes[0]?.target.join(" ") ?? ""} ${violation.nodes.map((node) => node.any[0]?.message ?? "").join(" | ")}`,
          );
        expect(serious).toEqual([]);
      };
      for (const route of ROUTES) {
        await page.goto(route);
        await screenReady(page);
        await check(route);
      }
      await page.goto("/review?mode=all");
      await expect(page.locator("article.review-card")).toBeVisible();
      await page.keyboard.press("Space");
      await expect(page.locator(".ratings")).toBeVisible();
      await check("/review answer");
      await sessionSummary(page);
      await check("/session-end");
    });
  }

  test("no horizontal scroll at 360 px on any screen", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const overflow = async (): Promise<number> =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
    for (const route of ROUTES) {
      await page.goto(route);
      await screenReady(page);
      expect(await overflow(), route).toBeLessThanOrEqual(0);
    }
    await sessionSummary(page);
    expect(await overflow(), "/session-end").toBeLessThanOrEqual(0);
  });

  test("reduced motion turns off the reveal animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/review?mode=all");
    await expect(page.locator("article.review-card")).toBeVisible();
    await page.keyboard.press("Space");
    const block = page.locator(".answer-block").first();
    await expect(block).toBeVisible();
    expect(
      await block.evaluate(
        (element) => getComputedStyle(element).animationName,
      ),
    ).toBe("none");
  });

  test("an edit in the files is on screen in under two seconds", async ({
    page,
  }) => {
    await page.goto("/topic/architecture/backpressure");
    const marker = `Edited at ${String(Date.now())}`;
    await expect(page.locator("article.summary")).toBeVisible();
    const started = Date.now();
    const restore = await editFile(
      "content/architecture/backpressure/summary.md",
      (text) =>
        text.replace("## Mental model", `${marker}.\n\n## Mental model`),
    );
    try {
      await expect(page.locator("article.summary")).toContainText(marker, {
        timeout: 5_000,
      });
      const elapsed = Date.now() - started;
      console.log(`edit visible after ${String(elapsed)} ms`);
      expect(elapsed).toBeLessThan(2_000);
    } finally {
      await restore();
    }
  });

  test("due dates after a session equal a replay of the written log in Node", async ({
    page,
  }) => {
    await page.goto("/review?mode=all");
    const card = page.locator("article.review-card");
    await expect(card).toBeVisible();
    const rated: string[] = [];
    for (const key of ["3", "1", "4"]) {
      const item = (await card.getAttribute("data-item")) ?? "";
      rated.push(item);
      await page.keyboard.press("Space");
      await page.keyboard.press(key);
      await expect(card).not.toHaveAttribute("data-item", item);
    }
    const since = rated.length;
    await expect
      .poll(async () =>
        (await webEvents()).slice(-since).map((event) => event.item),
      )
      .toEqual(rated);
    await page.goto(`/browser?items=${rated.join(",")}`);
    const rows = page.locator("table.list tbody tr[data-item]");
    await expect(rows).toHaveCount(new Set(rated).size);
    const now = await page.evaluate(() => Date.now());
    const expected = await nodeDue(now);
    for (const item of new Set(rated))
      await expect(page.locator(`tr[data-item="${item}"]`)).toHaveAttribute(
        "data-due",
        String(expected.get(item)),
      );
  });

  test("replays 50k events over 5k cards in Chromium within five seconds", async ({
    page,
  }) => {
    // The app's own replay path, bundled for the browser from the built packages: core's browser entry,
    // srs and session, exactly what the app runs when it loads a log.
    const { build } = await import("esbuild");
    const dir = await mkdtemp(join(tmpdir(), "wastech-learn-bench-"));
    try {
      const entry = join(dir, "entry.js");
      await writeFile(
        entry,
        'export { createLogState, deckFromBundle, startSession } from "@wastech-learn/session";\nexport { createScheduler, seededRng } from "@wastech-learn/srs";\n',
      );
      const bundled = await build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        format: "iife",
        globalName: "wl",
        platform: "browser",
        nodePaths: [
          fileURLToPath(new URL("../../../node_modules", import.meta.url)),
        ],
        logLevel: "silent",
      });
      await page.setContent("<!doctype html><title>replay</title>");
      await page.addScriptTag({ content: bundled.outputFiles[0]?.text ?? "" });
      const elapsed = await page.evaluate(async () => {
        interface Bench {
          createScheduler: (config: unknown) => Promise<unknown>;
          createLogState: (
            context: unknown,
            events: unknown[],
            now: Date,
          ) => unknown;
          seededRng: (seed: number) => () => number;
        }
        const wl = (window as unknown as { wl: Bench }).wl;
        const config = {
          timezone: "Europe/Warsaw",
          dayStartsAt: "04:00",
          srs: {
            scheduler: "ts-fsrs@6.0.1",
            model: "FSRS-7",
            desiredRetention: 0.9,
            maxIntervalDays: 365,
            learningSteps: ["1m", "10m"],
            relearningSteps: ["10m"],
            allowModelOverride: true,
            graduatingIntervalDays: 1,
            fuzz: true,
            weights: null,
          },
          limits: {
            default: { newPerDay: 10, reviewsPerDay: 150 },
            domains: {},
            sessionMinutes: 15,
            pauseNewWhenBacklogOver: 2,
          },
          leechThreshold: 8,
        };
        const random = wl.seededRng(2026);
        const start = Date.parse("2026-01-01T08:00:00.000Z");
        const day = 86_400_000;
        const events = Array.from({ length: 50_000 }, (_, index) => ({
          v: 1,
          id: `01K${String(index).padStart(23, "0")}`,
          ts: new Date(
            start + Math.floor((index / 50_000) * 360 * day),
          ).toISOString(),
          tz: "Europe/Warsaw",
          device: "desk1",
          writer: "web",
          kind: "review",
          item: `b${String(Math.floor(random() * 5_000)).padStart(7, "0")}:main`,
          rating: 1 + Math.floor(random() * 4),
          sched: "ts-fsrs@6.0.1/FSRS-7",
        }));
        const scheduler = await wl.createScheduler(config);
        const begun = performance.now();
        wl.createLogState(
          { scheduler, config },
          events,
          new Date(start + 365 * day),
        );
        return performance.now() - begun;
      });
      console.log(
        `replay of 50k events in Chromium: ${String(Math.round(elapsed))} ms`,
      );
      expect(elapsed).toBeLessThan(5_000);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
