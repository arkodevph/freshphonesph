"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeLiveRecords } from "./live-records";
import {
  addNavigationUpdates,
  isCurrentNavigationRoute,
} from "./navigation-updates";

export function useNavigationUpdates(
  accountId: string,
  pathname: string,
  paths: readonly string[],
  enabled: boolean,
) {
  const [snapshot, setSnapshot] = useState<{
    accountId: string;
    paths: readonly string[];
  } | null>(null);

  const currentPath = useRef(pathname);

  const allowedKey = paths.join(",");

  const storageKey = `freshphones:sidebar-updates:${accountId}`;

  useEffect(() => {
    currentPath.current = pathname;

    setSnapshot((previous) => {
      if (!previous || previous.accountId !== accountId) {
        return previous;
      }

      const next = previous.paths.filter((href) => {
        return !isCurrentNavigationRoute(href, pathname);
      });

      return next.length === previous.paths.length
        ? previous
        : { accountId, paths: next };
    });
  }, [accountId, pathname]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const allowed = allowedKey.split(",");

    let restored: string[] = [];

    try {
      const saved: unknown = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "[]",
      );

      if (Array.isArray(saved)) {
        restored = saved.filter((href): href is string => {
          return (
            typeof href === "string" &&
            allowed.includes(href) &&
            !isCurrentNavigationRoute(href, currentPath.current)
          );
        });
      }
    } catch {
      // Badges still work when browser storage is unavailable.
    }

    setSnapshot({ accountId, paths: [...new Set(restored)] });

    const unsubscribe = subscribeLiveRecords((change) => {
      setSnapshot((previous) => {
        const current = previous?.accountId === accountId ? previous.paths : [];

        const next = addNavigationUpdates(
          current,
          change,
          allowed,
          currentPath.current,
          document.visibilityState === "visible",
        );

        return next === current ? previous : { accountId, paths: next };
      });
    });

    function acknowledgeVisiblePage() {
      if (document.visibilityState !== "visible") {
        return;
      }

      setSnapshot((previous) => {
        if (!previous || previous.accountId !== accountId) {
          return previous;
        }

        const next = previous.paths.filter((href) => {
          return !isCurrentNavigationRoute(href, currentPath.current);
        });

        return next.length === previous.paths.length
          ? previous
          : { accountId, paths: next };
      });
    }

    document.addEventListener("visibilitychange", acknowledgeVisiblePage);

    return () => {
      unsubscribe();

      document.removeEventListener("visibilitychange", acknowledgeVisiblePage);
    };
  }, [accountId, allowedKey, enabled, storageKey]);

  useEffect(() => {
    if (enabled && snapshot?.accountId === accountId) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(snapshot.paths));
      } catch {
        // Storage is optional; the current session can keep badges in memory.
      }
    }
  }, [accountId, enabled, snapshot, storageKey]);

  return new Set(
    enabled && snapshot?.accountId === accountId ? snapshot.paths : [],
  );
}
