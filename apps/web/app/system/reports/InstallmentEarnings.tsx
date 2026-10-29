"use client";

import {
  earningsFrequencies,
  earningsFrequencyLabels,
  earningsPeriods,
} from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import { BatchPicker, dateLabel } from "./report-view";
import { useInstallmentEarnings } from "./useInstallmentEarnings";
import styles from "./reports.module.css";

export default function InstallmentEarnings() {
  const state = useInstallmentEarnings();

  const { draft, applied, report, loading, busy, dirty } = state;

  const year = Number(draft.year);

  const periods = earningsPeriods(
    Number.isInteger(year) && year >= 1 && year <= 9999
      ? year
      : Number(applied.year),
    draft.frequency,
  );

  return (
    <>
      <section
        className={styles.panel}
        aria-labelledby="earnings-filters-title"
      >
        <h2 id="earnings-filters-title">Scheduled installment earnings</h2>
        <p className={styles.help}>
          Expected installment amounts for each batch and member, calculated
          from issued schedule due dates.
        </p>
        <form onSubmit={state.apply}>
          <fieldset disabled={Boolean(busy)} className={styles.filters}>
            <label className={styles.field}>
              Frequency
              <select
                value={draft.frequency}
                onChange={(event) => {
                  state.edit("frequency", event.target.value);
                }}
              >
                {earningsFrequencies.map((frequency) => {
                  return (
                    <option key={frequency} value={frequency}>
                      {earningsFrequencyLabels[frequency]}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className={styles.field}>
              Year
              <input
                type="number"
                min="1"
                max="9999"
                step="1"
                required
                value={draft.year}
                onChange={(event) => {
                  state.edit("year", event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              Period
              <select
                value={draft.period}
                onChange={(event) => {
                  state.edit("period", event.target.value);
                }}
              >
                {periods.map((period) => {
                  return (
                    <option key={period.period} value={period.period}>
                      {period.label}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className={styles.field}>
              Group by
              <select
                value={draft.groupBy}
                onChange={(event) => {
                  state.edit("groupBy", event.target.value);
                }}
              >
                <option value="batches">Batch</option>
                <option value="members">Member</option>
              </select>
            </label>
            <div className={styles.actions}>
              <button type="submit" className={styles.primary}>
                Calculate earnings
              </button>
              <button type="button" onClick={state.reset}>
                This month
              </button>
            </div>
          </fieldset>
          <fieldset disabled={Boolean(busy)}>
            <BatchPicker value={state.batch} onChange={state.selectBatch} />
          </fieldset>
        </form>
        <p className={styles.help}>
          Bi-monthly: 15th and month-end installment periods (days 1–15 and
          16–month end). Every two months: January–February, March–April, and so
          on. Changing frequency groups existing due dates; it does not change a
          member’s installment schedule.
        </p>
        {state.validation && (
          <p role="alert" className={styles.error}>
            {state.validation}
          </p>
        )}
        {dirty && (
          <p role="status" className={styles.warning}>
            Filters have changed. Calculate earnings to update the results
            before downloading.
          </p>
        )}
      </section>
      <section
        className={styles.panel}
        aria-labelledby="earnings-results-title"
        aria-busy={loading}
      >
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="earnings-results-title">
              Earnings by {applied.groupBy === "batches" ? "batch" : "member"}
            </h2>
            <p className={styles.help}>
              {earningsFrequencyLabels[applied.frequency]} ·{" "}
              {
                earningsPeriods(Number(applied.year), applied.frequency)[
                  Number(applied.period) - 1
                ].label
              }{" "}
              {applied.year}
              {state.appliedBatch
                ? ` · ${state.appliedBatch.code}`
                : " · All batches"}
            </p>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              disabled={loading || Boolean(busy)}
              onClick={() => {
                void state.load();
              }}
            >
              Refresh figures
            </button>
            {(["csv", "xlsx"] as const).map((format) => {
              return (
                <button
                  key={format}
                  type="button"
                  disabled={loading || !report || dirty || Boolean(busy)}
                  onClick={() => {
                    void state.download(format);
                  }}
                >
                  {busy === format ? "Downloading…" : format.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
        {state.actionError && (
          <p role="alert" className={styles.error}>
            {state.actionError}
          </p>
        )}
        {loading ? (
          <p role="status" className={styles.empty}>
            Calculating scheduled earnings…
          </p>
        ) : state.error ? (
          <p role="alert" className={styles.error}>
            {state.error}{" "}
            <button
              type="button"
              onClick={() => {
                void state.load();
              }}
            >
              Retry earnings
            </button>
          </p>
        ) : (
          report && (
            <>
              <dl className={styles.metrics}>
                <div>
                  <dt>Scheduled earnings</dt>
                  <dd>{formatPeso(report.totals.scheduledAmount)}</dd>
                  <p>
                    {dateLabel(report.dateFrom)} – {dateLabel(report.dateTo)}
                  </p>
                </div>
                <div>
                  <dt>Installments due</dt>
                  <dd>{report.totals.installments}</dd>
                  <p>Issued installments within this period</p>
                </div>
                <div>
                  <dt>Batches</dt>
                  <dd>{report.totals.batches}</dd>
                  <p>All batches in the selected scope</p>
                </div>
                <div>
                  <dt>Members</dt>
                  <dd>{report.totals.members}</dd>
                  <p>All members in the selected scope</p>
                </div>
              </dl>
              <p className={styles.help}>
                Scheduled earnings show expected installments, not payments
                received or profit. Totals cover every page. Members and batches
                with no amount due remain visible.
              </p>
              {report.totals.membersWithoutSchedule > 0 && (
                <p className={styles.warning}>
                  {report.totals.membersWithoutSchedule} members have no issued
                  schedule. Their expected earnings are unknown and contribute
                  ₱0.00 until a schedule is issued.
                </p>
              )}
              {report.total === 0 ? (
                <p className={styles.empty}>
                  No {report.groupBy} match this selection.
                </p>
              ) : (
                <>
                  <div
                    className={styles.tableWrap}
                    role="region"
                    aria-label="Scheduled installment earnings table"
                    tabIndex={0}
                  >
                    <table>
                      <caption>
                        Expected installments by{" "}
                        {report.groupBy === "batches" ? "batch" : "member"} ·{" "}
                        {dateLabel(report.dateFrom)} –{" "}
                        {dateLabel(report.dateTo)}
                      </caption>
                      <thead>
                        <tr>
                          {report.groupBy === "members" && (
                            <th scope="col">Member</th>
                          )}
                          <th scope="col">Batch</th>
                          {report.groupBy === "batches" && (
                            <th scope="col">Members</th>
                          )}
                          <th scope="col">Installments due</th>
                          <th scope="col">Scheduled earnings</th>
                          <th scope="col">Schedule</th>
                          {report.groupBy === "batches" && (
                            <th scope="col">Breakdown</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {report.items.map((row) => {
                          return (
                            <tr key={row.id}>
                              {report.groupBy === "members" && (
                                <th scope="row">{row.memberName}</th>
                              )}
                              {report.groupBy === "batches" ? (
                                <th scope="row">{row.batchCode}</th>
                              ) : (
                                <td>{row.batchCode}</td>
                              )}
                              {report.groupBy === "batches" && (
                                <td>{row.members}</td>
                              )}
                              <td>{row.installments}</td>
                              <td>{formatPeso(row.scheduledAmount)}</td>
                              <td>
                                {row.membersWithoutSchedule
                                  ? `${row.membersWithoutSchedule} without issued schedule`
                                  : row.installments === 0
                                    ? "No installments due this period"
                                    : "Issued"}
                              </td>
                              {report.groupBy === "batches" && (
                                <td>
                                  <button
                                    type="button"
                                    disabled={dirty || Boolean(busy)}
                                    aria-label={`View members of ${row.batchCode}`}
                                    onClick={() => {
                                      state.openMembers({
                                        id: row.batchId,
                                        code: row.batchCode,
                                      });
                                    }}
                                  >
                                    View members
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      disabled={report.page <= 1 || dirty || Boolean(busy)}
                      onClick={() => {
                        state.selectPage(report.page - 1);
                      }}
                    >
                      Previous
                    </button>
                    <span className={styles.help}>
                      Page {report.page} of{" "}
                      {Math.max(1, Math.ceil(report.total / report.pageSize))} ·{" "}
                      {report.total} {report.groupBy}
                    </span>
                    <button
                      type="button"
                      disabled={
                        report.page * report.pageSize >= report.total ||
                        dirty ||
                        Boolean(busy)
                      }
                      onClick={() => {
                        state.selectPage(report.page + 1);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </>
          )
        )}
      </section>
    </>
  );
}
