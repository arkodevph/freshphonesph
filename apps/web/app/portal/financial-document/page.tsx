"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DownloadMinimalistic as DownloadSimple,
  Printer,
} from "@/components/SolarIcons";
import type { Client, User } from "@freshphones/contracts";
import type {
  AccountStatement as Statement,
  PaymentConfirmation as Confirmation,
} from "@/lib/account-documents";
import { AccountDocumentSheet } from "@/components/AccountDocumentSheet";
import { tsRequest } from "@/lib/ts-api";
import { currentMembership } from "@/lib/membership-selection";
import { prepareAccountDocumentPrint } from "@/lib/account-document-print";
import { downloadAccountPdf } from "@/lib/account-pdf";
import DocumentSheetSkeleton from "./DocumentSheetSkeleton";
import styles from "./financial-document.module.css";
import glass from "../portal-glass.module.css";

export default function FinancialDocumentPage() {
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);

  const [document, setDocument] = useState<Statement | Confirmation | null>(
    null,
  );

  const [error, setError] = useState("");

  const [downloadError, setDownloadError] = useState("");

  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);

    const paymentId = query.get("payment");

    if (paymentId && !/^[0-9a-f-]{36}$/i.test(paymentId)) {
      setError("Invalid payment reference.");

      return;
    }

    void (async () => {
      try {
        const user = await tsRequest<User>("/auth/me");

        if (user.role !== "CUSTOMER" || !user.clientId) {
          router.replace("/login");

          return;
        }

        const membershipId = currentMembership(user.id, user.clientId)!;

        const [account, record] = await Promise.all([
          tsRequest<Client>(`/clients/${membershipId}`),
          paymentId
            ? tsRequest<Confirmation>(`/payments/${paymentId}/confirmation`)
            : tsRequest<Statement>(`/clients/${membershipId}/statement`),
        ]);

        setClient(account);

        setDocument(record);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load this document.",
        );
      }
    })();
  }, [router]);

  return (
    <main className={`${styles.page} ${glass.interactions}`}>
      <header className={styles.documentHeader}>
        <div className={styles.documentHeading}>
          <p>Fresh Phones PH</p>
          <h1>Account document</h1>
        </div>
        <div className={styles.actions}>
          <Link href="/portal/payments">
            <ArrowLeft aria-hidden="true" /> Back to payments
          </Link>
          <button
            type="button"
            disabled={!document || !client || downloading}
            onClick={() => {
              if (!document || !client) {
                return;
              }

              setDownloadError("");

              setDownloading(true);

              void downloadAccountPdf(client, document)
                .catch((caught) => {
                  return setDownloadError(
                    caught instanceof Error
                      ? caught.message
                      : "Could not download PDF.",
                  );
                })
                .finally(() => {
                  return setDownloading(false);
                });
            }}
          >
            <DownloadSimple aria-hidden="true" />{" "}
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            disabled={!document}
            onClick={() => {
              setDownloadError("");

              void prepareAccountDocumentPrint(
                window.document.querySelector("[data-account-document-sheet]"),
              )
                .then(() => {
                  window.print();
                })
                .catch((caught) => {
                  setDownloadError(
                    caught instanceof Error
                      ? caught.message
                      : "Could not prepare this document for printing.",
                  );
                });
            }}
          >
            <Printer aria-hidden="true" /> Print
          </button>
        </div>
      </header>
      {downloadError && (
        <p className={styles.message} role="alert">
          {downloadError}
        </p>
      )}
      {error ? (
        <p className={styles.message} role="alert">
          {error}
        </p>
      ) : !document || !client ? (
        <DocumentSheetSkeleton />
      ) : (
        <AccountDocumentSheet client={client} record={document} />
      )}
    </main>
  );
}
