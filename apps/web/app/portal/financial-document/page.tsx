"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, DownloadSimple, Printer } from "@phosphor-icons/react";
import type { Client, ClientBalance, Payment, User } from "@freshphones/contracts";
import { tsRequest } from "@/lib/ts-api";
import { downloadAccountPdf } from "@/lib/account-pdf";
import styles from "./financial-document.module.css";

type Statement = { title: string; notice: string; generatedAt: string; balance: ClientBalance; verifiedPayments: Pick<Payment, "id" | "amount" | "paymentDate" | "method" | "referenceNumber">[] };
type Confirmation = { title: string; notice: string; generatedAt: string; payment: Payment };
const money = (value: string) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value));
const day = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

export default function FinancialDocumentPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [document, setDocument] = useState<Statement | Confirmation | null>(null);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentId = query.get("payment");
    if (paymentId && !/^[0-9a-f-]{36}$/i.test(paymentId)) { setError("Invalid payment reference."); return; }
    void (async () => {
      try {
        const user = await tsRequest<User>("/auth/me");
        if (user.role !== "CUSTOMER" || !user.clientId) { router.replace("/login"); return; }
        const [account, record] = await Promise.all([
          tsRequest<Client>(`/clients/${user.clientId}`),
          paymentId ? tsRequest<Confirmation>(`/payments/${paymentId}/confirmation`) : tsRequest<Statement>(`/clients/${user.clientId}/statement`),
        ]);
        setClient(account);
        setDocument(record);
      } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load this document."); }
    })();
  }, [router]);

  return <main className={styles.page}>
    <div className={styles.actions}><Link href="/portal/payments"><ArrowLeft aria-hidden="true" /> Back to payments</Link><button type="button" disabled={!document || !client || downloading} onClick={() => { if (!document || !client) return; setDownloadError(""); setDownloading(true); void downloadAccountPdf(client, document).catch((caught) => setDownloadError(caught instanceof Error ? caught.message : "Could not download PDF.")).finally(() => setDownloading(false)); }}><DownloadSimple aria-hidden="true" /> {downloading ? "Preparing PDF…" : "Download PDF"}</button><button type="button" disabled={!document} onClick={() => window.print()}><Printer aria-hidden="true" /> Print</button></div>
    {downloadError && <p className={styles.message} role="alert">{downloadError}</p>}
    {error ? <p className={styles.message} role="alert">{error}</p> : !document || !client ? <p className={styles.message}>Loading your document…</p> :
      <article className={styles.sheet}>
        <header><p className={styles.brand}>Fresh Phones <span>PH</span></p><p>FP Gadget Center</p><h1>{document.title}</h1><p>Generated {new Date(document.generatedAt).toLocaleString("en-PH")}</p></header>
        <dl className={styles.details}><div><dt>Customer</dt><dd>{client.name}</dd></div><div><dt>Batch</dt><dd>{client.batch.code}</dd></div><div><dt>Unit</dt><dd>{client.unitModel || client.batch.model}</dd></div></dl>
        {"balance" in document ? <>
          <h2>Account balance</h2><dl className={styles.totals}><div><dt>Total due</dt><dd>{money(document.balance.totalDue)}</dd></div><div><dt>Finance-verified paid</dt><dd>{money(document.balance.verifiedPaid)}</dd></div><div><dt>Remaining balance</dt><dd>{money(document.balance.remainingBalance)}</dd></div></dl>
          <h2>Verified payments</h2>{document.verifiedPayments.length ? <table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>{document.verifiedPayments.map((payment) => <tr key={payment.id}><td>{day(payment.paymentDate)}</td><td>{payment.method}</td><td>{payment.referenceNumber || "—"}</td><td>{money(payment.amount)}</td></tr>)}</tbody></table> : <p>No verified payments yet.</p>}
        </> : <><h2>Verified payment</h2><dl className={styles.totals}><div><dt>Amount</dt><dd>{money(document.payment.amount)}</dd></div><div><dt>Payment date</dt><dd>{day(document.payment.paymentDate)}</dd></div><div><dt>Method</dt><dd>{document.payment.method}</dd></div><div><dt>Reference</dt><dd>{document.payment.referenceNumber || "—"}</dd></div></dl></>}
        <footer><strong>{document.notice}</strong><p>Payments are coordinated externally. This document reflects the records verified by Finance at the time shown above.</p></footer>
      </article>}
  </main>;
}
