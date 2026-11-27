import { Injectable, signal } from "@angular/core";

/** The language the app reads aloud: Polish vocabulary and phrases. */
export const SPEECH_LANG = "pl-PL";

const findVoice = (
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined =>
  voices.find((voice) =>
    voice.lang.toLowerCase().replace("_", "-").startsWith("pl"),
  );

/**
 * Reads Polish aloud with the browser's own voices (Web Speech API): offline, no account, nothing leaves
 * the machine. Without a Polish voice there is nothing to offer, so the button and the `p` key disappear
 * instead of failing.
 */
@Injectable({ providedIn: "root" })
export class Speech {
  readonly voice = signal<SpeechSynthesisVoice | undefined>(undefined);
  private readonly synth: SpeechSynthesis | undefined =
    "speechSynthesis" in globalThis ? globalThis.speechSynthesis : undefined;

  constructor() {
    const synth = this.synth;
    if (synth === undefined) return;
    const load = (): void => {
      this.voice.set(findVoice(synth.getVoices()));
    };
    load();
    // Chromium fills the voice list asynchronously; until then it is empty.
    synth.addEventListener("voiceschanged", load);
  }

  speak(text: string): void {
    const voice = this.voice();
    const synth = this.synth;
    if (voice === undefined || synth === undefined || text.trim() === "")
      return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG;
    utterance.voice = voice;
    synth.speak(utterance);
  }
}
