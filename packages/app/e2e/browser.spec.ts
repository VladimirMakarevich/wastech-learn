import type { Page } from "@playwright/test";
import { nodeQueue, webEvents } from "./content.js";
import { expect, test } from "./fixtures.js";

const rows = (page: Page) => page.locator("table.list tbody tr[data-item]");

const openBrowser = async (page: Page, query = ""): Promise<void> => {
  await page.goto(`/browser${query}`);
  await expect(rows(page).first()).toBeVisible();
};

test.describe("card browser", () => {
  test("shows the columns and finds a card by the words of its question, Polish without diacritics, offline", async ({
    page,
  }) => {
    await openBrowser(page);
    const headers = page.locator("table.list thead th");
    await expect(headers).toHaveCount(7);
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/")) apiCalls.push(request.url());
    });
    const search = page.locator("[data-browser-search]");
    await search.fill("subscriber ask more items");
    await expect(rows(page).first()).toHaveAttribute(
      "data-item",
      "10dkrwp7:main",
    );
    // "śledzia" typed the way a keyboard without Polish letters does.
    await search.fill("sledzia");
    await expect(rows(page).first()).toHaveAttribute("data-item", /^mmwv3t5h:/);
    expect(apiCalls).toEqual([]);
  });

  test("the leech filter shows only the leech; every other filter narrows the list", async ({
    page,
    logFixture,
  }) => {
    await openBrowser(page);
    const all = await rows(page).count();
    await page.locator('[data-filter="leech"]').check();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toHaveAttribute(
      "data-item",
      logFixture.leech,
    );
    await page.locator('[data-filter="leech"]').uncheck();
    await expect(rows(page)).toHaveCount(all);
    for (const filter of ["topic", "tag", "type"]) {
      const select = page.locator(`[data-filter="${filter}"]`);
      const value = await select.locator("option").nth(1).getAttribute("value");
      await select.selectOption(value ?? "");
      await expect.poll(() => rows(page).count()).toBeLessThan(all);
      expect(await rows(page).count()).toBeGreaterThan(0);
      await select.selectOption("");
      await expect(rows(page)).toHaveCount(all);
    }
    await page.locator("main .segmented button").nth(1).click();
    await expect.poll(() => rows(page).count()).toBeLessThan(all);
  });

  test("brings a suspended card back to review from its panel", async ({
    page,
  }) => {
    await page.goto("/review?mode=all");
    const card = page.locator("article.review-card");
    await expect(card).toBeVisible();
    const item = (await card.getAttribute("data-item")) ?? "";
    await page.keyboard.press("!");
    await expect(card).not.toHaveAttribute("data-item", item);
    await expect
      .poll(async () =>
        (await webEvents()).some(
          (event) => event.kind === "suspend" && event.item === item,
        ),
      )
      .toBe(true);
    await openBrowser(page, `?items=${item}`);
    await page.locator('[data-filter="status"]').selectOption("suspended");
    await expect(rows(page)).toHaveCount(1);
    await rows(page).first().locator("button.row-open").click();
    const back = page.locator("aside.drawer [data-unsuspend]");
    await back.click();
    await expect
      .poll(async () => (await webEvents()).at(-1))
      .toMatchObject({ kind: "unsuspend", item });
    await expect(rows(page)).toHaveCount(0);
    const now = await page.evaluate(() => Date.now());
    expect((await nodeQueue(now)).entries.map((entry) => entry.item)).toContain(
      item,
    );
  });

  test("opens the cards a session summary links to", async ({ page }) => {
    await openBrowser(page, "?items=10dkrwp7:main,0d1gjcys:main");
    await expect(rows(page)).toHaveCount(2);
  });
});
