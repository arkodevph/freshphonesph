"use client";

import Link from "next/link";
import styles from "../ceo-portal.module.css";
import { ChatCircleDots, Sparkle } from "@phosphor-icons/react";
export default function CeoAssistantEntry() {
  return (
    <section
      className={`${styles.panel} ${styles.aiEntry}`}
      aria-labelledby="fresh-ai-title"
    >
      <span className={styles.aiEntryMark}>
        <Sparkle aria-hidden="true" weight="fill" />
      </span>
      <p className={styles.eyebrow}>Fresh AI</p>
      <h2 id="fresh-ai-title">
        Your next question
        <br />
        starts here.
      </h2>
      <p>
        Collections, batch balances, payment records. Bring your questions into
        one focused workspace.
      </p>
      <Link href="/system/assistant" className={styles.reportButton}>
        <ChatCircleDots aria-hidden="true" />
        Open AI assistant
      </Link>
      <small>Uses your existing workspace access.</small>
    </section>
  );
}
