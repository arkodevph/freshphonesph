"use client";

import { useId } from "react";
import { useInquiryForm } from "@/lib/useInquiryForm";
import styles from "./InquiryForm.module.css";

export default function InquiryForm({
  deviceName,
  fullPage = false,
}: {
  deviceName?: string;
  fullPage?: boolean;
}) {
  const id = useId();

  const { ready, pending, error, reference, submit } =
    useInquiryForm(deviceName);

  if (reference) {
    return (
      <div className={styles.success} role="status">
        <h4>Inquiry sent to our team</h4>
        <p>Customer Service will contact you using the details you provided.</p>
        <p className={styles.reference}>Reference: {reference}</p>
        <p>
          This is an inquiry. Availability, amounts and enrollment will be
          confirmed by the team.
        </p>
      </div>
    );
  }

  return (
    <form
      method="post"
      onSubmit={submit}
      className={`${styles.form} ${fullPage ? styles.fullPage : ""}`}
      aria-label="Device inquiry"
      aria-busy={pending}
    >
      {!fullPage && (
        <div>
          <h4>Ask about {deviceName || "a device"}</h4>
          <p>
            Send your details directly to our team. We’ll contact you to discuss
            the offer.
          </p>
        </div>
      )}
      <fieldset disabled={pending}>
        {deviceName ? (
          <p className={styles.device}>
            Selected device: <strong>{deviceName}</strong>
          </p>
        ) : (
          <label htmlFor={`${id}-device`}>
            Device you’re interested in
            <input
              id={`${id}-device`}
              name="deviceName"
              required
              maxLength={160}
              placeholder="e.g. iPhone 12 128GB"
            />
          </label>
        )}
        <label htmlFor={`${id}-name`}>
          Full name
          <input
            id={`${id}-name`}
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label htmlFor={`${id}-phone`}>
          Phone number
          <input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            minLength={7}
            maxLength={30}
            placeholder="09XX XXX XXXX"
          />
        </label>
        <label htmlFor={`${id}-email`}>
          Email <span>(optional)</span>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <label htmlFor={`${id}-message`}>
          Your question <span>(optional)</span>
          <textarea
            id={`${id}-message`}
            name="message"
            rows={3}
            maxLength={2000}
            placeholder="What would you like to know?"
          />
        </label>
        <label className={styles.consent}>
          <input
            name="contactAcknowledged"
            type="checkbox"
            required
            aria-describedby={`${id}-contact-help`}
          />
          <span id={`${id}-contact-help`}>
            Fresh Phones PH may use these details to respond to this inquiry.
            Please don’t include IDs or payment information.
          </span>
        </label>
      </fieldset>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button type="submit" disabled={pending || !ready}>
        {!ready
          ? "Loading form…"
          : pending
            ? "Sending inquiry…"
            : "Send inquiry to the team"}
      </button>
      <p className={styles.help}>
        Submitting does not reserve a device or enroll you in a payment plan.
      </p>
    </form>
  );
}
