"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportKind } from "@freshphones/contracts";
import {
  financeReportHref,
  financeReportLocation,
} from "@/lib/finance-navigation";
import type { ReportFilters } from "@/lib/report-filters";

export function useFinanceReportLocation({
  kind,
  filters,
  page,
  earnings,
  allowed,
  restore,
}: {
  kind: ReportKind;
  filters: ReportFilters;
  page: number;
  earnings: boolean;
  allowed: readonly ReportKind[];
  restore: (state: ReturnType<typeof financeReportLocation>) => void;
}) {
  const [ready, setReady] = useState(false);

  const apply = useRef(restore);

  apply.current = restore;

  const allowedKey = allowed.join(",");

  useEffect(() => {
    const read = () => {
      apply.current(
        financeReportLocation(
          window.location.search,
          allowedKey.split(",") as ReportKind[],
        ),
      );

      setReady(true);
    };

    read();

    window.addEventListener("popstate", read);

    return () => {
      return window.removeEventListener("popstate", read);
    };
  }, [allowedKey]);

  const href = financeReportHref(kind, filters, page);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const next = new URL(href, window.location.origin);

    if (earnings) {
      next.searchParams.set("report", "earnings");
    }

    if (next.href !== window.location.href) {
      window.history.replaceState(null, "", next);
    }
  }, [href, earnings, ready]);

  return ready;
}
