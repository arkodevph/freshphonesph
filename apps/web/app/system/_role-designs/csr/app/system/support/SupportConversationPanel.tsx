"use client";

import { supportSourceLabel, type SupportCaseDetail } from "@/lib/api";
import type * as React from "react";
import { useEffect, useRef } from "react";
import styles from "@/app/system/_role-designs/csr/app/system/support/support-workspace.module.css";
import type { Dispatch, SetStateAction } from "react";
import { ReplyDraft } from "@/app/system/_role-designs/csr/app/system/support/support-view";

type Props = {
  activeCaseId: string;
  closeThread: () => void;
  caseLoading: boolean;
  detailError: string | null;
  loadDetail: (id: string) => Promise<void>;
  caseDetail: SupportCaseDetail | null;
  sendReply: (event: React.FormEvent) => Promise<void>;
  reply: ReplyDraft;
  setReplies: Dispatch<SetStateAction<Record<string, ReplyDraft>>>;
  pending: string | null;
};

export default function SupportConversationPanel({
  activeCaseId,
  closeThread,
  caseLoading,
  detailError,
  loadDetail,
  caseDetail,
  sendReply,
  reply,
  setReplies,
  pending,
}: Props) {
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    title.current?.focus({ preventScroll: true });

    if (window.matchMedia("(max-width: 1100px)").matches) {
      title.current?.scrollIntoView({ behavior: "instant", block: "center" });
    }
  }, [activeCaseId]);

  return (
    <section aria-label="Support conversation" className={styles.conversation}>
      <div className={styles.conversationHeader}>
        <h2 ref={title} tabIndex={-1}>
          Case #{activeCaseId.slice(0, 8)}
        </h2>
        <button type="button" onClick={closeThread} className={styles.button}>
          Hide thread
        </button>
      </div>
      {caseLoading && (
        <p role="status" className="mt-3 text-sm text-ink-soft">
          Refreshing conversation…
        </p>
      )}
      {detailError && (
        <div role="alert" className="mt-3 text-sm text-rose-700">
          <p>{detailError}</p>
          <button
            type="button"
            onClick={() => {
              return void loadDetail(activeCaseId);
            }}
            className="mt-2 rounded-lg bg-blue px-3 py-1.5 font-700 text-white"
          >
            Retry conversation
          </button>
        </div>
      )}
      {caseDetail && String(caseDetail.id) === activeCaseId && (
        <>
          <p className="mt-3 break-words text-sm font-700 text-blue-ink">
            {caseDetail.client_name} · {caseDetail.category} ·{" "}
            {supportSourceLabel(caseDetail.source)}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-soft">
            {caseDetail.description}
          </p>
          <ol className={styles.messages}>
            {caseDetail.messages.map((message) => {
              return (
                <li key={message.id} data-author={message.author_type}>
                  <strong className="text-xs text-blue-ink">
                    {message.author_type === "customer"
                      ? "Customer"
                      : "Customer Service"}
                  </strong>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-soft">
                    {message.body}
                  </p>
                  <small className="text-xs text-ink-soft">
                    {new Date(message.created_at).toLocaleString("en-PH", {
                      timeZone: "Asia/Manila",
                    })}{" "}
                    PHT
                  </small>
                </li>
              );
            })}
          </ol>
          {!["resolved", "closed"].includes(caseDetail.status) ? (
            <form onSubmit={sendReply} className={styles.replyForm}>
              <label
                htmlFor="staff-reply"
                className="text-sm font-700 text-blue-ink"
              >
                Reply to customer
              </label>
              <textarea
                id="staff-reply"
                value={reply.text}
                onChange={(event) => {
                  return setReplies((current) => {
                    return {
                      ...current,
                      [activeCaseId]: {
                        ...reply,
                        text: event.target.value,
                      },
                    };
                  });
                }}
                disabled={!!pending}
                maxLength={5000}
                required
                className="min-h-24 rounded-xl border border-violet-200 bg-white/70 p-3 text-sm"
                placeholder="Write a customer-visible reply…"
              />
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={reply.needsReply}
                  disabled={!!pending}
                  onChange={(event) => {
                    return setReplies((current) => {
                      return {
                        ...current,
                        [activeCaseId]: {
                          ...reply,
                          needsReply: event.target.checked,
                        },
                      };
                    });
                  }}
                />
                Needs customer response
              </label>
              <button
                type="submit"
                disabled={!!pending || caseLoading || !reply.text.trim()}
                className={styles.primary}
              >
                {pending === "reply" ? "Sending…" : "Send reply"}
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-ink-soft">
              This case is {caseDetail.status}.
              {reply.text &&
                " Your unsent reply is retained if this case reopens."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
