"use client";

import InquiryCard from "@/app/system/_role-designs/coo/app/system/inquiries/InquiryCard";
import WorkspaceNativeSelect from "@/app/system/_role-designs/coo/components/WorkspaceNativeSelect";
import { inquiryStatuses, type InquiryStatus } from "@freshphones/contracts";
import { useInquiries } from "@/lib/useInquiries";
import styles from "@/app/system/_role-designs/coo/app/system/inquiries/inquiries.module.css";

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
          <WorkspaceNativeSelect
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
          </WorkspaceNativeSelect>
        </label>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!loading && result?.items.length === 0 ? (
        <p className={styles.empty}>
          No inquiries {query.q || query.status ? "match these filters" : "yet"}
          . New website inquiries will appear here.
        </p>
      ) : (
        <div className={styles.list}>
          {loading && !result
            ? Array.from({ length: 3 }, (_, index) => {
                return <InquiryCard key={index} busy onStatus={() => {}} />;
              })
            : result?.items.map((item) => {
                return (
                  <InquiryCard
                    key={item.id}
                    item={item}
                    busy={Boolean(pending)}
                    onStatus={(item, status) => {
                      void changeStatus(item, status);
                    }}
                  />
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
