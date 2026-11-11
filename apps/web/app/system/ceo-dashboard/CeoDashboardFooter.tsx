"use client";

import styles from "../ceo-portal.module.css";
import { CalendarBlank } from "@phosphor-icons/react";
export default function CeoDashboardFooter() {
  return (
    <footer className={styles.pageFoot}>
      <span>
        Collections use Finance-verified payments and credit adjustments.
      </span>
      <span>
        <CalendarBlank aria-hidden="true" />
        Reporting dates follow Asia/Manila.
      </span>
      <span>
        Overview refreshes every 30 seconds. Final decisions stay with your
        team.
      </span>
    </footer>
  );
}
