import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  materialsDocument,
  parseContent,
  readDocument,
  readMaterials,
  sectionMarkdown,
  summaryDocument,
  summaryTemplateFor,
  writeDocument,
  type SummarySectionName,
} from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import { loadContentFiles } from "../src/index.js";
import { GOLDEN } from "./helpers.js";

const markdownFiles = async (): Promise<[string, string][]> =>
  [...(await loadContentFiles(GOLDEN))].filter(([path]) =>
    path.endsWith(".md"),
  );

describe("serialization against the golden sample", () => {
  it("reads and writes every content file back byte for byte", async () => {
    const files = await markdownFiles();
    expect(files.length).toBeGreaterThan(30);
    for (const [path, text] of files) {
      const document = readDocument(text);
      expect([
        path,
        document === undefined ? undefined : writeDocument(document),
      ]).toEqual([path, text]);
    }
  });

  it("rebuilds every summary from its sections into the same file", async () => {
    const { model } = await parseContent(await loadContentFiles(GOLDEN));
    for (const topic of model.topics) {
      const summary = topic.summary;
      if (summary === undefined)
        throw new Error(`${topic.path} has no summary`);
      const text = await readFile(join(GOLDEN, summary.file), "utf8");
      const sections = Object.fromEntries(
        summary.sections.map((section) => [section.name, section.markdown]),
      ) as Partial<Record<SummarySectionName, string>>;
      const rebuilt = writeDocument(
        summaryDocument({
          title: summary.title ?? "",
          status: summary.frontMatter.status,
          updated: summary.frontMatter.updated,
          template: summaryTemplateFor(topic.domain),
          sections,
        }),
      );
      expect([summary.file, rebuilt]).toEqual([summary.file, text]);
    }
  });

  it("parses every materials table into items and writes the same file from them", async () => {
    const { model } = await parseContent(await loadContentFiles(GOLDEN));
    for (const topic of model.topics) {
      const materials = topic.materials;
      if (materials === undefined)
        throw new Error(`${topic.path} has no materials`);
      const text = await readFile(join(GOLDEN, materials.file), "utf8");
      const items = readMaterials(
        sectionMarkdown(
          readDocument(text) ?? { frontMatter: "", head: "", sections: [] },
          "Materials",
        ) ?? "",
      );
      expect(items.length).toBeGreaterThan(0);
      const rebuilt = writeDocument(
        materialsDocument({
          title: materials.title ?? "",
          updated: materials.frontMatter.updated,
          items,
        }),
      );
      expect([materials.file, rebuilt]).toEqual([materials.file, text]);
    }
  });
});
