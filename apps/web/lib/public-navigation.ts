export const publicNavigationEvent = "freshphones:public-navigation";

export const publicNavigationResetEvent = "freshphones:public-navigation-reset";

export function publicNavigationKind(
  currentHref: string,
  destination: string,
): "page" | "same-page" | null {
  try {
    const current = new URL(currentHref);

    const next = new URL(destination, current);

    if (!["http:", "https:"].includes(next.protocol)) {
      return null;
    }

    const changed =
      next.origin !== current.origin ||
      next.pathname !== current.pathname ||
      next.search !== current.search;

    return changed ? "page" : "same-page";
  } catch {
    return null;
  }
}

export function isPageNavigation(currentHref: string, destination: string) {
  return publicNavigationKind(currentHref, destination) === "page";
}
