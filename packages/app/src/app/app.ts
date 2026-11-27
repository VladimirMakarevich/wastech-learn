import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  type ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { filter, map } from "rxjs";
import { AppData } from "./data/app-data";
import { I18n } from "./i18n/i18n";
import { UI_LANGS, isUiLang, type UiLang } from "./i18n/message";
import { TPipe } from "./i18n/t.pipe";
import { Keyboard } from "./keys/keyboard";
import { Preferences } from "./prefs/preferences";
import { BuildBanner } from "./shell/build-banner";
import { titleOf } from "./shell/titles";
import { Icon, type IconName } from "./ui/icon";
import { Toast, Toasts } from "./ui/toast";
import type { MessageKey } from "./i18n/en";

interface NavItem {
  readonly path: string;
  readonly label: MessageKey;
  readonly icon: IconName;
}

const NAV: readonly NavItem[] = [
  { path: "/", label: "nav.home", icon: "home" },
  { path: "/review", label: "nav.review", icon: "review" },
  { path: "/browser", label: "nav.browser", icon: "cards" },
  { path: "/stats", label: "nav.stats", icon: "stats" },
  { path: "/settings", label: "nav.settings", icon: "settings" },
];

/**
 * The shell around every screen, laid out as the prototype: an opaque sidebar with navigation, language,
 * theme and the save status, a sticky toolbar with the page title and the search field, and the screen.
 */
@Component({
  selector: "wl-root",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TPipe,
    Icon,
    Toast,
    BuildBanner,
  ],
  templateUrl: "./app.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly preferences = inject(Preferences);
  private readonly toasts = inject(Toasts);
  private readonly keyboard = inject(Keyboard);
  protected readonly i18n = inject(I18n);
  protected readonly data = inject(AppData);
  protected readonly nav = NAV;
  protected readonly langs = UI_LANGS;
  protected readonly searchField =
    viewChild.required<ElementRef<HTMLInputElement>>("searchInput");
  protected readonly query = signal("");

  private readonly prefersDark = signal(
    globalThis.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  protected readonly title = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => {
        let route = this.route.snapshot;
        while (route.firstChild !== null) route = route.firstChild;
        return titleOf(route.data);
      }),
    ),
    { initialValue: "title.home" },
  );

  protected readonly dark = computed(() => {
    const theme = this.preferences.theme();
    return theme === "system" ? this.prefersDark() : theme === "dark";
  });

  protected readonly saveStatus = computed(() => {
    const device = this.data.status()?.device ?? "";
    const pending = this.data.outbox().pending;
    return pending === 0
      ? this.i18n.t("shell.saved", { device })
      : this.i18n.t("shell.pending", {
          device,
          events: this.i18n.t("count.events", { count: pending }),
        });
  });

  constructor() {
    const document = inject(DOCUMENT);
    globalThis
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        this.prefersDark.set(event.matches);
      });
    effect(() => {
      const theme = this.preferences.theme();
      if (theme === "system") delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = theme;
    });
    effect(() => {
      document.title = `${this.i18n.t(this.title())} · ${this.i18n.t("app.name")}`;
    });
    // The repository's language applies until this browser has picked one of its own.
    effect(() => {
      const lang = this.data.status()?.config.uiLanguage;
      if (isUiLang(lang)) this.preferences.suggestLang(lang);
    });
    let wasOffline = false;
    let refused = 0;
    effect(() => {
      const report = this.data.outbox();
      if (report.offline && !wasOffline)
        this.toasts.show(this.i18n.t("toast.offline"));
      if (report.refused > refused)
        this.toasts.show(
          this.i18n.t("toast.refused", {
            events: this.i18n.t("count.events", {
              count: report.refused - refused,
            }),
          }),
        );
      wasOffline = report.offline;
      refused = report.refused;
    });
    this.keyboard.setSearch(() => {
      this.searchField().nativeElement.focus();
    });
  }

  protected setLang(lang: UiLang): void {
    this.i18n.setLang(lang);
  }

  protected toggleTheme(): void {
    this.preferences.setTheme(this.dark() ? "light" : "dark");
  }

  protected async refresh(): Promise<void> {
    await this.data.reload();
    this.toasts.show(this.i18n.t("shell.refreshed"));
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    const q = this.query().trim();
    void this.router.navigate(["/browser"], {
      queryParams: q === "" ? {} : { q },
    });
  }

  protected leaveSearch(): void {
    this.searchField().nativeElement.blur();
  }
}
