"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export type GcashFeedbackMessage = {
  id: number;
  kind: "info" | "progress" | "success" | "error";
  title: string;
  message: string;
};

export function GcashFeedback({
  feedback,
  dismiss,
}: {
  feedback: GcashFeedbackMessage | null;
  dismiss: () => void;
}) {
  const progress = useRef<string | number | undefined>(undefined);

  const onDismiss = useRef(dismiss);

  useEffect(() => {
    onDismiss.current = dismiss;
  }, [dismiss]);

  useEffect(() => {
    if (!feedback) {
      if (progress.current !== undefined) {
        toast.dismiss(progress.current);

        progress.current = undefined;
      }

      return;
    }

    const options = {
      id: progress.current,
      description: feedback.message,
      onDismiss: () => {
        return onDismiss.current();
      },
    };

    if (feedback.kind === "progress") {
      progress.current = toast.loading(feedback.title, options);
    } else {
      toast[feedback.kind](feedback.title, options);

      progress.current = undefined;
    }
  }, [feedback]);

  useEffect(() => {
    return () => {
      if (progress.current !== undefined) {
        toast.dismiss(progress.current);
      }
    };
  }, []);

  return null;
}
