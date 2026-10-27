import {
  CalendarCheck,
  ChatCircleDots,
  CheckCircle,
  IdentificationCard,
  ShieldCheck,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import AgentVerification from "./AgentVerification";
import ProcessStack from "./ProcessStack";
import Testimonials from "./Testimonials";
import styles from "./LandingContent.module.css";

export function Process() {
  return (
    <ProcessStack>
      <Testimonials staged />
    </ProcessStack>
  );
}

const requirements = [
  "Valid government-issued ID",
  "Proof of residency",
  "Proof of income, when applicable",
  "Recent customer photo",
  "Contact or reference person",
  "Other requirements after review",
];

export function RequirementsAndPayments() {
  return (
    <section
      id="requirements"
      className={`landing-content-section ${styles.requirements}`}
    >
      <SectionHeading
        eyebrow="Before you apply"
        title={
          <>
            Know what to <span className="holo-text">prepare</span>
          </>
        }
        subtitle="Review the requirements and payment process before deciding to join."
      />
      <div className={styles.preparation}>
        <article className={styles.panel}>
          <IdentificationCard
            weight="duotone"
            className={styles.icon}
            aria-hidden="true"
          />
          <h3>Application requirements</h3>
          <p>
            Prepare these common items. Final requirements may vary after
            review.
          </p>
          <ul className={styles.checklist}>
            {requirements.map((item) => {
              return (
                <li key={item}>
                  <CheckCircle weight="fill" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
          <p className={styles.note}>
            Sensitive documents are never uploaded through the public website.
          </p>
        </article>
        <article className={styles.panel}>
          <Wallet weight="duotone" className={styles.icon} aria-hidden="true" />
          <h3>Payments &amp; your records</h3>
          <p>
            Payments are coordinated through Fresh Phones PH&apos;s authorized
            channels and official Messenger group chats.
          </p>
          <div className={styles.record}>
            <h4>Your customer portal</h4>
            <p>
              Check payment records, verification status, remaining balance, due
              dates, and paluwagan progress.
            </p>
          </div>
          <div className={styles.record}>
            <h4>Statement of Account</h4>
            <p>
              Review amounts due and verified payments. Statements are for
              account reference and are not official BIR invoices.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

export function VerifyAndBenefits() {
  const benefits = [
    [ShieldCheck, "Transparent process"],
    [IdentificationCard, "Verified agents"],
    [CalendarCheck, "Organized paluwagan"],
    [ChatCircleDots, "Customer support"],
  ] as const;

  return (
    <section id="verify" className="scroll-mt-24 px-4 py-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <span className="pill inline-flex rounded-full px-4 py-1.5 text-sm font-800 text-blue">
            VERIFY BEFORE YOU TRANSACT
          </span>
          <h2 className="mt-4 font-display text-4xl font-700 text-blue-ink">
            Is your agent official?
          </h2>
          <p className="mt-3 font-500 leading-relaxed text-ink-soft">
            Enter their complete name or Agent ID before transacting. Private
            contact and identity records are never displayed.
          </p>
        </div>
        <AgentVerification />
      </div>
      <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map(([Icon, title]) => {
          return (
            <article key={title} className="rounded-3xl bg-white/55 p-5">
              <Icon className="h-7 w-7 text-blue" weight="duotone" />
              <h3 className="mt-3 font-display text-lg font-700 text-blue-ink">
                {title}
              </h3>
              <p className="mt-1 text-sm font-500 text-ink-soft">
                Clear, human guidance designed to keep customers informed.
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
