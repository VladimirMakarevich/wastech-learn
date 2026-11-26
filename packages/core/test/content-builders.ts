// Builders for small in-memory repositories: core never reads files, so its tests hand it the same
// `path → text` map a host would load.

export interface CardSpec {
  readonly id?: string;
  readonly type?: string;
  readonly status?: string | null;
  readonly extraFrontMatter?: string;
  readonly question?: string;
  readonly answer?: string;
  readonly rest?: string;
}

export const cardText = (spec: CardSpec = {}): string => {
  const lines = [
    "---",
    `id: ${spec.id ?? "7k2m9xqd"}`,
    `type: ${spec.type ?? "basic"}`,
    ...(spec.status === null ? [] : [`status: ${spec.status ?? "active"}`]),
    "bloom: understand",
    "grading: self",
    "origin: manual",
    "created: 2026-11-25",
    ...(spec.extraFrontMatter === undefined ? [] : [spec.extraFrontMatter]),
    "---",
    "",
    "# Title",
    "",
    "## Question",
    "",
    spec.question ?? "[Ctx] What is it?",
    "",
    "## Answer",
    "",
    spec.answer ?? "A short answer.",
    "",
    spec.rest ??
      ["## Sources", "", "- [Summary: TL;DR](../summary.md#tldr)"].join("\n"),
    "",
  ];
  return lines.join("\n");
};

export const topicFiles = (
  domain = "arch",
  topic = "flow",
  lang = "en",
): [string, string][] => [
  [
    `content/${domain}/${topic}/index.md`,
    [
      "---",
      "title: Flow",
      `domain: ${domain}`,
      `lang: ${lang}`,
      "status: active",
      "familiarity: new",
      "created: 2026-11-25",
      "origin: manual",
      "---",
      "",
      "# Flow",
      "",
      "## Key idea",
      "",
      "Idea.",
      "",
    ].join("\n"),
  ],
  [
    `content/${domain}/${topic}/summary.md`,
    "---\nstatus: active\nupdated: 2026-11-25\n---\n\n# Flow\n\n## TL;DR\n\nShort.\n",
  ],
  [
    `content/${domain}/${topic}/materials.md`,
    "---\nupdated: 2026-11-25\n---\n\n# Flow: materials\n\n## Materials\n\nNone.\n",
  ],
];

export const repoWith = (
  cards: readonly (CardSpec & { readonly file?: string })[],
  extra: readonly [string, string][] = [],
): Map<string, string> =>
  new Map<string, string>([
    ...topicFiles(),
    ...cards.map((spec, index): [string, string] => {
      const id = spec.id ?? `card${String(index).padStart(4, "0")}`;
      return [
        spec.file ?? `content/arch/flow/cards/${id}.md`,
        cardText({ ...spec, id }),
      ];
    }),
    ...extra,
  ]);
