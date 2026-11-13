"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
} from "@/app/system/_role-designs/batch_manager/components/SolarIcons";
import { DotsThree } from "@phosphor-icons/react";
import {
  BatchTableText,
  TableTooltip,
  type TextTooltip,
} from "@/app/system/_role-designs/batch_manager/app/system/records/BatchTableText";
import type { HandlerTableSort } from "@/lib/handler-table";
import styles from "@/app/system/_role-designs/batch_manager/components/handler-table/handler-data-table.module.css";

const TooltipContext = createContext<{
  tooltip: TextTooltip | null;
  id: string;
  show: (target: HTMLElement, text: string) => void;
  hide: () => void;
  keep: () => void;
} | null>(null);

export function HandlerTableText({ value }: { value?: string | null }) {
  const context = useContext(TooltipContext);

  if (!context) {
    throw new Error("HandlerTableText requires a HandlerDataTable");
  }

  return (
    <BatchTableText
      text={value?.trim() || "—"}
      tooltip={context.tooltip}
      tooltipId={context.id}
      show={context.show}
      hide={context.hide}
      keep={context.keep}
      className={styles.text}
      style={{ width: "100%" }}
    />
  );
}

export function HandlerRowActions({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();

  const menu = useRef<HTMLDivElement>(null);

  const trigger = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open || !menu.current || !trigger.current) {
      return;
    }

    const rect = trigger.current.getBoundingClientRect();

    const height = menu.current.getBoundingClientRect().height;

    menu.current.style.left = `${Math.max(12, Math.min(rect.right - 224, window.innerWidth - 236))}px`;

    menu.current.style.top = `${Math.max(8, rect.bottom + height + 8 > window.innerHeight ? rect.top - height - 6 : rect.bottom + 6)}px`;
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.rowAction}
        popoverTarget={id}
        aria-controls={id}
        aria-expanded={open}
        aria-label={`Actions for ${label}`}
      >
        <DotsThree weight="bold" aria-hidden="true" />
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        role="group"
        aria-label={`Row actions for ${label}`}
        className={styles.actionsPopover}
        onToggle={(event) => {
          return setOpen(event.newState === "open");
        }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button, a")) {
            menu.current?.hidePopover();
          }
        }}
      >
        {children}
      </div>
    </>
  );
}

export type HandlerTableColumn<Row, Key extends string> = {
  id: string;
  label: string;
  width: number;
  numeric?: boolean;
  pin?: "primary" | "secondary";
  sortKey?: Key;
  actions?: boolean;
  render: (row: Row) => ReactNode;
};

const densities = [
  { id: "compact", label: "Compact", height: 40 },
  { id: "default", label: "Default", height: 48 },
  { id: "comfortable", label: "Comfortable", height: 56 },
] as const;

type Density = (typeof densities)[number]["id"];

export default function HandlerDataTable<Row, Key extends string>({
  id,
  userId,
  label,
  caption,
  rows,
  rowId,
  columns,
  loading,
  error,
  empty,
  sort,
  onSort,
  onResetSort,
  onRetry,
}: {
  id: string;
  userId: string;
  label: string;
  caption: string;
  rows: Row[];
  rowId: (row: Row) => string | number;
  columns: HandlerTableColumn<Row, Key>[];
  loading: boolean;
  error?: string | null;
  empty: string;
  sort: HandlerTableSort<Key>;
  onSort: (key: Key) => void;
  onResetSort: () => void;
  onRetry: () => void;
}) {
  const panel = useRef<HTMLElement>(null);

  const primary = useRef<HTMLTableCellElement>(null);

  const scroll = useRef<HTMLDivElement>(null);

  const [narrow, setNarrow] = useState(false);

  const tipRef = useRef<HTMLDivElement>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tooltipId = useId();

  const [tooltip, setTooltip] = useState<TextTooltip | null>(null);

  const [density, setDensity] = useState<Density>("default");

  const storageKey = `freshphones-handler-${id}-density:${userId}`;

  function keep() {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }

  function hide() {
    keep();

    timer.current = setTimeout(() => {
      return setTooltip((current) => {
        return current &&
          (document.activeElement === current.target ||
            current.target.matches(":hover") ||
            tipRef.current?.matches(":hover"))
          ? current
          : null;
      });
    }, 120);
  }

  function dismiss() {
    keep();

    setTooltip(null);

    panel.current
      ?.querySelectorAll<HTMLElement>("[popover]:popover-open")
      .forEach((element) => {
        return element.hidePopover();
      });
  }

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
      /* Optional storage. */
    }
  }, [storageKey]);

  useLayoutEffect(() => {
    if (!scroll.current) {
      return;
    }

    const measure = () => {
      setNarrow(scroll.current!.clientWidth <= 720);
    };

    const observer = new ResizeObserver(measure);

    observer.observe(scroll.current);

    measure();

    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!primary.current) {
      return;
    }

    const measure = () => {
      return panel.current?.style.setProperty(
        "--handler-pinned-width",
        `${primary.current!.getBoundingClientRect().width}px`,
      );
    };

    const observer = new ResizeObserver(measure);

    observer.observe(primary.current);

    measure();

    return () => {
      return observer.disconnect();
    };
  }, []);

  useEffect(() => {
    dismiss();
  }, [rows, density, loading, error]);

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
      }
    }

    document.addEventListener("keydown", escape);

    window.addEventListener("resize", dismiss);

    window.addEventListener("scroll", dismiss, true);

    return () => {
      keep();

      document.removeEventListener("keydown", escape);

      window.removeEventListener("resize", dismiss);

      window.removeEventListener("scroll", dismiss, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (!tooltip || !tipRef.current) {
      return;
    }

    const rect = tooltip.target.getBoundingClientRect();

    const height = tipRef.current.getBoundingClientRect().height;

    tipRef.current.style.top = `${rect.bottom + height + 10 > window.innerHeight ? Math.max(8, rect.top - height - 6) : rect.bottom + 6}px`;
  }, [tooltip]);

  function show(target: HTMLElement, text: string) {
    keep();

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

  const height = densities.find((item) => {
    return item.id === density;
  })!.height;

  function columnWidth(column: HandlerTableColumn<Row, Key>) {
    return narrow && column.pin === "primary" ? 176 : column.width;
  }

  return (
    <TooltipContext.Provider
      value={{ tooltip, id: tooltipId, show, hide, keep }}
    >
      <section
        ref={panel}
        className={styles.panel}
        data-handler-table={id}
        data-density={density}
        aria-label={label}
        style={
          {
            "--handler-row-height": `${height}px`,
            "--handler-secondary-width": `${
              columns.find((column) => {
                return column.pin === "secondary";
              })?.width ?? 0
            }px`,
          } as CSSProperties
        }
      >
        <header className={styles.toolbar}>
          <div>
            <strong>{label}</strong>
            <p>
              {sort.key === "createdAt"
                ? "Newest first"
                : "Sorting all matching records"}
              {sort.key !== "createdAt" && (
                <button
                  type="button"
                  className={styles.reset}
                  disabled={loading}
                  onClick={onResetSort}
                >
                  Newest first
                </button>
              )}
            </p>
          </div>
          <div role="group" aria-label="Row density" className={styles.density}>
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
                      /* Optional storage. */
                    }
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>
        <div
          ref={scroll}
          role="region"
          aria-label={`${label}, scroll for more columns`}
          tabIndex={0}
          className={styles.scroll}
          onScroll={dismiss}
        >
          <table
            className={styles.table}
            aria-busy={loading}
            style={{
              minWidth: columns.reduce((total, column) => {
                return total + columnWidth(column);
              }, 0),
            }}
          >
            <caption className={styles.srOnly}>{caption}</caption>
            <colgroup>
              {columns.map((column) => {
                return (
                  <col key={column.id} style={{ width: columnWidth(column) }} />
                );
              })}
            </colgroup>
            <thead>
              <tr>
                {columns.map((column) => {
                  return (
                    <th
                      key={column.id}
                      ref={column.pin === "primary" ? primary : undefined}
                      scope="col"
                      data-pin={column.pin}
                      data-numeric={column.numeric || undefined}
                      data-actions={column.actions || undefined}
                      aria-sort={
                        sort.key === column.sortKey
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      {column.sortKey ? (
                        <button
                          type="button"
                          className={styles.sortButton}
                          onClick={() => {
                            dismiss();

                            onSort(column.sortKey!);
                          }}
                        >
                          {column.label}
                          {sort.key === column.sortKey &&
                            (sort.direction === "asc" ? (
                              <ArrowUp data-sort-indicator="" />
                            ) : (
                              <ArrowDown data-sort-indicator="" />
                            ))}
                        </button>
                      ) : (
                        <span
                          className={column.actions ? styles.srOnly : undefined}
                        >
                          {column.label}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {!loading &&
                !error &&
                rows.map((row) => {
                  return (
                    <tr key={rowId(row)} data-handler-row={rowId(row)}>
                      {columns.map((column) => {
                        const Cell = column.pin === "primary" ? "th" : "td";

                        return (
                          <Cell
                            key={column.id}
                            scope={column.pin === "primary" ? "row" : undefined}
                            data-pin={column.pin}
                            data-column={column.id}
                            data-numeric={column.numeric || undefined}
                            data-actions={column.actions || undefined}
                          >
                            <div
                              className={styles.cell}
                              style={
                                column.numeric
                                  ? undefined
                                  : { width: columnWidth(column) - 24 }
                              }
                            >
                              {column.render(row)}
                            </div>
                          </Cell>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {(loading || error || !rows.length) && (
            <div className={styles.state} role={error ? "alert" : "status"}>
              {loading ? (
                "Loading records…"
              ) : error ? (
                <>
                  <span>Records are unavailable. Try again.</span>
                  <button type="button" onClick={onRetry}>
                    Retry
                  </button>
                </>
              ) : (
                empty
              )}
            </div>
          )}
        </div>
        <footer className={styles.footnote}>
          Scroll to see all columns. Names and headers stay visible. — means not
          set.
        </footer>
        <TableTooltip
          tooltip={tooltip}
          id={tooltipId}
          tipRef={tipRef}
          keep={keep}
          hide={hide}
        />
      </section>
    </TooltipContext.Provider>
  );
}
