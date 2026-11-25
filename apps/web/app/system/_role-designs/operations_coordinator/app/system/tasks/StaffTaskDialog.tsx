"use client";

import type { Me } from "@/lib/api";
import type { Dispatch, RefObject, SetStateAction, FormEvent } from "react";
import type { Task } from "./task-view";
import TaskDetailPanel from "@/app/system/_role-designs/operations_coordinator/app/system/tasks/TaskDetailPanel";

export type StaffTaskDialogProps = {
  dialog: RefObject<HTMLDialogElement | null>;
  clearTask: () => void;
  busy: boolean;
  draft: RefObject<boolean>;
  active: Task | null;
  closeTask: () => void;
  activeChanged: boolean;
  loadLatestTask: () => Promise<void>;
  error: string;
  notice: string;
  loadingDetail: boolean;
  download: (task: Task) => Promise<void>;
  canReview: boolean;
  me: Me;
  mutate: (run: () => Promise<unknown>, success: string) => Promise<boolean>;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  report: string;
  setReport: Dispatch<SetStateAction<string>>;
  setAttachment: Dispatch<SetStateAction<File | null>>;
  attachment: File | null;
  review: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  evaluation: string;
  setEvaluation: Dispatch<SetStateAction<string>>;
  recommendation: string;
  setRecommendation: Dispatch<SetStateAction<string>>;
  decision: string;
  setDecision: Dispatch<SetStateAction<string>>;
  canAssign: boolean;
};

export default function StaffTaskDialog(props: StaffTaskDialogProps) {
  return <TaskDetailPanel {...props} />;
}
