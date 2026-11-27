import { describe, expect, it } from "vitest";
import {
  IDLE,
  SEQUENCE_MS,
  keyName,
  readGlobalKey,
  type KeyInput,
} from "../src/app/keys/keys";

const key = (value: string, extra: Partial<KeyInput> = {}): KeyInput => ({
  key: value,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  editable: false,
  ...extra,
});

describe("key names", () => {
  it("names keys the way the screens list them", () => {
    expect(keyName(key(" "))).toBe("Space");
    expect(keyName(key("U"))).toBe("u");
    expect(keyName(key("!"))).toBe("!");
    expect(keyName(key("Escape"))).toBe("Escape");
    expect(keyName(key("z", { ctrlKey: true }))).toBe("Ctrl+z");
    expect(keyName(key("z", { metaKey: true }))).toBe("Ctrl+z");
  });
});

describe("global keys", () => {
  it("/ focuses the search", () => {
    expect(readGlobalKey(key("/"), IDLE, 0).command).toBe("search");
  });

  it("g then h goes home within the window, not after it", () => {
    const afterG = readGlobalKey(key("g"), IDLE, 1_000);
    expect(afterG.command).toBeUndefined();
    expect(readGlobalKey(key("h"), afterG.state, 1_500).command).toBe(
      "go-home",
    );
    expect(
      readGlobalKey(key("h"), afterG.state, 1_000 + SEQUENCE_MS + 1).command,
    ).toBeUndefined();
  });

  it("another key in between breaks the sequence", () => {
    const afterG = readGlobalKey(key("g"), IDLE, 0);
    const afterX = readGlobalKey(key("x"), afterG.state, 100);
    expect(readGlobalKey(key("h"), afterX.state, 200).command).toBeUndefined();
  });

  it("nothing fires while typing in a field or with a modifier", () => {
    expect(
      readGlobalKey(key("/", { editable: true }), IDLE, 0).command,
    ).toBeUndefined();
    expect(
      readGlobalKey(key("/", { altKey: true }), IDLE, 0).command,
    ).toBeUndefined();
    const afterG = readGlobalKey(key("g", { editable: true }), IDLE, 0);
    expect(readGlobalKey(key("h"), afterG.state, 100).command).toBeUndefined();
  });
});
