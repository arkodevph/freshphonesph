"use client";

import { useId } from "react";
import { batchCapacity } from "@freshphones/contracts";
import styles from "@/app/system/_role-designs/batch_manager/components/batch-capacity.module.css";

export function BatchCapacity({
  realMembers,
  status,
}: {
  realMembers: number;
  status: string;
}) {
  const headingId = useId();

  const membersId = useId();

  const placeholdersId = useId();

  const capacity = batchCapacity(realMembers);

  const forming = status.toUpperCase() === "PLANNED";

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.heading}>
        <h3 id={headingId}>Batch positions</h3>
        <span className={styles.badge}>Staff only</span>
      </div>
      <p className={styles.summary}>
        <strong>
          {capacity.realMembers} / {capacity.capacity} real members enrolled
        </strong>
        <span>
          {capacity.full
            ? "Real-member capacity reached"
            : `${capacity.remaining} real-member ${capacity.remaining === 1 ? "position" : "positions"} open`}
        </span>
      </p>
      {capacity.overCapacity && (
        <p className={styles.warning}>
          This existing batch has {capacity.realMembers} real members. Their
          records are preserved; further enrollment is blocked at the limit of{" "}
          {capacity.capacity}.
        </p>
      )}
      <div className={styles.group}>
        <h4 id={membersId}>Real-member positions</h4>
        <ol className={styles.slots} aria-labelledby={membersId}>
          {Array.from({ length: capacity.capacity }, (_, index) => {
            const occupied = index < capacity.realMembers;

            return (
              <li
                key={index}
                className={`${styles.slot} ${occupied ? styles.occupied : styles.open}`}
              >
                <span>Position {index + 1}</span>
                <strong>{occupied ? "Enrolled" : "Open"}</strong>
              </li>
            );
          })}
        </ol>
      </div>
      <div className={styles.group}>
        <h4 id={placeholdersId}>Internal display positions</h4>
        <ol className={styles.slots} aria-labelledby={placeholdersId}>
          {Array.from({ length: capacity.internalPlaceholders }, (_, index) => {
            return (
              <li
                key={index}
                className={`${styles.slot} ${styles.placeholder}`}
              >
                <span>Position {capacity.capacity + index + 1}</span>
                <strong>Placeholder</strong>
              </li>
            );
          })}
        </ol>
        <p className={styles.help}>
          These {capacity.internalPlaceholders} visual positions are visible
          only to staff. They have no member accounts, installments, payments or
          financial contribution and do not count toward activation.
        </p>
      </div>
      <p className={styles.activation}>
        {forming
          ? capacity.full
            ? "This existing batch is full. Choose Active in Status and save to activate it."
            : `This forming batch activates when ${capacity.capacity} real memberships are approved. To start earlier, choose Active in Status and save.`
          : "Only approved real memberships count toward capacity. Pending enrollment requests do not hold a position."}
      </p>
    </section>
  );
}
