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
      <p className={styles.eyebrow}>Cloud</p>
      <h2 id="fresh-ai-title">What’s on your mind?</h2>
      <Link href="/system/assistant" className={styles.reportButton}>
        <ChatCircleDots aria-hidden="true" />
        Open Cloud
      </Link>
    </section>
  );
}
