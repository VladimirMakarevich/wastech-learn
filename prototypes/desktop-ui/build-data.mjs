// data.js — снимок golden sample, чтобы прототип открывался из файла, без сервера и без сборки.
// Конвейер тот же, что задуман для настоящего content bundle (remark + GFM, Shiki, SVG inline):
// прототип должен показывать реальный рендер, а не заглушку.
//
// Использование: node prototypes/desktop-ui/build-data.mjs ../wastech-learn-content
import { readFileSync, writeFileSync, globSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";
import { codeToHtml } from "shiki";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(
  process.argv[2] ?? join(here, "../../../wastech-learn-content"),
);
if (!existsSync(join(root, "content")))
  throw new Error(`content/ not found in ${root}`);

/**
 * @param {string} src
 * @returns {[Record<string, unknown>, string]}
 */
const split = (src) => {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? [YAML.parse(m[1] ?? ""), src.slice(m[0].length)] : [{}, src];
};

/** @param {string} file */
const svgUri = (file) =>
  `data:image/svg+xml;base64,${readFileSync(file).toString("base64")}`;

/**
 * @param {string} md
 * @param {string} file
 * @returns {Promise<string>}
 */
async function mdToHtml(md, file) {
  const tree = remark().use(remarkGfm).parse(md);
  /** @type {Promise<void>[]} */
  const jobs = [];
  visit(tree, (node, index, parent) => {
    if (node.type === "code" && parent && index !== undefined) {
      jobs.push(
        codeToHtml(node.value, {
          lang: node.lang || "text",
          theme: "github-light",
        }).then((html) => {
          parent.children[index] = { type: "html", value: html };
        }),
      );
    }
    if (node.type === "image" && !/^https?:/.test(node.url)) {
      const p = resolve(dirname(file), node.url);
      if (existsSync(p) && p.endsWith(".svg")) node.url = svgUri(p);
    }
    if (node.type === "link") {
      const t = node.url;
      const topic = t.match(/(?:\.\.\/)+([a-z0-9-]+\/[a-z0-9-]+)\/index\.md$/);
      if (topic) {
        node.url = "#topics";
        node.data = { hProperties: { dataTopic: topic[1] } };
      } else if (/^https?:/.test(t))
        node.data = { hProperties: { target: "_blank", rel: ["noopener"] } };
    }
  });
  await Promise.all(jobs);
  return toHtml(toHast(tree, { allowDangerousHtml: true }), {
    allowDangerousHtml: true,
  });
}

/**
 * @param {string} body
 * @returns {Record<string, string>}
 */
const sections = (body) => {
  /** @type {Record<string, string>} */
  const out = {};
  const parts = body.split(/^## /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    out[part.slice(0, nl).trim()] = part.slice(nl + 1).trim();
  }
  return out;
};

/** @type {Record<string, unknown>[]} */
const topics = [];
/** @type {Record<string, unknown>[]} */
const cards = [];
for (const idx of globSync("content/*/*/index.md", { cwd: root }).sort()) {
  const dir = posix.dirname(idx);
  const path = dir.replace(/^content\//, "");
  const [fm, body] = split(readFileSync(join(root, idx), "utf8"));
  const idxSec = sections(body);
  const sumFile = join(root, dir, "summary.md");
  const [sumFm, sumBody] = split(readFileSync(sumFile, "utf8"));
  const sumSec = sections(sumBody);
  /** @type {{ title: string, html: string }[]} */
  const summary = [];
  for (const [title, md] of Object.entries(sumSec)) {
    summary.push({ title, html: await mdToHtml(md, sumFile) });
  }
  const matFile = join(root, dir, "materials.md");
  const [, matBody] = split(readFileSync(matFile, "utf8"));
  topics.push({
    path,
    ...fm,
    keyIdea: idxSec["Key idea"] ?? "",
    pretest: (idxSec["Pretest"] ?? "")
      .split("\n")
      .filter((l) => /^\d+\./.test(l))
      .map((l) => l.replace(/^\d+\.\s*/, "")),
    updated: sumFm.updated,
    summary,
    materialsHtml: await mdToHtml(
      sections(matBody)["Materials"] ?? "",
      matFile,
    ),
  });

  for (const cf of globSync(`${dir}/cards/*.md`, { cwd: root }).sort()) {
    const file = join(root, cf);
    const [cfm, cbody] = split(readFileSync(file, "utf8"));
    const title = cbody.match(/^# (.+)$/m)?.[1] ?? String(cfm.id);
    const sec = sections(cbody);
    const rubric = (sec["Rubric"] ?? "")
      .split("\n")
      .filter((l) => l.startsWith("- "))
      .map((l) => ({
        required: l.includes("(!)"),
        text: l.replace(/^- (\(!\)\s*)?/, ""),
      }));
    cards.push({
      ...cfm,
      topic: path,
      title,
      file: relative(root, file),
      questionHtml: await mdToHtml(sec["Question"] ?? "", file),
      questionText: (sec["Question"] ?? "")
        .replace(/```[\s\S]*?```/g, "")
        .trim(),
      answerHtml: await mdToHtml(sec["Answer"] ?? "", file),
      explanationHtml: sec["Explanation"]
        ? await mdToHtml(sec["Explanation"], file)
        : "",
      rubric,
    });
  }
}

const out = join(here, "data.js");
writeFileSync(
  out,
  `// Сгенерировано build-data.mjs из golden sample wastech-learn-content. Не править вручную.\n` +
    `window.LEARN_DATA = ${JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), topics, cards })};\n`,
);
console.log(`data.js: ${topics.length} topics, ${cards.length} cards`);
