import type { RetentionCount } from "@wastech-learn/srs";
import { nodeStats } from "./content.js";
import { expect, test } from "./fixtures.js";

test("statistics match true retention and the 30-day load counted from the log", async ({
  page,
}) => {
  await page.goto("/stats");
  await expect(page.locator("[data-forecast]")).toBeVisible();
  const now = await page.evaluate(() => Date.now());
  const expected = await nodeStats(now);
  const bars = page.locator("[data-forecast] span");
  await expect(bars).toHaveCount(30);
  expect(
    await bars.evaluateAll((spans) =>
      spans.map((span) => Number(span.getAttribute("data-due"))),
    ),
  ).toEqual(expected.forecast);
  const shown = async (row: string, count: RetentionCount): Promise<void> => {
    const cell = page.locator(`[data-retention="${row}"] dd`);
    if (count.total === 0) await expect(cell).not.toContainText("·");
    else await expect(cell).toContainText(`${String(count.passed)} `);
  };
  await shown("young-7", expected.week.young);
  await shown("young-30", expected.month.young);
  await shown("mature-7", expected.week.mature);
  await shown("mature-30", expected.month.mature);
});
