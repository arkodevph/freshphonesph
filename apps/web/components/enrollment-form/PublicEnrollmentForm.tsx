"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { CSSProperties } from "react";
import { publicSiteHref, type PublicSiteBase } from "@/lib/public-site-links";
import DoodleIcon from "../DoodleIcon";
import FormFields from "./FormFields";
import EnrollmentReview from "./EnrollmentReview";
import { usePublicEnrollment } from "./usePublicEnrollment";
import { useEnrollmentSteps } from "./useEnrollmentSteps";
import styles from "./public-enrollment.module.css";

const views = {
  contact: {
    label: "Your details",
    eyebrow: "LET’S START WITH YOU",
    title: "A little about you.",
    icon: "id-heart",
  },
  questions: {
    label: "Application details",
    eyebrow: "MAKE IT YOURS",
    title: "Tell us a little more.",
    icon: "phone-heart",
  },
  review: {
    label: "Review & send",
    eyebrow: "ONE LAST LOOK",
    title: "Ready to send?",
    icon: "application",
  },
} as const;

export default function PublicEnrollmentForm({
  siteBasePath = "",
}: {
  siteBasePath?: PublicSiteBase;
}) {
  const workspace = usePublicEnrollment();

  const wizard = useEnrollmentSteps(workspace);

  if (workspace.reference) {
    return (
      <section
        className={styles.success}
        id="enrollment-success"
        tabIndex={-1}
        aria-labelledby="enrollment-success-title"
      >
        <span className={styles.successIcon}>
          <DoodleIcon name="application" size={56} />
        </span>
        <span className={styles.eyebrow}>Thank you</span>
        <h2 id="enrollment-success-title">Application received</h2>
        <p>
          Our team will review your application and contact you using the
          details you provided.
        </p>
        <p className={styles.reference}>
          Reference: <strong>{workspace.reference}</strong>
        </p>
        <p>
          Your application will be reviewed before enrollment. Submitting does
          not reserve a batch position or enroll you in a payment plan.
        </p>
        <Link href={publicSiteHref("/", siteBasePath)}>
          Back to Fresh Phones PH
        </Link>
      </section>
    );
  }

  if (workspace.loading || !workspace.form) {
    return (
      <section
        className={styles.formCard}
        id="membership-application"
        aria-busy={workspace.loading}
      >
        <header className={styles.formHeader}>
          <div>
            <p className={styles.eyebrow}>Membership application</p>
            <h2>Let’s get started.</h2>
          </div>
          <span className={styles.stepIcon}>
            <DoodleIcon name="application" size={48} />
          </span>
        </header>
        {workspace.loading ? (
          <>
            <div className={styles.loadingFields} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p role="status">Loading the application form…</p>
          </>
        ) : (
          <>
            <p role="alert">{workspace.error}</p>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                void workspace.load();
              }}
            >
              Try again
            </button>
            <p>
              For help,{" "}
              <Link href={publicSiteHref("/inquire", siteBasePath)}>
                contact the Fresh Phones PH team
              </Link>
              .
            </p>
          </>
        )}
        <noscript>
          <p>
            Enable JavaScript to fill in the application, or{" "}
            <a href={publicSiteHref("/inquire", siteBasePath)}>
              contact our team for help
            </a>
            .
          </p>
        </noscript>
      </section>
    );
  }

  const definition = workspace.form.definition;

  const view = views[wizard.step];

  const errors = Object.entries(wizard.errors).filter(
    (entry): entry is [string, string] => {
      return Boolean(entry[1]);
    },
  );

  const hasAnswers = Object.values(workspace.answers).some((value) => {
    return typeof value === "string" ? Boolean(value.trim()) : value.length > 0;
  });

  const optionalQuestions = definition.questions.every((question) => {
    return !question.required;
  });

  const skip = wizard.step === "questions" && optionalQuestions && !hasAnswers;

  function label(key: string) {
    if (key === "name" || key === "phone" || key === "email") {
      return definition.contact[key].label;
    }

    if (key === "contactAcknowledged") {
      return "Contact acknowledgment";
    }

    return (
      definition.questions.find((question) => {
        return question.id === key;
      })?.label ?? "Application details"
    );
  }

  return (
    <form
      id="membership-application"
      className={styles.formCard}
      noValidate
      onSubmit={wizard.submit}
      aria-busy={workspace.pending}
      aria-labelledby="enrollment-form-title"
      data-enrollment-stage={wizard.step}
    >
      <div className={styles.progressMeta}>
        <span aria-live="polite" aria-atomic="true">
          Step {String(wizard.index + 1).padStart(2, "0")} of{" "}
          {String(wizard.steps.length).padStart(2, "0")}
        </span>
        <span>{definition.title}</span>
      </div>
      <ol
        className={styles.steps}
        aria-label="Application progress"
        style={{ "--enrollment-steps": wizard.steps.length } as CSSProperties}
      >
        {wizard.steps.map((step, index) => {
          return (
            <li key={step} data-complete={index < wizard.index || undefined}>
              <button
                type="button"
                aria-current={step === wizard.step ? "step" : undefined}
                disabled={
                  workspace.pending ||
                  workspace.needsReview ||
                  index > wizard.index
                }
                onClick={() => {
                  return wizard.goTo(step);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{views[step].label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <header className={styles.formHeader}>
        <div>
          <p className={styles.eyebrow}>{view.eyebrow}</p>
          <h2 id="enrollment-form-title" tabIndex={-1}>
            {view.title}
          </h2>
          <p>
            {wizard.step === "contact"
              ? definition.description
              : wizard.step === "questions"
                ? `Add the details you’d like our team to review.${optionalQuestions ? " This step is optional." : ""}`
                : "Check your details, then confirm that our team may contact you."}
          </p>
        </div>
        <span className={styles.stepIcon} aria-hidden="true">
          <DoodleIcon name={view.icon} size={48} />
        </span>
      </header>
      {errors.length > 0 && (
        <div
          className={styles.errorSummary}
          id="enrollment-errors"
          tabIndex={-1}
        >
          <h3>Check these details</h3>
          <ul>
            {errors.map(([key, message]) => {
              return (
                <li key={key}>
                  <a
                    href={
                      key === "contactAcknowledged"
                        ? "#enrollment-contact-acknowledgment"
                        : `#public-enrollment-${key}`
                    }
                    onClick={(event) => {
                      event.preventDefault();

                      wizard.edit(key);
                    }}
                  >
                    {label(key)}: {message}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {workspace.error && (
        <p className={styles.error} role="alert">
          {workspace.error}
        </p>
      )}
      {workspace.needsReview && (
        <div className={styles.updateNotice}>
          <p>
            Your details and answers are still here. Open the updated form to
            see what changed.
          </p>
          <button
            type="button"
            className={styles.button}
            disabled={workspace.pending}
            onClick={() => {
              void workspace.reviewUpdatedForm();
            }}
          >
            Review updated form
          </button>
        </div>
      )}
      <div className={styles.stepPanel} hidden={wizard.step !== "contact"}>
        <FormFields
          section="contact"
          definition={definition}
          contact={workspace.contact}
          answers={workspace.answers}
          onContactChange={wizard.setContact}
          onAnswersChange={wizard.setAnswers}
          errors={wizard.errors}
          disabled={workspace.pending}
          showHeading={false}
          idPrefix="public-enrollment"
        />
      </div>
      <div className={styles.stepPanel} hidden={wizard.step !== "questions"}>
        <FormFields
          section="questions"
          definition={definition}
          contact={workspace.contact}
          answers={workspace.answers}
          onContactChange={wizard.setContact}
          onAnswersChange={wizard.setAnswers}
          errors={wizard.errors}
          disabled={workspace.pending}
          showHeading={false}
          idPrefix="public-enrollment"
        />
      </div>
      <div className={styles.stepPanel} hidden={wizard.step !== "review"}>
        <EnrollmentReview
          definition={definition}
          contact={workspace.contact}
          answers={workspace.answers}
          onEdit={wizard.edit}
          disabled={workspace.pending}
        />
        {workspace.previousAnswers.length > 0 && (
          <section
            className={styles.previous}
            aria-labelledby="previous-enrollment-answers"
          >
            <h3 id="previous-enrollment-answers">Previous responses</h3>
            <p>
              These questions changed or were removed. These earlier responses
              will not be submitted with the updated form. You can copy details
              you still want to include.
            </p>
            <dl>
              {workspace.previousAnswers.map((answer) => {
                return (
                  <div key={answer.id}>
                    <dt>{answer.label}</dt>
                    <dd>{answer.value}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}
        <div className={styles.privacy}>
          <p>
            Read the{" "}
            <Link
              href={publicSiteHref("/privacy/customer", siteBasePath)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Customer Privacy Notice
            </Link>{" "}
            before sharing your details.
          </p>
          <label className={styles.acknowledgment}>
            <input
              id="enrollment-contact-acknowledgment"
              type="checkbox"
              checked={workspace.acknowledged}
              disabled={workspace.pending}
              required
              aria-invalid={Boolean(wizard.errors.contactAcknowledged)}
              aria-describedby={
                wizard.errors.contactAcknowledged
                  ? "enrollment-ack-error"
                  : undefined
              }
              onChange={(event) => {
                return wizard.setAcknowledged(event.target.checked);
              }}
            />
            <span>
              Fresh Phones PH may use these details to review and respond to my
              application. Please don’t include IDs or payment information.
            </span>
          </label>
          {wizard.errors.contactAcknowledged && (
            <p className={styles.error} id="enrollment-ack-error">
              {wizard.errors.contactAcknowledged}
            </p>
          )}
        </div>
      </div>
      <div className={styles.formActions}>
        {wizard.index > 0 ? (
          <button
            className={styles.back}
            type="button"
            disabled={workspace.pending || workspace.needsReview}
            onClick={() => {
              return wizard.goTo(wizard.steps[wizard.index - 1]!);
            }}
          >
            <ArrowLeft aria-hidden="true" size={18} />
            Back
          </button>
        ) : (
          <p className={styles.actionHint}>
            <DoodleIcon name="shield-heart" size={28} />
            Reviewed by our team.
          </p>
        )}
        <button
          className={styles.submit}
          type="submit"
          disabled={workspace.pending || workspace.needsReview}
        >
          <span>
            {workspace.pending
              ? "Please wait…"
              : wizard.step === "review"
                ? "Submit application"
                : skip
                  ? "Skip for now"
                  : "Continue"}
          </span>
          <span className={styles.actionArrow} aria-hidden="true">
            <ArrowRight size={20} />
          </span>
        </button>
      </div>
      <p className={styles.help}>
        An Agent reviews your application before a Batch Manager decides on
        enrollment. No batch position is reserved by this form.
      </p>
    </form>
  );
}
