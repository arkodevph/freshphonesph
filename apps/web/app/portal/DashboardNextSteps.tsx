"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarBlank, CaretLeft, CaretRight, ChatCircleText, FileText, Truck } from "@phosphor-icons/react";
import type { PortalAttention } from "@/lib/portal-attention";
import styles from "./dashboard-next-steps.module.css";

type LoadStatus = "loading" | "ready" | "error";
type IllustrationKind = "payments" | "identity" | "agreement" | "support";
type Props = {
  items: PortalAttention[];
  attentionStatus: LoadStatus;
  recordsStatus: LoadStatus;
  support: { count: number; href: string };
  release: { status: string; description: string; updatedAt?: string };
  installment: { amount: string; description: string };
  onRetry: () => void;
};

function appearance(href: string) {
  if (href.startsWith("/portal/schedule")) return { label: "Payments", icon: CalendarBlank, tone: styles.sky, illustration: "payments" as const };
  if (href.startsWith("/portal/documents")) return { label: "Documents", icon: FileText, tone: href.includes("PHOTO_ID") ? styles.teal : styles.peach, illustration: href.includes("PHOTO_ID") ? "identity" as const : "agreement" as const };
  return { label: "Support", icon: ChatCircleText, tone: styles.teal, illustration: "support" as const };
}

function ActionIllustration({ kind }: { kind: IllustrationKind }) {
  return <Image src={`/portal/illustrations/${kind}.png`} alt="" fill sizes="(max-width: 700px) 85vw, (max-width: 900px) 45vw, 33vw" />;
}

function LoadingCards() {
  return <div className={styles.loadingCards} aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <div className={styles.loadingCard} key={index}><span className={`${styles.placeholder} ${styles.loadingIllustration}`} /><span className={styles.placeholder} /><span className={styles.placeholder} /><span className={styles.placeholder} /></div>)}</div>;
}

export function DashboardNextStepsSkeleton() {
  return <section className={styles.nextSteps} aria-hidden="true"><div className={styles.statusTiles}>{Array.from({ length: 3 }, (_, index) => <div className={styles.statusTile} key={index}><span className={`${styles.placeholder} ${styles.loadingIcon}`} /><div className={styles.statusCopy}><span className={styles.placeholder} /><span className={styles.placeholder} /></div></div>)}</div><span className={`${styles.placeholder} ${styles.loadingHeading}`} /><LoadingCards /></section>;
}

export default function DashboardNextSteps({ items, attentionStatus, recordsStatus, support, release, installment, onRetry }: Props) {
  const rail = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState({ previous: false, next: false });
  const ready = attentionStatus === "ready" && recordsStatus === "ready";
  const failed = attentionStatus === "error" || recordsStatus === "error";
  const cards: PortalAttention[] = ready ? [...items, ...(support.count > 0 ? [{
    key: "support-tracking",
    title: support.count === 1 ? "1 open support request" : `${support.count} open support requests`,
    detail: "Track the status and any update from Customer Service.",
    href: support.href,
    action: support.count === 1 ? "Track support request" : "Track support requests",
  }] : [])] : [];

  useEffect(() => {
    const list = rail.current;
    if (!list) return;
    const update = () => setCanScroll({ previous: list.scrollLeft > 2, next: list.scrollLeft + list.clientWidth < list.scrollWidth - 2 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); list.removeEventListener("scroll", update); };
  }, [cards.length, ready]);

  function browse(direction: number) {
    const list = rail.current;
    if (!list) return;
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    const distance = (list.firstElementChild?.getBoundingClientRect().width ?? list.clientWidth) + gap;
    list.scrollBy({ left: direction * distance, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  return <section className={styles.nextSteps} aria-labelledby="attention-title">
    <div className={styles.statusTiles}>
      <Link href="/portal/schedule" className={`${styles.statusTile} ${styles.sky}`} title={installment.description}>
        <span className={styles.tileIcon}><CalendarBlank weight="duotone" aria-hidden="true" /></span>
        <span className={styles.statusCopy}><small>{installment.description}</small><strong>{installment.amount}</strong><span>Installment plan</span></span><ArrowRight className={styles.tileArrow} aria-hidden="true" />
      </Link>
      <Link href="/portal/release" className={`${styles.statusTile} ${styles.peach}`} title={`${release.description}${release.updatedAt ? ` Last release update: ${release.updatedAt}` : ""}`}>
        <span className={styles.tileIcon}><Truck weight="duotone" aria-hidden="true" /></span>
        <span className={styles.statusCopy}><small>Unit status</small><strong className={styles.releaseStatus}>{release.status}</strong><span>Release &amp; fulfillment</span></span><ArrowRight className={styles.tileArrow} aria-hidden="true" />
      </Link>
      <Link href={support.href} className={`${styles.statusTile} ${styles.teal}`}>
        <span className={styles.tileIcon}><ChatCircleText weight="duotone" aria-hidden="true" /></span>
        <span className={styles.statusCopy}><small>{attentionStatus === "error" ? "Requests unavailable" : attentionStatus === "loading" ? "Checking requests…" : `${support.count} open ${support.count === 1 ? "request" : "requests"}`}</small><strong>Customer support</strong><span>Follow your concerns</span></span><ArrowRight className={styles.tileArrow} aria-hidden="true" />
      </Link>
    </div>

    <header className={styles.heading}>
      <div><p>Your next steps</p><h2 id="attention-title">Needs your attention</h2></div>
      <div className={styles.browseControls}>
        {ready && items.length > 0 && <span className={styles.count}>{items.length} {items.length === 1 ? "item" : "items"}</span>}
        {cards.length > 0 && <><button type="button" aria-label="Previous action cards" aria-controls="portal-next-step-cards" disabled={!canScroll.previous} onClick={() => browse(-1)}><CaretLeft weight="bold" aria-hidden="true" /></button><button type="button" className={styles.nextButton} aria-label="Next action cards" aria-controls="portal-next-step-cards" disabled={!canScroll.next} onClick={() => browse(1)}><CaretRight weight="bold" aria-hidden="true" /></button></>}
      </div>
    </header>

    {ready && items.length === 0 && cards.length > 0 && <p className={styles.clearState} role="status">No action needed from the records available right now. You can follow your open requests below.</p>}
    {failed ? <div className={styles.state} role="alert"><p>We couldn’t check all of your records right now.</p><button type="button" onClick={onRetry}>Try again</button></div>
      : !ready ? <div role="status" aria-label="Checking your documents, requests, and installment plan"><LoadingCards /></div>
      : cards.length === 0 ? <p className={styles.state} role="status">No action needed from the records available right now. Check back for updates.</p>
      : <ul id="portal-next-step-cards" ref={rail} className={styles.cardRail} aria-label="Account actions">{cards.map(item => {
        const { label, icon: Icon, tone, illustration } = appearance(item.href);
        return <li key={item.key}><Link href={item.href} className={`${styles.actionCard} ${tone}`}>
          <div className={styles.illustration}><ActionIllustration kind={illustration} /></div>
          <div className={styles.cardBody}><span className={styles.category}><Icon weight="bold" aria-hidden="true" />{label}</span><h3>{item.title}</h3><p>{item.detail}</p><span className={styles.cardAction}>{item.action}<ArrowRight weight="bold" aria-hidden="true" /></span></div>
        </Link></li>;
      })}</ul>}
  </section>;
}
