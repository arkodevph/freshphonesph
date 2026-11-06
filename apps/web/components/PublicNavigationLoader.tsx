"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  publicNavigationEvent,
  publicNavigationResetEvent,
} from "@/lib/public-navigation";
import LandingCloudIntro from "./LandingCloudIntro";

function NavigationFeedback() {
  const pathname = usePathname();

  const search = useSearchParams().toString();

  const [active, setActive] = useState(false);

  const [ready, setReady] = useState(false);

  const [attempt, setAttempt] = useState(0);

  const pending = useRef(false);

  const previousRoute = useRef(`${pathname}?${search}`);

  const historyRoute = useRef(`${pathname}?${search}`);

  const awaitingRoute = useRef(false);

  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (recoveryTimer.current) {
      clearTimeout(recoveryTimer.current);
    }

    pending.current = false;

    setActive(false);
  }, []);

  useEffect(() => {
    function begin(committed = false) {
      if (recoveryTimer.current) {
        clearTimeout(recoveryTimer.current);
      }

      pending.current = true;

      awaitingRoute.current = !committed;

      document.documentElement.dataset.publicNavigationStarted = "true";

      setReady(committed);

      setAttempt((current) => {
        return current + 1;
      });

      setActive(true);

      // Release the page if routing fails to commit.
      recoveryTimer.current = setTimeout(reset, 15000);
    }

    function onBegin() {
      begin();
    }

    function onPopState() {
      const route = `${window.location.pathname}?${window.location.search.slice(1)}`;

      const privateRoute = /^\/(?:system|portal)(?:\/|\?|$)/;

      if (
        route !== historyRoute.current &&
        !privateRoute.test(route) &&
        !privateRoute.test(historyRoute.current)
      ) {
        historyRoute.current = route;

        begin(previousRoute.current === route);
      }
    }

    window.addEventListener(publicNavigationEvent, onBegin);

    window.addEventListener(publicNavigationResetEvent, reset);

    // Start before Next updates the route snapshot for a history navigation.
    window.addEventListener("popstate", onPopState, true);

    window.addEventListener("pageshow", reset);

    window.addEventListener("pagehide", reset);

    return () => {
      window.removeEventListener(publicNavigationEvent, onBegin);

      window.removeEventListener(publicNavigationResetEvent, reset);

      window.removeEventListener("popstate", onPopState, true);

      window.removeEventListener("pageshow", reset);

      window.removeEventListener("pagehide", reset);

      if (recoveryTimer.current) {
        clearTimeout(recoveryTimer.current);
      }
    };
  }, [reset]);

  useEffect(() => {
    const route = `${pathname}?${search}`;

    if (route !== previousRoute.current) {
      if (pending.current) {
        setReady(true);
      }

      // Preserve the source for popstate even if React commits before the event.
      if (pending.current || awaitingRoute.current) {
        historyRoute.current = route;

        awaitingRoute.current = false;
      }
    }

    previousRoute.current = route;
  }, [pathname, search]);

  if (!active) {
    return null;
  }

  return (
    <LandingCloudIntro
      key={attempt}
      navigation
      ready={ready}
      onComplete={reset}
    />
  );
}

export default function PublicNavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationFeedback />
    </Suspense>
  );
}
