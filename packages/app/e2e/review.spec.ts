import type { Page } from "@playwright/test";
import { editFile, webEvents } from "./content.js";
import { expect, test } from "./fixtures.js";

const card = (page: Page) => page.locator("article.review-card");

const currentItem = async (page: Page): Promise<string> =>
  (await card(page).getAttribute("data-item")) ?? "";

const startReview = async (page: Page, mode = "all"): Promise<void> => {
  await page.goto(`/review?mode=${mode}`);
  await expect(card(page)).toBeVisible();
};

/** Shows the answer and rates the card on screen; resolves once another card (or the end) is on screen. */
const answer = async (page: Page, key: string): Promise<void> => {
  const before = await currentItem(page);
  await page.keyboard.press("Space");
  await expect(page.locator(".ratings")).toBeVisible();
  await page.keyboard.press(key);
  await expect
    .poll(async () =>
      page.url().includes("/session-end") ? "end" : currentItem(page),
    )
    .not.toBe(before);
};

/** Hides cards with `b`, one at a time, until the card on screen is the one wanted. */
const skipUntil = async (
  page: Page,
  wanted: () => Promise<boolean>,
): Promise<void> => {
  for (let step = 0; step < 40; step++) {
    if ((await card(page).count()) === 0) break;
    if (await wanted()) return;
    const before = await currentItem(page);
    await page.keyboard.press("b");
    await expect.poll(() => currentItem(page)).not.toBe(before);
  }
  throw new Error("the wanted card is not in the queue");
};

const findPolishCard = (page: Page): Promise<void> =>
  skipUntil(
    page,
    async () =>
      (await card(page).locator(".q-body").getAttribute("lang")) === "pl",
  );

const newEvents = async (since: number) => (await webEvents()).slice(since);

/** The events written since `since`, once there are `count` of them: the app sends them in the background. */
const eventsAfter = async (since: number, count: number) => {
  await expect
    .poll(async () => (await newEvents(since)).length)
    .toBeGreaterThanOrEqual(count);
  return newEvents(since);
};

/** A Polish voice that records what it is asked to say, standing in for the OS voices. */
const fakePolishVoice = (page: Page, withVoice: boolean) =>
  page.addInitScript((enabled: boolean) => {
    const spoken: { text: string; lang: string }[] = [];
    const voices = enabled
      ? [
          {
            lang: "pl-PL",
            name: "Polski",
            default: false,
            localService: true,
            voiceURI: "pl",
          },
        ]
      : [];
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voices,
        speak: (utterance: { text: string; lang: string }) =>
          spoken.push({ text: utterance.text, lang: utterance.lang }),
        cancel: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        text: string;
        lang = "";
        voice: unknown = null;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
    Object.assign(window, { spoken });
  }, withVoice);

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

test.describe("review", () => {
  // First in the file: a later scenario may answer this card and so make it unchanged.
  test("a card edited since its last answer is marked and can start over", async ({
    page,
    logFixture,
  }) => {
    await startReview(page);
    await skipUntil(
      page,
      async () => (await currentItem(page)) === logFixture.changed,
    );
    expect(await currentItem(page)).toBe(logFixture.changed);
    await expect(page.locator(".status-changed")).toBeVisible();
    const since = (await webEvents()).length;
    await page.getByRole("button", { name: /over|заново|od nowa/ }).click();
    expect(await eventsAfter(since, 1)).toEqual([
      expect.objectContaining({ kind: "reset", item: logFixture.changed }),
    ]);
  });

  // Early in the file, while the queue still holds every card type.
  test("a scenario card grades by its rubric, a cloze hides only the asked gap, vocab asks both ways", async ({
    page,
  }) => {
    await startReview(page);
    const typeChip = card(page).locator(".meta-tags .chip").last();
    await skipUntil(
      page,
      async () =>
        (await typeChip.textContent())?.startsWith("scenario") ?? false,
    );
    await page.keyboard.press("Space");
    const boxes = page.locator(".rubric input[type=checkbox]");
    await expect(boxes.first()).toBeVisible();
    expect(await boxes.count()).toBeGreaterThanOrEqual(3);
    await expect(page.locator(".answer-block .hint")).toHaveCount(1);
    const items = page.locator(".rubric label");
    for (let index = 0; index < (await items.count()); index++)
      if ((await items.nth(index).locator(".req").count()) > 0)
        await boxes.nth(index).check();
    await expect(page.locator(".ratings button.suggested")).toHaveCount(1);
    await page.keyboard.press("b");

    await skipUntil(
      page,
      async () => (await typeChip.textContent())?.startsWith("cloze") ?? false,
    );
    const asked = card(page).locator(".question span.cloze");
    await expect(asked).toHaveCount(1);
    await expect(asked).toHaveText("[…]");
    await page.keyboard.press("Space");
    await expect(
      card(page).locator(".question span.cloze.open"),
    ).not.toHaveText("[…]");
    await page.keyboard.press("b");

    await skipUntil(
      page,
      async () => (await typeChip.textContent())?.startsWith("vocab") ?? false,
    );
    const item = await currentItem(page);
    expect(item).toMatch(/:(fwd|rev)$/);
    // The reverse side never shows the example sentence: it holds the very word being asked.
    if (item.endsWith(":rev"))
      await expect(card(page).locator(".question em")).toHaveCount(0);
  });

  test("records confidence, answer time, content hash and scheduler, and null when confidence is skipped", async ({
    page,
  }) => {
    const since = (await webEvents()).length;
    await startReview(page);
    const first = await currentItem(page);
    await page.keyboard.press("2");
    await expect(page.locator(".seg button[aria-pressed=true]")).toHaveCount(1);
    await answer(page, "3");
    await answer(page, "3");
    const written = await eventsAfter(since, 2);
    expect(written).toHaveLength(2);
    expect(written[0]).toMatchObject({
      kind: "review",
      item: first,
      rating: 3,
      confidence: 2,
      writer: "web",
      device: "e2e",
      sched: "ts-fsrs@6.0.1/FSRS-7",
    });
    expect(written[0]?.contentHash).toMatch(/^sha256:/);
    expect(typeof written[0]?.durMs).toBe("number");
    expect(written[1]?.confidence).toBeNull();
  });

  test("shows the intervals each rating would give, with full labels and shortcuts", async ({
    page,
  }) => {
    await startReview(page);
    await page.keyboard.press("Space");
    const buttons = page.locator(".ratings button");
    await expect(buttons).toHaveCount(4);
    for (const [index, key] of ["1", "2", "3", "4"].entries()) {
      const button = buttons.nth(index);
      await expect(button).toHaveAttribute(
        "aria-keyshortcuts",
        new RegExp(`^${key}`),
      );
      await expect(button).toHaveAttribute(
        "aria-label",
        new RegExp(`^${key} · .+ · .+`),
      );
      await expect(button.locator(".iv")).not.toBeEmpty();
    }
    await expect(
      page.locator('.ratings button[data-rating="3"]'),
    ).toBeFocused();
  });

  test("u takes the last rating back and puts the card on screen again", async ({
    page,
  }) => {
    await startReview(page);
    const first = await currentItem(page);
    await answer(page, "1");
    const since = (await webEvents()).length;
    await page.keyboard.press("u");
    await expect.poll(() => currentItem(page)).toBe(first);
    const [undo] = await eventsAfter(since, 1);
    const rating = (await webEvents()).findLast(
      (event) => event.kind === "review" && event.item === first,
    );
    expect(undo).toMatchObject({
      kind: "undo",
      item: first,
      target: rating?.id,
    });
  });

  test("! suspends the card, b hides it without writing anything", async ({
    page,
  }) => {
    await startReview(page);
    const since = (await webEvents()).length;
    const suspended = await currentItem(page);
    await page.keyboard.press("!");
    await expect.poll(() => currentItem(page)).not.toBe(suspended);
    const buried = await currentItem(page);
    await page.keyboard.press("b");
    await expect.poll(() => currentItem(page)).not.toBe(buried);
    const written = await newEvents(since);
    expect(written).toEqual([
      expect.objectContaining({ kind: "suspend", item: suspended }),
    ]);
    await page.reload();
    await expect(card(page)).toBeVisible();
    expect(await currentItem(page)).not.toBe(suspended);
  });

  test("o opens the topic, e opens the card's file in VS Code", async ({
    page,
  }) => {
    await catchEditorLinks(page);
    await startReview(page);
    const status = (await (await page.request.get("/api/status")).json()) as {
      contentPath: string;
    };
    await page.keyboard.press("e");
    const opened = await page.evaluate(
      () => (window as unknown as { opened: string[] }).opened,
    );
    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatch(
      new RegExp(
        `^vscode://file${status.contentPath}/content/.+/cards/[0-9a-z]{8}\\.md$`,
      ),
    );
    await page.keyboard.press("o");
    await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+\/[a-z0-9-]+$/);
  });

  test("a Polish card offers its voice and p reads it in pl-PL", async ({
    page,
  }) => {
    await fakePolishVoice(page, true);
    await startReview(page);
    await findPolishCard(page);
    // The reverse side and cloze gaps read aloud only after the reveal, so the answer is not given away.
    await page.keyboard.press("Space");
    const listen = page.locator(".meta-tags .icon-btn");
    await expect(listen).toBeVisible();
    await page.keyboard.press("p");
    const spoken = await page.evaluate(
      () =>
        (window as unknown as { spoken: { text: string; lang: string }[] })
          .spoken,
    );
    expect(spoken).toHaveLength(1);
    expect(spoken[0]?.lang).toBe("pl-PL");
    expect(spoken[0]?.text.trim()).not.toBe("");
  });

  test("without a Polish voice there is no button and nothing fails", async ({
    page,
  }) => {
    await fakePolishVoice(page, false);
    await startReview(page);
    await findPolishCard(page);
    await page.keyboard.press("Space");
    await expect(page.locator(".meta-tags .icon-btn")).toHaveCount(0);
    await page.keyboard.press("p");
  });

  test("u after a rating that suspended a leech takes back both events", async ({
    page,
  }) => {
    const restore = await editFile("learn.config.json", (text) =>
      text.replace('"leechThreshold": 8', '"leechThreshold": 1'),
    );
    try {
      await expect
        .poll(
          async () =>
            (
              (await (await page.request.get("/api/status")).json()) as {
                config: { leechThreshold: number };
              }
            ).config.leechThreshold,
        )
        .toBe(1);
      await startReview(page);
      // Only forgetting an item in the review phase is a lapse; earlier scenarios may have left new or
      // learning cards at the front.
      await skipUntil(
        page,
        async () => (await card(page).getAttribute("data-phase")) === "review",
      );
      const since = (await webEvents()).length;
      await answer(page, "1");
      const rated = await eventsAfter(since, 2);
      expect(rated.map((event) => event.kind)).toEqual(["review", "suspend"]);
      await page.keyboard.press("u");
      await expect.poll(async () => (await newEvents(since)).length).toBe(4);
      const undos = (await newEvents(since)).slice(2);
      expect(undos.map((event) => [event.kind, event.target])).toEqual(
        rated.map((event) => ["undo", event.id]),
      );
    } finally {
      await restore();
      await expect
        .poll(
          async () =>
            (
              (await (await page.request.get("/api/status")).json()) as {
                config: { leechThreshold: number };
              }
            ).config.leechThreshold,
        )
        .toBe(8);
    }
  });

  test("a session of 20 review items runs on the keyboard alone, with the focus always visible", async ({
    page,
  }) => {
    await startReview(page);
    await page.evaluate(() => {
      const timings: number[] = [];
      let pressed: number | null = null;
      document.addEventListener(
        "keydown",
        (event) => {
          if (
            document.querySelector(".ratings") !== null &&
            ["1", "2", "3", "4", " "].includes(event.key)
          )
            pressed = performance.now();
        },
        true,
      );
      new MutationObserver(() => {
        if (pressed !== null && document.querySelector(".tray-row") !== null) {
          const started = pressed;
          pressed = null;
          requestAnimationFrame(() =>
            timings.push(performance.now() - started),
          );
        }
      }).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
      });
      Object.assign(window, { timings });
    });
    const since = (await webEvents()).length;
    const seen: string[] = [];
    for (let index = 0; index < 20; index++) {
      seen.push(await currentItem(page));
      expect(
        await page.evaluate(
          () => document.activeElement?.matches(":focus-visible") ?? false,
        ),
      ).toBe(true);
      await answer(page, "3");
    }
    expect(new Set(seen).size).toBe(20);
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/session-end$/);
    const written = (await newEvents(since)).filter(
      (event) => event.kind === "review",
    );
    expect(written.map((event) => event.item)).toEqual(seen);
    const timings = await page.evaluate(
      () => (window as unknown as { timings: number[] }).timings,
    );
    const sorted = [...timings].sort((a, b) => a - b);
    expect(sorted.length).toBeGreaterThanOrEqual(19);
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThan(50);
  });
});
