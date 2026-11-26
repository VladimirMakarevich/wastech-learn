import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

export interface StaticFile {
  readonly body: Uint8Array<ArrayBuffer>;
  readonly type: string;
}

const isFile = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isFile();
  } catch {
    // Missing or unreadable: either way there is no file to serve at this path.
    return false;
  }
};

/**
 * A file under `dir` for a URL path, never outside it: the decoded path is normalized and must stay below
 * `dir`, so `..` or an encoded separator cannot reach the rest of the disk.
 */
export const fileUnder = async (
  dir: string,
  urlPath: string,
): Promise<StaticFile | undefined> => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    // A malformed escape names no file.
    return undefined;
  }
  if (decoded.includes("\0")) return undefined;
  const relative = normalize(decoded).replace(/^([/\\])+/, "");
  if (relative.startsWith("..")) return undefined;
  const path = join(dir, relative);
  if (path !== dir && !path.startsWith(`${dir}${sep}`)) return undefined;
  if (!(await isFile(path))) return undefined;
  return {
    body: new Uint8Array(await readFile(path)),
    type:
      CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream",
  };
};

/**
 * The app's built files, with every path that names no file and has no extension answered by
 * `index.html`: the app routes `/topic/…` itself, and a reload or a link opened in a new tab must land
 * there too. A missing `.js` stays a 404 instead of turning into HTML the browser would try to run.
 */
export const appFile = async (
  appDir: string,
  urlPath: string,
): Promise<StaticFile | undefined> =>
  (await fileUnder(appDir, urlPath)) ??
  (extname(urlPath) === "" ? fileUnder(appDir, "index.html") : undefined);
