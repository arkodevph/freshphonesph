"use client";

import { useCallback, useRef, type SetStateAction } from "react";
import { toast } from "sonner";

type NoticeValue<T> = T extends null ? string | null : string;

/** Keep existing form view models' inline notices empty. Each setter call emits
 * an event, so repeated identical confirmations stack. Clearing a form leaves
 * already delivered notifications alone.
 */
export function useToastNotice<T extends string | null>(
  empty: T,
  tone: "success" | "error" = "success",
) {
  const previous = useRef<NoticeValue<T>>(empty as NoticeValue<T>);

  const notify = useCallback(
    (update: SetStateAction<NoticeValue<T>>) => {
      const message =
        typeof update === "function" ? update(previous.current) : update;

      previous.current = message;

      if (message) {
        toast[tone](message);
      }
    },
    [tone],
  );

  return [empty, notify] as const;
}
