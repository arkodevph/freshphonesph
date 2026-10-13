"use client";

import { supportSourceLabel, type SupportCaseDetail } from "@/lib/api";
import type * as React from "react";
import type { Dispatch, SetStateAction } from "react";
import { ReplyDraft } from "./support-view";

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
  return (
    <section
      aria-label="Support conversation"
      className="glass mb-4 rounded-3xl p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-base font-700 text-blue-ink">
          Case #{activeCaseId.slice(0, 8)} conversation
        </h2>
        <button
          type="button"
          onClick={closeThread}
          className="shrink-0 rounded-lg bg-white/70 px-3 py-1 text-xs font-700 text-blue-ink"
        >
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
          <ol className="mt-4 grid gap-2">
            {caseDetail.messages.map((message) => {
              return (
                <li key={message.id} className="rounded-xl bg-white/70 p-3">
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
            <form onSubmit={sendReply} className="mt-4 grid gap-2">
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
                className="justify-self-start rounded-xl bg-blue px-4 py-2 text-sm font-700 text-white disabled:opacity-40"
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
