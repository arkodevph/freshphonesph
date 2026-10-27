import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import styles from "./LandingContent.module.css";

export default function CtaJoin() {
  return (
    <section id="join" className={styles.join} aria-labelledby="join-heading">
      <div className={styles.joinCard}>
        <svg
          className={styles.joinArt}
          viewBox="0 0 1200 560"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="footer-wave" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4474e0" stopOpacity="0.08" />
              <stop offset="0.5" stopColor="#8cc7ff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#4474e0" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#footer-wave)">
            <path d="M610-170C140 50 350 400 1300 110" strokeWidth="68" />
            <path d="M610-170C140 50 350 400 1300 110" strokeWidth="2" />
            <path d="M1320 30C680-30 430 290 690 660" strokeWidth="72" />
            <path d="M1320 30C680-30 430 290 690 660" strokeWidth="2" />
            <path d="M1340 270C880 160 690 420 1030 700" strokeWidth="82" />
            <path d="M1340 270C880 160 690 420 1030 700" strokeWidth="2" />
          </g>
        </svg>
        <div className={styles.joinInner}>
          <h2 id="join-heading">
            Check your agent
            <br />
            before you transact.
          </h2>
          <p>
            Know who you&apos;re talking to. Search your agent&apos;s complete
            name or code and check their status with Fresh Phones PH.
          </p>
          <Link href="/about#verify" className={styles.primary}>
            Verify your agent <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
