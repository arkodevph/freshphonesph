"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { TYPESCRIPT_API } from "@/lib/backend";
import styles from "./customer-portal-tour.module.css";

type TourMode = "desktop" | "tablet" | "mobile";
type TourStep = { target: string; label: string; title: string; description: string };
type TourPosition = {
  spotlight: CSSProperties | null;
  tooltip: CSSProperties | null;
  placement: "center" | "right" | "left" | "top" | "bottom";
};

const DESKTOP_STEPS: TourStep[] = [
  { target: "overview", label: "Overview", title: "Start with your account.", description: "See your unit, balance, next installment, and anything that needs your attention." },
  { target: "membership", label: "My membership", title: "Check your enrolled unit.", description: "Review your device, batch, and key membership dates. You can request a correction here too." },
  { target: "schedule", label: "Payment schedule", title: "Know what is due next.", description: "See installment dates, expected amounts, and how verified payments apply to your plan." },
  { target: "payments", label: "Verified payments", title: "Follow your payment record.", description: "View payments approved by Finance, payments awaiting review, and your account documents." },
  { target: "documents", label: "My documents", title: "Keep your requirements ready.", description: "Upload requested files and follow their review status in one place." },
  { target: "updates", label: "Updates & support", title: "Stay informed and ask for help.", description: "Check release progress and notifications, or contact Customer Service about your account." },
];

const TABLET_STEPS: TourStep[] = [
  { target: "menu", label: "Menu", title: "Find your customer pages.", description: "Open the menu for your membership, payment plan, documents, release status, and support." },
  { target: "search", label: "Search", title: "Jump to a page.", description: "Search the customer portal when you know what you need." },
  { target: "notifications", label: "Notifications", title: "Catch up on updates.", description: "Preview recent payment, release, and support updates from the bell." },
  { target: "account", label: "Your account", title: "Manage your account.", description: "Open Settings for your profile, appearance, and password, or sign out safely." },
];

const MOBILE_STEPS: TourStep[] = [
  { target: "overview", label: "Home", title: "Start with your account.", description: "Your unit, balance, next installment, and important tasks are together here." },
  { target: "membership", label: "Unit", title: "Check your enrolled unit.", description: "Review your device, batch, and membership dates." },
  { target: "schedule", label: "Plan", title: "Know what is due next.", description: "See your installment schedule and how much remains on each payment." },
  { target: "payments", label: "Payments", title: "Follow your payment record.", description: "Find Finance-verified payments, pending records, and account documents." },
  { target: "more", label: "More", title: "Keep the rest close.", description: "Open More for documents, release status, notifications, support, settings, and this tour." },
];

const STORAGE_PREFIX = "freshphones:customer-portal-tour:v1:";
const CENTER: TourPosition = { spotlight: null, tooltip: null, placement: "center" };
const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);
const modeForWidth = (width: number): TourMode => width <= 700 ? "mobile" : width <= 900 ? "tablet" : "desktop";

function readStatus(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeStatus(key: string, status: "skipped" | "completed") {
  try { window.localStorage.setItem(key, status); } catch { /* Replay remains available without storage. */ }
}

function measureStep(targetName: string, mode: TourMode, dialogHeight: number): TourPosition {
  const target = document.querySelector<HTMLElement>(`[data-customer-tour-${mode}="${targetName}"]`);
  if (!target || !target.getClientRects().length) return CENTER;
  const rect = target.getBoundingClientRect();
  const padding = 16;
  const gap = 18;
  const width = Math.min(360, window.innerWidth - padding * 2);
  const height = dialogHeight || 310;
  const left = clamp(rect.left - 6, 4, window.innerWidth - 40);
  const top = clamp(rect.top - 6, 4, window.innerHeight - 40);
  const spotlight = {
    left, top,
    width: Math.max(36, Math.min(rect.width + 12, window.innerWidth - left - 4)),
    height: Math.max(36, Math.min(rect.height + 12, window.innerHeight - top - 4)),
  };

  let placement: TourPosition["placement"] = "right";
  let tooltipLeft = rect.right + gap;
  let tooltipTop = clamp(rect.top, padding, Math.max(padding, window.innerHeight - height - padding));
  if (tooltipLeft + width > window.innerWidth - padding) {
    if (rect.left - gap - width >= padding) {
      placement = "left";
      tooltipLeft = rect.left - gap - width;
    } else {
      placement = rect.bottom + gap + height <= window.innerHeight ? "bottom" : "top";
      tooltipLeft = clamp(rect.left, padding, Math.max(padding, window.innerWidth - width - padding));
      tooltipTop = placement === "bottom" ? rect.bottom + gap : Math.max(padding, rect.top - height - gap);
    }
  }
  return { spotlight, tooltip: { left: tooltipLeft, top: tooltipTop, width }, placement };
}

export function useCustomerPortalTour({ autoStart, accountId }: { autoStart: boolean; accountId?: string | number | null }) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<TourMode>("desktop");
  const [viewportReady, setViewportReady] = useState(false);
  const [position, setPosition] = useState<TourPosition>(CENTER);
  const modeRef = useRef<TourMode>("desktop");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const autoStartedKey = useRef<string | null>(null);
  const steps = mode === "mobile" ? MOBILE_STEPS : mode === "tablet" ? (TYPESCRIPT_API ? TABLET_STEPS : TABLET_STEPS.filter((step) => step.target !== "notifications")) : (TYPESCRIPT_API ? DESKTOP_STEPS : DESKTOP_STEPS.filter((step) => step.target !== "documents"));
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const nextStep = steps[stepIndex + 1];
  const storageKey = accountId == null ? null : `${STORAGE_PREFIX}${accountId}`;

  const startTour = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event?.currentTarget ?? null;
    setStepIndex(0);
    setPosition(CENTER);
    setOpen(true);
  }, []);

  const closeTour = useCallback((status: "skipped" | "completed") => {
    if (storageKey) writeStatus(storageKey, status);
    setOpen(false);
    window.requestAnimationFrame(() => {
      const fallback = modeRef.current === "mobile"
        ? document.querySelector<HTMLButtonElement>('[data-customer-tour-mobile="more"]')
        : modeRef.current === "tablet"
          ? document.querySelector<HTMLButtonElement>('[data-customer-tour-tablet="menu"]')
          : document.querySelector<HTMLButtonElement>('[data-customer-tour-replay="desktop"]');
      const trigger = triggerRef.current;
      (trigger?.isConnected && trigger.getClientRects().length ? trigger : fallback)?.focus();
    });
  }, [storageKey]);

  useEffect(() => {
    const onResize = () => {
      const next = modeForWidth(window.innerWidth);
      if (modeRef.current !== next) {
        modeRef.current = next;
        setMode(next);
        setStepIndex(0);
      }
      setViewportReady(true);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!autoStart || !storageKey || !viewportReady || autoStartedKey.current === storageKey) return;
    autoStartedKey.current = storageKey;
    if (!readStatus(storageKey)) startTour();
  }, [autoStart, storageKey, viewportReady, startTour]);

  const updatePosition = useCallback(() => {
    setPosition(measureStep(step.target, mode, dialogRef.current?.getBoundingClientRect().height ?? 310));
  }, [step.target, mode]);

  useLayoutEffect(() => {
    if (!open) return;
    const target = document.querySelector<HTMLElement>(`[data-customer-tour-${mode}="${step.target}"]`);
    if (target && target.getClientRects().length) {
      const rect = target.getBoundingClientRect();
      if (mode !== "mobile" && (rect.top < 8 || rect.bottom > window.innerHeight - 8)) {
        target.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    }
    updatePosition();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(updatePosition) : null;
    if (target) observer?.observe(target);
    if (dialogRef.current) observer?.observe(dialogRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, mode, step.target, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const shell = document.querySelector<HTMLElement>(".portal-shell");
    shell?.setAttribute("inert", "");
    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
      shell?.removeAttribute("inert");
    };
  }, [open, stepIndex]);

  const onDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); closeTour("skipped"); return; }
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === event.currentTarget) { event.preventDefault(); first?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  const overlay = open && typeof document !== "undefined" ? createPortal(<div className={styles.tourLayer}>
    {position.spotlight ? <div className={styles.tourSpotlight} style={position.spotlight} aria-hidden="true" /> : <div className={styles.tourBackdrop} aria-hidden="true" />}
    <section ref={dialogRef} className={`${styles.tourDialog} ${position.placement === "center" ? styles.tourCentered : ""}`} style={position.tooltip ?? undefined}
      role="dialog" aria-modal="true" aria-labelledby="customer-tour-label customer-tour-title" aria-describedby="customer-tour-description" tabIndex={-1} onKeyDown={onDialogKeyDown}>
      <div className={styles.tourHeader}>
        <div className={styles.tourProgress} role="status" aria-live="polite" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
          <div aria-hidden="true"><span>Customer tour</span><small>{stepIndex + 1} of {steps.length}</small></div>
          <span className={styles.tourTrack} aria-hidden="true"><span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></span>
        </div>
        <button type="button" className={styles.tourSkip} onClick={() => closeTour("skipped")}>Skip tour</button>
      </div>
      <span id="customer-tour-label" className={styles.tourLabel}>{step.label}</span>
      <h2 id="customer-tour-title">{step.title}</h2>
      <p id="customer-tour-description">{step.description}</p>
      <div className={styles.tourActions}>
        <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => current - 1)}>Back</button>
        <button type="button" className={styles.tourNext} onClick={() => nextStep ? setStepIndex((current) => current + 1) : closeTour("completed")}>
          {nextStep ? `Next: ${nextStep.label}` : "Finish tour"}
        </button>
      </div>
    </section>
  </div>, document.body) : null;

  return { startTour, overlay };
}
