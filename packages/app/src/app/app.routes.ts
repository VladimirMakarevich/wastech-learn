import type { Routes } from "@angular/router";

// Screens load on demand: the first paint of Home never waits for the Browser's table or the Topic reader.
export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./screens/home/home").then((m) => m.Home),
  },
  {
    path: "review",
    loadComponent: () =>
      import("./screens/review/review").then((m) => m.Review),
  },
  {
    path: "session-end",
    loadComponent: () =>
      import("./screens/session-end/session-end").then((m) => m.SessionEnd),
  },
  {
    path: "topic/:domain/:topic",
    loadComponent: () => import("./screens/topic/topic").then((m) => m.Topic),
  },
  {
    path: "browser",
    loadComponent: () =>
      import("./screens/browser/browser").then((m) => m.Browser),
  },
  {
    path: "stats",
    loadComponent: () => import("./screens/stats/stats").then((m) => m.Stats),
  },
  {
    path: "settings",
    loadComponent: () =>
      import("./screens/settings/settings").then((m) => m.Settings),
  },
  { path: "**", redirectTo: "" },
];
