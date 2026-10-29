import Link from "next/link";
import styles from "./PresentationNotice.module.css";
import { PRESENTATION_MODE } from "@/lib/presentation";

export function PresentationNotice() {
  if (!PRESENTATION_MODE) {
    return null;
  }

  return (
    <aside
      aria-label="Presentation mode"
      data-presentation-notice=""
      className={styles.notice}
    >
      <span className={styles.fullLabel}>
        <strong>Presentation</strong> · Fictional data · Read only
      </span>
      <span className={styles.mobileLabel}>Demo data · Read only</span>
      <Link
        href="/login"
        className="shrink-0 font-bold text-violet-700 underline"
      >
        Switch role
      </Link>
    </aside>
  );
}
