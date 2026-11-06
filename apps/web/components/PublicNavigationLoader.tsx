"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  publicNavigationEvent,
  publicNavigationResetEvent,
} from "@/lib/public-navigation";
import LandingLoader from "./LandingLoader";

function NavigationFeedback() {
  const pathname = usePathname();

  const search = useSearchParams().toString();

  const [phase, setPhase] = useState<"idle" | "pending" | "leaving">("idle");

  const [attempt, setAttempt] = useState(0);

  const started = useRef<number | null>(null);

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }

    if (recoveryTimer.current) {
      clearTimeout(recoveryTimer.current);
    }

    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
    }

    started.current = null;

    setPhase("idle");
  }, []);

  useEffect(() => {
    function begin() {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }

      if (recoveryTimer.current) {
        clearTimeout(recoveryTimer.current);
      }

      if (exitTimer.current) {
        clearTimeout(exitTimer.current);
      }

      started.current = performance.now();

      setAttempt((current) => {
        return current + 1;
      });

      setPhase("pending");

      // Clear abandoned feedback if a navigation fails to commit.
      recoveryTimer.current = setTimeout(reset, 15000);
    }

    window.addEventListener(publicNavigationEvent, begin);

    window.addEventListener(publicNavigationResetEvent, reset);

    window.addEventListener("pageshow", reset);

    window.addEventListener("pagehide", reset);

    return () => {
      window.removeEventListener(publicNavigationEvent, begin);

      window.removeEventListener(publicNavigationResetEvent, reset);

      window.removeEventListener("pageshow", reset);

      window.removeEventListener("pagehide", reset);

      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }

      if (recoveryTimer.current) {
        clearTimeout(recoveryTimer.current);
      }

      if (exitTimer.current) {
        clearTimeout(exitTimer.current);
      }
    };
  }, [reset]);

  useEffect(() => {
    if (started.current === null) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const remaining = Math.max(
      0,
      (reducedMotion ? 320 : 620) - (performance.now() - started.current),
    );

    dismissTimer.current = setTimeout(() => {
      started.current = null;

      if (recoveryTimer.current) {
        clearTimeout(recoveryTimer.current);
      }

      setPhase("leaving");

      exitTimer.current = setTimeout(reset, reducedMotion ? 0 : 840);
    }, remaining);
  }, [pathname, search, reset]);

  if (phase === "idle") {
    return null;
  }

  return <LandingLoader key={attempt} phase={phase} />;
}

export default function PublicNavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationFeedback />
    </Suspense>
  );
}
