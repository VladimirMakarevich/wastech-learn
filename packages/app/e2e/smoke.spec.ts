import { expect, test } from "./fixtures.js";

test("the app opens from the local server and reaches nothing else", async ({
  page,
  logFixture,
}) => {
  await page.goto("/");
  await expect(page.locator("wl-root main[data-screen=home]")).toBeAttached();
  const status = await page.request.get("/api/status");
  expect(status.ok()).toBe(true);
  expect(logFixture.due.length).toBeGreaterThanOrEqual(20);
});

test("a deep link lands in the app, not on a 404", async ({ page }) => {
  await page.goto("/topic/architecture/backpressure");
  await expect(page.locator("wl-root main[data-screen=topic]")).toBeAttached();
});
