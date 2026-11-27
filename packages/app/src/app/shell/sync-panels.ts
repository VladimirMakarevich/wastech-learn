import { Injectable, Injector, inject } from "@angular/core";

/**
 * Opens the Sync panel. The panel and the dialog machinery load on the first press: most visits only
 * glance at the sidebar, and the first screen should not wait for code it may never show.
 */
@Injectable({ providedIn: "root" })
export class SyncPanels {
  private readonly injector = inject(Injector);

  open(): void {
    void import("./sync-panel").then(({ openSyncPanel }) => {
      openSyncPanel(this.injector);
    });
  }
}
