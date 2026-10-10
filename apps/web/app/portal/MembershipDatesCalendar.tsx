"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, CalendarBlank, CaretLeft, CaretRight, Info, X } from "@phosphor-icons/react";
import type { PortalScheduleItem, PortalSummary } from "@/lib/api";
import { manilaToday } from "@/lib/portal-attention";
import { calendarMonthDays, membershipCalendarEvents, membershipMilestones, moveCalendarDate, moveCalendarMonth, type MembershipMilestone } from "@/lib/portal-membership-calendar";
import styles from "./membership-calendar.module.css";

const shortDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
const dateObject = (day: string) => new Date(`${day}T00:00:00Z`);

export default function MembershipDatesCalendar({ summary, schedule }: { summary: PortalSummary; schedule: PortalScheduleItem[] }) {
  const milestones = membershipMilestones(summary);
  const events = membershipCalendarEvents(milestones, schedule);
  const [opened, setOpened] = useState<MembershipMilestone | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusDayRef = useRef(false);
  const isOpen = opened != null;

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !focusDayRef.current) return;
    dialogRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-date="${selectedDate}"]`)?.focus();
    focusDayRef.current = false;
  }, [selectedDate, isOpen]);

  function selectDay(day: string, focus = false) {
    focusDayRef.current = focus;
    if (focus && day === selectedDate) {
      dialogRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-date="${day}"]`)?.focus();
      focusDayRef.current = false;
    }
    setSelectedDate(day);
  }

  function navigateDay(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const weekday = dateObject(day).getUTCDay();
    let next: string;
    switch (event.key) {
      case "ArrowLeft": next = moveCalendarDate(day, -1); break;
      case "ArrowRight": next = moveCalendarDate(day, 1); break;
      case "ArrowUp": next = moveCalendarDate(day, -7); break;
      case "ArrowDown": next = moveCalendarDate(day, 7); break;
      case "Home": next = moveCalendarDate(day, -weekday); break;
      case "End": next = moveCalendarDate(day, 6 - weekday); break;
      case "PageUp": next = moveCalendarMonth(day, -1); break;
      case "PageDown": next = moveCalendarMonth(day, 1); break;
      default: return;
    }
    event.preventDefault();
    selectDay(next, true);
  }

  function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], [tabindex]"))
      .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first && last) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last && first) {
      event.preventDefault();
      first.focus();
    }
  }

  const month = selectedDate.slice(0, 7);
  const days = selectedDate ? calendarMonthDays(month) : [];
  const today = manilaToday();
  const selectedEvents = events.filter(event => event.date === selectedDate);

  return <>
    <div className={styles.dates} role="group" aria-label="Membership key dates">
      {milestones.map(item => <button key={item.key} type="button" disabled={!item.date} aria-haspopup="dialog" aria-label={item.date ? `View ${item.label.toLowerCase()} in calendar: ${shortDate.format(dateObject(item.date))}` : `${item.label}: not recorded`} onClick={event => {
        if (!item.date) return;
        triggerRef.current = event.currentTarget;
        setSelectedDate(item.date);
        setOpened(item);
      }}><span>{item.label}</span><strong>{item.date ? shortDate.format(dateObject(item.date)) : "Not recorded"}</strong><CalendarBlank aria-hidden="true" /></button>)}
    </div>
    {opened?.date && <dialog ref={dialogRef} className={styles.dialog} aria-modal="true" aria-labelledby="membership-calendar-title" aria-describedby="membership-calendar-description" onKeyDown={keepDialogFocus} onClose={() => { setOpened(null); triggerRef.current?.focus({ preventScroll: true }); }} onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) event.currentTarget.close();
    }}>
      <header className={styles.header}>
        <div><p>Membership calendar</p><h2 id="membership-calendar-title">{opened.label} calendar</h2><p id="membership-calendar-description">{fullDate.format(dateObject(opened.date))}</p></div>
        <button type="button" aria-label="Close membership calendar" onClick={() => dialogRef.current?.close()}><X weight="bold" aria-hidden="true" /></button>
      </header>
      <div className={styles.body}>
        <div className={styles.monthNav}>
          <button type="button" aria-label="Previous month" onClick={() => selectDay(moveCalendarMonth(selectedDate, -1))}><CaretLeft weight="bold" aria-hidden="true" /></button>
          <h3 aria-live="polite">{monthLabel.format(dateObject(selectedDate))}</h3>
          <button type="button" aria-label="Next month" onClick={() => selectDay(moveCalendarMonth(selectedDate, 1))}><CaretRight weight="bold" aria-hidden="true" /></button>
        </div>
        <div className={styles.weekdays} aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}</div>
        <div className={styles.grid} role="group" aria-label={`${monthLabel.format(dateObject(selectedDate))} calendar days`}>
          {days.map(day => {
            const dailyEvents = events.filter(event => event.date === day);
            const membership = dailyEvents.some(event => event.kind === "membership");
            const installment = dailyEvents.some(event => event.kind === "installment");
            return <button key={day} type="button" data-calendar-date={day} className={`${day.slice(0, 7) !== month ? styles.outside : ""} ${day === selectedDate ? styles.selected : ""} ${day === today ? styles.today : ""}`} tabIndex={day === selectedDate ? 0 : -1} aria-label={`${fullDate.format(dateObject(day))}${dailyEvents.length ? `: ${dailyEvents.map(event => event.label).join(", ")}` : ""}`} aria-pressed={day === selectedDate} aria-current={day === today ? "date" : undefined} onClick={() => selectDay(day, true)} onKeyDown={event => navigateDay(event, day)}>
              <span>{Number(day.slice(8))}</span><span className={styles.dots} aria-hidden="true">{membership && <i className={styles.membershipDot} />}{installment && <i className={styles.installmentDot} />}</span>
            </button>;
          })}
        </div>
        <div className={styles.legend}><span><i className={styles.membershipDot} />Key date</span><span><i className={styles.installmentDot} />Installment due</span></div>
        <section className={styles.agenda} aria-labelledby="membership-calendar-day-title" aria-live="polite">
          <h3 id="membership-calendar-day-title">{fullDate.format(dateObject(selectedDate))}</h3>
          {selectedEvents.length ? <ul>{selectedEvents.map(event => <li key={event.id}><i className={event.kind === "membership" ? styles.membershipDot : styles.installmentDot} aria-hidden="true" />{event.href ? <Link href={event.href} onClick={() => dialogRef.current?.close()}>{event.label}<ArrowRight aria-hidden="true" /></Link> : <span>{event.label}</span>}</li>)}</ul> : <p>No membership dates or installments scheduled for this day.</p>}
        </section>
        <p className={styles.note}><Info aria-hidden="true" />The planned batch end is not a collection date. Check your release status for collection updates.</p>
      </div>
      <footer className={styles.footer}><button type="button" onClick={() => selectDay(opened.date!, true)}>Back to {opened.label.toLowerCase()}</button><button type="button" onClick={() => dialogRef.current?.close()}>Done</button></footer>
    </dialog>}
  </>;
}
