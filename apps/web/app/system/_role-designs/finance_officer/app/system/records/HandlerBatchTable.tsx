"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowDown,
  ArrowUp,
} from "@/app/system/_role-designs/finance_officer/components/SolarIcons";
import type { Batch } from "@/lib/api";
import { formatPeso } from "@/lib/currency";
import {
  batchCadenceLabel,
  batchText,
  newestBatchSort,
  type BatchTableSort,
} from "@/lib/handler-batch-table";
import type { BatchSortField } from "@freshphones/contracts";
import {
  BATCH_INTERNAL_PLACEHOLDER_COUNT,
  BATCH_REAL_MEMBER_CAPACITY,
} from "@freshphones/contracts";
import {
  BatchTableText,
  TableTooltip,
  type TextTooltip,
} from "@/app/system/_role-designs/finance_officer/app/system/records/BatchTableText";
import BatchRowActions from "@/app/system/_role-designs/finance_officer/app/system/records/BatchRowActions";
import styles from "@/app/system/_role-designs/finance_officer/app/system/records/handler-batch-table.module.css";

const densities = [
  { id: "compact", label: "Compact", height: 40 },
  { id: "default", label: "Default", height: 48 },
  { id: "comfortable", label: "Comfortable", height: 56 },
] as const;

type Density = (typeof densities)[number]["id"];

export default function HandlerBatchTable({
  batches,
  loading,
  error,
  userId,
  sort,
  onSort,
  onResetSort,
}: {
  batches: Batch[];
  loading: boolean;
  error: string | null;
  userId: string;
  sort: BatchTableSort;
  onSort: (key: BatchSortField) => void;
  onResetSort: () => void;
}) {
  const [density, setDensity] = useState<Density>("default");

  const [tooltip, setTooltip] = useState<TextTooltip | null>(null);

  const tooltipId = useId();

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panel = useRef<HTMLElement>(null);

  const scroll = useRef<HTMLDivElement>(null);

  const firstHeader = useRef<HTMLTableCellElement>(null);

  const tipRef = useRef<HTMLDivElement>(null);

  const storageKey = `freshphones-handler-batches-density:${userId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);

      if (
        densities.some((item) => {
          return item.id === stored;
        })
      ) {
        setDensity(stored as Density);
      }
    } catch {
      /* Storage is optional. */
    }
  }, [storageKey]);

  useLayoutEffect(() => {
    const header = firstHeader.current;

    if (!header) {
      return;
    }

    const measure = () => {
      panel.current?.style.setProperty(
        "--batch-pinned-width",
        `${header.getBoundingClientRect().width}px`,
      );
    };

    const observer = new ResizeObserver(measure);

    observer.observe(header);

    measure();

    return () => {
      observer.disconnect();
    };
  }, []);

  function keepTooltip() {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
  }

  function hideTooltip() {
    keepTooltip();

    hideTimer.current = setTimeout(() => {
      setTooltip((current) => {
        if (
          current &&
          (document.activeElement === current.target ||
            current.target.matches(":hover") ||
            tipRef.current?.matches(":hover"))
        ) {
          return current;
        }

        return null;
      });
    }, 120);
  }

  function dismissFloating() {
    keepTooltip();

    setTooltip(null);

    panel.current
      ?.querySelectorAll<HTMLElement>("[popover]:popover-open")
      .forEach((element) => {
        element.hidePopover();
      });
  }

  useEffect(() => {
    dismissFloating();
  }, [batches, density]);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissFloating();
      }
    };

    document.addEventListener("keydown", dismiss);

    window.addEventListener("resize", dismissFloating);

    window.addEventListener("scroll", dismissFloating, true);

    return () => {
      keepTooltip();

      document.removeEventListener("keydown", dismiss);

      window.removeEventListener("resize", dismissFloating);

      window.removeEventListener("scroll", dismissFloating, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (!tooltip || !tipRef.current) {
      return;
    }

    const height = tipRef.current.getBoundingClientRect().height;

    const rect = tooltip.target.getBoundingClientRect();

    tipRef.current.style.top = `${rect.bottom + height + 10 > window.innerHeight ? Math.max(8, rect.top - height - 6) : rect.bottom + 6}px`;
  }, [tooltip]);

  function showTooltip(target: HTMLElement, text: string) {
    keepTooltip();

    const rect = target.getBoundingClientRect();

    setTooltip({
      target,
      text,
      left: Math.max(
        12,
        Math.min(
          rect.left,
          window.innerWidth - Math.min(360, window.innerWidth - 24) - 12,
        ),
      ),
      top: rect.bottom + 6,
    });
  }

  function text(value?: string | null) {
    return (
      <BatchTableText
        text={batchText(value)}
        tooltip={tooltip}
        tooltipId={tooltipId}
        show={showTooltip}
        hide={hideTooltip}
        keep={keepTooltip}
      />
    );
  }

  function sortHeader(label: string, key: BatchSortField, className?: string) {
    const active = sort.key === key;

    return (
      <th
        scope="col"
        className={className}
        aria-sort={
          active
            ? sort.direction === "asc"
              ? "ascending"
              : "descending"
            : undefined
        }
      >
        <button
          type="button"
          className={styles.sortButton}
          onClick={() => {
            dismissFloating();

            onSort(key);
          }}
        >
          {label}
          {active &&
            (sort.direction === "asc" ? (
              <ArrowUp data-sort-indicator="" />
            ) : (
              <ArrowDown data-sort-indicator="" />
            ))}
        </button>
      </th>
    );
  }

  return (
    <section
      ref={panel}
      className={styles.panel}
      data-handler-batch-table=""
      data-density={density}
      style={
        {
          "--batch-row-height": `${
            densities.find((item) => {
              return item.id === density;
            })!.height
          }px`,
        } as CSSProperties
      }
      aria-label="Assigned batches"
    >
      <header className={styles.toolbar}>
        <div>
          <p>
            {BATCH_REAL_MEMBER_CAPACITY} real members ·{" "}
            {BATCH_INTERNAL_PLACEHOLDER_COUNT} internal positions per batch
          </p>
          <small>
            {sort.key === newestBatchSort.key
              ? "Newest batches first"
              : "Sorting applies to all matching batches"}
          </small>
          {sort.key !== newestBatchSort.key && (
            <button
              type="button"
              className={styles.reset}
              disabled={loading}
              onClick={onResetSort}
            >
              Newest first
            </button>
          )}
        </div>
        <div className={styles.density} role="group" aria-label="Row density">
          {densities.map((item) => {
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={density === item.id}
                onClick={() => {
                  setDensity(item.id);

                  try {
                    localStorage.setItem(storageKey, item.id);
                  } catch {
                    /* Storage is optional. */
                  }
                }}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>
      <div
        ref={scroll}
        className={styles.scroll}
        tabIndex={0}
        role="region"
        aria-label="Assigned batches table, scroll for more columns"
        onScroll={dismissFloating}
      >
        <table className={styles.table} aria-busy={loading}>
          <caption className={styles.srOnly}>
            Your currently assigned batches. Batch, Unit, Price and Installments
            headers sort all matching records. Numbers are right aligned. A dash
            means a value has not been set. Open row actions to view a
            batch&apos;s members.
          </caption>
          <colgroup>
            {[176, 260, 150, 116, 200, 100, 180, 220, 112, 56].map(
              (width, index) => {
                return <col key={index} style={{ width }} />;
              },
            )}
          </colgroup>
          <thead>
            <tr>
              <th
                ref={firstHeader}
                scope="col"
                className={styles.batch}
                aria-sort={
                  sort.key === "code"
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  className={styles.sortButton}
                  onClick={() => {
                    dismissFloating();

                    onSort("code");
                  }}
                >
                  Batch
                  {sort.key === "code" &&
                    (sort.direction === "asc" ? (
                      <ArrowUp data-sort-indicator="" />
                    ) : (
                      <ArrowDown data-sort-indicator="" />
                    ))}
                </button>
              </th>
              {sortHeader("Unit", "model", styles.unit)}
              {sortHeader("Price", "contractPrice", styles.numeric)}
              {sortHeader("Installments", "installmentCount", styles.numeric)}
              <th scope="col">Cadence</th>
              <th scope="col" className={styles.numeric}>
                Members
              </th>
              <th scope="col">Handler</th>
              <th scope="col">Agent</th>
              <th scope="col">Status</th>
              <th scope="col" className={styles.actionsColumn}>
                <span className={styles.srOnly}>Row actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              !error &&
              batches.map((batch) => {
                const handler = batch.handler_name
                  ? `${batch.handler_name}${batch.handler_available === false ? " · Inactive / role changed" : ""}`
                  : "Unassigned";

                const agent = batch.agent_name
                  ? `${batch.agent_name}${batch.agent_available === false ? " · Inactive" : ""}`
                  : "Unassigned";

                return (
                  <tr key={batch.id} data-batch-row={batch.id}>
                    <th scope="row" className={styles.batch}>
                      {text(batch.batch_number)}
                    </th>
                    <td className={styles.unit}>{text(batch.unit_model)}</td>
                    <td
                      className={styles.numeric}
                      aria-label={
                        batch.contract_price === null
                          ? "Price terms not set"
                          : undefined
                      }
                    >
                      {batch.contract_price === null
                        ? "—"
                        : formatPeso(batch.contract_price)}
                    </td>
                    <td className={styles.numeric}>
                      {batch.num_installments ?? "—"}
                    </td>
                    <td>{text(batchCadenceLabel(batch))}</td>
                    <td className={styles.numeric}>
                      <span
                        aria-label={`${batch.member_count} of ${BATCH_REAL_MEMBER_CAPACITY} real members${batch.member_count > BATCH_REAL_MEMBER_CAPACITY ? "; existing batch above capacity" : ""}`}
                        className={
                          batch.member_count > BATCH_REAL_MEMBER_CAPACITY
                            ? styles.overCapacity
                            : undefined
                        }
                      >
                        {batch.member_count} / {BATCH_REAL_MEMBER_CAPACITY}
                        {batch.member_count > BATCH_REAL_MEMBER_CAPACITY &&
                          " !"}
                      </span>
                    </td>
                    <td>{text(handler)}</td>
                    <td>{text(agent)}</td>
                    <td>
                      <span
                        className={styles.status}
                        data-status={batch.status}
                      >
                        {batchText(batch.status)}
                      </span>
                    </td>
                    <td className={styles.actionsColumn}>
                      <BatchRowActions batch={batch} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {(loading || error || !batches.length) && (
          <div className={styles.state} role={error ? "alert" : "status"}>
            {loading
              ? "Loading assigned batches…"
              : error
                ? "Batch records are unavailable. Use Refresh batches to try again."
                : "No assigned batches match these filters."}
          </div>
        )}
      </div>
      <footer className={styles.footnote}>
        Scroll to see all columns. Batch identity and the header stay visible. —
        means not set.
      </footer>
      <TableTooltip
        tooltip={tooltip}
        id={tooltipId}
        tipRef={tipRef}
        keep={keepTooltip}
        hide={hideTooltip}
      />
    </section>
  );
}
