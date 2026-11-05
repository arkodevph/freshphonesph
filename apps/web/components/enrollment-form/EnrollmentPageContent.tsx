import Link from "next/link";
import DoodleIcon from "../DoodleIcon";
import { landingV2Font } from "../font";
import typography from "../typography.module.css";
import { publicSiteHref, type PublicSiteBase } from "@/lib/public-site-links";
import PublicEnrollmentForm from "./PublicEnrollmentForm";
import styles from "./public-enrollment.module.css";

export default function EnrollmentPageContent({
  siteBasePath = "",
}: {
  siteBasePath?: PublicSiteBase;
}) {
  return (
    <main
      className={`${styles.page} ${landingV2Font.variable} ${typography.root}`}
      data-enrollment-page
      data-landing-version="2"
    >
      <div className={styles.shell}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Apply to join</p>
          <h1>
            <span>Your next device</span> starts with a <em>conversation.</em>
          </h1>
          <p>
            Tell us how to reach you. Our team will help you explore a suitable
            device and batch.
          </p>
        </header>
        <PublicEnrollmentForm siteBasePath={siteBasePath} />
        <aside
          className={styles.afterForm}
          aria-label="How membership applications work"
        >
          <h2>What happens next?</h2>
          <ol>
            <li>
              <DoodleIcon name="application" size={32} />
              <span>
                <strong>Send your application.</strong>Share the details you
                want our team to review.
              </span>
            </li>
            <li>
              <DoodleIcon name="chat-heart" size={32} />
              <span>
                <strong>Talk with an Agent.</strong>An Agent reviews your
                details and discusses available batches.
              </span>
            </li>
            <li>
              <DoodleIcon name="shield-heart" size={32} />
              <span>
                <strong>Manager review.</strong>A Batch Manager reviews
                enrollment before your membership begins.
              </span>
            </li>
          </ol>
          <Link href={publicSiteHref("/inquire", siteBasePath)}>
            <DoodleIcon name="chat-heart" size={24} />
            Have a question first? Contact our team.
          </Link>
        </aside>
      </div>
    </main>
  );
}
