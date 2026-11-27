import { DOCUMENT, Injectable, effect, inject } from "@angular/core";
import { Preferences } from "../prefs/preferences";
import type { MessageKey } from "./en";
import { translate } from "./format";
import type { MessageParams, UiLang } from "./message";

/**
 * The interface language as a signal: a template that translates re-renders when the learner switches,
 * without a reload. Content keeps the language of its topic and is never translated here.
 */
@Injectable({ providedIn: "root" })
export class I18n {
  private readonly preferences = inject(Preferences);
  readonly lang = this.preferences.lang.asReadonly();

  constructor() {
    const document = inject(DOCUMENT);
    effect(() => {
      document.documentElement.lang = this.lang();
    });
  }

  t(key: MessageKey, params?: MessageParams): string {
    return translate(this.lang(), key, params);
  }

  setLang(lang: UiLang): void {
    this.preferences.setLang(lang);
  }

  /** A date in the reader's language, read in the study timezone so every device shows the same day. */
  date(
    epochMs: number,
    options: Intl.DateTimeFormatOptions,
    timeZone?: string,
  ): string {
    return new Intl.DateTimeFormat(this.lang(), {
      ...options,
      ...(timeZone === undefined ? {} : { timeZone }),
    }).format(epochMs);
  }

  number(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.lang(), options).format(value);
  }
}
