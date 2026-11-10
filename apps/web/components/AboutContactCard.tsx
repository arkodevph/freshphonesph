import { MessengerLogo } from "@phosphor-icons/react/dist/ssr";
import VerificationGlass from "./VerificationGlass";
import scene from "./LandingContent.module.css";
import styles from "./about-page.module.css";

export default function AboutContactCard() {
  return (
    <section
      id="contact"
      className={`${scene.join} ${styles.contact}`}
      aria-labelledby="about-contact-heading"
    >
      <div className={`${scene.joinCard} ${styles.contactCard}`}>
        <VerificationGlass className={scene.glassRefraction} />
        <div className={scene.joinInner}>
          <p className={styles.eyebrow}>Talk to the official page</p>
          <h2 id="about-contact-heading">
            Ready to ask about
            <br />
            your next device?
          </h2>
          <p>
            Message Fresh Phones PH directly for current units, plan
            requirements, and available payment schedules.
          </p>
          <a
            href="https://m.me/FreshPhonesPh"
            target="_blank"
            rel="noopener noreferrer"
            className={`${scene.primary} ${styles.messenger}`}
          >
            <MessengerLogo weight="fill" aria-hidden="true" data-button-icon />
            Open Messenger
          </a>
        </div>
      </div>
    </section>
  );
}
