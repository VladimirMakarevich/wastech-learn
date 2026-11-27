import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP = fileURLToPath(new URL("../src/app", import.meta.url));

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return path.endsWith(".ts") || path.endsWith(".html") ? [path] : [];
  });

/** The template of a component: an .html file, or the inline `template:` of a .ts file. */
const templatesOf = (path: string): string[] => {
  const text = readFileSync(path, "utf8");
  if (path.endsWith(".html")) return [text];
  return [...text.matchAll(/template:\s*`([\s\S]*?)`/g)].map((m) => m[1] ?? "");
};

// Blanks what may hold letters without being prose: interpolations, control flow, comments, bound
// attributes, tag names with their attributes, and keycaps, which name a physical key (Space, Esc) as it is
// printed on the keyboard. What is left between tags is text a user would read.
const prose = (template: string): string[] =>
  template
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<kbd[^>]*>[\s\S]*?<\/kbd>/g, " ")
    .replace(/="[^"]*"/g, '=""')
    .replace(/\{\{[\s\S]*?\}\}/g, " ")
    .replace(
      /@(if|else if|for|switch|case|default|let|defer|empty|placeholder|loading)\b[^{]*\{/g,
      " ",
    )
    .replace(/@else\s*\{/g, " ")
    .replace(/<[^>]*>/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[{}();]/g, " ").trim())
    .filter((line) => /\p{L}{2,}/u.test(line));

// Attributes a user reads or hears; a literal there ships in one language whatever the learner picked.
const TEXT_ATTRIBUTES =
  /\s(aria-label|title|placeholder|alt)="([^"]*\p{L}{2,}[^"]*)"/gu;

describe("templates", () => {
  it("hold no prose that bypasses the catalog", () => {
    const found: string[] = [];
    for (const path of files(APP))
      for (const template of templatesOf(path)) {
        for (const line of prose(template)) found.push(`${path}: ${line}`);
        for (const match of template.matchAll(TEXT_ATTRIBUTES))
          found.push(`${path}: ${match[1] ?? ""}="${match[2] ?? ""}"`);
      }
    expect(found).toEqual([]);
  });
});
