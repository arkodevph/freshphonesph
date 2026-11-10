export const publicNavigationEvent = "freshphones:public-navigation";

export const publicNavigationResetEvent = "freshphones:public-navigation-reset";

const mobileViewModes = new Set([
  "mv-ios-v1",
  "mv-android-v1",
  "mv-ios-tablet-v1",
  "mv-android-tablet-v1",
  "mv-desktop-v1",
]);

export function publicPreviewHref(
  currentHref: string,
  destination: string | undefined,
) {
  if (!destination || destination.startsWith("#")) {
    return destination;
  }

  try {
    const current = new URL(currentHref);

    const device = current.searchParams.get("_mvua");

    if (!device || !mobileViewModes.has(device)) {
      return destination;
    }

    const next = new URL(destination, current);

    if (
      !["http:", "https:"].includes(next.protocol) ||
      next.origin !== current.origin
    ) {
      return destination;
    }

    // Mobile View otherwise intercepts the click and forces a document reload.
    next.searchParams.set("_mvua", device);

    if (
      next.pathname === current.pathname &&
      next.search === current.search &&
      next.hash
    ) {
      return next.hash;
    }

    return `${next.pathname}${next.search}${next.hash}`;
  } catch {
    return destination;
  }
}

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
