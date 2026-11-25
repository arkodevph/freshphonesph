"use client";

import Link from "next/link";
import { ArrowClockwise, FileText, Plus, Stack, Users } from "@phosphor-icons/react";
import type { Page, PublicEnrollmentApplication, WithdrawalPage } from "@freshphones/contracts";
import { useAgentResource } from "@/lib/useAgentResource";
import { useMe } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import type { Network } from "../people/AgentNetworkDirectory";
import type { EnrollmentPage } from "../enrollments/enrollment-types";
import styles from "./agent-dashboard.module.css";

function date(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
}

function Failure({ error, retry }: { error: string; retry: () => Promise<void> }) {
  return <div className={styles.state} role="alert"><p>{error}</p><button type="button" onClick={() => { void retry(); }}>Try again</button></div>;
}

export default function AgentDashboard() {
  const me = useMe();
  const network = useAgentResource<Network>("/agent-network");
  const applications = useAgentResource<Page<PublicEnrollmentApplication>>("/enrollment/applications?status=RECEIVED&page=1");
  const requests = useAgentResource<EnrollmentPage>("/enrollment/requests?page=1");
  const withdrawals = useAgentResource<WithdrawalPage>("/withdrawals?status=AWAITING_AGENT&page=1");
  const pending = network.data?.enrollmentCounts.find(row => row.status === "PENDING")?.count ?? 0;
  const refreshing = network.loading || applications.loading || requests.loading || withdrawals.loading;
  const profile = network.data?.agents.find(person => person.id === String(me?.id));
  function refresh() {
    void network.refresh(); void applications.refresh(); void requests.refresh(); void withdrawals.refresh();
  }
  return (
    <div className={styles.workspace}>
      <div className={styles.heading}>
        <div><p>{new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" })}</p><h2>Your enrollment desk</h2></div>
        <div className={styles.actions}><button type="button" aria-label="Refresh agent dashboard" disabled={refreshing} onClick={refresh}><ArrowClockwise size={18} /></button><Link className={styles.primary} href="/system/enrollments?view=requests&new=1"><Plus size={17} />Submit enrollment</Link></div>
      </div>
      <div className={styles.grid}>
        <div className={styles.main}>
          <section className={styles.panel} aria-labelledby="application-inbox-title" aria-busy={applications.loading}>
            <header className={styles.panelHeading}><div><span className={styles.eyebrow}>Needs your review</span><h2 id="application-inbox-title">Website applications <span className={styles.count}>{applications.error ? "—" : applications.data?.total ?? "—"}</span></h2></div><Link href="/system/enrollments?view=applications">All applications</Link></header>
            {applications.error ? <Failure error={applications.error} retry={applications.refresh} /> : !applications.data ? <WorkspaceProgress label="Loading applications…" /> : !applications.data.items.length ? <div className={styles.empty}><FileText size={30} weight="light" /><h3>No applications to review</h3><p>New website applications assigned to you appear here.</p><Link href="/system/enrollments?view=applications">View application history</Link></div> : <ul className={styles.rows}>{applications.data.items.slice(0, 5).map(application => <li key={application.id}><span className={styles.avatar}>{application.contact.name.slice(0, 1)}</span><div><strong>{application.contact.name}</strong><small>{application.contact.phone || application.contact.email || "Contact details in application"} · {date(application.createdAt)}</small></div><Link className={styles.review} href={`/system/enrollments?view=applications&application=${encodeURIComponent(application.id)}`}>Review</Link></li>)}</ul>}
            {applications.data && applications.data.total > 5 && <p className={styles.footnote}>Showing 5 of {applications.data.total} received applications.</p>}
          </section>
          <section className={styles.panel} aria-labelledby="recent-enrollments-title" aria-busy={requests.loading}>
            <header className={styles.panelHeading}><h2 id="recent-enrollments-title">Enrollment handoffs</h2><Link href="/system/enrollments?view=requests">All requests</Link></header>
            {requests.error ? <Failure error={requests.error} retry={requests.refresh} /> : !requests.data ? <WorkspaceProgress label="Loading enrollment requests…" /> : !requests.data.items.length ? <p className={styles.state}>No enrollment requests submitted yet.</p> : <ul className={styles.rows}>{requests.data.items.slice(0, 4).map(request => <li key={request.id}><span className={styles.avatar}><Users size={18} /></span><div><strong>{request.name}</strong><small>{request.batchCode}</small></div><Link className={styles.requestLink} href={`/system/enrollments?request=${encodeURIComponent(request.id)}`}><span data-status={request.status}>{request.status === "PENDING" ? "With Manager" : request.status === "APPROVED" ? "Approved" : "Rejected"}</span><small>View request</small></Link></li>)}</ul>}
          </section>
        </div>
        <aside className={styles.rail}>
          <section className={styles.identity} aria-label="Agent assignment"><span className={styles.identityIcon}><Users size={23} /></span><div><h2>{me?.full_name ?? "Agent"}</h2><p>{profile?.agentProfile?.code ?? (network.error ? "Assignment unavailable" : network.loading ? "Loading assignment…" : "Agent code not assigned")}</p><small>Pioneer · {profile?.supervisor?.name ?? (network.loading || network.error ? "—" : "Not assigned")}</small></div></section>
          <section className={styles.panel} aria-labelledby="assigned-batches-title" aria-busy={network.loading}>
            <header className={styles.panelHeading}><h2 id="assigned-batches-title">Assigned batches <span className={styles.count}>{network.error ? "—" : network.data?.batches.length ?? "—"}</span></h2></header>
            {network.error ? <Failure error={network.error} retry={network.refresh} /> : !network.data ? <WorkspaceProgress label="Loading assigned batches…" /> : !network.data.batches.length ? <p className={styles.state}>No batches assigned. Ask the COO to link your Agent profile and batch assignments.</p> : <ul className={styles.batches}>{network.data.batches.slice(0, 3).map(batch => <li key={batch.id}><Stack size={20} /><div><strong>{batch.code}</strong><small>{batch.model}</small><span>{batch._count.clients} memberships · {batch.status.toLowerCase().replaceAll("_", " ")}</span></div></li>)}</ul>}
            <Link className={styles.footerLink} href="/system/agent-network">Open your network</Link>
          </section>
          <section className={styles.panel} aria-label="Agent follow-up">
            <h2>Follow-up</h2><Link className={styles.followup} href="/system/enrollments?view=requests&status=PENDING"><span>With Batch Manager</span><strong>{network.loading || network.error ? "—" : pending}</strong></Link><Link className={styles.followup} href="/system/withdrawals?status=AWAITING_AGENT"><span>Withdrawals to review</span><strong>{withdrawals.error ? "—" : withdrawals.data?.total ?? "—"}</strong></Link>
            {withdrawals.error && <Failure error={withdrawals.error} retry={withdrawals.refresh} />}
            <Link className={styles.footerLink} href="/system/tasks">View assigned tasks</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
