import {
  LearnError,
  readDocument,
  type ContentDocument,
  type ContentLang,
} from "@wastech-learn/core";
import type { Snapshot } from "../workspace.js";

/** Where a topic lives, from its `<domain>/<topic>` path. */
export const topicDir = (topic: string): string => `content/${topic}`;

export interface TopicFiles {
  readonly dir: string;
  readonly domain: string;
  readonly indexPath: string;
  readonly index: ContentDocument;
}

/**
 * The topic a write goes to, read from the snapshot. A write into a topic that does not exist would
 * create files no index lists; it is refused with a pointer to `create_topic` instead.
 */
export const requireTopic = (snapshot: Snapshot, topic: string): TopicFiles => {
  const dir = topicDir(topic);
  const indexPath = `${dir}/index.md`;
  const text = snapshot.files.get(indexPath);
  const index = text === undefined ? undefined : readDocument(text);
  if (index === undefined) {
    throw new LearnError("topic-not-found", `Topic ${topic} does not exist`, {
      subject: topic,
    });
  }
  return { dir, domain: topic.split("/")[0] ?? "", indexPath, index };
};

/** The language of a topic, from its index; the model holds it once the index parsed. */
export const topicLang = (snapshot: Snapshot, topic: string): ContentLang =>
  snapshot.parsed.model.topics.find((candidate) => candidate.path === topic)
    ?.index.frontMatter.lang ?? "en";
