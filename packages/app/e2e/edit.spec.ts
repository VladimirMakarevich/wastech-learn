import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { contentRoot, editFile, webEvents } from "./content.js";
import { expect, test } from "./fixtures.js";
import { git, settle } from "./git.js";

const TOPIC = "content/architecture/backpressure";
const CARD = `${TOPIC}/cards/10dkrwp7.md`;
const SUMMARY = `${TOPIC}/summary.md`;
const INDEX = `${TOPIC}/index.md`;
const MATERIALS = `${TOPIC}/materials.md`;

const read = (file: string): Promise<string> =>
  readFile(join(contentRoot(), file), "utf8");

const restore = (...files: string[]): Promise<string> =>
  git(contentRoot(), "checkout", "--", ...files);

const editor = (page: Page) => page.locator("wl-source-editor textarea");

const openCard = async (page: Page, id: string): Promise<void> => {
  await page.goto("/browser");
  await page.locator(`tr[data-item^="${id}:"] .row-open`).first().click();
  await expect(page.locator("aside.drawer")).toBeVisible();
};

/** The text once the file has arrived: reading the field earlier would see it empty. */
const loadedText = async (page: Page): Promise<string> => {
  await expect(editor(page)).not.toHaveValue("");
  return editor(page).inputValue();
};

/** Replaces the whole text of the field the way typing would, so the app sees an input event. */
const setText = async (page: Page, text: string): Promise<void> => {
  await editor(page).fill(text);
};

/** Saves with the keyboard; a large rewrite is answered "same card" when the question comes up. */
const save = async (page: Page): Promise<void> => {
  await editor(page).press("Control+s");
};

/** Catches `vscode://` links instead of handing them to the OS. */
const catchEditorLinks = (page: Page) =>
  page.addInitScript(() => {
    const opened: string[] = [];
    document.addEventListener(
      "click",
      (event) => {
        const link = (event.target as Element | null)?.closest(
          'a[href^="vscode:"]',
        );
        if (link !== null && link !== undefined) {
          event.preventDefault();
          opened.push(link.getAttribute("href") ?? "");
        }
      },
      true,
    );
    Object.assign(window, { opened });
  });

const opened = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { opened: string[] }).opened);

const contentPath = async (page: Page): Promise<string> =>
  (
    (await (await page.request.get("/api/status")).json()) as {
      contentPath: string;
    }
  ).contentPath;

test.describe("editing in the app", () => {
  test.beforeEach(async ({ page }) => {
    await settle();
    await page.addInitScript(() => {
      localStorage.setItem("wastech-learn.lang", "en");
    });
  });

  test("Cards: e opens the file, Ctrl+S saves it and the panel shows the new text", async ({
    page,
  }) => {
    try {
      await openCard(page, "10dkrwp7");
      await page.keyboard.press("e");
      await expect(editor(page)).toBeFocused();
      const text = await read(CARD);
      await expect(editor(page)).toHaveValue(text);
      // Nothing changed: Esc closes without a question and focus goes back to the pencil.
      await editor(page).press("Escape");
      await expect(editor(page)).toHaveCount(0);
      await expect(page.locator("aside.drawer [data-edit]")).toBeFocused();

      await page.keyboard.press("e");
      await setText(
        page,
        text.replace("ask for more items", "ask for more elements"),
      );
      // AltGr+S types the Polish `ś` and reaches the page as Ctrl+Alt+S: the key is the letter's.
      const altGrSaved = await editor(page).evaluate(
        (area: HTMLTextAreaElement) => {
          const event = new KeyboardEvent("keydown", {
            key: "ś",
            code: "KeyS",
            ctrlKey: true,
            altKey: true,
            bubbles: true,
            cancelable: true,
          });
          area.dispatchEvent(event);
          return event.defaultPrevented;
        },
      );
      expect(altGrSaved).toBe(false);
      await save(page);
      await expect(page.locator(".toast")).toContainText("Saved");
      await expect(editor(page)).toHaveCount(0);
      await expect(page.locator("aside.drawer .question")).toContainText(
        "ask for more elements",
      );
      expect(await read(CARD)).toContain("ask for more elements");
    } finally {
      await restore(CARD);
    }
  });

  test("Cards: a lost Answer is not saved, and its finding puts the cursor on the line", async ({
    page,
  }) => {
    await openCard(page, "10dkrwp7");
    await page.keyboard.press("e");
    const before = await read(CARD);
    await setText(page, before.replace("## Answer\n\n", ""));
    await save(page);
    await expect(page.locator("[data-blocked]")).toBeVisible();
    expect(await read(CARD)).toBe(before);
    const finding = page.locator("button.editor-finding[data-line]").first();
    await expect(finding).toContainText("Answer");
    const line = Number(await finding.getAttribute("data-line"));
    await finding.click();
    await expect(editor(page)).toBeFocused();
    const offset = await editor(page).evaluate(
      (area: HTMLTextAreaElement) => area.selectionStart,
    );
    const value = await loadedText(page);
    expect(value.slice(0, offset).split("\n").length).toBe(line);
    // The text is not saved: closing asks first, and leaving drops it on purpose.
    await editor(page).press("Escape");
    await page.locator('[data-choice="discard"]').click();
    await expect(editor(page)).toHaveCount(0);
  });

  test("Cards: a file saved elsewhere is not overwritten, and the fresh version loads after a question", async ({
    page,
  }) => {
    try {
      await openCard(page, "10dkrwp7");
      await page.keyboard.press("e");
      const opened = await loadedText(page);
      await editFile(CARD, (text) =>
        text.replace("ask for more items", "request more items"),
      );
      const onDisk = await read(CARD);
      await setText(page, opened.replace("more items", "more items, mine"));
      await save(page);
      await expect(page.locator("[data-conflict]")).toBeVisible();
      expect(await read(CARD)).toBe(onDisk);
      await expect(editor(page)).toHaveValue(/mine/);
      await page.locator("[data-reload]").click();
      await page.locator('[data-choice="replace"]').click();
      await expect(editor(page)).toHaveValue(onDisk);
    } finally {
      await restore(CARD);
    }
  });

  test("unsaved text asks before Esc, before leaving the screen and before the tab closes", async ({
    page,
  }) => {
    await openCard(page, "10dkrwp7");
    await page.keyboard.press("e");
    await setText(page, "changed\n");
    await editor(page).press("Escape");
    await page.locator('[data-choice="stay"]').click();
    await expect(editor(page)).toHaveValue("changed\n");

    await page.locator('nav a[href="/"]').first().click();
    await page.locator('[data-choice="stay"]').click();
    await expect(page).toHaveURL(/\/browser/);
    await expect(editor(page)).toHaveValue("changed\n");

    let asked = "";
    page.on("dialog", (dialog) => {
      asked = dialog.type();
      void dialog.dismiss();
    });
    await page.close({ runBeforeUnload: true });
    await expect.poll(() => asked).toBe("beforeunload");
  });

  test("a large rewrite asks whether it is the same card, and a later edit shows the warning", async ({
    page,
  }) => {
    try {
      await openCard(page, "10dkrwp7");
      await page.keyboard.press("e");
      const text = await loadedText(page);
      await setText(
        page,
        text.replace(
          "`Subscription.request(n)`",
          "The subscriber calls `Subscription.request(n)` when ready",
        ),
      );
      await save(page);
      await expect(page.locator("#confirm-dialog-title")).toContainText(
        "same card",
      );
      await page.locator('[data-choice="same"]').click();
      await expect(page.locator(".toast")).toContainText("Saved");
      expect(await read(CARD)).toContain("id: 10dkrwp7");

      await page.locator("aside.drawer [data-edit]").click();
      await setText(
        page,
        (await loadedText(page)).replace("when ready", "when ready again"),
      );
      await save(page);
      await expect(page.locator(".toast")).toContainText("worth a look");
      expect(await read(CARD)).toContain("when ready again");
    } finally {
      await restore(CARD);
    }
  });

  test("Cards: 'New card' retires the old card and the panel follows the text to its new card", async ({
    page,
  }) => {
    try {
      await openCard(page, "10dkrwp7");
      await page.keyboard.press("e");
      await setText(
        page,
        (await loadedText(page)).replace(
          "`Subscription.request(n)`",
          "The subscriber calls `Subscription.request(n)` when ready",
        ),
      );
      await save(page);
      await page.locator('[data-choice="new"]').click();
      await expect(page.locator(".toast")).toContainText("Saved");
      await expect(editor(page)).toHaveCount(0);
      await expect(page.locator("aside.drawer .answer")).toContainText(
        "when ready",
      );
      await expect(
        page.locator("aside.drawer .row .chip").nth(1),
      ).not.toHaveText(/^10dkrwp7:/);
      expect(await read(CARD)).toContain("status: retired");
    } finally {
      await restore(CARD, INDEX);
      await git(contentRoot(), "clean", "-f", "-q", "--", `${TOPIC}/cards`);
    }
  });

  test("Cards: unsaved text stays when the card drops out of the content meanwhile", async ({
    page,
  }) => {
    try {
      await openCard(page, "10dkrwp7");
      await page.keyboard.press("e");
      await loadedText(page);
      await setText(page, "mine\n");
      await rm(join(contentRoot(), CARD));
      await expect(page.locator('tr[data-item^="10dkrwp7:"]')).toHaveCount(0);
      await expect(editor(page)).toHaveValue("mine\n");
    } finally {
      await restore(CARD);
    }
  });

  test("Topic: the pencil opens the summary at the section being read, with the other files as tabs", async ({
    page,
  }) => {
    try {
      await page.goto("/topic/architecture/backpressure");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.locator('nav.toc a[href$="#trade-offs"]').click();
      await expect
        .poll(() =>
          page
            .locator("#trade-offs")
            .evaluate((heading) => heading.getBoundingClientRect().top),
        )
        .toBeLessThan(150);
      await page.keyboard.press("e");
      await expect(editor(page)).toBeFocused();
      const value = await loadedText(page);
      expect(value).toBe(await read(SUMMARY));
      const offset = await editor(page).evaluate(
        (area: HTMLTextAreaElement) => area.selectionStart,
      );
      expect(value.slice(offset).split("\n")[0]).toBe("## Trade-offs");
      // Long paragraphs above the heading wrap in the field: counting line breaks alone would leave
      // the heading below the visible part, so the field scrolls further than that count.
      const scroll = await editor(page).evaluate(
        (area: HTMLTextAreaElement) => {
          const line = area.value
            .slice(0, area.selectionStart)
            .split("\n").length;
          const lineHeight = Number.parseFloat(
            getComputedStyle(area).lineHeight,
          );
          return { top: area.scrollTop, byLines: (line - 3) * lineHeight };
        },
      );
      expect(scroll.top).toBeGreaterThan(scroll.byLines);

      await page.locator(`[data-tab="${INDEX}"]`).click();
      await expect(editor(page)).toHaveValue(await read(INDEX));
      await page.locator(`[data-tab="${MATERIALS}"]`).click();
      await expect(editor(page)).toHaveValue(await read(MATERIALS));
      await editor(page).press("Escape");
      await expect(editor(page)).toHaveCount(0);
      await page.locator("[data-edit-materials]").click();
      await expect(editor(page)).toHaveValue(await read(MATERIALS));
      await editor(page).press("Escape");
      await expect(editor(page)).toHaveCount(0);
      await expect(page.locator("[data-edit-materials]")).toBeFocused();

      await page.keyboard.press("e");
      await setText(
        page,
        (await loadedText(page)).replace(
          "## TL;DR\n\n",
          "## TL;DR\n\nEdited in the app. ",
        ),
      );
      await save(page);
      await expect(page.locator("article.summary")).toContainText(
        "Edited in the app.",
      );
      expect(await read(SUMMARY)).not.toContain("updated: 2026-11-25");
    } finally {
      await restore(SUMMARY);
    }
  });

  test("Shift+E opens the same file in VS Code on Cards and Topic", async ({
    page,
  }) => {
    await catchEditorLinks(page);
    await openCard(page, "10dkrwp7");
    const root = await contentPath(page);
    await page.keyboard.press("Shift+E");
    expect(await opened(page)).toEqual([`vscode://file${root}/${CARD}`]);
    await page.goto("/topic/architecture/backpressure");
    await expect(page.locator("article.summary")).toBeVisible();
    await page.keyboard.press("Shift+E");
    expect(await opened(page)).toEqual([`vscode://file${root}/${SUMMARY}`]);
  });

  test("Review: e waits for the answer, then the rating counts the corrected text", async ({
    page,
  }) => {
    let file = "";
    try {
      await page.goto("/review?mode=all");
      const card = page.locator("article.review-card");
      await expect(card).toBeVisible();
      await page.keyboard.press("e");
      await expect(editor(page)).toHaveCount(0);
      const item = (await card.getAttribute("data-item")) ?? "";
      const id = item.split(":")[0] ?? "";
      await page.keyboard.press("Space");
      await page.keyboard.press("e");
      await expect(editor(page)).toBeFocused();
      const text = await loadedText(page);
      file = (
        await git(contentRoot(), "ls-files", "--", `content/*/*/cards/${id}.md`)
      ).trim();
      const answerStart =
        text.indexOf("## Answer\n\n") + "## Answer\n\n".length;
      await setText(
        page,
        `${text.slice(0, answerStart)}Corrected. ${text.slice(answerStart)}`,
      );
      await save(page);
      const same = page.locator('[data-choice="same"]');
      const toast = page.locator(".toast");
      await expect(same.or(toast).first()).toBeVisible();
      if (await same.isVisible()) await same.click();
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("data-item", item);
      await expect(card).toContainText("Corrected.");
      const bundle = (await (await page.request.get("/api/bundle")).json()) as {
        cards: { id: string; contentHash: string }[];
      };
      const hash = bundle.cards.find((entry) => entry.id === id)?.contentHash;
      const before = (await webEvents()).length;
      await page.keyboard.press("3");
      await expect
        .poll(async () => (await webEvents()).length)
        .toBe(before + 1);
      const last = (await webEvents()).at(-1);
      expect(last).toMatchObject({ item, rating: 3, contentHash: hash });
    } finally {
      if (file !== "") await restore(file);
    }
  });

  for (const scheme of ["dark", "light"] as const) {
    test(`the open editor has no serious accessibility violation and fits 360 px, ${scheme} theme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await openCard(page, "10dkrwp7");
      await page.keyboard.press("e");
      await expect(editor(page)).toBeFocused();
      // The drawer's focus trap marks its two wrap-around anchors hidden yet focusable, by the CDK's
      // design; that is the drawer's, not the editor's, and is left to it.
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude(".cdk-focus-trap-anchor")
        .analyze();
      expect(
        result.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id} ${v.nodes[0]?.target.join(" ") ?? ""}`),
      ).toEqual([]);
      await page.setViewportSize({ width: 360, height: 740 });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
      await expect(
        page.locator("wl-source-editor [data-save]"),
      ).toBeInViewport();
    });
  }

  test("an edit, a mistake, its fix and the save work from the keyboard alone", async ({
    page,
  }) => {
    try {
      await openCard(page, "10dkrwp7");
      await page.keyboard.press("e");
      await expect(editor(page)).toBeFocused();
      await loadedText(page);
      await page.keyboard.press("Control+End");
      await page.keyboard.type("\n## Extra\n");
      await page.keyboard.press("Control+Home");
      await page.keyboard.press("ArrowDown");
      // "id: 10dkrwp7" → "id: 10dkrwp8": the id may not change.
      await page.keyboard.press("End");
      await page.keyboard.press("Backspace");
      await page.keyboard.type("8");
      await page.keyboard.press("Control+s");
      await expect(page.locator("[data-blocked]")).toBeVisible();
      await page.keyboard.press("Backspace");
      await page.keyboard.type("7");
      await page.keyboard.press("Control+s");
      await expect(page.locator(".toast")).toContainText("Saved");
      await expect(page.locator("aside.drawer [data-edit]")).toBeFocused();
    } finally {
      await restore(CARD);
    }
  });
});
