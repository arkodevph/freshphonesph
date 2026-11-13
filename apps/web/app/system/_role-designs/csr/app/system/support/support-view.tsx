"use client";

export const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-2/70 text-blue-ink",
  waiting_for_client: "bg-violet-100 text-violet-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-ink-soft/15 text-ink-soft",
};

export type ResolutionDraft = {
  status: string;
  resolution: string;
  version?: number;
};

export type ReplyDraft = { text: string; needsReply: boolean };

export const emptyReply: ReplyDraft = { text: "", needsReply: false };
