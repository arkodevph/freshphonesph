import VerificationGlass from "./VerificationGlass";
import DoodleIcon from "./DoodleIcon";
import Link from "@/components/PublicNavigationLink";
import styles from "./LandingContent.module.css";

export default function CtaJoin() {
  return (
    <section id="join" className={styles.join} aria-labelledby="join-heading">
      <div className={styles.joinCard}>
        <VerificationGlass className={styles.glassRefraction} />
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
            <DoodleIcon name="shield-heart" /> Verify your agent
          </Link>
        </div>
      </div>
    </section>
  );
}
