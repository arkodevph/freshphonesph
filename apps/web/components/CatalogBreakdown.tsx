"use client";

import { useEffect, useRef, useState } from "react";
import { catalogPlanBreakdown, catalogPlanLabels, type PublicCatalogItem, type CatalogPlan } from "@freshphones/contracts";
import { catalogPrice } from "@/lib/catalog";
import { catalogSampleDate, catalogSampleDateLabel } from "@/lib/catalog-plan";
import styles from "./CatalogBreakdown.module.css";

export default function CatalogBreakdown({ item, plan, onClose }: {
  item: PublicCatalogItem; plan: CatalogPlan; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [start, setStart] = useState(""); const [page, setPage] = useState(1);
  const breakdown = catalogPlanBreakdown(plan);
  const validDate = !start || catalogSampleDate(start, 0) !== null;
  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      const target = returnFocus?.isConnected ? returnFocus : document.querySelector<HTMLInputElement>('#units input');
      target?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="catalog-breakdown-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className={styles.header}><div><p>Sample payment plan</p><h2 id="catalog-breakdown-title">{item.name}</h2></div><button type="button" onClick={onClose}>Close breakdown</button></header>
    <p className={styles.intro}>Explore this offer before joining. Your confirmed agreement sets the actual amounts and dates; this preview does not reserve a unit.</p>
    <dl className={styles.summary}>
      <div><dt>Total payable</dt><dd>{catalogPrice(breakdown.totalAmount)}</dd></div>
      <div><dt>Payment schedule</dt><dd>{catalogPlanLabels[plan.cadence]}</dd></div>
      <div><dt>{plan.installmentCount === 1 ? "Single installment" : `First ${plan.installmentCount - 1} installment${plan.installmentCount === 2 ? "" : "s"}`}</dt><dd>{catalogPrice(breakdown.regularAmount)}{plan.installmentCount > 2 ? " each" : ""}</dd></div>
      {plan.installmentCount > 1 && <div><dt>Final installment</dt><dd>{catalogPrice(breakdown.finalAmount)}</dd></div>}
    </dl>
    <p className={styles.note}>{plan.installmentCount} payment{plan.installmentCount === 1 ? "" : "s"} over {breakdown.durationDays} days. The first payment is due {breakdown.installments[0].dayOffset} days after the example start.
      {breakdown.regularAmount !== breakdown.finalAmount && " The final installment includes the rounding difference so payments add up exactly to the total."}</p>
    <label className={styles.date}>Example start date <span>(optional)</span><input type="date" min="1900-01-01" max="2100-12-31" value={start}
      aria-invalid={!validDate} aria-describedby={!validDate ? "catalog-date-error" : undefined}
      onChange={event => { setStart(event.target.value); setPage(1); }} /></label>
    {plan.cadence !== "WEEKLY" && <p className={styles.note}>These are fixed {plan.cadence === "SEMIMONTHLY" ? "15" : "30"}-day intervals. Calendar due dates are confirmed when you join.</p>}
    {!validDate ? <p id="catalog-date-error" role="alert" className={styles.error}>Choose a valid date between 1900 and 2100.</p> : <>
      <div className={styles.tableWrap}><table><caption>{start ? "Illustrative dates and amounts" : "Illustrative timing and amounts"}</caption><thead><tr><th scope="col">Payment</th><th scope="col">{start ? "Example due date" : "After start"}</th><th scope="col">Amount</th></tr></thead><tbody>
        {breakdown.installments.slice((page - 1) * 20, page * 20).map(payment => <tr key={payment.sequenceNo}><th scope="row">{payment.sequenceNo}</th><td>{start ? catalogSampleDateLabel(catalogSampleDate(start, payment.dayOffset)!) : `Day ${payment.dayOffset}`}</td><td>{catalogPrice(payment.amount)}</td></tr>)}
      </tbody><tfoot><tr><th scope="row" colSpan={2}>Total for all {plan.installmentCount} payments</th><td>{catalogPrice(breakdown.totalAmount)}</td></tr></tfoot></table></div>
      {plan.installmentCount > 20 && <nav className={styles.pagination} aria-label="Sample payment pages"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous payments</button><span aria-live="polite">Page {page} of {Math.ceil(plan.installmentCount / 20)}</span><button type="button" disabled={page * 20 >= plan.installmentCount} onClick={() => setPage(value => value + 1)}>Next payments</button></nav>}
    </>}
    <a href="#join" className={styles.contact} onClick={onClose}>Ask about this offer</a>
  </dialog>;
}
