"use client";

import { useEffect, useRef, useState } from "react";
import type { GcashReadingPage } from "@freshphones/contracts";
import { getGcashReading } from "@/lib/api";
import styles from "./reading.module.css";

const money = (value: string | null | undefined) => {
  return value == null
    ? "Not read"
    : `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function ReadingDialog({
  id,
  filename,
  close,
}: {
  id: string;
  filename: string;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [page, setPage] = useState(1);

  const [attempt, setAttempt] = useState(0);

  const [result, setResult] = useState<GcashReadingPage | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);

    setError(null);

    setResult(null);

    void getGcashReading(id, page)
      .then((value) => {
        if (active) {
          setResult(value);
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load extracted transactions.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, page, attempt]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="gcash-reading-title"
      onCancel={close}
    >
      <header className={styles.header}>
        <div>
          <h2 id="gcash-reading-title">Extracted transactions</h2>
          <p className={styles.help}>{filename}</p>
        </div>
        <button type="button" onClick={close}>
          Close transactions
        </button>
      </header>
      <p className={styles.help}>
        Check these values against the original PDF before recording your
        review. Reading a statement does not verify payments or change balances.
      </p>
      {loading ? (
        <p role="status">Loading extracted transactions…</p>
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              return setAttempt((value) => {
                return value + 1;
              });
            }}
          >
            Retry transactions
          </button>
        </p>
      ) : (
        result && (
          <>
            <p className={styles.help}>
              {result.transactionCount} transactions · {result.pages}{" "}
              {result.pages === 1 ? "page" : "pages"} ·{" "}
              {result.method === "TEXT"
                ? "Read from PDF text"
                : result.method === "OCR"
                  ? "Read from scanned pages"
                  : "Read from text and scanned pages"}
            </p>
            {result.warnings.length > 0 && (
              <div className={styles.warning} aria-label="Reading warnings">
                <strong>Check these items</strong>
                <ul>
                  {result.warnings.map((warning) => {
                    return <li key={warning}>{warning}</li>;
                  })}
                </ul>
              </div>
            )}
            <dl className={styles.totals}>
              <div>
                <dt>Opening balance</dt>
                <dd>{money(result.openingBalance)}</dd>
              </div>
              <div>
                <dt>Total debit read</dt>
                <dd>{money(result.calculatedDebit)}</dd>
              </div>
              <div>
                <dt>Total credit read</dt>
                <dd>{money(result.calculatedCredit)}</dd>
              </div>
              <div>
                <dt>Closing balance</dt>
                <dd>{money(result.closingBalance)}</dd>
              </div>
            </dl>
            <ul className={styles.checks}>
              {[
                ["Debit total", result.checks.debitTotalMatches],
                ["Credit total", result.checks.creditTotalMatches],
                ["Running balances", result.checks.runningBalancesMatch],
                ["Closing balance", result.checks.closingBalanceMatches],
              ].map(([label, value]) => {
                return (
                  <li key={String(label)}>
                    {label}:{" "}
                    {value === true
                      ? "Matches"
                      : value === false
                        ? "Needs checking"
                        : "Not checked"}
                  </li>
                );
              })}
            </ul>
            {!result.total ? (
              <p>
                No transaction table was identified. Use the original PDF for
                the Records review.
              </p>
            ) : (
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="Extracted GCash transaction table"
              >
                <table>
                  <thead>
                    <tr>
                      {[
                        "Date / time",
                        "Description",
                        "Reference no.",
                        "Debit",
                        "Credit",
                        "Balance",
                        "Check",
                      ].map((heading) => {
                        return (
                          <th key={heading} scope="col">
                            {heading}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((row, index) => {
                      return (
                        <tr key={`${page}-${index}`}>
                          <td>
                            {row.date}
                            <br />
                            {row.time}
                            <small>PDF page {row.page}</small>
                          </td>
                          <td className={styles.description}>
                            {row.description || "Not read"}
                          </td>
                          <td>{row.reference || "Not read"}</td>
                          <td>{row.debit == null ? "—" : money(row.debit)}</td>
                          <td>
                            {row.credit == null ? "—" : money(row.credit)}
                          </td>
                          <td>{money(row.balance)}</td>
                          <td>
                            {row.warnings.length ? (
                              <ul>
                                {row.warnings.map((warning) => {
                                  return <li key={warning}>{warning}</li>;
                                })}
                              </ul>
                            ) : (
                              "No reading flags"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <nav
              className={styles.pagination}
              aria-label="Extracted transaction pages"
            >
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  return setPage(page - 1);
                }}
              >
                Previous transactions
              </button>
              <span>
                Page {page} of{" "}
                {Math.max(1, Math.ceil(result.total / result.pageSize))}
              </span>
              <button
                type="button"
                disabled={page * result.pageSize >= result.total}
                onClick={() => {
                  return setPage(page + 1);
                }}
              >
                Next transactions
              </button>
            </nav>
          </>
        )
      )}
    </dialog>
  );
}
