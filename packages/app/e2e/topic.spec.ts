import { editFile } from "./content.js";
import { expect, test } from "./fixtures.js";

const SUMMARY = "content/architecture/backpressure/summary.md";

test.describe("topic", () => {
  test("lists all twelve sections in the interface language, with the diagram and highlighted code", async ({
    page,
  }) => {
    await page.goto("/topic/architecture/backpressure");
    const toc = page.locator("nav.toc a");
    await expect(toc).toHaveCount(12);
    const article = page.locator("article.summary");
    await expect(article.locator("svg").first()).toBeVisible();
    await expect(article.locator("pre.shiki").first()).toBeVisible();
    await page.getByRole("button", { name: "EN" }).click();
    await expect(toc.first()).toHaveText("TL;DR");
    await page.getByRole("button", { name: "RU" }).click();
    await expect(toc.first()).toHaveText("Коротко");
    await expect(page.locator("article.summary h2").first()).toHaveText(
      "Коротко",
    );
  });

  test("opens the self-check one question at a time", async ({ page }) => {
    await page.goto("/topic/architecture/backpressure");
    const questions = page.locator(".self-check li");
    await expect(questions).toHaveCount(3);
    await expect(page.locator(".self-check li:visible")).toHaveCount(0);
    const next = page.locator("article.summary button.btn");
    await next.click();
    await expect(page.locator(".self-check li:visible")).toHaveCount(1);
    await next.click();
    await expect(page.locator(".self-check li:visible")).toHaveCount(2);
    await next.click();
    await expect(page.locator(".self-check li:visible")).toHaveCount(3);
    await expect(next).toHaveCount(0);
  });

  test("renders formulas with KaTeX from local files", async ({ page }) => {
    // The golden sample has no formula; the run's own copy gets one, and the server rebuilds the bundle.
    const restore = await editFile(SUMMARY, (text) =>
      text.replace(
        "## Mental model",
        "Little's law: $L = \\lambda W$.\n\n## Mental model",
      ),
    );
    try {
      await expect
        .poll(async () =>
          (await (await page.request.get("/api/bundle")).text()).includes(
            "katex",
          ),
        )
        .toBe(true);
      await page.goto("/topic/architecture/backpressure");
      await expect(
        page.locator("article.summary .katex").first(),
      ).toBeVisible();
    } finally {
      await restore();
    }
  });
});
