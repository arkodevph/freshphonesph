import type { DeviceInquiry, InquiryStatus } from "@freshphones/contracts";
import { inquiryStatuses } from "@freshphones/contracts";
import { SkeletonLine } from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import WorkspaceNativeSelect from "@/app/system/_role-designs/coo/components/WorkspaceNativeSelect";
import styles from "@/app/system/_role-designs/coo/app/system/inquiries/inquiries.module.css";

const labels = { NEW: "New", CONTACTED: "Contacted", CLOSED: "Closed" };

export default function InquiryCard({
  item,
  busy,
  onStatus,
}: {
  item?: DeviceInquiry;
  busy: boolean;
  onStatus: (item: DeviceInquiry, status: InquiryStatus) => void;
}) {
  return (
    <article className={styles.card} aria-busy={!item}>
      <div className={styles.cardHeading}>
        <div>
          <h2>{item?.name ?? <SkeletonLine width="16ch" />}</h2>
          <p>{item?.deviceName ?? <SkeletonLine width="20ch" />}</p>
        </div>
        <span className={styles.badge}>
          {item ? labels[item.status] : <SkeletonLine width="7ch" />}
        </span>
      </div>
      <dl>
        <div>
          <dt>Phone</dt>
          <dd>
            {item ? (
              <a href={`tel:${item.phone.replace(/[^+\d]/g, "")}`}>
                {item.phone}
              </a>
            ) : (
              <SkeletonLine width="13ch" />
            )}
          </dd>
        </div>
        {item?.email && (
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
            {item ? (
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString("en-PH")}
              </time>
            ) : (
              <SkeletonLine width="20ch" />
            )}
          </dd>
        </div>
      </dl>
      {item?.message && (
        <div className={styles.message}>
          <h3>Customer’s question</h3>
          <p>{item.message}</p>
        </div>
      )}
      <div className={styles.cardFooter}>
        <small>Reference: {item?.id ?? <SkeletonLine width="24ch" />}</small>
        <label>
          Update status
          <WorkspaceNativeSelect
            value={item?.status ?? ""}
            disabled={!item || busy}
            onChange={(event) => {
              if (item) {
                onStatus(item, event.target.value as InquiryStatus);
              }
            }}
          >
            {!item && <option value="">Loading…</option>}
            {inquiryStatuses.map((status) => {
              return (
                <option key={status} value={status}>
                  {labels[status]}
                </option>
              );
            })}
          </WorkspaceNativeSelect>
        </label>
      </div>
    </article>
  );
}
