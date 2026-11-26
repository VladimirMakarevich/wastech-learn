// Repository paths are POSIX strings in the core, which cannot use node:path and must give the same
// answer in the browser.

export const posixDirname = (path: string): string => {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
};

/**
 * Resolves a relative link of a Markdown file to a repository path, or `undefined` when it is not a
 * repository path (an absolute URL, an anchor, or a link that climbs out of the repository).
 */
export const resolveRelative = (
  fromFile: string,
  url: string,
): string | undefined => {
  if (
    url === "" ||
    url.startsWith("#") ||
    url.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(url)
  ) {
    return undefined;
  }
  const target = decodeURI(url.split("#")[0]?.split("?")[0] ?? "");
  const parts = posixDirname(fromFile)
    .split("/")
    .filter((part) => part !== "");
  for (const part of target.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return undefined;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
};
