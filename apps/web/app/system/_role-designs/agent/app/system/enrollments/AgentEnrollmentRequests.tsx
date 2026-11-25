"use client";

import { useEffect, useState } from "react";
import { useAgentResource } from "@/lib/useAgentResource";
import { useToastNotice } from "@/lib/useToastNotice";
import EnrollmentRequests from "./EnrollmentRequests";
import EnrollmentSubmission, { type BatchChoice } from "./EnrollmentSubmission";
import type { EnrollmentPage } from "./enrollment-types";
import styles from "./enrollment-workspace.module.css";

export default function AgentEnrollmentRequests({ requestId }: { requestId?: string }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useToastNotice("");
  const params = new URLSearchParams({ page: String(page), ...(status ? { status } : {}), ...(requestId ? { requestId } : {}) });
  const requests = useAgentResource<EnrollmentPage>(`/enrollment/requests?${params}`);
  const batches = useAgentResource<BatchChoice[]>("/enrollment/batches");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setOpen(query.get("new") === "1");
    if (["PENDING", "APPROVED", "REJECTED"].includes(query.get("status") ?? "")) { setStatus(query.get("status")!); }
  }, []);
  function close() {
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  return <div className={styles.workspace}>
    <header className={styles.heading}><h2>Enrollment requests</h2><div className={styles.actions}><button type="button" className={styles.button} disabled={requests.loading} onClick={() => { void requests.refresh(); }}>Refresh</button><button type="button" className={styles.primary} onClick={() => { setOpen(true); }}>Submit enrollment</button></div></header>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {requestId && <p className={styles.notice}>Request opened from your notification. <a href="/system/enrollments?view=requests">View all requests</a></p>}
    {requests.error && <div className={styles.error} role="alert"><p>{requests.error}</p><button type="button" className={styles.button} onClick={() => { void requests.refresh(); }}>Retry enrollment requests</button></div>}
    <EnrollmentRequests items={requests.data?.items ?? []} total={requests.error ? null : requests.data?.total ?? null} page={page} pageSize={requests.data?.pageSize ?? 20} status={status} loading={requests.loading} busy={false} canReview={false} focusedId={requestId} reasons={{}} confirmReplacement={null} error={null} onStatus={value => { setStatus(value); setPage(1); }} onPage={setPage} onReason={() => {}} onConfirm={() => {}} onRefresh={requests.refresh} onReview={async () => {}} />
    <EnrollmentSubmission open={open} close={close} batches={batches.data ?? []} batchError={batches.error} retryBatches={batches.refresh} saved={() => { setNotice("Enrollment submitted. Awaiting the assigned Batch Manager’s approval."); void requests.refresh(); }} />
  </div>;
}
