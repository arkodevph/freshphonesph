"use client";

import Link from "next/link";
import FormFields from "./FormFields";
import { usePublicEnrollment } from "./usePublicEnrollment";
import styles from "./public-enrollment.module.css";

export default function PublicEnrollmentForm() {
  const workspace = usePublicEnrollment();

  if (workspace.reference) {
    return (
      <section
        className={styles.success}
        id="enrollment-success"
        tabIndex={-1}
        aria-labelledby="enrollment-success-title"
      >
        <span className={styles.eyebrow}>Thank you</span>
        <h1 id="enrollment-success-title">Application received</h1>
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
        <Link href="/">Back to Fresh Phones PH</Link>
      </section>
    );
  }

  if (workspace.loading || !workspace.form) {
    return (
      <section className={styles.formCard} aria-busy={workspace.loading}>
        <h1>Apply to join</h1>
        {workspace.loading ? (
          <p role="status">Loading the application form…</p>
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
              <Link href="/inquire">contact the Fresh Phones PH team</Link>.
            </p>
          </>
        )}
      </section>
    );
  }

  const definition = workspace.form.definition;

  const errors = Object.entries(workspace.errors).filter(
    (entry): entry is [string, string] => {
      return Boolean(entry[1]);
    },
  );

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
      className={styles.formCard}
      noValidate
      onSubmit={workspace.submit}
      aria-busy={workspace.pending}
    >
      <header className={styles.formHeader}>
        <p className={styles.eyebrow}>Membership application</p>
        <h1 id="enrollment-form-title" tabIndex={-1}>
          {definition.title}
        </h1>
        {definition.description && <p>{definition.description}</p>}
      </header>
      {errors.length > 0 && (
        <div
          className={styles.errorSummary}
          id="enrollment-errors"
          tabIndex={-1}
        >
          <h2>Check these details</h2>
          <ul>
            {errors.map(([key, message]) => {
              const target =
                key === "contactAcknowledged"
                  ? "enrollment-contact-acknowledgment"
                  : `public-enrollment-${key}`;

              return (
                <li key={key}>
                  <a
                    href={`#${target}`}
                    onClick={(event) => {
                      const element = document.getElementById(target);

                      if (element) {
                        event.preventDefault();

                        element.focus();

                        element.scrollIntoView({ block: "center" });
                      }
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
      <FormFields
        definition={definition}
        contact={workspace.contact}
        answers={workspace.answers}
        onContactChange={workspace.setContact}
        onAnswersChange={workspace.setAnswers}
        errors={workspace.errors}
        disabled={workspace.pending}
        showHeading={false}
        idPrefix="public-enrollment"
      />
      {workspace.previousAnswers.length > 0 && (
        <section
          className={styles.previous}
          aria-labelledby="previous-enrollment-answers"
        >
          <h2 id="previous-enrollment-answers">Previous responses</h2>
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
            href="/privacy/customer"
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
            aria-invalid={Boolean(workspace.errors.contactAcknowledged)}
            aria-describedby={
              workspace.errors.contactAcknowledged
                ? "enrollment-ack-error"
                : undefined
            }
            onChange={(event) => {
              workspace.setAcknowledged(event.target.checked);
            }}
          />
          <span>
            Fresh Phones PH may use these details to review and respond to my
            application. Please don’t include IDs or payment information.
          </span>
        </label>
        {workspace.errors.contactAcknowledged && (
          <p className={styles.error} id="enrollment-ack-error">
            {workspace.errors.contactAcknowledged}
          </p>
        )}
      </div>
      <button
        className={styles.submit}
        type="submit"
        disabled={workspace.pending || workspace.needsReview}
      >
        {workspace.pending ? "Please wait…" : "Submit application"}
      </button>
      <p className={styles.help}>
        An Agent reviews your application before a Batch Manager decides on
        enrollment. No batch position is reserved by this form.
      </p>
    </form>
  );
}
