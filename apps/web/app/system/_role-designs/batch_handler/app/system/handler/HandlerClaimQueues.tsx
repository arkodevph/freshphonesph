import Link from "next/link";
import {
  CheckCircle,
  Receipt,
  ArrowUUpLeft,
  Clock,
} from "@phosphor-icons/react";
import type { Paginated, Payment } from "@/lib/api";
import { formatPeso } from "@/lib/currency";
import {
  handlerPaymentStage,
  handlerReturnNote,
} from "@/lib/handler-workspace";
import type { Resource } from "@/app/system/handler/useHandlerHome";
import { HandlerResourceState } from "./HandlerResourceState";
import styles from "./handler-home.module.css";

type QueueProps = {
  resource: Resource<Paginated<Payment>>;
  loading: boolean;
  retry: () => void;
};

function ClaimGroup({
  resource,
  loading,
  retry,
  returned = false,
}: QueueProps & { returned?: boolean }) {
  const data = resource.data;

  const title = returned ? "Returned for correction" : "Receipt proof needed";

  const href = returned
    ? "/system/payments?status=needs_clarification"
    : "/system/payments?status=pending&proof=missing";

  const Icon = returned ? ArrowUUpLeft : Receipt;

  return (
    <section className={styles.claimGroup} aria-label={title}>
      <header className={styles.groupHeading}>
        <h3>
          <Icon aria-hidden="true" />
          {title}
          <span className={styles.count}>{data?.count ?? "—"}</span>
        </h3>
        {data && data.count > 0 && (
          <Link href={href} className={styles.textLink}>
            View all
          </Link>
        )}
      </header>
      <HandlerResourceState
        resource={resource}
        loading={loading}
        retry={retry}
      />
      {data &&
        (data.count ? (
          <ul className={styles.claimList}>
            {data.results.slice(0, returned ? 3 : 4).map((payment) => {
              return (
                <li key={payment.id}>
                  <Link
                    className={styles.claimRow}
                    href={`/system/payments?payment=${payment.id}`}
                  >
                    <span className={styles.memberInitial} aria-hidden="true">
                      {payment.client_name?.trim().slice(0, 1).toUpperCase() ||
                        "?"}
                    </span>
                    <span className={styles.claimIdentity}>
                      <strong>
                        {payment.client_name || "Name unavailable"}
                      </strong>
                      <small>
                        {payment.batch_code} · {payment.payment_date}
                      </small>
                      {returned && (
                        <span className={styles.returnNote}>
                          {handlerReturnNote(payment)}
                        </span>
                      )}
                    </span>
                    <span className={styles.claimAmount}>
                      {formatPeso(payment.amount)}
                    </span>
                    <span className={styles.claimAction}>
                      {returned ? "Correct claim" : "Attach proof"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.clearState}>
            <CheckCircle aria-hidden="true" />
            {returned
              ? "No claims returned for correction."
              : "No pending claims missing receipt proof."}
          </p>
        ))}
    </section>
  );
}

export function HandlerAttention({
  returned,
  missing,
  loading,
  retry,
}: {
  returned: QueueProps["resource"];
  missing: QueueProps["resource"];
  loading: boolean;
  retry: () => void;
}) {
  return (
    <section
      className={styles.attention}
      aria-labelledby="handler-attention-title"
    >
      <header className={styles.panelHeading}>
        <div>
          <h2 id="handler-attention-title">Needs attention</h2>
        </div>
      </header>
      <ClaimGroup
        resource={returned}
        returned
        loading={loading}
        retry={retry}
      />
      <ClaimGroup resource={missing} loading={loading} retry={retry} />
    </section>
  );
}

export function HandlerReviewLedger({ resource, loading, retry }: QueueProps) {
  const data = resource.data;

  return (
    <section className={styles.review} aria-labelledby="handler-review-title">
      <header className={styles.panelHeading}>
        <div>
          <h2 id="handler-review-title">Pending review</h2>
          <p>
            {data
              ? `${data.count} pending claims · latest ${Math.min(4, data.results.length)} shown`
              : "Pending claims in your assigned batches"}
          </p>
        </div>
        <Link
          className={styles.textLink}
          href="/system/payments?status=pending"
        >
          View all
        </Link>
      </header>
      <HandlerResourceState
        resource={resource}
        loading={loading}
        retry={retry}
      />
      {data &&
        (data.count ? (
          <ul className={styles.reviewList}>
            {data.results.slice(0, 4).map((payment) => {
              return (
                <li key={payment.id}>
                  <Link href={`/system/payments?payment=${payment.id}`}>
                    <span className={styles.claimIdentity}>
                      <strong>
                        {payment.client_name || "Name unavailable"}
                      </strong>
                      <small>{payment.batch_code}</small>
                    </span>
                    <span className={styles.claimAmount}>
                      {formatPeso(payment.amount)}
                    </span>
                    <span className={styles.stage}>
                      <Clock aria-hidden="true" />
                      {handlerPaymentStage(payment)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.clearState}>
            <CheckCircle aria-hidden="true" />
            No claims waiting for review.
          </p>
        ))}
      <footer className={styles.reviewFooter}>
        <ol aria-label="Payment review sequence">
          {["Handler", "Records", "Manager", "Finance"].map((step, index) => {
            return (
              <li key={step}>
                <span>{index + 1}</span>
                {step}
              </li>
            );
          })}
        </ol>
        <p>Only Finance-verified payments change a member’s balance.</p>
      </footer>
    </section>
  );
}
