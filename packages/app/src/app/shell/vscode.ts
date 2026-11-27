/**
 * A link that opens a repository file in VS Code at a line. The content path is the server's absolute
 * path; separators are normalized so a Windows path makes a valid URL too.
 */
export const vscodeLink = (
  root: string,
  file: string,
  line?: number,
): string => {
  const path = `${root.replace(/\\/g, "/").replace(/\/+$/, "")}/${file}`;
  const encoded = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const absolute = encoded.startsWith("/") ? encoded : `/${encoded}`;
  return `vscode://file${absolute}${line === undefined ? "" : `:${String(line)}`}`;
};
