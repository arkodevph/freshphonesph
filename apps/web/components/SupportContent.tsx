import Image from "next/image";
import Link from "@/components/PublicNavigationLink";
import { FacebookLogo, Phone } from "@phosphor-icons/react/dist/ssr";
import { systemHref } from "@/lib/site-links";
import DoodleIcon from "./DoodleIcon";
import VerificationGlass from "./VerificationGlass";
import hero from "./Hero.module.css";
import scene from "./LandingContent.module.css";
import styles from "@/app/support/support.module.css";

export default function SupportContent({
  faqHref = "/#faq",
}: {
  faqHref?: string;
}) {
  const portalHref = systemHref("/portal/support");

  return (
    <main
      id="top"
      data-support-page="true"
      className={styles.page}
      aria-labelledby="support-heading"
    >
      <div className={styles.container}>
        <header className={styles.intro}>
          <div>
            <p className={`${styles.eyebrow} font-display`}>
              <DoodleIcon name="chat-heart" size={24} />
              Fresh Phones PH customer care
            </p>
            <h1 id="support-heading">
              How can we <span>help you?</span>
            </h1>
            <p className={styles.introCopy}>
              Get help with your account, payments or device. Choose where you’d
              like to start.
            </p>
          </div>
          <div className={styles.introArt} aria-hidden="true">
            <Image
              src="/brand/mascot/cloud-boy-guidance-v1.png"
              alt=""
              width={1254}
              height={1254}
              sizes="(max-width: 700px) 1px, 272px"
              priority
            />
          </div>
        </header>

        {portalHref && (
          <section
            className={styles.portal}
            aria-labelledby="customer-support-title"
          >
            <div className={styles.sectionHeading}>
              <h2 id="customer-support-title">Already a customer?</h2>
              <p>
                Use the account provided by Fresh Phones PH. If you’re signed
                out, we’ll ask you to sign in and bring you back to Support.
              </p>
            </div>
            <div className={styles.portalCards}>
              <article className={styles.portalCard}>
                <DoodleIcon name="application" size={44} />
                <div>
                  <h3>Start a request</h3>
                  <p>
                    Tell Customer Service about a payment, device or account
                    concern. Your request and replies stay together in your
                    portal.
                  </p>
                  <Link
                    className={`${hero.cta} ${styles.portalButton}`}
                    href={`${portalHref}#new-request`}
                    prefetch={false}
                  >
                    <DoodleIcon name="chat-heart" size={28} />
                    Start a support request
                  </Link>
                </div>
              </article>
              <article className={styles.portalCard}>
                <DoodleIcon name="calendar-heart" size={44} />
                <div>
                  <h3>Follow an existing request</h3>
                  <p>
                    Check your request’s status, read the team’s response and
                    send more details in the same conversation.
                  </p>
                  <Link
                    className={`${hero.cta} ${styles.portalButton}`}
                    href={`${portalHref}#request-history`}
                    prefetch={false}
                  >
                    <DoodleIcon name="calendar-heart" size={28} />
                    View my requests
                  </Link>
                </div>
              </article>
            </div>
          </section>
        )}

        <div className={styles.layout}>
          <section
            id="contact"
            className={`${scene.joinCard} ${styles.contact}`}
            aria-labelledby="contact-support-title"
          >
            <VerificationGlass className={scene.glassRefraction} />
            <div className={styles.contactInner}>
              <div className={styles.contactHeading}>
                <h2 id="contact-support-title">Talk to the team.</h2>
                <DoodleIcon name="chat-heart" size={56} />
              </div>
              <p className={styles.contactCopy}>
                No portal account, or trouble signing in? Ask about joining, an
                offer or getting access to your customer account.
              </p>
              <div className={styles.contactActions}>
                <a
                  href="https://m.me/FreshPhonesPh"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-describedby="support-messenger-note"
                  className={`${hero.apply} ${styles.messenger}`}
                >
                  <DoodleIcon name="chat-heart" size={28} />
                  <span>Chat on Messenger</span>
                </a>
                <a
                  href="tel:+639624791649"
                  className={`${hero.cta} ${styles.call}`}
                >
                  <Phone
                    size={24}
                    weight="fill"
                    aria-hidden="true"
                    data-button-icon
                  />
                  <span>Call 0962 479 1649</span>
                </a>
              </div>
              <p id="support-messenger-note" className={styles.channelNote}>
                Messenger opens in a new tab. Calling uses your phone’s calling
                app.
              </p>
              <a
                className={styles.facebook}
                href="https://web.facebook.com/FreshPhonesPh"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FacebookLogo
                  size={20}
                  weight="fill"
                  aria-hidden="true"
                  data-button-icon
                />
                <span>
                  Visit our Facebook page <small>(new tab)</small>
                </span>
              </a>
            </div>
          </section>

          <aside className={styles.faq} aria-labelledby="support-faq-title">
            <DoodleIcon name="application" size={48} />
            <h2 id="support-faq-title">Looking for a quick answer?</h2>
            <p>
              Search our FAQs by topic for payment options, devices and
              delivery.
            </p>
            <Link href={faqHref} className={`${hero.cta} ${styles.faqButton}`}>
              <DoodleIcon name="chat-heart" size={28} />
              Search FAQs
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
