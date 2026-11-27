import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** The content copy this run serves; scenarios read its log and edit its files. */
export const contentRoot = (): string => {
  const root = process.env.E2E_CONTENT;
  if (root === undefined) throw new Error("E2E_CONTENT is not set");
  return root;
};

export interface LoggedEvent {
  readonly id: string;
  readonly ts: string;
  readonly kind: string;
  readonly item: string;
  readonly writer: string;
  readonly device: string;
  readonly rating?: number;
  readonly confidence?: number | null;
  readonly durMs?: number;
  readonly contentHash?: string;
  readonly sched: string;
  readonly target?: string;
}

/** Every event the app wrote into this device's web log, in file order. */
export const webEvents = async (): Promise<LoggedEvent[]> => {
  const dir = join(contentRoot(), "reviews", "e2e");
  let files: string[];
  try {
    files = (await readdir(dir))
      .filter((file) => file.startsWith("web-"))
      .sort();
  } catch {
    // No web log yet: the app has not written anything.
    return [];
  }
  const events: LoggedEvent[] = [];
  for (const file of files)
    for (const line of (await readFile(join(dir, file), "utf8")).split("\n"))
      if (line.trim() !== "") events.push(JSON.parse(line) as LoggedEvent);
  return events;
};

/** Edits a file of the copy and hands back a function that puts the old text back. */
export const editFile = async (
  file: string,
  edit: (text: string) => string,
): Promise<() => Promise<void>> => {
  const path = join(contentRoot(), file);
  const before = await readFile(path, "utf8");
  await writeFile(path, edit(before));
  return () => writeFile(path, before);
};
