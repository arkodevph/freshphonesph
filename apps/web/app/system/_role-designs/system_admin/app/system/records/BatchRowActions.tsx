"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { DotsThree, Users } from "@phosphor-icons/react";
import type { Batch } from "@/lib/api";
import styles from "@/app/system/_role-designs/system_admin/app/system/records/handler-batch-table.module.css";

export default function BatchRowActions({ batch }: { batch: Batch }) {
  const id = useId();

  const menu = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.rowAction}
        popoverTarget={id}
        aria-label={`Actions for ${batch.batch_number}`}
        aria-controls={id}
        aria-expanded={open}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();

          if (menu.current) {
            menu.current.style.left = `${Math.max(12, Math.min(rect.right - 208, window.innerWidth - 220))}px`;

            menu.current.style.top = `${rect.bottom + 72 > window.innerHeight ? rect.top - 68 : rect.bottom + 6}px`;
          }
        }}
      >
        <DotsThree weight="bold" aria-hidden="true" />
      </button>
      <div
        id={id}
        ref={menu}
        popover="auto"
        role="group"
        aria-label={`Batch actions for ${batch.batch_number}`}
        className={styles.actionsPopover}
        onToggle={(event) => {
          setOpen(event.newState === "open");
        }}
      >
        <Link
          href={`/system/clients?batch=${batch.id}`}
          onClick={() => {
            menu.current?.hidePopover();
          }}
        >
          <Users aria-hidden="true" /> View members
        </Link>
      </div>
    </>
  );
}
