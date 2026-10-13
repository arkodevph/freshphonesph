"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { PortalScheduleItem } from "@/lib/api";
import { manilaToday } from "@/lib/portal-attention";
import { installmentState, scheduleDueNow } from "@/lib/portal-schedule";
import {
  calendarDate,
  calendarMonthDays,
  calendarKeyboardDate,
} from "@/lib/portal-membership-calendar";
import InstallmentDetailsDialog from "./InstallmentDetailsDialog";
import InstallmentPlanSummary from "./InstallmentPlanSummary";
import styles from "./payment-schedule.module.css";
import PaymentScheduleCalendar from "./PaymentScheduleCalendar";
import PaymentScheduleLogs from "./PaymentScheduleLogs";
import SchedulePreviewPanel from "./SchedulePreviewPanel";

export { PaymentScheduleSkeleton } from "./schedule-view";

export default function PaymentScheduleWorkspace({
  schedule,
  status,
  onRetry,
}: {
  schedule: PortalScheduleItem[];
  status: "ready" | "error";
  onRetry: () => void;
}) {
  const today = manilaToday();

  const items = [...schedule].sort((a, b) => {
    return a.sequence_no - b.sequence_no;
  });

  const featured =
    items.find((item) => {
      return installmentState(item, today).remaining > 0;
    }) ?? items.at(-1);

  const featuredState = featured ? installmentState(featured, today) : null;

  const dueNow = scheduleDueNow(items, today);

  const completed = items.filter((item) => {
    return installmentState(item, today).payment === "Paid";
  }).length;

  const firstUnpaid = items.findIndex((item) => {
    return installmentState(item, today).remaining > 0;
  });

  const previewStart = Math.min(
    firstUnpaid < 0 ? Math.max(0, items.length - 4) : firstUnpaid,
    Math.max(0, items.length - 4),
  );

  const previewItems = items.slice(previewStart, previewStart + 4);

  const [selectedDate, setSelectedDate] = useState(today);

  const [expanded, setExpanded] = useState(false);

  const [selectedInstallment, setSelectedInstallment] = useState<number | null>(
    null,
  );

  const initialDateRef = useRef(false);

  const focusDayRef = useRef(false);

  const calendarRef = useRef<HTMLElement>(null);

  const logsRef = useRef<HTMLElement>(null);

  const expandRef = useRef<HTMLButtonElement>(null);

  const hashTargetRef = useRef<number | null>(null);

  const appliedHashRef = useRef("");

  const dialogRef = useRef<HTMLDialogElement>(null);

  const detailTriggerRef = useRef<HTMLButtonElement>(null);

  const selectedItem = items.find((item) => {
    return item.sequence_no === selectedInstallment;
  });

  const selectedState = selectedItem
    ? installmentState(selectedItem, today)
    : null;

  const detailsOpen = selectedItem != null;

  useEffect(() => {
    if (status !== "ready" || initialDateRef.current || !featured) {
      return;
    }
    const day = calendarDate(featured.due_date);

    if (day) {
      setSelectedDate(day);
    }
    initialDateRef.current = true;
  }, [status, featured]);

  useEffect(() => {
    function openHash() {
      const hash = window.location.hash.slice(1);

      if (status !== "ready" || appliedHashRef.current === hash) {
        return;
      }
      const item = schedule.find((item) => {
        return `installment-${item.sequence_no}` === hash;
      });

      if (!item) {
        return;
      }
      appliedHashRef.current = hash;

      initialDateRef.current = true;

      const day = calendarDate(item.due_date);

      if (day) {
        setSelectedDate(day);
      }
      hashTargetRef.current = item.sequence_no;

      setExpanded(true);

      if (expanded) {
        window.requestAnimationFrame(() => {
          return document
            .getElementById(hash)
            ?.scrollIntoView({ block: "center" });
        });
      }
    }
    openHash();

    window.addEventListener("hashchange", openHash);

    return () => {
      return window.removeEventListener("hashchange", openHash);
    };
  }, [schedule, status, expanded]);

  useLayoutEffect(() => {
    if (!expanded) {
      return;
    }
    const target =
      hashTargetRef.current != null
        ? document.getElementById(`installment-${hashTargetRef.current}`)
        : logsRef.current;

    target?.focus({ preventScroll: true });

    target?.scrollIntoView({ block: "start" });

    hashTargetRef.current = null;
  }, [expanded]);

  useLayoutEffect(() => {
    if (!focusDayRef.current) {
      return;
    }
    calendarRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-schedule-date="${selectedDate}"]`,
      )
      ?.focus();

    focusDayRef.current = false;
  }, [selectedDate]);

  useEffect(() => {
    if (!detailsOpen) {
      return;
    }
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }
    if (!dialog.open) {
      dialog.showModal();
    }
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      if (dialog.open) {
        dialog.close();
      }
      document.body.style.overflow = previousOverflow;
    };
  }, [detailsOpen]);

  function selectDay(day: string, focus = false) {
    initialDateRef.current = true;

    focusDayRef.current = focus;

    if (focus && day === selectedDate) {
      calendarRef.current
        ?.querySelector<HTMLButtonElement>(`[data-schedule-date="${day}"]`)
        ?.focus();

      focusDayRef.current = false;
    }
    setSelectedDate(day);
  }

  function navigateDay(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const next = calendarKeyboardDate(day, event.key);

    if (!next) {
      return;
    }
    event.preventDefault();

    selectDay(next, true);
  }

  function showDetails(item: PortalScheduleItem, trigger: HTMLButtonElement) {
    detailTriggerRef.current = trigger;

    setSelectedInstallment(item.sequence_no);
  }

  function collapseSchedule() {
    setExpanded(false);

    expandRef.current?.focus();
  }

  function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") {
      return;
    }
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not(:disabled), a[href], [tabindex]",
      ),
    ).filter((element) => {
      return element.tabIndex >= 0 && element.getClientRects().length > 0;
    });

    const first = controls[0],
      last = controls.at(-1);

    if (event.shiftKey && document.activeElement === first && last) {
      event.preventDefault();

      last.focus();
    } else if (!event.shiftKey && document.activeElement === last && first) {
      event.preventDefault();

      first.focus();
    }
  }

  const month = selectedDate.slice(0, 7);

  const monthDays = calendarMonthDays(month);

  const selectedDayItems = items.filter((item) => {
    return calendarDate(item.due_date) === selectedDate;
  });

  return (
    <div className={styles.workspace}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <InstallmentPlanSummary
            status={status}
            items={items}
            featured={featured}
            featuredState={featuredState}
            onRetry={onRetry}
            selectDay={selectDay}
            calendarRef={calendarRef}
          />

          <PaymentScheduleCalendar
            calendarRef={calendarRef}
            status={status}
            onRetry={onRetry}
            items={items}
            selectDay={selectDay}
            selectedDate={selectedDate}
            today={today}
            monthDays={monthDays}
            month={month}
            navigateDay={navigateDay}
            selectedDayItems={selectedDayItems}
            showDetails={showDetails}
          />
        </div>

        <SchedulePreviewPanel
          status={status}
          items={items}
          onRetry={onRetry}
          dueNow={dueNow}
          completed={completed}
          previewItems={previewItems}
          today={today}
          showDetails={showDetails}
          expandRef={expandRef}
          expanded={expanded}
          collapseSchedule={collapseSchedule}
          setExpanded={setExpanded}
        />
      </div>

      {expanded && (
        <PaymentScheduleLogs
          logsRef={logsRef}
          collapseSchedule={collapseSchedule}
          status={status}
          onRetry={onRetry}
          items={items}
          today={today}
          showDetails={showDetails}
        />
      )}

      {selectedItem && selectedState && (
        <InstallmentDetailsDialog
          dialogRef={dialogRef}
          keepDialogFocus={keepDialogFocus}
          setSelectedInstallment={setSelectedInstallment}
          detailTriggerRef={detailTriggerRef}
          selectedItem={selectedItem}
          selectedState={selectedState}
        />
      )}
    </div>
  );
}
