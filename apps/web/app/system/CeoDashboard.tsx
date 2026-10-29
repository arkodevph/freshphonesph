"use client";

import { ArrowUpRight, ChartBar, ShieldCheck } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import PortalBannerArt from "../portal/PortalBannerArt";
import DashboardCards from "./DashboardCards";
import ExecutiveCharts from "./ExecutiveCharts";
import styles from "./ceo-portal.module.css";

export default function CeoDashboard({ name }: { name: string }) {
  return (
    <div className={styles.dashboard}>
      <header className={styles.intro}>
        <div>
          <nav aria-label="Breadcrumb">
            <span aria-current="page">Dashboard</span>
          </nav>
          <h1>
            Hi, {name.split(" ")[0]} <span aria-hidden="true">✦</span>
          </h1>
        </div>
        <span className={styles.recordsLabel}>
          <i aria-hidden="true" /> Company reports
        </span>
      </header>

      <div className={styles.overview}>
        <section
          className={styles.banner}
          aria-labelledby="ceo-reports-heading"
        >
          <PortalBannerArt variant="plan" />
          <div className={styles.bannerTop}>
            <span className={styles.bannerIcon}>
              <ChartBar weight="duotone" aria-hidden="true" />
            </span>
            <span className={styles.accessBadge}>
              <ShieldCheck aria-hidden="true" /> Report-only access
            </span>
          </div>
          <div className={styles.bannerCopy}>
            <p>CEO overview</p>
            <h2 id="ceo-reports-heading">Review your business performance</h2>
            <span>
              Collections, batch progress and your team&apos;s reports.
            </span>
            <Link href="/system/reports">
              Open reports <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
          <Image
            className={styles.deviceArt}
            src="/products/iphone-16-overlap-transparent.png"
            alt=""
            width={1024}
            height={1536}
            sizes="(max-width: 700px) 120px, 200px"
          />
        </section>

        <aside className={styles.summary} aria-labelledby="ceo-company-summary">
          <header>
            <h2 id="ceo-company-summary">Company overview</h2>
            <ChartBar aria-hidden="true" />
          </header>
          <p>Current totals · all payment dates</p>
          <DashboardCards summary />
        </aside>
      </div>

      <ExecutiveCharts />
      <p className={styles.note}>
        <ShieldCheck aria-hidden="true" /> Figures use Finance-verified records.
        Open Reports for filters, saved figures and submitted analysis.
      </p>
    </div>
  );
}
