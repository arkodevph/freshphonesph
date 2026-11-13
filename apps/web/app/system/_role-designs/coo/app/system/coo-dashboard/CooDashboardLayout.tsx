"use client";

import type { Me } from "@/lib/api";
import { can } from "@/lib/useMe";
import { canOpenWorkspace } from "@/lib/workspace-access";
import { availableRoute } from "@/lib/backend";
import { PRESENTATION_MODE } from "@/lib/presentation";
import {
  Box,
  UserCircle,
  Wallet,
  ChatRoundDots,
  FileText,
  Calendar,
  Add,
  CheckCircle,
} from "@/app/system/_role-designs/coo/components/SolarIcons";
import Link from "next/link";
import CooSummary from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooSummary";
import type { useCooOverview } from "@/app/system/coo-dashboard/useCooOverview";
import { useWorkspaceMotion } from "@/lib/useWorkspaceMotion";
import CooCollections from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooCollections";
import CooTasks from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooTasks";
import CooFollowUps from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooFollowUps";
import styles from "@/app/system/_role-designs/coo/app/system/coo-dashboard/coo-dashboard.module.css";

const shortcuts = [
  {
    href: "/system/operations-monitor",
    label: "Operations monitor",
    detail: "Waiting reviews and follow-ups",
    icon: CheckCircle,
  },
  {
    href: "/system/payments",
    label: "Payments & Finance",
    detail: "Review and record payments",
    icon: Wallet,
  },
  {
    href: "/system/records",
    label: "Paluwagan records",
    detail: "Batches and installment schedules",
    icon: Box,
  },
  {
    href: "/system/clients",
    label: "Clients",
    detail: "Members and their records",
    icon: UserCircle,
  },
  {
    href: "/system/support",
    label: "Customer service",
    detail: "Respond to customer concerns",
    icon: ChatRoundDots,
  },
  {
    href: "/system/enrollments",
    label: "Enrollments",
    detail: "Applications and group membership",
    icon: FileText,
  },
  {
    href: "/system/recruitment",
    label: "Recruitment",
    detail: "Job openings and applications",
    icon: Add,
  },
  {
    href: "/system/hr-actions",
    label: "HR action approvals",
    detail: "Review staff recommendations",
    icon: CheckCircle,
  },
  {
    href: "/system/tasks",
    label: "Tasks & KPI",
    detail: "Assignments and submissions",
    icon: Calendar,
  },
];

export default function CooDashboardLayout({
  me,
  overview,
  loading = false,
}: {
  me: Me;
  overview: ReturnType<typeof useCooOverview>;
  loading?: boolean;
}) {
  const { summary, error, pending, refresh } = overview;

  const motion = useWorkspaceMotion();

  const taskAccess = canOpenWorkspace(me.role, "/system/tasks", me.permissions);

  const customerWork =
    can(me, "SUPPORT_MANAGE", "PAYMENT_VERIFY") ||
    ["system_admin", "records"].includes(me.role ?? "");

  const links = shortcuts
    .filter(({ href }) => {
      return (
        availableRoute(href) && canOpenWorkspace(me.role, href, me.permissions)
      );
    })
    .filter(({ href }) => {
      return href !== "/system/payments";
    })
    .slice(0, 4);

  const firstName = me.full_name.trim().split(/\s+/)[0];

  return (
    <div
      className={styles.dashboard}
      ref={motion}
      data-loading={loading || undefined}
    >
      <header className={styles.heading}>
        <div>
          <h2>{firstName ? `Hello, ${firstName}.` : "Hello."}</h2>
        </div>
        <div className={styles.headingActions}>
          {PRESENTATION_MODE && (
            <span className={styles.sample}>Sample data</span>
          )}
          {canOpenWorkspace(me.role, "/system/payments", me.permissions) && (
            <Link href="/system/payments" className={styles.primaryAction}>
              <Wallet />
              Payments &amp; Finance
            </Link>
          )}
        </div>
      </header>
      <div className={styles.overview}>
        <CooSummary
          summary={summary}
          error={error}
          pending={pending}
          refresh={refresh}
          reports={canOpenWorkspace(me.role, "/system/reports", me.permissions)}
        />
        {can(me, "REPORT_VIEW") && <CooCollections loading={loading} />}
      </div>
      <div className={styles.workArea}>
        {customerWork && <CooFollowUps me={me} loading={loading} />}
        {taskAccess && <CooTasks loading={loading} />}
      </div>
      <section
        className={`${styles.panel} ${styles.toolsPanel}`}
        aria-labelledby="staff-shortcuts-title"
      >
        <header className={styles.panelHeader}>
          <div>
            <h3 id="staff-shortcuts-title">Your workspaces</h3>
            <p>The tools your team uses every day.</p>
          </div>
          <span className={styles.toolsNote}>Quick access</span>
        </header>
        <nav className={styles.shortcuts} aria-label="Dashboard shortcuts">
          {links.map(({ href, label, detail, icon: Icon }) => {
            return (
              <Link key={href} href={href}>
                <span className={styles.shortcutIcon}>
                  <Icon />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
              </Link>
            );
          })}
        </nav>
      </section>
      <p className={styles.footer}>
        Payments are made externally. Only Finance-verified payments update a
        member&apos;s balance.
      </p>
    </div>
  );
}
