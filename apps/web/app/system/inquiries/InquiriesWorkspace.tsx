"use client";

import { inquiryStatuses, type InquiryStatus } from "@freshphones/contracts";
import { useInquiries } from "@/lib/useInquiries";
import styles from "./inquiries.module.css";

const labels = { NEW: "New", CONTACTED: "Contacted", CLOSED: "Closed" };

export function InquiriesWorkspace() {
  const {
    query,
    setQuery,
    result,
    loading,
    error,
    pending,
    notice,
    load,
    changeStatus,
  } = useInquiries();

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Device inquiries</h1>
          <p>Follow up with people who asked about a device on the website.</p>
        </div>
        <button
          onClick={() => {
            return void load();
          }}
          disabled={loading}
        >
          Refresh inquiries
        </button>
      </header>
      <div className={styles.filters}>
        <label>
          Search inquiries
          <input
            type="search"
            maxLength={100}
            value={query.q}
            placeholder="Name, contact or device"
            onChange={(e) => {
              return setQuery((q) => {
                return { ...q, q: e.target.value, page: 1 };
              });
            }}
          />
        </label>
        <label>
          Status
          <select
            value={query.status || ""}
            onChange={(e) => {
              return setQuery((q) => {
                return {
                  ...q,
                  status: (e.target.value || undefined) as
                    InquiryStatus | undefined,
                  page: 1,
                };
              });
            }}
          >
            <option value="">All statuses</option>
            {inquiryStatuses.map((s) => {
              return (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading ? (
        <p role="status">Loading inquiries…</p>
      ) : result?.items.length === 0 ? (
        <p className={styles.empty}>
          No inquiries {query.q || query.status ? "match these filters" : "yet"}
          . New website inquiries will appear here.
        </p>
      ) : (
        <div className={styles.list}>
          {result?.items.map((item) => {
            return (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardHeading}>
                  <div>
                    <h2>{item.name}</h2>
                    <p>{item.deviceName}</p>
                  </div>
                  <span className={styles.badge}>{labels[item.status]}</span>
                </div>
                <dl>
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${item.phone.replace(/[^+\d]/g, "")}`}>
                        {item.phone}
                      </a>
                    </dd>
                  </div>
                  {item.email && (
                    <div>
                      <dt>Email</dt>
                      <dd>
                        <a href={`mailto:${item.email}`}>{item.email}</a>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Received</dt>
                    <dd>
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString("en-PH")}
                      </time>
                    </dd>
                  </div>
                </dl>
                {item.message && (
                  <div className={styles.message}>
                    <h3>Customer’s question</h3>
                    <p>{item.message}</p>
                  </div>
                )}
                <div className={styles.cardFooter}>
                  <small>Reference: {item.id}</small>
                  <label>
                    Update status
                    <select
                      value={item.status}
                      disabled={!!pending}
                      onChange={(e) => {
                        return void changeStatus(
                          item,
                          e.target.value as InquiryStatus,
                        );
                      }}
                    >
                      {inquiryStatuses.map((s) => {
                        return (
                          <option key={s} value={s}>
                            {labels[s]}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {result && (
        <nav className={styles.pagination} aria-label="Inquiry pages">
          <button
            disabled={loading || query.page === 1}
            onClick={() => {
              return setQuery((q) => {
                return { ...q, page: q.page - 1 };
              });
            }}
          >
            Previous
          </button>
          <span>
            Page {query.page} · {result.total} inquiries
          </span>
          <button
            disabled={loading || query.page * result.pageSize >= result.total}
            onClick={() => {
              return setQuery((q) => {
                return { ...q, page: q.page + 1 };
              });
            }}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
