"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, CalendarBlank, CaretLeft, CaretRight, Clock, Info, X } from "@phosphor-icons/react";
import type { PortalScheduleItem } from "@/lib/api";
import { manilaToday } from "@/lib/portal-attention";
import { installmentState, scheduleDueNow } from "@/lib/portal-schedule";
import { calendarDate, calendarMonthDays, moveCalendarDate, moveCalendarMonth } from "@/lib/portal-membership-calendar";
import PortalBannerArt from "./PortalBannerArt";
import bannerStyles from "./portal-banner.module.css";
import styles from "./payment-schedule.module.css";

const moneyFormat = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
const dateObject = (day: string) => new Date(`${day}T00:00:00Z`);
const money = (amount: number | string) => moneyFormat.format(Number(amount));
const dueDate = (value: string) => calendarDate(value) ? shortDate.format(dateObject(calendarDate(value)!)) : "Not recorded";
const badgeClass = (payment: string) => payment === "Paid" ? styles.paid : payment === "Partially paid" ? styles.partial : styles.unpaid;

function State({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  return <div className={styles.empty} role={error ? "alert" : undefined}><p>{error ? "Could not load your payment schedule." : "Your schedule has not been issued yet. Please contact Records."}</p>{error && <button type="button" onClick={onRetry}>Try again</button>}</div>;
}

export function PaymentScheduleSkeleton() {
  return <div className={`${styles.workspace} ${styles.skeleton}`} aria-hidden="true"><div className={styles.layout}><div className={styles.main}><div className={`${styles.plan} ${bannerStyles.banner} ${bannerStyles.night} ${styles.skeletonPlan}`} /><div className={`${styles.calendar} ${styles.skeletonCalendar}`} /></div><div className={`${styles.preview} ${styles.skeletonPreview}`} /></div></div>;
}

export default function PaymentScheduleWorkspace({ schedule, status, onRetry }: { schedule: PortalScheduleItem[]; status: "ready" | "error"; onRetry: () => void }) {
  const today = manilaToday();
  const items = [...schedule].sort((a, b) => a.sequence_no - b.sequence_no);
  const featured = items.find(item => installmentState(item, today).remaining > 0) ?? items.at(-1);
  const featuredState = featured ? installmentState(featured, today) : null;
  const dueNow = scheduleDueNow(items, today);
  const completed = items.filter(item => installmentState(item, today).payment === "Paid").length;
  const firstUnpaid = items.findIndex(item => installmentState(item, today).remaining > 0);
  const previewStart = Math.min(firstUnpaid < 0 ? Math.max(0, items.length - 4) : firstUnpaid, Math.max(0, items.length - 4));
  const previewItems = items.slice(previewStart, previewStart + 4);
  const [selectedDate, setSelectedDate] = useState(today);
  const [expanded, setExpanded] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<number | null>(null);
  const initialDateRef = useRef(false);
  const focusDayRef = useRef(false);
  const calendarRef = useRef<HTMLElement>(null);
  const logsRef = useRef<HTMLElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const hashTargetRef = useRef<number | null>(null);
  const appliedHashRef = useRef("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const selectedItem = items.find(item => item.sequence_no === selectedInstallment);
  const selectedState = selectedItem ? installmentState(selectedItem, today) : null;
  const detailsOpen = selectedItem != null;

  useEffect(() => {
    if (status !== "ready" || initialDateRef.current || !featured) return;
    const day = calendarDate(featured.due_date);
    if (day) setSelectedDate(day);
    initialDateRef.current = true;
  }, [status, featured]);

  useEffect(() => {
    function openHash() {
      const hash = window.location.hash.slice(1);
      if (status !== "ready" || appliedHashRef.current === hash) return;
      const item = schedule.find(item => `installment-${item.sequence_no}` === hash);
      if (!item) return;
      appliedHashRef.current = hash;
      initialDateRef.current = true;
      const day = calendarDate(item.due_date);
      if (day) setSelectedDate(day);
      hashTargetRef.current = item.sequence_no;
      setExpanded(true);
      if (expanded) window.requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "center" }));
    }
    openHash();
    window.addEventListener("hashchange", openHash);
    return () => window.removeEventListener("hashchange", openHash);
  }, [schedule, status, expanded]);

  useLayoutEffect(() => {
    if (!expanded) return;
    const target = hashTargetRef.current != null ? document.getElementById(`installment-${hashTargetRef.current}`) : logsRef.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start" });
    hashTargetRef.current = null;
  }, [expanded]);

  useLayoutEffect(() => {
    if (!focusDayRef.current) return;
    calendarRef.current?.querySelector<HTMLButtonElement>(`[data-schedule-date="${selectedDate}"]`)?.focus();
    focusDayRef.current = false;
  }, [selectedDate]);

  useEffect(() => {
    if (!detailsOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { if (dialog.open) dialog.close(); document.body.style.overflow = previousOverflow; };
  }, [detailsOpen]);

  function selectDay(day: string, focus = false) {
    initialDateRef.current = true;
    focusDayRef.current = focus;
    if (focus && day === selectedDate) {
      calendarRef.current?.querySelector<HTMLButtonElement>(`[data-schedule-date="${day}"]`)?.focus();
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
    event.preventDefault(); selectDay(next, true);
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
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], [tabindex]"))
      .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
  }

  const month = selectedDate.slice(0, 7);
  const monthDays = calendarMonthDays(month);
  const selectedDayItems = items.filter(item => calendarDate(item.due_date) === selectedDate);

  return <div className={styles.workspace}>
    <div className={styles.layout}>
      <div className={styles.main}>
        <section className={`${styles.plan} ${bannerStyles.banner} ${bannerStyles.night}`} aria-labelledby="installment-plan-title">
          <PortalBannerArt variant="plan" />
          <header className={styles.heading}><span className={styles.icon}><Clock weight="duotone" aria-hidden="true" /></span><div><p>Your plan</p><h2 id="installment-plan-title">Your installment plan</h2></div>{status === "ready" && <span className={styles.count}>{items.length} installments</span>}</header>
          {status === "error" || !featured || !featuredState ? <State error={status === "error"} onRetry={onRetry} /> : <>
            <div className={styles.planMain}><div className={styles.planBalance}><p>{featuredState.payment === "Paid" ? "All installments settled" : `Installment ${featured.sequence_no} remaining`}</p><strong>{money(featuredState.remaining)}</strong></div><div className={styles.planDue}><span>Due date</span><strong>{dueDate(featured.due_date)}</strong></div><div className={styles.planStatus}><span className={`${styles.badge} ${badgeClass(featuredState.payment)}`}>{featuredState.payment}</span><span className={featuredState.timing === "Overdue" ? styles.overdue : styles.muted}>{featuredState.timing}</span></div></div>
            <div className={styles.planFooter}><dl><div><dt>Installment amount</dt><dd>{money(featured.expected_amount)}</dd></div><div><dt>Finance verified</dt><dd>{money(featured.paid_applied)}</dd></div></dl><button type="button" onClick={() => { const day = calendarDate(featured.due_date); if (day) selectDay(day); calendarRef.current?.scrollIntoView({ block: "start" }); }}>View in calendar<ArrowDown aria-hidden="true" /></button></div>
          </>}
        </section>

        <section ref={calendarRef} className={styles.calendar} aria-labelledby="payment-calendar-title">
          <header className={styles.heading}><span className={styles.icon}><CalendarBlank weight="duotone" aria-hidden="true" /></span><div><p>Your due dates</p><h2 id="payment-calendar-title">Payment calendar</h2></div></header>
          {status === "error" ? <State error onRetry={onRetry} /> : <>
            {!items.length && <p className={styles.emptyNotice}>Due dates will appear here when Records issues your schedule.</p>}
            <div className={styles.monthNav}><div><button type="button" aria-label="Previous month" onClick={() => selectDay(moveCalendarMonth(selectedDate, -1))}><CaretLeft weight="bold" aria-hidden="true" /></button><h3 aria-live="polite">{monthFormat.format(dateObject(selectedDate))}</h3><button type="button" aria-label="Next month" onClick={() => selectDay(moveCalendarMonth(selectedDate, 1))}><CaretRight weight="bold" aria-hidden="true" /></button></div><button type="button" onClick={() => selectDay(today)}>Today</button></div>
            <div className={styles.weekdays} aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}</div>
            <div className={styles.days} role="group" aria-label={`${monthFormat.format(dateObject(selectedDate))} payment calendar days`}>{monthDays.map(day => {
              const dayItems = items.filter(item => calendarDate(item.due_date) === day);
              return <button key={day} type="button" data-schedule-date={day} className={`${day.slice(0, 7) !== month ? styles.outside : ""} ${day === selectedDate ? styles.selectedDay : ""} ${day === today ? styles.today : ""}`} tabIndex={day === selectedDate ? 0 : -1} aria-pressed={day === selectedDate} aria-current={day === today ? "date" : undefined} aria-label={`${fullDate.format(dateObject(day))}${dayItems.length ? `: ${dayItems.map(item => { const state = installmentState(item, today); return `Installment ${item.sequence_no}, ${money(item.expected_amount)} scheduled, ${money(state.remaining)} remaining, ${state.payment}, ${state.timing}`; }).join("; ")}` : ""}`} onClick={() => selectDay(day, true)} onKeyDown={event => navigateDay(event, day)}><span className={styles.dayNumber}>{Number(day.slice(8))}</span><span className={styles.dayEvents}>{dayItems.slice(0, 2).map(item => { const state = installmentState(item, today); return <span key={item.sequence_no} className={`${styles.dayEvent} ${badgeClass(state.payment)}`}><span>Installment {item.sequence_no}</span><strong>{money(item.expected_amount)}</strong></span>; })}{dayItems.length > 2 && <span className={styles.moreEvents}>+{dayItems.length - 2} more</span>}</span></button>;
            })}</div>
            <div className={styles.legend}><span><i className={styles.unpaid} />Unpaid</span><span><i className={styles.partial} />Partially paid</span><span><i className={styles.paid} />Paid</span></div>
            <section className={styles.agenda} aria-labelledby="schedule-day-title" aria-live="polite"><h3 id="schedule-day-title">{fullDate.format(dateObject(selectedDate))}</h3>{!selectedDayItems.length ? <p>No installments scheduled for this day.</p> : <ul>{selectedDayItems.map(item => {
              const state = installmentState(item, today);
              return <li key={item.sequence_no}><div className={styles.agendaHeading}><strong>Installment {item.sequence_no}</strong><span className={`${styles.badge} ${badgeClass(state.payment)}`}>{state.payment}</span></div><dl><div><dt>Scheduled</dt><dd>{money(item.expected_amount)}</dd></div><div><dt>Verified</dt><dd>{money(item.paid_applied)}</dd></div><div><dt>Remaining</dt><dd>{money(state.remaining)}</dd></div></dl><div className={styles.agendaActions}><span className={state.timing === "Overdue" ? styles.overdue : styles.muted}>{state.timing}</span><button type="button" aria-label={`Calendar details for installment ${item.sequence_no}`} aria-haspopup="dialog" onClick={event => showDetails(item, event.currentTarget)}>View details<ArrowRight aria-hidden="true" /></button></div></li>;
            })}</ul>}</section>
          </>}
        </section>
      </div>

      <aside className={styles.preview} aria-labelledby="schedule-preview-title">
        <header className={styles.previewHeader}><h2 id="schedule-preview-title">Payment schedule</h2><p>{status === "ready" ? `Preview · ${items.length} installments` : "Preview unavailable"}</p></header>
        {status === "error" || !items.length ? <State error={status === "error"} onRetry={onRetry} /> : <>
          <div className={styles.dueNow}><span>Currently due</span><strong>{money(dueNow)}</strong><p>Remaining on installments due by today, after Finance verification.</p></div>
          <div className={styles.completion}><span>{completed} of {items.length} installments paid</span><div role="progressbar" aria-label="Fully paid installments" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={items.length}><span style={{width:`${completed / items.length * 100}%`}} /></div></div>
          <ol className={styles.previewList}>{previewItems.map(item => { const state = installmentState(item, today); return <li key={item.sequence_no}><span className={styles.sequence}>{item.sequence_no}</span><div><strong>{dueDate(item.due_date)}</strong><span className={state.timing === "Overdue" ? styles.overdue : styles.muted}>{state.timing}</span><b>{money(item.expected_amount)}</b><small>{money(state.remaining)} remaining</small><span className={`${styles.badge} ${badgeClass(state.payment)}`}>{state.payment}</span></div><button type="button" aria-label={`Preview details for installment ${item.sequence_no}`} aria-haspopup="dialog" onClick={event => showDetails(item, event.currentTarget)}><ArrowRight aria-hidden="true" /></button></li>; })}</ol>
          <button ref={expandRef} type="button" className={styles.expand} aria-expanded={expanded} aria-controls={expanded ? "full-payment-schedule" : undefined} onClick={() => expanded ? collapseSchedule() : setExpanded(true)}>{expanded ? "Hide full schedule" : "View full schedule"}{expanded ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}</button>
          <p className={styles.previewNote}>See all {items.length} installments, verified allocations, and remaining amounts.</p>
        </>}
      </aside>
    </div>

    {expanded && <section ref={logsRef} id="full-payment-schedule" className={styles.logs} tabIndex={-1} aria-labelledby="full-payment-schedule-title"><header className={styles.logsHeader}><div><p>All installments</p><h2 id="full-payment-schedule-title">Full payment schedule</h2></div><button type="button" onClick={collapseSchedule}>Collapse schedule<ArrowUp aria-hidden="true" /></button></header>{status === "error" ? <State error onRetry={onRetry} /> : <><div className={styles.tableScroll} role="region" aria-label="Installment schedule table" tabIndex={0}><table><caption>All {items.length} installments. Paid amounts reflect Finance-verified allocations.</caption><thead><tr><th scope="col">Installment</th><th scope="col">Due date</th><th scope="col">Scheduled</th><th scope="col">Verified paid</th><th scope="col">Remaining</th><th scope="col">Payment status</th><th scope="col">Timing</th><th scope="col">Details</th></tr></thead><tbody>{items.map(item => { const state = installmentState(item, today); return <tr key={item.sequence_no} id={`installment-${item.sequence_no}`} tabIndex={-1}><th scope="row">Installment {item.sequence_no}</th><td>{dueDate(item.due_date)}</td><td>{money(item.expected_amount)}</td><td>{money(item.paid_applied)}</td><td>{money(state.remaining)}</td><td><span className={`${styles.badge} ${badgeClass(state.payment)}`}>{state.payment}</span></td><td className={state.timing === "Overdue" ? styles.overdue : styles.muted}>{state.timing}</td><td><button type="button" aria-label={`Details for installment ${item.sequence_no}`} aria-haspopup="dialog" onClick={event => showDetails(item, event.currentTarget)}>Details<ArrowRight aria-hidden="true" /></button></td></tr>; })}</tbody></table></div><p className={styles.tableNote}>For individual payment transactions and confirmations, <Link href="/portal/payments">view verified payments<ArrowRight aria-hidden="true" /></Link>.</p></>}</section>}

    {selectedItem && selectedState && <dialog ref={dialogRef} className={styles.dialog} aria-modal="true" aria-labelledby="schedule-detail-title" aria-describedby="schedule-detail-note" onKeyDown={keepDialogFocus} onClose={() => { setSelectedInstallment(null); detailTriggerRef.current?.focus({preventScroll:true}); }} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) event.currentTarget.close(); }}><header className={styles.dialogHeader}><div><p>Payment schedule</p><h2 id="schedule-detail-title">Installment {selectedItem.sequence_no} details</h2></div><button type="button" aria-label="Close installment details" onClick={() => dialogRef.current?.close()}><X weight="bold" aria-hidden="true" /></button></header><div className={styles.dialogBody}><div className={styles.dialogDue}><div><span>Due date</span><strong>{dueDate(selectedItem.due_date)}</strong><small className={selectedState.timing === "Overdue" ? styles.overdue : styles.muted}>{selectedState.timing}</small></div><span className={`${styles.badge} ${badgeClass(selectedState.payment)}`}>{selectedState.payment}</span></div><dl className={styles.dialogFigures}><div><dt>Installment amount</dt><dd>{money(selectedItem.expected_amount)}</dd></div><div><dt>Finance verified</dt><dd>{money(selectedItem.paid_applied)}</dd></div><div><dt>Remaining</dt><dd>{money(selectedState.remaining)}</dd></div></dl><p id="schedule-detail-note">{selectedState.payment === "Paid" ? "This installment is fully covered by Finance-verified payments." : "Staff-recorded payments do not reduce this amount until Finance verifies them."}</p></div><footer className={styles.dialogFooter}><Link href="/portal/payments" onClick={() => dialogRef.current?.close()}>View payment records<ArrowRight aria-hidden="true" /></Link><button type="button" onClick={() => dialogRef.current?.close()}>Close</button></footer></dialog>}
  </div>;
}
