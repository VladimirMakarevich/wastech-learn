import { execFileSync } from "node:child_process";
import { contentRoot } from "./content.js";
import { expect, test } from "./fixtures.js";

const git = (...args: string[]): string =>
  execFileSync(
    "git",
    ["-c", "user.email=e2e@example.invalid", "-c", "user.name=e2e", ...args],
    {
      cwd: contentRoot(),
      encoding: "utf8",
    },
  );

test.describe("settings", () => {
  test("show the repository's retention, limits and device, and change nothing in it", async ({
    page,
  }) => {
    git("init", "--quiet");
    git("add", "--all");
    git("commit", "--quiet", "--message", "baseline");
    await page.goto("/settings");
    const status = (await (await page.request.get("/api/status")).json()) as {
      device: string;
      config: {
        srs: { desiredRetention: number };
        limits: Record<string, unknown>;
      };
    };
    await expect(page.locator('[data-repo="retention"] b')).toHaveText(
      new RegExp(
        `^0[.,]${String(Math.round(status.config.srs.desiredRetention * 100))}$`,
      ),
    );
    await expect(page.locator('[data-repo="device"] b')).toHaveText(
      status.device,
    );
    await expect(page.locator('[data-repo="limits"]')).toContainText("lang-pl");
    await page.locator('[data-setting="theme"] button').nth(2).click();
    await page.locator('[data-setting="session"] button').nth(1).click();
    await page.locator('[data-setting="lang"] button').nth(2).click();
    await page.locator("[data-voice-check]").click();
    await page.reload();
    await expect(
      page.locator('[data-setting="theme"] button').nth(2),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator('[data-setting="session"] button').nth(1),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(git("status", "--porcelain")).toBe("");
  });

  test("switch the interface language without a reload, every label with it", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.evaluate(() => Object.assign(window, { stillHere: true }));
    const nav = page.locator("nav .nav-item");
    const expected = {
      RU: ["Главная", "Повторение", "Карточки", "Статистика", "Настройки"],
      EN: ["Home", "Review", "Cards", "Statistics", "Settings"],
      PL: ["Start", "Powtórka", "Karty", "Statystyki", "Ustawienia"],
    } as const;
    for (const lang of ["RU", "EN", "PL"] as const) {
      await page
        .locator('[data-setting="lang"] button', { hasText: lang })
        .click();
      await expect(nav).toHaveText([...expected[lang]]);
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        lang.toLowerCase(),
      );
    }
    await expect(page.locator(".topbar h1")).toHaveText("Ustawienia");
    expect(
      await page.evaluate(
        () => (window as unknown as { stillHere?: boolean }).stillHere,
      ),
    ).toBe(true);
  });
});
