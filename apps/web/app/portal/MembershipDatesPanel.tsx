"use client";

import {
  type PortalScheduleItem,
  type PortalSummary,
  type SupportCase,
} from "@/lib/api";
import {
  Calendar as CalendarBlank,
  InfoCircle as Info,
} from "@/components/SolarIcons";
import Link from "next/link";
import type * as React from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import MembershipDatesCalendar from "./MembershipDatesCalendar";
import styles from "./portal.module.css";

type Props = {
  summary: PortalSummary;
  schedule: PortalScheduleItem[];
  reportTriggerRef: RefObject<HTMLButtonElement | null>;
  reportOpen: boolean;
  reportSubmitting: boolean;
  setReportOpen: Dispatch<SetStateAction<boolean>>;
  setReportError: Dispatch<SetStateAction<string | null>>;
  setReportCaseId: Dispatch<SetStateAction<string | null>>;
  submitMembershipCorrection: (event: React.FormEvent) => Promise<void>;
  reportInputRef: RefObject<HTMLTextAreaElement | null>;
  reportText: string;
  setReportText: Dispatch<SetStateAction<string>>;
  reportError: string | null;
  reportCaseId: string | null;
  cases: SupportCase[];
};

export default function MembershipDatesPanel({
  summary,
  schedule,
  reportTriggerRef,
  reportOpen,
  reportSubmitting,
  setReportOpen,
  setReportError,
  setReportCaseId,
  submitMembershipCorrection,
  reportInputRef,
  reportText,
  setReportText,
  reportError,
  reportCaseId,
  cases,
}: Props) {
  return (
    <section
      className={`${styles.sectionCard} ${styles.membershipDatesCard}`}
      aria-labelledby="membership-dates-title"
    >
      <div className={styles.sectionHeading}>
        <span className={`${styles.sectionIcon} ${styles.scheduleIcon}`}>
          <CalendarBlank aria-hidden="true" />
        </span>
        <div>
          <p className={styles.eyebrow}>Your timeline</p>
          <h2 id="membership-dates-title">Enrollment dates</h2>
        </div>
      </div>
      <MembershipDatesCalendar summary={summary} schedule={schedule} />
      <div className={styles.membershipGuidance}>
        <Info aria-hidden="true" />
        <p>
          The planned batch end is not a collection appointment. Your collection
          details appear in <Link href="/portal/release">release updates</Link>.
        </p>
      </div>
      <div className={styles.correctionArea}>
        <div>
          <h3>Something incorrect?</h3>
          <p>
            Describe the change you need. Your enrollment record will be
            attached to the request for Customer Service.
          </p>
        </div>
        <button
          ref={reportTriggerRef}
          type="button"
          className={styles.correctionTrigger}
          aria-expanded={reportOpen}
          aria-controls={reportOpen ? "membership-correction-form" : undefined}
          disabled={reportSubmitting}
          onClick={() => {
            setReportOpen((open) => {
              return !open;
            });

            setReportError(null);

            setReportCaseId(null);
          }}
        >
          {reportOpen ? "Close form" : "Report incorrect details"}
        </button>
      </div>
      {reportOpen && (
        <form
          id="membership-correction-form"
          className={styles.correctionForm}
          onSubmit={submitMembershipCorrection}
        >
          <label htmlFor="membership-correction">What should we correct?</label>
          <textarea
            ref={reportInputRef}
            id="membership-correction"
            required
            minLength={10}
            maxLength={4000}
            value={reportText}
            onChange={(event) => {
              return setReportText(event.target.value);
            }}
            placeholder="For example: My unit should be iPhone 16 Pro, not iPhone 16."
          />
          <p>
            Customer Service will review your request. Changes to the record are
            made by staff.
          </p>
          {reportError && (
            <p className={styles.correctionError} role="alert">
              {reportError}
            </p>
          )}
          <button type="submit" disabled={reportSubmitting}>
            {reportSubmitting ? "Sending…" : "Send correction request"}
          </button>
        </form>
      )}
      {reportCaseId && (
        <p className={styles.correctionSuccess} role="status">
          Request sent to Customer Service.{" "}
          <Link href={`/portal/support#case-${reportCaseId}`}>
            View your support request
          </Link>
          .
        </p>
      )}
      {cases.some((item) => {
        return item.description.startsWith(
          "Membership details correction request",
        );
      }) && (
        <div className={styles.correctionHistory}>
          <h3>Correction requests</h3>
          <ul>
            {cases
              .filter((item) => {
                return item.description.startsWith(
                  "Membership details correction request",
                );
              })
              .map((item) => {
                return (
                  <li key={item.id}>
                    <span>
                      Request #{String(item.id).slice(0, 8)} ·{" "}
                      {item.status.replaceAll("_", " ")}
                      {item.resolution ? ` · ${item.resolution}` : ""}
                    </span>
                    <Link href={`/portal/support#case-${item.id}`}>
                      View request
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </section>
  );
}
