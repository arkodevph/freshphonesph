"use client";

import { useEffect, useRef, useState } from "react";
import {
  gcashHistoryStatuses,
  type GcashHistoryStatus,
} from "@freshphones/contracts";
import type { useGcashHistory } from "@/app/system/gcash-history/useGcashHistory";
import { financePage } from "@/lib/finance-navigation";

export function useFinanceGcashLocation(
  work: ReturnType<typeof useGcashHistory>,
) {
  const [ready, setReady] = useState(false);

  const current = useRef(work);

  current.current = work;

  useEffect(() => {
    const restore = () => {
      const query = new URLSearchParams(window.location.search);

      current.current.setQuery((query.get("q") ?? "").slice(0, 100));

      const status = query.get("status");

      current.current.setStatus(
        gcashHistoryStatuses.includes(status as GcashHistoryStatus)
          ? (status as GcashHistoryStatus)
          : "",
      );

      current.current.setArchived(
        query.get("archived") === "archived" ? "archived" : "active",
      );

      current.current.setPage(financePage(query.get("page")));

      setReady(true);
    };

    restore();

    window.addEventListener("popstate", restore);

    return () => {
      return window.removeEventListener("popstate", restore);
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const url = new URL(window.location.href);

    for (const key of ["q", "status", "archived", "page"]) {
      url.searchParams.delete(key);
    }

    if (work.query) {
      url.searchParams.set("q", work.query);
    }

    if (work.status) {
      url.searchParams.set("status", work.status);
    }

    if (work.archived === "archived") {
      url.searchParams.set("archived", "archived");
    }

    if (work.page > 1) {
      url.searchParams.set("page", String(work.page));
    }

    if (url.href !== window.location.href) {
      window.history.replaceState(null, "", url);
    }
  }, [ready, work.query, work.status, work.archived, work.page]);
}
