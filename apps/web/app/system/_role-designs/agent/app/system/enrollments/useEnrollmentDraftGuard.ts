"use client";

import { useEffect } from "react";

/** Drafts are tab-memory only; warn before ordinary document/link departure. */
export function useEnrollmentDraftGuard(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function link(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest("a[href]");

      if (
        !anchor ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (
        !window.confirm(
          "Leave this enrollment workspace? Unsaved details and any unconfirmed attempt are kept only while this workspace stays open. Confirm the original result before starting another request.",
        )
      ) {
        event.preventDefault();

        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", warn);

    document.addEventListener("click", link, true);

    return () => {
      window.removeEventListener("beforeunload", warn);

      document.removeEventListener("click", link, true);
    };
  }, [active]);
}
