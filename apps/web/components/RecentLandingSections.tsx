import Image from "next/image";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import AgentVerification from "./AgentVerification";
import ProcessStack from "./ProcessStack";
import Testimonials from "./Testimonials";
import styles from "./LandingContent.module.css";
import DoodleIcon from "./DoodleIcon";
import verification from "./AgentVerification.module.css";

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
        <article className={`${styles.panel} ${styles.requirementsPanel}`}>
          <DoodleIcon name="id-heart" className={styles.icon} size={36} />
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
        <div className={styles.paymentsCard}>
          <div className={styles.paymentMascot} aria-hidden="true">
            <Image
              src="/brand/mascot/cloud-boy-guidance-v1.png"
              alt=""
              width={1254}
              height={1254}
              sizes="(max-width: 1199px) 176px, 224px"
            />
          </div>
          <article className={`${styles.panel} ${styles.paymentPanel}`}>
            <DoodleIcon name="wallet-heart" className={styles.icon} size={36} />
            <h3>Payments &amp; your records</h3>
            <p>
              Payments are coordinated through Fresh Phones PH&apos;s authorized
              channels and official Messenger group chats.
            </p>
            <div className={styles.record}>
              <h4>Your customer portal</h4>
              <p>
                Check payment records, verification status, remaining balance,
                due dates, and paluwagan progress.
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
      </div>
    </section>
  );
}

export function VerifyAndBenefits() {
  const benefits = [
    {
      icon: "application",
      title: "Transparent process",
      body: "Unit details and payment options, explained before you commit.",
    },
    {
      icon: "id-heart",
      title: "Verified agents",
      body: "Check an agent's name, masked code, and current status in our directory.",
    },
    {
      icon: "calendar-heart",
      title: "Organized paluwagan",
      body: "Keep track of due dates and verified payments in your customer portal.",
    },
    {
      icon: "chat-heart",
      title: "Customer support",
      body: "From choosing a unit to understanding your plan, questions are welcome.",
    },
  ] as const;

  return (
    <section
      id="verify"
      className={verification.section}
      aria-labelledby="agent-verification-title"
    >
      <header className={verification.intro}>
        <p className={verification.eyebrow}>Verify before you transact</p>
        <h2 id="agent-verification-title" className={verification.title}>
          Is your agent <span>official?</span>
        </h2>
        <p className={verification.subtitle}>
          Enter their complete name or Agent ID before transacting.
          <br className={verification.desktopBreak} /> A quick check for a
          little more peace of mind.
        </p>
      </header>
      <div className={verification.layout}>
        <AgentVerification />
        <aside
          className={verification.assurances}
          aria-labelledby="agent-assurances-title"
        >
          <p className={verification.eyebrow}>The Fresh Phones way</p>
          <h3
            id="agent-assurances-title"
            className={verification.assurancesTitle}
          >
            A little clarity.
            <br /> A lot of care.
          </h3>
          <div className={verification.benefits}>
            {benefits.map((item) => {
              return (
                <article key={item.title} className={verification.benefit}>
                  <DoodleIcon name={item.icon} size={40} />
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
