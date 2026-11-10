"use client";

import Link, { type LinkProps } from "next/link";
import {
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";
import {
  publicNavigationKind,
  publicNavigationEvent,
  publicNavigationResetEvent,
  publicPreviewHref,
} from "@/lib/public-navigation";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> &
  Pick<LinkProps, "prefetch" | "replace" | "scroll">;

export default function PublicNavigationLink({
  href,
  onClick,
  children,
  prefetch,
  replace,
  scroll,
  ...props
}: Props) {
  const [previewDevice, setPreviewDevice] = useState(false);

  useEffect(() => {
    setPreviewDevice(new URLSearchParams(window.location.search).has("_mvua"));
  }, []);

  // Keep the server and initial client render identical before reading preview state.
  const navigationHref = previewDevice
    ? publicPreviewHref(window.location.href, href)
    : href;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      !navigationHref ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.hasAttribute("download") ||
      (event.currentTarget.target && event.currentTarget.target !== "_self")
    ) {
      return;
    }

    const kind = publicNavigationKind(window.location.href, navigationHref);

    if (kind) {
      window.dispatchEvent(
        new Event(
          kind === "page" ? publicNavigationEvent : publicNavigationResetEvent,
        ),
      );
    }
  }

  const nativeAnchor =
    previewDevice &&
    navigationHref?.startsWith("#") &&
    !replace &&
    scroll !== false;

  if (!navigationHref || nativeAnchor) {
    return (
      <a {...props} href={navigationHref} onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <Link
      {...props}
      href={navigationHref}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
