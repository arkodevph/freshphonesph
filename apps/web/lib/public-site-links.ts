export type PublicSiteBase = "" | "/v2";

export function publicSiteHref(path: string, base: PublicSiteBase = "") {
  if (!base || !path.startsWith("/") || path.startsWith("//")) {
    return path;
  }

  if (
    path === base ||
    path.startsWith(`${base}/`) ||
    path.startsWith(`${base}#`) ||
    path.startsWith(`${base}?`)
  ) {
    return path;
  }

  if (path === "/" || path.startsWith("/#") || path.startsWith("/?")) {
    return `${base}${path.slice(1)}`;
  }

  return `${base}${path}`;
}
