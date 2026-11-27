/**
 * The few settings the app keeps for this browser only. Storage can be missing or throw (a private window,
 * blocked site data); every read then falls back and every write is skipped, so the app works without it.
 */
export interface LocalStore {
  readonly get: (key: string) => string | undefined;
  readonly set: (key: string, value: string) => void;
}

export const browserStore = (
  storage: () => Storage | undefined = () => globalThis.localStorage,
): LocalStore => ({
  get: (key) => {
    try {
      return storage()?.getItem(key) ?? undefined;
    } catch {
      // No storage in this browser context: the default applies.
      return undefined;
    }
  },
  set: (key, value) => {
    try {
      storage()?.setItem(key, value);
    } catch {
      // No storage: the choice lasts until the tab closes, which is all a private window allows.
    }
  },
});
