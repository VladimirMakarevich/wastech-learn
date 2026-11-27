import type { Page } from "@playwright/test";
import { nodeQueue } from "./content.js";
import { expect, test } from "./fixtures.js";

const DAY = 86_400_000;
const today = (page: Page) => page.locator("section.today");

test.describe("home", () => {
  test("shows the day's queue and its minutes exactly as srs builds them", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(today(page)).toBeVisible();
    const now = await page.evaluate(() => Date.now());
    const queue = await nodeQueue(now);
    await expect(today(page)).toHaveAttribute(
      "data-cards",
      String(queue.entries.length),
    );
    await expect(today(page)).toHaveAttribute(
      "data-minutes",
      String(queue.estimateMinutes),
    );
    const fresh = new Map<string, number>();
    for (const entry of queue.entries)
      if (entry.kind === "new")
        fresh.set(entry.domain, (fresh.get(entry.domain) ?? 0) + 1);
    for (const [domain, count] of fresh)
      await expect(today(page).locator(".today-sub")).toContainText(
        `${domain} ${String(count)}`,
      );
    await expect(page.locator(".forecast .bar")).toHaveCount(7);
  });

  test("after fourteen days away, greets with a plan and no word about what was missed", async ({
    page,
  }) => {
    const now = await page.evaluate(() => Date.now());
    await page.clock.setSystemTime(new Date(now + 14 * DAY));
    await page.goto("/");
    const plan = today(page).locator("[data-plan]");
    await expect(plan).toBeVisible();
    const text = (await today(page).textContent()) ?? "";
    for (const word of [
      /пропуст/i,
      /missed/i,
      /streak/i,
      /серия/i,
      /долг/i,
      /overdue/i,
    ])
      expect(text).not.toMatch(word);
  });

  test("the short session takes no new cards", async ({ page }) => {
    await page.goto("/");
    await expect(today(page)).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/review\?mode=5$/);
    const card = page.locator("article.review-card");
    await expect(card).toBeVisible();
    for (let step = 0; step < 40 && (await card.count()) > 0; step++) {
      await expect(card).not.toHaveAttribute("data-phase", "new");
      const before = await card.getAttribute("data-item");
      await page.keyboard.press("b");
      await expect
        .poll(async () =>
          (await card.count()) === 0 ? "gone" : card.getAttribute("data-item"),
        )
        .not.toBe(before);
    }
  });

  test("the summary counts the session, lists what was forgotten while sure, and offers five more minutes", async ({
    page,
  }) => {
    await page.goto("/review?mode=all");
    const card = page.locator("article.review-card");
    await expect(card).toBeVisible();
    const missed = await card.getAttribute("data-item");
    await page.keyboard.press("3");
    await page.keyboard.press("Space");
    await page.keyboard.press("1");
    await expect(card).not.toHaveAttribute("data-item", missed ?? "");
    for (let step = 0; step < 2; step++) {
      const before = await card.getAttribute("data-item");
      await page.keyboard.press("Space");
      await page.keyboard.press("3");
      await expect(card).not.toHaveAttribute("data-item", before ?? "");
    }
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/session-end$/);
    await expect(page.locator("[data-reviewed]")).toHaveAttribute(
      "data-count",
      "3",
    );
    const misses = page.locator(".end .glist a.g-action");
    await expect(misses).toHaveCount(1);
    // Angular leaves the colon of a review item unencoded in a query string; both forms are the same link.
    const href = (await misses.getAttribute("href")) ?? "";
    expect(decodeURIComponent(href)).toBe(`/browser?items=${missed ?? ""}`);
    await expect(page.locator(".end .row a").last()).toHaveAttribute(
      "href",
      "/review?mode=5",
    );
    const text = (await page.locator(".end").textContent()) ?? "";
    for (const word of [/streak/i, /серия/i, /стрик/i])
      expect(text).not.toMatch(word);
  });
});
