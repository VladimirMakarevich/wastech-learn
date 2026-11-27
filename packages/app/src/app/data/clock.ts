import { Injectable } from "@angular/core";

/**
 * The app's only reading of the clock. The pure packages get `now` as a value from here, and a test pins
 * the browser's clock to make every schedule reproducible.
 */
@Injectable({ providedIn: "root" })
export class Clock {
  now(): Date {
    return new Date();
  }
}
