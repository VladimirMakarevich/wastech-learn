import type { Message } from "./message";

/**
 * The English catalog, which also defines the keys: the Russian and Polish catalogs must hold exactly the
 * same keys, placeholders and plural categories, and a test keeps them in step.
 */
export const en = {
  "app.name": "wastech-learn",
  "nav.main": "Main",
  "nav.home": "Home",
  "nav.review": "Review",
  "nav.browser": "Cards",
  "nav.stats": "Statistics",
  "nav.settings": "Settings",
  "title.home": "Home",
  "title.review": "Review",
  "title.session-end": "Session summary",
  "title.topic": "Topic",
  "title.browser": "Cards",
  "title.stats": "Statistics",
  "title.settings": "Settings",
  "shell.search": "Search topics and cards",
  "shell.search-short": "Search",
  "shell.language": "Interface language",
  "shell.theme-dark": "Dark theme",
  "shell.theme-light": "Light theme",
  "shell.refresh": "Reload content",
  "shell.refreshed": "Content reloaded",
  "shell.saved": "{device} · everything saved",
  "shell.pending": "{device} · {events} waiting for the server",
  "shell.offline":
    "No connection to the local server: showing what was loaded. Start wastech-learn serve again",
  "shell.loading": "Loading the content…",
  "shell.unavailable":
    "The content could not be built yet: fix the errors below and save the file",
  "toast.offline": "Ratings will be saved when the server is back",
  "toast.refused":
    "The server did not accept {events}; they are kept out of the log",
  "banner.build-failed":
    "The latest edit did not build, so the app shows the last version that did",
  "banner.build-error":
    "The bundle did not rebuild ({code}); the app shows the last version that did",
  "banner.open": "Open in VS Code",
  "count.cards": { one: "{count} card", other: "{count} cards" },
  "count.minutes": { one: "{count} minute", other: "{count} minutes" },
  "count.events": { one: "{count} rating", other: "{count} ratings" },
  "count.errors": { one: "{count} error", other: "{count} errors" },
} as const satisfies Record<string, Message>;

export type MessageKey = keyof typeof en;
