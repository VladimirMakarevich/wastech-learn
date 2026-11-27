import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { contentRoot } from "./content.js";
import { expect, test } from "./fixtures.js";
import { git, settle } from "./git.js";

const TOPIC = "content/architecture/backpressure";
const INDEX = `${TOPIC}/index.md`;
const SUMMARY = `${TOPIC}/summary.md`;

const read = (file: string): Promise<string> =>
  readFile(join(contentRoot(), file), "utf8");

const exists = (file: string): Promise<boolean> =>
  stat(join(contentRoot(), file)).then(
    () => true,
    () => false,
  );

interface PickedCard {
  readonly id: string;
  readonly file: string;
  readonly index: string;
}

/** A card with events in some log of the copy, from any topic. */
const cardsByHistory = async (): Promise<{
  readonly withHistory: PickedCard;
}> => {
  const logged = new Set<string>();
  const reviews = join(contentRoot(), "reviews");
  for (const device of await readdir(reviews))
    for (const file of await readdir(join(reviews, device)))
      for (const line of (
        await readFile(join(reviews, device, file), "utf8")
      ).split("\n"))
        if (line.trim() !== "")
          logged.add(
            (JSON.parse(line) as { item: string }).item.split(":")[0] ?? "",
          );
  const cards: PickedCard[] = [];
  const content = join(contentRoot(), "content");
  for (const domain of (await readdir(content)).sort())
    for (const topic of (await readdir(join(content, domain))).sort())
      for (const file of (
        await readdir(join(content, domain, topic, "cards")).catch(() => [])
      ).sort())
        cards.push({
          id: file.replace(/\.md$/, ""),
          file: `content/${domain}/${topic}/cards/${file}`,
          index: `content/${domain}/${topic}/index.md`,
        });
  const withHistory = cards.find((card) => logged.has(card.id));
  if (withHistory === undefined)
    throw new Error("the fixture needs a card with history");
  return { withHistory };
};

/** Where a card's file is, whatever topic holds it. */
const fileOf = async (id: string): Promise<string> => {
  const found = (
    await git(contentRoot(), "ls-files", "--", `content/*/*/cards/${id}.md`)
  ).trim();
  if (found === "") throw new Error(`no file for card ${id}`);
  return found;
};

const openCard = async (page: Page, id: string): Promise<void> => {
  await page.goto("/browser");
  await page.locator(`tr[data-item^="${id}:"] .row-open`).first().click();
  await expect(page.locator("aside.drawer")).toBeVisible();
};

const statusOf = async (file: string): Promise<string | undefined> =>
  /^status: (\w+)$/m.exec(await read(file))?.[1];

test.describe("cards and topics from the app", () => {
  test.beforeEach(async ({ page }) => {
    await settle();
    await page.addInitScript(() => {
      localStorage.setItem("wastech-learn.lang", "en");
    });
  });

  test("a on Review archives the card, moves on, and the toast brings it back", async ({
    page,
  }) => {
    await page.goto("/review?mode=all");
    const card = page.locator("article.review-card");
    await expect(card).toBeVisible();
    const item = (await card.getAttribute("data-item")) ?? "";
    const id = item.split(":")[0] ?? "";
    const file = await fileOf(id);
    try {
      await page.keyboard.press("a");
      await expect(page.locator(".toast")).toContainText("Card archived");
      await expect(card).not.toHaveAttribute("data-item", item);
      await expect.poll(() => statusOf(file)).toBe("retired");
      await page.locator("[data-toast-action]").click();
      await expect.poll(() => statusOf(file)).toBe("active");
    } finally {
      await git(contentRoot(), "checkout", "--", file);
    }
  });

  test("Cards archives and returns a card, and the status filter finds it in between", async ({
    page,
  }) => {
    const { withHistory: card } = await cardsByHistory();
    const { id } = card;
    try {
      await openCard(page, id);
      await page.locator("[data-archive]").click();
      await expect.poll(() => statusOf(card.file)).toBe("retired");
      await page.goto("/browser");
      await page.locator('[data-filter="status"]').selectOption("retired");
      await expect(
        page.locator(`tr[data-item^="${id}:"]`).first(),
      ).toBeVisible();
      await page.locator(`tr[data-item^="${id}:"] .row-open`).first().click();
      await page.locator("[data-unarchive]").click();
      await expect.poll(() => statusOf(card.file)).toBe("active");
    } finally {
      await git(contentRoot(), "checkout", "--", card.file);
    }
  });

  test("a card without history goes after one plain question and comes back before the commit", async ({
    page,
  }) => {
    // Every golden card has events in the fixture log, so the card without history is made here and
    // committed, as one captured in a chat would be.
    const id = "e2e3e3e3";
    const card = {
      id,
      file: `${TOPIC}/cards/${id}.md`,
      index: INDEX,
    };
    const committedIndex = await read(INDEX);
    const before = (await read(`${TOPIC}/cards/10dkrwp7.md`))
      .replace(/^id: .*$/m, `id: ${id}`)
      .replace(/^# .*$/m, "# Card to delete");
    await writeFile(join(contentRoot(), card.file), before);
    expect(committedIndex).toContain("## Cards\n\n");
    await writeFile(
      join(contentRoot(), INDEX),
      committedIndex.replace(
        "## Cards\n\n",
        `## Cards\n\n- [Card to delete](cards/${id}.md)\n`,
      ),
    );
    await settle();
    const index = await read(INDEX);
    try {
      await page.goto("/browser");
      await expect(page.locator(`tr[data-item^="${id}:"]`)).toBeVisible();
      await openCard(page, id);
      await page.locator("[data-delete]").click();
      const dialog = page.locator("wl-confirm-delete");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("[data-history]")).toHaveCount(0);
      await dialog.locator("[data-choose-delete]").click();
      await expect.poll(() => exists(card.file)).toBe(false);
      expect(await read(card.index)).not.toContain(`cards/${id}.md`);
      const restore = page.locator("[data-deleted] [data-restore]");
      await expect(restore).toBeVisible();
      await restore.click();
      await expect.poll(() => exists(card.file)).toBe(true);
      expect(await read(card.file)).toBe(before);
      expect(await read(card.index)).toBe(index);
    } finally {
      // Later scenarios count the golden cards: the made card leaves the history it joined.
      await git(contentRoot(), "rm", "-q", "--ignore-unmatch", card.file);
      await writeFile(join(contentRoot(), INDEX), committedIndex);
      await settle();
    }
  });

  test("a card with history offers the archive first and keeps the log when deleted anyway", async ({
    page,
  }) => {
    const { withHistory: card } = await cardsByHistory();
    const { id } = card;
    const logs = await git(contentRoot(), "ls-files", "-s", "reviews");
    try {
      await openCard(page, id);
      await page.locator("[data-delete]").click();
      const dialog = page.locator("wl-confirm-delete");
      await expect(dialog.locator("[data-history]")).toContainText(
        "history stays in the log",
      );
      await expect(dialog.locator("[data-choose-archive]")).toBeFocused();
      for (const scheme of ["dark", "light"] as const) {
        await page.emulateMedia({
          colorScheme: scheme,
          reducedMotion: "reduce",
        });
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          result.violations
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map((v) => `${scheme}: ${v.id}`),
        ).toEqual([]);
      }
      await dialog.locator("[data-choose-delete]").click();
      await expect.poll(() => exists(card.file)).toBe(false);
      await git(contentRoot(), "add", "--all", "reviews");
      expect(await git(contentRoot(), "ls-files", "-s", "reviews")).toBe(logs);
    } finally {
      await git(contentRoot(), "checkout", "--", card.file, card.index);
    }
  });

  test("Topic lists its uncommitted files and Cards marks and filters the changed card", async ({
    page,
  }) => {
    const id = "10dkrwp7";
    const file = `${TOPIC}/cards/${id}.md`;
    try {
      await writeFile(join(contentRoot(), file), `${await read(file)}\n`);
      await writeFile(join(contentRoot(), SUMMARY), `${await read(SUMMARY)}\n`);
      await page.goto("/topic/architecture/backpressure");
      const block = page.locator("[data-uncommitted]");
      await expect(block).toContainText(`cards/${id}.md`);
      await expect(block).toContainText("summary.md");
      await expect(block.locator(".git-entry")).toHaveCount(2);
      await page.goto("/topic/dotnet/async-await");
      await expect(page.locator(".screen")).toBeVisible();
      await expect(page.locator("[data-uncommitted]")).toHaveCount(0);
      await page.goto("/browser");
      await expect(
        page.locator(`tr[data-item^="${id}:"] [data-git-change]`).first(),
      ).toContainText("not committed");
      await page.locator('[data-filter="uncommitted"]').check();
      await expect
        .poll(
          async () =>
            (await page.locator("table.list tbody tr[data-item]").count()) ===
            (await page.locator(`tr[data-item^="${id}:"]`).count()),
        )
        .toBe(true);
    } finally {
      await git(contentRoot(), "checkout", "--", file, SUMMARY);
    }
  });

  test("a topic goes to the archive and back; Home lists it only when asked", async ({
    page,
  }) => {
    try {
      await page.goto("/topic/architecture/backpressure");
      await page.locator("[data-topic-archive]").click();
      await expect
        .poll(async () => /^status: (\w+)$/m.exec(await read(INDEX))?.[1])
        .toBe("archived");
      await expect(page.locator("[data-topic-archived]")).toBeVisible();
      await page.goto("/");
      const toggle = page.locator("[data-show-archived]");
      await expect(toggle).toBeVisible();
      await expect(
        page.locator('a.t-row[href="/topic/architecture/backpressure"]'),
      ).toHaveCount(0);
      await toggle.click();
      await expect(
        page.locator('a.t-row[href="/topic/architecture/backpressure"]'),
      ).toBeVisible();
      await page.goto("/topic/architecture/backpressure");
      await page.locator("[data-topic-archive]").click();
      await expect
        .poll(async () => /^status: (\w+)$/m.exec(await read(INDEX))?.[1])
        .toBe("active");
    } finally {
      await git(contentRoot(), "checkout", "--", INDEX);
    }
  });
});
