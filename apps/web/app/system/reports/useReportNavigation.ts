"use client";

import { useEffect, useRef } from "react";
import type { ReportKind } from "@freshphones/contracts";

export function useReportNavigation({
  allowedKinds,
  value,
  onChange,
  disabled,
}: {
  allowedKinds: readonly ReportKind[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const change = useRef(onChange);

  change.current = onChange;

  const allowed = allowedKinds.join(",");

  useEffect(() => {
    if (disabled) {
      return;
    }

    function restore() {
      const selected = new URLSearchParams(window.location.search).get(
        "report",
      );

      const kinds = allowed.split(",");

      const valid =
        selected &&
        (kinds.includes(selected) ||
          (selected === "earnings" && kinds.includes("collections")));

      change.current(valid ? selected : kinds[0] || "tasks");
    }

    restore();

    window.addEventListener("popstate", restore);

    return () => window.removeEventListener("popstate", restore);
  }, [allowed, disabled]);

  function navigate(next: string) {
    if (disabled || next === value) {
      return;
    }

    const url = new URL(window.location.href);

    url.searchParams.set("report", next);

    window.history.pushState({ reportReturn: value }, "", url);

    change.current(next);
  }

  function back(fallback: string) {
    if (disabled) {
      return;
    }

    if (window.history.state?.reportReturn === fallback) {
      window.history.back();
    } else {
      navigate(fallback);
    }
  }

  return { navigate, back };
}
