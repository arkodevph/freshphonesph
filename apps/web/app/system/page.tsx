"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  CheckCircle,
  Headset,
  ListChecks,
  Receipt,
  ShieldCheck,
  Stack,
  Users,
} from "@phosphor-icons/react";
import { useMe, can } from "@/lib/useMe";
import DashboardCards from "./DashboardCards";
import PaymentsCta from "./PaymentsCta";
import CustomerWorkQueues from "./CustomerWorkQueues";
import { availableRoute, TYPESCRIPT_API } from "@/lib/backend";

const SHORTCUTS = [
  { icon: Stack, label: "Open batches", detail: "Paluwagan records", href: "/system/records", perms: ["BATCH_READ", "BATCH_MANAGE"] },
  { icon: Users, label: "Open clients", detail: "Members and schedules", href: "/system/clients", perms: ["CLIENT_READ", "CLIENT_MANAGE"] },
  { icon: Receipt, label: "Review payments", detail: "Record and verify", href: "/system/payments", perms: ["PAYMENT_READ", "PAYMENT_RECORD"] },
  { icon: Headset, label: "Support cases", detail: "Customer concerns", href: "/system/support", perms: ["SUPPORT_MANAGE"] },
] as const;

export default function DashboardPage() {
  const me = useMe();
  const hasCustomerWork = TYPESCRIPT_API && (can(me, "SUPPORT_MANAGE", "PAYMENT_VERIFY") || me?.role === "owner" || me?.role === "records");
  const displayName = me?.full_name?.split(" ")[0] ?? "there";
  const date = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="system-dashboard">
      <div className="system-dashboard-intro">
        <div>
          <p>{date}</p>
          <h2>Good day, {displayName}</h2>
          <span>Here&apos;s the latest view of your operations.</span>
        </div>
        <div className="system-live-status">
          <span /> Live data
        </div>
      </div>

      <div className="system-hero-grid">
        <section className="system-welcome-card">
          <div className="system-welcome-copy">
            <span className="system-card-kicker">Operations workspace</span>
            <h3>Everything your team needs, in one clear view.</h3>
            <p>
              Track batches, customer schedules, payment verification, and support
              work without leaving the dashboard.
            </p>
            <PaymentsCta />
          </div>
          <div className="system-hero-visual" aria-hidden="true">
            <div className="system-hero-orbit orbit-one" />
            <div className="system-hero-orbit orbit-two" />
            <div className="system-hero-phone">
              <span className="system-hero-camera" />
              <span className="system-hero-camera camera-two" />
              <span className="system-hero-logo">FP</span>
            </div>
            <div className="system-hero-check"><CheckCircle weight="fill" /></div>
          </div>
        </section>

        <aside className="system-policy-card">
          <div className="system-panel-heading">
            <div>
              <span className="system-card-kicker">System status</span>
              <h3>Operations safeguards</h3>
            </div>
            <ShieldCheck weight="fill" className="h-6 w-6 text-[#5548ff]" />
          </div>
          <ul className="system-status-list">
            <li><span className="status-dot is-green" /><div><strong>Database connected</strong><small>Local development environment</small></div></li>
            <li><span className="status-dot is-violet" /><div><strong>{TYPESCRIPT_API ? "Installment schedules enabled" : "Finance verification active"}</strong><small>{TYPESCRIPT_API ? "Agreed totals preserved for enrolled clients" : "Only verified payments affect balances"}</small></div></li>
            <li><span className="status-dot is-blue" /><div><strong>Role access enabled</strong><small>Module permissions enforced by API</small></div></li>
          </ul>
        </aside>
      </div>

      <DashboardCards />

      {hasCustomerWork && <section className="mb-6" aria-label="Customer work waiting for staff">
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-700 uppercase tracking-widest text-violet-700">Customer follow-up</p><h3 className="font-display text-lg font-700 text-blue-ink">Waiting for your team</h3></div><Link href="/system/customer-work" className="text-xs font-700 text-violet-700 hover:underline">Open work queue</Link></div>
        <CustomerWorkQueues compact />
      </section>}

      <div className="system-dashboard-grid">
        <section className="system-panel system-shortcuts-panel">
          <div className="system-panel-heading">
            <div>
              <span className="system-card-kicker">Daily tools</span>
              <h3>Quick access</h3>
            </div>
            <span className="system-panel-note">Core modules</span>
          </div>
          <div className="system-shortcuts">
            {can(me, "RECRUITMENT_MANAGE") && availableRoute("/system/recruitment") && (
              <Link href="/system/recruitment" className="system-shortcut">
                <span className="system-shortcut-icon"><Briefcase weight="fill" /></span>
                <span className="min-w-0 flex-1"><strong>Manage job board</strong><small>Openings and applications</small></span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
            {SHORTCUTS.filter(({ href, perms }) => availableRoute(href) && can(me, ...perms)).map(({ icon: Icon, label, detail, href }) => (
              <Link key={href} href={href} className="system-shortcut">
                <span className="system-shortcut-icon"><Icon weight="fill" /></span>
                <span className="min-w-0 flex-1">
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </section>

        <section className="system-panel system-workflow-panel">
          <div className="system-panel-heading">
            <div>
              <span className="system-card-kicker">Required process</span>
              <h3>Payment workflow</h3>
            </div>
            <Receipt className="h-6 w-6 text-[#5548ff]" weight="fill" />
          </div>
          <ol className="system-workflow">
            <li><span>1</span><div><strong>Record</strong><small>Staff enters external payment details.</small></div></li>
            <li><span>2</span><div><strong>Verify</strong><small>Finance checks proof and reference.</small></div></li>
            <li><span>3</span><div><strong>Update</strong><small>Verified amount changes the balance.</small></div></li>
          </ol>
          {availableRoute("/system/tasks") && <Link href="/system/tasks" className="system-text-link">
            <ListChecks weight="bold" /> View assigned tasks <ArrowUpRight />
          </Link>}
        </section>
      </div>
    </div>
  );
}
