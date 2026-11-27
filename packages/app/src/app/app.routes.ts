import type { Routes } from "@angular/router";
import { TITLE_KEY } from "./shell/titles";

// Screens load on demand: the first paint of Home never waits for the Browser's table or the Topic reader.
export const routes: Routes = [
  {
    path: "",
    data: { [TITLE_KEY]: "title.home" },
    loadComponent: () => import("./screens/home/home").then((m) => m.Home),
  },
  {
    path: "review",
    data: { [TITLE_KEY]: "title.review" },
    loadComponent: () =>
      import("./screens/review/review").then((m) => m.Review),
  },
  {
    path: "session-end",
    data: { [TITLE_KEY]: "title.session-end" },
    loadComponent: () =>
      import("./screens/session-end/session-end").then((m) => m.SessionEnd),
  },
  {
    path: "topic/:domain/:topic",
    data: { [TITLE_KEY]: "title.topic" },
    loadComponent: () => import("./screens/topic/topic").then((m) => m.Topic),
  },
  {
    path: "browser",
    data: { [TITLE_KEY]: "title.browser" },
    loadComponent: () =>
      import("./screens/browser/browser").then((m) => m.Browser),
  },
  {
    path: "stats",
    data: { [TITLE_KEY]: "title.stats" },
    loadComponent: () => import("./screens/stats/stats").then((m) => m.Stats),
  },
  {
    path: "settings",
    data: { [TITLE_KEY]: "title.settings" },
    loadComponent: () =>
      import("./screens/settings/settings").then((m) => m.Settings),
  },
  { path: "**", redirectTo: "" },
];
