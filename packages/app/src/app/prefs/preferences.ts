import { Injectable, signal } from "@angular/core";
import { isUiLang, type UiLang } from "../i18n/message";
import { browserStore, type LocalStore } from "./local-store";

export const THEMES = ["system", "dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

/** The lengths the "5 minutes" session can take. */
export const SESSION_LENGTHS = [5, 10, 15] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];

const KEYS = {
  lang: "wastech-learn.lang",
  theme: "wastech-learn.theme",
  sessionMinutes: "wastech-learn.session-minutes",
} as const;

const isTheme = (value: unknown): value is Theme =>
  THEMES.some((theme) => theme === value);

const isLength = (value: number): value is SessionLength =>
  SESSION_LENGTHS.some((length) => length === value);

/** The language the browser asks for, when it is one of ours. */
const browserLang = (): UiLang | undefined => {
  const tag = globalThis.navigator.language.slice(0, 2).toLowerCase();
  return isUiLang(tag) ? tag : undefined;
};

/**
 * Language, theme and the length of the short session. They live in this browser, not in the content
 * repository: they describe this device, never what is learned, and stay out of git.
 */
@Injectable({ providedIn: "root" })
export class Preferences {
  private readonly store: LocalStore = browserStore();
  private readonly storedLang = this.store.get(KEYS.lang);

  readonly lang = signal<UiLang>(
    isUiLang(this.storedLang) ? this.storedLang : (browserLang() ?? "en"),
  );
  readonly theme = signal<Theme>(
    ((value) => (isTheme(value) ? value : "system"))(
      this.store.get(KEYS.theme),
    ),
  );
  readonly sessionMinutes = signal<SessionLength>(
    ((value) => (isLength(value) ? value : 5))(
      Number(this.store.get(KEYS.sessionMinutes)),
    ),
  );

  setLang(lang: UiLang): void {
    this.lang.set(lang);
    this.store.set(KEYS.lang, lang);
  }

  /** The repository's language, used while this browser has no choice of its own. */
  suggestLang(lang: UiLang): void {
    if (!isUiLang(this.store.get(KEYS.lang))) this.lang.set(lang);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.store.set(KEYS.theme, theme);
  }

  setSessionMinutes(minutes: SessionLength): void {
    this.sessionMinutes.set(minutes);
    this.store.set(KEYS.sessionMinutes, String(minutes));
  }
}
