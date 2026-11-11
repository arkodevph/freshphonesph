"use client";

import Image from "next/image";
import { ArrowClockwise as Refresh } from "@phosphor-icons/react";
import Link from "next/link";
import {
  ArrowRight,
  Widget as SquaresFour,
  UserCircle as Users,
  Wallet,
  FileSend as DocumentAdd,
  Calendar as ChecklistMinimalistic,
} from "@/components/SolarIcons";
import {
  handlerPaymentStage,
  handlerReturnNote,
} from "@/lib/handler-workspace";
import type { Paginated, Payment } from "@/lib/api";
import { formatPeso } from "@/lib/currency";
import { useHandlerHome, type Resource } from "./useHandlerHome";
import portal from "../../portal/portal.module.css";
import tiles from "../../portal/dashboard-next-steps.module.css";
import card from "../../portal/membership-card.module.css";
import styles from "./handler-home.module.css";

function State({
  error,
  loading,
  retry,
}: {
  error: string | null;
  loading: boolean;
  retry: () => void;
}) {
  return error ? (
    <div className={styles.state} role="alert">
      <p>{error}</p>
      <button type="button" onClick={retry}>
        Try again
      </button>
    </div>
  ) : loading ? (
    <p className={styles.state} role="status">
      Loading records…
    </p>
  ) : null;
}

function ClaimQueue({
  title,
  description,
  resource,
  loading,
  retry,
  missing = false,
}: {
  title: string;
  description: string;
  resource: Resource<Paginated<Payment>>;
  loading: boolean;
  retry: () => void;
  missing?: boolean;
}) {
  const data = resource.data;

  return (
    <section
      className={styles.queue}
      data-portal-material="card"
      aria-label={title}
    >
      <header className={styles.sectionHeading}>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span
          className={styles.count}
          aria-label={`${data?.count ?? "Unknown"} ${title.toLowerCase()}`}
        >
          {data?.count ?? "—"}
        </span>
      </header>
      <State error={resource.error} loading={loading && !data} retry={retry} />
      {data &&
        (data.count ? (
          <>
            <ul className={styles.claims}>
              {data.results.slice(0, 3).map((payment) => {
                return (
                  <li key={payment.id}>
                    <Link href={`/system/payments?payment=${payment.id}`}>
                      <div className={styles.rowTitle}>
                        <strong>{payment.client_name}</strong>
                        <span>{formatPeso(payment.amount)}</span>
                      </div>
                      <small>
                        {payment.batch_code} · {payment.payment_date}
                      </small>
                      <p>
                        {missing
                          ? "Attach the receipt to this recorded claim."
                          : handlerReturnNote(payment)}
                      </p>
                      <span className={styles.rowAction}>
                        {missing ? "Open claim" : "Review correction"}
                        <ArrowRight aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              className={styles.textLink}
              href={
                missing
                  ? "/system/payments?status=pending&proof=missing"
                  : "/system/payments?status=needs_clarification"
              }
            >
              View all {data.count} claims
            </Link>
          </>
        ) : (
          <div className={styles.empty}>
            <strong>
              {missing
                ? "No pending claims without proof"
                : "No returned claims"}
            </strong>
            <p>
              {missing
                ? "Pending recorded claims in your assigned batches have receipt proof."
                : "Claims returned for clarification will appear here with their reviewer notes."}
            </p>
          </div>
        ))}
    </section>
  );
}

export default function HandlerHome({ name }: { name: string }) {
  const {
    assignments,
    returned,
    missing,
    pending,
    todo,
    inProgress,
    loading,
    load,
  } = useHandlerHome();

  const retry = () => {
    void load();
  };

  const tasks = [
    ...(todo.data?.results ?? []),
    ...(inProgress.data?.results ?? []),
  ]
    .sort((a, b) => {
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, 4);

  return (
    <div className={styles.home} data-handler-home="">
      <header className={`${portal.intro} ${styles.intro}`}>
        <div className={portal.introCopy}>
          <p className={portal.dashboardEyebrow}>Your Handler workspace</p>
          <h1>Good day, {name.split(" ")[0]}.</h1>
          <p className={portal.dashboardDescription}>
            Your batches, payment claims and next steps at a glance.
          </p>
        </div>
        <button
          className={styles.refresh}
          type="button"
          onClick={retry}
          disabled={loading}
        >
          <Refresh aria-hidden="true" />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className={`${portal.dashboardLayout} ${styles.workspace}`}>
        <div className={`${portal.dashboardMain} ${styles.mainColumn}`}>
          <section
            className={`${portal.membership} ${portal.membershipDashboard} ${card.card} ${styles.banner}`}
            data-portal-material="membership"
            data-membership-card=""
            aria-label="Batch Handler overview"
          >
            <span className={`${portal.heroIcon} ${card.icon}`}>
              <SquaresFour aria-hidden="true" />
            </span>
            <div className={styles.bannerCopy}>
              <p>My assigned batches</p>
              <h2>Keep each claim moving.</h2>
              <p>
                Record external payments, attach proof and follow the review.
              </p>
              <Link
                className={styles.primary}
                href="/system/payments#record-payment"
              >
                Record a payment
              </Link>
            </div>
            <Image
              src="/portal/mascot/task-boy-payments.webp"
              alt=""
              width={768}
              height={512}
              sizes="(max-width: 700px) 130px, 250px"
              className={styles.mascot}
              priority
            />
          </section>
          <section aria-labelledby="handler-actions-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Next steps</p>
                <h2 id="handler-actions-title">Needs your action</h2>
              </div>
            </div>
            <div className={styles.queues}>
              <ClaimQueue
                title="Returned claims"
                description="Review notes, correct and resubmit"
                resource={returned}
                loading={loading}
                retry={retry}
              />
              <ClaimQueue
                title="Missing receipt proof"
                description="Pending claims already recorded"
                resource={missing}
                loading={loading}
                retry={retry}
                missing
              />
            </div>
          </section>

          <section
            className={styles.queue}
            data-portal-material="card"
            aria-labelledby="handler-review-title"
          >
            <header className={styles.sectionHeading}>
              <div>
                <h2 id="handler-review-title">Review progress</h2>
                <p>
                  {pending.data
                    ? `${pending.data.count} pending claims · latest ${Math.min(6, pending.data.results.length)} shown`
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
            <State
              error={pending.error}
              loading={loading && !pending.data}
              retry={retry}
            />
            {pending.data &&
              (pending.data.count ? (
                <ul className={styles.progressList}>
                  {pending.data.results.slice(0, 6).map((payment) => {
                    return (
                      <li key={payment.id}>
                        <Link href={`/system/payments?payment=${payment.id}`}>
                          <div>
                            <strong>{payment.client_name}</strong>
                            <small>
                              {payment.batch_code} ·{" "}
                              {formatPeso(payment.amount)}
                            </small>
                          </div>
                          <span className={styles.stage}>
                            {handlerPaymentStage(payment)}
                          </span>
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.empty}>
                  No pending claims in your assigned batches.
                </p>
              ))}
            <ol
              className={styles.workflow}
              aria-label="Payment review sequence"
            >
              {[
                "Handler submits",
                "Records checks",
                "Manager cross-checks",
                "Finance decides",
              ].map((step, index) => {
                return (
                  <li key={step}>
                    <span>{index + 1}</span>
                    {step}
                  </li>
                );
              })}
            </ol>
            <p className={styles.note}>
              Only Finance-verified payments change a member&apos;s balance.
            </p>
          </section>
          <section
            aria-label="Quick access"
            className={`${tiles.statusTiles} ${styles.tools}`}
          >
            {[
              {
                label: "My batches",
                note: "Assigned groups and members",
                href: "/system/records",
                Icon: SquaresFour,
              },
              {
                label: "GCash history",
                note: "Upload PDFs and review returns",
                href: "/system/gcash-history",
                Icon: DocumentAdd,
              },
              {
                label: "Members & schedules",
                note: "Installments and balances",
                href: "/system/clients",
                Icon: ChecklistMinimalistic,
              },
            ].map(({ label, note, href, Icon }) => {
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${tiles.statusTile} ${tiles.sky}`}
                  data-portal-material="tile"
                >
                  <span className={tiles.tileIcon}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span className={tiles.statusCopy}>
                    <strong>{label}</strong>
                    <small>{note}</small>
                  </span>
                  <ArrowRight className={tiles.tileArrow} aria-hidden="true" />
                </Link>
              );
            })}
          </section>
        </div>
        <aside className={styles.sideColumn} aria-label="Assignments and tasks">
          <section
            className={styles.assignments}
            data-portal-material="summary"
            aria-label="My assignments"
          >
            <h2>My assignments</h2>
            <p>Current batches assigned to you</p>
            <State
              error={assignments.error}
              loading={loading && !assignments.data}
              retry={retry}
            />
            <dl>
              {[
                {
                  label: "Active batches",
                  value: assignments.data?.activeBatches,
                  href: "/system/records",
                  Icon: SquaresFour,
                },
                {
                  label: "Members & schedules",
                  value: assignments.data?.clients,
                  href: "/system/clients",
                  Icon: Users,
                },
                {
                  label: "Ready for release",
                  value: assignments.data?.readyForRelease,
                  href: "/system/clients",
                  Icon: Wallet,
                },
              ].map(({ label, value, href, Icon }) => {
                return (
                  <div key={label}>
                    <dt>
                      <Icon aria-hidden="true" />
                      <Link href={href}>{label}</Link>
                    </dt>
                    <dd>{value ?? "—"}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
          <section
            className={styles.queue}
            data-portal-material="card"
            aria-labelledby="handler-tasks-title"
          >
            <header className={styles.sectionHeading}>
              <div>
                <h2 id="handler-tasks-title">My tasks</h2>
                <p>
                  {todo.data && inProgress.data
                    ? `${todo.data.count + inProgress.data.count} open · recent assignments`
                    : "Your assigned work"}
                </p>
              </div>
              <Link className={styles.textLink} href="/system/tasks">
                View all
              </Link>
            </header>
            <State
              error={todo.error || inProgress.error}
              loading={loading && !todo.data && !inProgress.data}
              retry={retry}
            />
            <ul className={styles.taskList}>
              {tasks.map((task) => {
                return (
                  <li key={task.id}>
                    <Link href={`/system/tasks?task=${task.id}`}>
                      <strong>{task.title}</strong>
                      <small>
                        {task.status === "IN_PROGRESS"
                          ? "In progress"
                          : "To do"}{" "}
                        · Due{" "}
                        {new Date(task.deadline).toLocaleDateString("en-PH", {
                          timeZone: "Asia/Manila",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </small>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {todo.data && inProgress.data && !tasks.length && (
              <p className={styles.empty}>No open tasks assigned to you.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
