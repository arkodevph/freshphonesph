export function systemHref(path: string): string | null {
  if (process.env.NEXT_PUBLIC_SITE_TARGET !== "landing") {
    return path;
  }

  const origin = process.env.NEXT_PUBLIC_SYSTEM_URL?.replace(/\/$/, "");

  if (origin) {
    return `${origin}${path}`;
  }

  return null;
}

export const landingHref = "/";
