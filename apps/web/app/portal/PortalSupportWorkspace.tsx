"use client";

import { type SupportCase, type SupportCaseDetail } from "@/lib/api";
import { ChatCircleText, Plus } from "@phosphor-icons/react";
import type * as React from "react";
import type { Dispatch, SetStateAction } from "react";
import styles from "./portal.module.css";
import { PortalLoadingRows } from "./PortalSkeleton";
import { SUPPORT_PAGE_SIZE } from "./portal-view";

type Props = {
  submitConcern: (event: React.FormEvent) => Promise<void>;
  concern: { category: string; description: string };
  setConcern: Dispatch<
    SetStateAction<{ category: string; description: string }>
  >;
  submitting: boolean;
  supportStatus: "loading" | "ready" | "error";
  cases: SupportCase[];
  loadSupport: () => void;
  visibleCases: SupportCase[];
  activeCaseId: string | null;
  openCase: (id: string) => Promise<void>;
  caseLoading: boolean;
  caseDetail: SupportCaseDetail | null;
  submitReply: (event: React.FormEvent) => Promise<void>;
  replyText: string;
  setReplyText: Dispatch<SetStateAction<string>>;
  replying: boolean;
  supportPageCount: number;
  currentSupportPage: number;
  changeSupportPage: (page: number) => void;
};

export default function PortalSupportWorkspace({
  submitConcern,
  concern,
  setConcern,
  submitting,
  supportStatus,
  cases,
  loadSupport,
  visibleCases,
  activeCaseId,
  openCase,
  caseLoading,
  caseDetail,
  submitReply,
  replyText,
  setReplyText,
  replying,
  supportPageCount,
  currentSupportPage,
  changeSupportPage,
}: Props) {
  return (
    <div className={styles.supportWorkspace}>
      <section
        id="new-request"
        tabIndex={-1}
        className={`${styles.sectionCard} ${styles.supportCompose}`}
        aria-labelledby="support-compose-title"
      >
        <div className={styles.sectionHeading}>
          <span className={`${styles.sectionIcon} ${styles.supportIcon}`}>
            <ChatCircleText weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>Need help?</p>
            <h2 id="support-compose-title">Send a request</h2>
          </div>
        </div>
        <form onSubmit={submitConcern} className={styles.supportForm}>
          <label className={styles.supportField}>
            Category
            <select
              value={concern.category}
              onChange={(event) => {
                return setConcern({
                  ...concern,
                  category: event.target.value,
                });
              }}
            >
              <option>Payment</option>
              <option>Unit / device</option>
              <option>Account</option>
              <option>Other</option>
            </select>
          </label>
          <label className={styles.supportField}>
            Describe your concern
            <textarea
              required
              minLength={10}
              maxLength={5000}
              value={concern.description}
              onChange={(event) => {
                return setConcern({
                  ...concern,
                  description: event.target.value,
                });
              }}
              placeholder="Tell us what happened and include any useful details…"
            />
          </label>
          <div className={styles.supportFormActions}>
            <button type="submit" disabled={submitting}>
              <Plus weight="bold" aria-hidden="true" />{" "}
              {submitting ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      </section>
      <section
        id="request-history"
        tabIndex={-1}
        className={`${styles.sectionCard} ${styles.supportRequests}`}
        aria-labelledby="support-requests-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Follow up</p>
            <h2 id="support-requests-title">Your requests</h2>
          </div>
          {supportStatus === "ready" && cases.length > 0 && (
            <span className={styles.count}>
              {cases.length} {cases.length === 1 ? "request" : "requests"}
            </span>
          )}
        </div>
        {supportStatus === "error" ? (
          <div className={styles.attentionState} role="alert">
            <p>Couldn’t load your support requests.</p>
            <button type="button" onClick={loadSupport}>
              Try again
            </button>
          </div>
        ) : supportStatus === "loading" ? (
          <PortalLoadingRows rows={2} label="Loading support requests" />
        ) : cases.length === 0 ? (
          <div className={styles.supportEmpty}>
            <span>
              <ChatCircleText weight="duotone" aria-hidden="true" />
            </span>
            <h3>No requests yet</h3>
            <p>Requests and replies from Customer Service will appear here.</p>
          </div>
        ) : (
          <>
            <ul className={styles.supportList}>
              {visibleCases.map((item) => {
                return (
                  <li key={item.id} id={`case-${item.id}`}>
                    <div className={styles.supportCaseContent}>
                      <div className={styles.supportCaseHeader}>
                        <div>
                          <strong>{item.category}</strong>
                          <small>Request #{String(item.id).slice(0, 8)}</small>
                        </div>
                        <span className={styles.supportCaseStatus}>
                          {item.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <span>{item.description}</span>
                      {item.assigned_staff_name && (
                        <small>Assigned to {item.assigned_staff_name}</small>
                      )}
                      {item.resolution && (
                        <small>Resolution: {item.resolution}</small>
                      )}
                      {item.status.toLowerCase() === "waiting_for_client" && (
                        <p className={styles.replyPrompt}>
                          Customer Service is waiting for your reply on this
                          request.
                        </p>
                      )}
                      <button
                        type="button"
                        className={styles.caseToggle}
                        aria-controls={`conversation-${item.id}`}
                        aria-expanded={activeCaseId === String(item.id)}
                        onClick={() => {
                          return void openCase(String(item.id));
                        }}
                      >
                        {activeCaseId === String(item.id)
                          ? "Hide conversation"
                          : item.status.toLowerCase() === "waiting_for_client"
                            ? "Reply to this request"
                            : "View conversation"}
                      </button>
                      {activeCaseId === String(item.id) && (
                        <div
                          id={`conversation-${item.id}`}
                          className={styles.conversation}
                        >
                          {caseLoading ? (
                            <PortalLoadingRows
                              rows={2}
                              label="Loading conversation"
                            />
                          ) : caseDetail?.id === item.id ? (
                            <>
                              <ol>
                                {caseDetail.messages.map((message) => {
                                  return (
                                    <li
                                      key={message.id}
                                      className={
                                        message.author_type === "customer"
                                          ? styles.customerReply
                                          : ""
                                      }
                                    >
                                      <strong>
                                        {message.author_type === "customer"
                                          ? "You"
                                          : "Customer Service"}
                                      </strong>
                                      <p>{message.body}</p>
                                      <small>
                                        {new Date(
                                          message.created_at,
                                        ).toLocaleString("en-PH")}
                                      </small>
                                    </li>
                                  );
                                })}
                              </ol>
                              {!["closed", "resolved"].includes(
                                caseDetail.status.toLowerCase(),
                              ) && (
                                <form
                                  onSubmit={submitReply}
                                  className={styles.replyForm}
                                >
                                  <label htmlFor={`reply-${item.id}`}>
                                    Your reply
                                  </label>
                                  <textarea
                                    id={`reply-${item.id}`}
                                    value={replyText}
                                    onChange={(event) => {
                                      return setReplyText(event.target.value);
                                    }}
                                    maxLength={5000}
                                    required
                                    placeholder="Add the details Customer Service needs…"
                                  />
                                  <button
                                    type="submit"
                                    disabled={replying || !replyText.trim()}
                                  >
                                    {replying ? "Sending…" : "Send reply"}
                                  </button>
                                </form>
                              )}
                            </>
                          ) : (
                            <p>
                              Could not load this conversation. Try opening it
                              again.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {supportPageCount > 1 && (
              <nav
                className={styles.supportPagination}
                aria-label="Support request pages"
              >
                <span>
                  Showing {(currentSupportPage - 1) * SUPPORT_PAGE_SIZE + 1}–
                  {Math.min(
                    currentSupportPage * SUPPORT_PAGE_SIZE,
                    cases.length,
                  )}{" "}
                  of {cases.length} requests
                </span>
                <div>
                  <button
                    type="button"
                    disabled={currentSupportPage === 1}
                    onClick={() => {
                      return changeSupportPage(currentSupportPage - 1);
                    }}
                  >
                    Previous
                  </button>
                  <span aria-live="polite">
                    Page {currentSupportPage} of {supportPageCount}
                  </span>
                  <button
                    type="button"
                    disabled={currentSupportPage === supportPageCount}
                    onClick={() => {
                      return changeSupportPage(currentSupportPage + 1);
                    }}
                  >
                    Next
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
