"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import {
  publicNavigationKind,
  publicNavigationEvent,
  publicNavigationResetEvent,
} from "@/lib/public-navigation";

export default function PublicNavigationLink({
  href,
  onClick,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      !href ||
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

    const kind = publicNavigationKind(window.location.href, href);

    if (kind) {
      window.dispatchEvent(
        new Event(
          kind === "page" ? publicNavigationEvent : publicNavigationResetEvent,
        ),
      );
    }
  }

  if (!href) {
    return (
      <a {...props} onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <Link {...props} href={href} onClick={handleClick}>
      {children}
    </Link>
  );
}
