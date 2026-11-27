import { Pipe, inject, type PipeTransform } from "@angular/core";
import type { MessageKey } from "./en";
import { I18n } from "./i18n";
import type { MessageParams } from "./message";

/**
 * `{{ 'nav.home' | t }}`. Impure on purpose: the result depends on the language signal, not only on the
 * arguments, and a pure pipe would keep the old language after a switch.
 */
@Pipe({ name: "t", pure: false })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(key: MessageKey, params?: MessageParams): string {
    return this.i18n.t(key, params);
  }
}
