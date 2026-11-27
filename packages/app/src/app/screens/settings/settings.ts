import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { AppData } from "../../data/app-data";
import { I18n } from "../../i18n/i18n";
import { UI_LANGS, type UiLang } from "../../i18n/message";
import { TPipe } from "../../i18n/t.pipe";
import {
  Preferences,
  SESSION_LENGTHS,
  THEMES,
  type SessionLength,
  type Theme,
} from "../../prefs/preferences";
import { vscodeLink } from "../../shell/vscode";
import { Speech } from "../../tts/speech";
import { Group } from "../../ui/group";
import { Segmented, type Segment } from "../../ui/segmented";

/**
 * Settings: what belongs to this browser (language, theme, the short session's length) is changed here and
 * stays out of git; what belongs to the repository (desired retention, limits, the device) is shown with
 * the way to change it in learn.config.json.
 */
@Component({
  selector: "wl-settings",
  imports: [TPipe, Group, Segmented],
  templateUrl: "./settings.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  protected readonly preferences = inject(Preferences);
  protected readonly i18n = inject(I18n);
  private readonly data = inject(AppData);
  private readonly speech = inject(Speech);
  protected readonly voiceResult = signal<string | null>(null);

  protected readonly langs = computed((): readonly Segment<UiLang>[] =>
    UI_LANGS.map((lang) => ({ value: lang, label: lang.toUpperCase() })),
  );
  protected readonly themes = computed((): readonly Segment<Theme>[] =>
    THEMES.map((theme) => ({
      value: theme,
      label: this.i18n.t(`settings.theme-${theme}`),
    })),
  );
  protected readonly lengths = computed((): readonly Segment<SessionLength>[] =>
    SESSION_LENGTHS.map((minutes) => ({
      value: minutes,
      label: this.i18n.t("count.minutes", { count: minutes }),
    })),
  );

  protected readonly repository = computed(() => {
    const status = this.data.status();
    if (status === undefined) return undefined;
    const { config } = status;
    return {
      device: status.device,
      path: status.contentPath,
      retention: this.i18n.number(config.srs.desiredRetention, {
        minimumFractionDigits: 2,
      }),
      limits: [
        { domain: this.i18n.t("settings.default"), ...config.limits.default },
        ...Object.entries(config.limits.domains)
          .sort(([a], [b]) => a.localeCompare(b, "en"))
          .map(([domain, limits]) => ({ domain, ...limits })),
      ],
      editor: vscodeLink(status.contentPath, "learn.config.json"),
    };
  });

  protected setLang(lang: UiLang | undefined): void {
    if (lang !== undefined) this.i18n.setLang(lang);
  }

  protected setTheme(theme: Theme | undefined): void {
    if (theme !== undefined) this.preferences.setTheme(theme);
  }

  protected setLength(minutes: SessionLength | undefined): void {
    if (minutes !== undefined) this.preferences.setSessionMinutes(minutes);
  }

  protected checkVoice(): void {
    const voice = this.speech.voice();
    this.voiceResult.set(
      voice === undefined
        ? this.i18n.t("settings.voice-missing")
        : this.i18n.t("settings.voice-found", { name: voice.name }),
    );
  }
}
