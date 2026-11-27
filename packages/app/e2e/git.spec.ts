import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { contentRoot, editFile } from "./content.js";
import { expect, test } from "./fixtures.js";
import { bareRoot, git, secondComputer, settle } from "./git.js";

const CARD = "content/architecture/backpressure/cards/0d1gjcys.md";
const OTHER_CARD = "content/architecture/backpressure/cards/1mpw75f3.md";
const INDEX = "content/architecture/backpressure/index.md";
const NEW_ID = "e2e2e2e2";
const NEW_CARD = `content/architecture/backpressure/cards/${NEW_ID}.md`;

const indicator = (page: Page) => page.locator("[data-git-indicator]");
const panel = (page: Page) => page.locator("wl-sync-panel");

/** The tab came back into view: the app rereads git, as after a commit made in a terminal. */
const tabShown = (page: Page): Promise<void> =>
  page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });

const openPanel = async (page: Page): Promise<void> => {
  await indicator(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator("[data-in]")).toBeVisible();
};

test.describe("git in the app", () => {
  test.beforeEach(async ({ page }) => {
    await settle();
    // The texts below are checked in English; the repository's own language is Russian.
    await page.addInitScript(() => {
      localStorage.setItem("wastech-learn.lang", "en");
    });
  });

  test("the sidebar counts an edit within two seconds and calms down after a commit made outside", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(indicator(page)).toContainText("everything synced");
    const restore = await editFile(CARD, (text) => `${text}\n`);
    await expect(indicator(page)).toContainText("1 change not committed", {
      timeout: 2_000,
    });
    await restore();
    await appendLine(CARD);
    await git(contentRoot(), "commit", "-qam", "outside");
    await tabShown(page);
    await expect(indicator(page)).toContainText("ready to send");
    await expect(indicator(page)).toContainText("↑1");
    await git(contentRoot(), "push", "-q");
    await tabShown(page);
    await expect(indicator(page)).toContainText("everything synced");
  });

  test("the panel splits what Sync commits from other files and sends the edited message", async ({
    page,
  }) => {
    const root = contentRoot();
    await appendLine(CARD);
    await mkdir(join(root, ".codex"), { recursive: true });
    await writeFile(join(root, ".codex/config.toml"), "model = 'x'\n");
    try {
      await page.goto("/");
      await expect(indicator(page)).toContainText("2 changes");
      const suggested = (await (await page.request.get("/api/git")).json()) as {
        suggestedMessage: string;
      };
      await openPanel(page);
      await expect(panel(page).locator("[data-in]")).toContainText(CARD);
      await expect(panel(page).locator("[data-out]")).toContainText(
        ".codex/config.toml",
      );
      const message = panel(page).locator("[data-message]");
      await expect(message).toHaveValue(suggested.suggestedMessage);
      await message.fill("chore: sync from the e2e run");
      await panel(page).locator("[data-sync]").click();
      await expect(panel(page).locator("[data-outcome]")).toHaveText(
        "Sent: 1 commit",
      );
      expect(
        (await git(bareRoot(), "log", "-1", "--format=%s", "main")).trim(),
      ).toBe("chore: sync from the e2e run");
      expect(
        (
          await git(bareRoot(), "show", "--name-only", "--format=", "main")
        ).trim(),
      ).toBe(CARD);
      expect(await git(root, "status", "--porcelain")).toBe("?? .codex/\n");
    } finally {
      await rm(join(root, ".codex"), { recursive: true, force: true });
    }
  });

  test("Pull brings the other computer's card in beside an uncommitted edit, and Cards shows it", async ({
    page,
  }) => {
    const laptop = await secondComputer();
    const card = (await readFile(join(laptop, CARD), "utf8"))
      .replace(/^id: .*$/m, `id: ${NEW_ID}`)
      .replace(/^# .*$/m, "# Sync check card");
    await writeFile(join(laptop, NEW_CARD), card);
    const index = await readFile(join(laptop, INDEX), "utf8");
    await writeFile(
      join(laptop, INDEX),
      index.replace(
        "## Cards\n\n",
        `## Cards\n\n- [Sync check card](cards/${NEW_ID}.md)\n`,
      ),
    );
    await git(laptop, "add", "--all");
    await git(laptop, "commit", "-qm", "laptop card");
    await git(laptop, "push", "-q");
    await appendLine(OTHER_CARD);
    try {
      await page.goto("/");
      await openPanel(page);
      await panel(page).locator("[data-pull]").click();
      await expect(panel(page).locator("[data-outcome]")).toHaveText(
        "Received: 1 commit",
      );
      expect(await readFile(join(contentRoot(), OTHER_CARD), "utf8")).toMatch(
        /\n\n$/,
      );
      await page.keyboard.press("Escape");
      await page.goto("/browser");
      await page.locator("[data-browser-search]").fill("Sync check card");
      await expect(
        page.locator(`table.list tbody tr[data-item^="${NEW_ID}:"]`),
      ).toBeVisible();
    } finally {
      // Later scenarios count the golden cards: the second computer takes its card back.
      await git(laptop, "pull", "-q");
      await git(laptop, "rm", "-q", NEW_CARD);
      await writeFile(join(laptop, INDEX), index);
      await git(laptop, "commit", "-qam", "laptop card gone");
      await git(laptop, "push", "-q");
      await git(contentRoot(), "checkout", "--", OTHER_CARD);
      await git(contentRoot(), "pull", "-q", "--rebase");
    }
  });

  test("the session summary mentions unsent ratings until Sync sends them", async ({
    page,
  }) => {
    await page.goto("/review?mode=all");
    for (let rating = 0; rating < 3; rating++) {
      await expect(page.locator("article.review-card")).toBeVisible();
      await page.keyboard.press("Space");
      await page.keyboard.press("3");
    }
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/session-end$/);
    const unsent = page.locator("[data-unsent]");
    await expect(unsent).toContainText("sent to the other computer yet");
    await page.locator("[data-end-sync]").click();
    await expect(panel(page)).toBeVisible();
    await panel(page).locator("[data-sync]").click();
    await expect(panel(page).locator("[data-outcome]")).toHaveText(
      "Sent: 1 commit",
    );
    await page.keyboard.press("Escape");
    await expect(unsent).toHaveCount(0);
  });

  test("without an upstream the panel names the reason and keeps the buttons off", async ({
    page,
  }) => {
    const root = contentRoot();
    await git(root, "branch", "--unset-upstream");
    try {
      await page.goto("/");
      await openPanel(page);
      await expect(panel(page).locator("[data-blocked]")).toContainText(
        "no upstream",
      );
      await expect(panel(page).locator("[data-sync]")).toBeDisabled();
      await expect(panel(page).locator("[data-pull]")).toBeDisabled();
    } finally {
      await git(root, "branch", "--set-upstream-to=origin/main");
    }
  });

  test("the panel works from the keyboard, holds focus, gives it back and passes axe in both themes", async ({
    page,
  }) => {
    await appendLine(CARD);
    try {
      for (const scheme of ["dark", "light"] as const) {
        await page.emulateMedia({
          colorScheme: scheme,
          reducedMotion: "reduce",
        });
        await page.goto("/");
        await indicator(page).focus();
        await page.keyboard.press("Enter");
        await expect(panel(page)).toBeVisible();
        await expect(panel(page).locator("[data-in]")).toContainText(CARD);
        const focusInside = () =>
          page.evaluate(
            () => document.activeElement?.closest("wl-sync-panel") !== null,
          );
        expect(await focusInside()).toBe(true);
        for (let step = 0; step < 8; step++) {
          await page.keyboard.press("Tab");
          expect(await focusInside()).toBe(true);
        }
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          result.violations
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map(
              (v) => `${scheme}: ${v.id} ${v.nodes[0]?.target.join(" ") ?? ""}`,
            ),
        ).toEqual([]);
        await page.keyboard.press("Escape");
        await expect(panel(page)).toHaveCount(0);
        await expect(indicator(page)).toBeFocused();
      }
    } finally {
      await git(contentRoot(), "checkout", "--", CARD);
    }
  });
});

/** An edit git sees and every check accepts: one more blank line at the end of the file. */
async function appendLine(file: string): Promise<void> {
  const path = join(contentRoot(), file);
  await writeFile(path, `${await readFile(path, "utf8")}\n`);
}
