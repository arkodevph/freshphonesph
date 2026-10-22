export function systemHref(path: string): string | null {
  const origin = process.env.NEXT_PUBLIC_SYSTEM_URL?.replace(/\/$/, "");

  if (origin) {
    return `${origin}${path}`;
  }

  return process.env.NEXT_PUBLIC_SITE_TARGET === "landing" ? null : path;
}

export const landingHref =
  process.env.NEXT_PUBLIC_LANDING_URL || "http://localhost:3001";
