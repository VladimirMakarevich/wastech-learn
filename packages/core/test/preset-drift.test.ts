import { describe, expect, it } from "vitest";
import { checkPresetDrift } from "../src/index.js";

const preset = `{
  // comment
  "rules": [
    { "rule": "SIZE-001", "options": { "lines": { "warn": 300 } } },
    { "rule": "FM-001", "options": { "files": ["a/*.md"], "required": ["id"] } },
    { "rule": "FM-001", "options": { "files": ["b/*.md"], "required": ["title"] } },
    { "rule": "custom", "id": "LEARN-X", "description": "English", "options": { "files": ["c"] } },
  ]
}`;

const copyWith = (rules: string[]): string =>
  `{ "rules": [${rules.join(",")}] }`;
const all = [
  `{ "rule": "SIZE-001", "options": { "lines": { "warn": 300 } } }`,
  `{ "rule": "FM-001", "options": { "required": ["id"], "files": ["a/*.md"] } }`,
  `{ "rule": "FM-001", "options": { "files": ["b/*.md"], "required": ["title"] } }`,
  `{ "rule": "custom", "id": "LEARN-X", "description": "Русский", "options": { "files": ["c"] } }`,
];

describe("preset drift", () => {
  it("accepts a copy with the same rules, whatever the key order and description", () => {
    expect(checkPresetDrift(preset, copyWith(all))).toEqual([]);
  });

  it("warns when a preset rule is removed from the copy", () => {
    const findings = checkPresetDrift(preset, copyWith(all.slice(1)));
    expect(findings).toEqual([
      {
        ruleId: "preset-drift",
        severity: "warning",
        file: "wastech-mdlint.config.json",
        params: { rule: "SIZE-001", position: 1 },
      },
    ]);
  });

  it("tells repeated rules apart by their options", () => {
    const loosened = [...all];
    loosened[2] = `{ "rule": "FM-001", "options": { "files": ["b/*.md"], "required": [] } }`;
    expect(checkPresetDrift(preset, copyWith(loosened))).toMatchObject([
      { params: { rule: "FM-001", position: 3 } },
    ]);
  });

  it("allows rules of the copy's own", () => {
    const extra = [...all, `{ "rule": "custom", "id": "MINE", "options": {} }`];
    expect(checkPresetDrift(preset, copyWith(extra))).toEqual([]);
  });

  it("warns when the copy is missing or not a config", () => {
    expect(checkPresetDrift(preset, undefined)).toMatchObject([
      { ruleId: "preset-invalid" },
    ]);
    expect(checkPresetDrift(preset, "{ nope")).toMatchObject([
      { ruleId: "preset-invalid" },
    ]);
  });
});
